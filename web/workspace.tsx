import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import type { Interaction, Json, ObjectData, ResearchEvent, Run } from '../app/contracts';
import type { ProviderEntry } from '../app/settings';
import { api, initializeSession, uploadMaterial } from './api';
import { Modal, ReportText, Tag } from './ui';
import { Diagnostics, ExecutionLimits } from './diagnostics';

interface Project { id: string; name: string; archived: boolean; question?: string; discipline?: string; method?: string }
interface ConversationRecord { id: string; projectId: string; name: string }
interface Snapshot { project: Project; conversations: ConversationRecord[]; runs: Run[]; artifacts: ObjectData[]; sources: ObjectData[]; revisions: ObjectData[]; materials: ObjectData[] }
type Detail = Run & { events: ResearchEvent[] };
const ended = new Set(['succeeded', 'failed', 'cancelled', 'interrupted']);
const Conversation = lazy(() => import('./conversation').then(module => ({ default: module.Conversation })));
const stateNames: Record<string, [string, string]> = {
  queued: ['Queued', '排队中'], running: ['Running', '执行中'], awaiting_confirmation: ['Review the plan', '请确认计划'], awaiting_input: ['Your answer is needed', '等待回答'], awaiting_permission: ['Permission requested', '等待授权'], cancelling: ['Stopping the worker', '正在停止进程'], succeeded: ['Completed · review evidence', '已完成 · 请审阅证据'], failed: ['Failed · partial work saved', '失败 · 保留已保存内容'], cancelled: ['Cancelled · worker stopped', '已取消 · 进程已停止'], interrupted: ['Interrupted · retry available', '已中断 · 可以重试'],
};
export function App() {
  const [language, setLanguage] = useState(localStorage.getItem('openlab-language') === 'en' ? 'en' : 'zh');
  const zh = language === 'zh';
  const t = (en: string, cn: string) => zh ? cn : en;
  const [ready, setReady] = useState(false);
  const [connected, setConnected] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(localStorage.getItem('openlab-project') ?? '');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [conversationId, setConversationId] = useState('');
  const [runId, setRunId] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [providers, setProviders] = useState<ProviderEntry[]>([]);
  const [providerId, setProviderId] = useState('');
  const [integrations, setIntegrations] = useState<ObjectData[]>([]);
  const [skillId, setSkillId] = useState('builtin-literature');
  const [executionLimits, setExecutionLimits] = useState({ tokens: 30_000, turns: 12 });
  const [drafts, setDrafts] = useState<Record<string, string>>(() => { try { return JSON.parse(sessionStorage.getItem('openlab-drafts') ?? '{}'); } catch { return {}; } });
  const [modal, setModal] = useState<'project' | 'rename' | 'settings' | 'skills' | null>(null);
  const [drawer, setDrawer] = useState<'projects' | 'artifacts' | null>(null);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [paneWidth, setPaneWidth] = useState(410);
  const [tab, setTab] = useState<'reports' | 'sources' | 'materials'>('reports');
  const [sourceId, setSourceId] = useState('');
  const [revisionId, setRevisionId] = useState('');
  const [revision, setRevision] = useState<{ revision: ObjectData; content: string } | null>(null);
  const [materialId, setMaterialId] = useState('');
  const [streamKey, setStreamKey] = useState(0);
  const [highlightedStep, setHighlightedStep] = useState('');
  const inputFile = useRef<HTMLInputElement>(null);
  const importFile = useRef<HTMLInputElement>(null);
  const projectRef = useRef(projectId);
  const selectedRunRef = useRef(runId);
  const pendingRequest = useRef<{ fingerprint: string; key: string } | null>(null);
  projectRef.current = projectId; selectedRunRef.current = runId;
  const perform = async (action: () => Promise<void>) => { setBusy(true); setError(''); try { await action(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Operation failed'); } finally { setBusy(false); } };
  const refreshCatalog = async () => {
    const [list, configured, installed] = await Promise.all([api<Project[]>('/projects'), api<ProviderEntry[]>('/providers'), api<ObjectData[]>('/integrations')]);
    setProjects(list); setProviders(configured); setIntegrations(installed);
    setProviderId(current => configured.some(p => p.id === current) ? current : configured[0]?.id ?? '');
    setProjectId(current => list.some(p => p.id === current) ? current : list[0]?.id ?? '');
  };
  const refreshProject = async (selectedId = projectRef.current) => {
    if (!selectedId) return;
    const data = await api<Snapshot>(`/projects/${selectedId}`);
    if (projectRef.current !== selectedId) return;
    setSnapshot(data); setConnected(true);
    setConversationId(current => data.conversations.some(c => c.id === current) ? current : data.conversations[0]?.id ?? '');
  };
  useEffect(() => { void initializeSession().then(refreshCatalog).then(() => setReady(true)).catch(failure => { setError(failure.message); setConnected(false); }); }, []);
  useEffect(() => { document.documentElement.lang = language; localStorage.setItem('openlab-language', language); }, [language]);
  useEffect(() => { sessionStorage.setItem('openlab-drafts', JSON.stringify(drafts)); }, [drafts]);
  useEffect(() => {
    if (!ready || !projectId) return;
    localStorage.setItem('openlab-project', projectId);
    setSnapshot(null); setDetail(null); setRunId(''); setConversationId(''); setRevisionId(''); setRevision(null); setSourceId('');
    void refreshProject(projectId).catch(failure => { setError(failure.message); setConnected(false); });
  }, [ready, projectId]);
  useEffect(() => {
    if (!snapshot || !conversationId) return;
    const runs = snapshot.runs.filter(r => r.conversationId === conversationId);
    setRunId(current => runs.some(r => r.id === current) ? current : runs.at(-1)?.id ?? '');
  }, [conversationId, snapshot?.project.id, snapshot?.runs.length]);
  useEffect(() => {
    if (!runId) { setDetail(null); return; }
    let stopped = false;
    const update = async () => {
      try {
        const current = await api<Detail>(`/runs/${runId}`);
        if (stopped) return;
        setDetail(current); setConnected(true); await refreshProject();
      } catch { if (!stopped) setConnected(false); }
    };
    void update(); const timer = setInterval(() => { void update(); }, 1000);
    return () => { stopped = true; clearInterval(timer); };
  }, [runId]);
  useEffect(() => {
    if (!snapshot || revisionId) return;
    const latest = snapshot.artifacts.filter(a => !runId || a.runId === runId).at(-1);
    if (latest) setRevisionId(String(latest.latest));
  }, [snapshot, revisionId, runId]);
  useEffect(() => {
    if (!revisionId || !snapshot) { setRevision(null); return; }
    const record = snapshot.revisions.find(r => r.id === revisionId);
    if (!record) return;
    let current = true;
    void api<{ revision: ObjectData; content: string }>(`/artifacts/${String(record.artifactId)}/revisions/${revisionId}`).then(data => { if (current) setRevision(data); }).catch(failure => { if (current) setError(failure.message); });
    return () => { current = false; };
  }, [revisionId, snapshot?.project.id]);
  useEffect(() => {
    if (!highlightedStep) return;
    const timeout = setTimeout(() => { document.getElementById(`step-${highlightedStep}`)?.scrollIntoView({ block: 'center' }); }, 200);
    return () => clearTimeout(timeout);
  }, [highlightedStep, detail?.id]);
  const openSource = useCallback((source: string) => { setSourceId(source); setTab('sources'); if (matchMedia('(max-width: 1000px)').matches) setDrawer('artifacts'); }, []);
  const currentRun = detail?.id === runId ? detail : snapshot?.runs.find(r => r.id === runId);
  const active = snapshot?.runs.find(r => r.conversationId === conversationId && !ended.has(r.state));
  const draft = drafts[conversationId] ?? '';
  const selectConversation = (selected: string) => { setConversationId(selected); setRunId(''); setDetail(null); setRevisionId(''); setSourceId(''); setDrawer(null); };
  const selectRun = (run: Run) => { setConversationId(run.conversationId); setRunId(run.id); setDetail(null); setRevisionId(''); };
  const createConversation = async () => {
    if (!snapshot) return;
    const created = await api<ConversationRecord>(`/projects/${projectId}/conversations`, 'POST', { name: t(`Research ${snapshot.conversations.length + 1}`, `研究 ${snapshot.conversations.length + 1}`) });
    await refreshProject(); selectConversation(created.id);
  };
  const startRun = async (question = draft, parentRunId?: string) => {
    const fingerprint = JSON.stringify({ conversationId, question, providerId, skillId, parentRunId, executionLimits });
    if (pendingRequest.current?.fingerprint !== fingerprint) pendingRequest.current = { fingerprint, key: crypto.randomUUID() };
    const created = await api<Run>(`/conversations/${conversationId}/runs`, 'POST', { question, requestKey: pendingRequest.current.key, providerId, skillId, language, limits: executionLimits, ...(parentRunId ? { parentRunId } : {}) });
    pendingRequest.current = null;
    setDrafts(current => ({ ...current, [conversationId]: '' })); await refreshProject(); setRunId(created.id); setRevisionId(''); setStreamKey(value => value + 1);
  };
  const decision = async (interaction: Interaction, value: Json) => {
    await api(`/runs/${runId}/interactions/${interaction.id}/response`, 'POST', { version: interaction.version, value });
    setDetail(await api<Detail>(`/runs/${runId}`));
  };
  const navigateStep = (targetRun: string, step: string) => {
    const run = snapshot?.runs.find(r => r.id === targetRun);
    if (run) { selectRun(run); setHighlightedStep(step); setDrawer(null); }
  };
  const selectedSource = snapshot?.sources.find(source => source.id === sourceId || source.originalId === sourceId);
  const selectedMaterial = snapshot?.materials.find(material => material.id === materialId);
  const reportArtifact = snapshot?.artifacts.find(artifact => artifact.id === revision?.revision.artifactId);
  const events = detail?.id === runId ? detail.events : [];
  const usage = events.filter(event => event.kind === 'usage').at(-1)?.data;
  const stateLabel = (state: string) => stateNames[state]?.[zh ? 1 : 0] ?? state;

  const navigation = <>
    <div className="nav-brand"><img src="/brand/openlab-mark-inverse.svg" width="30" height="30" alt="" /><strong>OpenLab</strong><span>RESEARCH</span></div>
    <button className="new-project" onClick={() => { setModal('project'); setDrawer(null); }}>＋ {t('New project', '新建项目')}</button>
    <div className="section-label">{t('YOUR PROJECTS', '项目')}</div>
    <nav aria-label={t('Projects', '项目')} className="project-list">{projects.map(project => <button key={project.id} className={projectId === project.id ? 'selected' : ''} onClick={() => { setProjectId(project.id); setDrawer(null); }}><span className="folder-icon">⌑</span><span>{project.name}</span>{project.archived && <small>{t('Archived', '已归档')}</small>}</button>)}</nav>
    {snapshot && <><div className="section-label row">{t('CONVERSATIONS', '对话')}<button aria-label={t('New conversation', '新建对话')} disabled={snapshot.project.archived || busy} onClick={() => void perform(createConversation)}>＋</button></div>
      <nav aria-label={t('Conversations', '对话')} className="conversation-list">{snapshot.conversations.map(conversation => <button key={conversation.id} className={conversation.id === conversationId ? 'selected' : ''} onClick={() => selectConversation(conversation.id)}>{conversation.name}</button>)}</nav>
      <div className="section-label">{t('RUN HISTORY', '运行历史')}</div><nav aria-label={t('Run history', '运行历史')} className="run-list">{snapshot.runs.filter(run => run.conversationId === conversationId).toReversed().map((run, index) => <button key={run.id} className={runId === run.id ? 'selected' : ''} onClick={() => { selectRun(run); setDrawer(null); }}><span className={'dot ' + run.state} /><span>{t('Run', '运行')} {snapshot.runs.filter(r => r.conversationId === conversationId).length - index}<small>{stateLabel(run.state)}</small></span></button>)}</nav></>}
    <footer className="nav-footer"><button onClick={() => { setModal('skills'); setDrawer(null); }}>◇ {t('Skills & tools', '技能与工具')}</button><button onClick={() => { setModal('settings'); setDrawer(null); }}>⚙ {t('Model & settings', '模型与设置')}</button><div className="local-note"><span className="dot succeeded" />{t('Local workspace · Your records', '本地工作区 · 数据由你持有')}</div></footer>
  </>;
  const artifactsPane = <>
    <div className="pane-title"><div><span className="eyebrow">{t('RESEARCH RECORD', '研究档案')}</span><h2>{t('Artifacts & evidence', '产物与证据')}</h2></div>{snapshot && <a className="icon-button" href={`/api/v1/projects/${projectId}/export`} aria-label={t('Export project', '导出项目')}>↓</a>}</div>
    <div className="tabs" role="tablist" aria-label={t('Research record', '研究档案')}>{(['reports', 'sources', 'materials'] as const).map(value => <button key={value} role="tab" aria-selected={tab === value} onClick={() => setTab(value)}>{value === 'reports' ? t('Reports', '报告') : value === 'sources' ? t('Sources', '来源') : t('Materials', '附件')}<span>{value === 'reports' ? snapshot?.artifacts.length ?? 0 : value === 'sources' ? snapshot?.sources.length ?? 0 : snapshot?.materials.length ?? 0}</span></button>)}</div>
    <div className="pane-content" role="tabpanel">
      {tab === 'reports' && <>{!snapshot?.artifacts.length ? <div className="empty-pane"><span className="empty-icon">▤</span><h3>{t('A place for your findings', '留存每一步研究成果')}</h3><p>{t('Saved drafts and report revisions will appear here, with their sources and producing steps.', '已保存的草稿、报告修订、引用来源和生成步骤会在这里汇集。')}</p></div> : <>
        <label className="field">{t('Report revision', '报告修订')}<select value={revisionId} onChange={event => setRevisionId(event.target.value)}>{snapshot.revisions.map((record, index) => <option key={String(record.id)} value={String(record.id)}>{record.committed ? t('Committed', '已提交') : t('Draft · incomplete', '草稿 · 未完成')} {index + 1} · {String(record.createdAt).slice(11, 19)}</option>)}</select></label>
        {reportArtifact && reportArtifact.latest !== revisionId && <button className="notice" onClick={() => setRevisionId(String(reportArtifact.latest))}>{t('A newer saved version is available →', '有更新的已保存版本 →')}</button>}
        {revision && <><div className="revision-meta"><Tag tone={revision.revision.committed ? 'green' : 'amber'}>{revision.revision.committed ? t('Immutable revision', '不可变修订') : t('Saved draft · incomplete', '已保存草稿 · 未完成')}</Tag><button className="link" onClick={() => navigateStep(String(revision.revision.runId), String(revision.revision.stepId))}>{t('Producing step ↗', '查看生成步骤 ↗')}</button><small title={String(revision.revision.hash)}>SHA-256 {String(revision.revision.hash).slice(0, 12)}…</small></div><ReportText onSource={openSource}>{revision.content}</ReportText><button onClick={() => {
          const url = URL.createObjectURL(new Blob([revision.content], { type: 'text/markdown' })); const link = document.createElement('a'); link.href = url; link.download = `openlab-${revisionId}.md`; link.click(); URL.revokeObjectURL(url);
        }}>{t('Download Markdown', '下载 Markdown')}</button></>}
      </>}</>}
      {tab === 'sources' && <>{!snapshot?.sources.length && <div className="empty-pane"><span className="empty-icon">⌕</span><h3>{t('Follow the evidence', '追溯每一条证据')}</h3><p>{t('Retrieved records keep original titles, verification scope and access limitations.', '检索记录保留原始标题、核实范围与访问限制。')}</p></div>}
        {sourceId && !selectedSource && <p className="notice">{t('This citation is not present in the selected project.', '当前项目中找不到此引用。')}</p>}
        {snapshot?.sources.map(source => <button className={'source-card ' + (selectedSource?.id === source.id ? 'active' : '')} key={String(source.id)} onClick={() => setSourceId(String(source.id))}><span>{String(source.title)}</span><small>{String(source.provider)} · {String(source.verification) === 'metadata_verified' ? t('Metadata only', '仅元数据') : t('Page content accessed', '已读取页面内容')}</small></button>)}
        {selectedSource && <section className="source-detail"><h3>{String(selectedSource.title)}</h3><Tag>{String(selectedSource.verification) === 'metadata_verified' ? t('Metadata verified', '元数据已核实') : t('Fetched page content', '已获取页面内容')}</Tag><p className="notice">{t('Model interpretation is unchecked. A metadata record or landing page does not verify the paper’s claims.', '模型解读未经核实。元数据或论文介绍页面不能证明论文支持某个论点。')}</p><dl><dt>DOI</dt><dd>{String(selectedSource.doi)}</dd><dt>{t('Full text', '全文')}</dt><dd>{String(selectedSource.fullText)}</dd></dl><a href={String(selectedSource.url)} target="_blank" rel="noreferrer">{t('Open publisher / DOI ↗', '打开出版方 / DOI ↗')}</a>
          {selectedSource.contentScope && <p>{String(selectedSource.contentScope)}</p>}{selectedSource.content && <details><summary>{t('Fetched text', '已读取文本')}</summary><pre className="source-text">{String(selectedSource.content)}</pre></details>}
          <h4>{t('Provenance', '来源记录')}</h4>{(Array.isArray(selectedSource.accesses) ? selectedSource.accesses : []).map((value, index) => { const access = value as ObjectData; return <button className="link block" key={index} onClick={() => navigateStep(String(access.runId), String(access.stepId))}>{String(access.accessedAt).slice(0, 19)} · {t('Open step', '查看步骤')} ↗</button>; })}</section>}
      </>}
      {tab === 'materials' && <><p className="muted">{t('Copied into this project. Uploaded code and active HTML are never executed.', '附件会复制到当前项目。上传的代码和活动 HTML 不会执行。')}</p><button disabled={!projectId || busy} onClick={() => inputFile.current?.click()}>＋ {t('Attach material', '添加附件')}</button>{snapshot?.materials.map(material => <button className="source-card" key={String(material.id)} onClick={() => setMaterialId(String(material.id))}>{String(material.name)}<small>{String(material.contentType)} · {Math.ceil(Number(material.bytes) / 1024)} KB</small></button>)}
        {selectedMaterial && <section><h3>{String(selectedMaterial.name)}</h3>{typeof selectedMaterial.preview === 'string' ? <pre className="source-text">{selectedMaterial.preview}</pre> : ['image/png', 'image/jpeg'].includes(String(selectedMaterial.contentType)) ? <MaterialImage materialId={String(selectedMaterial.id)} name={String(selectedMaterial.name)} /> : <p>{t('Preview unavailable. Download to open with a suitable application.', '暂不支持预览，可下载后使用相应应用打开。')}</p>}<a href={`/api/v1/materials/${String(selectedMaterial.id)}`}>{t('Download original', '下载原文件')}</a></section>}
      </>}
    </div>
  </>;

  if (!ready) return <main className="launch"><img src="/brand/openlab-mark.svg" width="64" alt="OpenLab" /><h1>OpenLab</h1><p>{error || t('Connecting to your local workspace…', '正在连接本地工作区…')}</p>{error && <button onClick={() => location.reload()}>{t('Try again', '重试')}</button>}</main>;
  return <div className={'workspace ' + (navCollapsed ? 'nav-collapsed' : '')} style={{ '--artifact-width': `${paneWidth}px` } as CSSProperties}>
    <aside className="sidebar">{navigation}</aside>
    <main className="main-panel">
      <header className="topbar"><button className="desktop-toggle" aria-label={t('Toggle navigation', '收起或展开导航')} aria-expanded={!navCollapsed} onClick={() => setNavCollapsed(value => !value)}>☰</button><button className="mobile-nav" onClick={() => setDrawer('projects')}>{t('Projects', '项目')}</button><div className="breadcrumb"><span>{snapshot?.project.name ?? 'OpenLab'}</span><span>/</span><strong>{t('Research workspace', '研究工作区')}</strong></div><span className={'connection ' + (connected ? '' : 'offline')}><span className="dot" />{connected ? t('Local · connected', '本地 · 已连接') : t('Disconnected', '连接已断开')}</span><button className="language" onClick={() => setLanguage(zh ? 'en' : 'zh')}>{zh ? 'EN' : '中文'}</button><button className="mobile-artifacts" onClick={() => setDrawer('artifacts')}>{t('Artifacts', '产物')}</button></header>
      {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label={t('Dismiss error', '关闭错误提示')}>×</button></div>}
      {!connected && <div className="notice" role="status">{t('Execution may continue. Reconnect to read the recorded state.', '执行可能仍在继续。重新连接以读取已记录的状态。')}<button onClick={() => void perform(async () => { await refreshCatalog(); await refreshProject(); setStreamKey(value => value + 1); setConnected(true); })}>{t('Reconnect', '重新连接')}</button></div>}
      <div className="research-header"><div><span className="eyebrow">{t('OPEN RESEARCH, TRACEABLE EVIDENCE', '开放研究 · 证据可循')}</span><h1>{currentRun ? t('Research workspace', '研究工作台') : t('Start with a question.', '从一个问题开始。')}</h1><p>{t('Keep your question, process and evidence in one place.', '让研究问题、执行过程与来源证据始终相连。')}</p></div>{snapshot && <button className="subtle" onClick={() => setModal('rename')}>{t('Project options', '项目选项')}</button>}</div>
      <section className="conversation-panel" aria-label={t('Conversation and execution', '对话与执行')}>
        {currentRun ? <><div className="run-status" role="status" aria-live="polite"><Tag tone={ended.has(currentRun.state) ? currentRun.state === 'succeeded' ? 'green' : 'amber' : 'teal'}>{stateLabel(currentRun.state)}</Tag><span>{currentRun.phase === 'planning' ? t('Planning', '计划阶段') : currentRun.phase === 'research' ? t('Research', '研究阶段') : t('Recorded', '已记录')}</span><span className="spacer" /><button className="link" onClick={() => setStreamKey(value => value + 1)}>{t('Reload conversation', '重载对话')}</button>{!ended.has(currentRun.state) && <button disabled={!connected || currentRun.state === 'cancelling'} onClick={() => void perform(async () => { await api(`/runs/${runId}/cancel`, 'POST', {}); setDetail(await api<Detail>(`/runs/${runId}`)); })}>{t('Stop run', '停止运行')}</button>}</div>
          <Suspense fallback={<p role="status">{t('Loading conversation…', '正在加载对话…')}</p>}><Conversation key={`${currentRun.id}:${streamKey}`} run={currentRun} onSource={openSource} /></Suspense>
          {currentRun.error && <p className="notice">{currentRun.error}</p>}
          {currentRun.interaction && <InteractionForm key={currentRun.interaction.id} interaction={currentRun.interaction} disabled={!connected || busy} zh={zh} submit={value => void perform(() => decision(currentRun.interaction!, value))} />}
          <details className="execution-record" open={Boolean(highlightedStep)}><summary>{t('Execution record', '执行记录')} · {events.filter(event => event.kind === 'step_finished').length} {t('model steps completed', '个模型步骤已完成')} · {usage ? `${String(usage.totalReported ?? '?')} ${t('reported tokens', '已报告 token')}${usage.unknownUsage ? t(' + unknown usage', ' + 部分用量未知') : ''}` : t('Usage unknown', '用量未知')}</summary><ol>{events.filter(event => ['step_started', 'tool_intent', 'tool_result', 'interaction_answered', 'artifact_saved', 'run_finished'].includes(event.kind)).map(event => <li key={event.seq} id={event.data.stepId && ['step_started', 'tool_intent'].includes(event.kind) ? `step-${String(event.data.stepId)}` : undefined} className={highlightedStep === event.data.stepId ? 'highlighted-step' : ''}><time>{event.at.slice(11, 19)}</time><strong>{String(event.data.label ?? event.data.name ?? (event.kind === 'artifact_saved' ? t('Report saved', '报告已保存') : event.kind === 'tool_result' ? t('Tool result saved', '工具结果已保存') : event.kind === 'interaction_answered' ? t('Decision recorded', '已记录决定') : stateLabel(String(event.data.state))))}</strong><details><summary>{t('Details', '详情')}</summary><pre>{JSON.stringify(event.data, null, 2)}</pre></details></li>)}</ol></details>
          {ended.has(currentRun.state) && !active && <button className="retry" disabled={busy || !connected || !providerId} onClick={() => void perform(() => startRun(currentRun.question, currentRun.id))}>{t('Start a linked retry', '创建关联重试')}</button>}
        </> : <div className="welcome"><div className="research-symbol">✳</div><h2>{t('What would you like to investigate?', '你想探索什么问题？')}</h2><p>{t('Choose a research question. Review a plan, follow the sources, and build a record you can keep.', '提出研究问题，确认研究计划，沿着来源追溯证据，留下可持有的研究档案。')}</p><div className="suggestions">{[t('How does the minimum wage affect employment?', '最低工资如何影响就业？'), t('What themes appear in Hamlet scholarship?', '《哈姆雷特》文本研究有哪些主题？')].map(question => <button key={question} onClick={() => setDrafts(current => ({ ...current, [conversationId]: question }))}>{question}<span>↗</span></button>)}</div></div>}
      </section>
      <form className="composer" onSubmit={event => { event.preventDefault(); void perform(() => startRun()); }}><label className="sr-only" htmlFor="research-question">{t('Research question', '研究问题')}</label><textarea id="research-question" value={draft} onChange={event => setDrafts(current => ({ ...current, [conversationId]: event.target.value }))} placeholder={t('Ask a research question…', '输入一个研究问题…')} rows={3} disabled={!conversationId || snapshot?.project.archived} /><div className="composer-controls"><button type="button" className="icon-button" aria-label={t('Attach material', '添加附件')} disabled={!projectId || busy} onClick={() => inputFile.current?.click()}>＋</button><label className="sr-only" htmlFor="model-selection">{t('Model', '模型')}</label><select id="model-selection" value={providerId} onChange={event => setProviderId(event.target.value)}><option value="">{t('Configure a model', '配置模型')}</option>{providers.map(provider => <option key={provider.id} value={provider.id}>{provider.name} · {provider.model}{provider.testedAt ? '' : t(' · needs test', ' · 待测试')}</option>)}</select><label className="sr-only" htmlFor="skill-selection">{t('Skill', '技能')}</label><select id="skill-selection" value={skillId} onChange={event => setSkillId(event.target.value)}>{integrations.filter(skill => skill.enabled).map(skill => <option key={String(skill.id)} value={String(skill.id)}>{String(skill.name)}</option>)}</select><span className="spacer" /><button className="primary" type="submit" disabled={!draft.trim() || !providerId || !conversationId || busy || Boolean(active) || !connected || snapshot?.project.archived}>{t('Create plan', '生成计划')} <span>↑</span></button></div><small>{active ? t('This conversation has an active run. Your next question stays as an unsent draft.', '当前对话有正在执行的运行，后续问题保留为未发送草稿。') : t('Planning uses your model. Research tools wait for your confirmation.', '生成计划会调用模型。研究工具会等待你的确认。')}</small></form>
      <footer className="workspace-footer"><span>{t('Your projects, your evidence.', '项目与证据，由你持有。')}</span><button className="link" onClick={() => importFile.current?.click()}>{t('Import archive', '导入档案')}</button><a href="/api/v1/openapi" target="_blank" rel="noreferrer">API</a></footer>
    </main>
    <div className="pane-divider" role="separator" tabIndex={0} aria-label={t('Resize artifact pane', '调整产物栏宽度')} aria-orientation="vertical" aria-valuemin={300} aria-valuemax={640} aria-valuenow={paneWidth} onKeyDown={event => { if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); setPaneWidth(value => Math.max(300, Math.min(640, value + (event.key === 'ArrowLeft' ? 20 : -20)))); } }} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) setPaneWidth(Math.max(300, Math.min(640, innerWidth - event.clientX))); }} onPointerUp={event => event.currentTarget.releasePointerCapture(event.pointerId)} />
    <aside className="artifact-pane">{artifactsPane}</aside>
    <input className="sr-only" type="file" aria-label={t('Attach material file', '选择附件文件')} ref={inputFile} tabIndex={-1} onChange={event => { const file = event.target.files?.[0]; if (file) void perform(async () => { await uploadMaterial(projectId, file); await refreshProject(); setTab('materials'); }); event.target.value = ''; }} />
    <input className="sr-only" type="file" aria-label={t('Import project archive', '选择项目档案')} ref={importFile} tabIndex={-1} accept=".json,application/json" onChange={event => { const file = event.target.files?.[0]; if (file) void perform(async () => { const imported = await api<{ projectId: string }>('/import', 'POST', JSON.parse(await file.text())); await refreshCatalog(); setProjectId(imported.projectId); }); event.target.value = ''; }} />
    {drawer && <Modal title={drawer === 'projects' ? t('Projects & history', '项目与历史') : t('Artifacts & evidence', '产物与证据')} close={() => setDrawer(null)} wide><div className={drawer === 'projects' ? 'drawer-navigation' : 'drawer-artifacts'}>{drawer === 'projects' ? navigation : artifactsPane}</div></Modal>}
    {(modal === 'project' || modal === 'rename') && <Modal title={modal === 'project' ? t('New research project', '新建研究项目') : t('Project options', '项目选项')} close={() => setModal(null)}><form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); void perform(async () => {
      if (modal === 'project') { const project = await api<Project>('/projects', 'POST', { name: String(data.get('name')) }); await api(`/projects/${project.id}/conversations`, 'POST', { name: t('Research 1', '研究 1') }); await refreshCatalog(); setProjectId(project.id); }
      else { await api(`/projects/${projectId}`, 'PATCH', { name: String(data.get('name')), question: String(data.get('question')), discipline: String(data.get('discipline')), method: String(data.get('method')) }); await refreshCatalog(); await refreshProject(); }
      setModal(null);
    }); }}><label className="field">{t('Project name', '项目名称')}<input name="name" required maxLength={200} defaultValue={modal === 'rename' ? snapshot?.project.name : ''} autoFocus /></label>{modal === 'rename' && <><label className="field">{t('Project research question', '项目研究问题')}<textarea name="question" defaultValue={snapshot?.project.question ?? ''} maxLength={10000} /></label><div className="form-grid"><label className="field">{t('Discipline', '学科')}<input name="discipline" defaultValue={snapshot?.project.discipline ?? ''} maxLength={10000} /></label><label className="field">{t('Method', '方法')}<input name="method" defaultValue={snapshot?.project.method ?? ''} maxLength={10000} /></label></div></>}<button className="primary" disabled={busy}>{t('Save project', '保存项目')}</button></form>{modal === 'rename' && <button className="archive-button" disabled={busy} onClick={() => void perform(async () => { await api(`/projects/${projectId}`, 'PATCH', { archived: !snapshot?.project.archived }); await refreshCatalog(); await refreshProject(); setModal(null); })}>{snapshot?.project.archived ? t('Reopen project', '重新打开项目') : t('Archive project', '归档项目')}</button>}</Modal>}
    {modal === 'settings' && <Modal title={t('Model & settings', '模型与设置')} close={() => setModal(null)} wide><Diagnostics zh={zh} /><ExecutionLimits zh={zh} value={executionLimits} change={setExecutionLimits} /><p className="muted">{t('Credentials stay on the local service, protected by your Windows account. Connection tests use model tokens.', '凭据保存在本地服务中，由当前 Windows 账户保护。连接测试会使用模型 token。')}</p>{providers.map(provider => <div className="provider-card" key={provider.id}><div><strong>{provider.name}</strong><p>{provider.model} · {provider.baseUrl}</p><Tag tone={provider.testedAt ? 'green' : 'amber'}>{provider.testedAt ? t('Streaming & tools verified', '已验证流式输出和工具调用') : t('Needs capability test', '尚需能力测试')}</Tag></div><button disabled={busy} onClick={() => void perform(async () => { await api(`/providers/${provider.id}/test`, 'POST', {}); await refreshCatalog(); })}>{t('Test', '测试')}</button><button disabled={busy} onClick={() => void perform(async () => { await api(`/providers/${provider.id}`, 'DELETE'); await refreshCatalog(); })}>{t('Remove', '移除')}</button></div>)}<h3>{t('Add a provider', '添加模型服务')}</h3><form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); void perform(async () => { try { await api('/providers', 'POST', { name: String(data.get('name')), baseUrl: String(data.get('baseUrl')), model: String(data.get('model')), apiKey: String(data.get('apiKey')), thinkingDisabled: data.get('thinkingDisabled') === 'on' }); await refreshCatalog(); form.reset(); } finally { const field = form.elements.namedItem('apiKey') as HTMLInputElement; field.value = ''; } }); }}><div className="form-grid"><label className="field">{t('Provider name', '服务名称')}<input name="name" required placeholder="DeepSeek" /></label><label className="field">{t('Model ID', '模型 ID')}<input name="model" required defaultValue="deepseek-flash" /></label></div><label className="field">{t('Base URL', '接口基础地址')}<input name="baseUrl" type="url" required defaultValue="https://api.deepseek.com" /></label><label className="field">API key<input name="apiKey" type="password" required autoComplete="new-password" spellCheck={false} /></label><p className="muted">{t('This preview uses DeepSeek in non-thinking mode. Other compatible providers use their standard endpoint settings.', '当前预览使用 DeepSeek 非思考模式。其他兼容服务使用其标准接口设置。')}</p><button className="primary" disabled={busy}>{t('Save protected credential', '加密保存凭据')}</button></form></Modal>}
    {modal === 'skills' && <Modal title={t('Skills & tools', '技能与工具')} close={() => setModal(null)} wide><p>{t('Research tools: scholarly metadata search, scoped public-page reading, structured questions and report saving. No shell or arbitrary code execution.', '研究工具：学术元数据检索、经授权的公开页面读取、结构化提问和报告保存。当前不提供终端或任意代码执行。')}</p>{integrations.map(skill => <div className="skill-card" key={String(skill.id)}><h3>{String(skill.name)}</h3><Tag>{String(skill.maturity)}{skill.enabled ? t(' · enabled', ' · 已启用') : t(' · inert installation', ' · 仅安装')}</Tag><dl><dt>{t('Source', '来源')}</dt><dd>{String(skill.source)}</dd><dt>{t('Revision', '版本')}</dt><dd className="mono">{String(skill.revision)}</dd></dl><details><summary>{t('License & files', '许可与文件')}</summary><pre>{String(skill.license)}</pre><p>{t('Skill declarations (including authors, file licenses and requirements) are upstream claims; compatibility remains unverified unless recorded.', '技能声明中的作者、文件许可和要求来自上游，未经记录的兼容性仍未验证。')}</p><pre>{JSON.stringify(skill.declarations ?? [], null, 2)}</pre><pre>{JSON.stringify(skill.files ?? skill.requirements ?? [], null, 2)}</pre></details>{!skill.enabled && <button disabled={busy} onClick={() => void perform(async () => { await api(`/integrations/${String(skill.id)}/enable`, 'POST', { reviewed: true }); await refreshCatalog(); })}>{t('I reviewed source, license and requirements · Enable', '已审阅来源、许可和要求 · 启用')}</button>}</div>)}<h3>{t('Install a pinned skill repository', '安装固定版本的技能仓库')}</h3><form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); void perform(async () => { await api('/integrations', 'POST', { source: String(data.get('source')), revision: String(data.get('revision')) }); await refreshCatalog(); }); }}><label className="field">{t('Public HTTPS Git URL', '公开 HTTPS Git 地址')}<input name="source" type="url" required placeholder="https://github.com/owner/repository.git" /></label><label className="field">{t('Exact Git commit (40 characters)', '完整 Git 提交号（40 位）')}<input name="revision" required pattern="[a-fA-F0-9]{40}" /></label><button className="primary" disabled={busy}>{t('Install inert files', '安装文件')}</button></form></Modal>}
  </div>;
}
function MaterialImage({ materialId, name }: { materialId: string; name: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => { let blobUrl = ''; let active = true; void fetch(`/api/v1/materials/${materialId}`).then(response => response.blob()).then(blob => { if (active) { blobUrl = URL.createObjectURL(blob); setUrl(blobUrl); } }); return () => { active = false; if (blobUrl) URL.revokeObjectURL(blobUrl); }; }, [materialId]);
  return url ? <img className="material-preview" src={url} alt={name} /> : <p>Loading… / 正在加载…</p>;
}
function InteractionForm({ interaction, disabled, zh, submit }: { interaction: Interaction; disabled: boolean; zh: boolean; submit: (value: Json) => void }) {
  const t = (en: string, cn: string) => zh ? cn : en;
  return <section className="interaction"><span className="eyebrow">{interaction.kind === 'confirmation' ? t('REVIEW BEFORE RESEARCH', '开始研究前请审阅') : interaction.kind === 'permission' ? t('SCOPED ACCESS REQUEST', '具体访问授权') : t('YOUR INPUT', '请补充信息')}</span><ReportText>{interaction.prompt}</ReportText>{interaction.scope && <details><summary>{t('Requested scope', '请求范围')}</summary><pre>{JSON.stringify(interaction.scope, null, 2)}</pre></details>}
    {interaction.input === 'boolean' ? <div className="row"><button className="primary" disabled={disabled} onClick={() => submit(true)}>{interaction.kind === 'confirmation' ? t('Confirm plan & begin', '确认计划并开始') : t('Allow this action', '允许这项操作')}</button><button disabled={disabled} onClick={() => submit(false)}>{t('Deny', '拒绝')}</button></div> : <form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); submit(interaction.input === 'multiple_choice' ? data.getAll('answer').map(String) : String(data.get('answer'))); }}>
      {interaction.input === 'text' ? <label className="field">{t('Your answer', '你的回答')}<textarea name="answer" required rows={3} maxLength={10_000} /></label> : <fieldset><legend>{t('Select an answer', '选择回答')}</legend>{interaction.options?.map(option => <label className="check" key={option}><input name="answer" type={interaction.input === 'multiple_choice' ? 'checkbox' : 'radio'} value={option} required={interaction.input === 'single_choice'} />{option}</label>)}</fieldset>}<button className="primary" disabled={disabled}>{t('Submit answer', '提交回答')}</button></form>}
  </section>;
}
