# Application development

The [v0.1.0-alpha.1 source preview](https://github.com/IsaacHuo/OpenLab/releases/tag/v0.1.0-alpha.1) includes the React/assistant-ui research workspace, platform archive, generic Harness, supervised worker, local research API and document plugins. It is a source release with no installer. The historical v0.0.1 remains foundation-only. See [PLAN](../PLAN.md) for completed delivery stages and [acceptance](acceptance.md) for the preview boundary.

## Run checks

Use Node.js 24 and the committed npm lockfile:

```sh
npm ci
npm run check
npm run build
npm run test:browser
```

The check includes strict TypeScript validation, documentation validation and Node's test runner. Tests use temporary directories, controlled model responses and a substitute runtime; they require no provider credential or network service. Native Windows tests cover Unicode/space-containing paths and a separately spawned worker. GitHub CI runs the same checks on Windows and Linux.

Browser acceptance uses an installed Chrome through Playwright. Set `OPENLAB_BROWSER_CHANNEL` to another installed Chromium channel if necessary. The synthetic server uses a separate temporary data root and no provider credential. Tests cover desktop and 390-pixel drawers, plan confirmation, structured questions, denied access, report revisions, source/step links, conversation replay, cancellation, UTF-8 attachments and English/Chinese interaction. Axe checks the exercised screens for WCAG A/AA issues; this is automated evidence, not a complete accessibility certification.

The document scenarios also run real BusyTeX compilation and PDF.js checks. A cold compiler cache needs about 203 MB of pinned resources; this network setup is separate from the controlled research fixture and requires no model credential. See [plugin preparation](plugins.md#tex-compiler-and-pdf-preview) and the [verification record](verification.md) for cached local results, the historical CI failures and subsequent passing candidate/main checks. CI prepares the components before Playwright and retains failure evidence. The fixed font mirror keeps normal TLS checks and the original SHA-256 pin.

## Implemented core

- `app/contracts.ts` defines platform and replaceable model/tool/runtime boundaries.
- `app/harness.ts` implements the sequential loop, planning without tools, confirmation, context hooks, event acknowledgements, limits and cancellation signals.
- `app/platform.ts` owns projects, conversations, creation keys, persisted interactions, state transitions and restart reconciliation.
- `app/store.ts` owns SQLite metadata/events and ordinary immutable report files. File bytes are saved and synced before a revision becomes visible. Events and corresponding metadata changes share a transaction. Archives contain public research records and exact report bytes, with validated hashes and newly allocated identities on import.
- `app/runtime.ts` supervises an IPC child with an explicit environment and selected provider configuration. `app/worker.ts` hosts the generic loop. Loss of the parent channel terminates the worker; this process boundary is not a sandbox.
- `app/model.ts` parses an OpenAI-compatible Chat Completions SSE stream, including fragmented tool calls and reported usage. Incomplete streams and output-limit finishes fail rather than establish success. No automatic model retry is performed; a failed call requires explicit retry to avoid ambiguous duplicate billing.

SQLite uses `PRAGMA user_version=1`, the first development database schema. Portable archives are versioned separately: exports carry `schemaVersion: 2`, and imports accept versions 1 and 2. The archive v2 document records do not change the SQLite schema or require a database migration. See `app/store.ts` and the compatibility cases in `app/tests/documents.test.ts`. A future database schema change must back up existing archives and add migration/round-trip tests. Imported runs are historical, terminal and never dispatched. Imported records retain `originalId` for resolving exact report citations without rewriting report bytes.

## Optional live model check

`npm run test:live-model` uses `OPENLAB_SMOKE_API_KEY` to test DeepSeek Flash Chinese text streaming and a structured tool call. Run it explicitly; ordinary tests and CI do not use network credentials. The script prints only test results, public endpoint/model information and usage. It writes the same sanitized record to the ignored `.cache/live-model-smoke.json`.

On Windows, keep credentials encrypted with user-scoped Windows protection and pass the decrypted value only in the launching process environment. Do not put credentials in commands committed to the repository, project metadata, exports or test fixtures. The settings UI supplies protected provider creation, removal and capability checks. The Windows helper loads the system PowerShell module path explicitly, independently of a PowerShell Core host. The current DeepSeek configuration uses non-thinking mode; replay of private reasoning state is not implemented.

## Local research API

`npm start` starts the service on an available loopback port and prints a per-launch browser link. `OPENLAB_DATA_DIR` selects the local data/configuration root (default `.openlab`); `OPENLAB_PORT` selects a fixed port when needed. Projects are under the root's `projects` directory; protected provider settings and inert skill installations remain outside exported projects. Stop with Ctrl+C to cancel active workers before closing storage.

Build the browser bundle first with `npm run build`. A data-root ownership file prevents two control planes from modifying the same archive concurrently. A stale owner is reclaimed only after its process is absent. Saved records remain available after restart without executing previous decisions or model calls.

The launch link's fragment is exchanged for an HttpOnly, SameSite session cookie. API mutations require the matching origin and current `x-openlab-csrf` token. Host and origin checks reject remote origins. The bootstrap/session tokens rotate on every start. The service has no externally accessible listener or hosted account. The initial API is described in [OpenAPI JSON](openapi.json), also served at authenticated `/api/v1/openapi`.

Add providers through `/api/v1/providers`, then use their test operation to demonstrate streaming and structured calls before creating runs. Credentials use Windows user-scoped protection; persistent credential configuration is currently Windows-only. No plaintext persistence fallback is provided on Linux. Provider probes and plan generation consume model tokens. Crossref metadata retrieval requires internet access; it requires no provider key. The selected model and skill revision are frozen into each run's public configuration.

Crossref uses a fixed HTTPS endpoint with redirects disabled. General source reads require a source-specific permission and validate public HTTPS destinations at every redirect. A network using reserved fake DNS addresses can still retrieve from the fixed metadata provider, but general source reads are blocked rather than relaxing the destination policy. Public HTML/text access is recorded as fetched-page content; it does not establish full-publication access or claim support. PDF extraction is deferred.

Install a public Git skill repository by exact 40-character commit through `/api/v1/integrations`. Installation preserves original files and separate provenance, rejects links/submodules/traversal/Windows filename collisions, and executes no repository scripts. Inspect source, license and requirements before enabling the task guidance. The selected SKILL.md and explicitly linked text resources are bounded inert model context. Installation establishes L1 only; enabling is not evidence of a tested research task. The two independent automated repositories are synthetic fixtures; no Supervisor-Skills contents are bundled.

The isolated Git process disables ambient system/global configuration and hooks. On Windows it selects Git for Windows' OpenSSL backend with certificate verification enabled; this avoids a Schannel revocation lookup failure observed on the native test network. It does not turn off TLS certificate validation. Git and network availability remain installation prerequisites.

`npm run test:live-research` is a separate opt-in network test using `OPENLAB_SMOKE_API_KEY`. It runs economics/English and humanities/Chinese metadata-only tasks through the supervised worker, confirms their test plans, saves report revisions and checks archive round trips. Sanitized results and local public research exports remain in `.cache`. Permission requests for page reading are denied by this test; it does not claim full-text acceptance.

The AG-UI endpoint attaches to an already created run. It validates the route's run/thread identities and ignores client-supplied tools/state for execution purposes. SSE replay is read-only. Domain event cursors use canonical sequence numbers; AG-UI cursors use `sequence:projection-index` so reconnecting during a projected multi-event record does not lose its remaining events. Stream closure never starts, retries or cancels work.

The official assistant-ui adapter receives a platform-bound `HttpAgent`; its transport can only attach to the selected existing run. Remounting the conversation replays a fresh view rather than duplicating model work. Its local subscription abort is not a platform cancel. Decisions and explicit cancellation use separate platform commands. Sources and exact artifact revisions stay outside the UI library. Report Markdown ignores active HTML and external image embedding.

Attachments are copied, hashed and exported with the project. Preview UTF-8 text/Markdown and PNG/JPEG, while other formats remain inert downloads. A run snapshots the selected material identities; saved attachment bytes are checked again before use. The model receives bounded text excerpts; images are preview/download material in this version, not vision model input. Public source content and model interpretations retain separate evidence labels.

The limits apply to different bytes and operations:

| Operation | Limit | Code reference |
| --- | --- | --- |
| One material | 10,000,000 bytes (10 MB), before base64 encoding | `Store.material` in `app/store.ts` |
| Ordinary JSON request body | 32,000,000 bytes (32 MB) | Default `body` limit in `app/service.ts` |
| `POST /api/v1/import` JSON request body | 128,000,000 bytes (128 MB), including encoded files and records | Import route in `app/service.ts` |

MB here means 1,000,000 bytes. The import body limit is not a per-file allowance.

## Remaining application gates

The [acceptance matrix](acceptance.md) records the first preview's outcomes and limits. A second scholarly provider, successful public full-text access on this machine, broader compatibility, packaging and the later roadmap remain subsequent work. Current native Chrome evidence and live metadata tasks do not establish compatibility with every browser, model or scholarly provider.

Choose `Tool: metadata search` in the composer to invoke a scholarly tool directly without a model credential. It uses the same confirmed policy, sources, report and export format through a separate runtime adapter. The agent path still uses a selected, tested model and pinned skill. Removing a skill installation does not remove historical research records; active runs must stop first.

## Daily research workflow

Track this batch through [PLAN.md](../PLAN.md). An unauthenticated browser can paste the complete current launch link for the same local origin; a service restart invalidates previous launch credentials and sessions. Reconnecting only restores the session and subscriptions; it does not create a run. Project and conversation search, archived-project filtering, conversation rename and returning from a focused historical run are available in the workspace. Drafts stay scoped to conversations in session storage; selected conversation, historical run, report revision and material choices survive refresh in local storage.

`PATCH /conversations/{id}` changes only `name`. `POST /conversations/{id}/runs` accepts optional `contextRevisionId` and `materialIds`. The service chooses history itself and rejects client-supplied history/context/messages. Context freezes the same conversation's latest six terminal runs plus an exact report revision. History is limited to 40,000 characters and report excerpts to 20,000; truncation is visible, with no model summarization. Context contains no historical decisions, tool calls or authorization. Each new run still proposes and confirms its own plan. Optional context references are exported and remapped on import; schema-version-1 archives without these fields remain compatible.

In agent mode, omitted `materialIds` retains the existing project-material behavior and freezes the first request's set; an empty array uses none. Explicit arrays accept at most 50 unique project-owned IDs. The UI lets users select readable text, while images remain preview-only and other formats remain downloads. Uploads after run creation do not change its inputs. Text excerpts remain bounded at 20,000 characters per material and 60,000 total. The metadata-only runtime does not read materials or invoke a model.

`PATCH /providers/{id}` accepts `name`, `baseUrl`, `model` and `apiKey`. Blank credentials retain the protected value. Name-only changes retain capability results; connection or credential changes clear them. Active runs block provider editing. Validation and failed synchronous persistence preserve the previous settings and encrypted credential; public responses and project archives never include credentials. Errors remain `{ error: string }`, and the browser classifies HTTP/session/offline failures without automatic model retries. Explicit retries create a new linked run.

## Plugin document workspace

Current development source implements statically registered editor, preview, compilation and comparison providers. Default capabilities use the same registry as replacement implementations. Read the [plugin SDK](plugins.md) for capability registration, host access, preferences, drafts, optimistic revision saves, BusyTeX resource preparation, and portable archive version 2. No external executable plugin installer is included.

Manual document saves create immutable human revisions without changing Agent event history. LaTeX compilation runs in a browser Worker and records exact saved inputs; PDF previews are a separate provider. Editor/comparison/PDF/compiler code is lazy-loaded. Model compatibility remains independently verified; document editing and TeX compilation do not call a model.
