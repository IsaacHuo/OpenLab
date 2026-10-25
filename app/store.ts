import { DatabaseSync } from 'node:sqlite';
import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, realpathSync, existsSync, lstatSync, writeFileSync, readFileSync, renameSync, openSync, fsyncSync, closeSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { DomainError, id, object, text, terminal } from './contracts.ts';
import type { Json, ObjectData, ResearchEvent, Run } from './contracts.ts';
import { validateArchivedContext } from './context.ts';

export interface RecordEntry { id: string; kind: string; projectId: string; data: ObjectData }
export const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const kinds = new Set(['project', 'conversation', 'run', 'message', 'source', 'artifact', 'revision', 'material', 'asset', 'build', 'draft']);
export class Store {
  db!: DatabaseSync;
  root: string;
  ownerToken = randomUUID();
  constructor(root: string) {
    mkdirSync(root, { recursive: true });
    this.root = realpathSync(root);
    const lock = join(this.root, 'owner.lock');
    if (existsSync(lock)) {
      if (lstatSync(lock).isSymbolicLink()) throw new DomainError('Unsafe archive ownership file');
      const owner = JSON.parse(readFileSync(lock, 'utf8')) as { pid: number };
      if (!Number.isSafeInteger(owner.pid) || owner.pid <= 0) throw new DomainError('Invalid archive ownership file');
      let alive = true;
      try { process.kill(owner.pid, 0); } catch (error) { alive = (error as NodeJS.ErrnoException).code !== 'ESRCH'; }
      if (alive) throw new DomainError('This data root is already open in another OpenLab process', 409);
      unlinkSync(lock);
    }
    writeFileSync(lock, JSON.stringify({ pid: process.pid, token: this.ownerToken }), { flag: 'wx', mode: 0o600 });
    try {
    this.db = new DatabaseSync(join(this.root, 'openlab.sqlite'));
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL;');
    const version = this.db.prepare('PRAGMA user_version').get() as { user_version: number };
    if (version.user_version > 1) throw new DomainError('This archive needs a newer OpenLab version');
    this.db.exec(`CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, kind TEXT NOT NULL, project_id TEXT NOT NULL, data TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS records_project ON records(project_id, kind);
      CREATE TABLE IF NOT EXISTS events (run_id TEXT NOT NULL, seq INTEGER NOT NULL, at TEXT NOT NULL, kind TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(run_id, seq));
      PRAGMA user_version=1;`);
    } catch (error) { this.db?.close(); this.releaseOwnership(); throw error; }
  }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  put(kind: string, recordId: string, projectId: string, data: ObjectData): void {
    id(recordId); id(projectId);
    if (!kinds.has(kind)) throw new DomainError('Invalid record kind');
    this.db.prepare('INSERT INTO records VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(recordId, kind, projectId, JSON.stringify(data));
  }
  get<T = ObjectData>(kind: string, recordId: string): T {
    const row = this.db.prepare('SELECT data FROM records WHERE id=? AND kind=?').get(id(recordId), kind) as { data: string } | undefined;
    if (!row) throw new DomainError(`${kind} not found`, 404);
    return JSON.parse(row.data) as T;
  }
  list<T = ObjectData>(kind: string, projectId?: string): T[] {
    const rows = projectId
      ? this.db.prepare('SELECT data FROM records WHERE kind=? AND project_id=? ORDER BY rowid').all(kind, id(projectId))
      : this.db.prepare('SELECT data FROM records WHERE kind=? ORDER BY rowid').all(kind);
    return rows.map(row => JSON.parse(row.data as string) as T);
  }
  saveRun(run: Run): void { this.put('run', run.id, run.projectId, run as unknown as ObjectData); }
  append(runId: string, kind: string, data: ObjectData, mutate?: (run: Run) => void): ResearchEvent {
    return this.transaction(() => this.appendInTransaction(runId, kind, data, mutate));
  }
  private appendInTransaction(runId: string, kind: string, data: ObjectData, mutate?: (run: Run) => void): ResearchEvent {
      const run = this.get<Run>('run', runId);
      mutate?.(run);
      this.saveRun(run);
      const row = this.db.prepare('SELECT COALESCE(MAX(seq), 0)+1 AS seq FROM events WHERE run_id=?').get(runId) as { seq: number };
      const event = { runId, seq: row.seq, at: new Date().toISOString(), kind, data };
      this.db.prepare('INSERT INTO events VALUES (?, ?, ?, ?, ?)').run(runId, event.seq, event.at, kind, JSON.stringify(data));
      return event;
  }
  events(runId: string, cursor = 0): ResearchEvent[] {
    this.get('run', runId);
    if (!Number.isSafeInteger(cursor) || cursor < 0) throw new DomainError('Invalid cursor');
    const rows = this.db.prepare('SELECT * FROM events WHERE run_id=? AND seq>? ORDER BY seq').all(runId, cursor);
    return rows.map(row => ({ runId, seq: row.seq as number, at: row.at as string, kind: row.kind as string, data: JSON.parse(row.data as string) as ObjectData }));
  }
  // IDs are generated by the platform. Check every managed directory before use,
  // including after restart, so a replaced directory cannot redirect file access.
  file(projectId: string, category: 'artifacts' | 'materials', recordId: string, leaf: string): string {
    id(projectId); id(recordId);
    if (!/^[a-zA-Z0-9.-]+$/.test(leaf) || leaf.includes('..')) throw new DomainError('Invalid filename');
    let path = this.root;
    for (const segment of [projectId, category, recordId]) {
      path = join(path, segment);
      if (existsSync(path)) {
        if (lstatSync(path).isSymbolicLink() || !lstatSync(path).isDirectory()) throw new DomainError('Unsafe project path');
      } else mkdirSync(path);
    }
    const target = join(path, leaf);
    if (existsSync(target) && lstatSync(target).isSymbolicLink()) throw new DomainError('Unsafe file path');
    return target;
  }
  writeImmutable(path: string, bytes: Buffer | string): void {
    const temp = `${path}.${randomUUID()}.tmp`;
    writeFileSync(temp, bytes, { flag: 'wx' });
    const fd = openSync(temp, 'r+');
    try { fsyncSync(fd); } finally { closeSync(fd); }
    if (existsSync(path)) throw new DomainError('Immutable file already exists', 409);
    renameSync(temp, path);
  }
  artifact(run: Run, content: string, stepId: string, commit: boolean, artifactId: string = randomUUID()): ObjectData {
    text(content, 'report', 2_000_000); id(stepId); id(artifactId);
    const previous = this.list('artifact', run.projectId).find(a => a.id === artifactId);
    if (previous && previous.runId !== run.id) throw new DomainError('Artifact belongs to another run');
    const revisionId = randomUUID();
    const digest = hash(content);
    const path = this.file(run.projectId, 'artifacts', artifactId, `${revisionId}.md`);
    this.writeImmutable(path, content);
    const revision: ObjectData = { origin: 'agent', conversationId: run.conversationId, ...(previous?.latest ? { parentRevisionId: previous.latest } : {}), id: revisionId, projectId: run.projectId, artifactId, runId: run.id, stepId, hash: digest, bytes: Buffer.byteLength(content), committed: commit, createdAt: new Date().toISOString() };
    this.transaction(() => {
      this.put('revision', revisionId, run.projectId, revision);
      this.put('artifact', artifactId, run.projectId, { ...previous, name: content.match(/^#\s+(.+)/m)?.[1]?.slice(0, 200) ?? previous?.name ?? 'Research report', conversationId: run.conversationId, formatId: 'markdown', mainPath: 'report.md', latestGenerated: revisionId, id: artifactId, projectId: run.projectId, runId: run.id, latest: revisionId, draft: !commit });
      this.appendInTransaction(run.id, 'artifact_saved', { artifactId, revisionId, stepId, committed: commit, hash: digest });
    });
    return revision;
  }
  readRevision(revisionId: string): { revision: ObjectData; content: string } {
    const revision = this.get('revision', revisionId);
    const content = readFileSync(this.file(String(revision.projectId), 'artifacts', String(revision.artifactId), `${id(revisionId)}.md`), 'utf8');
    if (hash(content) !== revision.hash) throw new DomainError('Artifact checksum mismatch', 500);
    return { revision, content };
  }
  material(projectId: string, name: string, bytes: Buffer): ObjectData {
    this.get('project', projectId);
    if (!bytes.length || bytes.length > 10_000_000) throw new DomainError('Material must be between 1 byte and 10 MB');
    const materialId = randomUUID();
    const filename = text(name, 'filename', 250).split(/[\\/]/).at(-1)!;
    let contentType = 'application/octet-stream';
    let preview: Json = null;
    if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) contentType = 'image/png';
    else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) contentType = 'image/jpeg';
    else if (/\.(md|txt)$/i.test(filename)) {
      try { preview = new TextDecoder('utf-8', { fatal: true }).decode(bytes).slice(0, 50_000); }
      catch { throw new DomainError('Text material must use UTF-8'); }
      if (String(preview).includes('\0')) throw new DomainError('Binary data cannot be previewed as text');
      contentType = /\.md$/i.test(filename) ? 'text/markdown' : 'text/plain';
    }
    this.writeImmutable(this.file(projectId, 'materials', materialId, 'content.bin'), bytes);
    const material: ObjectData = { id: materialId, projectId, name: filename, contentType, preview, bytes: bytes.length, hash: hash(bytes), createdAt: new Date().toISOString() };
    this.put('material', materialId, projectId, material);
    return material;
  }
  readMaterial(materialId: string): { material: ObjectData; bytes: Buffer } {
    const material = this.get('material', materialId);
    const bytes = readFileSync(this.file(String(material.projectId), 'materials', materialId, 'content.bin'));
    if (hash(bytes) !== material.hash || bytes.length !== material.bytes) throw new DomainError('Material checksum mismatch');
    return { material, bytes };
  }
  export(projectId: string): ObjectData {
    this.get('project', projectId);
    const rows = this.db.prepare('SELECT * FROM records WHERE project_id=? ORDER BY rowid').all(id(projectId));
    const records: RecordEntry[] = rows.filter(row => row.kind !== 'draft').map(row => ({ id: row.id as string, kind: row.kind as string, projectId, data: JSON.parse(row.data as string) as ObjectData }));
    const runs = records.filter(r => r.kind === 'run');
    if (runs.some(r => !terminal.has((r.data as unknown as Run).state))) throw new DomainError('Finish or cancel active runs before export', 409);
    const files: ObjectData = {};
    for (const record of records.filter(r => r.kind === 'revision')) files[record.id] = this.readRevision(record.id).content;
    for (const record of records.filter(r => r.kind === 'material')) files[record.id] = this.readMaterial(record.id).bytes.toString('base64');
    for (const record of records.filter(r => r.kind === 'asset')) { const bytes = readFileSync(this.file(projectId, 'materials', record.id, 'content.bin')); if (hash(bytes) !== record.data.hash || bytes.length !== record.data.bytes) throw new DomainError('Asset checksum mismatch'); files[record.id] = bytes.toString('base64'); }
    return { schemaVersion: 2, projectId, records: records as unknown as Json, events: runs.flatMap(r => this.events(r.id)) as unknown as Json, files };
  }
  import(value: unknown): string {
    const archive = object(value);
    if (![1, 2].includes(Number(archive.schemaVersion)) || !Array.isArray(archive.records) || !Array.isArray(archive.events)) throw new DomainError('Unsupported archive');
    if (archive.records.length > 10_000 || archive.events.length > 100_000) throw new DomainError('Archive exceeds record limit');
    const files = object(archive.files);
    const records = archive.records.map(value => {
      const record = object(value);
      id(text(record.id)); id(text(record.projectId));
      if (!kinds.has(String(record.kind))) throw new DomainError('Invalid archive record');
      object(record.data);
      return record as unknown as RecordEntry;
    });
    const originalProject = text(archive.projectId);
    if (records.filter(r => r.kind === 'project').length !== 1 || !records.some(r => r.kind === 'project' && r.id === originalProject) || records.some(r => r.projectId !== originalProject || r.data.id !== r.id)) throw new DomainError('Invalid archive ownership');
    const mapping = new Map(records.map(r => [r.id, randomUUID()]));
    if (mapping.size !== records.length) throw new DomainError('Duplicate archive identifiers');
    const projectId = mapping.get(originalProject)!;
    const byId = new Map(records.map(record => [record.id, record]));
    const reference = (value: Json | undefined, kind: string) => {
      if (typeof value !== 'string' || byId.get(value)?.kind !== kind) throw new DomainError('Archive contains a missing or foreign reference');
    };
    const archivedConversation = (artifact: ObjectData) => artifact.conversationId ?? byId.get(String(artifact.runId))?.data.conversationId;
    for (const record of records) {
      const data = record.data;
      if (record.kind !== 'project' && data.projectId !== originalProject) throw new DomainError('Archive contains foreign project data');
      if (record.kind === 'project') { text(data.name, 'project name', 200); if (typeof data.archived !== 'boolean') throw new DomainError('Invalid archived project'); }
      if (record.kind === 'conversation') text(data.name, 'conversation name', 200);
      if (record.kind === 'run') {
        reference(data.conversationId, 'conversation');
        text(data.question, 'question', 20_000); object(data.decisions); object(data.limits);
        const config = object(data.config);
        const keys = new Set(['providerId', 'model', 'skillId', 'skillRevision', 'skillPath', 'runtimeId', 'retrievalId', 'language', 'materialIds']);
        for (const [key, value] of Object.entries(config)) {
          if (!keys.has(key)) throw new DomainError('Archive run contains private or unsupported configuration');
          if (key === 'materialIds') { if (!Array.isArray(value)) throw new DomainError('Invalid archive materials'); for (const materialId of value) reference(materialId, 'material'); }
          else text(value, 'selection', 500);
        }
        if (data.parentRunId) reference(data.parentRunId, 'run');
        validateArchivedContext(data, byId);
      }
      if (record.kind === 'message') { reference(data.runId, 'run'); reference(data.conversationId, 'conversation'); if (typeof data.content !== 'string' || data.content.length > 2_000_000 || !['user', 'assistant'].includes(String(data.role))) throw new DomainError('Invalid archived message'); }
      if (record.kind === 'artifact') { if (data.runId) reference(data.runId, 'run'); else reference(data.conversationId, 'conversation'); reference(data.latest, 'revision'); if (data.latestGenerated) reference(data.latestGenerated, 'revision'); if (data.creationRevisionId) reference(data.creationRevisionId, 'revision'); }
      if (record.kind === 'revision') {
        reference(data.artifactId, 'artifact');
        if (data.origin === 'user') { if (archive.schemaVersion !== 2) throw new DomainError('User revision requires archive v2'); reference(data.conversationId, 'conversation'); }
        else { reference(data.runId, 'run'); id(text(data.stepId)); }
        if (data.parentRevisionId) { if (records.findIndex(value => value.id === data.parentRevisionId) >= records.findIndex(value => value.id === data.id)) throw new DomainError('Revision ancestry is not ordered'); reference(data.parentRevisionId, 'revision'); if (byId.get(String(data.parentRevisionId))?.data.artifactId !== data.artifactId) throw new DomainError('Foreign parent revision'); }
        if (data.files !== undefined) { if (!Array.isArray(data.files) || data.files.length > 50) throw new DomainError('Invalid archived resources'); for (const file of data.files) { const f = object(file); reference(f.assetId, 'asset'); if (typeof f.path !== 'string' || f.path.includes('\\') || f.path.split('/').some(part => !part || part === '.' || part === '..')) throw new DomainError('Unsafe archived resource path'); const asset = byId.get(String(f.assetId))!.data; if (f.hash !== asset.hash || f.bytes !== asset.bytes) throw new DomainError('Resource checksum mismatch'); } }
      }
      if (record.kind === 'build') { reference(data.artifactId, 'artifact'); reference(data.sourceRevisionId, 'revision'); const source = byId.get(String(data.sourceRevisionId))!.data; if (source.artifactId !== data.artifactId || source.hash !== data.sourceHash) throw new DomainError('Build source mismatch'); if (data.outputAssetId) { reference(data.outputAssetId, 'asset'); if (byId.get(String(data.outputAssetId))!.data.hash !== data.outputHash) throw new DomainError('Build output checksum mismatch'); } }
      if (record.kind === 'asset' && archive.schemaVersion !== 2) throw new DomainError('Asset requires archive v2');
      if (record.kind === 'draft') throw new DomainError('Drafts are not portable published revisions');
      if (record.kind === 'artifact') {
        if (data.conversationId !== undefined) reference(data.conversationId, 'conversation');
        if (data.runId && data.conversationId !== undefined && byId.get(String(data.runId))?.data.conversationId !== data.conversationId) throw new DomainError('Artifact conversation mismatch');
        if (byId.get(String(data.latest))?.data.artifactId !== data.id || (data.latestGenerated && byId.get(String(data.latestGenerated))?.data.artifactId !== data.id)) throw new DomainError('Artifact latest revision mismatch');
      }
      if (record.kind === 'revision') {
        const artifact = byId.get(String(data.artifactId))!.data;
        if (data.origin === 'user' && archivedConversation(artifact) !== data.conversationId) throw new DomainError('Revision conversation mismatch');
        if (data.origin !== 'user' && byId.get(String(data.runId))?.data.conversationId !== archivedConversation(artifact)) throw new DomainError('Revision run mismatch');
      }
      if (record.kind === 'source') {
        text(data.title, 'source title', 2000);
        const url = new URL(text(data.url));
        if (url.protocol !== 'https:' || url.username || url.password) throw new DomainError('Invalid archived source URL');
        if (!['unverified', 'metadata_verified', 'content_verified'].includes(String(data.verification)) || !Array.isArray(data.accesses)) throw new DomainError('Invalid archived evidence');
        for (const access of data.accesses) reference(object(access).runId, 'run');
      }
    }
    const rewrite = (value: Json): Json => {
      if (typeof value === 'string') return mapping.get(value) ?? value;
      if (Array.isArray(value)) return value.map(rewrite);
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewrite(item)]));
      return value;
    };
    for (const record of records) {
      if (record.kind === 'run' && !terminal.has((record.data as unknown as Run).state)) throw new DomainError('Archive contains executable run');
      if (record.kind === 'revision') {
        const content = record.data.origin === 'user' && files[record.id] === '' ? '' : text(files[record.id], 'artifact', 2_000_000);
        if (hash(content) !== record.data.hash || Buffer.byteLength(content) !== record.data.bytes || !records.some(r => r.kind === 'artifact' && r.id === record.data.artifactId)) throw new DomainError('Archive checksum or reference mismatch');
      }
      if (record.kind === 'asset') { const encoded = record.data.bytes === 0 && String(record.data.contentType).startsWith('text/') && files[record.id] === '' ? '' : text(files[record.id], 'asset', 14_000_000); const bytes = Buffer.from(encoded, 'base64'); if (bytes.toString('base64') !== encoded || bytes.length > 10_000_000 || hash(bytes) !== record.data.hash || bytes.length !== record.data.bytes) throw new DomainError('Asset archive checksum mismatch'); }
      if (record.kind === 'material') {
        const bytes = Buffer.from(text(files[record.id], 'material', 14_000_000), 'base64');
        if (hash(bytes) !== record.data.hash || bytes.length !== record.data.bytes || bytes.length > 10_000_000) throw new DomainError('Material archive checksum mismatch');
        // Imported previews are derived from verified bytes, never trusted JSON.
        record.data.preview = null;
        if (['text/plain', 'text/markdown'].includes(String(record.data.contentType))) {
          try { record.data.preview = new TextDecoder('utf-8', { fatal: true }).decode(bytes).slice(0, 50_000); }
          catch { throw new DomainError('Invalid imported text material'); }
        }
        if (!['text/plain', 'text/markdown', 'image/png', 'image/jpeg', 'application/octet-stream'].includes(String(record.data.contentType))) throw new DomainError('Invalid material type');
      }
    }
    const events = archive.events.map(value => {
      const event = object(value);
      if (!records.some(r => r.kind === 'run' && r.id === event.runId) || !Number.isSafeInteger(event.seq) || Number(event.seq) < 1) throw new DomainError('Invalid archive event');
      text(event.at); text(event.kind); object(event.data);
      return rewrite(event) as unknown as ResearchEvent;
    });
    this.transaction(() => {
      for (const record of records) {
        const data = rewrite(record.data) as ObjectData;
        data.originalId = record.data.originalId ?? record.id;
        if (record.kind === 'revision') {
          // Report bytes remain exact. IDs inside prose remain historical citations.
          this.writeImmutable(this.file(projectId, 'artifacts', String(data.artifactId), `${String(data.id)}.md`), String(files[record.id]));
        }
        if (record.kind === 'material' || record.kind === 'asset') this.writeImmutable(this.file(projectId, 'materials', String(data.id), 'content.bin'), Buffer.from(String(files[record.id]), 'base64'));
        if (record.kind === 'run') { data.imported = true; delete data.interaction; }
        this.put(record.kind, String(data.id), projectId, data);
      }
      for (const event of events) this.db.prepare('INSERT INTO events VALUES (?, ?, ?, ?, ?)').run(event.runId, event.seq, event.at, event.kind, JSON.stringify(event.data));
    });
    return projectId;
  }
  private releaseOwnership(): void {
    const lock = join(this.root, 'owner.lock');
    if (existsSync(lock) && !lstatSync(lock).isSymbolicLink() && (JSON.parse(readFileSync(lock, 'utf8')) as { token: string }).token === this.ownerToken) unlinkSync(lock);
  }
  close(): void { this.db.close(); this.releaseOwnership(); }
}
