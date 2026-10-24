import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, readdirSync, lstatSync } from 'node:fs';
import { join, resolve, posix } from 'node:path';
import { DomainError, id, text } from './contracts.ts';
import type { ObjectData } from './contracts.ts';
import { hash } from './store.ts';
import { parseDocument } from 'yaml';

export interface SkillEntry { id: string; source: string; revision: string; name: string; license: string; skills: string[]; declarations?: { path: string; metadata: ObjectData }[]; enabled: boolean; maturity: 'L1'; files: { path: string; hash: string; bytes: number }[] }
function safePath(path: string): void {
  if (!path || path.includes('\\') || path.split('/').some(p => !p || p === '.' || p === '..' || /[<>:"|?*\x00-\x1f]/u.test(p) || /[. ]$/.test(p) || /^\.git$/i.test(p) || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(p))) throw new DomainError('Unsafe or unsupported skill path');
}
export class Skills {
  root: string;
  constructor(root: string) { this.root = resolve(root); mkdirSync(this.root, { recursive: true }); }
  list(): SkillEntry[] {
    return readdirSync(this.root).filter(name => /^[0-9a-f-]{36}$/i.test(name) && existsSync(join(this.root, name, 'openlab.json'))).map(name => JSON.parse(readFileSync(join(this.root, name, 'openlab.json'), 'utf8')) as SkillEntry);
  }
  get(skillId: string): SkillEntry {
    const entry = this.list().find(s => s.id === id(skillId));
    if (!entry) throw new DomainError('Skill installation not found', 404);
    return entry;
  }
  enable(skillId: string, reviewed: boolean): SkillEntry {
    const entry = this.get(skillId);
    if (!reviewed) throw new DomainError('Review source, license and requirements before enabling');
    entry.enabled = true;
    writeFileSync(join(this.root, entry.id, 'openlab.json'), JSON.stringify(entry, null, 2));
    return entry;
  }
  load(skillId: string, skillPath?: string): { entry: SkillEntry; instructions: string } {
    const entry = this.get(skillId);
    if (!entry.enabled) throw new DomainError('Review and enable the selected skill first', 409);
    const selected = skillPath ?? entry.skills[0];
    if (!entry.skills.includes(selected)) throw new DomainError('Select an installed SKILL.md');
    const needed = new Set([selected]);
    const resources = new Map<string, string>();
    const instructions: string[] = [];
    for (const file of entry.files) {
      safePath(file.path);
      const path = join(this.root, entry.id, 'upstream', file.path);
      let current = join(this.root, entry.id);
      for (const part of ['upstream', ...file.path.split('/')]) { current = join(current, part); if (lstatSync(current).isSymbolicLink()) throw new DomainError('Skill installation contains a link'); }
      const bytes = readFileSync(path);
      if (hash(bytes) !== file.hash) throw new DomainError('Installed skill checksum mismatch');
      if (/\.(md|txt|json|yaml|yml|csv)$/i.test(file.path) && bytes.length < 100_000) resources.set(file.path, bytes.toString('utf8'));
    }
    for (const path of needed) {
      const content = resources.get(path);
      if (content === undefined) throw new DomainError('Referenced skill resource is missing, unsupported or oversized');
      instructions.push(`Resource ${path}\n${content}`);
      for (const match of content.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) {
        const target = match[1].split('#')[0];
        if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
        const reference = posix.normalize(posix.join(posix.dirname(path), decodeURIComponent(target)));
        safePath(reference);
        if (/\.(md|txt|json|yaml|yml|csv)$/i.test(reference)) needed.add(reference);
      }
      if (needed.size > 64) throw new DomainError('Too many referenced skill resources');
    }
    const combined = instructions.join('\n\n');
    if (combined.length > 100_000) throw new DomainError('Skill context is too large for the first runtime');
    return { entry, instructions: combined };
  }
  installFiles(files: { path: string; bytes: Buffer }[], source: string, revision: string): SkillEntry {
    if (!/^[a-f0-9]{40}$/i.test(revision)) throw new DomainError('Pin an exact 40-character Git commit');
    if (!files.length || files.length > 5000 || files.reduce((size, file) => size + file.bytes.length, 0) > 20_000_000) throw new DomainError('Skill repository exceeds installation limit');
    const paths = new Set<string>();
    for (const file of files) { safePath(file.path); if (paths.has(file.path.toLowerCase())) throw new DomainError('Skill paths collide on Windows'); paths.add(file.path.toLowerCase()); }
    const skillPaths = files.filter(file => /(^|\/)SKILL\.md$/i.test(file.path)).map(file => file.path);
    if (!skillPaths.length) throw new DomainError('Repository contains no SKILL.md');
    const skillId = randomUUID();
    const declarations = skillPaths.map(path => {
      const bytes = files.find(file => file.path === path)!.bytes;
      const frontmatter = bytes.toString('utf8').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
      if (!frontmatter) return { path, metadata: {} };
      const document = parseDocument(frontmatter[1], { uniqueKeys: true });
      if (document.errors.length) throw new DomainError('Invalid skill frontmatter');
      const metadata: unknown = document.toJS({ maxAliasCount: 20 });
      if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new DomainError('Invalid skill metadata');
      return { path, metadata: JSON.parse(JSON.stringify(metadata)) as ObjectData };
    });
    const licenses = files.filter(file => /(^|\/)(LICENSE|LICENCE|COPYING)(\.[^/]+)?$/i.test(file.path)).map(file => `${file.path}\n${file.bytes.toString('utf8').slice(0, 12_000)}`).join('\n\n');
    const entry: SkillEntry = { id: skillId, source, revision, name: typeof declarations[0]?.metadata.name === 'string' ? declarations[0].metadata.name : source.split('/').at(-1) ?? 'Skill', license: licenses || 'No repository license found; inspect skill declarations before use.', skills: skillPaths, declarations, enabled: false, maturity: 'L1', files: files.map(file => ({ path: file.path, bytes: file.bytes.length, hash: hash(file.bytes) })) };
    for (const file of files) {
      const path = join(this.root, skillId, 'upstream', file.path);
      mkdirSync(resolve(path, '..'), { recursive: true });
      writeFileSync(path, file.bytes, { flag: 'wx' });
    }
    writeFileSync(join(this.root, skillId, 'openlab.json'), JSON.stringify(entry, null, 2));
    return entry;
  }
  async install(source: string, revision: string): Promise<SkillEntry> {
    const url = new URL(source);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.port) throw new DomainError('Skill source must be a public HTTPS Git URL');
    if (!/^[a-f0-9]{40}$/i.test(revision)) throw new DomainError('Pin an exact 40-character Git commit');
    const temporary = join(this.root, `download-${randomUUID()}`);
    mkdirSync(temporary);
    const git = async (args: string[], maxBuffer = 25_000_000): Promise<Buffer> => {
      try { return (await promisify(execFile)('git', ['-c', 'core.hooksPath=', '-c', 'protocol.file.allow=never', '-C', temporary, ...args], { windowsHide: true, timeout: 60_000, maxBuffer, encoding: 'buffer', env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null' } })).stdout; }
      catch { throw new DomainError('Could not fetch pinned public skill repository'); }
    };
    try {
      await git(['init', '--quiet']); await git(['fetch', '--quiet', '--depth=1', source, revision]);
      if ((await git(['rev-parse', 'FETCH_HEAD'])).toString().trim() !== revision.toLowerCase()) throw new DomainError('Skill revision mismatch');
      const rows = (await git(['ls-tree', '-rz', '--long', revision])).toString().split('\0').filter(Boolean);
      if (rows.length > 5000) throw new DomainError('Skill repository exceeds file limit');
      const files: { path: string; bytes: Buffer }[] = [];
      let size = 0;
      for (const row of rows) {
        const match = row.match(/^(\d+) (\w+) ([a-f0-9]+)\s+(\d+)\t([\s\S]+)$/);
        if (!match || !['100644', '100755'].includes(match[1]) || match[2] !== 'blob' || Number(match[4]) > 2_000_000) throw new DomainError('Skill links, submodules or oversized files are unsupported');
        safePath(match[5]);
        size += Number(match[4]);
        if (size > 20_000_000) throw new DomainError('Skill repository exceeds installation limit');
        files.push({ path: match[5], bytes: await git(['cat-file', 'blob', match[3]]) });
      }
      return this.installFiles(files, source, revision);
    } finally {
      // The exact temporary child is generated here and never comes from input.
      if (resolve(temporary).startsWith(this.root + (process.platform === 'win32' ? '\\' : '/'))) rmSync(temporary, { recursive: true, force: true });
    }
  }
}
