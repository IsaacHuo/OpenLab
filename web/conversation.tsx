import { createContext, memo, useContext, useEffect, useMemo, useState } from 'react';
import { AssistantRuntimeProvider, MessagePrimitive, ThreadPrimitive } from '@assistant-ui/react';
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
const SourceContext = createContext<(id: string) => void>(() => {});
function TextPart({ text }: { text: string }) { return <ReportText onSource={useContext(SourceContext)}>{text}</ReportText>; }
function Message() {
  return <MessagePrimitive.Root className="chat-message"><MessagePrimitive.Parts components={{
    Text: TextPart,
    tools: { Fallback: ({ toolName, result }) => <details className="tool-message"><summary>{toolName} {result === undefined ? '· …' : '· ✓'}</summary><pre>{result === undefined ? 'Waiting for tool / 等待工具' : JSON.stringify(result, null, 2)}</pre></details> },
  }} /></MessagePrimitive.Root>;
}
function UserMessage() { return <div className="user-message"><Message /></div>; }
const messageComponents = { UserMessage, AssistantMessage: Message };
export const Conversation = memo(function Conversation({ run, onSource, retryKey = 0 }: { run: Run; onSource: (id: string) => void; retryKey?: number }) {
  const agent = useMemo(() => new ExistingRunAgent(run), [run.id, retryKey]);
  const [streamError, setStreamError] = useState('');
  const runtime = useAgUiRuntime({ agent, showThinking: false, autoCancelPendingToolCalls: false, isSendDisabled: true,
    onError: () => setStreamError('Conversation stream ended with an error. Check the recorded run status. / 对话流异常，请查看已记录的运行状态。'),
  });
  useEffect(() => { runtime.thread.startRun({ parentId: null }); return () => agent.abortRun(); }, [runtime, agent]);
  return <SourceContext.Provider value={onSource}><AssistantRuntimeProvider runtime={runtime}>
    {streamError && <p className="notice" role="status">{streamError}</p>}
    <ThreadPrimitive.Root className="thread"><ThreadPrimitive.Viewport className="thread-viewport" autoScroll={false}>
      <ThreadPrimitive.Messages components={messageComponents} />
    </ThreadPrimitive.Viewport></ThreadPrimitive.Root>
  </AssistantRuntimeProvider></SourceContext.Provider>;
}, (previous, next) => previous.run.id === next.run.id && previous.retryKey === next.retryKey && previous.onSource === next.onSource);
