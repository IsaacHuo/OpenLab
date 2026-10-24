import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fixture, SubstituteRuntime, until } from './helpers.ts';
import { Store } from '../store.ts';
import { Platform } from '../platform.ts';
import type { Run } from '../contracts.ts';

test('plan confirmation gates work and creation keys do not dispatch twice', async () => {
  let work = 0;
  const f = fixture(new SubstituteRuntime(async (_run, host, signal) => {
    await host.wait({ kind: 'confirmation', input: 'boolean', prompt: 'Search metadata', scope: { tools: ['search'] } }, signal);
    work++;
  }));
  try {
    const run = f.create();
    assert.equal(f.create().id, run.id);
    assert.throws(() => f.create('Different question'), /different input/);
    const waiting = await until(() => f.store.get<Run>('run', run.id), r => r.state === 'awaiting_confirmation');
    assert.equal(work, 0);
    assert.throws(() => f.platform.confirm(run.id, 99), /current plan/);
    f.platform.confirm(run.id, waiting.plan!.version);
    await f.platform.tasks.get(run.id);
    assert.equal(work, 1);
    assert.equal(f.store.get<Run>('run', run.id).state, 'succeeded');
    assert.throws(() => f.platform.confirm(run.id, waiting.plan!.version), /current plan/);
  } finally { await f.cleanup(); }
});

test('questions validate answers, duplicate decisions are idempotent and denial is retained', async () => {
  let permissions: unknown;
  const f = fixture(new SubstituteRuntime(async (_run, host, signal) => {
    await host.wait({ kind: 'confirmation', input: 'boolean', prompt: 'Plan', scope: { tools: [] } }, signal);
    await host.wait({ kind: 'question', input: 'single_choice', options: ['economics', 'humanities'], prompt: 'Discipline?' }, signal);
    permissions = await host.wait({ kind: 'permission', input: 'boolean', prompt: 'Read content?', scope: { sourceId: 'fixture' } }, signal);
  }));
  try {
    const run = f.create();
    const read = () => f.store.get<Run>('run', run.id);
    const plan = await until(read, r => r.state === 'awaiting_confirmation');
    f.platform.confirm(run.id, plan.plan!.version);
    const question = await until(read, r => r.state === 'awaiting_input');
    const decision = { interactionId: question.interaction!.id, version: question.interaction!.version, value: 'economics' };
    assert.throws(() => f.platform.respond(run.id, { ...decision, value: 'invalid' }), /listed option/);
    assert.throws(() => f.platform.respond(run.id, { ...decision, version: 99 }), /Stale/);
    f.platform.respond(run.id, decision);
    assert.deepEqual(f.platform.respond(run.id, decision), decision);
    assert.throws(() => f.platform.respond(run.id, { ...decision, value: 'humanities' }), /differently/);
    const permission = await until(read, r => r.state === 'awaiting_permission');
    f.platform.respond(run.id, { interactionId: permission.interaction!.id, version: permission.interaction!.version, value: false });
    await f.platform.tasks.get(run.id);
    assert.equal(permissions, false);
    assert.equal(f.store.events(run.id).filter(e => e.kind === 'interaction_answered').length, 3);
    assert.throws(() => f.platform.respond(run.id, decision), /no longer/);
  } finally { await f.cleanup(); }
});

test('cancellation is recorded before termination and blocks late decisions', async () => {
  const f = fixture(new SubstituteRuntime(async (_run, host, signal) => {
    await host.wait({ kind: 'confirmation', input: 'boolean', prompt: 'Plan' }, signal);
  }));
  try {
    const run = f.create();
    await until(() => f.store.get<Run>('run', run.id), r => r.state === 'awaiting_confirmation');
    assert.equal((await f.platform.cancel(run.id)).state, 'cancelled');
    const events = f.store.events(run.id);
    assert.ok(events.findIndex(e => e.kind === 'cancel_requested') < events.findIndex(e => e.kind === 'run_finished'));
    assert.equal((await f.platform.cancel(run.id)).state, 'cancelled');
  } finally { await f.cleanup(); }
});

test('one active run per conversation, explicit linked retry and completed cancellation race', async () => {
  const f = fixture();
  try {
    const first = f.create();
    assert.throws(() => f.create('Next', 'next'), /active run/);
    await f.platform.tasks.get(first.id);
    assert.equal((await f.platform.cancel(first.id)).state, 'succeeded');
    const retry = f.platform.createRun(f.conversationId, { question: 'Retry', requestKey: 'retry', config: {}, parentRunId: first.id });
    assert.equal(retry.parentRunId, first.id);
    await f.platform.tasks.get(retry.id);
    assert.throws(() => f.platform.createRun(f.conversationId, { question: 'Retry', requestKey: 'bad-parent', config: {}, parentRunId: randomUUID() }), /Retry parent/);
  } finally { await f.cleanup(); }
});

test('restart reconciles lost runs without executing, reopening history offline', async () => {
  const f = fixture();
  try {
    const run = f.create();
    await f.platform.tasks.get(run.id);
    f.store.append(run.id, 'synthetic_loss', {}, r => { r.state = 'running'; });
    f.store.close();
    const reopened = new Store(f.root);
    let started = 0;
    const platform = new Platform(reopened, new SubstituteRuntime(async () => { started++; }));
    assert.equal(reopened.get<Run>('run', run.id).state, 'interrupted');
    assert.equal(started, 0);
    assert.equal(reopened.list('message', f.projectId)[0].content, run.question);
    await platform.close();
    // Restore the fixture handle for cleanup after the explicit restart test.
    f.platform.store = new Store(f.root);
  } finally { await f.cleanup(); }
});

test('events and state roll back together on persistence error', async () => {
  const f = fixture();
  try {
    const run = f.create();
    await f.platform.tasks.get(run.id);
    const before = f.store.events(run.id).length;
    assert.throws(() => f.store.append(run.id, 'bad', {}, r => { r.state = 'failed'; throw new Error('disk failure'); }), /disk failure/);
    assert.equal(f.store.get<Run>('run', run.id).state, 'succeeded');
    assert.equal(f.store.events(run.id).length, before);
    assert.deepEqual(f.store.events(run.id, before), []);
  } finally { await f.cleanup(); }
});

test('archiving blocks execution and can be reversed', async () => {
  const f = fixture();
  try {
    f.platform.updateProject(f.projectId, { name: 'Renamed', archived: true });
    assert.throws(() => f.create(), /Reopen/);
    f.platform.updateProject(f.projectId, { archived: false });
    const run = f.create(); await f.platform.tasks.get(run.id);
    assert.equal(f.store.get('project', f.projectId).name, 'Renamed');
  } finally { await f.cleanup(); }
});
