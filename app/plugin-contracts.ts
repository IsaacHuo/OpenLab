export const pluginApiVersion = 1;
export type PluginKind = 'editor' | 'previewer' | 'compiler' | 'exporter' | 'panel' | 'model' | 'tool' | 'skill' | 'runtime' | 'comparator';
export interface PluginContribution { kind: PluginKind; formats: string[] }
export interface PluginManifest {
  id: string; name: string; version: string; apiVersion: number; license: string;
  contributes: PluginContribution[]; requires: string[]; parameters?: { key: string; label: string; default: string; values: { value: string; label: string }[] }[]; templates?: { name: string; format: string; mainPath: string; content: string }[];
}
export interface PluginState { enabled: Record<string, boolean>; defaults: Record<string, string> }
export interface PluginCatalog { manifests: PluginManifest[]; state: PluginState; error?: string }
const manifest = (id: string, name: string, kind: PluginKind, formats: string[], license = 'Apache-2.0'): PluginManifest => ({ id, name, version: '1.0.0', apiVersion: 1, license, contributes: [{ kind, formats }], requires: [] });
export const builtinPlugins: PluginManifest[] = [
  manifest('openlab.markdown-editor', 'Markdown editor', 'editor', ['markdown'], 'MIT'),
  manifest('openlab.latex-editor', 'LaTeX editor', 'editor', ['latex'], 'MIT'),
  manifest('openlab.text-editor', 'Plain text editor', 'editor', ['markdown', 'latex', 'text']),
  manifest('openlab.markdown-preview', 'Markdown preview', 'previewer', ['markdown'], 'MIT'),
  manifest('openlab.pdf-preview', 'PDF preview', 'previewer', ['pdf'], 'Apache-2.0'),
  manifest('openlab.busytex', 'BusyTeX', 'compiler', ['latex'], 'MIT; TeX Live component licenses'),
  manifest('openlab.diff', 'Version comparison', 'comparator', ['markdown', 'latex', 'text'], 'BSD-3-Clause'),
  manifest('openlab.file-export', 'File export', 'exporter', ['markdown', 'latex', 'pdf', 'text']),
  manifest('openlab.conversation', 'Conversation', 'panel', ['conversation'], 'MIT'),
  manifest('openlab.execution', 'Execution', 'panel', ['execution']),
  manifest('openlab.sources', 'Sources', 'panel', ['sources']),
  manifest('openlab.materials', 'Materials', 'panel', ['materials']),
  manifest('openlab.compatible-model', 'Compatible model provider', 'model', ['openai-compatible']),
  manifest('openlab.research-tools', 'Research tools', 'tool', ['search_metadata', 'read_source', 'ask_question', 'publish_report']),
  manifest('openlab.literature', 'Literature research', 'skill', ['builtin-literature']),
  manifest('openlab.harness', 'OpenLab Harness', 'runtime', ['openlab-harness-1']),
  manifest('openlab.metadata', 'Metadata search', 'runtime', ['openlab-metadata-1']),
];
builtinPlugins.find(plugin => plugin.id === 'openlab.busytex')!.parameters = [{ key: 'engine', label: 'TeX', default: 'xelatex', values: [{ value: 'xelatex', label: 'XeLaTeX' }, { value: 'pdflatex', label: 'pdfLaTeX' }] }];
builtinPlugins.find(plugin => plugin.id === 'openlab.markdown-editor')!.templates = [{ name: 'Markdown', format: 'markdown', mainPath: 'report.md', content: '# 未命名文档\n\n' }];
builtinPlugins.find(plugin => plugin.id === 'openlab.latex-editor')!.templates = [{ name: 'LaTeX', format: 'latex', mainPath: 'main.tex', content: '\\documentclass{article}\n\\begin{document}\n\\section{Introduction}\n\n\\end{document}\n' }];
export function defaultPluginState(): PluginState {
  return { enabled: {}, defaults: { 'editor:markdown': 'openlab.markdown-editor', 'editor:latex': 'openlab.latex-editor', 'panel:conversation': 'openlab.conversation', 'panel:execution': 'openlab.execution', 'panel:sources': 'openlab.sources', 'panel:materials': 'openlab.materials', 'previewer:markdown': 'openlab.markdown-preview', 'previewer:pdf': 'openlab.pdf-preview', 'compiler:latex': 'openlab.busytex', 'comparator:markdown': 'openlab.diff', 'comparator:latex': 'openlab.diff', 'exporter:markdown': 'openlab.file-export', 'exporter:latex': 'openlab.file-export', 'exporter:pdf': 'openlab.file-export' } };
}
export function supports(plugin: PluginManifest, kind: PluginKind, format: string): boolean { return plugin.apiVersion === pluginApiVersion && plugin.contributes.some(value => value.kind === kind && value.formats.includes(format)); }
export function pluginAvailable(catalog: PluginCatalog, pluginId: string, visited = new Set<string>()): boolean {
  const plugin = catalog.manifests.find(plugin => plugin.id === pluginId);
  if (!plugin || plugin.apiVersion !== pluginApiVersion || catalog.state.enabled[pluginId] === false || visited.has(pluginId)) return false;
  return plugin.requires.every(dependency => pluginAvailable(catalog, dependency, new Set([...visited, pluginId])));
}
export function resolvePlugin(catalog: PluginCatalog, kind: PluginKind, format: string): PluginManifest | undefined {
  const selected = catalog.state.defaults[`${kind}:${format}`];
  return catalog.manifests.find(plugin => plugin.id === selected && pluginAvailable(catalog, plugin.id) && supports(plugin, kind, format));
}
