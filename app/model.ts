import { DomainError, object, text } from './contracts.ts';
import type { Message, ModelChunk, ModelProvider, ObjectData, ToolCall, ToolDefinition } from './contracts.ts';

export interface ProviderConfig { baseUrl: string; model: string; apiKey: string; maxOutputTokens?: number; extra?: ObjectData }
// SSE lines and UTF-8 characters may cross network chunks. A completed stream
// needs [DONE] and a finish reason, not just a closed socket.
export async function* sseData(response: Response): AsyncIterable<string> {
  if (!response.body) throw new DomainError('Provider response has no body');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lines: string[] = [];
  try {
    while (true) {
      const part = await reader.read();
      buffer += decoder.decode(part.value, { stream: !part.done });
      let end: number;
      while ((end = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, end).replace(/\r$/, '');
        buffer = buffer.slice(end + 1);
        if (!line) { if (lines.length) yield lines.join('\n'); lines = []; }
        else if (line.startsWith('data:')) lines.push(line.slice(5).replace(/^ /, ''));
      }
      if (buffer.length > 2_000_000) throw new DomainError('Provider event too large');
      if (part.done) break;
    }
    if (buffer || lines.length) throw new DomainError('Truncated provider event stream');
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export class CompatibleModel implements ModelProvider {
  config: ProviderConfig;
  fetcher: typeof fetch;
  constructor(config: ProviderConfig, fetcher = fetch) {
    const url = new URL(config.baseUrl);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))) throw new DomainError('Model endpoint must use HTTPS or explicit loopback HTTP');
    if (url.username || url.password || url.search || url.hash) throw new DomainError('Invalid model endpoint');
    this.config = config;
    this.fetcher = fetcher;
  }
  async *stream(messages: Message[], tools: ToolDefinition[], signal: AbortSignal): AsyncIterable<ModelChunk> {
    const response = await this.fetcher(`${this.config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', signal, redirect: 'error',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.config.apiKey}` },
      body: JSON.stringify({ ...this.config.extra, model: this.config.model, messages, stream: true, stream_options: { include_usage: true }, max_tokens: this.config.maxOutputTokens ?? 4096,
        ...(tools.length ? { tools: tools.map(tool => ({ type: 'function', function: tool })) } : {}),
      }),
    });
    // Provider bodies may echo the Authorization header. Never archive raw errors.
    if (!response.ok) {
      await response.body?.cancel();
      const retry = response.headers.get('retry-after');
      throw new DomainError(`Model request failed (HTTP ${response.status}${retry ? '; retry guidance available' : ''})`, 502);
    }
    if (!response.headers.get('content-type')?.includes('text/event-stream')) throw new DomainError('Model endpoint did not return SSE');
    const calls = new Map<number, ToolCall>();
    let finished = false;
    let done = false;
    let bytes = 0;
    for await (const payload of sseData(response)) {
      signal.throwIfAborted();
      if (payload === '[DONE]') { done = true; break; }
      bytes += payload.length;
      if (bytes > 4_000_000) throw new DomainError('Model output limit exceeded');
      const chunk = object(JSON.parse(payload));
      if (chunk.error) throw new DomainError('Provider reported a stream error');
      if (chunk.usage) {
        const usage = object(chunk.usage);
        yield { type: 'usage', input: Number(usage.prompt_tokens), output: Number(usage.completion_tokens) };
      }
      if (!Array.isArray(chunk.choices)) throw new DomainError('Malformed model chunk');
      for (const raw of chunk.choices) {
        const choice = object(raw);
        if (choice.index !== 0) throw new DomainError('Unexpected model choice');
        const delta = object(choice.delta ?? {});
        if (delta.content !== undefined && delta.content !== null) {
          if (typeof delta.content !== 'string') throw new DomainError('Invalid model text');
          if (delta.content) yield { type: 'text', text: delta.content };
        }
        if (Array.isArray(delta.tool_calls)) for (const value of delta.tool_calls) {
          const fragment = object(value);
          const index = Number(fragment.index);
          if (!Number.isSafeInteger(index) || index < 0 || index > 31) throw new DomainError('Invalid tool index');
          const call = calls.get(index) ?? { id: '', name: '', arguments: '' };
          if (fragment.id) call.id += text(fragment.id);
          if (fragment.function) {
            const fn = object(fragment.function);
            if (typeof fn.name === 'string') call.name += fn.name;
            if (typeof fn.arguments === 'string') call.arguments += fn.arguments;
          }
          calls.set(index, call);
        }
        if (choice.finish_reason) {
          if (!['stop', 'tool_calls'].includes(String(choice.finish_reason))) throw new DomainError(`Model stopped before completion: ${String(choice.finish_reason)}`);
          finished = true;
        }
      }
    }
    if (!done || !finished) throw new DomainError('Model stream ended without confirmed completion');
    for (const call of calls.values()) {
      text(call.id); text(call.name); object(JSON.parse(call.arguments));
      yield { type: 'tool', call };
    }
  }
}
