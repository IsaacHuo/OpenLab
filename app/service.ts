import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, lstatSync } from 'node:fs';
import { join, resolve, extname, sep } from 'node:path';
import { once } from 'node:events';
import { DomainError, object, text, terminal } from './contracts.ts';
import type { Decision, Json, ObjectData, Run } from './contracts.ts';
import { Platform } from './platform.ts';
import { Settings } from './settings.ts';
import { Skills } from './skills.ts';
import { Research } from './research.ts';
import { projectEvent } from './ag-ui.ts';
import { texRelease } from './tex-manifest.ts';
import { TexResources } from './tex-resources.ts';
import { Plugins } from './plugins.ts';
import { Documents } from './documents.ts';
import { openapi } from './openapi.ts';

async function body(req: IncomingMessage, limit = 32_000_000): Promise<ObjectData> {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new DomainError('Expected application/json', 415);
  const chunks: Buffer[] = []; let size = 0;
  for await (const value of req) { size += value.length; if (size > limit) throw new DomainError('Request body too large', 413); chunks.push(value); }
  try { return object(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
  catch (error) { if (error instanceof DomainError) throw error; throw new DomainError('Invalid JSON request'); }
}
const same = (a: string, b: string) => { const left = Buffer.from(a); const right = Buffer.from(b); return left.length === right.length && timingSafeEqual(left, right); };
export async function createService(options: { platform: Platform; settings: Settings; skills: Skills; research: Research; port?: number; staticRoot?: string; plugins?: Plugins }) {
  const { platform, settings, skills, research } = options;
  const plugins = options.plugins ?? new Plugins(settings.root);
  const texResources = new TexResources();
  const documents = new Documents(platform.store);
  const bootstrap = randomBytes(32).toString('hex');
  const session = randomBytes(32).toString('hex');
  const csrf = randomBytes(32).toString('hex');
  const styleNonce = randomBytes(16).toString('hex');
  let origin = '';
  const subscriptions = new Set<ServerResponse>();
  const json = (res: ServerResponse, value: unknown, status = 200) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); };
  const server = createServer(async (req, res) => {
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('referrer-policy', 'no-referrer');
    res.setHeader('cache-control', 'no-store');
    res.setHeader('content-security-policy', `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; style-src 'self' 'nonce-${styleNonce}'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`);
    try {
      if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin)) throw new DomainError('Untrusted request origin', 403);
      const url = new URL(req.url ?? '/', origin);
      const path = url.pathname;
      const method = req.method ?? 'GET';
      if (path === '/api/v1/session' && method === 'POST') {
        if (req.headers.origin !== origin || !same(String(req.headers['x-openlab-bootstrap'] ?? ''), bootstrap)) throw new DomainError('Use the launch link to connect this browser', 401);
        res.setHeader('set-cookie', `openlab_session=${session}; HttpOnly; SameSite=Strict; Path=/`);
        json(res, { csrf }); return;
      }
      if (!path.startsWith('/api/')) {
        if (method !== 'GET') throw new DomainError('Method not allowed', 405);
        const root = resolve(options.staticRoot ?? 'dist');
        let file = resolve(root, '.' + decodeURIComponent(path));
        if (file !== root && !file.startsWith(root + sep)) throw new DomainError('Invalid static path', 403);
        if (!existsSync(file) || !lstatSync(file).isFile()) file = join(root, 'index.html');
        if (!existsSync(file)) { res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }); res.end('OpenLab local API is running. Browser workspace build is not available yet.'); return; }
        const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
        res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }); res.end(extname(file) === '.html' ? readFileSync(file, 'utf8').replace('<head>', `<head><meta name="openlab-style-nonce" content="${styleNonce}">`) : readFileSync(file)); return;
      }
      const cookies = (req.headers.cookie ?? '').split(';').map(c => c.trim());
      if (!cookies.some(c => same(c, `openlab_session=${session}`))) throw new DomainError('Use the launch link to authenticate', 401);
      if (method !== 'GET' && (req.headers.origin !== origin || !same(String(req.headers['x-openlab-csrf'] ?? ''), csrf))) throw new DomainError('Missing current browser CSRF token', 403);
      if (path === '/api/v1/session' && method === 'GET') { json(res, { csrf }); return; }
      if (path === '/api/v1/openapi' && method === 'GET') { json(res, openapi); return; }
      if (path === '/api/v1/plugins/openlab.busytex/resources') { if (method === 'POST') { plugins.require('openlab.busytex'); texResources.prepare(); } else if (method === 'DELETE') texResources.cancel(); else if (method !== 'GET') throw new DomainError('Method not allowed', 405); json(res, texResources.status); return; }
      if (path.startsWith('/api/v1/plugin-assets/busytex/') && method === 'GET') { const prefix = `/api/v1/plugin-assets/busytex/${texRelease}/`; if (!path.startsWith(prefix)) throw new DomainError('Unknown compiler resource version', 404); const name = path.slice(prefix.length); const bytes = texResources.read(name); res.writeHead(200, { 'content-type': name.endsWith('.wasm') ? 'application/wasm' : name.endsWith('.js') ? 'text/javascript' : 'application/octet-stream', 'cache-control': 'private, max-age=31536000, immutable' }); res.end(bytes); return; }
      if (path === '/api/v1/plugins') {
        if (method === 'GET') json(res, plugins.catalog());
        else if (method === 'PATCH') { const input = await body(req); if (input.enabled && Object.entries(object(input.enabled)).some(([pluginId, enabled]) => enabled === false && plugins.manifests.find(plugin => plugin.id === pluginId)?.contributes.some(value => ['runtime', 'model', 'tool', 'skill'].includes(value.kind))) && platform.store.list<Run>('run').some(run => !terminal.has(run.state))) throw new DomainError('Stop active research before disabling execution plugins', 409); json(res, plugins.update(input)); }
        else throw new DomainError('Method not allowed', 405); return;
      }
      if (path === '/api/v1/setup' && method === 'GET') { json(res, { node: process.version, platform: process.platform, runtime: platform.runtime.capabilities(), providers: settings.list(), retrieval: { provider: 'Crossref', configured: true, requiresNetwork: true } }); return; }
      if (path === '/api/v1/retrieval/test' && method === 'POST') {
        const probe = await research.getMetadata('https://api.crossref.org/works?rows=0', AbortSignal.timeout(20_000));
        if (probe.status !== 200) throw new DomainError(`Crossref diagnostics failed (HTTP ${probe.status})`, 502);
        json(res, { provider: 'Crossref', testedAt: new Date().toISOString(), metadataAvailable: true }); return;
      }
      if (path === '/api/v1/projects') {
        if (method === 'GET') json(res, platform.store.list('project'));
        else if (method === 'POST') json(res, platform.project(text((await body(req)).name)), 201);
        else throw new DomainError('Method not allowed', 405);
        return;
      }
      if (path === '/api/v1/import' && method === 'POST') { json(res, { projectId: platform.store.import(await body(req, 128_000_000)) }, 201); return; }
      if (path === '/api/v1/providers') {
        if (method === 'GET') json(res, settings.list());
        else if (method === 'POST') json(res, settings.add(await body(req)), 201);
        else throw new DomainError('Method not allowed', 405);
        return;
      }
      if (path === '/api/v1/integrations') {
        if (method === 'GET') json(res, [{ id: 'builtin-literature', name: 'OpenLab literature research', revision: '1', source: 'OpenLab first-party research extension', license: 'Apache-2.0', enabled: true, maturity: 'L1', requirements: ['streaming', 'tool_calls', 'retrieval'] }, ...skills.list()]);
        else if (method === 'POST') { const input = await body(req); json(res, await skills.install(text(input.source), text(input.revision)), 201); }
        else throw new DomainError('Method not allowed', 405);
        return;
      }
      const match = path.match(/^\/api\/v1\/(projects|conversations|runs|providers|integrations|sources|artifacts|materials|assets)\/([^/]+)(?:\/(.*))?$/);
      if (!match) throw new DomainError('API route not found', 404);
      const [, resource, resourceId, operation = ''] = match;
      if (resource === 'projects') {
        const project = platform.store.get('project', resourceId);
        if (operation === 'export' && method === 'GET') { res.setHeader('content-disposition', `attachment; filename="openlab-${resourceId}.json"`); json(res, platform.store.export(resourceId)); }
        else if (operation === 'materials' && method === 'POST') {
          const input = await body(req); const encoded = text(input.base64, 'material', 14_000_000);
          const bytes = Buffer.from(encoded, 'base64');
          if (bytes.toString('base64') !== encoded) throw new DomainError('Invalid material encoding');
          json(res, platform.store.material(resourceId, text(input.name), bytes), 201);
        }
        else if (operation === 'conversations' && method === 'POST') { const input = await body(req); json(res, platform.conversation(resourceId, typeof input.name === 'string' ? input.name : undefined), 201); }
        else if (!operation && method === 'PATCH') json(res, platform.updateProject(resourceId, await body(req)));
        else if (!operation && method === 'GET') json(res, { project, conversations: platform.store.list('conversation', resourceId), runs: platform.store.list('run', resourceId), artifacts: platform.store.list('artifact', resourceId), sources: platform.store.list('source', resourceId), revisions: platform.store.list('revision', resourceId), materials: platform.store.list('material', resourceId), builds: platform.store.list('build', resourceId) });
        else throw new DomainError('Project operation not found', 404);
        return;
      }
      if (resource === 'conversations') {
        const conversation = platform.store.get('conversation', resourceId);
        if (!operation && method === 'PATCH') json(res, platform.renameConversation(resourceId, await body(req)));
        else if (!operation && method === 'GET') {
          const all = platform.store.list<Run>('run', String(conversation.projectId)).filter(run => run.conversationId === resourceId);
          let runs = all; let hasMore = false;
          if (url.searchParams.has('limit')) { const limit = Number(url.searchParams.get('limit')); if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new DomainError('Invalid history page size'); const before = url.searchParams.get('before'); const end = before ? all.findIndex(run => run.id === before) : all.length; if (end < 0) throw new DomainError('History cursor belongs to another conversation'); const start = Math.max(0, end - limit); runs = all.slice(start, end); hasMore = start > 0; }
          json(res, { conversation, messages: platform.store.list('message', String(conversation.projectId)).filter(message => runs.some(run => run.id === message.runId)), runs, hasMore, nextCursor: hasMore ? runs[0]?.id : null });
        }
        else if (operation === 'documents' && method === 'POST') { const input = await body(req); if (!plugins.manifests.some(plugin => plugins.enabled(plugin.id) && plugin.contributes.some(value => value.kind === 'editor' && value.formats.includes(String(input.formatId))))) throw new DomainError('Enable an editor for this format', 409); json(res, documents.create(resourceId, input), 201); }
        else if (operation === 'runs' && method === 'POST') {
          const input = await body(req);
          if (input.contextRevisionId != null) text(input.contextRevisionId, 'report revision');
          if ('history' in input || 'context' in input || 'messages' in input) throw new DomainError('Conversation context is selected by the service');
          const previous = platform.store.list<Run>('run', String(conversation.projectId)).find(run => run.conversationId === resourceId && run.requestKey === input.requestKey);
          const materialIds = input.materialIds === undefined ? previous?.config.materialIds ?? platform.store.list('material', String(conversation.projectId)).map(material => String(material.id)) : input.materialIds;
          if (!Array.isArray(materialIds) || materialIds.length > 50 || new Set(materialIds).size !== materialIds.length || materialIds.some(value => typeof value !== 'string')) throw new DomainError('Invalid selected materials');
          plugins.require('openlab.research-tools');
          if (input.mode === 'metadata') {
            plugins.require('openlab.metadata');
            const question = text(input.question, 'metadata query', 1000);
            json(res, platform.createRun(resourceId, { question, requestKey: text(input.requestKey), config: { providerId: 'none', model: 'none', skillId: 'builtin-literature', skillRevision: '1', runtimeId: 'openlab-metadata-1', retrievalId: 'crossref', language: input.language === 'zh' ? 'zh' : 'en' }, ...(input.contextRevisionId === null || typeof input.contextRevisionId === 'string' ? { contextRevisionId: input.contextRevisionId } : {}), ...(input.limits ? { limits: object(input.limits) as Partial<import('./contracts.ts').Limits> } : {}), ...(typeof input.parentRunId === 'string' ? { parentRunId: input.parentRunId } : {}) }), 201);
            return;
          }
          plugins.require('openlab.harness'); plugins.require('openlab.compatible-model'); plugins.require('openlab.literature');
          const providerId = text(input.providerId);
          const provider = settings.list().find(p => p.id === providerId);
          if (!provider?.streaming || !provider.tools || !provider.testedAt) throw new DomainError('Test the selected model provider before starting research', 409);
          const skillId = typeof input.skillId === 'string' ? input.skillId : 'builtin-literature';
          const skill = skillId === 'builtin-literature' ? { revision: '1' } : skills.load(skillId).entry;
          json(res, platform.createRun(resourceId, { question: text(input.question), requestKey: text(input.requestKey), config: { providerId, model: provider.model, skillId, skillRevision: skill.revision, runtimeId: 'openlab-harness-1', retrievalId: 'crossref', language: input.language === 'zh' ? 'zh' : 'en', materialIds }, ...(input.contextRevisionId === null || typeof input.contextRevisionId === 'string' ? { contextRevisionId: input.contextRevisionId } : {}), ...(input.limits ? { limits: object(input.limits) as Partial<import('./contracts.ts').Limits> } : {}), ...(typeof input.parentRunId === 'string' ? { parentRunId: input.parentRunId } : {}) }), 201);
        } else throw new DomainError('Conversation operation not found', 404);
        return;
      }
      if (resource === 'providers') {
        if (operation === 'test' && method === 'POST') json(res, await settings.test(resourceId));
        else if (!operation && method === 'PATCH') {
          const input = await body(req);
          if (platform.store.list<Run>('run').some(run => run.config.providerId === resourceId && !terminal.has(run.state))) throw new DomainError('Stop runs using this provider before editing it', 409);
          json(res, settings.update(resourceId, input));
        }
        else if (!operation && method === 'DELETE') {
          if (platform.store.list<Run>('run').some(r => r.config.providerId === resourceId && !terminal.has(r.state))) throw new DomainError('Stop runs using this provider first', 409);
          settings.remove(resourceId); json(res, { removed: true });
        } else throw new DomainError('Provider operation not found', 404);
        return;
      }
      if (resource === 'integrations' && operation === 'enable' && method === 'POST') { json(res, skills.enable(resourceId, (await body(req)).reviewed === true)); return; }
      if (resource === 'integrations' && !operation && method === 'DELETE') {
        if (resourceId === 'builtin-literature') throw new DomainError('The built-in research extension cannot be removed', 409);
        if (platform.store.list<Run>('run').some(run => run.config.skillId === resourceId && !terminal.has(run.state))) throw new DomainError('Stop runs using this skill before removing it', 409);
        skills.remove(resourceId); json(res, { removed: true }); return;
      }
      if (resource === 'sources' && !operation && method === 'GET') { json(res, platform.store.get('source', resourceId)); return; }
      if (resource === 'materials' && !operation && method === 'GET') {
        const { material, bytes } = platform.store.readMaterial(resourceId);
        res.writeHead(200, { 'content-type': String(material.contentType), 'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(String(material.name))}` }); res.end(bytes); return;
      }
      if (resource === 'assets' && !operation && method === 'GET') { const { asset, bytes } = documents.readAsset(resourceId); res.writeHead(200, { 'content-type': String(asset.contentType), 'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(String(asset.path))}` }); res.end(bytes); return; }
      if (resource === 'artifacts' && method !== 'GET') {
        if (operation === 'revisions' && method === 'POST') json(res, documents.save(resourceId, await body(req)), 201);
        else if (operation === 'draft' && method === 'PUT') json(res, documents.draft(resourceId, await body(req)));
        else if (operation === 'draft' && method === 'DELETE') { const draft = documents.draft(resourceId); if (draft) platform.store.db.prepare('DELETE FROM records WHERE id=? AND kind=?').run(String(draft.id), 'draft'); json(res, { discarded: true }); }
        else if (operation === 'builds' && method === 'POST') { const input = await body(req); plugins.require(String(input.pluginId)); if (!plugins.manifests.some(plugin => plugin.id === input.pluginId && plugin.version === input.pluginVersion && plugin.contributes.some(value => value.kind === 'compiler'))) throw new DomainError('Invalid compiler'); json(res, documents.build(resourceId, input), 201); }
        else throw new DomainError('Document operation not found', 404); return;
      }
      if (resource === 'artifacts' && method === 'GET') {
        const artifact = platform.store.get('artifact', resourceId);
        const revisions = platform.store.list('revision', String(artifact.projectId)).filter(r => r.artifactId === resourceId);
        if (!operation) json(res, { artifact, revisions });
        else if (operation === 'editing-draft') json(res, documents.draft(resourceId));
        else if (operation === 'builds') json(res, platform.store.list('build', String(artifact.projectId)).filter(build => build.artifactId === resourceId));
        else if (operation === 'draft') json(res, platform.store.readRevision(String(artifact.latest)));
        else if (operation.startsWith('revisions/') && revisions.some(r => r.id === operation.slice(10))) json(res, documents.read(operation.slice(10)));
        else throw new DomainError('Artifact revision not found', 404);
        return;
      }
      if (resource === 'runs') {
        const run = platform.store.get<Run>('run', resourceId);
        if (!operation && method === 'GET') json(res, { ...run, events: platform.store.events(run.id) });
        else if (operation === 'confirm' && method === 'POST') { const input = await body(req); json(res, platform.confirm(run.id, Number(input.version))); }
        else if (operation === 'cancel' && method === 'POST') json(res, await platform.cancel(run.id));
        else if (/^interactions\/[^/]+\/response$/.test(operation) && method === 'POST') {
          const input = await body(req); const interactionId = operation.split('/')[1];
          json(res, platform.respond(run.id, { interactionId, version: Number(input.version), value: input.value ?? null } as Decision));
        } else if ((operation === 'events' && method === 'GET') || (operation === 'ag-ui' && method === 'POST')) {
          const agui = operation === 'ag-ui';
          if (agui) { const input = await body(req); if (input.threadId !== run.conversationId || input.runId !== run.id) throw new DomainError('AG-UI run/thread mismatch', 409); }
          const rawCursor = String(req.headers['last-event-id'] ?? url.searchParams.get('cursor') ?? '0');
          if (!/^\d+(?::\d+)?$/.test(rawCursor)) throw new DomainError('Invalid replay cursor');
          let [sequence, projectionIndex = -1] = rawCursor.split(':').map(Number);
          if (!Number.isSafeInteger(sequence) || !Number.isSafeInteger(projectionIndex) || projectionIndex < -1) throw new DomainError('Invalid replay cursor');
          res.writeHead(200, { 'content-type': 'text/event-stream', connection: 'keep-alive', 'x-accel-buffering': 'no' });
          subscriptions.add(res);
          const pump = () => {
            if (res.destroyed) return;
            const current = platform.store.get<Run>('run', run.id);
            const events = platform.store.events(run.id, agui && projectionIndex >= 0 ? Math.max(0, sequence - 1) : sequence);
            for (const event of events) {
              const projected = agui ? projectEvent(event, current, event.kind === 'run_finished' ? platform.store.events(run.id) : []) : [event as unknown as ObjectData];
              for (let index = 0; index < projected.length; index++) {
                if (agui && event.seq === sequence && index <= projectionIndex) continue;
                res.write(`id: ${event.seq}${agui ? ':' + index : ''}\ndata: ${JSON.stringify(projected[index])}\n\n`);
              }
              sequence = event.seq; projectionIndex = agui ? projected.length - 1 : -1;
            }
            if (terminal.has(current.state)) { res.end(); cleanup(); }
          };
          const timer = setInterval(() => { try { pump(); if (!res.writableEnded) res.write(': keep-alive\n\n'); } catch { res.destroy(); cleanup(); } }, 250);
          const cleanup = () => { clearInterval(timer); subscriptions.delete(res); };
          res.on('close', cleanup);
          pump();
        } else throw new DomainError('Run operation not found', 404);
        return;
      }
      throw new DomainError('API route not found', 404);
    } catch (error) {
      if (res.headersSent) { res.destroy(); return; }
      json(res, { error: error instanceof DomainError ? error.message : 'Local service operation failed' }, error instanceof DomainError ? error.status : 500);
    }
  });
  server.requestTimeout = 120_000;
  server.listen(options.port ?? 0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as { port: number };
  origin = `http://127.0.0.1:${address.port}`;
  return { server, origin, launchUrl: `${origin}/#token=${bootstrap}`, close: async () => { for (const stream of subscriptions) stream.end(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await platform.close(); } };
}
