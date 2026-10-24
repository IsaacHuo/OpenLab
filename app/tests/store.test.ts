import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fixture } from './helpers.ts';
import type { ObjectData } from '../contracts.ts';

test('Unicode paths, exact immutable revisions, checksums and export/import round trip', async () => {
  const f = fixture();
  try {
    const run = f.create('中文文献的相互矛盾证据'); await f.platform.tasks.get(run.id);
    const artifactId = randomUUID();
    const first = f.store.artifact(run, '# 草稿\n\nEvidence remains unverified.', randomUUID(), false, artifactId);
    const second = f.store.artifact(run, '# Final\n\nMetadata is not checked evidence.', randomUUID(), true, artifactId);
    assert.notEqual(first.hash, second.hash);
    assert.match(f.store.readRevision(String(first.id)).content, /草稿/);
    const archive = f.store.export(f.projectId);
    const importedId = f.store.import(archive);
    const imported = f.store.export(importedId);
    assert.deepEqual(Object.values(imported.files as ObjectData), Object.values(archive.files as ObjectData));
    assert.equal(f.store.list('run', importedId)[0].imported, true);
    assert.notEqual(importedId, f.projectId);
    const serialized = JSON.stringify(archive);
    assert.ok(!serialized.includes('apiKey'));
    assert.ok(!serialized.includes(f.root.replaceAll('\\', '\\\\')));
  } finally { await f.cleanup(); }
});

test('modified report bytes and corrupted exports are rejected before import', async () => {
  const f = fixture();
  try {
    const run = f.create(); await f.platform.tasks.get(run.id);
    const revision = f.store.artifact(run, 'Evidence', randomUUID(), true);
    const archive = f.store.export(f.projectId);
    (archive.files as ObjectData)[String(revision.id)] = 'tampered';
    assert.throws(() => f.store.import(archive), /checksum/);
    assert.equal(f.store.list('project').length, 1);
    writeFileSync(f.store.file(f.projectId, 'artifacts', String(revision.artifactId), `${String(revision.id)}.md`), 'tampered');
    assert.throws(() => f.store.readRevision(String(revision.id)), /checksum/);
  } finally { await f.cleanup(); }
});

test('archives reject traversal, future schemas, duplicate identifiers and executable runs', async () => {
  const f = fixture();
  try {
    const run = f.create(); await f.platform.tasks.get(run.id);
    assert.throws(() => f.store.file(f.projectId, 'artifacts', randomUUID(), '../escape'), /filename/);
    assert.throws(() => f.store.file('../escape', 'artifacts', randomUUID(), 'file'), /identifier/);
    const archive = f.store.export(f.projectId);
    assert.throws(() => f.store.import({ ...archive, schemaVersion: 2 }), /Unsupported/);
    const duplicate = structuredClone(archive);
    (duplicate.records as unknown[]).push((duplicate.records as unknown[])[0]);
    assert.throws(() => f.store.import(duplicate), /ownership|Duplicate/);
    const active = structuredClone(archive);
    const records = active.records as unknown as { kind: string; data: ObjectData }[];
    records.find(r => r.kind === 'run')!.data.state = 'running';
    assert.throws(() => f.store.import(active), /executable/);
  } finally { await f.cleanup(); }
});

test('managed directory junctions cannot redirect files outside a project', async () => {
  const f = fixture();
  try {
    const projectId = f.projectId;
    symlinkSync(f.root, join(f.root, projectId), process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => f.store.file(projectId, 'artifacts', randomUUID(), 'revision.md'), /Unsafe/);
  } finally { await f.cleanup(); }
});
