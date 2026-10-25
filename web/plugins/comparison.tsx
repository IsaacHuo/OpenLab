import { useEffect, useState } from 'react';
import type { ChangeObject } from 'diff';
import type { PluginViewProps } from './registry';
export default function Comparison({ content, before = '', zh }: PluginViewProps) {
  const [changes, setChanges] = useState<ChangeObject<string>[] | null | undefined>();
  useEffect(() => { const worker = new Worker(new URL('./diff.worker.ts', import.meta.url), { type: 'module' }); setChanges(undefined); const timeout = setTimeout(() => { worker.terminate(); setChanges(null); }, 2500); worker.onmessage = event => { clearTimeout(timeout); setChanges(event.data); worker.terminate(); }; worker.onerror = () => { clearTimeout(timeout); setChanges(null); worker.terminate(); }; worker.postMessage({ before, after: content }); return () => { clearTimeout(timeout); worker.terminate(); }; }, [content, before]);
  return <div className="document-comparison" aria-label={zh ? '修订差异' : 'Revision differences'}>{changes === undefined ? <p role="status">{zh ? '正在比较…' : 'Comparing…'}</p> : changes === null ? <p role="status">{zh ? '差异过大，请查看或下载两个版本的原文。' : 'Comparison limit reached. View or download the original revisions.'}</p> : changes.map((change, index) => <pre key={index} className={change.added ? 'diff-added' : change.removed ? 'diff-removed' : 'diff-unchanged'}><span className="diff-sign" aria-label={change.added ? zh ? '新增' : 'Added' : change.removed ? zh ? '删除' : 'Removed' : zh ? '未变' : 'Unchanged'}>{change.added ? '+' : change.removed ? '−' : ' '}</span>{change.value}</pre>)}</div>;
}
