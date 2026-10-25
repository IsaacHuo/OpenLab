import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fixture, SubstituteRuntime, until } from './helpers.ts';
import { Settings } from '../settings.ts';
import { Skills } from '../skills.ts';
import { Research } from '../research.ts';
import { createService } from '../service.ts';
import type { Run, ObjectData } from '../contracts.ts';
import { HttpAgent } from '@ag-ui/client';

test('loopback authentication, origin/CSRF validation and public-only provider metadata', async () => {
  const f = fixture();
  const settings = new Settings(join(f.root, 'settings'), { protect: v => 'protected:' + v, unprotect: v => v.slice(10) });
  const service = await createService({ platform: f.platform, settings, skills: new Skills(join(f.root, 'skills')), research: new Research(f.store) });
  try {
    assert.equal((await fetch(service.origin + '/api/v1/projects')).status, 401);
    const token = new URL(service.launchUrl).hash.slice('#token='.length);
    const auth = await fetch(service.origin + '/api/v1/session', { method: 'POST', headers: { origin: service.origin, 'x-openlab-bootstrap': token } });
    const cookie = auth.headers.get('set-cookie')!.split(';')[0];
    const { csrf } = await auth.json() as { csrf: string };
    assert.ok(auth.headers.get('set-cookie')!.includes('HttpOnly'));
    const headers = { origin: service.origin, cookie, 'content-type': 'application/json', 'x-openlab-csrf': csrf };
    const projects = await fetch(service.origin + '/api/v1/projects', { headers });
    assert.equal(projects.status, 200);
    assert.equal((await fetch(service.origin + '/api/v1/projects', { method: 'POST', headers: { ...headers, 'x-openlab-csrf': 'wrong' }, body: '{}' })).status, 403);
    assert.equal((await fetch(service.origin + '/api/v1/projects', { headers: { ...headers, origin: 'https://evil.example' } })).status, 403);
    const created = await fetch(service.origin + '/api/v1/projects', { method: 'POST', headers, body: '{"name":"中文研究"}' });
    assert.equal(created.status, 201);
    const provider = await fetch(service.origin + '/api/v1/providers', { method: 'POST', headers, body: JSON.stringify({ name: 'Fixture', baseUrl: 'https://api.example.org', model: 'test', apiKey: 'test-only-secret' }) });
    assert.equal(provider.status, 201);
    assert.doesNotMatch(JSON.stringify(await provider.json()), /apiKey|test-only-secret/);
  } finally { await service.close(); }
});

test('independent AG-UI consumer and domain cursor replay never create or resume work', async () => {
  let work = 0;
  const f = fixture(new SubstituteRuntime(async (_run, host, signal) => {
    work++;
    await host.wait({ kind: 'confirmation', input: 'boolean', prompt: 'Plan' }, signal);
    await host.emit('message_start', { messageId: '00000000-0000-4000-8000-000000000001' });
    await host.emit('message_delta', { messageId: '00000000-0000-4000-8000-000000000001', text: '中文证据' });
    await host.emit('message_end', { messageId: '00000000-0000-4000-8000-000000000001', content: '中文证据', stepId: null });
  }));
  const service = await createService({ platform: f.platform, settings: new Settings(join(f.root, 'settings')), skills: new Skills(join(f.root, 'skills')), research: new Research(f.store) });
  try {
    const auth = await fetch(service.origin + '/api/v1/session', { method: 'POST', headers: { origin: service.origin, 'x-openlab-bootstrap': new URL(service.launchUrl).hash.slice(7) } });
    const cookie = auth.headers.get('set-cookie')!.split(';')[0];
    const { csrf } = await auth.json() as { csrf: string };
    const headers = { origin: service.origin, cookie, 'content-type': 'application/json', 'x-openlab-csrf': csrf };
    const run = f.create();
    const waiting = await until(() => f.store.get<Run>('run', run.id), r => r.state === 'awaiting_confirmation');
    const attached = await fetch(`${service.origin}/api/v1/runs/${run.id}/events`, { headers });
    const reader = attached.body!.getReader();
    await reader.read(); await reader.cancel();
    assert.equal(f.store.get<Run>('run', run.id).state, 'awaiting_confirmation');
    f.platform.confirm(run.id, waiting.plan!.version);
    await f.platform.tasks.get(run.id);
    const connect = (extra: ObjectData = {}) => fetch(`${service.origin}/api/v1/runs/${run.id}/ag-ui`, { method: 'POST', headers, body: JSON.stringify({ threadId: run.conversationId, runId: run.id, messages: [], tools: [], state: { state: 'succeeded' }, ...extra }) });
    const first = await connect();
    const stream = await first.text();
    const events = stream.split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)) as ObjectData);
    assert.equal(events[0].type, 'RUN_STARTED');
    assert.equal(events.at(-1)!.type, 'RUN_FINISHED');
    assert.equal(events.filter(e => e.type === 'TEXT_MESSAGE_CONTENT' && e.delta === '中文证据').length, 1);
    assert.equal(await (await connect()).text(), stream);
    assert.equal(work, 1);
    const agent = new HttpAgent({ url: `${service.origin}/api/v1/runs/${run.id}/ag-ui`, threadId: run.conversationId, headers });
    await agent.runAgent({ runId: run.id });
    assert.equal(agent.messages.filter(message => message.role === 'user').length, 1);
    assert.ok(agent.messages.some(message => message.role === 'assistant' && message.content === '中文证据'));
    assert.equal((await connect({ threadId: 'wrong' })).status, 409);
    const sequence = f.store.events(run.id).at(-1)!.seq;
    const replay = await fetch(`${service.origin}/api/v1/runs/${run.id}/events?cursor=${sequence}`, { headers });
    assert.equal(await replay.text(), '');
    const archive = await (await fetch(`${service.origin}/api/v1/projects/${f.projectId}/export`, { headers })).json();
    assert.equal((await fetch(service.origin + '/api/v1/import', { method: 'POST', headers, body: JSON.stringify(archive) })).status, 201);
  } finally { await service.close(); }
});

