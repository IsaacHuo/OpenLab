# Product specification: first research release

Status: accepted design, not shipped application functionality. Updated 2026-10-24. The original [vision](vision.zh-CN.md) remains the long-term direction; this specification defines the first application milestone after the v0.0.1 foundation.

## Users and outcome

Serve public users across disciplines, including researchers who do not administer agent frameworks. Start with literature investigation, research-idea evaluation, and organizing evidence. Prioritize Windows, a locally started service, and a browser UI. No platform account or OpenLab-hosted model service is required.

Success means a user can create a project, configure their model and retrieval access, install a versioned skill, execute a real literature task, inspect its sources and failures, and export the result with an understandable research record. Conversation, execution state and developing artifacts stay visible together. OpenLab owns the records independently of the selected runtime, model, tools and UI. A polished report alone does not establish research quality.

## User journey and screens

| Screen | Required behavior |
| --- | --- |
| Setup and diagnostics | Check local service, runtime version, model connectivity, and retrieval capability; show actionable failures without exposing secrets |
| Projects | Create, rename, reopen, archive, and export projects; record questions, discipline, and method independently |
| Skill catalog | Show source, author, license declarations, pinned revision, dependencies, platform compatibility, and verified maturity |
| Model and retrieval settings | Add, test, select, and remove user-managed providers; credentials stay server-side |
| Project workspace | Project/conversation/run and tool/skill navigation on the left; assistant-ui conversation with execution state in the center; live artifacts on the right; copy attached material into the project and choose a skill/model |
| Run detail | Confirm the plan, see measured progress and source/tool events, answer structured questions, approve or deny scoped requests, and cancel; distinguish connection state from execution state |
| Artifacts and sources | Preview saved Markdown drafts, immutable report revisions, source records and supported attachments; follow citations and producing-step links; export files and machine-readable records |

English and Chinese are the initial application languages. Research output follows the user's requested language; retain original publication titles and identifiers. Keyboard operation, accessible form labels, readable error messages, and visible progress are first-release requirements. Desktop supports collapsing navigation and resizing the artifact pane; narrow screens use project and artifact drawers. The [workspace specification](workspace.md) defines states, interactions, previews and navigation. No runnable UI or rendered application screenshot is delivered by this documentation revision.

## Research execution

1. The researcher defines a question, intended audience, discipline, and available material.
2. The platform checks the selected skill's actual requirements. A literature survey cannot start without retrieval.
3. OpenLab Harness proposes a brief and plan using the selected model. Planning may use model tokens; the user confirms the current plan before research tool execution begins.
4. Execution runs within the approved project and capability policy. Additional access requests appear in the run detail.
5. The platform persists conversation messages, tool/step events, human decisions, source evidence, saved artifact drafts/revisions, and failures as execution proceeds. AG-UI projects these records into the workspace.
6. The user reviews and exports the result. Unverified statements remain distinguishable from retrieved and checked evidence.

Ordinary in-scope retrieval does not request confirmation on every call. Scope changes, additional sensitive access, and a higher user-defined spending limit require an explicit decision. Show reported model usage when available, mark unknown usage as unknown, and stop new model calls at the configured budget; do not claim a provider-independent hard billing cap.

## Scope and integration maturity

The first application release includes projects and conversations, a small curated catalog, generic Skill repository installation, the minimal self-developed OpenLab Harness behind RuntimeAdapter, provider configuration, retrieval, execution records and export. It supports selecting a tool directly and confirming an agent-proposed research plan. Harness starts with a single agent, replaceable model/tool/loop/context/storage interfaces, static registration, structured human input and cancellation. The first live model adapter targets a capability-checked OpenAI-compatible endpoint; other providers can implement the same interface. See [Harness](harness.md) and [ADR 0002](decisions/0002-workspace-and-harness.md).

First-release artifacts are Markdown reports, structured source records and supported attachment previews/downloads. Scientific charts, experiment code execution, Notebook rendering, visual workflow editing, scheduled discovery, arbitrary code execution, Python environment management, full research engines, multi-agent scheduling, remote compute, multi-user access and institutional deployment follow later. OpenCode becomes an optional future adapter. Dynamic plugin loading, hot reload and general dependency resolution are also deferred.

Use the five maturity levels from the vision: L0 discoverable, L1 installable, L2 executable, L3 composable, L4 reproducible. A successful test on one platform does not establish universal compatibility. Display the tested platform, runtime and integration versions, task, and date. Record repeatable inputs and execution conditions without promising deterministic model output.

Supervisor-Skills is the initial reference case. Preserve its original directory and reference resources and keep OpenLab metadata separate. The generic installer must also handle a second independent fixture repository without special-casing the upstream name. Resolve the [license declarations](../THIRD_PARTY_NOTICES.md) before distributing its contents.

## Failure behavior

- Missing credentials or tools: stop before research execution and provide setup instructions.
- Retrieval unavailable or blocked: preserve partial work and failed requests; allow an explicitly labeled material-only task, but do not call it a verified literature survey.
- Metadata found without full-text access: record metadata verification only. Do not infer that a paper supports a claim from its title or existence.
- Runtime crash or computer restart: reconcile worker health, retain messages, sources, saved drafts and revisions, mark a lost run interrupted, and offer a new linked retry. Do not silently replay potentially billable or side-effectful calls.
- Cancellation: stop dispatching new work, abort the runtime session, and distinguish a requested cancellation from confirmed termination.
- Waiting for input or permission: persist the request; apply a validated response once to the same run. Denial does not execute the requested action. Expired or terminal-run decisions cannot resume execution.
- Lost connection or closed page: execution continues independently. Reconnect by replaying persisted events without starting new work or duplicating text/results; never infer success from stream closure.
- Persistence failure: stop new dispatch and show the storage error; do not publish a committed revision whose bytes or provenance have not been saved.
- Provider limits: record the error, honor provider retry guidance within a bounded attempt count, and avoid duplicate artifact publication.

## Acceptance and roadmap

| Milestone | Exit criteria |
| --- | --- |
| v0.0.1 foundation | Governance files, live GitHub settings, checks, specifications, and traceable source release |
| Runtime feasibility | On native Windows, validate Harness skill loading, model/tool interfaces, isolated configuration, plan confirmation, scoped tools, questions/permissions, source events, cancellation, Unicode/space-containing paths, persistence and process restart; document any WSL-only capability |
| v0.1.0-alpha.1 research loop | A new user completes setup and the full journey; real retrieval and artifact export pass the cases below |
| Capability interconnection | Multiple adapters exchange structured research objects with recorded compatibility |
| Research infrastructure | Long-running compute, environment capture, provenance, and tested reproduction workflows |
| Open ecosystem | Contributor-maintained integrations, discipline packs, benchmarks, and independent registries |

The application acceptance suite must cover an economics question and a humanities/text-research question, an empty retrieval result, contradictory evidence, an inaccessible full text, invalid credentials, a cancelled run, restart after interruption, offline project viewing and export/import integrity. Check both Chinese and English interactions. Use controlled fixtures for repeatable automation and a separately recorded live retrieval smoke test.

Also cover live artifact updates, exact-revision and citation/step navigation, structured answers, denied permissions, stale/duplicate decisions, cancellation races, connection replay without duplicate work, and keyboard-accessible desktop/drawer layouts. Prove the adapter boundary with a second runtime test double, a substitute model provider and an independent AG-UI consumer. Archives must remain readable/exportable without the original runtime or assistant-ui. Detailed requirements are in the [workspace acceptance matrix](workspace.md#application-acceptance-scenarios); current implementation evidence and remaining gates are in [verification](verification.md) and the [implementation plan](implementation-plan.md).
