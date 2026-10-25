import { createContext, memo, useContext, useEffect, useMemo, useState } from 'react';
import { AssistantRuntimeProvider, MessagePrimitive, ThreadPrimitive, useAuiState } from '@assistant-ui/react';
import { useAgUiRuntime } from '@assistant-ui/react-ag-ui';
import { HttpAgent } from '@ag-ui/client';
import type { AgentSubscriber } from '@ag-ui/client';
import type { Run } from '../app/contracts';
import { csrfToken } from './api';
import { ReportText } from './ui';

class ExistingRunAgent extends HttpAgent {
  platformRunId: string;
  constructor(run: Run) {
    super({ url: `/api/v1/runs/${run.id}/ag-ui`, threadId: run.conversationId, headers: { 'x-openlab-csrf': csrfToken() } });
    this.platformRunId = run.id;
  }
  override runAgent(parameters?: Parameters<HttpAgent['runAgent']>[0], subscriber?: AgentSubscriber) {
    return super.runAgent({ ...parameters, runId: this.platformRunId }, subscriber);
  }
}
const PlanContext = createContext('');
const SourceContext = createContext<(id: string) => void>(() => {});
function TextPart({ text }: { text: string }) { const plan = useContext(PlanContext); const source = useContext(SourceContext); if (plan && text.trim() === plan.trim()) return null; return <ReportText onSource={source}>{text}</ReportText>; }
function Message() {
  return <MessagePrimitive.Root className="chat-message"><MessagePrimitive.Parts components={{
    Text: TextPart,
    // Tool results remain available in the recorded execution details.
    tools: { Fallback: () => null },
  }} /></MessagePrimitive.Root>;
}
function UserMessage() { return <div className="user-message"><Message /></div>; }
function AssistantMessage() {
  const plan = useContext(PlanContext);
  const hasText = useAuiState(state => state.message.parts.some(part => part.type === 'text' && part.text.trim().length > 0 && part.text.trim() !== plan.trim()));
  return hasText ? <div className="assistant-message"><div className="assistant-avatar" aria-hidden="true">O</div><div className="assistant-content"><strong className="assistant-name">OpenLab</strong><Message /></div></div> : null;
}
const messageComponents = { UserMessage, AssistantMessage };
export const Conversation = memo(function Conversation({ run, onSource, retryKey = 0 }: { run: Run; onSource: (id: string) => void; retryKey?: number }) {
  const agent = useMemo(() => new ExistingRunAgent(run), [run.id, retryKey]);
  const [streamError, setStreamError] = useState('');
  const runtime = useAgUiRuntime({ agent, showThinking: false, autoCancelPendingToolCalls: false, isSendDisabled: true,
    onError: () => setStreamError('Conversation stream ended with an error. Check the recorded run status. / 对话流异常，请查看已记录的运行状态。'),
  });
  useEffect(() => { runtime.thread.startRun({ parentId: null }); return () => agent.abortRun(); }, [runtime, agent]);
  return <PlanContext.Provider value={run.interaction?.kind === 'confirmation' ? run.interaction.prompt : ''}><SourceContext.Provider value={onSource}><AssistantRuntimeProvider runtime={runtime}>
    {streamError && <p className="notice" role="status">{streamError}</p>}
    <ThreadPrimitive.Root className="thread"><ThreadPrimitive.Viewport className="thread-viewport" autoScroll={false}>
      <ThreadPrimitive.Messages components={messageComponents} />
    </ThreadPrimitive.Viewport></ThreadPrimitive.Root>
  </AssistantRuntimeProvider></SourceContext.Provider></PlanContext.Provider>;
}, (previous, next) => previous.run.id === next.run.id && previous.retryKey === next.retryKey && previous.onSource === next.onSource && previous.run.interaction?.id === next.run.interaction?.id);
