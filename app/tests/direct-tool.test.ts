import test from 'node:test';
import assert from 'node:assert/strict';
import { MetadataRuntime, RuntimeRegistry } from '../direct-tool.ts';
import { Research } from '../research.ts';
import { fixture, until } from './helpers.ts';
import type { Run } from '../contracts.ts';

test('user-selected metadata tool needs no model, waits for confirmation and writes portable evidence', async () => {
  const f = fixture();
  let retrieved = 0;
  const research = new Research(f.store, async url => { retrieved++; return { url, status: 200, contentType: 'application/json', body: '{"message":{"items":[{"DOI":"10.0000/fixture","title":["Synthetic metadata"]}]}}' }; });
  f.platform.runtime = new RuntimeRegistry([['openlab-metadata-1', new MetadataRuntime(research)]]);
  try {
    const run = f.platform.createRun(f.conversationId, { question: 'metadata keywords', requestKey: 'direct', config: { runtimeId: 'openlab-metadata-1', providerId: 'none', model: 'none', language: 'zh' } });
    const waiting = await until(() => f.store.get<Run>('run', run.id), run => run.state === 'awaiting_confirmation');
    assert.equal(retrieved, 0);
    assert.deepEqual(waiting.plan!.tools, ['search_metadata', 'publish_report']);
    f.platform.confirm(run.id, waiting.plan!.version);
    await f.platform.tasks.get(run.id);
    assert.equal(retrieved, 1);
    assert.equal(f.store.get<Run>('run', run.id).state, 'succeeded');
    const revision = f.store.list('revision', f.projectId)[0];
    assert.match(f.store.readRevision(String(revision.id)).content, /没有调用模型/);
    assert.equal(f.store.events(run.id).find(event => event.kind === 'usage')!.data.totalReported, 0);
    assert.ok(f.store.import(f.store.export(f.projectId)));
  } finally { await f.cleanup(); }
});
test('static runtime registry rejects duplicate and missing implementations', async () => {
  const f = fixture();
  try {
    const adapter = new MetadataRuntime(new Research(f.store));
    assert.throws(() => new RuntimeRegistry([['same', adapter], ['same', adapter]]), /Duplicate/);
    assert.throws(() => new RuntimeRegistry([]), /At least one/);
    f.platform.runtime = new RuntimeRegistry([['metadata', adapter]]);
    const run = f.create(); await f.platform.tasks.get(run.id);
    assert.equal(f.store.get<Run>('run', run.id).state, 'failed');
    assert.match(f.store.get<Run>('run', run.id).error!, /not registered/);
  } finally { await f.cleanup(); }
});
