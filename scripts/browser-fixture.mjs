import { join, resolve } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { Store } from '../app/store.ts';
import { Platform } from '../app/platform.ts';
import { SubstituteRuntime } from '../app/tests/helpers.ts';
import { Research, researchTools } from '../app/research.ts';
import { Settings } from '../app/settings.ts';
import { Skills } from '../app/skills.ts';
import { createService } from '../app/service.ts';
import { MetadataRuntime, RuntimeRegistry } from '../app/direct-tool.ts';

// Synthetic, network-free acceptance server. It never opens the user's data root.
const root = resolve('.cache', 'browser-fixture-' + randomUUID());
mkdirSync(root, { recursive: true });
const store = new Store(join(root, 'projects'));
const settings = new Settings(root, { protect: value => 'synthetic:' + value, unprotect: value => value.slice(10) });
const entry = settings.add({ name: 'Synthetic fixture model', baseUrl: 'https://fixture.invalid', model: 'synthetic-model', apiKey: 'synthetic-test-value' });
settings.save([{ ...entry, testedAt: new Date().toISOString(), streaming: true, tools: true }]);
const skills = new Skills(join(root, 'skills'));
const research = new Research(store, async url => ({ status: 200, contentType: 'application/json', url, body: JSON.stringify({ message: { items: [
  { DOI: '10.0000/synthetic-a', title: ['Synthetic economics evidence A'] },
  { DOI: '10.0000/synthetic-b', title: ['Synthetic contradictory humanities evidence B'] },
] } }) }));
const runtime = new SubstituteRuntime(async (run, host, signal) => {
  const message = async content => { const messageId = randomUUID(); const stepId = randomUUID(); await host.emit('step_started', { stepId, label: 'Synthetic fixture step' }); await host.emit('message_start', { messageId, stepId }); await host.emit('message_delta', { messageId, stepId, text: content }); await host.emit('message_end', { messageId, stepId, content }); await host.emit('step_finished', { stepId }); };
  await message('Synthetic fixture plan. 这是合成验收数据，先确认计划再检索。');
  if (await host.wait({ kind: 'confirmation', input: 'boolean', prompt: 'Synthetic fixture plan. Confirm controlled metadata retrieval.', scope: { tools: researchTools.map(tool => tool.name) } }, signal) !== true) return;
  const tool = async (name, args) => {
    const call = { id: randomUUID(), name, arguments: JSON.stringify(args) }; const stepId = randomUUID();
    await host.emit('tool_intent', { callId: call.id, name, arguments: call.arguments, stepId });
    const result = await research.execute(run, call, host, signal);
    await host.emit('tool_result', { callId: call.id, stepId, result }); return result;
  };
  const sources = await tool('search_metadata', { query: 'synthetic evidence' });
  const sourceId = sources.sources[0].id;
  const draft = await tool('publish_report', { content: `# Synthetic saved draft\n\nIncomplete fixture report. [Evidence](source:${sourceId}).`, final: false, artifactId: '' });
  if (run.question.includes('input')) await host.wait({ kind: 'question', input: 'single_choice', prompt: 'Choose a fixture discipline / 选择测试学科', options: ['economics', 'humanities'] }, signal);
  await tool('read_source', { sourceId });
  await delay(300, undefined, { signal });
  await tool('publish_report', { content: `# Synthetic final report\n\nThis is controlled acceptance data. [Evidence](source:${sourceId}) is metadata only. Contradictory fixture records are preserved.\n\n## 限制\n\n模型解读未经核实。全文访问被拒绝或不可用。`, final: true, artifactId: draft.artifactId });
  await message('Synthetic report saved. Review the metadata limitations. 合成报告已保存。');
});
const platform = new Platform(store, new RuntimeRegistry([['openlab-harness-1', runtime], ['openlab-metadata-1', new MetadataRuntime(research)]]));
const service = await createService({ platform, settings, skills, research, port: Number(process.env.OPENLAB_TEST_PORT ?? 4321) });
writeFileSync('.cache/browser-launch.json', JSON.stringify({ launchUrl: service.launchUrl, origin: service.origin }));
console.log('Synthetic browser fixture ready.');
let closing = false;
const close = async () => { if (closing) return; closing = true; await service.close(); if (resolve(root).startsWith(resolve('.cache') + (process.platform === 'win32' ? '\\' : '/'))) rmSync(root, { recursive: true, force: true }); };
process.on('SIGTERM', () => { void close(); }); process.on('SIGINT', () => { void close(); });
