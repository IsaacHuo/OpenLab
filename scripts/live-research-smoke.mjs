import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { Store } from '../app/store.ts';
import { Platform } from '../app/platform.ts';
import { WorkerRuntime } from '../app/runtime.ts';
import { Research, researchTools, researchInstructions } from '../app/research.ts';

const apiKey = process.env.OPENLAB_SMOKE_API_KEY;
if (!apiKey) throw new Error('Set OPENLAB_SMOKE_API_KEY for the opt-in live test');
const root = resolve('.cache', 'live-research-' + randomUUID());
mkdirSync(root, { recursive: true });
const store = new Store(root);
const research = new Research(store);
const runtime = new WorkerRuntime(async () => ({ provider: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-flash', apiKey, maxOutputTokens: 1800, extra: { thinking: { type: 'disabled' } } }, instructions: researchInstructions, definitions: researchTools }), (run, call, host, signal) => research.execute(run, call, host, signal));
const platform = new Platform(store, runtime);
const results = { at: new Date().toISOString(), node: process.version, platform: `${process.platform}/${process.arch}`, model: 'deepseek-flash', retrieval: 'Crossref', scope: 'Metadata-only research smoke; no verified literature conclusions', tests: [] };
try {
  for (const [name, question] of [
    ['Economics, English', 'Find scholarly metadata about minimum wage and employment. Use exactly one search_metadata call, do not read pages, then publish a short final Markdown report listing the original titles with source links and explicit metadata-only limitations. At most 250 words. Do not ask follow-up questions.'],
    ['Humanities, Chinese', '检索莎士比亚《哈姆雷特》文本研究的学术元数据。只调用一次 search_metadata（用英文关键词），不要读取网页，然后调用 publish_report 保存一份简短中文最终报告，保留原始标题和来源链接，明确仅查到元数据，不能据此验证论文观点。不超过500字，不要提后续问题。'],
  ]) {
    const projectId = String(platform.project('Live smoke: ' + name).id);
    const conversationId = String(platform.conversation(projectId).id);
    const run = platform.createRun(conversationId, { question, requestKey: randomUUID(), config: { providerId: 'deepseek-live', model: 'deepseek-flash', skillId: 'builtin-literature' }, limits: { turns: 6, durationMs: 180_000, callMs: 60_000, tokens: 30_000 } });
    const deadline = Date.now() + 185_000;
    while (Date.now() < deadline) {
      const state = store.get('run', run.id);
      if (state.state === 'awaiting_confirmation') platform.confirm(run.id, state.plan.version);
      else if (state.state === 'awaiting_permission' || state.state === 'awaiting_input') platform.respond(run.id, { interactionId: state.interaction.id, version: state.interaction.version, value: state.interaction.input === 'boolean' ? false : 'Limit the task to scholarly metadata.' });
      else if (['succeeded', 'failed', 'cancelled', 'interrupted'].includes(state.state)) break;
      await delay(100);
    }
    if (!['succeeded', 'failed', 'cancelled', 'interrupted'].includes(store.get('run', run.id).state)) await platform.cancel(run.id);
    const final = store.get('run', run.id);
    const sources = store.list('source', projectId);
    const revisions = store.list('revision', projectId).filter(r => r.committed);
    const archive = store.export(projectId);
    const importedProjectId = store.import(archive);
    const record = { name, state: final.state, sources: sources.length, finalReports: revisions.length, archiveRoundTrip: store.list('revision', importedProjectId).length === store.list('revision', projectId).length, usage: store.events(run.id).filter(e => e.kind === 'usage').map(e => e.data), error: final.error ?? null };
    record.passed = final.state === 'succeeded' && sources.length > 0 && revisions.length > 0 && record.archiveRoundTrip;
    results.tests.push(record);
    writeFileSync(join(root, name.startsWith('Economics') ? 'economics-export.json' : 'humanities-export.json'), JSON.stringify(archive, null, 2));
    console.log(JSON.stringify(record));
  }
} finally { await platform.close(); }
writeFileSync('.cache/live-research-smoke.json', JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify({ report: '.cache/live-research-smoke.json', tests: results.tests.length, passed: results.tests.every(t => t.passed) }));
if (results.tests.some(t => !t.passed)) process.exitCode = 1;
