import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { DomainError, terminal, text } from './contracts.ts';
import type { Decision, HarnessHost, Interaction, Json, Limits, ObjectData, Run, RunState, RuntimeAdapter } from './contracts.ts';
import { Store } from './store.ts';

const defaultLimits: Limits = { turns: 12, durationMs: 600_000, callMs: 90_000, tokens: 60_000 };
const states = new Map<Interaction['kind'], RunState>([['confirmation', 'awaiting_confirmation'], ['question', 'awaiting_input'], ['permission', 'awaiting_permission']]);
function validateDecision(interaction: Interaction, value: Json): void {
  if (interaction.input === 'boolean') { if (typeof value !== 'boolean') throw new DomainError('Expected approve or deny'); }
  else if (interaction.input === 'text') text(value, 'answer', 10_000);
  else if (interaction.input === 'single_choice') { if (typeof value !== 'string' || !interaction.options?.includes(value)) throw new DomainError('Choose a listed option'); }
  else if (!Array.isArray(value) || !value.length || new Set(value).size !== value.length || value.some(v => typeof v !== 'string' || !interaction.options?.includes(v))) throw new DomainError('Choose listed options without duplicates');
}
export class Platform {
  store: Store;
  runtime: RuntimeAdapter;
  notifications = new EventEmitter();
  tasks = new Map<string, Promise<void>>();
  waiters = new Map<string, (value: Json) => void>();
  closed = false;
  constructor(store: Store, runtime: RuntimeAdapter) {
    this.store = store; this.runtime = runtime;
    // Workers are IPC children: loss of their control channel terminates them.
    // No session is resumed or billed automatically after a process restart.
    for (const run of store.list<Run>('run')) if (!terminal.has(run.state)) this.event(run.id, 'interrupted', { reason: 'Control plane restarted; explicit retry required' }, r => { r.state = 'interrupted'; delete r.interaction; });
  }
  project(name: string): ObjectData {
    const project = { id: randomUUID(), name: text(name, 'project name', 200), archived: false, createdAt: new Date().toISOString() };
    this.store.put('project', project.id, project.id, project);
    return project;
  }
  updateProject(projectId: string, changes: ObjectData): ObjectData {
    const project = this.store.get('project', projectId);
    if (changes.name !== undefined) project.name = text(changes.name, 'project name', 200);
    if (changes.archived !== undefined) {
      if (typeof changes.archived !== 'boolean') throw new DomainError('Invalid archive flag');
      if (changes.archived && this.store.list<Run>('run', projectId).some(r => !terminal.has(r.state))) throw new DomainError('Cancel active runs before archiving', 409);
      project.archived = changes.archived;
    }
    this.store.put('project', projectId, projectId, project);
    return project;
  }
  conversation(projectId: string, name = 'Research'): ObjectData {
    const project = this.store.get('project', projectId);
    if (project.archived) throw new DomainError('Reopen the project first', 409);
    const conversation = { id: randomUUID(), projectId, name: text(name, 'conversation name', 200), createdAt: new Date().toISOString() };
    this.store.put('conversation', conversation.id, projectId, conversation);
    return conversation;
  }
  createRun(conversationId: string, input: { question: string; requestKey: string; config: ObjectData; limits?: Partial<Limits>; parentRunId?: string }): Run {
    if (this.closed) throw new DomainError('Platform is shutting down', 503);
    const conversation = this.store.get('conversation', conversationId);
    const projectId = String(conversation.projectId);
    if (this.store.get('project', projectId).archived) throw new DomainError('Reopen the project first', 409);
    text(input.question, 'question', 20_000); text(input.requestKey, 'request key', 200);
    const configKeys = new Set(['providerId', 'model', 'skillId', 'skillRevision', 'runtimeId', 'retrievalId', 'language']);
    for (const [key, value] of Object.entries(input.config)) {
      if (!configKeys.has(key) || typeof value !== 'string' || value.length > 500) throw new DomainError('Run configuration accepts public selection identifiers only');
    }
    const runs = this.store.list<Run>('run', projectId).filter(r => r.conversationId === conversationId);
    const previous = runs.find(r => r.requestKey === input.requestKey);
    if (previous) {
      if (previous.question !== input.question || JSON.stringify(previous.config) !== JSON.stringify(input.config)) throw new DomainError('Request key already used for different input', 409);
      return previous;
    }
    if (runs.some(r => !terminal.has(r.state))) throw new DomainError('Conversation already has an active run', 409);
    if (input.parentRunId && !runs.some(r => r.id === input.parentRunId && terminal.has(r.state))) throw new DomainError('Retry parent must be a terminal run in this conversation');
    const limits = { ...defaultLimits, ...input.limits };
    for (const [key, value] of Object.entries(limits)) if (!Number.isSafeInteger(value) || value < 1 || value > defaultLimits[key as keyof Limits]) throw new DomainError(`Invalid ${key} limit`);
    const run: Run = { id: randomUUID(), projectId, conversationId, requestKey: input.requestKey, question: input.question, config: input.config, limits, state: 'queued', phase: 'planning', decisions: {}, createdAt: new Date().toISOString(), ...(input.parentRunId ? { parentRunId: input.parentRunId } : {}) };
    this.store.transaction(() => {
      this.store.saveRun(run);
      const messageId = randomUUID();
      this.store.put('message', messageId, projectId, { id: messageId, projectId, conversationId, runId: run.id, role: 'user', content: run.question });
    });
    this.event(run.id, 'run_created', { conversationId });
    // Start after returning the persisted identity. Browser retries and stream
    // subscriptions never enter this path again.
    const task = Promise.resolve().then(() => this.execute(run.id));
    this.tasks.set(run.id, task);
    void task.then(() => this.tasks.delete(run.id), () => this.tasks.delete(run.id));
    return run;
  }
  event(runId: string, kind: string, data: ObjectData, mutate?: (run: Run) => void): void {
    const event = this.store.append(runId, kind, data, mutate);
    this.notifications.emit(runId, event);
  }
  async execute(runId: string): Promise<void> {
    try {
      const current = this.store.get<Run>('run', runId);
      if (current.state !== 'queued') return;
      this.event(runId, 'run_started', {}, r => { r.state = 'running'; });
      const host: HarnessHost = {
        emit: async (kind, data) => {
          const run = this.store.get<Run>('run', runId);
          if (terminal.has(run.state) || run.state === 'cancelling') throw new DomainError('Run is stopping', 409);
          this.event(runId, kind, data, current => {
            if (kind === 'message_end') {
              const messageId = text(data.messageId);
              this.store.put('message', messageId, current.projectId, { id: messageId, projectId: current.projectId, conversationId: current.conversationId, runId, role: 'assistant', content: data.content ?? '', stepId: data.stepId ?? null });
            }
          });
        },
        wait: (interaction, signal) => this.wait(runId, interaction, signal),
      };
      await this.runtime.start(this.store.get<Run>('run', runId), host);
      const run = this.store.get<Run>('run', runId);
      if (!terminal.has(run.state)) this.finish(runId, run.state === 'cancelling' ? 'cancelled' : 'succeeded');
    } catch (error) {
      // The adapter has observed worker termination before settling start().
      try {
        const run = this.store.get<Run>('run', runId);
        if (!terminal.has(run.state)) this.finish(runId, run.state === 'cancelling' ? 'cancelled' : 'failed', error instanceof DomainError ? error.message : 'Execution failed; check provider connectivity and configuration');
      } catch {
        // A persistence failure prevents further dispatch and publication. Once
        // storage is restored restart reconciliation will classify the run.
        await this.runtime.cancel(runId);
      }
    }
  }
  finish(runId: string, state: RunState, error?: string): void {
    this.event(runId, 'run_finished', { state, error: error ?? null }, r => { r.state = state; r.phase = 'finished'; if (error) r.error = error; delete r.interaction; });
    this.waiters.delete(runId);
  }
  wait(runId: string, input: Omit<Interaction, 'id' | 'version'>, signal: AbortSignal): Promise<Json> {
    signal.throwIfAborted();
    const run = this.store.get<Run>('run', runId);
    if (run.state !== 'running' || this.waiters.has(runId)) throw new DomainError('Run cannot request another interaction', 409);
    if (input.kind !== 'confirmation' && !run.plan?.confirmed) throw new DomainError('Plan must be confirmed first');
    const interaction: Interaction = { ...input, id: randomUUID(), version: (run.plan?.version ?? 0) + 1 };
    return new Promise((resolve, reject) => {
      const cleanup = () => { signal.removeEventListener('abort', abort); this.waiters.delete(runId); };
      const abort = () => { cleanup(); reject(new DomainError('Execution interrupted')); };
      this.waiters.set(runId, value => { cleanup(); resolve(value); });
      signal.addEventListener('abort', abort, { once: true });
      try {
        this.event(runId, 'interaction_requested', { interaction: interaction as unknown as Json }, r => {
          r.interaction = interaction; r.state = states.get(input.kind)!;
          if (input.kind === 'confirmation') r.plan = { version: interaction.version, text: interaction.prompt, tools: Array.isArray(input.scope?.tools) ? input.scope.tools.map(String) : [], confirmed: false };
        });
      } catch (error) { cleanup(); reject(error); }
    });
  }
  respond(runId: string, decision: Decision): Decision {
    const run = this.store.get<Run>('run', runId);
    if (terminal.has(run.state) || run.state === 'cancelling') throw new DomainError('Run no longer accepts decisions', 409);
    const previous = run.decisions[decision.interactionId];
    if (previous) {
      if (previous.version === decision.version && JSON.stringify(previous.value) === JSON.stringify(decision.value)) return previous;
      throw new DomainError('Interaction already answered differently', 409);
    }
    const interaction = run.interaction;
    if (!interaction || interaction.id !== decision.interactionId || interaction.version !== decision.version || !this.waiters.has(runId)) throw new DomainError('Stale interaction', 409);
    validateDecision(interaction, decision.value);
    this.event(runId, 'interaction_answered', { decision: decision as unknown as Json, kind: interaction.kind }, r => {
      r.decisions[decision.interactionId] = decision;
      r.state = 'running';
      if (interaction.kind === 'confirmation' && r.plan) { r.plan.confirmed = decision.value === true; r.phase = 'research'; }
      delete r.interaction;
    });
    this.waiters.get(runId)!(decision.value);
    return decision;
  }
  confirm(runId: string, version: number): Decision {
    const run = this.store.get<Run>('run', runId);
    if (!run.interaction || run.interaction.kind !== 'confirmation' || run.plan?.version !== version) throw new DomainError('Review the current plan version', 409);
    return this.respond(runId, { interactionId: run.interaction.id, version, value: true });
  }
  async cancel(runId: string): Promise<Run> {
    const run = this.store.get<Run>('run', runId);
    if (terminal.has(run.state)) return run;
    if (run.state !== 'cancelling') this.event(runId, 'cancel_requested', {}, r => { r.state = 'cancelling'; });
    await this.runtime.cancel(runId);
    await this.tasks.get(runId);
    const latest = this.store.get<Run>('run', runId);
    if (!terminal.has(latest.state)) this.finish(runId, 'cancelled');
    return this.store.get<Run>('run', runId);
  }
  async close(): Promise<void> {
    this.closed = true;
    await Promise.all(this.store.list<Run>('run').filter(r => !terminal.has(r.state)).map(r => this.cancel(r.id)));
    await this.runtime.close();
    await Promise.all(this.tasks.values());
    this.store.close();
  }
}
