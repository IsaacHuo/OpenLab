import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { fixture, SubstituteRuntime, until } from './helpers.ts';
import { Settings } from '../settings.ts';
import { Skills } from '../skills.ts';
import { Research } from '../research.ts';
import { createService } from '../service.ts';
import { materialMessages } from '../context.ts';
import type { Run } from '../contracts.ts';

test('run API freezes explicit/empty/legacy material selections and rejects client context', async () => {
  const f = fixture();
  const settings = new Settings(join(f.root, 'settings'), { protect: value => 'cipher:' + value, unprotect: value => value.slice(7) });
  const provider = settings.add({ name: 'Fixture', baseUrl: 'https://api.example.org', model: 'fixture', apiKey: 'synthetic-secret' });
  settings.save([{ ...provider, testedAt: 'controlled-fixture', streaming: true, tools: true }]);
  const service = await createService({ platform: f.platform, settings, skills: new Skills(join(f.root, 'skills')), research: new Research(f.store) });
  try {
    const auth = await fetch(service.origin + '/api/v1/session', { method: 'POST', headers: { origin: service.origin, 'x-openlab-bootstrap': new URL(service.launchUrl).hash.slice(7) } });
    const { csrf } = await auth.json() as { csrf: string };
    const headers = { origin: service.origin, cookie: auth.headers.get('set-cookie')!.split(';')[0], 'content-type': 'application/json', 'x-openlab-csrf': csrf };
    const one = f.store.material(f.projectId, 'one.txt', Buffer.from('selected evidence'));
    const two = f.store.material(f.projectId, 'two.txt', Buffer.from('excluded evidence'));
    const post = (requestKey: string, extra = {}) => fetch(`${service.origin}/api/v1/conversations/${f.conversationId}/runs`, { method: 'POST', headers, body: JSON.stringify({ question: 'Use materials', requestKey, providerId: provider.id, ...extra }) });
    let response = await post('explicit', { materialIds: [one.id] }); assert.equal(response.status, 201);
    const first = await response.json() as Run; await f.platform.tasks.get(first.id);
    assert.match(JSON.stringify(materialMessages(f.store, first)), /selected evidence/);
    assert.doesNotMatch(JSON.stringify(materialMessages(f.store, first)), /excluded evidence/);
    f.store.material(f.projectId, 'later.txt', Buffer.from('later evidence'));
    assert.deepEqual(f.store.get<Run>('run', first.id).config.materialIds, [one.id]);
    response = await post('empty', { materialIds: [] }); const empty = await response.json() as Run; await f.platform.tasks.get(empty.id);
    assert.deepEqual(materialMessages(f.store, empty), []);
    response = await post('legacy'); const legacy = await response.json() as Run; await f.platform.tasks.get(legacy.id);
    assert.equal((legacy.config.materialIds as string[]).length, 3);
    f.store.material(f.projectId, 'new.txt', Buffer.from('new evidence'));
    assert.equal((await (await post('legacy')).json() as Run).id, legacy.id);
    assert.equal((await post('legacy', { materialIds: [two.id] })).status, 409);
    assert.equal((await post('forged', { context: { messages: ['allowed'] } })).status, 400);
    const other = String(f.platform.project('Other').id);
    const foreign = f.store.material(other, 'foreign.txt', Buffer.from('foreign'));
    assert.equal((await post('foreign', { materialIds: [foreign.id] })).status, 400);
    const archive = JSON.stringify(f.store.export(f.projectId)); assert.doesNotMatch(archive, /synthetic-secret|cipher:/);
  } finally { await service.close(); }
});

test('provider edits keep blank credentials, invalidate tests and roll back failed saves', async () => {
  const f = fixture();
  try {
    const settings = new Settings(join(f.root, 'settings'), { protect: value => 'cipher:' + value, unprotect: value => value.slice(7) });
    const provider = settings.add({ name: 'Old', baseUrl: 'https://api.example.org', model: 'old', apiKey: 'old-secret' });
    settings.save([{ ...provider, testedAt: 'fixture', streaming: true, tools: true }]);
    assert.equal(settings.update(provider.id, { name: 'New', apiKey: '' }).testedAt, 'fixture');
    assert.equal(settings.config(provider.id).apiKey, 'old-secret');
    assert.equal(settings.update(provider.id, { model: 'new' }).testedAt, undefined);
    assert.throws(() => settings.update(provider.id, { baseUrl: 'https://user:secret@example.org' }), /endpoint/);
    assert.equal(settings.config(provider.id).baseUrl, provider.baseUrl);
    const save = settings.save; settings.save = () => { throw new Error('disk full'); };
    assert.throws(() => settings.update(provider.id, { name: 'Failed', apiKey: 'new-secret', model: 'bad' }), /previous configuration/);
    assert.equal(settings.config(provider.id).apiKey, 'old-secret'); assert.equal(settings.list()[0].model, 'new');
    settings.save = save;
    const updated = settings.update(provider.id, { apiKey: 'new-secret' });
    assert.equal(settings.config(provider.id).apiKey, 'new-secret');
    assert.doesNotMatch(JSON.stringify(updated), /apiKey|secret|cipher/);
    assert.doesNotMatch(readFileSync(join(settings.root, 'providers.json'), 'utf8'), /secret|cipher/);
  } finally { await f.cleanup(); }
});

test('provider PATCH cannot edit the model used by an active run', async () => {
  const f = fixture(new SubstituteRuntime(async (_run, host, signal) => { await host.wait({ kind: 'confirmation', input: 'boolean', prompt: 'Review' }, signal); }));
  const settings = new Settings(join(f.root, 'settings'), { protect: value => 'cipher:' + value, unprotect: value => value.slice(7) });
  const provider = settings.add({ name: 'Old', baseUrl: 'https://api.example.org', model: 'old', apiKey: 'secret' });
  const service = await createService({ platform: f.platform, settings, skills: new Skills(join(f.root, 'skills')), research: new Research(f.store) });
  try {
    const run = f.platform.createRun(f.conversationId, { question: 'Research', requestKey: 'active', config: { providerId: provider.id } });
    await until(() => f.store.get<Run>('run', run.id), run => run.state === 'awaiting_confirmation');
    const auth = await fetch(service.origin + '/api/v1/session', { method: 'POST', headers: { origin: service.origin, 'x-openlab-bootstrap': new URL(service.launchUrl).hash.slice(7) } });
    const { csrf } = await auth.json() as { csrf: string };
    const headers = { origin: service.origin, cookie: auth.headers.get('set-cookie')!.split(';')[0], 'content-type': 'application/json', 'x-openlab-csrf': csrf };
    const patch = () => fetch(`${service.origin}/api/v1/providers/${provider.id}`, { method: 'PATCH', headers, body: '{"model":"changed","apiKey":""}' });
    assert.equal((await patch()).status, 409); assert.equal(settings.config(provider.id).model, 'old');
    await f.platform.cancel(run.id); assert.equal((await patch()).status, 200);
  } finally { await service.close(); }
});
