import test from 'node:test';
import assert from 'node:assert/strict';
import { executeHarness } from '../harness.ts';
import type { HarnessHost, Json, Message, ModelChunk, ModelProvider, ObjectData, ToolDefinition } from '../contracts.ts';

const limits = { turns: 4, tokens: 100, durationMs: 2000, callMs: 1000 };
const definition: ToolDefinition = { name: 'search', description: 'Search fixture', parameters: { type: 'object' } };
function host(events: { kind: string; data: ObjectData }[], answer: Json = true): HarnessHost {
  return { emit: async (kind, data) => { events.push({ kind, data }); }, wait: async () => answer };
}
class ScriptedModel implements ModelProvider {
  calls = 0;
  scripts: ModelChunk[][];
  observed: { messages: Message[]; tools: ToolDefinition[] }[] = [];
  constructor(scripts: ModelChunk[][]) { this.scripts = scripts; }
  async *stream(messages: Message[], tools: ToolDefinition[]) {
    this.observed.push({ messages: structuredClone(messages), tools });
    yield* this.scripts[this.calls++] ?? [{ type: 'text' as const, text: 'Done' }];
  }
}
const plan: ModelChunk[] = [{ type: 'text', text: 'Plan' }, { type: 'usage', input: 5, output: 2 }];
const search: ModelChunk[] = [{ type: 'tool', call: { id: 'call-1', name: 'search', arguments: '{"query":"经济"}' } }];

test('generic loop accepts substitute model, tool, context and sink implementations', async () => {
  const events: { kind: string; data: ObjectData }[] = [];
  const model = new ScriptedModel([plan, search, [{ type: 'text', text: 'Evidence limitations' }]]);
  const calls: unknown[] = [];
  await executeHarness({ question: 'Economics', instructions: 'Research', model, host: host(events), signal: new AbortController().signal, limits,
    tools: { definitions: [definition], execute: async call => { calls.push(call); return { sources: [], limitation: 'empty retrieval' }; } },
    context: { assemble: messages => ({ messages, trimmed: 1 }) },
  });
  assert.equal(model.observed[0].tools.length, 0);
  assert.equal(calls.length, 1);
  assert.match(model.observed[2].messages.at(-1)!.content, /empty retrieval/);
  assert.ok(events.some(e => e.kind === 'context_trimmed'));
  assert.ok(events.some(e => e.kind === 'usage' && e.data.unknownUsage === true));
  assert.ok(events.findIndex(e => e.kind === 'tool_intent') < events.findIndex(e => e.kind === 'tool_result'));
});

test('denied plan, planning tool calls, unregistered tools and malformed usage stop dispatch', async () => {
  for (const [scripts, answer, pattern] of [
    [[plan], false, /not confirmed/],
    [[search], true, /during planning/],
    [[plan, [{ type: 'tool', call: { id: 'call-2', name: 'shell', arguments: '{}' } }]], true, /unregistered/],
    [[[...plan, { type: 'usage', input: -1, output: 0 }]], true, /Invalid model usage/],
  ] as [ModelChunk[][], Json, RegExp][]) {
    let calls = 0;
    await assert.rejects(executeHarness({ question: 'Test', instructions: 'Research', model: new ScriptedModel(scripts), host: host([], answer), signal: new AbortController().signal, limits,
      tools: { definitions: [definition], execute: async () => { calls++; return null; } },
    }), pattern);
    assert.equal(calls, 0);
  }
});

test('turn and reported token budgets stop new model calls', async () => {
  for (const budget of [{ ...limits, turns: 1 }, { ...limits, tokens: 7 }]) {
    const model = new ScriptedModel([plan, search]);
    await assert.rejects(executeHarness({ question: 'Test', instructions: 'Research', model, host: host([]), signal: new AbortController().signal, limits: budget,
      tools: { definitions: [definition], execute: async () => null },
    }), /limit reached/);
    assert.equal(model.calls, 1);
  }
});

test('event persistence failure prevents the next model/tool dispatch', async () => {
  const model = new ScriptedModel([plan, search]);
  await assert.rejects(executeHarness({ question: 'Test', instructions: 'Research', model, host: { ...host([]), emit: async () => { throw new Error('disk unavailable'); } }, signal: new AbortController().signal, limits,
    tools: { definitions: [definition], execute: async () => { throw new Error('must not execute'); } },
  }), /disk unavailable/);
  assert.equal(model.calls, 0);
});
