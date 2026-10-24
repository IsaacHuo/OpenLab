# Application development

The v0.0.1 release remains foundation-only. Current source starts the first application milestone with a platform archive, generic Harness and supervised worker. There is no browser application or installer yet. Follow the [implementation plan](implementation-plan.md) for remaining gates.

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

## Remaining application gates

Retrieval, generic pinned skill installation, protected provider settings, HTTP authentication, AG-UI projection, the React/assistant-ui workspace, attachments and full research acceptance remain pending. Core fixture tests and the narrow live model probes do not establish completion of those gates. See [verification](verification.md) for recorded outcomes.
