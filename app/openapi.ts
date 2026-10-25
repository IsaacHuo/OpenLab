const json = (schema: object) => ({ 'application/json': { schema } });
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const object = (properties: object, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });
const string = { type: 'string' };
const boolean = { type: 'boolean' };
const response = (schema: object = { type: 'object' }) => ({ description: 'Persisted platform result', content: json(schema) });
const operation = (summary: string, request?: object, result?: object) => ({ summary, security: [{ LocalSession: [] }], ...(request ? { requestBody: { required: true, content: json(request) } } : {}), responses: { '200': response(result), '201': response(result), '400': response(ref('Error')), '401': response(ref('Error')), '403': response(ref('Error')), '409': response(ref('Error')) } });
const paths: Record<string, Record<string, unknown>> = {
  '/session': { post: { ...operation('Exchange the per-launch bootstrap token for an HttpOnly local session'), security: [], parameters: [{ in: 'header', name: 'x-openlab-bootstrap', required: true, schema: string }] }, get: operation('Read current CSRF token') },
  '/plugins': { get: operation('List statically registered plugin manifests and preferences'), patch: operation('Enable plugins and choose compatible defaults; active research blocks disabling execution providers', object({ enabled: { type: 'object', additionalProperties: boolean }, defaults: { type: 'object', additionalProperties: string } }, [])) },
  '/plugins/openlab.busytex/resources': { get: operation('Read actual compiler component preparation progress'), post: operation('Prepare pinned, checksum-verified compiler components; contains no document inputs'), delete: operation('Cancel compiler preparation, retaining validated cached components') },
  '/assets/{assetId}': { get: operation('Download an immutable checksum-verified document resource or build output') },
  '/conversations/{conversationId}/documents': { post: operation('Create a manual document without creating a research run', object({ name: string, formatId: string, mainPath: string, content: string, requestKey: string })) },
  '/artifacts/{artifactId}/revisions': { post: operation('Create an immutable human revision using an idempotent optimistic save', object({ name: string, content: string, requestKey: string, baseRevisionId: string, expectedLatestRevisionId: string, files: { type: 'array', maxItems: 50, items: object({ path: string, base64: string }) } }, ['content', 'requestKey', 'baseRevisionId', 'expectedLatestRevisionId'])) },
  '/artifacts/{artifactId}/editing-draft': { get: operation('Read the platform-owned unsent editor draft') },
  '/artifacts/{artifactId}/builds': { get: operation('List compilation records and exact input/output references'), post: operation('Record browser compiler output; not scientific verification or a server execution attestation', object({ requestKey: string, sourceRevisionId: string, sourceHash: string, pluginId: string, pluginVersion: string, engineVersion: string, engine: string, status: { enum: ['succeeded', 'failed', 'cancelled'] }, log: string, pdf: string }, ['requestKey', 'sourceRevisionId', 'sourceHash', 'pluginId', 'pluginVersion', 'engineVersion', 'engine', 'status'])) },
  '/setup': { get: operation('Read local runtime diagnostics and public provider configuration') },
  '/retrieval/test': { post: operation('Check the fixed metadata provider without starting research') },
  '/projects': { get: operation('List local projects', undefined, { type: 'array', items: ref('Project') }), post: operation('Create a project', object({ name: string }), ref('Project')) },
  '/projects/{projectId}': { get: operation('Read project, conversations, runs, sources and artifacts'), patch: operation('Update independent project context, rename, archive or reopen', object({ name: string, question: string, discipline: string, method: string, archived: boolean }, []), ref('Project')) },
  '/projects/{projectId}/conversations': { post: operation('Create a conversation', object({ name: string }, [])) },
  '/projects/{projectId}/materials': { post: operation('Copy an inert attachment into project storage (10 MB maximum)', object({ name: string, base64: string })) },
  '/materials/{materialId}': { get: { ...operation('Download checksum-verified original attachment bytes'), responses: { '200': { description: 'Original bytes; Content-Disposition attachment', content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } } } } },
  '/projects/{projectId}/export': { get: operation('Download a versioned portable research archive', undefined, ref('Archive')) },
  '/import': { post: operation('Verify and import an archive as historical records with new identities', ref('Archive')) },
  '/conversations/{conversationId}': { get: { ...operation('Read platform-owned messages and run history; optional run-group pagination'), parameters: [{ in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 } }, { in: 'query', name: 'before', schema: string }] }, patch: operation('Rename a conversation without changing history', object({ name: string })) },
  '/conversations/{conversationId}/runs': { post: operation('Create a run once per request key with frozen, service-selected conversation context; agent requires a tested provider; metadata calls no model', object({ question: string, requestKey: string, mode: { enum: ['agent', 'metadata'], default: 'agent' }, providerId: string, skillId: string, language: { enum: ['en', 'zh'] }, limits: ref('RunLimits'), parentRunId: string, materialIds: { type: 'array', maxItems: 50, uniqueItems: true, items: string, description: 'Agent mode: omitted uses project materials (frozen on first request); empty array uses none. Metadata mode reads no materials.' }, contextRevisionId: { type: ['string', 'null'], description: 'Optional exact revision from a finished run in this conversation; omitted selects the latest saved report when the run is created; null excludes report context.' } }, ['question', 'requestKey']), ref('Run')) },
  '/runs/{runId}': { get: operation('Read persisted run state and ordered events', undefined, ref('Run')) },
  '/runs/{runId}/confirm': { post: operation('Confirm the current plan and its reviewed tool policy', object({ version: { type: 'integer', minimum: 1 } })) },
  '/runs/{runId}/interactions/{interactionId}/response': { post: operation('Persist a validated question or scoped permission decision once', object({ version: { type: 'integer' }, value: {} })) },
  '/runs/{runId}/cancel': { post: operation('Request cancellation and await confirmed runtime termination') },
  '/runs/{runId}/events': { get: { ...operation('Replay and subscribe to ordered domain events; never dispatch execution'), parameters: [{ in: 'query', name: 'cursor', schema: { type: 'integer', minimum: 0 } }, { in: 'header', name: 'Last-Event-ID', schema: string }], responses: { '200': { description: 'SSE; id is the canonical sequence', content: { 'text/event-stream': { schema: string } } } } } },
  '/runs/{runId}/ag-ui': { post: { ...operation('Attach an AG-UI consumer to an existing run; client state cannot change policy', object({ threadId: string, runId: string, messages: { type: 'array', items: {} }, tools: { type: 'array', items: {} }, context: { type: 'array', items: {} }, state: {}, forwardedProps: {} }, ['threadId', 'runId'])), parameters: [{ in: 'header', name: 'Last-Event-ID', schema: { type: 'string', pattern: '^[0-9]+(?::[0-9]+)?$' } }], responses: { '200': { description: 'AG-UI SSE; id is sequence:projection-index', content: { 'text/event-stream': { schema: string } } } } } },
  '/providers': { get: operation('List public provider configuration; no credentials'), post: operation('Store a user provider credential with Windows user-scoped protection; DeepSeek uses non-thinking mode', object({ name: string, baseUrl: string, model: string, apiKey: { type: 'string', writeOnly: true } })) },
  '/providers/{providerId}': { delete: operation('Remove an unused provider and its protected credential'), patch: operation('Update an inactive provider; blank credential keeps the previous value; connection changes invalidate capability tests', object({ name: string, baseUrl: string, model: string, apiKey: { type: 'string', writeOnly: true } }, [])) },
  '/providers/{providerId}/test': { post: operation('Verify real streaming and structured tool calls; uses provider tokens') },
  '/integrations': { get: operation('List built-in and installed skills with license, revision and maturity'), post: operation('Install inert upstream files from an exact public Git commit', object({ source: string, revision: { type: 'string', pattern: '^[a-f0-9]{40}$' } })) },
  '/integrations/{integrationId}/enable': { post: operation('Enable task guidance after source/license review without granting executable code access', object({ reviewed: boolean })) },
  '/integrations/{integrationId}': { delete: operation('Remove an installation after its active runs have stopped; historical archives remain readable') },
  '/sources/{sourceId}': { get: operation('Read source evidence, access limitations and producing run/step links') },
  '/artifacts/{artifactId}': { get: operation('List exact artifact revisions') },
  '/artifacts/{artifactId}/draft': { get: operation('Read the latest saved version, labeled mutable/incomplete where applicable'), put: operation('Preserve an unsent editor draft without publishing a revision', object({ name: string, content: string, files: { type: 'array', items: object({ path: string, base64: string }) }, baseRevisionId: string, expectedLatestRevisionId: string }, ['content'])), delete: operation('Discard the unsent editing draft; published revisions remain immutable') },
  '/artifacts/{artifactId}/revisions/{revisionId}': { get: operation('Read exact hashed immutable bytes and provenance') },
};
for (const [path, item] of Object.entries(paths)) {
  const parameters = [...path.matchAll(/\{([^}]+)\}/g)].map(match => ({ in: 'path', name: match[1], required: true, schema: { type: 'string', format: 'uuid' } }));
  if (parameters.length) item.parameters = parameters;
}
export const openapi = {
  openapi: '3.1.0', info: { title: 'OpenLab local research API', version: '0.1.0-dev', description: 'Loopback only. Use the per-launch link to establish a local session. Mutations require Origin and x-openlab-csrf. Research records are authoritative; SSE attachment never starts work.' },
  servers: [{ url: '/api/v1' }], paths,
  components: {
    securitySchemes: { LocalSession: { type: 'apiKey', in: 'cookie', name: 'openlab_session' } },
    schemas: {
      Error: object({ error: string }),
      Project: object({ id: string, name: string, question: string, discipline: string, method: string, archived: boolean, createdAt: string }, ['id', 'name', 'archived', 'createdAt']),
      RunLimits: object({ turns: { type: 'integer', minimum: 1, maximum: 12 }, tokens: { type: 'integer', minimum: 1, maximum: 60000 }, durationMs: { type: 'integer', minimum: 1, maximum: 600000 }, callMs: { type: 'integer', minimum: 1, maximum: 90000 } }, []),
      ResearchContext: object({ runIds: { type: 'array', maxItems: 6, items: string }, messageIds: { type: 'array', items: string }, revisionId: string, requestedRevisionId: { type: ['string', 'null'] }, historyTruncated: boolean, reportTruncated: boolean }, ['runIds', 'messageIds', 'historyTruncated', 'reportTruncated']),
      Run: { type: 'object', properties: { id: string, projectId: string, conversationId: string, question: string, state: { enum: ['queued', 'running', 'awaiting_confirmation', 'awaiting_input', 'awaiting_permission', 'cancelling', 'succeeded', 'failed', 'cancelled', 'interrupted'] }, plan: { type: 'object' }, interaction: { type: 'object' }, config: { type: 'object', description: 'Public selection identifiers only' }, context: ref('ResearchContext') } },
      Archive: { type: 'object', required: ['schemaVersion', 'projectId', 'records', 'events', 'files'], properties: { schemaVersion: { enum: [1, 2], description: 'Exports use v2; imports accept v1 and v2.' }, projectId: string, records: { type: 'array', items: { type: 'object' } }, events: { type: 'array', items: { type: 'object' } }, files: { type: 'object', additionalProperties: string } } },
    },
  },
};
