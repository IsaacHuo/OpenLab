# Architecture and research contracts

Status: accepted design for implementation, updated 2026-10-24. No application service, database, runtime adapter, or sandbox ships in v0.0.1. See [product behavior](product.md), [workspace](workspace.md), [Harness](harness.md), and the current [decision record](decisions/0002-workspace-and-harness.md).

## Deployment and component boundaries

Use a modular local service that serves the browser UI and platform API from one loopback origin. Keep persistence and execution behind the service. Start with one process for the control plane and a separately supervised agent runtime; do not introduce a distributed scheduler or message broker.

The intended implementation stack is TypeScript on Node.js 24 LTS, a React browser client, SQLite metadata, and ordinary project files. This is a design decision, not a list of installed product dependencies. OpenLab Harness is the first runtime; only its adapter may use Harness-specific contracts. Future external runtimes use the same boundary. Record exact dependency versions, licenses and compatibility before packaging.

The execution path is browser workspace → OpenLab API and AG-UI gateway → RuntimeAdapter → OpenLab Harness. The Platform provides authorized model, tool and artifact access through host services. Neither the browser nor the generic Harness loop owns the research archive. The [architecture diagram](../assets/docs/architecture.svg) depicts this planned arrangement.

| Component | Owns |
| --- | --- |
| Browser workspace | Project navigation, assistant-ui conversation, execution views, artifact/source previews, user decisions |
| Local control plane | Projects, conversations, canonical research records, credentials references, task state, policy, API authentication, exports |
| AG-UI gateway | Projection of persisted events into UI messages, tools, steps and shared state; read-only replay and subscription |
| Integration catalog and installer | Sources, immutable revisions, manifests, compatibility and license declarations |
| Runtime adapter | Runtime process health, execution sessions, event translation, user answers, permissions, abort, result collection |
| OpenLab Harness | Single-agent loop, replaceable model/tool/context implementations, pinned skill loading, controlled dispatch and runtime events |
| Retrieval tools | Provider queries, normalized source metadata, accessed content and verification evidence |
| Project store | Files, artifacts, sources, immutable run snapshots, checksums, export manifests |

The browser accesses runtime actions, models, tools and artifacts through the Platform. Runtime history is an execution aid, not the canonical research archive. Model adapters, scientific tools and UI components can change without changing project or export schemas. Harness remains usable with standalone host implementations of its interfaces.

## Local API and state

The planned API prefix is `/api/v1`; it offers project CRUD/archive/export, conversation/message access, integration inspection/install/remove, provider configuration/testing, run creation/confirmation/cancellation, interaction responses, artifact revision access, source access and a run event stream. Publish an OpenAPI definition with the first implementation. Platform-generated opaque IDs identify objects; clients do not provide arbitrary server filesystem paths.

State transitions are persisted before notifying the UI. Run states are `queued`, `awaiting_confirmation`, `running`, `awaiting_input`, `awaiting_permission`, `cancelling`, `succeeded`, `failed`, `cancelled`, and `interrupted`. A queued run enters `running` with a planning phase and no research tool access, then reaches `awaiting_confirmation`. Confirming the current plan returns to `running` with the approved tool scope; scoped permissions and structured answers resume the same run. First release permits one nonterminal run per conversation. Follow-ups after termination create a new run; retries also record `parentRunId`.

An interaction response identifies the persisted interaction and its version. Accept a valid answer once; an identical repeat returns the recorded decision, while contradictory, stale or terminal-run responses fail without dispatch. Confirmation binds the reviewed plan version and policy. Changed scope requires a new confirmation. A permission denial never authorizes the requested action. A denied request returns to the loop for an authorized alternative or a recorded failure.

Events have a platform-generated sequence per run, timestamp, kind and sanitized payload. Persist events and corresponding metadata transitions together before publishing them. Finalize artifact bytes and checksum before exposing a committed revision; storage failure stops new dispatch. Runtime sequence/session identifiers remain adapter metadata. The browser reconnects using a Platform cursor, and the service replays records without rerunning tools.

