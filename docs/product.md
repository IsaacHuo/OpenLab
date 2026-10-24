# Product specification: first research release

Status: accepted design, not shipped application functionality. Updated 2026-10-24. The original [vision](vision.zh-CN.md) remains the long-term direction; this specification defines the first application milestone after the v0.0.1 foundation.

## Users and outcome

Serve public users across disciplines, including researchers who do not administer agent frameworks. Start with literature investigation, research-idea evaluation, and organizing evidence. Prioritize Windows, a locally started service, and a browser UI. No platform account or OpenLab-hosted model service is required.

Success means a user can create a project, configure their model and retrieval access, install a versioned skill, execute a real literature task, inspect its sources and failures, and export the result with an understandable research record. A polished report alone does not establish research quality.

## User journey and screens

| Screen | Required behavior |
| --- | --- |
| Setup and diagnostics | Check local service, runtime version, model connectivity, and retrieval capability; show actionable failures without exposing secrets |
| Projects | Create, rename, reopen, archive, and export projects; record questions, discipline, and method independently |
| Skill catalog | Show source, author, license declarations, pinned revision, dependencies, platform compatibility, and verified maturity |
| Model and retrieval settings | Add, test, select, and remove user-managed providers; credentials stay server-side |
| Project workspace | Attach local material by copying it into the project; choose a skill and model; inspect the proposed research brief and required capabilities |
| Run detail | Confirm the plan, see task progress and source/tool events, answer runtime questions, approve scoped requests, and cancel |
| Artifacts and sources | Preview Markdown and source metadata; identify claim verification level, failed retrieval, limitations, and originating run; export files and machine-readable records |

English and Chinese are the initial application languages. Research output follows the user's requested language; retain original publication titles and identifiers. Keyboard operation, accessible form labels, readable error messages, and visible progress are first-release requirements. UI visual design is a later implementation task, not an asset delivered by v0.0.1.

## Research execution

1. The researcher defines a question, intended audience, discipline, and available material.
2. The platform checks the selected skill's actual requirements. A literature survey cannot start without retrieval.
3. The agent proposes a brief and plan. The user confirms it before research tool execution begins.
4. Execution runs within the approved project and capability policy. Additional access requests appear in the run detail.
5. The platform persists tool events, source metadata, verification status, artifacts, and failure information as execution proceeds.
6. The user reviews and exports the result. Unverified statements remain distinguishable from retrieved and checked evidence.

Ordinary in-scope retrieval does not request confirmation on every call. Scope changes, additional sensitive access, and a higher user-defined spending limit require an explicit decision. Show reported model usage when available, mark unknown usage as unknown, and stop new model calls at the configured budget; do not claim a provider-independent hard billing cap.

## Scope and integration maturity

The first application release includes projects, a small curated catalog, generic Skill repository installation, one OpenCode adapter, provider configuration, retrieval, execution records, and export. It supports selecting a tool directly and confirming an agent-proposed research plan. Visual workflow editing, scheduled discovery, arbitrary code execution, Python environment management, full research engines, remote compute, multi-user access, and institutional deployment follow later.

Use the five maturity levels from the vision: L0 discoverable, L1 installable, L2 executable, L3 composable, L4 reproducible. A successful test on one platform does not establish universal compatibility. Display the tested platform, runtime and integration versions, task, and date. Record repeatable inputs and execution conditions without promising deterministic model output.

Supervisor-Skills is the initial reference case. Preserve its original directory and reference resources and keep OpenLab metadata separate. The generic installer must also handle a second independent fixture repository without special-casing the upstream name. Resolve the [license declarations](../THIRD_PARTY_NOTICES.md) before distributing its contents.

## Failure behavior

- Missing credentials or tools: stop before research execution and provide setup instructions.
- Retrieval unavailable or blocked: preserve partial work and failed requests; allow an explicitly labeled material-only task, but do not call it a verified literature survey.
- Metadata found without full-text access: record metadata verification only. Do not infer that a paper supports a claim from its title or existence.
- Runtime crash or computer restart: keep completed artifacts, mark the run interrupted, and offer a new linked retry. Do not silently replay potentially billable or side-effectful calls.
- Cancellation: stop dispatching new work, abort the runtime session, and distinguish a requested cancellation from confirmed termination.
- Provider limits: record the error, honor provider retry guidance within a bounded attempt count, and avoid duplicate artifact publication.

## Acceptance and roadmap

| Milestone | Exit criteria |
| --- | --- |
| v0.0.1 foundation | Governance files, live GitHub settings, checks, specifications, and traceable source release |
| Runtime feasibility | On native Windows, validate skill loading, scoped tools, permission response, source events, cancellation, Unicode/space-containing paths, and process restart; document any WSL-only capability |
| v0.1.0-alpha.1 research loop | A new user completes setup and the full journey; real retrieval and artifact export pass the cases below |
| Capability interconnection | Multiple adapters exchange structured research objects with recorded compatibility |
| Research infrastructure | Long-running compute, environment capture, provenance, and tested reproduction workflows |
| Open ecosystem | Contributor-maintained integrations, discipline packs, benchmarks, and independent registries |

The application acceptance suite must cover an economics question and a humanities/text-research question, an empty retrieval result, contradictory evidence, an inaccessible full text, invalid credentials, a cancelled run, restart after interruption, offline project viewing, export/import integrity, and a second runtime test double proving the adapter boundary. Check both Chinese and English interactions. Use controlled fixtures for repeatable automation and a separately recorded live retrieval smoke test.
