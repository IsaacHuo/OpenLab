import { useEffect, useState } from 'react';
import type { ObjectData } from '../app/contracts';
import { api } from './api';
import { Tag } from './ui';

export function Diagnostics({ zh }: { zh: boolean }) {
  const [setup, setSetup] = useState<ObjectData | null>(null);
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { void api<ObjectData>('/setup').then(setSetup).catch(() => setResult(zh ? '本地服务不可用' : 'Local service unavailable')); }, []);
  return <section className="diagnostics" aria-label={zh ? '设置诊断' : 'Setup diagnostics'}><Tag tone={setup ? 'green' : 'amber'}>{setup ? zh ? '本地服务和运行时可用' : 'Local service and runtime available' : zh ? '正在检查本地服务' : 'Checking local service'}</Tag><details><summary>{zh ? '环境信息' : 'Environment details'}</summary><p>Node.js {String(setup?.node ?? '…')} · {String(setup?.platform ?? '…')}</p><p>{zh ? '已保存项目支持离线查看；模型执行和检索需要网络。进程丢失后需要明确重试。' : 'Saved projects can be viewed offline; model execution and retrieval need network access. A lost worker requires an explicit retry.'}</p></details><div className="row"><button disabled={busy} onClick={async () => {
    setBusy(true); setResult('');
    try { await api('/retrieval/test', 'POST', {}); setResult(zh ? 'Crossref 元数据检索可用' : 'Crossref metadata retrieval available'); }
    catch (failure) { setResult(failure instanceof Error ? failure.message : 'Retrieval unavailable'); }
    finally { setBusy(false); }
  }}>{zh ? '测试文献检索' : 'Test scholarly retrieval'}</button>{result && <span role="status">{result}</span>}</div></section>;
}
export function ExecutionLimits({ zh, value, change }: { zh: boolean; value: { tokens: number; turns: number }; change: (limits: { tokens: number; turns: number }) => void }) {
  return <section><h3>{zh ? '后续运行的限制' : 'Limits for subsequent runs'}</h3><div className="form-grid"><label className="field">{zh ? '已报告 token 预算' : 'Reported token budget'}<input type="number" min={1} max={60000} value={value.tokens} onChange={event => change({ ...value, tokens: Number(event.target.value) })} /></label><label className="field">{zh ? '最多模型调用次数' : 'Maximum model calls'}<input type="number" min={1} max={12} value={value.turns} onChange={event => change({ ...value, turns: Number(event.target.value) })} /></label></div><p className="muted">{zh ? '达到已报告用量后停止新模型调用；单次调用可能跨过预算。未知用量仍会标记为未知，这不是供应商通用的账单硬上限。' : 'New model calls stop at the reported usage budget; one call can cross it. Unknown usage stays unknown. This is not a provider-independent hard billing cap.'}</p></section>;
}