A restart reconciles runtime health before classifying a lost nonterminal execution as `interrupted`. It never automatically replays a task. Cancellation first records `cancelling`, stops new dispatch and aborts execution. Only confirmed termination records `cancelled`; an already committed completion wins a cancellation race. Closing a subscription does not request cancellation.

## AG-UI gateway contract

Use [AG-UI](https://docs.ag-ui.com/introduction) for frontend interaction, with HTTP SSE as the initial transport. The [official event reference](https://docs.ag-ui.com/concepts/events) supplies lifecycle, message, tool, step, state and custom event shapes. The Platform archive remains a versioned domain format, and RuntimeAdapter does not import protocol or UI types.

The following endpoint shapes are planned public contracts, not implemented routes:

| Operation | Contract |
| --- | --- |
| `POST /api/v1/conversations/{conversationId}/runs` | Persist the submitted message, selected configuration and new run; a client request key makes retried creation return the same run rather than duplicate model work |
| `GET /api/v1/conversations/{conversationId}` | Return persisted messages and run references for history/offline viewing |
| `GET /api/v1/runs/{runId}` | Return current run state, plan version, interactions, steps and artifact/source references |
| `POST /api/v1/runs/{runId}/confirm` | Confirm the reviewed plan version and capability policy |
| `POST /api/v1/runs/{runId}/interactions/{interactionId}/response` | Validate and persist a question answer or scoped permission decision before delivering it |
| `POST /api/v1/runs/{runId}/cancel` | Request cancellation independently of any browser subscription |
| `POST /api/v1/runs/{runId}/ag-ui` | Accept AG-UI `RunAgentInput` and attach to the existing run; return replay/live AG-UI events, never create or restart execution |
| `GET /api/v1/artifacts/{artifactId}/draft` | Read latest saved draft content and metadata, explicitly labeled mutable/incomplete with its saved version |
| `GET /api/v1/artifacts/{artifactId}/revisions/{revisionId}` | Read exact immutable content, checksum and provenance for the selected revision |
| `GET /api/v1/sources/{sourceId}` | Return source metadata, permitted supporting locations and linked runs/steps |

The frontend integration creates runs through the Platform command API, then connects the assistant-ui AG-UI adapter to the run endpoint. Set AG-UI `threadId` to the platform conversation ID and `runId` to the platform run ID; validate both against the route. Client messages, tool definitions, context and state in `RunAgentInput` cannot override the already persisted run, tool allowlist or policy. Repeated attach requests are read-only. Client answers travel through the interaction API, and tool execution stays server-side.

| Persisted fact | AG-UI projection and Platform meaning |
| --- | --- |
| Execution begins | `RUN_STARTED`; the scientific task is not yet complete or confirmed |
| Message text | `TEXT_MESSAGE_START`, `TEXT_MESSAGE_CONTENT`, `TEXT_MESSAGE_END` with stable message IDs |
| Tool activity and results | `TOOL_CALL_*` with stable tool-call IDs; argument streaming ending does not establish tool completion |
| Execution stages | `STEP_STARTED` / `STEP_FINISHED`; stable step ID maps to `stepName`, with a separate display label |
| Run state and pending interactions | `STATE_SNAPSHOT` / `STATE_DELTA`; nonterminal states remain nonterminal in the UI |
| Saved draft, committed revision or source update | Versioned OpenLab `CUSTOM` event with references to Platform objects |
| `succeeded` after result collection and persistence | `RUN_FINISHED`; execution success alone does not verify research claims |
| `failed`, `cancelled`, `interrupted` | `RUN_ERROR` with distinct `OPENLAB_FAILED`, `OPENLAB_CANCELLED`, or `OPENLAB_INTERRUPTED` code; display the recorded state rather than a generic failure label |
| Waiting for plan confirmation, an answer or permission | State update, no terminal lifecycle event; response continues the same logical run |
| HTTP EOF or connection loss | Transport status only; query/reconnect to discover the recorded run state |

This first gateway profile keeps a logical run open across human waits and uses Platform response commands. It does not require draft or extended AG-UI interrupt/resume lifecycle fields. Exactly one terminal lifecycle outcome follows persisted termination. Native gateway waiting and reconnect behavior must be verified against pinned client packages; a library's loading flag cannot replace the Platform state.

Research extensions use AG-UI `CUSTOM` with names `openlab.artifact.draft.updated.v1`, `openlab.artifact.revision.committed.v1` and `openlab.source.updated.v1`. Values carry `schemaVersion: 1`, platform sequence, project/run IDs, entity ID and applicable step/revision IDs. Draft updates also identify the saved draft version. Include only authorized summary metadata and references; fetch complete files through the artifact API. Ignore unsupported optional extensions without failing the message stream, and show unsupported content through its metadata/download path.

For reconnection, supply `forwardedProps.openlab.afterCursor` on the attach request; omission requests replay from the beginning. A cursor identifies the projection version, platform sequence and derived-event index, so one domain event may safely produce several protocol events. Assign SSE event IDs from that cursor. Persist the last applied cursor and discard duplicate projected events before applying text or artifact changes. This cursor is an OpenLab extension, not an AG-UI guarantee.

A surviving client resumes into its retained parser state. A fresh client loads earlier conversation history, clears the selected run's derived view and replays that run from the beginning to reconstruct open message/tool/step state; it must not append replay to an already materialized copy. A cursor from another run, a sequence gap or an unsupported projection version triggers a clean read-only replay. Bind replay and live subscription at a durable high-water mark so no events are missed between them. Full snapshot-and-suffix hydration can be optimized later once equivalent reconstruction is tested.

## Platform-owned objects

All exported records carry a `schemaVersion`. Timestamps are UTC ISO 8601 values; the client presents local time. Project paths inside records are relative to the project root.

| Object | Minimum persisted contract |
| --- | --- |
| Project | ID, title, question, discipline and method tags, timestamps, archive state, relative storage layout |
| Conversation | ID, project ID, title, timestamps and ordered message/run references; independent of UI-library threads |
| Message | ID, conversation ID, originating run when applicable, role, ordered typed content parts, timestamps, saved streaming/completion state, attachment/source/artifact references |
| Run | ID, project/conversation IDs, parent run, proposed/confirmed brief and plan version, state, integration revision, adapter/runtime version, model/provider identifiers, parameters without secrets, input hashes, policy snapshot, events, errors, artifact/source references |
| RunStep | Stable ID, run ID, display label, order, state, timestamps, tool-call and resulting source/artifact references |
| PendingInteraction | ID, run/step IDs, version, kind (plan confirmation, question or permission), prompt and allowed response schema/scope, state, recorded response and decision time |
| Artifact | ID, project ID, media type, description and draft/revision references; draft identifies producing run/step, saved version and incomplete status |
| ArtifactRevision | Immutable ID, artifact ID, project/run/step IDs, relative content path, SHA-256, creation time and source/claim associations |
| Source | ID, canonical URL/DOI or provider ID, bibliographic metadata, retrieval query/time/provider, content availability/hash, verification level, verifier and supporting excerpt/location when permitted |
| Integration | ID, category, upstream URL, author, revision, full source tree location, license declarations, dependencies, required capabilities, installation state, platform-specific maturity evidence |

Verification levels are `unverified`, `metadata_verified`, and `content_verified`. Source existence does not verify a claim. Claim-to-source associations also record whether the relationship is model-proposed or checked, who checked it, and where the supporting content was found. Hypotheses, model inference, observations, and checked claims remain separate artifact annotations.

An artifact can have revisions produced by different runs. Every committed revision links to its producing run and step; message citations and step/source links resolve by stable IDs, not UI text positions. Drafts remain explicitly mutable and their latest saved bytes remain available after failure or cancellation. Committing a revision freezes its bytes and provenance. Existing revision links never silently resolve to a newer version.

Store global catalog/configuration metadata under the user's application-data directory. Store projects in a user-selected data root with platform-managed subdirectories: `materials/`, `runs/`, `artifacts/`, and `sources/`. Keep SQLite metadata exportable into a versioned JSON manifest. Exports include conversations, messages, steps, interaction decisions, selected sources, saved drafts, immutable revisions, hashes and provenance; exclude credentials, global configuration, caches and runtime internals. Imported decisions are historical and cannot authorize a new run. Import verifies hashes and confines paths to the destination root. Schema migrations require a backup and round-trip compatibility test before an application release. This specification changes no existing persisted data because no application schema has shipped.

## Replaceable runtime adapter

The following is a design contract, not an implemented SDK:

```typescript
interface RuntimeAdapter {
  capabilities(): Promise<RuntimeCapabilities>;
  start(request: RunRequest): Promise<{ executionId: string }>;
  events(executionId: string, cursor?: string): AsyncIterable<RuntimeEvent>;
  replyInput(executionId: string, answer: InputAnswer): Promise<void>;
  replyPermission(executionId: string, decision: PermissionDecision): Promise<void>;
  cancel(executionId: string): Promise<void>;
  collect(executionId: string): Promise<ExecutionResult>;
}
```

`RunRequest` contains the platform run/conversation IDs, resolved workspace, immutable skill reference, task/brief, selected model, tool definitions and scoped host access. The initial policy permits planning without research tools. `InputAnswer` identifies a persisted interaction and version with a typed response; plan-confirmation input carries the approved plan/policy reference. `PermissionDecision` identifies the exact request and approved/denied scope. The Platform validates and persists both before delivery.

`RuntimeCapabilities` reports available tools, structured input, permissions, abort, event streaming and checkpoint support rather than assuming them. First Harness declares cross-restart checkpoints unavailable. `ExecutionResult` lists submitted files, source references, usage when available and terminal status; Platform validation/persistence precedes publication. `RuntimeEvent` translates messages, steps, tool activity, user questions, permission requests, usage, partial products and errors. Cancellation acknowledgement alone is not terminal completion.

The default implementation wraps [OpenLab Harness](harness.md). OpenCode and other runtimes are future optional adapters, subject to version-specific feasibility and licensing checks. Neither a direct assistant-ui runtime integration nor an upstream session store may bypass the Platform boundary. Native Windows is the validation target; WSL is an explicit optional compatibility mode with separate path mapping and configuration. Do not silently install WSL or claim native compatibility without the product feasibility tests.

## Integration and retrieval

Install generic Skill repositories from pinned revisions while preserving original files and references. Reject archive path traversal and links escaping the installation root. Installation does not execute upstream scripts. Keep OpenLab's wrapper metadata outside the upstream tree and provide source/license inspection before execution.

Only verified curated integrations receive default executable status. A URL import can be discoverable without being executable. Unknown repository code does not receive a shell or access to model secrets. Future arbitrary compute requires an OS-enforced isolation design; agent permission prompts alone are not a sandbox.

Initial retrieval adapters target public scholarly metadata APIs (Crossref and OpenAlex) and permitted public full-text URLs. Record actual provider coverage, failed requests, timeouts and rate limits. Metadata and full-text verification are separate. The generic retrieval contract returns normalized `Source` candidates plus retrieval evidence; it does not grant access to paywalled or private data. Research conclusions cite only available evidence at its recorded level.

## Trust and compatibility

- Bind the platform and any runtime HTTP listener to loopback. Use a per-launch authentication handshake, same-origin requests, origin/host validation, and CSRF protection for state changes; do not expose worker/provider credentials to the browser.
- Store model credentials using Windows user-scoped credential protection. Pass only the selected provider credential to an isolated runtime configuration; redact runtime errors and keep raw secrets out of run manifests.
- Prevent global user skills, hooks and configuration from leaking into a managed execution. Validate this behavior against the pinned runtime before declaring the integration executable.
- Confine project file operations through platform tools; disable arbitrary shell access in the literature release. Inspect resolved paths and links before reading, writing, or exporting files.
- Treat retrieved text as evidence, not authority to change policy. Tool permissions come from the platform/user, not a downloaded Skill or paper.
- Project files and research records must remain usable if the runtime or UI library is removed. Export/import tests, a second runtime test double, a substitute model and an independent AG-UI consumer are required evidence for that guarantee; none has been implemented yet.

Runtime log and research-record retention follow the separate [logging and provenance specification](logging.md). These application guarantees require implementation tests before being presented as shipped behavior.
