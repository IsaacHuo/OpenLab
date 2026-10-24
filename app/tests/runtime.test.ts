import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { WorkerRuntime } from '../runtime.ts';
import { fixture, until } from './helpers.ts';
import type { Run } from '../contracts.ts';

test('native child worker uses isolated configuration and confirms cancellation at process exit', async () => {
  let requests = 0;
  const server = createServer(async (req, res) => {
    requests++;
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    assert.equal(body.tools, undefined);
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.end('data: {"choices":[{"index":0,"delta":{"content":"原生 Windows 研究计划"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n');
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address() as { port: number };
  const runtime = new WorkerRuntime(async () => ({ provider: { baseUrl: `http://127.0.0.1:${address.port}`, model: 'fixture', apiKey: 'test-only' }, definitions: [], instructions: 'Fixture research' }), async () => { throw new Error('No tools before confirmation'); });
  const f = fixture(runtime);
  try {
    const run = f.create();
    await until(() => f.store.get<Run>('run', run.id), r => r.state === 'awaiting_confirmation', 10_000);
    assert.equal(requests, 1);
    assert.equal(runtime.sessions.size, 1);
    await f.platform.cancel(run.id);
    assert.equal(runtime.sessions.size, 0);
    assert.equal(f.store.get<Run>('run', run.id).state, 'cancelled');
    assert.equal(requests, 1);
  } finally { await f.cleanup(); server.close(); await once(server, 'close'); }
});
