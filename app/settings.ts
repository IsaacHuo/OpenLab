import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, existsSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { CompatibleModel } from './model.ts';
import { DomainError, text, id } from './contracts.ts';
import type { ProviderConfig } from './model.ts';
import type { ObjectData } from './contracts.ts';

export interface SecretProtection { protect(secret: string): string; unprotect(cipher: string): string }
export const windowsProtection: SecretProtection = {
  protect: secret => powershell('$s = ConvertTo-SecureString ([Console]::In.ReadToEnd()) -AsPlainText -Force; [Console]::Out.Write(($s | ConvertFrom-SecureString))', secret),
  unprotect: cipher => powershell('$s = ConvertTo-SecureString ([Console]::In.ReadToEnd().Trim()); [Console]::Out.Write([System.Net.NetworkCredential]::new("", $s).Password)', cipher),
};
function powershell(command: string, input: string): string {
  if (process.platform !== 'win32') throw new DomainError('Persistent credentials currently require Windows user-scoped protection');
  const systemRoot = process.env.SystemRoot ?? 'C:\\Windows';
  const result = spawnSync(join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), ['-NoProfile', '-NonInteractive', '-Command', command], { input, encoding: 'utf8', windowsHide: true, timeout: 15_000, env: { ...process.env, PSModulePath: join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'Modules') } });
  if (result.status !== 0 || !result.stdout.trim()) throw new DomainError('Windows credential protection failed');
  return result.stdout.trim();
}
export interface ProviderEntry { id: string; name: string; baseUrl: string; model: string; thinkingDisabled: boolean; testedAt?: string; streaming?: boolean; tools?: boolean }
export class Settings {
  root: string;
  protection: SecretProtection;
  constructor(root: string, protection = windowsProtection) { this.root = root; this.protection = protection; mkdirSync(join(root, 'credentials'), { recursive: true }); }
  list(): ProviderEntry[] {
    const path = join(this.root, 'providers.json');
    return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as ProviderEntry[] : [];
  }
  save(entries: ProviderEntry[]): void {
    const path = join(this.root, 'providers.json');
    writeFileSync(`${path}.tmp`, JSON.stringify(entries, null, 2) + '\n', { mode: 0o600 });
    renameSync(`${path}.tmp`, path);
  }
  add(input: ObjectData): ProviderEntry {
    const apiKey = text(input.apiKey, 'API key', 500);
    const baseUrl = text(input.baseUrl, 'base URL', 500).replace(/\/$/, '');
    const model = text(input.model, 'model', 200);
    // Validate before persisting; credentials cannot be embedded in a URL.
    new CompatibleModel({ baseUrl, model, apiKey });
    const entry: ProviderEntry = { id: randomUUID(), name: text(input.name, 'provider name', 200), baseUrl, model, thinkingDisabled: new URL(baseUrl).hostname === 'api.deepseek.com' };
    writeFileSync(join(this.root, 'credentials', `${entry.id}.dpapi`), this.protection.protect(apiKey), { flag: 'wx', mode: 0o600 });
    this.save([...this.list(), entry]);
    return entry;
  }
  config(providerId: string): ProviderConfig {
    const entry = this.list().find(p => p.id === id(providerId));
    if (!entry) throw new DomainError('Choose a configured model provider', 409);
    const apiKey = this.protection.unprotect(readFileSync(join(this.root, 'credentials', `${entry.id}.dpapi`), 'utf8'));
    return { baseUrl: entry.baseUrl, model: entry.model, apiKey, ...(entry.thinkingDisabled ? { extra: { thinking: { type: 'disabled' } } } : {}) };
  }
  remove(providerId: string): void {
    id(providerId);
    this.save(this.list().filter(p => p.id !== providerId));
    rmSync(join(this.root, 'credentials', `${providerId}.dpapi`), { force: true });
  }
  async test(providerId: string, signal = AbortSignal.timeout(90_000)): Promise<ProviderEntry> {
    const config = this.config(providerId);
    const model = new CompatibleModel({ ...config, maxOutputTokens: 128 });
    let streamed = false;
    for await (const chunk of model.stream([{ role: 'user', content: 'Reply with OK.' }], [], signal)) if (chunk.type === 'text') streamed = true;
    let tools = false;
    const definition = { name: 'probe', description: 'Return the exact word OpenLab', parameters: { type: 'object', properties: { word: { type: 'string' } }, required: ['word'], additionalProperties: false } } as const;
    for await (const chunk of model.stream([{ role: 'user', content: 'Call probe with word OpenLab. Do not answer in text.' }], [definition as unknown as import('./contracts.ts').ToolDefinition], signal)) {
      if (chunk.type === 'tool' && chunk.call.name === 'probe' && JSON.parse(chunk.call.arguments).word === 'OpenLab') tools = true;
    }
    if (!streamed || !tools) throw new DomainError('Selected model did not demonstrate streaming and structured tool calls', 409);
    const entries = this.list();
    const entry = entries.find(p => p.id === providerId)!;
    Object.assign(entry, { testedAt: new Date().toISOString(), streaming: true, tools: true });
    this.save(entries);
    return entry;
  }
}
