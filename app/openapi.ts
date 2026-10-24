const json = (schema: object) => ({ 'application/json': { schema } });
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const object = (properties: object, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });
const string = { type: 'string' };
const boolean = { type: 'boolean' };
const response = (schema: object = { type: 'object' }) => ({ description: 'Persisted platform result', content: json(schema) });
const operation = (summary: string, request?: object, result?: object) => ({ summary, security: [{ LocalSession: [] }], ...(request ? { requestBody: { required: true, content: json(request) } } : {}), responses: { '200': response(result), '201': response(result), '400': response(ref('Error')), '401': response(ref('Error')), '403': response(ref('Error')), '409': response(ref('Error')) } });
const paths: Record<string, Record<string, unknown>> = {
  '/session': { post: { ...operation('Exchange the per-launch bootstrap token for an HttpOnly local session'), security: [], parameters: [{ in: 'header', name: 'x-openlab-bootstrap', required: true, schema: string }] }, get: operation('Read current CSRF token') },
  '/setup': { get: operation('Read local runtime diagnostics and public provider configuration') },
  '/projects': { get: operation('List local projects', undefined, { type: 'array', items: ref('Project') }), post: operation('Create a project', object({ name: string }), ref('Project')) },
  '/projects/{projectId}': { get: operation('Read project, conversations, runs, sources and artifacts'), patch: operation('Rename, archive or reopen a project', object({ name: string, archived: boolean }, []), ref('Project')) },
  '/projects/{projectId}/conversations': { post: operation('Create a conversation', object({ name: string }, [])) },
  '/projects/{projectId}/export': { get: operation('Download a versioned portable research archive', undefined, ref('Archive')) },
  '/import': { post: operation('Verify and import an archive as historical records with new identities', ref('Archive')) },
  '/conversations/{conversationId}': { get: operation('Read platform-owned messages and run history') },
  '/conversations/{conversationId}/runs': { post: operation('Create a run once per request key; planning can incur model usage', object({ question: string, requestKey: string, providerId: string, skillId: string, language: { enum: ['en', 'zh'] }, parentRunId: string }, ['question', 'requestKey', 'providerId']), ref('Run')) },
  '/runs/{runId}': { get: operation('Read persisted run state and ordered events', undefined, ref('Run')) },
  '/runs/{runId}/confirm': { post: operation('Confirm the current plan and its reviewed tool policy', object({ version: { type: 'integer', minimum: 1 } })) },
  '/runs/{runId}/interactions/{interactionId}/response': { post: operation('Persist a validated question or scoped permission decision once', object({ version: { type: 'integer' }, value: {} })) },
  '/runs/{runId}/cancel': { post: operation('Request cancellation and await confirmed runtime termination') },
  '/runs/{runId}/events': { get: { ...operation('Replay and subscribe to ordered domain events; never dispatch execution'), parameters: [{ in: 'query', name: 'cursor', schema: { type: 'integer', minimum: 0 } }, { in: 'header', name: 'Last-Event-ID', schema: string }], responses: { '200': { description: 'SSE; id is the canonical sequence', content: { 'text/event-stream': { schema: string } } } } } },
  '/runs/{runId}/ag-ui': { post: { ...operation('Attach an AG-UI consumer to an existing run; client state cannot change policy', object({ threadId: string, runId: string, messages: { type: 'array', items: {} }, tools: { type: 'array', items: {} }, context: { type: 'array', items: {} }, state: {}, forwardedProps: {} }, ['threadId', 'runId'])), parameters: [{ in: 'header', name: 'Last-Event-ID', schema: { type: 'string', pattern: '^\\d+(?::\\d+)?$' } }], responses: { '200': { description: 'AG-UI SSE; id is sequence:projection-index', content: { 'text/event-stream': { schema: string } } } } } },
  '/providers': { get: operation('List public provider configuration; no credentials'), post: operation('Store a user provider credential with Windows user-scoped protection', object({ name: string, baseUrl: string, model: string, apiKey: { type: 'string', writeOnly: true }, thinkingDisabled: boolean }, ['name', 'baseUrl', 'model', 'apiKey'])) },
  '/providers/{providerId}': { delete: operation('Remove an unused provider and its protected credential') },
  '/providers/{providerId}/test': { post: operation('Verify real streaming and structured tool calls; uses provider tokens') },
  '/integrations': { get: operation('List built-in and installed skills with license, revision and maturity'), post: operation('Install inert upstream files from an exact public Git commit', object({ source: string, revision: { type: 'string', pattern: '^[a-f0-9]{40}$' } })) },
  '/integrations/{integrationId}/enable': { post: operation('Enable task guidance after source/license review without granting executable code access', object({ reviewed: boolean })) },
  '/sources/{sourceId}': { get: operation('Read source evidence, access limitations and producing run/step links') },
  '/artifacts/{artifactId}': { get: operation('List exact artifact revisions') },
  '/artifacts/{artifactId}/draft': { get: operation('Read the latest saved version, labeled mutable/incomplete where applicable') },
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
      Project: object({ id: string, name: string, archived: boolean, createdAt: string }),
      Run: { type: 'object', properties: { id: string, projectId: string, conversationId: string, question: string, state: { enum: ['queued', 'running', 'awaiting_confirmation', 'awaiting_input', 'awaiting_permission', 'cancelling', 'succeeded', 'failed', 'cancelled', 'interrupted'] }, plan: { type: 'object' }, interaction: { type: 'object' }, config: { type: 'object', description: 'Public selection identifiers only' } } },
      Archive: { type: 'object', required: ['schemaVersion', 'projectId', 'records', 'events', 'files'], properties: { schemaVersion: { const: 1 }, projectId: string, records: { type: 'array', items: { type: 'object' } }, events: { type: 'array', items: { type: 'object' } }, files: { type: 'object', additionalProperties: string } } },
    },
  },
};
