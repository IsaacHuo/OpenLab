import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { Store } from '../store.ts';
import { Platform } from '../platform.ts';
import type { HarnessHost, Run, RuntimeAdapter } from '../contracts.ts';

export class SubstituteRuntime implements RuntimeAdapter {
  action: (run: Run, host: HarnessHost, signal: AbortSignal) => Promise<void>;
  controllers = new Map<string, AbortController>();
  constructor(action: SubstituteRuntime['action'] = async () => {}) { this.action = action; }
  capabilities() { return { streaming: true, cancellation: true, questions: true, permissions: true, checkpoints: false as const }; }
  async start(run: Run, host: HarnessHost) {
    const controller = new AbortController(); this.controllers.set(run.id, controller);
    try { await this.action(run, host, controller.signal); } finally { this.controllers.delete(run.id); }
  }
  async cancel(runId: string) { this.controllers.get(runId)?.abort(); }
  async close() { for (const controller of this.controllers.values()) controller.abort(); }
}
export async function until<T>(read: () => T, condition: (value: T) => boolean, timeout = 5000): Promise<T> {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const value = read(); if (condition(value)) return value; await delay(10); }
  throw new Error('Timed out waiting for expected state');
}
export function fixture(runtime: RuntimeAdapter = new SubstituteRuntime()) {
  const root = mkdtempSync(join(tmpdir(), 'OpenLab 中文 space '));
  const store = new Store(root);
  const platform = new Platform(store, runtime);
  const projectId = String(platform.project('经济与人文')['id']);
  const conversationId = String(platform.conversation(projectId)['id']);
  const create = (question = 'What does the evidence show?', requestKey = 'once') => platform.createRun(conversationId, { question, requestKey, config: { providerId: 'fixture', skillId: 'fixture' } });
  return { root, store, platform, projectId, conversationId, create, cleanup: async () => { await platform.close(); rmSync(root, { recursive: true, force: true }); } };
}
