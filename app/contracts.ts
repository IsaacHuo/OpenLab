export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type ObjectData = { [key: string]: Json };
export type RunState = 'queued' | 'running' | 'awaiting_confirmation' | 'awaiting_input' | 'awaiting_permission' | 'cancelling' | 'succeeded' | 'failed' | 'cancelled' | 'interrupted';
export const terminal = new Set<RunState>(['succeeded', 'failed', 'cancelled', 'interrupted']);
export interface ResearchEvent { runId: string; seq: number; at: string; kind: string; data: ObjectData }
export interface Limits { turns: number; durationMs: number; callMs: number; tokens: number }
export interface ResearchContext {
  runIds: string[]; messageIds: string[]; revisionId?: string; requestedRevisionId?: string | null;
  historyTruncated: boolean; reportTruncated: boolean;
}
export interface Run {
  id: string; projectId: string; conversationId: string; requestKey: string; question: string;
  state: RunState; phase: string; createdAt: string; config: ObjectData; limits: Limits;
  plan?: { version: number; text: string; tools: string[]; confirmed: boolean };
  interaction?: Interaction; decisions: Record<string, Decision>; parentRunId?: string;
  error?: string;
  context?: ResearchContext;
}
export interface Interaction {
  id: string; version: number; kind: 'confirmation' | 'question' | 'permission'; prompt: string;
  input: 'text' | 'single_choice' | 'multiple_choice' | 'boolean'; options?: string[]; scope?: ObjectData;
}
export interface Decision { interactionId: string; version: number; value: Json }
export interface ToolCall { id: string; name: string; arguments: string }
export interface Message { role: 'system' | 'user' | 'assistant' | 'tool'; content: string; tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[]; tool_call_id?: string }
export interface ToolDefinition { name: string; description: string; parameters: ObjectData }
export type ModelChunk = { type: 'text'; text: string } | { type: 'tool'; call: ToolCall } | { type: 'usage'; input: number; output: number };
export interface ModelProvider {
  stream(messages: Message[], tools: ToolDefinition[], signal: AbortSignal): AsyncIterable<ModelChunk>;
}
export interface ToolExecutor {
  definitions: ToolDefinition[];
  execute(call: ToolCall, signal: AbortSignal): Promise<Json>;
}
export interface HarnessHost {
  emit(kind: string, data: ObjectData): Promise<void>;
  wait(interaction: Omit<Interaction, 'id' | 'version'>, signal: AbortSignal): Promise<Json>;
}
export interface RuntimeCapabilities { streaming: boolean; cancellation: boolean; questions: boolean; permissions: boolean; checkpoints: false }
export interface RuntimeAdapter {
  capabilities(): RuntimeCapabilities;
  start(run: Run, host: HarnessHost): Promise<void>;
  cancel(runId: string): Promise<void>;
  close(): Promise<void>;
}
export class DomainError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.name = 'DomainError'; this.status = status; }
}
export function object(value: unknown): ObjectData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DomainError('Expected an object');
  return value as ObjectData;
}
export function text(value: unknown, name = 'text', max = 100_000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new DomainError(`Invalid ${name}`);
  return value;
}
export function id(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new DomainError('Invalid identifier');
  return value;
}
