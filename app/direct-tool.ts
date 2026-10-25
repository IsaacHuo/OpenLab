import { randomUUID } from 'node:crypto';
import { DomainError } from './contracts.ts';
import type { HarnessHost, Json, ObjectData, Run, RuntimeAdapter } from './contracts.ts';
import { Research } from './research.ts';

// A user-selected retrieval tool uses the same platform policy and archive,
// without requiring a model provider or an agent loop.
export class MetadataRuntime implements RuntimeAdapter {
  research: Research;
  controllers = new Map<string, AbortController>();
  constructor(research: Research) { this.research = research; }
  capabilities() { return { streaming: true, cancellation: true, questions: false, permissions: false, checkpoints: false as const }; }
  async start(run: Run, host: HarnessHost): Promise<void> {
    const controller = new AbortController(); this.controllers.set(run.id, controller);
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(run.limits.durationMs)]);
    try {
      const zh = run.config.language === 'zh';
      const approved = await host.wait({ kind: 'confirmation', input: 'boolean', prompt: zh ? `使用 Crossref 检索元数据：${run.question}\n\n保存带来源链接的元数据目录。不会调用模型；元数据不验证论文观点。` : `Search Crossref metadata for: ${run.question}\n\nSave a source-linked metadata inventory. No model will be called; metadata does not verify scientific claims.`, scope: { tools: ['search_metadata', 'publish_report'] } }, signal);
      if (approved !== true) throw new DomainError('Metadata search was not confirmed');
      const execute = async (name: string, args: ObjectData): Promise<Json> => {
        signal.throwIfAborted();
        const call = { id: randomUUID(), name, arguments: JSON.stringify(args) }; const stepId = randomUUID();
        await host.emit('tool_intent', { callId: call.id, name, arguments: call.arguments, stepId });
        const result = await this.research.execute(run, call, host, signal);
        signal.throwIfAborted();
        await host.emit('tool_result', { callId: call.id, stepId, result });
        return result;
      };
      const result = await execute('search_metadata', { query: run.question }) as ObjectData;
      const sources = Array.isArray(result.sources) ? result.sources as ObjectData[] : [];
      const escape = (value: string) => value.replace(/[\\[\]]/g, '\\$&');
      const content = `${zh ? '# 文献元数据目录' : '# Scholarly metadata inventory'}\n\n${sources.map(source => `- [${escape(String(source.title))}](source:${String(source.id)}) · DOI ${String(source.doi)}`).join('\n') || (zh ? '未检索到元数据记录。' : 'No metadata records returned.')}\n\n${zh ? '## 证据范围与限制\n\n这是用户直接选择的元数据工具结果，没有调用模型。元数据记录不验证论文观点，未读取全文。' : '## Evidence scope and limitations\n\nThis inventory was produced by a user-selected metadata tool without calling a model. Metadata records do not verify paper claims. Full text was not accessed.'}\n\n${result.failure ? `Retrieval failure: ${String(result.failure)}` : String(result.limitation ?? '')}\n`;
      await execute('publish_report', { content, final: true, artifactId: '' });
      await host.emit('usage', { input: 0, output: 0, totalReported: 0, unknownUsage: false, modelCalled: false });
      if (result.failure) throw new DomainError('Metadata retrieval failed; the limitations report has been saved');
    } finally { this.controllers.delete(run.id); }
  }
  async cancel(runId: string) { this.controllers.get(runId)?.abort(); }
  async close() { for (const controller of this.controllers.values()) controller.abort(); }
}

export class RuntimeRegistry implements RuntimeAdapter {
  adapters = new Map<string, RuntimeAdapter>();
  active = new Map<string, RuntimeAdapter>();
  constructor(entries: [string, RuntimeAdapter][]) {
    for (const [name, adapter] of entries) { if (this.adapters.has(name)) throw new DomainError('Duplicate runtime registration'); this.adapters.set(name, adapter); }
    if (!entries.length) throw new DomainError('At least one runtime is required');
  }
  capabilities() { return this.adapters.values().next().value!.capabilities(); }
  async start(run: Run, host: HarnessHost) {
    const adapter = this.adapters.get(String(run.config.runtimeId));
    if (!adapter) throw new DomainError('Selected runtime is not registered');
    this.active.set(run.id, adapter);
    try { await adapter.start(run, host); } finally { this.active.delete(run.id); }
  }
  async cancel(runId: string) { await this.active.get(runId)?.cancel(runId); }
  async close() { await Promise.all([...this.adapters.values()].map(adapter => adapter.close())); }
}
