import { resolvePlugin } from '../../app/plugin-contracts';
import type { PluginCatalog } from '../../app/plugin-contracts';
export type ExportProvider = (input: { content: string; name: string }) => Blob;
export const exporterRegistry = new Map<string, ExportProvider>([
  ['openlab.file-export', input => new Blob([input.content], { type: 'text/plain;charset=utf-8' })],
]);
export function exportDocument(catalog: PluginCatalog, format: string, content: string, name: string): Blob {
  const plugin = resolvePlugin(catalog, 'exporter', format);
  const provider = plugin && exporterRegistry.get(plugin.id);
  // Recovery download is a platform guarantee even when an exporter is disabled.
  return provider ? provider({ content, name }) : new Blob([content], { type: 'application/octet-stream' });
}
