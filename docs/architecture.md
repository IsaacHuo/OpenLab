# Architecture and research contracts

Status: accepted design for implementation. No application service, database, runtime adapter, or sandbox ships in v0.0.1. See [product behavior](product.md) and the [decision record](decisions/0001-foundation.md).

## Deployment and component boundaries

Use a modular local service that serves the browser UI and platform API from one loopback origin. Keep persistence and execution behind the service. Start with one process for the control plane and a separately supervised agent runtime; do not introduce a distributed scheduler or message broker.

The intended implementation stack is TypeScript on Node.js 24 LTS, a React browser client, SQLite metadata, and ordinary project files. This is a design decision, not a list of installed product dependencies. A runtime adapter is the only module allowed to use OpenCode-specific contracts. Existing runtime licensing and redistribution requirements must be checked before packaging.

| Component | Owns |
| --- | --- |
| Browser workspace | Navigation, forms, artifact preview, task events, user decisions |
| Local control plane | Project and integration metadata, credentials references, task state, policy, API authentication, exports |
| Integration catalog and installer | Sources, immutable revisions, manifests, compatibility and license declarations |
| Runtime adapter | Runtime process health, sessions, event translation, permissions, abort, result collection |
| Retrieval tools | Provider queries, normalized source metadata, accessed content and verification evidence |
| Project store | Files, artifacts, sources, immutable run snapshots, checksums, export manifests |

The browser does not call the runtime or model providers directly. The runtime's database and session history are useful execution aids, not the canonical research archive.

## Local API and state

The planned API prefix is `/api/v1`; it offers project CRUD/archive/export, integration inspection/install/remove, provider configuration/testing, run creation/confirmation/cancellation, permission responses, artifact access, and a run event stream. Publish an OpenAPI definition with the first implementation. Opaque IDs identify objects; clients do not provide arbitrary server filesystem paths.

State transitions are persisted before notifying the UI. Run states are `queued`, `awaiting_confirmation`, `running`, `awaiting_permission`, `cancelling`, `succeeded`, `failed`, `cancelled`, and `interrupted`. Permission decisions resume the same run; retries after a terminal state create a new run with a `parentRunId`. A restart reconciles runtime health before classifying any nonterminal run as interrupted. It never automatically replays a task.

Events have a platform-generated sequence number per run, timestamp, kind, and sanitized payload. The browser reconnects using the last sequence; the service replays persisted events without rerunning tools. Store runtime sequence/session identifiers as adapter metadata, not public object IDs.

## Platform-owned objects

All exported records carry a `schemaVersion`. Timestamps are UTC ISO 8601 values; the client presents local time. Project paths inside records are relative to the project root.

| Object | Minimum persisted contract |
| --- | --- |
| Project | ID, title, question, discipline and method tags, timestamps, archive state, relative storage layout |
| Run | ID, project ID, parent run, confirmed brief, state, integration revision, adapter/runtime version, model/provider identifiers, parameters without secrets, input hashes, policy snapshot, events, errors, artifact/source references |
| Artifact | ID, project/run IDs, media type, relative path, SHA-256, creation time, description, source and producing-step references |
| Source | ID, canonical URL/DOI or provider ID, bibliographic metadata, retrieval query/time/provider, content availability/hash, verification level, verifier and supporting excerpt/location when permitted |
| Integration | ID, category, upstream URL, author, revision, full source tree location, license declarations, dependencies, required capabilities, installation state, platform-specific maturity evidence |

Verification levels are `unverified`, `metadata_verified`, and `content_verified`. Source existence does not verify a claim. Claim-to-source associations also record whether the relationship is model-proposed or checked, who checked it, and where the supporting content was found. Hypotheses, model inference, observations, and checked claims remain separate artifact annotations.

