# Application development

The v0.0.1 release remains foundation-only. Current source includes a platform archive, generic Harness, supervised worker and local research API. There is no browser workspace build or installer yet. Follow the [implementation plan](implementation-plan.md) for remaining gates.

## Run checks

Use Node.js 24 and the committed npm lockfile:

```sh
npm ci
npm run check
```

The check includes strict TypeScript validation, documentation validation and Node's test runner. Tests use temporary directories, controlled model responses and a substitute runtime; they require no provider credential or network service. Native Windows tests cover Unicode/space-containing paths and a separately spawned worker. GitHub CI runs the same checks on Windows and Linux.

## Implemented core

- `app/contracts.ts` defines platform and replaceable model/tool/runtime boundaries.
- `app/harness.ts` implements the sequential loop, planning without tools, confirmation, context hooks, event acknowledgements, limits and cancellation signals.
- `app/platform.ts` owns projects, conversations, creation keys, persisted interactions, state transitions and restart reconciliation.
- `app/store.ts` owns SQLite metadata/events and ordinary immutable report files. File bytes are saved and synced before a revision becomes visible. Events and corresponding metadata changes share a transaction. Archives contain public research records and exact report bytes, with validated hashes and newly allocated identities on import.
- `app/runtime.ts` supervises an IPC child with an explicit environment and selected provider configuration. `app/worker.ts` hosts the generic loop. Loss of the parent channel terminates the worker; this process boundary is not a sandbox.
- `app/model.ts` parses an OpenAI-compatible Chat Completions SSE stream, including fragmented tool calls and reported usage. Incomplete streams and output-limit finishes fail rather than establish success. No automatic model retry is performed; a failed call requires explicit retry to avoid ambiguous duplicate billing.

SQLite schema version 1 is the first development schema; no migration from a shipped application schema is required. A future schema change must back up existing archives and add migration/round-trip tests. Imported runs are historical, terminal and never dispatched. Imported records retain `originalId` for resolving exact report citations without rewriting report bytes.

## Optional live model check

`npm run test:live-model` uses `OPENLAB_SMOKE_API_KEY` to test DeepSeek Flash Chinese text streaming and a structured tool call. Run it explicitly; ordinary tests and CI do not use network credentials. The script prints only test results, public endpoint/model information and usage. It writes the same sanitized record to the ignored `.cache/live-model-smoke.json`.

On Windows, keep credentials encrypted with user-scoped Windows protection and pass the decrypted value only in the launching process environment. Do not put credentials in commands committed to the repository, project metadata, exports or test fixtures. The application credential/settings interface remains a later implementation item.

## Local research API

`npm start` starts the service on an available loopback port and prints a per-launch browser link. `OPENLAB_DATA_DIR` selects the local data/configuration root (default `.openlab`); `OPENLAB_PORT` selects a fixed port when needed. Projects are under the root's `projects` directory; protected provider settings and inert skill installations remain outside exported projects. Stop with Ctrl+C to cancel active workers before closing storage.

The launch link's fragment is exchanged for an HttpOnly, SameSite session cookie. API mutations require the matching origin and current `x-openlab-csrf` token. Host and origin checks reject remote origins. The bootstrap/session tokens rotate on every start. The service has no externally accessible listener or hosted account. The initial API is described in [OpenAPI JSON](openapi.json), also served at authenticated `/api/v1/openapi`.

Add providers through `/api/v1/providers`, then use their test operation to demonstrate streaming and structured calls before creating runs. Credentials use Windows user-scoped protection; persistent credential configuration is currently Windows-only. No plaintext persistence fallback is provided on Linux. Provider probes and plan generation consume model tokens. Crossref metadata retrieval requires internet access; it requires no provider key. The selected model and skill revision are frozen into each run's public configuration.

Crossref uses a fixed HTTPS endpoint with redirects disabled. General source reads require a source-specific permission and validate public HTTPS destinations at every redirect. A network using reserved fake DNS addresses can still retrieve from the fixed metadata provider, but general source reads are blocked rather than relaxing the destination policy. Public HTML/text access is recorded as fetched-page content; it does not establish full-publication access or claim support. PDF extraction is deferred.

Install a public Git skill repository by exact 40-character commit through `/api/v1/integrations`. Installation preserves original files and separate provenance, rejects links/submodules/traversal/Windows filename collisions, and executes no repository scripts. Inspect source, license and requirements before enabling the task guidance. The selected SKILL.md and explicitly linked text resources are bounded inert model context. Installation establishes L1 only; enabling is not evidence of a tested research task. The two independent automated repositories are synthetic fixtures; no Supervisor-Skills contents are bundled.

`npm run test:live-research` is a separate opt-in network test using `OPENLAB_SMOKE_API_KEY`. It runs economics/English and humanities/Chinese metadata-only tasks through the supervised worker, confirms their test plans, saves report revisions and checks archive round trips. Sanitized results and local public research exports remain in `.cache`. Permission requests for page reading are denied by this test; it does not claim full-text acceptance.

The AG-UI endpoint attaches to an already created run. It validates the route's run/thread identities and ignores client-supplied tools/state for execution purposes. SSE replay is read-only. Domain event cursors use canonical sequence numbers; AG-UI cursors use `sequence:projection-index` so reconnecting during a projected multi-event record does not lose its remaining events. Stream closure never starts, retries or cancels work.

## Remaining application gates

The React/assistant-ui workspace, attachments, a second scholarly provider and full application acceptance remain pending. Browser compatibility and successful public full-text access have not been established. Fixture tests and the live metadata probes do not establish completion of those gates. See [verification](verification.md) for recorded outcomes.
