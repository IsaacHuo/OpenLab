import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { contextMessages } from '../context.ts';
import { executeHarness } from '../harness.ts';
import { fixture, SubstituteRuntime } from './helpers.ts';
import type { ObjectData, Run, Message } from '../contracts.ts';

test('follow-up freezes the selected revision, scoped history and fresh confirmation', async () => {
  const f = fixture(new SubstituteRuntime(async (_run, host) => { await host.emit('message_end', { messageId: randomUUID(), content: 'Earlier evidence', stepId: null }); }));
  try {
    const first = f.create('Original question'); await f.platform.tasks.get(first.id);
    const old = f.store.artifact(first, '# Selected old report', randomUUID(), true);
    f.store.artifact(first, '# New report', randomUUID(), true, String(old.artifactId));
    const other = String(f.platform.conversation(f.projectId, 'Other').id);
    const foreign = f.platform.createRun(other, { question: 'Must stay isolated', requestKey: 'foreign', config: {} }); await f.platform.tasks.get(foreign.id);
    const foreignRevision = f.store.artifact(foreign, '# Foreign', randomUUID(), true);
    assert.throws(() => f.platform.createRun(f.conversationId, { question: 'bad', requestKey: 'bad', config: {}, contextRevisionId: String(foreignRevision.id) }), /conversation/);
    const input = { question: 'Continue analysis', requestKey: 'follow-up', config: {}, contextRevisionId: String(old.id) };
    const follow = f.platform.createRun(f.conversationId, input); await f.platform.tasks.get(follow.id);
    f.store.artifact(first, '# Later update', randomUUID(), true, String(old.artifactId));
    assert.deepEqual(f.platform.createRun(f.conversationId, input).context, follow.context);
    const history = contextMessages(f.store, follow);
    assert.match(JSON.stringify(history), /Original question/);
    assert.match(JSON.stringify(history), /Selected old report/);
    assert.doesNotMatch(JSON.stringify(history), /Must stay isolated|New report|Later update/);
    let confirmations = 0; let dispatches = 0; let observed: Message[] = [];
    await assert.rejects(executeHarness({ question: follow.question, instructions: 'Research', history, limits: follow.limits, signal: new AbortController().signal,
      model: { async *stream(messages, tools) { observed = structuredClone(messages); assert.equal(tools.length, 0); yield { type: 'text' as const, text: 'New plan' }; } },
      host: { emit: async () => {}, wait: async () => { confirmations++; return false; } },
      tools: { definitions: [], execute: async () => { dispatches++; return null; } },
    }), /not confirmed/);
    assert.equal(confirmations, 1); assert.equal(dispatches, 0);
    assert.ok(observed.some(message => message.content === 'Original question'));
    assert.ok(observed.every(message => !message.tool_calls && !message.tool_call_id));
    assert.deepEqual(follow.decisions, {});
  } finally { await f.cleanup(); }
});

test('bounded history and report excerpts are visible, deterministic and archive compatible', async () => {
  const f = fixture();
  try {
    let last!: Run;
    for (let index = 0; index < 8; index++) { last = f.create(String(index) + 'x'.repeat(9000), String(index)); await f.platform.tasks.get(last.id); }
    f.store.artifact(last, '# Report\n' + 'z'.repeat(25_000), randomUUID(), true);
    const follow = f.create('Continue', 'follow'); await f.platform.tasks.get(follow.id);
    assert.equal(follow.context!.runIds.length, 6);
    assert.equal(follow.context!.historyTruncated, true); assert.equal(follow.context!.reportTruncated, true);
    const messages = contextMessages(f.store, follow);
    assert.equal(messages.filter(message => message.role === 'user' && !message.content.startsWith('Previously selected report')).reduce((total, message) => total + message.content.length, 0), 40_000);
    assert.doesNotMatch(messages[1].content, /^0x|^1x/);
    assert.equal(messages.at(-1)!.content.split('# Report\n')[1].split('\n[Report excerpt')[0].length, 20_000 - '# Report\n'.length);
    const archive = f.store.export(f.projectId);
    const imported = f.store.import(structuredClone(archive));
    const restored = f.store.list<Run>('run', imported).at(-1)!;
    assert.notEqual(restored.context!.revisionId, follow.context!.revisionId);
    assert.match(JSON.stringify(contextMessages(f.store, restored)), /Report/);
    assert.equal(f.platform.tasks.size, 0);
    const legacy = structuredClone(archive);
    for (const record of legacy.records as ObjectData[]) if (record.kind === 'run') delete (record.data as ObjectData).context;
    assert.ok(f.store.import(legacy));
    const malformed = structuredClone(archive);
    const record = (malformed.records as ObjectData[]).find(record => record.id === follow.id)!;
    ((record.data as ObjectData).context as ObjectData).runIds = [follow.id];
    assert.throws(() => f.store.import(malformed), /earlier runs/);
  } finally { await f.cleanup(); }
});
