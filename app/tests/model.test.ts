import test from 'node:test';
import assert from 'node:assert/strict';
import { CompatibleModel } from '../model.ts';
import { DomainError } from '../contracts.ts';
import type { ModelChunk } from '../contracts.ts';

const chunk = (delta: unknown, finish_reason: string | null = null) => `data: ${JSON.stringify({ choices: [{ index: 0, delta, finish_reason }] })}\r\n\r\n`;
const usage = 'data: {"choices":[],"usage":{"prompt_tokens":12,"completion_tokens":4}}\r\n\r\n';
async function collect(body: string, status = 200, headers = { 'content-type': 'text/event-stream' }): Promise<ModelChunk[]> {
  const bytes = new TextEncoder().encode(body);
  const response = () => Promise.resolve(new Response(new ReadableStream({ start(controller) { for (let i = 0; i < bytes.length; i += 3) controller.enqueue(bytes.slice(i, i + 3)); controller.close(); } }), { status, headers }));
  const model = new CompatibleModel({ baseUrl: 'http://127.0.0.1:1234', model: 'fixture', apiKey: 'test-value' }, response as typeof fetch);
  const result = [];
  for await (const item of model.stream([{ role: 'user', content: '研究' }], [], new AbortController().signal)) result.push(item);
  return result;
}
test('SSE preserves fragmented UTF-8, whitespace, tool arguments and usage', async () => {
  const result = await collect(chunk({ content: '中文' }) + chunk({ content: ' ' }) + chunk({ tool_calls: [{ index: 0, id: 'tool-1', function: { name: 'search', arguments: '{"query":' } }] }) + chunk({ tool_calls: [{ index: 0, function: { arguments: '"中文"}' } }] }, 'tool_calls') + usage + 'data: [DONE]\r\n\r\n');
  assert.deepEqual(result.filter(c => c.type === 'text').map(c => c.text), ['中文', ' ']);
  assert.deepEqual(result.at(-1), { type: 'tool', call: { id: 'tool-1', name: 'search', arguments: '{"query":"中文"}' } });
  assert.deepEqual(result.find(c => c.type === 'usage'), { type: 'usage', input: 12, output: 4 });
});
test('truncated streams, invalid JSON arguments, output limits and JSON responses fail', async () => {
  await assert.rejects(collect(chunk({ content: 'Partial' })), /without confirmed completion/);
  await assert.rejects(collect(chunk({ content: 'Partial' }, 'length') + 'data: [DONE]\n\n'), /before completion/);
  await assert.rejects(collect('data: incomplete'), /Truncated/);
  await assert.rejects(collect(chunk({ tool_calls: [{ index: 0, id: 'a', function: { name: 'search', arguments: 'invalid' } }] }, 'tool_calls') + 'data: [DONE]\n\n'), SyntaxError);
  await assert.rejects(collect('{}', 200, { 'content-type': 'application/json' }), /did not return SSE/);
});
test('provider errors retain status but never archive bodies or credentials', async () => {
  await assert.rejects(collect('secret provider body', 401), error => error instanceof DomainError && /401/.test(error.message) && !error.message.includes('secret'));
  assert.throws(() => new CompatibleModel({ baseUrl: 'http://example.org', model: 'x', apiKey: 'x' }), /HTTPS/);
});
