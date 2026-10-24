# Logging, provenance, and diagnostic exports

Status: implementation specification. v0.0.1 supplies repository and CI logs; application logging described here will ship with the corresponding runtime modules.

## Three different records

| Record | Purpose | Default contents |
| --- | --- | --- |
| Operational log | Diagnose platform health | Structured events, sanitized errors, timing and correlation IDs |
| Research execution record | Understand and review a research result | Conversations, plan/confirmation, versions, steps/tools, human decisions, sources, artifact drafts/revisions and limitations |
| CI and release log | Verify a repository change | Check results, workflow run and commit, release validation and publication outcome |

Operational logs must not become a duplicate research archive. A failed or negative scientific result remains in the research record rather than disappearing with log rotation.

## Operational log contract

Write UTF-8 JSON Lines with UTC timestamps. Required keys are `timestamp`, `level`, `module`, `event` and `message`; include `projectId`, `runId`, `phase`, `durationMs` and a sanitized `error.code` when applicable. Levels are debug, info, warn and error. Default to info.

```json
{
  "timestamp": "2026-10-24T08:00:00.000Z",
  "level": "warn",
  "module": "retrieval",
  "event": "provider_timeout",
  "projectId": "example-project",
  "runId": "example-run",
  "phase": "search",
  "message": "The metadata request timed out.",
  "error": { "code": "RETRIEVAL_TIMEOUT" }
}
```

The example is synthetic. Never log credentials, authorization headers, full prompts or responses, document bodies, personal data, or source URL query tokens. Prefer allowlisted event fields over redacting arbitrary objects after serialization. Convert absolute user paths to project-relative paths or omit them. Sanitize provider and runtime error text before persistence; debug mode does not disable secret filtering.

Defaults: rotate at 10 MiB per file, retain the active file plus at most five archives, and remove operational files older than 14 days. Expose log location, level, retention and deletion in settings. Storage errors must be visible without recursively generating more logs. User-initiated research-record deletion is separate from log cleanup.

## Research provenance

For each run preserve the proposed and confirmed brief/plan version, conversation and message IDs/content, integration revision and hash, runtime/adapter versions, model/provider identifiers, non-secret parameters, available usage, input hashes, ordered steps/tool calls with appropriate redaction, source evidence, saved artifact drafts, immutable revisions and hashes, decisions, terminal state, errors and limitations. Mark unavailable values as unknown rather than reconstructing them from memory. Research conversations are project content and must not be duplicated into operational logs.

Preserve question/permission prompts, scoped requests, interaction versions, accepted responses, denial/cancellation decisions and their timestamps. A user-facing activity summary may be recorded; hidden model reasoning is not required research evidence. Imported or replayed decisions are historical and cannot grant new access. Runtime identity and session pointers are diagnostic metadata, not the identifiers of Platform research objects.

The canonical event sequence is append-only per run. Persist state transitions and events before projecting them through AG-UI. Retain the projection version for cursor interpretation; replay reconstructs views without invoking tools or models. HTTP closure, a pending question and confirmed execution termination must remain distinguishable. A requested cancellation and its confirmed result are separate records.

Every artifact revision preserves producing run/step IDs, source and claim associations, relative content path and SHA-256. Keep immutable revisions even when a later run produces a replacement. Save streaming content as an explicitly mutable draft with its saved version/sequence, and retain the latest saved partial draft after failure, cancellation or interruption. Artifact/source events refer to these objects rather than embedding whole files. Exports snapshot draft bytes with a checksum and incomplete label; this does not make the live draft a committed revision.

Source records distinguish metadata existence from content verification. Claim associations identify a checked supporting location or explicitly remain unverified/model-proposed. Preserve conflicting evidence, failed retrieval, insignificant results and abandoned hypotheses. A model's self-attestation is recorded as such; it does not upgrade a source or claim to verified.

Research records remain until the user deletes the project or selected record. Attached research material may be sensitive and lives only in the project store by default. Do not send it to telemetry. No automatic telemetry or remote diagnostic upload is planned for the first application release.

## Diagnostic export

Diagnostic bundles are local, user-initiated exports. Show a preview and require an explicit selection before including any research content. By default include platform/runtime versions, operating-system family, relevant sanitized error events, configuration field names without values, and check outcomes. Exclude credentials, source documents, model conversations, full source URLs, global filesystem paths and full run payloads.

Build the bundle from allowlisted fields, run a second secret-pattern check, and let the user review the result before sharing. An automated scan does not guarantee that no sensitive text remains. Writing a diagnostic bundle never uploads it or files an issue automatically.

## Implementation verification

Test log rotation and age cleanup, disabled/debug logging, malformed provider errors, nested token fields, URLs containing credentials, Unicode paths, disk-full behavior, and diagnostic exclusion of a synthetic credential and private document. Verify that cleanup leaves research records intact and that a failed run retains sources and partial artifacts. Match the [research contracts](architecture.md) in export/import tests, including messages, steps, decision history, draft labels and revision hashes.

Test event ordering and deduplication on reconnect, a storage error before publication, question/permission response races, cancellation versus completion, and restart reconciliation. Confirm that replay/import does not execute calls or apply historical approvals, and that an independent reader can inspect the archive after removing the original runtime and UI library. These checks require future application code; the current repository checks validate documentation and tooling only.
