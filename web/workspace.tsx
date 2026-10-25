import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, FormEvent } from 'react';
import type { Interaction, Json, ObjectData, ResearchEvent, Run } from '../app/contracts';
import type { ProviderEntry } from '../app/settings';
import { api, ApiError, initializeSession, uploadMaterial } from './api';
import { PluginView } from './plugins/registry';
import type { PluginHost } from './plugins/registry';
import { DocumentPanel } from './document-panel';
import { PluginSettings } from './plugin-settings';
import { defaultPluginState, builtinPlugins } from '../app/plugin-contracts';
import type { PluginCatalog } from '../app/plugin-contracts';
import { ConnectionScreen } from './connection';
import { Modal, ReportText, Tag } from './ui';
import { Diagnostics, ExecutionLimits } from './diagnostics';
import { Select, Popover } from './controls';
import { Plan, PlanHeader, PlanContent, PlanFooter } from './components/ai-elements/plan';
import * as Tabs from '@radix-ui/react-tabs';
import { ArrowUp, ArrowUpRight, BookOpen, CheckCircle2, ChevronDown, Download, Ellipsis, FileText, Folder, History, Import, LoaderCircle, MessageSquare, PanelLeftClose, PanelLeftOpen, PanelRight, Plus, Search, Settings2, ShieldCheck, SlidersHorizontal, Square, X } from 'lucide-react';

interface Project { id: string; name: string; archived: boolean; question?: string; discipline?: string; method?: string }
interface ConversationRecord { id: string; projectId: string; name: string; nameSource?: string }
interface Snapshot { builds?: ObjectData[]; project: Project; conversations: ConversationRecord[]; runs: Run[]; artifacts: ObjectData[]; sources: ObjectData[]; revisions: ObjectData[]; materials: ObjectData[] }
type Detail = Run & { events: ResearchEvent[] };
const ended = new Set(['succeeded', 'failed', 'cancelled', 'interrupted']);

