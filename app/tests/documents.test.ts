import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fixture } from './helpers.ts';
import { Documents } from '../documents.ts';
import { Plugins } from '../plugins.ts';
import { builtinPlugins, resolvePlugin } from '../plugin-contracts.ts';
import type { ObjectData } from '../contracts.ts';

test('plugins share a capability contract, preserve disabled defaults and accept a replacement', async () => {
  const f = fixture();
  try {
    const replacement = { ...builtinPlugins[0], id: 'test.editor', name: 'Replacement' };
    const plugins = new Plugins(f.root, [...builtinPlugins, replacement]);
    plugins.update({ defaults: { 'editor:markdown': replacement.id } });
    assert.equal(resolvePlugin(plugins.catalog(), 'editor', 'markdown')?.id, replacement.id);
    plugins.update({ enabled: { [replacement.id]: false } });
    assert.equal(resolvePlugin(new Plugins(f.root, [...builtinPlugins, replacement]).catalog(), 'editor', 'markdown'), undefined);
    assert.throws(() => plugins.update({ defaults: { 'compiler:latex': 'openlab.text-editor' } }), /capability/);
  } finally { await f.cleanup(); }
});

test('human revisions do not change agent bytes or events; idempotence and conflicts preserve drafts', async () => {
  const f = fixture();
  try {
    const run = f.create(); await f.platform.tasks.get(run.id);
    const old = f.store.artifact(run, '# Original', randomUUID(), true); const events = f.store.events(run.id);
    const documents = new Documents(f.store);
    const input = { content: '# Edited', requestKey: 'edit', baseRevisionId: old.id, expectedLatestRevisionId: old.id, files: [] };
    const saved = documents.save(String(old.artifactId), input);
    assert.equal((saved.revision as ObjectData).origin, 'user');
    assert.equal((saved.revision as ObjectData).runId, undefined);
    assert.equal((documents.save(String(old.artifactId), input).revision as ObjectData).id, (saved.revision as ObjectData).id);
    assert.equal(f.store.readRevision(String(old.id)).content, '# Original');
    assert.deepEqual(f.store.events(run.id), events);
    assert.equal(f.store.get('artifact', String(old.artifactId)).latestGenerated, old.id);
    documents.draft(String(old.artifactId), { ...input, content: '# Draft' });
    assert.throws(() => documents.save(String(old.artifactId), { ...input, requestKey: 'conflict' }), /newer revision/);
    assert.equal(documents.draft(String(old.artifactId))!.content, '# Draft');
    const following = f.create('Continue from edited report', 'follow'); await f.platform.tasks.get(following.id);
    assert.equal(following.context?.revisionId, (saved.revision as ObjectData).id);
  } finally { await f.cleanup(); }
});

test('new multifile documents and builds survive v2 round trips without a fake run', async () => {
  const f = fixture();
  try {
    const documents = new Documents(f.store);
    const created = documents.create(f.conversationId, { name: 'Paper', formatId: 'latex', mainPath: 'main.tex', content: '\\documentclass{article}', requestKey: 'create' });
    const artifact = created.artifact as ObjectData; const first = created.revision as ObjectData;
    assert.equal(f.store.list('run').length, 0);
    const saved = documents.save(String(artifact.id), { content: '\\documentclass{article}\n\\input{section}', requestKey: 'save', baseRevisionId: first.id, expectedLatestRevisionId: first.id, files: [{ path: 'section.tex', base64: Buffer.from('中文').toString('base64') }] });
    const revision = saved.revision as ObjectData;
    const build = documents.build(String(artifact.id), { requestKey: 'build', sourceRevisionId: revision.id, sourceHash: revision.hash, pluginId: 'openlab.busytex', pluginVersion: '1', engineVersion: 'controlled-test', engine: 'xelatex', status: 'succeeded', pdf: Buffer.from('%PDF-1.7\ncontrolled persistence fixture').toString('base64'), log: '' });
    const archive = f.store.export(f.projectId); assert.equal(archive.schemaVersion, 2);
    const imported = f.store.import(archive);
    const copy = f.store.list('revision', imported).find(record => record.originalId === revision.id)!;
    const restored = documents.read(String(copy.id));
    assert.equal((restored.files as ObjectData[])[0].base64, Buffer.from('中文').toString('base64'));
    const copiedBuild = f.store.list('build', imported)[0];
    assert.equal(copiedBuild.sourceRevisionId, copy.id); assert.equal(copiedBuild.outputHash, build.outputHash);
    assert.equal(f.store.list('run', imported).length, 0);
    const malformed = structuredClone(archive); const records = malformed.records as ObjectData[];
    (records.find(record => record.id === build.id)!.data as ObjectData).sourceHash = 'bad';
    assert.throws(() => f.store.import(malformed), /Build source/);
  } finally { await f.cleanup(); }
});

test('document input rejects foreign revisions, citations and unsafe resources; v1 remains readable', async () => {
  const f = fixture();
  try {
    const run = f.create(); await f.platform.tasks.get(run.id);
    const revision = f.store.artifact(run, '# Legacy', randomUUID(), true); const documents = new Documents(f.store);
    const input = { content: 'Edited', requestKey: 'x', baseRevisionId: revision.id, expectedLatestRevisionId: revision.id };
    assert.throws(() => documents.save(String(revision.artifactId), { ...input, files: [{ path: '../bad.tex', base64: 'eA==' }] }), /Unsafe/);
    assert.throws(() => documents.save(String(revision.artifactId), { ...input, content: `[fake](source:${randomUUID()})` }), /Citation/);
    const archive = f.store.export(f.projectId); archive.schemaVersion = 1;
    assert.ok(f.store.import(archive));
  } finally { await f.cleanup(); }
});


test('incompatible, missing and cyclic dependencies degrade only the selected capability', async () => {
  const f = fixture();
  try {
    const dependent = { ...builtinPlugins[0], id: 'dependent.editor', requires: ['missing.provider'] };
    const future = { ...builtinPlugins[0], id: 'future.editor', apiVersion: 99 };
    const cyclic = { ...builtinPlugins[0], id: 'cyclic.editor', requires: ['cyclic.editor'] };
    const plugins = new Plugins(f.root, [...builtinPlugins, dependent, future, cyclic]);
    for (const plugin of [dependent, future, cyclic]) assert.throws(() => plugins.update({ defaults: { 'editor:markdown': plugin.id } }), /capability/);
    assert.equal(resolvePlugin(plugins.catalog(), 'editor', 'markdown')?.id, builtinPlugins[0].id);
    writeFileSync(join(f.root, 'plugins.json'), 'corrupted');
    assert.ok(plugins.catalog().error);
    assert.equal(resolvePlugin(plugins.catalog(), 'editor', 'markdown'), undefined);
    plugins.update({ enabled: { 'openlab.markdown-editor': true } });
    assert.equal(resolvePlugin(plugins.catalog(), 'editor', 'markdown')?.id, 'openlab.markdown-editor');
  } finally { await f.cleanup(); }
});
