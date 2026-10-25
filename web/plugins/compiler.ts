import type { PluginCatalog } from '../../app/plugin-contracts';
import { resolvePlugin } from '../../app/plugin-contracts';
export interface DocumentResource { path: string; base64: string; contentType?: string }
export interface CompileInput { content: string; language?: 'zh' | 'en'; mainPath: string; files: DocumentResource[]; options: Record<string, string> }
export interface CompileResult { pdf?: Uint8Array; log: string; engineVersion: string; engine: string; status: 'succeeded' | 'failed' | 'cancelled' }
export type CompilerProvider = (input: CompileInput, progress: (message: string) => void, signal: AbortSignal) => Promise<CompileResult>;
export const compilerRegistry = new Map<string, () => Promise<{ compile: CompilerProvider }>>([
  ['openlab.busytex', () => import('./busytex')],
]);
export async function compileDocument(catalog: PluginCatalog, format: string, input: CompileInput, progress: (message: string) => void, signal: AbortSignal): Promise<CompileResult> {
  const plugin = resolvePlugin(catalog, 'compiler', format); const load = plugin && compilerRegistry.get(plugin.id);
  if (!load) throw new Error('Enable a compiler plugin / 请启用编译器插件');
  return (await load()).compile(input, progress, signal);
}