const stateNames: Record<string, [string, string]> = {
  queued: ['Queued', '排队中'], running: ['Running', '执行中'], awaiting_confirmation: ['Review the plan', '请确认计划'], awaiting_input: ['Your answer is needed', '等待回答'], awaiting_permission: ['Permission requested', '等待授权'], cancelling: ['Stopping the worker', '正在停止进程'], succeeded: ['Completed · review evidence', '已完成 · 请审阅证据'], failed: ['Failed · partial work saved', '失败 · 保留已保存内容'], cancelled: ['Cancelled · worker stopped', '已取消 · 进程已停止'], interrupted: ['Interrupted · retry available', '已中断 · 可以重试'],
};
function skillRequirements(skill: ObjectData): string[] {
  const declared = Array.isArray(skill.declarations) ? skill.declarations.flatMap(value => { const metadata = (value as ObjectData).metadata as ObjectData | undefined; const requirements = metadata?.requirements ?? metadata?.requires ?? metadata?.compatibility; return Array.isArray(requirements) ? requirements : requirements === undefined ? [] : [requirements]; }) : [];
  return [...new Set([...(Array.isArray(skill.requirements) ? skill.requirements : []), ...declared].map(value => typeof value === 'string' ? value : JSON.stringify(value)))];
}
export function App() {
  const [language, setLanguage] = useState(localStorage.getItem('openlab-language') === 'en' ? 'en' : 'zh');
  const zh = language === 'zh';
  const t = (en: string, cn: string) => zh ? cn : en;
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState<ApiError | null>(null);
  const [connecting, setConnecting] = useState(true);
  const [connected, setConnected] = useState(true);
  const [error, setError] = useState('');
  const [editingProvider, setEditingProvider] = useState('');
  const [modalError, setModalError] = useState('');
  const [busy, setBusy] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(localStorage.getItem('openlab-project') ?? '');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [conversationId, setConversationId] = useState('');
  const [runId, setRunId] = useState('');
  const [navQuery, setNavQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [focusedRunId, setFocusedRunId] = useState('');
  const [historyMessages, setHistoryMessages] = useState<{ conversationId: string; messages: ObjectData[]; nextCursor?: string; hasMore?: boolean } | null>(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const chatScroll = useRef<HTMLElement>(null);
  const nearBottom = useRef(true);
  const loadingOlder = useRef(false);
  const [artifactMount] = useState(() => { const node = document.createElement('div'); node.style.display = 'contents'; return node; });
  const attachArtifacts = useCallback((node: HTMLDivElement | HTMLElement | null) => { if (node) node.appendChild(artifactMount); }, [artifactMount]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [providers, setProviders] = useState<ProviderEntry[]>([]);
  const [providerId, setProviderId] = useState('');
  const [pluginCatalog, setPluginCatalog] = useState<PluginCatalog>({ manifests: builtinPlugins, state: defaultPluginState() });
  const [integrations, setIntegrations] = useState<ObjectData[]>([]);
  const [skillId, setSkillId] = useState('builtin-literature');
  const [mode, setMode] = useState<'agent' | 'metadata'>('agent');
  const [executionLimits, setExecutionLimits] = useState({ tokens: 30_000, turns: 12 });
  const [drafts, setDrafts] = useState<Record<string, string>>(() => { try { return JSON.parse(sessionStorage.getItem('openlab-drafts') ?? '{}'); } catch { return {}; } });
  const [modal, setModal] = useState<'project' | 'rename' | 'conversation' | 'plugins' | 'settings' | 'skills' | null>(null);
  useEffect(() => { setModalError(''); }, [modal]);
  const [drawer, setDrawer] = useState<'projects' | 'artifacts' | null>(null);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [paneWidth, setPaneWidth] = useState(() => innerWidth < 1440 ? 360 : 400);
  const [viewportWidth, setViewportWidth] = useState(innerWidth);
  const [panePreferences, setPanePreferences] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem('openlab-artifact-panes') ?? '{}'); } catch { return {}; } });
  const conversationRef = useRef(conversationId);
  conversationRef.current = conversationId;
  const composerInput = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);
  const [tab, setTab] = useState<'reports' | 'sources' | 'materials'>('reports');
  const citationRecord = useRef<ObjectData | undefined>(undefined);
  const [citationTarget, setCitationTarget] = useState<ObjectData | undefined>(undefined);
  const [sourceId, setSourceId] = useState('');
  const [revisionId, setRevisionId] = useState('');
  const [revision, setRevision] = useState<{ revision: ObjectData; content: string } | null>(null);
  const [reportContextDisabled, setReportContextDisabled] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem('openlab-report-context-disabled') ?? '{}'); } catch { return {}; } });
  useEffect(() => { localStorage.setItem('openlab-report-context-disabled', JSON.stringify(reportContextDisabled)); }, [reportContextDisabled]);
  const [materialSelections, setMaterialSelections] = useState<Record<string, string[]>>(() => { try { return JSON.parse(localStorage.getItem('openlab-material-selections') ?? '{}'); } catch { return {}; } });
  const [downloadStatus, setDownloadStatus] = useState('');
  useEffect(() => { localStorage.setItem('openlab-material-selections', JSON.stringify(materialSelections)); }, [materialSelections]);
  useEffect(() => { setDownloadStatus(''); }, [revisionId]);
  const [materialId, setMaterialId] = useState('');
  const [streamKey, setStreamKey] = useState(0);
  const [highlightedStep, setHighlightedStep] = useState('');
  const inputFile = useRef<HTMLInputElement>(null);
  const importFile = useRef<HTMLInputElement>(null);
  const projectRef = useRef(projectId);
  const selectedRunRef = useRef(runId);
  const pendingRequest = useRef<{ fingerprint: string; key: string } | null>(null);
  projectRef.current = projectId; selectedRunRef.current = runId;
  const handleError = (failure: unknown) => {
    const message = failure instanceof Error ? failure.message : 'Operation failed';
    if (modal) setModalError(message); else setError(message);
    if (failure instanceof ApiError && failure.status === 401) { setSessionError(failure); setReady(false); }
    if (failure instanceof ApiError && failure.kind === 'offline') setConnected(false);
  };
  const perform = async (action: () => Promise<void>) => { setBusy(true); setError(''); setModalError(''); try { await action(); } catch (failure) { handleError(failure); } finally { setBusy(false); } };
  const refreshCatalog = async () => {
    const [list, configured, installed, plugins] = await Promise.all([api<Project[]>('/projects'), api<ProviderEntry[]>('/providers'), api<ObjectData[]>('/integrations'), api<PluginCatalog>('/plugins')]);
    setPluginCatalog(plugins);
    setProjects(list); setProviders(configured); setIntegrations(installed);
    setSkillId(current => installed.some(skill => skill.id === current && skill.enabled) ? current : 'builtin-literature');
    setProviderId(current => configured.some(p => p.id === current) ? current : configured[0]?.id ?? '');
    setProjectId(current => list.some(p => p.id === current) ? current : list[0]?.id ?? '');
  };
  const refreshProject = async (selectedId = projectRef.current) => {
    if (!selectedId) return;
    const data = await api<Snapshot>(`/projects/${selectedId}`);
    if (projectRef.current !== selectedId) return;
    setSnapshot(data); setConnected(true);
    setConversationId(current => data.conversations.some(c => c.id === current) ? current : data.conversations.find(c => c.id === localStorage.getItem('openlab-conversation-' + selectedId))?.id ?? data.conversations[0]?.id ?? '');
  };
  const connect = async (link?: string) => {
    setConnecting(true); setSessionError(null);
    try { await initializeSession(link); await refreshCatalog(); setConnected(true); setReady(true); }
    catch (failure) { setSessionError(failure instanceof ApiError ? failure : new ApiError('Connection failed', 0, 'offline')); setConnected(false); }
    finally { setConnecting(false); }
  };
  useEffect(() => { void connect(); }, []);
  useEffect(() => { document.documentElement.lang = language; localStorage.setItem('openlab-language', language); }, [language]);
  useEffect(() => { sessionStorage.setItem('openlab-drafts', JSON.stringify(drafts)); }, [drafts]);
  useEffect(() => { localStorage.setItem('openlab-artifact-panes', JSON.stringify(panePreferences)); }, [panePreferences]);
  useEffect(() => { const resize = () => setViewportWidth(innerWidth); addEventListener('resize', resize); return () => removeEventListener('resize', resize); }, []);
  useEffect(() => {
    const element = chatScroll.current; if (!element || !ready) return;
    const observer = new MutationObserver(() => { if (loadingOlder.current) return; if (nearBottom.current) requestAnimationFrame(() => { element.scrollTop = element.scrollHeight; }); else setHasNewMessages(true); });
    observer.observe(element, { childList: true, subtree: true, characterData: true }); return () => observer.disconnect();
  }, [ready, conversationId, focusedRunId]);
  const currentDraft = drafts[conversationId] ?? '';
  useEffect(() => { const input = composerInput.current; if (input) { input.style.height = 'auto'; input.style.height = `${Math.min(240, Math.max(48, input.scrollHeight))}px`; } }, [currentDraft, conversationId]);
  useEffect(() => {
    if (!ready || !projectId) return;
    localStorage.setItem('openlab-project', projectId);
    setSnapshot(null); setDetail(null); setRunId(''); setConversationId(''); setRevisionId(''); setRevision(null); setSourceId('');
    void refreshProject(projectId).catch(failure => { setError(failure.message); setConnected(false); });
  }, [ready, projectId]);
  useEffect(() => {
    if (!snapshot || !conversationId) return;
    const runs = snapshot.runs.filter(r => r.conversationId === conversationId);
    const saved = localStorage.getItem('openlab-focused-run-' + conversationId) ?? '';
    setRunId(current => runs.some(r => r.id === current) ? current : runs.find(r => r.id === saved)?.id ?? runs.at(-1)?.id ?? '');
  }, [conversationId, snapshot?.project.id, snapshot?.runs.length]);
  useEffect(() => {
    if (!conversationId) return;
    setFocusedRunId(localStorage.getItem('openlab-focused-run-' + conversationId) ?? '');
    if (snapshot?.conversations.some(conversation => conversation.id === conversationId)) localStorage.setItem('openlab-conversation-' + projectId, conversationId);
  }, [conversationId, snapshot?.project.id]);
  useEffect(() => {
    if (!conversationId) return;
    let stopped = false;
    void api<{ messages: ObjectData[]; nextCursor?: string; hasMore?: boolean }>(`/conversations/${conversationId}?limit=20`).then(data => { if (!stopped) setHistoryMessages({ conversationId, ...data }); }).catch(() => {});
    return () => { stopped = true; };
  }, [conversationId, snapshot?.runs.length]);
  useEffect(() => {
    if (revisionId && snapshot?.revisions.some(record => record.id === revisionId && (record.conversationId === conversationId || snapshot.runs.some(run => run.id === record.runId && run.conversationId === conversationId)))) localStorage.setItem('openlab-revision-' + conversationId, revisionId);
  }, [revisionId, conversationId]);
  useEffect(() => {
    if (!runId) { setDetail(null); return; }
    let stopped = false;
    const update = async () => {
      try {
        const current = await api<Detail>(`/runs/${runId}`);
        if (stopped) return;
        setDetail(current); setConnected(true); await refreshProject(); if (ended.has(current.state)) clearInterval(timer);
      } catch (failure) { if (!stopped) { setConnected(false); if (failure instanceof ApiError && failure.status === 401) { setReady(false); setSessionError(failure); } } }
    };
    void update(); const timer = setInterval(() => { void update(); }, 1000);
    return () => { stopped = true; clearInterval(timer); };
  }, [runId]);
  useEffect(() => {
    if (!snapshot || revisionId) return;
    const latest = snapshot.artifacts.filter(a => focusedRunId ? a.runId === runId : a.conversationId === conversationId || snapshot.runs.some(run => run.id === a.runId && run.conversationId === conversationId)).at(-1);
    const saved = localStorage.getItem('openlab-revision-' + conversationId);
    const savedRevision = snapshot.revisions.find(record => record.id === saved && (focusedRunId ? record.runId === runId : record.conversationId === conversationId || snapshot.runs.some(run => run.id === record.runId && run.conversationId === conversationId)));
    if (savedRevision) setRevisionId(String(savedRevision.id)); else if (latest) setRevisionId(String(focusedRunId ? latest.latestGenerated ?? latest.latest : latest.latest));
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
  const openSource = useCallback((source: string) => { const active = document.activeElement; if (active instanceof HTMLElement && active.classList.contains('citation')) citationRecord.current = { sourceId: source, index: Number(active.dataset.citationIndex) }; setSourceId(source); setTab('sources'); setPanePreferences(current => ({ ...current, [conversationRef.current]: true })); if (matchMedia('(max-width: 1023px)').matches) setDrawer('artifacts'); }, []);
  const currentRun = detail?.id === runId ? detail : snapshot?.runs.find(r => r.id === runId);
  const active = snapshot?.runs.find(r => r.conversationId === conversationId && !ended.has(r.state));
  const draft = drafts[conversationId] ?? '';
  const selectConversation = (selected: string) => { setConversationId(selected); setRunId(''); setDetail(null); setRevisionId(''); setSourceId(''); setDrawer(null); };
  const selectRun = (run: Run) => { setFocusedRunId(run.id); localStorage.setItem('openlab-focused-run-' + run.conversationId, run.id); setConversationId(run.conversationId); setRunId(run.id); setDetail(null); setRevisionId(''); };
  const createConversation = async () => {
    if (!snapshot) return;
    const created = await api<ConversationRecord>(`/projects/${projectId}/conversations`, 'POST', { name: t(`Research ${snapshot.conversations.length + 1}`, `研究 ${snapshot.conversations.length + 1}`) });
    await refreshProject(); selectConversation(created.id);
  };
  const selectedMaterials = materialSelections[conversationId] ?? snapshot?.materials.filter(material => typeof material.preview === 'string').map(material => String(material.id)) ?? [];
  const startRun = async (question = draft, parentRunId?: string) => {
    const fingerprint = JSON.stringify({ conversationId, question, providerId, skillId, parentRunId, executionLimits, mode, revisionId, reportContextDisabled: reportContextDisabled[conversationId], materialIds: selectedMaterials });
    if (pendingRequest.current?.fingerprint !== fingerprint) pendingRequest.current = { fingerprint, key: crypto.randomUUID() };
    const created = await api<Run>(`/conversations/${conversationId}/runs`, 'POST', { question, requestKey: pendingRequest.current.key, providerId, skillId, language, mode, materialIds: selectedMaterials, limits: executionLimits, ...(reportContextDisabled[conversationId] ? { contextRevisionId: null } : revisionId && snapshot?.revisions.some(record => record.id === revisionId && (record.origin === 'user' ? record.conversationId === conversationId : snapshot.runs.some(run => run.id === record.runId && run.conversationId === conversationId && ended.has(run.state)))) ? { contextRevisionId: revisionId } : {}), ...(parentRunId ? { parentRunId } : {}) });
    pendingRequest.current = null; setFocusedRunId(''); localStorage.removeItem('openlab-focused-run-' + conversationId);
    setDrafts(current => ({ ...current, [conversationId]: '' })); await refreshProject(); setRunId(created.id); setRevisionId(''); setStreamKey(value => value + 1);
  };
  const decision = async (interaction: Interaction, value: Json) => {
    await api(`/runs/${runId}/interactions/${interaction.id}/response`, 'POST', { version: interaction.version, value });
    setDetail(await api<Detail>(`/runs/${runId}`));
  };
  const navigateStep = (targetRun: string, step: string) => {
    nearBottom.current = false;
    const run = snapshot?.runs.find(r => r.id === targetRun);
    if (run) { setFocusedRunId(run.id); localStorage.setItem('openlab-focused-run-' + run.conversationId, run.id); setConversationId(run.conversationId); setRunId(run.id); if (run.id !== runId) setDetail(null); setHighlightedStep(step); setDrawer(null); }
  };
  const selectedSource = snapshot?.sources.find(source => source.id === sourceId || source.originalId === sourceId);
  const selectedMaterial = snapshot?.materials.find(material => material.id === materialId);
  const reportArtifact = snapshot?.artifacts.find(artifact => artifact.id === revision?.revision.artifactId);
  const events = detail?.id === runId ? detail.events : [];
  const usage = events.filter(event => event.kind === 'usage').at(-1)?.data;
  const stateLabel = (state: string) => stateNames[state]?.[zh ? 1 : 0] ?? state;
  const selectProject = (selected: string) => {
    projectRef.current = selected;
    setProjectId(selected); setSnapshot(null); setConversationId(''); setRunId(''); setDetail(null); setRevisionId(''); setRevision(null); setSourceId('');
  };

  const conversationRuns = snapshot?.runs.filter(run => run.conversationId === conversationId) ?? [];
  const selectedConversation = snapshot?.conversations.find(conversation => conversation.id === conversationId);
  const conversationLabel = (conversation: { id: string; name: string; nameSource?: string }) => conversation.nameSource !== 'manual' && /^Research(?: \d+)?$|^研究(?: \d+)?$/.test(conversation.name) ? (snapshot?.runs.find(run => run.conversationId === conversation.id)?.question ?? conversation.name).split(/[。！？\n]/)[0].slice(0, 48) : conversation.name;
  const visibleArtifact = reportArtifact ?? snapshot?.artifacts.filter(artifact => !runId || artifact.runId === runId).at(-1);
  const paneOpen = panePreferences[conversationId] ?? Boolean(visibleArtifact);
  const sidebarWidth = navCollapsed || viewportWidth < 1280 ? 56 : viewportWidth < 1440 ? 224 : 256;
  const paneMax = Math.max(300, Math.min(640, viewportWidth - sidebarWidth - 561));
  const effectivePaneWidth = Math.min(paneWidth, paneMax);
  const openArtifacts = (nextTab: typeof tab = tab) => {
    setTab(nextTab); setPanePreferences(current => ({ ...current, [conversationId]: true }));
    if (innerWidth < 1024) setDrawer('artifacts');
  };
  const closeArtifacts = () => { setPanePreferences(current => ({ ...current, [conversationId]: false })); setDrawer(null); };
  const selectedProvider = providers.find(provider => provider.id === providerId);
  const providerReady = Boolean(selectedProvider?.testedAt && selectedProvider.streaming && selectedProvider.tools);
  const canSend = Boolean(draft.trim() && (providerReady || mode === 'metadata') && conversationId && !busy && !active && connected && !snapshot?.project.archived);
  const reportTitle = reportArtifact?.name ? String(reportArtifact.name) : revision?.content.match(/^#\s+(.+)/m)?.[1] ?? t('Research report', '研究报告');
  const downloadReport = () => {
    if (!revision) return;
    const url = URL.createObjectURL(new Blob([revision.content], { type: 'text/markdown' }));
    const link = document.createElement('a'); link.href = url; link.download = `openlab-${revisionId}.md`; link.click(); URL.revokeObjectURL(url); setDownloadStatus(t('Download started', '已开始下载'));
  };
  const navigation = <>
    <div className="nav-brand"><strong>OpenLab</strong><span className="rail-brand" aria-hidden="true">O</span></div>
    <button className="new-project primary" disabled={busy || (!snapshot && projects.length > 0) || Boolean(snapshot?.project.archived)} onClick={() => {
      if (snapshot) { void perform(createConversation); setDrawer(null); } else { setModal('project'); setDrawer(null); }
    }} title={projects.length ? t('New conversation', '新对话') : t('New project', '新建项目')}><Plus size={19} aria-hidden="true" /><span>{projects.length ? t('New conversation', '新对话') : t('New project', '新建项目')}</span></button>
    <label className="navigation-search"><Search size={16} aria-hidden="true" /><span className="sr-only">{t('Search projects and conversations', '搜索项目和对话')}</span><input type="search" value={navQuery} onChange={event => setNavQuery(event.target.value)} placeholder={t('Search…', '搜索项目和对话…')} /></label>
    <div className="section-label row"><span>{t('Projects', '项目')}</span>{projects.length > 0 && <button className="icon-button" title={t('New project', '新建项目')} aria-label={t('New project', '新建项目')} onClick={() => { setModal('project'); setDrawer(null); }}><Plus size={16} aria-hidden="true" /></button>}</div>
    <nav aria-label={t('Projects', '项目')} className="project-list">{projects.filter(project => (!project.archived || showArchived || project.id === projectId) && project.name.toLocaleLowerCase().includes(navQuery.toLocaleLowerCase())).map(project => <button key={project.id} title={project.name} aria-current={projectId === project.id ? 'page' : undefined} className={projectId === project.id ? 'selected-project' : ''} onClick={() => { selectProject(project.id); setDrawer(null); }}><Folder size={18} aria-hidden="true" /><span>{project.name}</span>{project.archived && <small>{t('Archived', '已归档')}</small>}</button>)}</nav>
    {projects.some(project => project.archived) && <button className="archive-filter" aria-pressed={showArchived} onClick={() => setShowArchived(value => !value)}>{showArchived ? t('Hide archived', '隐藏已归档') : t('Show archived', '显示已归档')}</button>}
    {snapshot && <><div className="section-label">{t('Conversations', '对话')}</div>
      <nav aria-label={t('Conversations', '对话')} className="conversation-list">{snapshot.conversations.filter(conversation => (conversation.name + ' ' + (snapshot.runs.find(run => run.conversationId === conversation.id)?.question ?? '')).toLocaleLowerCase().includes(navQuery.toLocaleLowerCase())).map(conversation => <button key={conversation.id} title={conversation.name} aria-current={conversation.id === conversationId ? 'page' : undefined} className={conversation.id === conversationId ? 'selected' : ''} onClick={() => selectConversation(conversation.id)}><MessageSquare size={18} aria-hidden="true" /><span>{conversationLabel(conversation)}</span></button>)}</nav>
    </>}
    <footer className="nav-footer"><button title={t('Plugins', '插件')} onClick={() => { setModal('plugins'); setDrawer(null); }}><SlidersHorizontal size={18} aria-hidden="true" /><span>{t('Plugins', '插件')}</span></button>
      <button title={t('Skills & tools', '技能与工具')} onClick={() => { setModal('skills'); setDrawer(null); }}><BookOpen size={18} aria-hidden="true" /><span>{t('Skills & tools', '技能与工具')}</span></button>
      <button title={t('Model & settings', '模型与设置')} onClick={() => { setModal('settings'); setDrawer(null); }}><Settings2 size={18} aria-hidden="true" /><span>{t('Model & settings', '模型与设置')}</span></button>
      <button title={t('Import archive', '导入档案')} onClick={() => importFile.current?.click()}><Import size={18} aria-hidden="true" /><span>{t('Import archive', '导入档案')}</span></button>
      <div className="local-note"><Folder size={17} aria-hidden="true" /><span>{t('Local workspace', '本地工作区')}</span><span className={'dot ' + (connected ? '' : 'offline')} title={connected ? t('Connected', '已连接') : t('Disconnected', '连接已断开')} /></div>
    </footer>
  </>;
  const panelHost: PluginHost = {
    readRevision: async selected => { const record = snapshot?.revisions.find(record => record.id === selected); if (!record) throw new Error('Unknown revision'); return api(`/artifacts/${String(record.artifactId)}/revisions/${selected}`); },
    readAsset: async selected => new Uint8Array(await (await fetch(`/api/v1/assets/${selected}`)).arrayBuffer()),
    saveRevision: async () => { throw new Error('This panel has no document write capability'); }, openArtifact: setRevisionId,
    requestOperation: async (operation, input) => { if (operation === 'open-source') openSource(String(input.id)); else if (operation === 'open-step') navigateStep(String(input.runId), String(input.stepId)); else if (operation === 'return-to-citation') { setCitationTarget(citationRecord.current); setTab('reports'); } else if (operation === 'open-material') setMaterialId(String(input.id)); else if (operation === 'upload-material') inputFile.current?.click(); else if (operation === 'select-material') setMaterialSelections(current => ({ ...current, [conversationId]: input.selected ? [...selectedMaterials.filter(value => value !== input.id), String(input.id)] : selectedMaterials.filter(value => value !== input.id) })); else if (operation === 'retry' && currentRun) await perform(() => startRun(currentRun.question, currentRun.id)); else throw new Error('Unsupported panel operation'); return {}; },
  };
  const artifactsPane = <>
    <div className="pane-title"><h2>{t('Research results', '研究成果')}</h2><div className="row">{snapshot && <a className="icon-button" href={`/api/v1/projects/${projectId}/export`} aria-label={t('Export project', '导出项目')} title={t('Export project', '导出项目')}><Download size={18} aria-hidden="true" /></a>}<button className="icon-button" aria-label={t('Close research results', '关闭研究成果')} onClick={closeArtifacts}><X size={20} aria-hidden="true" /></button></div></div>
    <Tabs.Root value={tab} onValueChange={value => setTab(value as typeof tab)} className="artifact-tabs">
    <Tabs.List className="tabs" aria-label={t('Research record', '研究档案')}>{(['reports', 'sources', 'materials'] as const).map(value => <Tabs.Trigger key={value} value={value}>{value === 'reports' ? t('Reports', '报告') : value === 'sources' ? t('Sources', '来源') : t('Materials', '附件')}<span>{value === 'reports' ? snapshot?.artifacts.length ?? 0 : value === 'sources' ? snapshot?.sources.length ?? 0 : snapshot?.materials.length ?? 0}</span></Tabs.Trigger>)}</Tabs.List>
    <Tabs.Content value="reports" forceMount hidden={tab !== 'reports'} className="pane-content">
      <DocumentPanel artifacts={snapshot?.artifacts.filter(artifact => artifact.conversationId === conversationId || snapshot.runs.some(run => run.id === artifact.runId && run.conversationId === conversationId)) ?? []} citationTarget={citationTarget} revisions={snapshot?.revisions ?? []} revisionId={revisionId} catalog={pluginCatalog} conversationId={conversationId} zh={zh} archived={Boolean(snapshot?.project.archived)} select={setRevisionId} refresh={refreshProject} source={openSource} step={navigateStep} quote={(text, selected) => { setReportContextDisabled(current => ({ ...current, [conversationId]: false })); setRevisionId(selected); setDrafts(current => ({ ...current, [conversationId]: `${current[conversationId] ?? ''}\n\n${t('Regarding the selected report passage:', '关于所选报告中的文段：')}\n> ${text.replaceAll('\n', '\n> ')}\n\n` })); setDrawer(null); composerInput.current?.focus(); }} />
    </Tabs.Content>
    <Tabs.Content value="sources" className="pane-content">
      {tab === 'sources' && <PluginView catalog={pluginCatalog} kind="panel" format="sources" content="" zh={zh} host={panelHost} data={{ sources: snapshot?.sources ?? [], sourceId }} />}
    </Tabs.Content>
    <Tabs.Content value="materials" className="pane-content">
      {tab === 'materials' && <PluginView catalog={pluginCatalog} kind="panel" format="materials" content="" zh={zh} host={panelHost} data={{ materials: snapshot?.materials ?? [], selected: selectedMaterials, materialId, run: (currentRun ?? null) as unknown as Json, disabled: !projectId || busy || Boolean(snapshot?.project.archived) }} />}
    </Tabs.Content></Tabs.Root>
  </>;

  const editedProvider = providers.find(provider => provider.id === editingProvider);
  if (!ready) return <ConnectionScreen zh={zh} error={sessionError} busy={connecting} connect={connect} />;
  return <div className={`workspace ${navCollapsed ? 'nav-collapsed' : ''} ${paneOpen ? 'has-artifacts' : 'chat-focused'}`} style={{ '--artifact-width': `${effectivePaneWidth}px` } as CSSProperties}>
    <a className="skip-link" href="#conversation">{t('Skip to conversation', '跳转到对话')}</a>
    <aside className="sidebar">{navigation}</aside>
    <main className="main-panel">
      <header className="topbar">
        <button className="desktop-toggle icon-button" aria-label={t('Toggle navigation', '收起或展开导航')} aria-expanded={viewportWidth < 1280 ? drawer === 'projects' : !navCollapsed} onClick={() => { if (viewportWidth < 1280) setDrawer('projects'); else setNavCollapsed(value => !value); }}>{navCollapsed || viewportWidth < 1280 ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}</button>
        <button className="mobile-nav icon-button" aria-label={t('Projects', '项目')} onClick={() => setDrawer('projects')}><PanelLeftOpen size={19} aria-hidden="true" /></button>
        <div className="breadcrumb"><span>{snapshot?.project.name ?? 'OpenLab'}</span><span aria-hidden="true">/</span><strong>{selectedConversation ? conversationLabel(selectedConversation) : t('Research workspace', '研究工作区')}</strong></div>
        <div className="topbar-actions">
          {conversationRuns.length > 0 && <Popover label={t('Run history', '运行历史')} align="end" trigger={<button className="icon-button" aria-label={t('Run history', '运行历史')} title={t('Run history', '运行历史')}><History size={18} aria-hidden="true" /></button>}><h3>{t('Run history', '运行历史')}</h3><nav className="run-list" aria-label={t('Run history', '运行历史')}>{conversationRuns.toReversed().map((run, index) => <button key={run.id} className={runId === run.id ? 'selected' : ''} onClick={() => selectRun(run)}><MessageSquare size={16} aria-hidden="true" /><span>{run.question}<small>{stateLabel(run.state)} · {conversationRuns.length - index}</small></span></button>)}</nav><button className="menu-action" onClick={() => setModal('rename')}><Settings2 size={16} aria-hidden="true" />{t('Project options', '项目选项')}</button></Popover>}
          <button className="language" onClick={() => setLanguage(zh ? 'en' : 'zh')}>{zh ? 'EN' : '中文'}</button>
          <button className="results-toggle" aria-label={viewportWidth < 1024 ? t('Artifacts', '产物') : t('Research results', '研究成果')} aria-expanded={viewportWidth < 1024 ? drawer === 'artifacts' : paneOpen} onClick={() => { if (paneOpen && viewportWidth >= 1024) closeArtifacts(); else openArtifacts(); }}><PanelRight size={17} aria-hidden="true" /><span>{viewportWidth < 1024 ? t('Artifacts', '产物') : t('Research results', '研究成果')}</span></button>
          {snapshot && <Popover label={t('Project actions', '项目操作')} align="end" trigger={<button className="icon-button" aria-label={t('Project actions', '项目操作')}><Ellipsis size={19} aria-hidden="true" /></button>}><button className="menu-action" onClick={() => setModal('rename')}>{t('Project options', '项目选项')}</button><button className="menu-action" disabled={!conversationId || snapshot.project.archived} onClick={() => setModal('conversation')}>{t('Rename conversation', '重命名对话')}</button><a className="menu-action" href={`/api/v1/projects/${projectId}/export`}><Download size={16} aria-hidden="true" />{t('Export archive', '导出档案')}</a><a className="menu-action" href="/api/v1/openapi" target="_blank" rel="noreferrer">API</a></Popover>}
        </div>
      </header>
      {error && <div className="error-banner" role="alert"><span>{error}</span><button className="icon-button" onClick={() => setError('')} aria-label={t('Dismiss error', '关闭错误提示')}><X size={18} aria-hidden="true" /></button></div>}
      {!connected && <div className="notice" role="status">{active ? t('Disconnected. Research may still be running.', '服务已断开，研究可能仍在进行。') : t('Local service disconnected. Saved records are unchanged.', '本地服务已断开，已保存记录保持不变。')}<button onClick={() => void perform(async () => { await refreshCatalog(); await refreshProject(); setStreamKey(value => value + 1); setConnected(true); })}>{t('Reconnect', '重新连接')}</button></div>}
      <section ref={chatScroll} onScroll={event => { const element = event.currentTarget; nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 100; if (nearBottom.current) setHasNewMessages(false); }} id="conversation" tabIndex={-1} className="conversation-panel" aria-label={t('Conversation and execution', '对话与执行')}>
        {!focusedRunId && historyMessages?.hasMore && <button className="return-latest" onClick={() => void perform(async () => { const element = chatScroll.current; const previousHeight = element?.scrollHeight ?? 0; loadingOlder.current = true; let data; try { data = await api<{ messages: ObjectData[]; nextCursor?: string; hasMore?: boolean }>(`/conversations/${conversationId}?limit=20&before=${historyMessages.nextCursor}`); } catch (error) { loadingOlder.current = false; throw error; } setHistoryMessages(current => current ? { conversationId, ...data, messages: [...data.messages, ...current.messages] } : { conversationId, ...data }); requestAnimationFrame(() => { if (element) element.scrollTop += element.scrollHeight - previousHeight; loadingOlder.current = false; }); })}>{t('Load earlier research', '加载更早研究')}</button>}
        <h1 className="sr-only">{t('Research workspace', '研究工作区')}</h1>
        {focusedRunId && <button className="return-latest" onClick={() => { setFocusedRunId(''); localStorage.removeItem('openlab-focused-run-' + conversationId); setRunId(conversationRuns.at(-1)?.id ?? ''); setRevisionId(''); setHighlightedStep(''); }}>{t('Return to latest research', '返回最新研究')}</button>}
        {!focusedRunId && historyMessages?.conversationId === conversationId && conversationRuns.filter(run => run.id !== currentRun?.id && ended.has(run.state) && historyMessages.messages.some(message => message.runId === run.id)).map(run => <section className="history-turn" key={run.id} aria-label={t('Previous research', '历史研究')}><button className="history-turn-heading" onClick={() => selectRun(run)}><History size={15} aria-hidden="true" />{stateLabel(run.state)}<ArrowUpRight size={15} aria-hidden="true" /></button>{historyMessages.messages.filter(message => message.runId === run.id && String(message.content).trim()).map(message => message.role === 'user' ? <div className="user-message history-user-message" key={String(message.id)}><ReportText onSource={openSource}>{String(message.content)}</ReportText></div> : <div className="assistant-message" key={String(message.id)}><div className="assistant-avatar" aria-hidden="true">O</div><div className="assistant-content"><strong className="assistant-name">OpenLab</strong><ReportText onSource={openSource}>{String(message.content)}</ReportText></div></div>)}</section>)}
        {currentRun ? <>
          <div className="run-actions"><span className="muted">{currentRun.phase === 'planning' ? t('Planning', '计划阶段') : currentRun.phase === 'research' ? t('Research', '研究阶段') : t('Recorded conversation', '已记录对话')}</span><span className="spacer" /><button className="link" onClick={() => setStreamKey(value => value + 1)}>{t('Reload conversation', '重载对话')}</button>{!ended.has(currentRun.state) && <button disabled={!connected || busy || currentRun.state === 'cancelling'} onClick={() => void perform(async () => { await api(`/runs/${runId}/cancel`, 'POST', {}); setDetail(await api<Detail>(`/runs/${runId}`)); })}><Square size={13} aria-hidden="true" />{t('Stop run', '停止运行')}</button>}</div>
          <PluginView key={`${currentRun.id}:${streamKey}`} catalog={pluginCatalog} kind="panel" format="conversation" content="" zh={zh} host={panelHost} data={{ run: currentRun as unknown as Json }} />
          {(currentRun.context?.historyTruncated || currentRun.context?.reportTruncated) && <p className="notice" role="status">{t('Context was shortened: up to 6 finished runs, 40,000 history characters and 20,000 report characters.', '上下文已截断：最多使用最近 6 轮已结束研究、40,000 字符历史和 20,000 字符报告摘录。')}</p>}
          {currentRun.error && <p className="notice" role="alert">{currentRun.error}</p>}
          {currentRun.interaction && <InteractionForm key={currentRun.interaction.id} interaction={currentRun.interaction} disabled={!connected || busy} zh={zh} submit={value => void perform(() => decision(currentRun.interaction!, value))} />}
          <PluginView catalog={pluginCatalog} kind="panel" format="execution" content="" zh={zh} host={panelHost} data={{ run: currentRun as unknown as Json, events: events as unknown as Json, highlightedStep, disabled: busy || !connected || Boolean(active) || (!providerReady && mode !== 'metadata') }} />


          {visibleArtifact && <button className="artifact-entry" onClick={() => { if (!revisionId) setRevisionId(String(visibleArtifact.latest)); openArtifacts('reports'); }}><FileText size={25} aria-hidden="true" /><span><strong>{reportTitle}</strong><small>{revision?.revision.committed ? t('Saved revision', '已保存修订') : t('Saved draft', '已保存草稿')} · {String(visibleArtifact.format ?? 'Markdown')}</small></span><ArrowUpRight size={19} aria-hidden="true" /></button>}
        </> : <div className="welcome"><h2>{t('What would you like to investigate?', '你想探索什么问题？')}</h2>{!snapshot ? <><p>{t('Create a project to begin your research.', '创建一个项目，开始你的研究。')}</p><button className="primary" onClick={() => setModal('project')}><Plus size={18} aria-hidden="true" />{t('Create research project', '创建研究项目')}</button></> : null}</div>}
        {snapshot?.project.archived && <p className="notice">{t('This project is archived. Reopen it in project options to continue.', '项目已归档，可在项目选项中重新打开后继续。')}<button onClick={() => setModal('rename')}>{t('Project options', '项目选项')}</button></p>}
        {snapshot && !providerReady && mode === 'agent' && <div className="setup-prompt"><Settings2 size={18} aria-hidden="true" /><span>{t('Configure and test a model to generate a plan.', '配置并测试模型后即可生成研究计划。')}</span><button onClick={() => setModal('settings')}>{t('Configure model', '配置模型')}</button><button onClick={() => setMode('metadata')}>{t('Use metadata search', '直接检索元数据')}</button></div>}
      </section>
      {hasNewMessages && <button className="new-message-button" onClick={() => { const element = chatScroll.current; if (element) element.scrollTop = element.scrollHeight; nearBottom.current = true; setHasNewMessages(false); }}>{t('New messages ↓', '查看新消息 ↓')}</button>}
      <div className="composer-area"><form className="composer" onSubmit={event => { event.preventDefault(); if (canSend) void perform(() => startRun()); }}>
        {revision && !reportContextDisabled[conversationId] && <div className="composer-context"><FileText size={14} aria-hidden="true" /><span>{t('Report context', '报告上下文')}：{reportTitle}</span><button type="button" className="icon-button" aria-label={t('Remove report context', '移除报告上下文')} onClick={() => setReportContextDisabled(current => ({ ...current, [conversationId]: true }))}><X size={14} aria-hidden="true" /></button></div>}
        {Boolean(selectedMaterials.length) && <div className="composer-attachments">{snapshot?.materials.filter(material => selectedMaterials.includes(String(material.id))).map(material => <button key={String(material.id)} type="button" onClick={() => { setMaterialId(String(material.id)); openArtifacts('materials'); }}><FileText size={14} aria-hidden="true" /><span>{String(material.name)}</span></button>)}</div>}
        <label className="sr-only" htmlFor="research-question">{t('Research question', '研究问题')}</label>
        <textarea ref={composerInput} id="research-question" name="question" value={draft} onChange={event => setDrafts(current => ({ ...current, [conversationId]: event.target.value }))} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && !composing.current && event.nativeEvent.keyCode !== 229) { event.preventDefault(); if (canSend) event.currentTarget.form?.requestSubmit(); } }} placeholder={currentRun ? t('Keep asking, or refine your research…', '继续提问，或补充研究方向…') : t('Describe your research question…', '描述你的研究问题…')} rows={2} disabled={!conversationId || snapshot?.project.archived} />
        <div className="composer-controls"><button type="button" className="icon-button attachment-button" aria-label={t('Attach material', '添加附件')} title={t('Attach material', '添加附件')} disabled={!projectId || busy || snapshot?.project.archived} onClick={() => inputFile.current?.click()}><Plus size={21} aria-hidden="true" /></button>
          <Popover label={t('Research mode', '研究模式')} trigger={<button type="button" className="mode-trigger" title={t('Research mode and skill', '研究模式与技能')}><BookOpen size={16} aria-hidden="true" /><span>{mode === 'metadata' ? t('Metadata search', '元数据检索') : t('Research mode', '研究模式')}</span><ChevronDown size={15} aria-hidden="true" /></button>}>
            <h3>{t('Research mode', '研究模式')}</h3>{revision && reportContextDisabled[conversationId] && <button onClick={() => setReportContextDisabled(current => ({ ...current, [conversationId]: false }))}>{t('Use selected report as context', '使用所选报告作为上下文')}</button>}<label className="field" htmlFor="execution-mode">{t('Execution mode', '执行方式')}</label><Select id="execution-mode" label={t('Execution mode', '执行方式')} value={mode} onChange={value => setMode(value as typeof mode)} options={[{ value: 'agent', label: t('Agent + skill', 'Agent + 技能') }, { value: 'metadata', label: t('Tool: metadata search', '工具：元数据检索') }]} />
            {mode === 'agent' && <><label className="field" htmlFor="skill-selection">{t('Skill', '技能')}</label><Select id="skill-selection" label={t('Skill', '技能')} value={skillId} onChange={setSkillId} options={integrations.filter(skill => skill.enabled).map(skill => ({ value: String(skill.id), label: String(skill.name) }))} /></>}
            <p className="muted">{mode === 'metadata' ? t('No model calls. Confirm the search scope before retrieval.', '不会调用模型，检索前需确认搜索范围。') : t('Planning calls your model. Research tools wait for your confirmation.', '生成计划会调用所选模型，研究工具在你确认后执行。')}</p>
          </Popover>
          <Select id="model-selection" label={t('Model', '模型')} disabled={mode === 'metadata'} value={providerId} onChange={setProviderId} className="model-select" display={<><SlidersHorizontal size={16} aria-hidden="true" /><span>{providers.find(provider => provider.id === providerId)?.name ?? t('Model', '模型')}</span></>} options={[{ value: '', label: t('Configure a model', '配置模型') }, ...providers.map(provider => ({ value: provider.id, label: provider.name, description: `${provider.model}${provider.testedAt ? '' : t(' · needs capability test', ' · 待测试')} · ${t('Planning uses model tokens', '生成计划消耗模型用量')}` }))]} />
          <span className="spacer" /><button className="primary send-button" type="submit" aria-label={t('Create plan', '生成计划')} title={t('Create plan', '生成计划')} disabled={!canSend}>{busy ? <LoaderCircle className="spin" size={19} aria-hidden="true" /> : <ArrowUp size={21} aria-hidden="true" />}</button>
        </div>
      </form></div>
    </main>
    {paneOpen && viewportWidth >= 1024 && <><div className="pane-divider" role="separator" tabIndex={0} aria-label={t('Resize artifact pane', '调整产物栏宽度')} aria-orientation="vertical" aria-valuemin={300} aria-valuemax={paneMax} aria-valuenow={effectivePaneWidth} onKeyDown={event => { if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); setPaneWidth(Math.max(300, Math.min(paneMax, effectivePaneWidth + (event.key === 'ArrowLeft' ? 20 : -20)))); } }} onPointerDown={event => event.currentTarget.setPointerCapture(event.pointerId)} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) setPaneWidth(Math.max(300, Math.min(paneMax, innerWidth - event.clientX))); }} onPointerUp={event => event.currentTarget.releasePointerCapture(event.pointerId)} /><aside className="artifact-pane" ref={attachArtifacts} /></>}
    {createPortal(artifactsPane, artifactMount)}
    <input className="sr-only" type="file" aria-label={t('Attach material file', '选择附件文件')} ref={inputFile} tabIndex={-1} onChange={event => { const file = event.target.files?.[0]; if (file) void perform(async () => { const uploaded = await uploadMaterial(projectId, file); setMaterialSelections(current => ({ ...current, [conversationId]: typeof uploaded.preview === 'string' ? [...selectedMaterials, uploaded.id] : selectedMaterials })); await refreshProject(); setMaterialId(uploaded.id); setTab('materials'); }); event.target.value = ''; }} />
    <input className="sr-only" type="file" aria-label={t('Import project archive', '选择项目档案')} ref={importFile} tabIndex={-1} accept=".json,application/json" onChange={event => { const file = event.target.files?.[0]; if (file) void perform(async () => { const imported = await api<{ projectId: string }>('/import', 'POST', JSON.parse(await file.text())); await refreshCatalog(); selectProject(imported.projectId); }); event.target.value = ''; }} />
    {drawer && <Modal side={drawer === 'projects' ? 'left' : 'right'} title={drawer === 'projects' ? t('Projects & history', '项目与历史') : t('Artifacts & evidence', '产物与证据')} close={() => setDrawer(null)} wide><div className={drawer === 'projects' ? 'drawer-navigation' : 'drawer-artifacts'}>{drawer === 'projects' ? navigation : <div style={{ display: 'contents' }} ref={attachArtifacts} />}</div></Modal>}
    {modal === 'conversation' && <Modal title={t('Rename conversation', '重命名对话')} close={() => setModal(null)}>{modalError && <p className="notice" role="alert">{modalError}</p>}<form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void perform(async () => { await api(`/conversations/${conversationId}`, 'PATCH', { name: String(data.get('name')) }); await refreshProject(); setModal(null); }); }}><label className="field">{t('Conversation name', '对话名称')}<input name="name" required maxLength={200} defaultValue={selectedConversation?.name} /></label><button className="primary" disabled={busy}>{t('Save name', '保存名称')}</button></form></Modal>}
    {(modal === 'project' || modal === 'rename') && <Modal title={modal === 'project' ? t('New research project', '新建研究项目') : t('Project options', '项目选项')} close={() => setModal(null)}>{modalError && <p className="notice" role="alert">{modalError}</p>}<form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); void perform(async () => {
      if (modal === 'project') { const project = await api<Project>('/projects', 'POST', { name: String(data.get('name')) }); await api(`/projects/${project.id}/conversations`, 'POST', { name: t('Research 1', '研究 1') }); await refreshCatalog(); selectProject(project.id); }
      else { await api(`/projects/${projectId}`, 'PATCH', { name: String(data.get('name')), question: String(data.get('question')), discipline: String(data.get('discipline')), method: String(data.get('method')) }); await refreshCatalog(); await refreshProject(); }
      setModal(null);
    }); }}><label className="field">{t('Project name', '项目名称')}<input name="name" required maxLength={200} defaultValue={modal === 'rename' ? snapshot?.project.name : ''} autoFocus /></label>{modal === 'rename' && <><label className="field">{t('Project research question', '项目研究问题')}<textarea name="question" defaultValue={snapshot?.project.question ?? ''} maxLength={10000} /></label><div className="form-grid"><label className="field">{t('Discipline', '学科')}<input name="discipline" defaultValue={snapshot?.project.discipline ?? ''} maxLength={10000} /></label><label className="field">{t('Method', '方法')}<input name="method" defaultValue={snapshot?.project.method ?? ''} maxLength={10000} /></label></div></>}<button className="primary" disabled={busy}>{t('Save project', '保存项目')}</button></form>{modal === 'rename' && <button className="archive-button" disabled={busy} onClick={() => void perform(async () => { await api(`/projects/${projectId}`, 'PATCH', { archived: !snapshot?.project.archived }); await refreshCatalog(); await refreshProject(); setModal(null); })}>{snapshot?.project.archived ? t('Reopen project', '重新打开项目') : t('Archive project', '归档项目')}</button>}</Modal>}
    {modal === 'plugins' && <Modal title={t('Plugins', '插件')} close={() => setModal(null)} wide>{modalError && <p className="notice" role="alert">{modalError}</p>}<PluginSettings catalog={pluginCatalog} zh={zh} busy={busy} update={changes => void perform(async () => { setPluginCatalog(await api<PluginCatalog>('/plugins', 'PATCH', changes)); })} /></Modal>}
    {modal === 'settings' && <Modal title={t('Model & settings', '模型与设置')} close={() => setModal(null)} wide>{modalError && <p className="notice" role="alert">{modalError}</p>}<Diagnostics zh={zh} /><ExecutionLimits zh={zh} value={executionLimits} change={setExecutionLimits} /><p className="muted">{t('Credentials stay on the local service, protected by your Windows account. Connection tests use model tokens.', '凭据保存在本地服务中，由当前 Windows 账户保护。连接测试会使用模型 token。')}</p>{providers.map(provider => <div className="provider-card" key={provider.id}><div><strong>{provider.name}</strong><p>{provider.model} · {provider.baseUrl}</p><Tag tone={provider.testedAt ? 'green' : 'amber'}>{provider.testedAt ? t('Streaming & tools verified', '已验证流式输出和工具调用') : t('Needs capability test', '尚需能力测试')}</Tag></div><button disabled={busy} onClick={() => { setEditingProvider(provider.id); setModalError(''); }}>{t('Edit', '编辑')}</button><button disabled={busy} onClick={() => void perform(async () => { await api(`/providers/${provider.id}/test`, 'POST', {}); await refreshCatalog(); })}>{t('Test', '测试')}</button><button disabled={busy} onClick={() => void perform(async () => { await api(`/providers/${provider.id}`, 'DELETE'); await refreshCatalog(); })}>{t('Remove', '移除')}</button></div>)}<h3>{editedProvider ? t('Edit provider', '编辑模型服务') : t('Add a provider', '添加模型服务')}</h3><form key={editingProvider || 'new-provider'} onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); void perform(async () => { try { await api(editedProvider ? `/providers/${editedProvider.id}` : '/providers', editedProvider ? 'PATCH' : 'POST', { name: String(data.get('name')), baseUrl: String(data.get('baseUrl')), model: String(data.get('model')), apiKey: String(data.get('apiKey')) }); await refreshCatalog(); setEditingProvider(''); form.reset(); } finally { const field = form.elements.namedItem('apiKey') as HTMLInputElement; field.value = ''; } }); }}><div className="form-grid"><label className="field">{t('Provider name', '服务名称')}<input name="name" required defaultValue={editedProvider?.name ?? ''} /></label><label className="field">{t('Model ID', '模型 ID')}<input name="model" required defaultValue={editedProvider?.model ?? ''} placeholder="model-id" /></label></div><label className="field">{t('Base URL', '接口基础地址')}<input name="baseUrl" type="url" required defaultValue={editedProvider?.baseUrl ?? ''} placeholder="https://api.example.com/v1" /></label><label className="field">API key<input name="apiKey" type="password" required={!editedProvider} autoComplete="new-password" spellCheck={false} placeholder={editedProvider ? t('Leave blank to keep the current credential', '留空保留原凭据') : ''} /></label><p className="muted">{t('Model tests and planning use provider tokens. Changed connection settings need a new capability test.', '模型测试与生成计划会消耗用量。修改连接参数后需重新测试。')}</p><div className="row"><button className="primary" disabled={busy}>{editedProvider ? t('Save changes', '保存修改') : t('Save protected credential', '加密保存凭据')}</button>{editedProvider && <button type="button" onClick={() => setEditingProvider('')}>{t('Cancel editing', '取消编辑')}</button>}</div></form></Modal>}
    {modal === 'skills' && <Modal title={t('Skills & tools', '技能与工具')} close={() => setModal(null)} wide>{modalError && <p className="notice" role="alert">{modalError}</p>}<p>{t('Research tools: scholarly metadata search, scoped public-page reading, structured questions and report saving. No shell or arbitrary code execution.', '研究工具：学术元数据检索、经授权的公开页面读取、结构化提问和报告保存。当前不提供终端或任意代码执行。')}</p>{integrations.map(skill => <div className="skill-card" key={String(skill.id)}><h3>{String(skill.name)}</h3>{skill.id !== 'builtin-literature' && <button disabled={busy} onClick={() => void perform(async () => { await api(`/integrations/${String(skill.id)}`, 'DELETE'); await refreshCatalog(); })}>{t('Remove installation', '移除安装')}</button>}<Tag>{skill.enabled ? t('Enabled', '已启用') : t('Not enabled', '未启用')}</Tag><dl><dt>{t('Source', '来源')}</dt><dd>{String(skill.source)}</dd><dt>{t('Revision', '版本')}</dt><dd className="mono">{String(skill.revision)}</dd><dt>{t('Requirements', '运行要求')}</dt><dd>{skillRequirements(skill).length ? skillRequirements(skill).map(requirement => { const key = typeof requirement === 'string' ? requirement : JSON.stringify(requirement); const provider = providers.find(provider => provider.id === providerId); const available = key === 'retrieval' ? true : key === 'streaming' ? provider?.streaming : key === 'tool_calls' ? provider?.tools : undefined; return <div key={key}>{key} · {available === true ? t('Available', '可用') : available === false || ['streaming', 'tool_calls'].includes(key) ? t('Missing: configure and test a model', '缺少条件：配置并测试模型') : t('Unverified', '未验证')}</div>; }) : t('Not declared', '未声明')}</dd></dl><details><summary>{t('License & files', '许可与文件')}</summary><pre>{String(skill.license)}</pre><p>{t('Skill declarations (including authors, file licenses and requirements) are upstream claims; compatibility remains unverified unless recorded.', '技能声明中的作者、文件许可和要求来自上游，未经记录的兼容性仍未验证。')}</p><pre>{JSON.stringify(skill.declarations ?? [], null, 2)}</pre><pre>{JSON.stringify(skill.files ?? skill.requirements ?? [], null, 2)}</pre></details>{!skill.enabled && <button disabled={busy} onClick={() => void perform(async () => { await api(`/integrations/${String(skill.id)}/enable`, 'POST', { reviewed: true }); await refreshCatalog(); })}>{t('I reviewed source, license and requirements · Enable', '已审阅来源、许可和要求 · 启用')}</button>}</div>)}<h3>{t('Install a pinned skill repository', '安装固定版本的技能仓库')}</h3><form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); void perform(async () => { await api('/integrations', 'POST', { source: String(data.get('source')), revision: String(data.get('revision')) }); await refreshCatalog(); }); }}><label className="field">{t('Public HTTPS Git URL', '公开 HTTPS Git 地址')}<input name="source" type="url" required placeholder="https://github.com/owner/repository.git" /></label><label className="field">{t('Exact Git commit (40 characters)', '完整 Git 提交号（40 位）')}<input name="revision" required pattern="[a-fA-F0-9]{40}" /></label><button className="primary" disabled={busy}>{t('Install inert files', '安装文件')}</button></form></Modal>}
  </div>;
}
function InteractionForm({ interaction, disabled, zh, submit }: { interaction: Interaction; disabled: boolean; zh: boolean; submit: (value: Json) => void }) {
  const t = (en: string, cn: string) => zh ? cn : en;
  return <Plan className="interaction" defaultOpen><PlanHeader label={t('Show research request', '展开或收起研究请求')}><ShieldCheck size={19} aria-hidden="true" /><h2>{interaction.kind === 'confirmation' ? t('Review the research plan', '开始研究前请审阅') : interaction.kind === 'permission' ? t('Scoped access request', '具体访问授权') : t('Your input', '请补充信息')}</h2></PlanHeader><PlanContent><ReportText>{interaction.prompt}</ReportText>{interaction.scope && <details><summary>{t('Requested scope', '请求范围')}</summary><pre>{JSON.stringify(interaction.scope, null, 2)}</pre></details>}
    </PlanContent><PlanFooter>{interaction.input === 'boolean' ? <div className="row"><button className="primary" disabled={disabled} onClick={() => submit(true)}>{interaction.kind === 'confirmation' ? t('Confirm plan & begin', '确认计划并开始') : t('Allow this action', '允许这项操作')}</button><button disabled={disabled} onClick={() => submit(false)}>{t('Deny', '拒绝')}</button></div> : <form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); submit(interaction.input === 'multiple_choice' ? data.getAll('answer').map(String) : String(data.get('answer'))); }}>
      {interaction.input === 'text' ? <label className="field">{t('Your answer', '你的回答')}<textarea name="answer" required rows={3} maxLength={10_000} /></label> : <fieldset><legend>{t('Select an answer', '选择回答')}</legend>{interaction.options?.map(option => <label className="check" key={option}><input name="answer" type={interaction.input === 'multiple_choice' ? 'checkbox' : 'radio'} value={option} required={interaction.input === 'single_choice'} />{option}</label>)}</fieldset>}<button className="primary" disabled={disabled}>{t('Submit answer', '提交回答')}</button></form>}
  </PlanFooter></Plan>;
}
