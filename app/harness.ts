import { randomUUID } from 'node:crypto';
import { DomainError } from './contracts.ts';
import type { HarnessHost, Limits, Message, ModelProvider, ToolExecutor } from './contracts.ts';

export interface ContextStrategy { assemble(messages: Message[]): { messages: Message[]; trimmed: number } }
export const fullContext: ContextStrategy = { assemble: messages => ({ messages, trimmed: 0 }) };

// This loop knows nothing about SQLite, HTTP, scholarly APIs or the browser.
export async function executeHarness(options: {
  question: string; instructions: string; model: ModelProvider; tools: ToolExecutor;
  host: HarnessHost; limits: Limits; signal: AbortSignal; context?: ContextStrategy; history?: Message[];
}): Promise<void> {
  const { host, model, tools, limits } = options;
  const signal = AbortSignal.any([options.signal, AbortSignal.timeout(limits.durationMs)]);
  let turns = 0;
  let used = 0;
  let unknownUsage = false;
  const messages: Message[] = [
    { role: 'system', content: options.instructions },
    ...(options.history ?? []),
    { role: 'user', content: options.question },
  ];
  const call = async (planning: boolean): Promise<Message> => {
    signal.throwIfAborted();
    if (turns >= limits.turns || used >= limits.tokens) throw new DomainError('Run usage/turn limit reached');
    turns++;
    const assembled = (options.context ?? fullContext).assemble(messages);
    if (assembled.trimmed) await host.emit('context_trimmed', { count: assembled.trimmed });
    const messageId = randomUUID();
    const stepId = randomUUID();
    await host.emit('step_started', { stepId, label: planning ? 'Planning' : 'Research', turn: turns });
    await host.emit('message_start', { messageId, role: 'assistant', stepId });
    const reply: Message = { role: 'assistant', content: '' };
    let usageReported = false;
    for await (const chunk of model.stream(assembled.messages, planning ? [] : tools.definitions, AbortSignal.any([signal, AbortSignal.timeout(limits.callMs)]))) {
      signal.throwIfAborted();
      if (chunk.type === 'text') {
        reply.content += chunk.text;
        await host.emit('message_delta', { messageId, text: chunk.text, stepId });
      } else if (chunk.type === 'tool') {
        if (planning) throw new DomainError('Model requested tools during planning');
        if (!chunk.call.id || reply.tool_calls?.some(c => c.id === chunk.call.id)) throw new DomainError('Invalid or duplicate tool call identifier');
        (reply.tool_calls ??= []).push({ id: chunk.call.id, type: 'function', function: { name: chunk.call.name, arguments: chunk.call.arguments } });
      } else {
        if (!Number.isSafeInteger(chunk.input) || !Number.isSafeInteger(chunk.output) || chunk.input < 0 || chunk.output < 0 || usageReported) throw new DomainError('Invalid model usage');
        usageReported = true;
        used += chunk.input + chunk.output;
        await host.emit('usage', { input: chunk.input, output: chunk.output, totalReported: used, unknownUsage });
      }
    }
    if (!usageReported) {
      unknownUsage = true;
      await host.emit('usage', { input: null, output: null, totalReported: used, unknownUsage: true });
    }
    if (!reply.content.trim() && !reply.tool_calls?.length) throw new DomainError('Empty model response');
    await host.emit('message_end', { messageId, content: reply.content, stepId });
    await host.emit('step_finished', { stepId });
    messages.push(reply);
    return reply;
  };
  messages.push({ role: 'user', content: 'First propose a concise research brief and plan in the user language. State evidence limitations. Do not research yet. Research tools require user confirmation.' });
  const plan = await call(true);
  const confirmed = await host.wait({ kind: 'confirmation', input: 'boolean', prompt: plan.content, scope: { tools: tools.definitions.map(t => t.name) } }, signal);
  if (confirmed !== true) throw new DomainError('Research plan was not confirmed');
  messages.push({ role: 'user', content: 'The displayed plan and listed tools are confirmed. Execute it within scope. Save a report with evidence and limitations using the report tool before finishing.' });
  while (true) {
    const reply = await call(false);
    if (!reply.tool_calls?.length) return;
    for (const tool of reply.tool_calls) {
      signal.throwIfAborted();
      const call = { id: tool.id, name: tool.function.name, arguments: tool.function.arguments };
      if (!tools.definitions.some(t => t.name === call.name)) throw new DomainError('Model requested an unregistered tool');
      const stepId = randomUUID();
      await host.emit('tool_intent', { stepId, callId: call.id, name: call.name, arguments: call.arguments });
      // Only the tool host can validate and authorize arguments. Retrieved text
      // and model output cannot expand the tool registry or its capabilities.
      const result = await tools.execute(call, signal);
      signal.throwIfAborted();
      await host.emit('tool_result', { stepId, callId: call.id, result });
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
}