test('cancellation closes an interrupted text/step projection for the official AG-UI client', async () => {
  const f = fixture(new SubstituteRuntime(async (_run, host, signal) => {
    await host.emit('step_started', { stepId: 'partial-step', label: 'Partial model call' });
    await host.emit('message_start', { messageId: 'partial-message' });
    await host.emit('message_delta', { messageId: 'partial-message', text: 'Saved partial text' });
    await new Promise<void>((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true }));
  }));
  const service = await createService({ platform: f.platform, settings: new Settings(join(f.root, 'settings')), skills: new Skills(join(f.root, 'skills')), research: new Research(f.store) });
  try {
    const auth = await fetch(service.origin + '/api/v1/session', { method: 'POST', headers: { origin: service.origin, 'x-openlab-bootstrap': new URL(service.launchUrl).hash.slice(7) } });
    const cookie = auth.headers.get('set-cookie')!.split(';')[0]; const { csrf } = await auth.json() as { csrf: string };
    const run = f.create();
    await until(() => f.store.events(run.id), events => events.some(event => event.kind === 'message_delta'));
    await f.platform.cancel(run.id);
    const agent = new HttpAgent({ url: `${service.origin}/api/v1/runs/${run.id}/ag-ui`, threadId: run.conversationId, headers: { origin: service.origin, cookie, 'x-openlab-csrf': csrf } });
    await agent.runAgent({ runId: run.id });
    assert.ok(agent.messages.some(message => message.role === 'assistant' && message.content === 'Saved partial text'));
    assert.equal(f.store.get<Run>('run', run.id).state, 'cancelled');
    assert.equal(f.store.get<Run>('run', run.id).error, undefined);
  } finally { await service.close(); }
});


test('document APIs require CSRF, preserve idempotent revisions, and paginate without dispatch', async () => {
  const f = fixture();
  const service = await createService({ platform: f.platform, settings: new Settings(f.root), skills: new Skills(join(f.root, 'skills')), research: new Research(f.store) });
  try {
    const auth = await fetch(service.origin + '/api/v1/session', { method: 'POST', headers: { origin: service.origin, 'x-openlab-bootstrap': new URL(service.launchUrl).hash.slice(7) } });
    const { csrf } = await auth.json() as { csrf: string };
    const headers = { origin: service.origin, cookie: auth.headers.get('set-cookie')!.split(';')[0], 'content-type': 'application/json', 'x-openlab-csrf': csrf };
    const call = (path: string, method = 'GET', input?: ObjectData) => fetch(service.origin + '/api/v1' + path, { headers, method, ...(input ? { body: JSON.stringify(input) } : {}) });
    const path = `/conversations/${f.conversationId}/documents`;
    const input = { name: 'Document', formatId: 'markdown', mainPath: 'report.md', content: '# Original', requestKey: 'create-once' };
    assert.equal((await fetch(service.origin + '/api/v1' + path, { method: 'POST', headers: { ...headers, 'x-openlab-csrf': 'bad' }, body: JSON.stringify(input) })).status, 403);
    const first = await (await call(path, 'POST', input)).json() as ObjectData;
    const again = await (await call(path, 'POST', input)).json() as ObjectData;
    assert.equal((first.revision as ObjectData).id, (again.revision as ObjectData).id);
    const revision = first.revision as ObjectData;
    const edit = { content: '# Edited', baseRevisionId: revision.id, expectedLatestRevisionId: revision.id, requestKey: 'edit-once' };
    const saved = await call(`/artifacts/${String(revision.artifactId)}/revisions`, 'POST', edit);
    assert.equal(saved.status, 201);
    assert.equal((await call(`/artifacts/${String(revision.artifactId)}/revisions`, 'POST', { ...edit, requestKey: 'stale' })).status, 409);
    assert.equal(f.store.list('run').length, 0);
    for (let index = 0; index < 3; index++) { const run = f.create('history ' + index, 'history-' + index); await f.platform.tasks.get(run.id); }
    const page = await (await call(`/conversations/${f.conversationId}?limit=2`)).json() as ObjectData;
    assert.equal((page.runs as ObjectData[]).length, 2); assert.equal(page.hasMore, true);
    const previous = await (await call(`/conversations/${f.conversationId}?limit=2&before=${String(page.nextCursor)}`)).json() as ObjectData;
    assert.equal((previous.runs as ObjectData[]).length, 1); assert.equal(previous.hasMore, false);
    assert.equal((await (await call(`/conversations/${f.conversationId}`)).json() as ObjectData).hasMore, false);
    assert.equal((await call(`/conversations/${f.conversationId}?limit=2&before=not-owned`)).status, 400);
    assert.equal(f.store.list('run').length, 3);
  } finally { await service.close(); }
});
