import { fork } from 'node:child_process';
import { DomainError, object, text } from './contracts.ts';
import type { HarnessHost, Interaction, Json, ObjectData, Run, RuntimeAdapter, ToolCall, ToolDefinition } from './contracts.ts';
import type { ProviderConfig } from './model.ts';

export interface WorkerConfiguration { provider: ProviderConfig; definitions: ToolDefinition[]; instructions: string }
export class WorkerRuntime implements RuntimeAdapter {
  configurations: (run: Run) => Promise<WorkerConfiguration>;
  executeTool: (run: Run, call: ToolCall, host: HarnessHost, signal: AbortSignal) => Promise<Json>;
  sessions = new Map<string, { abort: AbortController; pid?: number; stop: () => Promise<void> }>();
  validateResult: (run: Run) => void = () => {};
  constructor(configurations: WorkerRuntime['configurations'], executeTool: WorkerRuntime['executeTool']) { this.configurations = configurations; this.executeTool = executeTool; }
  capabilities() { return { streaming: true, cancellation: true, questions: true, permissions: true, checkpoints: false as const }; }
  async start(run: Run, host: HarnessHost): Promise<void> {
    const abort = new AbortController();
    let child: ReturnType<typeof fork> | undefined;
    let stopResolve: () => void = () => {};
    const stopped = new Promise<void>(resolve => { stopResolve = resolve; });
    this.sessions.set(run.id, { abort, stop: async () => {
      abort.abort();
      if (!child) return;
      if (child.connected) child.send({ type: 'cancel' });
      const timeout = setTimeout(() => child?.kill(), 1500);
      try { await stopped; } finally { clearTimeout(timeout); }
    } });
    try {
      const configuration = await this.configurations(run);
      abort.signal.throwIfAborted();
      // Do not inherit user skills, NODE_OPTIONS, provider keys or hook settings.
      const env: Record<string, string> = {};
      for (const name of ['SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'PATH']) if (process.env[name]) env[name] = process.env[name]!;
      child = fork(new URL('./worker.ts', import.meta.url), [], { env, execArgv: [], stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true });
      const worker = child;
      this.sessions.get(run.id)!.pid = worker.pid;
      let outcome: { success: boolean; error?: string } | undefined;
      const completion = new Promise<void>((resolve, reject) => {
        worker.on('error', () => { stopResolve(); reject(new DomainError('Runtime process could not start')); });
        worker.on('exit', () => {
          abort.abort();
          stopResolve();
          if (outcome?.success) resolve();
          else reject(new DomainError(outcome?.error ?? 'Runtime process lost; explicit retry required', outcome ? 400 : 503));
        });
        worker.on('message', async (raw: unknown) => {
          try {
            const message = object(raw);
            if (message.type === 'finished') { outcome = { success: true }; return; }
            if (message.type === 'failed') { outcome = { success: false, error: text(message.error) }; return; }
            const requestId = text(message.requestId);
            try {
              abort.signal.throwIfAborted();
              const data = object(message.data);
              let value: Json = null;
              if (message.action === 'emit') await host.emit(text(data.kind), object(data.data));
              else if (message.action === 'wait') value = await host.wait(data as unknown as Omit<Interaction, 'id' | 'version'>, abort.signal);
              else if (message.action === 'tool') value = await this.executeTool(run, data as unknown as ToolCall, host, abort.signal);
              else throw new DomainError('Unknown runtime request');
              if (worker.connected) worker.send({ type: 'response', requestId, value });
            } catch (error) {
              if (worker.connected) worker.send({ type: 'response', requestId, error: error instanceof DomainError ? error.message : 'Host operation failed' });
            }
          } catch { outcome = { success: false, error: 'Malformed runtime event' }; worker.kill(); }
        });
      });
      void completion.catch(() => {}); // Observe an early exit if persistence fails before dispatch.
      await host.emit('runtime_started', { executionId: String(worker.pid), checkpoints: false });
      worker.send({ type: 'start', run, ...configuration });
      await completion;
      this.validateResult(run);
    } finally {
      if (child && child.exitCode === null && child.signalCode === null) { child.kill(); await stopped; }
      this.sessions.delete(run.id); stopResolve();
    }
  }
  async cancel(runId: string): Promise<void> { await this.sessions.get(runId)?.stop(); }
  async close(): Promise<void> { await Promise.all([...this.sessions.keys()].map(runId => this.cancel(runId))); }
}
