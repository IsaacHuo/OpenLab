import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DomainError, id, object, terminal, text } from './contracts.ts';
import type { ObjectData, Run } from './contracts.ts';
import type { Store } from './store.ts';
import { hash } from './store.ts';

export function documentPath(value: unknown): string {
  const path = text(value, 'document path', 250);
  if (path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..' || /[<>:"|?*\x00-\x1f]/.test(part) || /[. ]$/.test(part) || /^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(part))) throw new DomainError('Unsafe document path');
  return path;
}
export function decodeFile(input: ObjectData): Buffer {
  const base64 = text(input.base64, 'file bytes', 14_000_000);
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length || bytes.length > 10_000_000 || bytes.toString('base64') !== base64) throw new DomainError('Invalid file encoding or size');
  return bytes;
}
export function artifactConversation(store: Store, artifact: ObjectData): string {
  return typeof artifact.conversationId === 'string' ? artifact.conversationId : String(store.get<Run>('run', String(artifact.runId)).conversationId);
}
export class Documents {
  store: Store;
  constructor(store: Store) { this.store = store; }
  editable(artifact: ObjectData): void {
    if (this.store.get('project', String(artifact.projectId)).archived) throw new DomainError('Reopen the project first', 409);
    if (artifact.runId && !terminal.has(this.store.get<Run>('run', String(artifact.runId)).state)) throw new DomainError('Wait for the generating run to finish before editing its report', 409);
  }
  files(input: ObjectData): { path: string; contentType: string; bytes: Buffer }[] {
    if (input.files === undefined) return [];
    if (!Array.isArray(input.files) || input.files.length > 50) throw new DomainError('At most 50 document resources');
    const files = input.files.map(value => {
      const file = object(value); const path = documentPath(file.path);
      if (!/\.(tex|bib|sty|cls|txt|md|png|jpe?g|otf|ttf)$/i.test(path)) throw new DomainError('Unsupported document resource');
      return { path, contentType: /\.png$/i.test(path) ? 'image/png' : /\.jpe?g$/i.test(path) ? 'image/jpeg' : /\.(ttf|otf)$/i.test(path) ? 'font/otf' : 'text/plain', bytes: file.base64 === '' && !/\.(png|jpe?g|otf|ttf)$/i.test(path) ? Buffer.alloc(0) : decodeFile(file) };
    });
    if (new Set(files.map(file => file.path.toLowerCase())).size !== files.length || files.reduce((sum, file) => sum + file.bytes.length, 0) > 20_000_000) throw new DomainError('Duplicate resources or document exceeds 20 MB');
    return files;
  }
  asset(projectId: string, path: string, bytes: Buffer, contentType: string): ObjectData {
    const assetId = randomUUID();
    this.store.writeImmutable(this.store.file(projectId, 'materials', assetId, 'content.bin'), bytes);
    const record = { id: assetId, projectId, path, bytes: bytes.length, hash: hash(bytes), contentType };
    this.store.put('asset', assetId, projectId, record); return record;
  }
  readAsset(assetId: string): { asset: ObjectData; bytes: Buffer } {
    const asset = this.store.get('asset', assetId);
    const bytes = readFileSync(this.store.file(String(asset.projectId), 'materials', assetId, 'content.bin'));
    if (hash(bytes) !== asset.hash || bytes.length !== asset.bytes) throw new DomainError('Asset checksum mismatch');
    return { asset, bytes };
  }
  create(conversationId: string, input: ObjectData): ObjectData {
    const conversation = this.store.get('conversation', conversationId); const projectId = String(conversation.projectId);
    const requestKey = text(input.requestKey, 'request key', 200); const name = text(input.name, 'document name', 200);
    const formatId = text(input.formatId, 'document format', 80); if (!/^[a-z][a-z0-9.-]*$/.test(formatId)) throw new DomainError('Invalid document format');
    const mainPath = documentPath(input.mainPath); const content = input.content; if (typeof content !== 'string' || content.length > 2_000_000) throw new DomainError('Invalid document content');
    const fingerprint = hash(JSON.stringify({ name, formatId, mainPath, content }));
    const previous = this.store.list('artifact', projectId).find(artifact => artifact.conversationId === conversationId && artifact.creationRequestKey === requestKey);
    if (previous) { if (previous.creationFingerprint !== fingerprint) throw new DomainError('Request key already used for another document', 409); return { artifact: previous, ...this.read(String(previous.creationRevisionId)) }; }
    const artifact = { id: randomUUID(), projectId, conversationId, name, formatId, mainPath, origin: 'user', creationRequestKey: requestKey, creationFingerprint: fingerprint };
    this.editable(artifact);
    return this.store.transaction(() => {
      this.store.put('artifact', artifact.id, projectId, artifact);
      const saved = this.commit(artifact.id, { content, files: [], requestKey, baseRevisionId: null, expectedLatestRevisionId: null });
      const updated = this.store.get('artifact', artifact.id); updated.creationRevisionId = (saved.revision as ObjectData).id;
      this.store.put('artifact', artifact.id, projectId, updated); return { ...saved, artifact: updated };
    });
  }
  read(revisionId: string): ObjectData {
    const value = this.store.readRevision(revisionId);
    return { ...value, files: Array.isArray(value.revision.files) ? value.revision.files.map(item => { const file = object(item); const asset = this.readAsset(String(file.assetId)); return { ...file, base64: asset.bytes.toString('base64') }; }) : [] };
  }
  save(artifactId: string, input: ObjectData): ObjectData { return this.store.transaction(() => this.commit(artifactId, input)); }
  private commit(artifactId: string, input: ObjectData): ObjectData {
    const artifact = this.store.get('artifact', artifactId); this.editable(artifact);
    const projectId = String(artifact.projectId); const content = input.content; if (typeof content !== 'string' || content.length > 2_000_000) throw new DomainError('Invalid document content');
    const requestKey = text(input.requestKey, 'request key', 200); const files = this.files(input);
    const mainPath = String(artifact.mainPath ?? 'report.md');
    if (files.some(file => file.path.toLowerCase() === mainPath.toLowerCase())) throw new DomainError('Resource duplicates the main document');
    const fingerprint = hash(JSON.stringify({ name: input.name, content, files: files.map(file => [file.path, hash(file.bytes)]), base: input.baseRevisionId, expected: input.expectedLatestRevisionId }));
    const previous = this.store.list('revision', projectId).find(revision => revision.artifactId === artifactId && revision.requestKey === requestKey);
    if (previous) { if (previous.requestFingerprint !== fingerprint) throw new DomainError('Request key already used for another revision', 409); return { artifact, ...this.read(String(previous.id)) }; }
    if ((artifact.latest ?? null) !== input.expectedLatestRevisionId) throw new DomainError('The document has a newer revision. Compare it before saving your draft.', 409);
    let base: ObjectData | undefined;
    if (input.baseRevisionId !== null) { base = this.store.get('revision', id(text(input.baseRevisionId))); if (!base || base.artifactId !== artifactId) throw new DomainError('Revision belongs to another document'); }
    if (artifact.latest && !base) throw new DomainError('Choose a base revision');
    const sources = this.store.list('source', projectId);
    for (const match of content.matchAll(/source:([0-9a-f-]+)/gi)) if (!sources.some(source => source.id === match[1] || source.originalId === match[1])) throw new DomainError('Citation is missing from this project');
    const revisionId = randomUUID();
    const storedFiles = files.map(file => { const asset = this.asset(projectId, file.path, file.bytes, file.contentType); return { path: file.path, assetId: asset.id, hash: asset.hash, bytes: asset.bytes, contentType: file.contentType }; });
    this.store.writeImmutable(this.store.file(projectId, 'artifacts', artifactId, `${revisionId}.md`), content);
    const revision: ObjectData = { id: revisionId, projectId, artifactId, conversationId: artifactConversation(this.store, artifact), origin: 'user', contentType: artifact.formatId === 'latex' ? 'application/x-tex' : 'text/markdown', hash: hash(content), bytes: Buffer.byteLength(content), committed: true, createdAt: new Date().toISOString(), requestKey, requestFingerprint: fingerprint, files: storedFiles, ...(base ? { parentRevisionId: base.id } : {}) };
    this.store.put('revision', revisionId, projectId, revision);
    const latest = { ...artifact, ...(input.name === undefined ? {} : { name: text(input.name, 'document name', 200) }), latest: revisionId, draft: false }; this.store.put('artifact', artifactId, projectId, latest);
    return { artifact: latest, revision, content, files: storedFiles.map((file, index) => ({ ...file, base64: files[index].bytes.toString('base64') })) };
  }
  draft(artifactId: string, input?: ObjectData): ObjectData | null {
    const artifact = this.store.get('artifact', artifactId);
    const previous = this.store.list('draft', String(artifact.projectId)).find(draft => draft.artifactId === artifactId);
    if (!input) return previous ?? null;
    this.editable(artifact);
    if (typeof input.content !== 'string' || input.content.length > 2_000_000) throw new DomainError('Invalid draft content');
    this.files(input);
    if (input.baseRevisionId) { const base = this.store.get('revision', String(input.baseRevisionId)); if (!base || base.artifactId !== artifactId) throw new DomainError('Invalid draft base'); }
    if (input.name !== undefined) text(input.name, 'document name', 200);
    const draft: ObjectData = { ...(input.name === undefined ? {} : { name: input.name }), id: previous?.id ?? randomUUID(), artifactId, projectId: artifact.projectId, content: input.content, files: input.files ?? [], baseRevisionId: input.baseRevisionId ?? null, expectedLatestRevisionId: input.expectedLatestRevisionId ?? artifact.latest ?? null, updatedAt: new Date().toISOString() };
    this.store.put('draft', String(draft.id), String(artifact.projectId), draft); return draft;
  }
  build(artifactId: string, input: ObjectData): ObjectData {
    const artifact = this.store.get('artifact', artifactId); this.editable(artifact);
    const revision = this.store.get('revision', text(input.sourceRevisionId));
    if (revision.artifactId !== artifactId || revision.hash !== input.sourceHash) throw new DomainError('Build input revision mismatch');
    if (!['succeeded', 'failed', 'cancelled'].includes(String(input.status))) throw new DomainError('Invalid build status');
    const requestKey = text(input.requestKey, 'request key', 200);
    const fingerprint = hash(JSON.stringify(input));
    const previous = this.store.list('build', String(artifact.projectId)).find(build => build.artifactId === artifactId && build.requestKey === requestKey);
    if (previous) { if (previous.requestFingerprint !== fingerprint) throw new DomainError('Build key already used', 409); return previous; }
    return this.store.transaction(() => {
      let output: ObjectData | undefined;
      if (input.status === 'succeeded') {
        const bytes = decodeFile({ base64: input.pdf });
        if (bytes.subarray(0, 5).toString() !== '%PDF-') throw new DomainError('Invalid compiled PDF');
        output = this.asset(String(artifact.projectId), 'result.pdf', bytes, 'application/pdf');
      }
      const record: ObjectData = { id: randomUUID(), projectId: artifact.projectId, artifactId, sourceRevisionId: revision.id, sourceHash: revision.hash, inputHashes: [revision.hash, ...(Array.isArray(revision.files) ? revision.files.map(file => object(file).hash) : [])], pluginId: text(input.pluginId, 'compiler plugin', 100), pluginVersion: text(input.pluginVersion, 'plugin version', 100), engineVersion: text(input.engineVersion, 'engine version', 500), engine: text(input.engine, 'engine', 100), status: input.status, log: typeof input.log === 'string' ? input.log.slice(-100_000) : '', createdAt: new Date().toISOString(), requestKey, requestFingerprint: fingerprint, ...(output ? { outputAssetId: output.id, outputHash: output.hash } : {}) };
      this.store.put('build', String(record.id), String(artifact.projectId), record); return record;
    });
  }
}