Store global catalog/configuration metadata under the user's application-data directory. Store projects in a user-selected data root with platform-managed subdirectories: `materials/`, `runs/`, `artifacts/`, and `sources/`. Keep SQLite metadata exportable into a versioned JSON manifest. Exports include selected source files, hashes and provenance, and exclude credentials, global configuration, caches and runtime internals. Import verifies hashes and confines all paths to the destination root. Schema migrations require a backup and round-trip compatibility test before a new application release.

## Replaceable runtime adapter

The following is a design contract, not an implemented SDK:

```typescript
interface RuntimeAdapter {
  capabilities(): Promise<RuntimeCapabilities>;
  start(request: RunRequest): Promise<{ executionId: string }>;
  events(executionId: string, cursor?: string): AsyncIterable<RuntimeEvent>;
  replyPermission(executionId: string, decision: PermissionDecision): Promise<void>;
  cancel(executionId: string): Promise<void>;
  collect(executionId: string): Promise<ExecutionResult>;
}
```

`RunRequest` contains the platform run ID, resolved workspace, immutable skill reference, brief, selected model, approved tool set and policy. `RuntimeCapabilities` reports available tools, permissions, abort, event streaming, and checkpoint support rather than assuming them. `ExecutionResult` lists produced files, sources, usage when available, and terminal status. `RuntimeEvent` translates progress, tool activity, user questions, permission requests, usage and errors. Cancellation acknowledgement alone is not terminal completion.

OpenCode is the default implementation, using its [headless HTTP server and event interfaces](https://opencode.ai/docs/server/) and [skill loading](https://opencode.ai/docs/skills/). Generate the concrete client against the pinned runtime's published API rather than copying unversioned endpoint assumptions into platform contracts. The adapter translates upstream events and uses its permission and session-abort interfaces.

The official [Windows documentation](https://opencode.ai/docs/windows-wsl/) says native Windows is supported and recommends WSL for a better experience. Native Windows remains the initial validation target; WSL is an explicit optional compatibility mode, with separate path mapping and configuration. Do not silently install WSL or claim native compatibility without the feasibility tests in the product specification.

## Integration and retrieval

Install generic Skill repositories from pinned revisions while preserving original files and references. Reject archive path traversal and links escaping the installation root. Installation does not execute upstream scripts. Keep OpenLab's wrapper metadata outside the upstream tree and provide source/license inspection before execution.

Only verified curated integrations receive default executable status. A URL import can be discoverable without being executable. Unknown repository code does not receive a shell or access to model secrets. Future arbitrary compute requires an OS-enforced isolation design; agent permission prompts alone are not a sandbox.

Initial retrieval adapters target public scholarly metadata APIs (Crossref and OpenAlex) and permitted public full-text URLs. Record actual provider coverage, failed requests, timeouts and rate limits. Metadata and full-text verification are separate. The generic retrieval contract returns normalized `Source` candidates plus retrieval evidence; it does not grant access to paywalled or private data. Research conclusions cite only available evidence at its recorded level.

## Trust and compatibility

- Bind the platform and runtime to loopback. Use a per-launch authentication handshake, same-origin requests, origin/host validation, and CSRF protection for state changes; do not expose the runtime credential to the browser.
- Store model credentials using Windows user-scoped credential protection. Pass only the selected provider credential to an isolated runtime configuration; redact runtime errors and keep raw secrets out of run manifests.
- Prevent global user skills, hooks and configuration from leaking into a managed execution. Validate this behavior against the pinned runtime before declaring the integration executable.
- Confine project file operations through platform tools; disable arbitrary shell access in the literature release. Inspect resolved paths and links before reading, writing, or exporting files.
- Treat retrieved text as evidence, not authority to change policy. Tool permissions come from the platform/user, not a downloaded Skill or paper.
- Project files and research records remain usable if the runtime is removed. Export/import tests and a second adapter test double verify that guarantee.

Runtime log and research-record retention follow the separate [logging and provenance specification](logging.md). These application guarantees require implementation tests before being presented as shipped behavior.
