import { Component, lazy, Suspense } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { builtinPlugins, resolvePlugin } from '../../app/plugin-contracts';
import type { PluginCatalog, PluginKind, PluginManifest } from '../../app/plugin-contracts';
import type { ObjectData } from '../../app/contracts';

export interface PluginHost {
  readRevision: (revisionId: string) => Promise<ObjectData>;
  readAsset: (assetId: string) => Promise<Uint8Array>;
  saveRevision: (input: ObjectData) => Promise<ObjectData>;
  openArtifact: (revisionId: string) => void;
  requestOperation: (operation: string, input: ObjectData) => Promise<ObjectData>;
}
export interface PluginViewProps {
  host?: PluginHost; content: string; format: string; zh: boolean;
  onChange?: (content: string) => void; onSource?: (source: string) => void;
  url?: string; before?: string;
  data?: ObjectData;
}
type PluginModule = { default: ComponentType<PluginViewProps> };
export const viewRegistry = new Map<string, ReturnType<typeof lazy<ComponentType<PluginViewProps>>>>();
export function registerViewPlugin(manifest: PluginManifest, load: () => Promise<PluginModule>) {
  if (viewRegistry.has(manifest.id)) throw new Error('Plugin already registered: ' + manifest.id);
  viewRegistry.set(manifest.id, lazy(load));
}
const register = (id: string, load: () => Promise<PluginModule>) => registerViewPlugin(builtinPlugins.find(plugin => plugin.id === id)!, load);
register('openlab.markdown-editor', () => import('./text-editor'));
register('openlab.latex-editor', () => import('./text-editor'));
register('openlab.text-editor', () => import('./plain-editor'));
register('openlab.markdown-preview', () => import('./markdown-preview'));
register('openlab.diff', () => import('./comparison'));
register('openlab.pdf-preview', () => import('./pdf-preview'));
register('openlab.conversation', () => import('./conversation-view'));
register('openlab.sources', () => import('./sources-view'));
register('openlab.materials', () => import('./materials-view'));
register('openlab.execution', () => import('./execution-view'));

function Unavailable({ zh, url }: { zh: boolean; url?: string }) {
  return <p role="alert" className="notice">{zh ? '插件未能加载，原文件仍可下载。' : 'Plugin unavailable. The original file can still be downloaded.'}{url && <a href={url} download>{zh ? '下载原文件' : 'Download original'}</a>}</p>;
}
class PluginBoundary extends Component<{ children: ReactNode; zh: boolean; url?: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Unavailable zh={this.props.zh} url={this.props.url} /> : this.props.children; }
}
export function PluginView({ catalog, kind, ...props }: PluginViewProps & { catalog: PluginCatalog; kind: PluginKind }) {
  const plugin = resolvePlugin(catalog, kind, props.format); const View = plugin && viewRegistry.get(plugin.id);
  if (!View) return <Unavailable zh={props.zh} url={props.url} />;
  return <PluginBoundary key={plugin!.id} zh={props.zh} url={props.url}><Suspense fallback={<p role="status">{props.zh ? '正在加载…' : 'Loading…'}</p>}><View {...props} /></Suspense></PluginBoundary>;
}
