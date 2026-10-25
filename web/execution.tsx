import type { ObjectData, ResearchEvent, Run } from '../app/contracts';
import { terminal } from '../app/contracts';
import { CheckCircle2, ChevronDown, LoaderCircle } from 'lucide-react';
export function activityRows(events: ResearchEvent[], run: Run) {
  return events.filter(event => event.kind === 'step_started' || event.kind === 'tool_intent').map(event => {
    const stepId = String(event.data.stepId); const tool = event.kind === 'tool_intent';
    const completed = events.find(candidate => tool ? candidate.kind === 'tool_result' && candidate.data.callId === event.data.callId : candidate.kind === 'step_finished' && candidate.data.stepId === event.data.stepId);
    const result = completed?.data.result as ObjectData | undefined;
    return { event, stepId, label: String(tool ? event.data.name : event.data.label), completed: Boolean(completed), failed: Boolean(result?.failure) || (!completed && terminal.has(run.state) && run.state !== 'succeeded'), result, details: completed?.data ?? event.data };
  });
}
export function ExecutionRecord({ run, events, zh, highlightedStep, retry, disabled }: { run: Run; events: ResearchEvent[]; zh: boolean; highlightedStep: string; retry: () => void; disabled: boolean }) {
  const rows = activityRows(events, run); const labels: Record<string, string> = { Planning: '生成计划', Research: '分析研究', search_metadata: '检索文献', read_source: '读取来源', ask_question: '补充信息', publish_report: '保存成果' };
  const states: Record<string, string> = { queued: '排队中', running: '执行中', awaiting_confirmation: '等待确认计划', awaiting_permission: '等待授权', awaiting_input: '等待回答', cancelling: '正在停止', succeeded: '已完成 · 请审阅证据', failed: '研究失败', cancelled: '已取消', interrupted: '已中断' };
  const last = rows.at(-1); const active = !terminal.has(run.state);
  const usage = events.filter(event => event.kind === 'usage').at(-1)?.data;
  return <details className="execution-record" open={Boolean(highlightedStep)}><summary><span className="execution-icon">{active ? <LoaderCircle size={19} className={run.state === 'running' ? 'spin' : ''} aria-hidden="true" /> : <CheckCircle2 size={19} aria-hidden="true" />}</span><span>{zh ? states[run.state] : run.state}</span><span className="execution-count">{run.state === 'running' && last ? zh ? labels[last.label] ?? last.label : last.label : `${rows.length} ${zh ? '个步骤' : 'steps'}`}</span><ChevronDown className="summary-chevron" size={17} aria-hidden="true" /></summary><div className="execution-body"><p className="muted">{usage ? `${String(usage.totalReported ?? '?')} token${usage.unknownUsage ? zh ? ' · 部分用量未知' : ' · partial usage unknown' : ''}` : zh ? '用量未知' : 'Usage unknown'}</p><ol>{rows.map(row => <li id={`step-${row.stepId}`} key={row.event.seq} className={highlightedStep === row.stepId ? 'highlighted-step' : ''}><time>{new Date(row.event.at).toLocaleTimeString(zh ? 'zh-CN' : 'en-US')}</time><strong>{zh ? labels[row.label] ?? row.label : row.label}</strong><span>{row.failed ? zh ? '失败或中断' : 'Failed or interrupted' : row.completed ? zh ? '完成' : 'Complete' : active ? zh ? '进行中' : 'In progress' : zh ? '未完成' : 'Incomplete'}</span>{Array.isArray(row.result?.sources) && <small>{row.result.sources.length} {zh ? '条来源' : 'sources'}</small>}<details><summary>{zh ? '技术详情' : 'Technical details'}</summary><pre>{JSON.stringify(row.details, null, 2)}</pre></details></li>)}</ol>{terminal.has(run.state) && <button className="retry" disabled={disabled} onClick={retry}>{zh ? '创建关联重试' : 'Start a linked retry'}</button>}</div></details>;
}
