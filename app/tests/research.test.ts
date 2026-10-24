import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fixture } from './helpers.ts';
import { Research, researchTools } from '../research.ts';
import { publicAddress } from '../network.ts';
import type { HarnessHost, Run, Json, ObjectData } from '../contracts.ts';
const metadata = { message: { items: [{ DOI: '10.0000/fixture-a', title: ['Economics: evidence for'], author: [{ given: 'Synthetic', family: 'Author' }], issued: { 'date-parts': [[2026]] } }, { DOI: '10.0000/fixture-b', title: ['Economics: contradictory evidence'] }] } };
test('retrieval preserves metadata, empty results and contradictions without verifying claims', async () => {
  const f = fixture();
  try {
    const run = f.create(); await f.platform.tasks.get(run.id);
    const research = new Research(f.store, async url => ({ status: 200, body: JSON.stringify(metadata), contentType: 'application/json', url }));
    await research.search(run, randomUUID(), 'economics', new AbortController().signal);
    const sources = f.store.list('source', f.projectId);
    assert.equal(sources.length, 2);
    assert.ok(sources.every(source => source.verification === 'metadata_verified' && source.interpretation === 'model_proposed_unchecked'));
    await research.search(run, randomUUID(), 'humanities', new AbortController().signal);
    assert.equal(f.store.list('source', f.projectId).length, 2);
    assert.equal((f.store.list('source', f.projectId)[0].accesses as Json[]).length, 2);
    research.getMetadata = async url => ({ status: 200, body: '{"message":{"items":[]}}', contentType: 'application/json', url });
    assert.match(JSON.stringify(await research.search(run, randomUUID(), 'empty', new AbortController().signal)), /No metadata results/);
    research.getMetadata = async url => ({ status: 429, body: '', contentType: 'application/json', url });
    assert.match(JSON.stringify(await research.search(run, randomUUID(), 'limited', new AbortController().signal)), /429/);
  } finally { await f.cleanup(); }
});
test('permission denial performs no fetch; inaccessible content and fetched-page scope are explicit', async () => {
  const f = fixture();
  try {
    const run = f.create(); await f.platform.tasks.get(run.id);
    let fetched = 0;
    const research = new Research(f.store, async url => { fetched++; return { status: 200, body: JSON.stringify(metadata), contentType: 'application/json', url }; });
    await research.search(run, randomUUID(), 'metadata', new AbortController().signal);
    const sourceId = String(f.store.list('source', f.projectId)[0].id);
    const denied: HarnessHost = { emit: async () => {}, wait: async () => false };
    const allowed: HarnessHost = { ...denied, wait: async () => true };
    assert.match(JSON.stringify(await research.read(run, randomUUID(), sourceId, denied, new AbortController().signal)), /denied/);
    assert.equal(fetched, 1);
    f.store.append(run.id, 'test_resume', {}, r => { r.state = 'running'; });
    research.getPublic = async url => ({ status: 403, body: '', contentType: 'text/html', url });
    assert.match(JSON.stringify(await research.read(run, randomUUID(), sourceId, allowed, new AbortController().signal)), /inaccessible/);
    research.getPublic = async url => ({ status: 200, body: '<script>alert(1)</script><p>Public abstract only.</p>', contentType: 'text/html', url });
    const result = await research.read(run, randomUUID(), sourceId, allowed, new AbortController().signal);
    assert.match(JSON.stringify(result), /not verified full publication/);
    assert.doesNotMatch(String((result as ObjectData).content), /alert/);
  } finally { await f.cleanup(); }
});
test('tool dispatch rejects unconfirmed policy, unexpected fields and unknown citations', async () => {
  const f = fixture();
  try {
    const run = f.create(); await f.platform.tasks.get(run.id);
    const research = new Research(f.store);
    const host: HarnessHost = { emit: async () => {}, wait: async () => true };
    const call = { id: 'test-call', name: 'search_metadata', arguments: '{"query":"test"}' };
    await assert.rejects(research.execute(run, call, host, new AbortController().signal), /confirmed policy/);
    f.store.append(run.id, 'test_resume', {}, r => { r.state = 'running'; r.plan = { version: 1, confirmed: true, text: 'Test', tools: researchTools.map(t => t.name) }; });
    f.store.append(run.id, 'tool_intent', { stepId: randomUUID(), callId: call.id, name: call.name });
    await assert.rejects(research.execute(run, { ...call, arguments: '{"query":"test","shell":"cmd"}' }, host, new AbortController().signal), /argument fields/);
    await assert.rejects(research.execute(run, { ...call, name: 'publish_report', arguments: JSON.stringify({ content: `[Invented](source:${randomUUID()})`, final: true, artifactId: '' }) }, host, new AbortController().signal), /not found/);
    const report = await research.execute(run, { ...call, name: 'publish_report', arguments: JSON.stringify({ content: '# Limitations\n\nNo sources were found.', final: false, artifactId: '' }) }, host, new AbortController().signal) as ObjectData;
    assert.equal(report.committed, false);
    f.store.append(run.id, 'test_finish', {}, r => { r.state = 'failed'; });
    assert.match(f.store.readRevision(String(report.revisionId)).content, /No sources/);
  } finally { await f.cleanup(); }
});
test('network policy rejects private IPv4/IPv6 and accepts public addresses', () => {
  for (const address of ['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.2', '169.254.169.254', '100.64.0.1', '198.18.0.1', '::1', '::ffff:127.0.0.1', 'fe80::1', 'fc00::1', '2001:db8::1', '2001:2::b2', '2002:7f00:1::']) assert.equal(publicAddress(address), false, address);
  assert.equal(publicAddress('1.1.1.1'), true);
  assert.equal(publicAddress('2606:4700:4700::1111'), true);
});
