import type { ObjectData, ResearchEvent, Run } from './contracts.ts';

// Projection only. No event in this module can start or resume execution.
export function projectEvent(event: ResearchEvent, run: Run): ObjectData[] {
  const { kind, data } = event;
  const timestamp = Date.parse(event.at);
  const events: ObjectData[] = [];
  if (kind === 'run_created') return [];
  if (kind === 'run_started') {
    const messageId = `${run.id}:user`;
    events.push({ type: 'RUN_STARTED', runId: run.id, threadId: run.conversationId }, { type: 'TEXT_MESSAGE_START', messageId, role: 'user' }, { type: 'TEXT_MESSAGE_CONTENT', messageId, delta: run.question }, { type: 'TEXT_MESSAGE_END', messageId });
  }
  else if (kind === 'message_start') events.push({ type: 'TEXT_MESSAGE_START', messageId: data.messageId, role: 'assistant' });
  else if (kind === 'message_delta') events.push({ type: 'TEXT_MESSAGE_CONTENT', messageId: data.messageId, delta: data.text });
  else if (kind === 'message_end') events.push({ type: 'TEXT_MESSAGE_END', messageId: data.messageId });
  else if (kind === 'step_started') events.push({ type: 'STEP_STARTED', stepName: data.stepId });
  else if (kind === 'step_finished') events.push({ type: 'STEP_FINISHED', stepName: data.stepId });
  else if (kind === 'tool_intent') events.push({ type: 'TOOL_CALL_START', toolCallId: data.callId, toolCallName: data.name }, { type: 'TOOL_CALL_ARGS', toolCallId: data.callId, delta: data.arguments }, { type: 'TOOL_CALL_END', toolCallId: data.callId });
  else if (kind === 'tool_result') events.push({ type: 'TOOL_CALL_RESULT', toolCallId: data.callId, messageId: `${String(data.callId)}:result`, role: 'tool', content: JSON.stringify(data.result) });
  else if (kind === 'run_finished') {
    events.push({ type: 'CUSTOM', name: 'openlab.run_state', value: data });
    if (data.state === 'failed' || data.state === 'interrupted') events.push({ type: 'RUN_ERROR', message: data.error ?? 'Run interrupted', code: data.state });
    else events.push({ type: 'RUN_FINISHED', runId: run.id, threadId: run.conversationId });
  } else events.push({ type: 'CUSTOM', name: `openlab.${kind}`, value: data });
  if (['run_started', 'interaction_requested', 'interaction_answered', 'cancel_requested', 'run_finished', 'artifact_saved', 'usage'].includes(kind)) {
    events.splice(kind === 'run_finished' ? 0 : events.length, 0, { type: 'STATE_SNAPSHOT', snapshot: { openlab: { runId: run.id, state: run.state, phase: run.phase, plan: (run.plan ?? null) as unknown as import('./contracts.ts').Json, interaction: (run.interaction ?? null) as unknown as import('./contracts.ts').Json } } });
  }
  return events.map((item, index) => ({ ...item, timestamp, metadata: { openlab: { runId: run.id, seq: event.seq, index } } }));
}
