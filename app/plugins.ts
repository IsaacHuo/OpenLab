import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { DomainError, object } from './contracts.ts';
import type { ObjectData } from './contracts.ts';
import { builtinPlugins, defaultPluginState, pluginAvailable, supports } from './plugin-contracts.ts';
import type { PluginCatalog, PluginKind, PluginManifest, PluginState } from './plugin-contracts.ts';

export class Plugins {
  root: string; manifests: PluginManifest[];
  constructor(root: string, manifests = builtinPlugins) {
    this.root = root; this.manifests = manifests;
    if (new Set(manifests.map(value => value.id)).size !== manifests.length) throw new DomainError('Duplicate plugin identifier');
  }
  catalog(): PluginCatalog {
    const path = join(this.root, 'plugins.json');
    try {
      const defaults = defaultPluginState(); const stored = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as PluginState : defaults;
      if (!stored.enabled || !stored.defaults || Object.values(stored.enabled).some(value => typeof value !== 'boolean') || Object.values(stored.defaults).some(value => typeof value !== 'string')) throw new Error('Invalid preferences');
      return { manifests: this.manifests, state: { enabled: stored.enabled, defaults: { ...defaults.defaults, ...stored.defaults } } };
    } catch { return { manifests: this.manifests, state: { enabled: Object.fromEntries(this.manifests.map(plugin => [plugin.id, false])), defaults: defaultPluginState().defaults }, error: 'Plugin preferences could not be read; capabilities are disabled until configured again.' }; }
  }
  enabled(pluginId: string): boolean { return pluginAvailable(this.catalog(), pluginId); }
  require(pluginId: string): void { if (!this.enabled(pluginId)) throw new DomainError('Enable the required plugin: ' + pluginId, 409); }
  update(input: ObjectData): PluginCatalog {
    if (Object.keys(input).some(key => !['enabled', 'defaults'].includes(key))) throw new DomainError('Unsupported plugin preference');
    const state = structuredClone(this.catalog().state);
    if (input.enabled !== undefined) for (const [key, value] of Object.entries(object(input.enabled))) {
      if (!this.manifests.some(plugin => plugin.id === key) || typeof value !== 'boolean') throw new DomainError('Invalid plugin selection');
      state.enabled[key] = value;
    }
    if (input.defaults !== undefined) for (const [key, value] of Object.entries(object(input.defaults))) {
      const [kind, format, extra] = key.split(':');
      const plugin = this.manifests.find(plugin => plugin.id === value);
      if (extra || !plugin || !pluginAvailable({ manifests: this.manifests, state }, plugin.id) || !supports(plugin, kind as PluginKind, format)) throw new DomainError('Plugin cannot provide this capability');
      state.defaults[key] = String(value);
    }
    const path = join(this.root, 'plugins.json');
    writeFileSync(path + '.tmp', JSON.stringify(state, null, 2)); renameSync(path + '.tmp', path);
    return this.catalog();
  }
}
