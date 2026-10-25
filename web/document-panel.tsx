import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Expand, FilePlus2, X } from 'lucide-react';
import type { ObjectData } from '../app/contracts';
import type { PluginCatalog } from '../app/plugin-contracts';
import { resolvePlugin } from '../app/plugin-contracts';
import { api, ApiError } from './api';
import { Modal } from './ui';
import { Popover, Select } from './controls';
import { PluginView } from './plugins/registry';
import type { PluginHost } from './plugins/registry';
import { exportDocument } from './plugins/exporter';
import { compileDocument } from './plugins/compiler';
import type { DocumentResource } from './plugins/compiler';

interface DocumentData { revision: ObjectData; content: string; files: DocumentResource[] }
export function DocumentPanel({ artifacts, revisions, revisionId, catalog, conversationId, zh, archived, select, refresh, source, step, quote, citationTarget }: {
  artifacts: ObjectData[]; revisions: ObjectData[]; revisionId: string; catalog: PluginCatalog; conversationId: string; zh: boolean; archived: boolean;
  citationTarget?: ObjectData; select: (id: string) => void; refresh: () => Promise<void>; source: (id: string) => void; step: (runId: string, stepId: string) => void; quote: (text: string, revisionId: string) => void;
}) {
  const t = (en: string, cn: string) => zh ? cn : en;
  const revisionRecord = revisions.find(revision => revision.id === revisionId);
  const artifact = artifacts.find(artifact => artifact.id === revisionRecord?.artifactId) ?? artifacts.at(-1);
  const artifactId = String(artifact?.id ?? ''); const format = String(artifact?.formatId ?? 'markdown');
  const [documentName, setDocumentName] = useState(''); const [selectedPassage, setSelectedPassage] = useState('');
  const [data, setData] = useState<DocumentData | null>(null); const [content, setContent] = useState(''); const [files, setFiles] = useState<DocumentResource[]>([]);
  const [editingFile, setEditingFile] = useState('');
  const [editorPreview, setEditorPreview] = useState(false);
  const [baseId, setBaseId] = useState(''); const [expectedLatest, setExpectedLatest] = useState(''); const [mode, setMode] = useState<'read' | 'edit' | 'compare'>('read');
  const [focused, setFocused] = useState(false); const [closing, setClosing] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [conflictRevision, setConflictRevision] = useState('');
  const syncedDraft = useRef('');
  const [status, setStatus] = useState(''); const [compareId, setCompareId] = useState(''); const [before, setBefore] = useState(''); const [builds, setBuilds] = useState<ObjectData[]>([]);
  const [compileOptions, setCompileOptions] = useState<Record<string, string>>({}); const [compiling, setCompiling] = useState(false); const [compileMessage, setCompileMessage] = useState(''); const [compileLog, setCompileLog] = useState('');
  const abort = useRef<AbortController | null>(null); const queue = useRef(Promise.resolve()); const pendingSave = useRef<{ fingerprint: string; requestKey: string } | null>(null);
  const editorBase = useRef<{ content: string; files: string }>({ content: '', files: '[]' });
  const documentTitle = String(artifact?.name ?? data?.content.match(/^#\s+(.+)/m)?.[1] ?? t('Untitled document', '未命名文档'));
  const dirty = data !== null && data.revision.artifactId === artifactId && (documentName !== documentTitle || content !== editorBase.current.content || JSON.stringify(files) !== editorBase.current.files);
  const resourceInput = () => files.map(file => ({ path: file.path, base64: file.base64 }));
  const leavingDraft = useMemo(() => ({ value: null as ObjectData | null }), [artifactId, revisionId]);
  leavingDraft.value = dirty && data?.revision.id === revisionId ? { name: documentName, content, files: resourceInput(), baseRevisionId: baseId, expectedLatestRevisionId: expectedLatest } : null;
  useEffect(() => () => {
    const input = leavingDraft.value;
    if (input && artifactId) queue.current = queue.current.catch(() => {}).then(async () => { await api(`/artifacts/${artifactId}/draft`, 'PUT', input); }).catch(() => {});
  }, [leavingDraft, artifactId]);
  const action = async (run: () => Promise<void>) => { setBusy(true); setError(''); try { await run(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Operation failed'); if (failure instanceof ApiError && failure.status === 409) { await refresh(); const latest = await api<{ artifact: ObjectData }>(`/artifacts/${artifactId}`); setConflictRevision(String(latest.artifact.latest)); } } finally { setBusy(false); } };
  const load = async (id: string): Promise<DocumentData> => api(`/artifacts/${artifactId}/revisions/${id}`);
  useEffect(() => {
    let stopped = false; setData(null); setMode('read'); setError(''); setStatus(''); setFocused(false); setEditingFile(''); setSelectedPassage(''); setDocumentName(String(artifact?.name ?? ''));
    if (!artifactId || !revisionId || revisionRecord?.artifactId !== artifactId) return;
    void load(revisionId).then(value => { if (stopped) return; value.files ??= []; setDocumentName(String(artifact?.name ?? value.content.match(/^#\s+(.+)/m)?.[1] ?? t('Untitled document', '未命名文档'))); setData(value); setContent(value.content); setFiles(value.files); setBaseId(revisionId); setExpectedLatest(String(artifact?.latest)); editorBase.current = { content: value.content, files: JSON.stringify(value.files) }; setCompareId(String(value.revision.parentRevisionId ?? revisions.filter(record => record.artifactId === artifactId && record.id !== revisionId).at(-1)?.id ?? '')); }).catch(failure => { if (!stopped) setError(failure.message); });
    void api<ObjectData[]>(`/artifacts/${artifactId}/builds`).then(value => { if (!stopped) setBuilds(value); }).catch(() => {});
    return () => { stopped = true; };
  }, [artifactId, revisionId]);
  useEffect(() => { if (!compareId || !artifactId) { setBefore(''); return; } let stopped = false; void load(compareId).then(value => { if (!stopped) setBefore(value.content); }).catch(failure => { if (!stopped) setError(failure.message); }); return () => { stopped = true; }; }, [compareId, artifactId]);
  useEffect(() => () => { abort.current?.abort(); }, [artifactId]);
  const persistDraft = async () => {
    const input = { name: documentName || t('Untitled document', '未命名文档'), content, files: resourceInput(), baseRevisionId: baseId, expectedLatestRevisionId: expectedLatest };
    queue.current = queue.current.catch(() => {}).then(async () => { await api(`/artifacts/${artifactId}/draft`, 'PUT', input); });
    await queue.current; syncedDraft.current = JSON.stringify({ name: documentName, content, files });
  };
  useEffect(() => {
    if (!dirty || !artifactId) return;
    const timer = setTimeout(() => { void persistDraft().then(() => setStatus(t('Draft saved', '草稿已保存'))).catch(failure => setError(failure.message)); }, 350);
    const unload = (event: BeforeUnloadEvent) => { if (syncedDraft.current !== JSON.stringify({ name: documentName, content, files })) event.preventDefault(); };
    addEventListener('beforeunload', unload); return () => { clearTimeout(timer); removeEventListener('beforeunload', unload); };
  }, [content, files, documentName, dirty, artifactId]);
  const save = async (): Promise<DocumentData> => {
    if (!data) throw new Error('Document unavailable');
    if (!dirty) return data;
    await persistDraft();
    const input = { name: documentName || t('Untitled document', '未命名文档'), content, files: resourceInput(), baseRevisionId: baseId, expectedLatestRevisionId: expectedLatest };
    const fingerprint = JSON.stringify(input); if (pendingSave.current?.fingerprint !== fingerprint) pendingSave.current = { fingerprint, requestKey: crypto.randomUUID() };
    const saved = await api<DocumentData>(`/artifacts/${artifactId}/revisions`, 'POST', { ...input, requestKey: pendingSave.current.requestKey });
    pendingSave.current = null; editorBase.current = { content: saved.content, files: JSON.stringify(saved.files) }; setData(saved); setContent(saved.content); setFiles(saved.files); setBaseId(String(saved.revision.id)); setExpectedLatest(String(saved.revision.id));
    await api(`/artifacts/${artifactId}/draft`, 'DELETE'); await refresh(); select(String(saved.revision.id)); setStatus(t('Revision saved', '修订已保存')); return saved;
  };
  const startEditing = async () => {
    const draft = await api<ObjectData | null>(`/artifacts/${artifactId}/editing-draft`);
    if (draft) { setContent(String(draft.content)); setFiles((draft.files ?? []) as unknown as DocumentResource[]); setBaseId(String(draft.baseRevisionId)); setExpectedLatest(String(draft.expectedLatestRevisionId)); setDocumentName(String(draft.name ?? artifact?.name ?? '')); }
    setMode('edit'); setFocused(true);
  };
  const download = () => {
    if (!data) return; const url = URL.createObjectURL(exportDocument(catalog, format, data.content, String(artifact?.mainPath ?? 'report.md'))); const link = document.createElement('a'); link.href = url; link.download = String(artifact?.mainPath ?? 'report.md'); link.click(); URL.revokeObjectURL(url); setStatus(t('Download started', '已开始下载'));
  };
  const create = async (template: { name: string; format: string; mainPath: string; content: string }) => {
    const created = await api<{ revision: ObjectData }>(`/conversations/${conversationId}/documents`, 'POST', { name: t('Untitled document', '未命名文档'), formatId: template.format, mainPath: template.mainPath, content: template.content, requestKey: crypto.randomUUID() }); await refresh(); select(String(created.revision.id));
  };
  const compile = async () => {
    setError(''); setCompiling(true); setCompileLog(''); const controller = new AbortController(); abort.current = controller;
    try {
      const saved = await save();
      setCompileMessage(t('Compiling…', '正在编译…'));
      const compiler = resolvePlugin(catalog, 'compiler', format)!;
      const result = await compileDocument(catalog, format, { content: saved.content, language: zh ? 'zh' : 'en', mainPath: String(artifact?.mainPath ?? 'main.tex'), files: saved.files, options: Object.fromEntries((compiler.parameters ?? []).map(parameter => [parameter.key, compileOptions[parameter.key] ?? parameter.default])) }, message => { setCompileMessage(message.slice(0, 160)); }, controller.signal);
      setCompileLog(result.log); setCompileMessage(t(result.status, { succeeded: '编译完成', failed: '编译失败', cancelled: '已取消编译' }[result.status]));
      const base64 = result.pdf ? await new Promise<string>(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(new Blob([Uint8Array.from(result.pdf!)])); }) : undefined;
      const build = await api<ObjectData>(`/artifacts/${artifactId}/builds`, 'POST', { sourceRevisionId: saved.revision.id, sourceHash: saved.revision.hash, pluginId: compiler.id, pluginVersion: compiler.version, engineVersion: result.engineVersion, engine: result.engine, status: result.status, log: result.log, requestKey: crypto.randomUUID(), ...(base64 ? { pdf: base64 } : {}) });
      setBuilds(current => [...current, build]);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Compilation failed'); } finally { setCompiling(false); abort.current = null; }
  };
  const host: PluginHost = { readRevision: async id => load(id) as unknown as ObjectData, readAsset: async id => new Uint8Array(await (await fetch(`/api/v1/assets/${id}`)).arrayBuffer()), saveRevision: async input => api(`/artifacts/${artifactId}/revisions`, 'POST', input), openArtifact: select, requestOperation: async (operation, input) => { if (operation !== 'save-build') throw new Error('Unsupported host operation'); return api(`/artifacts/${artifactId}/builds`, 'POST', input); } };
  const fileContent = editingFile ? files.find(file => file.path === editingFile) : undefined;
  const editorContent = fileContent ? new TextDecoder().decode(Uint8Array.from(atob(fileContent.base64), character => character.charCodeAt(0))) : content;
  const changeEditorContent = (value: string) => {
    if (!fileContent) { setContent(value); return; }
    const bytes = new TextEncoder().encode(value); let binary = ''; for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
    const base64 = btoa(binary); setFiles(current => current.map(file => file.path === editingFile ? { ...file, base64 } : file));
  };
  const documentRevisions = revisions.filter(record => record.artifactId === artifactId);
  const pdf = builds.filter(build => build.status === 'succeeded').at(-1);
  const headings = useMemo(() => [...(data?.content ?? '').matchAll(/^(#{1,3})\s+(.+)$/gm)].map((match, index) => ({ title: match[2], index })), [data?.content]);
  const templates = catalog.manifests.filter(plugin => catalog.state.enabled[plugin.id] !== false).flatMap(plugin => plugin.templates ?? []);
  const view = <div className="document-surface">
    <div className="document-toolbar"><Select label={t('Report', '研究报告')} value={artifactId} onChange={value => { const target = artifacts.find(record => record.id === value); if (target) select(String(target.latest)); }} options={artifacts.map((record, index) => ({ value: String(record.id), label: String(record.name ?? (record.id === artifactId ? data?.content.match(/^#\s+(.+)/m)?.[1] : undefined) ?? `${t('Report', '报告')} ${index + 1}`) }))} />
      <Popover label={t('New document', '新建文档')} trigger={<button className="icon-button" aria-label={t('New document', '新建文档')} disabled={archived || !conversationId}><FilePlus2 size={18} aria-hidden="true" /></button>}>{templates.map(template => <button key={template.format} className="menu-action" onClick={() => void action(() => create(template))}>{template.name}</button>)}</Popover>
      <button className="icon-button" aria-label={t('Focus document', '专注阅读')} disabled={!artifactId} onClick={() => setFocused(value => !value)}><Expand size={17} aria-hidden="true" /></button>
    </div>
    {!artifact ? <p className="empty-pane">{t('No documents yet', '暂无文档')}</p> : <>
      <div className="document-toolbar"><Select label={t('Report revision', '报告修订')} value={revisionId} onChange={select} options={documentRevisions.map((record, index) => ({ value: String(record.id), label: `${record.origin === 'user' ? t('Edited', '人工编辑') : record.committed ? t('Committed', '已提交') : t('Draft · incomplete', '草稿 · 未完成')} ${index + 1} · ${new Date(String(record.createdAt)).toLocaleString(zh ? 'zh-CN' : 'en-US')}` }))} /><button className="icon-button" aria-label={format === 'markdown' ? t('Download Markdown', '下载 Markdown') : t('Download source', '下载源文件')} onClick={download} disabled={!data}><Download size={18} aria-hidden="true" /></button></div>
      {artifact.latest !== revisionId && <button className="notice" onClick={() => select(String(artifact.latest))}>{t('A newer saved version is available →', '有更新的已保存版本 →')}</button>}
      <div className="document-modes" role="group" aria-label={t('Document view', '文档视图')}><button aria-pressed={mode === 'read'} onClick={() => setMode('read')}>{t('Read', '阅读')}</button><button aria-pressed={mode === 'edit'} disabled={archived || busy || compiling || !data} onClick={() => void action(startEditing)}>{t('Edit', '编辑')}</button><button aria-pressed={mode === 'compare'} disabled={documentRevisions.length < 2} onClick={() => setMode('compare')}>{t('Compare', '版本对比')}</button>{dirty && <button className="primary" disabled={busy || compiling} onClick={() => void action(async () => { await save(); })}>{t('Save revision', '保存修订')}</button>}</div>
      {error && <p className="notice" role="alert">{error}</p>}{conflictRevision && <div className="notice"><button onClick={() => { setCompareId(conflictRevision); setMode('compare'); }}>{t('Compare latest with your draft', '对比最新版与当前草稿')}</button><button onClick={() => { setBaseId(conflictRevision); setExpectedLatest(conflictRevision); setConflictRevision(''); setError(''); setMode('edit'); }}>{t('Continue editing based on latest revision', '以最新版为基准继续编辑')}</button></div>}{status && <p className="document-status" role="status">{status}</p>}
      {data && <div className="revision-meta"><span>{data.revision.origin === 'user' ? t('Edited by you', '人工编辑') : data.revision.committed ? t('Saved revision', '已保存修订') : t('Incomplete draft', '未完成草稿')}</span>{data.revision.runId && data.revision.stepId && <button className="link" onClick={() => step(String(data.revision.runId), String(data.revision.stepId))}>{t('Producing step ↗', '查看生成步骤 ↗')}</button>}<details><summary>{t('Revision details', '修订信息')}</summary><p className="mono">SHA-256 {String(data.revision.hash)}</p>{data.revision.parentRevisionId && <button className="link" onClick={() => select(String(data.revision.parentRevisionId))}>{t('Parent revision', '父修订')}</button>}</details></div>}
      {mode === 'compare' ? <><Select label={t('Compare with revision', '对比修订')} value={compareId} onChange={setCompareId} options={documentRevisions.filter(record => record.id !== revisionId).map((record, index) => ({ value: String(record.id), label: `${index + 1} · ${String(record.createdAt)}` }))} /><PluginView catalog={catalog} kind="comparator" format={format} content={dirty ? content : data?.content ?? ''} before={before} zh={zh} host={host} /></> : mode === 'edit' ? <>
        <label className="field">{t('Document name', '文档名称')}<input value={documentName} onChange={event => setDocumentName(event.target.value)} maxLength={200} /></label><Select label={t('Editing file', '当前编辑文件')} value={editingFile} onChange={setEditingFile} options={[{ value: '', label: String(artifact?.mainPath ?? 'report.md') }, ...files.filter(file => /\.(tex|bib|sty|cls|txt|md)$/i.test(file.path)).map(file => ({ value: file.path, label: file.path }))]} /><div className="editor-preview-switch">{resolvePlugin(catalog, 'previewer', format) && <button className="editor-preview-toggle" aria-pressed={editorPreview} onClick={() => setEditorPreview(value => !value)}>{editorPreview ? t('Return to source', '返回源码') : t('Preview draft', '预览草稿')}</button>}</div><div className="document-edit-grid" data-preview={editorPreview}><PluginView catalog={catalog} kind="editor" format={format} content={editorContent} onChange={changeEditorContent} zh={zh} host={host} /><div className="editor-live-preview">{resolvePlugin(catalog, 'previewer', format) && <PluginView catalog={catalog} kind="previewer" format={format} content={content} zh={zh} onSource={source} host={host} />}</div></div>
        <details><summary>{t('Document resources', '文档资源')} ({files.length})</summary>{files.map(file => <div className="resource-row" key={file.path}><span>{file.path}</span><button aria-label={`${t('Remove resource', '移除资源')} ${file.path}`} onClick={() => { if (editingFile === file.path) setEditingFile(''); setFiles(current => current.filter(value => value.path !== file.path)); }}><X size={15} aria-hidden="true" /></button></div>)}<label className="field">{t('Add resource', '添加资源文件')}<input type="file" multiple accept=".tex,.bib,.sty,.cls,.png,.jpg,.jpeg,.otf,.ttf,.txt,.md" onChange={event => { const uploaded = [...(event.target.files ?? [])]; void action(async () => { const additions = await Promise.all(uploaded.map(async file => { if (file.size > 10_000_000) throw new Error('Resource limit: 10 MB'); const base64 = await new Promise<string>(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(file); }); return { path: file.name, base64 }; })); setFiles(current => [...current.filter(file => !additions.some(value => value.path === file.path)), ...additions]); }); event.target.value = ''; }} /></label></details>
      </> : data && <>
        {format === 'markdown' && headings.length > 2 && <details className="document-outline"><summary>{t('Contents', '目录')}</summary><nav>{headings.map(heading => <button className="link block" key={heading.index} onClick={() => document.getElementById(`document-heading-${heading.index}`)?.scrollIntoView({ block: 'start' })}>{heading.title}</button>)}</nav></details>}
        <div className="document-reading" onKeyUp={event => { const selection = window.getSelection(); if (selection && event.currentTarget.contains(selection.anchorNode)) setSelectedPassage(selection.toString().trim().slice(0, 4000)); }} onMouseUp={event => { const selection = window.getSelection(); if (selection && event.currentTarget.contains(selection.anchorNode)) setSelectedPassage(selection.toString().trim().slice(0, 4000)); }}>{pdf ? <PluginView catalog={catalog} kind="previewer" format="pdf" content="" url={`/api/v1/assets/${String(pdf.outputAssetId)}`} zh={zh} host={host} /> : <PluginView catalog={catalog} kind={resolvePlugin(catalog, 'previewer', format) ? 'previewer' : 'editor'} format={format} content={data.content} zh={zh} onSource={source} host={host} data={{ citationTarget: citationTarget ?? null }} />}</div>
        {selectedPassage && <button className="link" onClick={() => { const passage = selectedPassage; setFocused(false); requestAnimationFrame(() => quote(passage, revisionId)); }}>{t('Ask about selected text', '将选中文段加入追问')}</button>}
      </>}
      {resolvePlugin(catalog, 'compiler', format) && <section className="document-build"><div className="document-toolbar">{resolvePlugin(catalog, 'compiler', format)?.parameters?.map(parameter => <Select key={parameter.key} label={parameter.label} value={compileOptions[parameter.key] ?? parameter.default} onChange={value => setCompileOptions(current => ({ ...current, [parameter.key]: value }))} options={parameter.values} />)}<button className="primary" disabled={busy || compiling || archived || !data} onClick={() => void compile()}>{dirty ? t('Save and compile', '保存并编译') : t('Compile', '编译')}</button>{compiling && <button onClick={() => { abort.current?.abort(); setCompileMessage(t('Compilation cancelled', '已取消编译')); }}>{t('Cancel compilation', '取消编译')}</button>}</div>{compileMessage && <p role="status" className="document-status">{compileMessage}</p>}{compileLog && <details open={!pdf}><summary>{t('Compilation log', '编译日志')}</summary><pre>{compileLog}</pre></details>}{pdf && <><p className="document-status">{pdf.sourceRevisionId === revisionId ? t('PDF matches this revision', 'PDF 对应当前修订') : t('Showing the last successful PDF from another revision', '显示另一修订的上次成功 PDF')}<button className="link" onClick={() => select(String(pdf.sourceRevisionId))}>{t('Open source revision', '查看源修订')}</button></p>{mode !== 'read' && <PluginView catalog={catalog} kind="previewer" format="pdf" content="" url={`/api/v1/assets/${String(pdf.outputAssetId)}`} zh={zh} host={host} />}</>}</section>}
    </>}
  </div>;
  const close = () => { if (dirty) setClosing(true); else setFocused(false); };
  return <>{focused ? <Modal title={documentTitle} close={close} wide>{view}</Modal> : view}{closing && <Modal title={t('Unsaved changes', '尚未保存的修改')} close={() => setClosing(false)}><div className="row wrap"><button className="primary" disabled={busy} onClick={() => void action(async () => { await save(); setClosing(false); setFocused(false); })}>{t('Save revision', '保存修订')}</button><button disabled={busy} onClick={() => void action(async () => { await persistDraft(); setMode('read'); setClosing(false); setFocused(false); })}>{t('Keep draft', '保留草稿')}</button><button disabled={busy} onClick={() => void action(async () => { await queue.current.catch(() => {}); await api(`/artifacts/${artifactId}/draft`, 'DELETE'); if (data) { setContent(data.content); setFiles(data.files); } setClosing(false); setFocused(false); })}>{t('Discard changes', '放弃修改')}</button></div></Modal>}</>;
}
