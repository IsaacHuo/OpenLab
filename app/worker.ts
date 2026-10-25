import { randomUUID } from 'node:crypto';
import { executeHarness } from './harness.ts';
import { CompatibleModel } from './model.ts';
import { DomainError } from './contracts.ts';
import type { Json, ObjectData, Run, ToolDefinition } from './contracts.ts';
import type { ProviderConfig } from './model.ts';

const abort = new AbortController();
const pending = new Map<string, { resolve: (value: Json) => void; reject: (error: Error) => void }>();
function rpc(action: string, data: ObjectData, signal = abort.signal): Promise<Json> {
  abort.signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const requestId = randomUUID();
    const cancel = () => { pending.delete(requestId); reject(new DomainError('Execution interrupted')); };
    const cleanup = () => signal.removeEventListener('abort', cancel);
    signal.addEventListener('abort', cancel, { once: true });
    pending.set(requestId, { resolve: value => { cleanup(); resolve(value); }, reject: error => { cleanup(); reject(error); } });
    process.send!({ requestId, action, data });
  });
}
process.on('disconnect', () => process.exit(1));
process.on('message', async (message: { type: string; requestId?: string; value?: Json; error?: string; run: Run; provider: ProviderConfig; definitions: ToolDefinition[]; instructions: string; history?: import('./contracts.ts').Message[] }) => {
  if (message.type === 'response') {
    const item = pending.get(message.requestId!);
    pending.delete(message.requestId!);
    if (message.error) item?.reject(new DomainError(message.error));
    else item?.resolve(message.value ?? null);
  } else if (message.type === 'cancel') {
    abort.abort();
    for (const item of pending.values()) item.reject(new DomainError('Cancelled'));
    pending.clear();
  } else if (message.type === 'start') {
    try {
      await executeHarness({ question: message.run.question, instructions: message.instructions, history: message.history, model: new CompatibleModel(message.provider), limits: message.run.limits, signal: abort.signal,
        host: { emit: async (kind, data) => { await rpc('emit', { kind, data }); }, wait: (interaction, signal) => rpc('wait', interaction as unknown as ObjectData, signal) },
        tools: { definitions: message.definitions, execute: (call, signal) => rpc('tool', call as unknown as ObjectData, signal) },
      });
      process.send!({ type: 'finished' }, () => process.disconnect());
    } catch (error) {
      process.send!({ type: 'failed', error: error instanceof DomainError ? error.message : 'Worker model request failed' }, () => process.disconnect());
    }
  }
});
