# OpenLab Harness: first runtime specification

Status: accepted implementation design, updated 2026-10-24. The repository contains no implemented Harness, SDK or runtime security boundary. [ADR 0002](decisions/0002-workspace-and-harness.md) selects this first runtime and supersedes the earlier OpenCode-first decision.

## Responsibility and first milestone

OpenLab Harness is the default, independently reusable agent execution component. It receives a task, assembles context, calls a selected model, dispatches authorized tools and reports execution events. OpenLab Platform owns projects, conversations, research records, credentials policy, sources and artifacts. A standalone host supplies equivalent interfaces without importing the Platform database or browser UI.

The first milestone is a single-agent literature task: question, proposed plan, confirmation, retrieval and reading, evidence organization, report generation, review and export. Research-specific tools and evidence policies live in a research extension. The generic execution loop does not contain scholarly-provider logic or a report schema.

Keep the execution core small. Register compatible implementations explicitly at startup and resolve a run's configuration before execution. Model, tool, loop, context and event storage implementations have separate interfaces. The first version does not need a dynamic plugin loader, hot reload, dependency resolver, distributed scheduler or general plugin marketplace.

## Modules and host interfaces

The names below describe design contracts; they are not published SDK symbols.

| Module | Contract and first implementation |
| --- | --- |
| Kernel and registry | Register implementations by category and version; validate required capabilities; coordinate lifecycle, cancellation and event delivery; reject missing or duplicate registrations before a run starts |
| Agent loop | Stream model output, validate proposed tool calls, await authorized results, update context and continue within limits; begin with one sequential agent and sequential tool dispatch |
| Model provider | Accept normalized messages, tool schemas, model settings and an abort signal; stream text, structured tool calls, usage when reported, and normalized errors; first live provider uses a configurable OpenAI-compatible endpoint with required streaming/tool-call capability checks |
| Tool executor | Discover approved named tools, validate input against their schemas, request policy decisions, invoke with scoped host capabilities and an abort signal, and emit results/errors; expose no arbitrary shell |
| Skill loader | Read a pinned skill tree and referenced resources from a host-provided installation; preserve upstream files and provenance; installation/loading does not execute scripts |
| Context strategy | Assemble task instructions, skill resources, material references and selected history within the model limit; record any trimming or summarization without modifying the archive |
| Event sink and state | Append ordered execution events and preserve pending interactions through host interfaces; Platform provides durable storage, while standalone/test hosts may supply a file-backed or in-memory implementation |
| Research extension | Provide retrieval/read tools, normalized sources, claim evidence associations, report draft publication and artifact submission through Platform services |

A run configuration selects exact registered implementations and versions, model/provider identifiers, pinned skill, available tools, context strategy and limits. No model or tool may switch itself to another provider or broader policy. The provider interface is independent of the loop; a second provider test double must exercise it without changing the loop or platform schema. An OpenAI-compatible label alone does not establish tool or streaming compatibility.

Limits include maximum model turns, per-call timeout and run duration, plus the user's available usage budget. Reaching a limit stops new dispatch and records why the run ended, preserving partial work. Unknown provider usage remains unknown. Do not promise a provider-independent hard billing cap. Bound retry counts, honor provider retry guidance and never automatically repeat a tool with uncertain side effects.

## Platform adapter and execution flow

Platform invokes the Harness through the same [RuntimeAdapter](architecture.md#replaceable-runtime-adapter) used for later external runtimes. This keeps Harness-specific objects out of projects, public APIs and exports. A separately supervised local worker hosts the first Harness; the control plane retains ownership of persistence and authorized service access. A worker process alone is not a sandbox.

1. Platform creates a run and immutable configuration snapshot, validates skill/model/tool requirements, and supplies selected host capabilities. Harness emits planning messages without research tool access.
2. Harness proposes a brief and plan and waits. Platform persists `awaiting_confirmation`; only a confirmed brief and policy enable research tools. Changes to requested scope return to confirmation.
3. For each model-requested tool call, validate its name and input, check the approved scope, and persist intent before dispatch. Routine in-scope retrieval proceeds without another prompt. Additional sensitive access requires a scoped permission request.
4. Retrieval and reading tools report actual evidence and failures. The research extension saves source records and report drafts through Platform, linking them to the producing step. Model statements do not upgrade verification status.
5. A structured question or permission request stops new model/tool dispatch until answered. Platform records the interaction and decision before delivering it to Harness. The waiting process may continue the same run; this does not promise a checkpoint that survives a lost process.
6. On completion, Platform collects results, validates referenced files, commits final artifact revisions and records terminal state before reporting success. Export and research review remain Platform functions.

Questions have a stable interaction ID, prompt, input kind (`text`, `single_choice`, or `multiple_choice`), permitted options when relevant, and any required constraint. Answers reference that ID. Permission requests additionally identify the tool/action and exact capability scope. Validate responses against the persisted request, accept each once, and reject stale or contradictory duplicates. A permission denial is delivered as a denial; the loop may use an authorized alternative or terminate with an explanation.

Events identify the platform run and step, preserve tool-call/message/interaction IDs, and carry sanitized payloads. Runtime sequence identifiers are adapter metadata; Platform assigns the canonical sequence. AG-UI translation occurs in the Platform gateway. Harness does not import assistant-ui, CopilotKit or an AG-UI client.

## Cancellation, recovery and trust

Cancellation stops new dispatch, propagates abort to model/tool requests and asks the worker to terminate. Platform first records `cancelling`, then records `cancelled` only when termination is confirmed. A completion that won the race remains completed; a cancellation request alone is not proof that work stopped. If the worker cannot confirm termination, the supervisor reconciles or terminates it before allowing a retry that could overlap. Partial artifacts and source records remain available.

If the control plane restarts, reconcile worker health and persisted state before classifying a nonterminal run. A lost execution becomes `interrupted`; a user retry creates a new run linked by `parentRunId`. Replaying events restores the interface only. It never invokes a model, replays an approval, republishes an artifact or reruns a tool. Cross-restart checkpoint recovery is deferred and must be advertised as unavailable by the first adapter.

Platform manages model credentials and tool configuration. Supply only the selected provider credential through an ephemeral worker configuration and only the authorized project/tool capabilities. Redact secrets from events and errors, disable ambient global skills/hooks/provider settings, and confine file operations to platform-managed paths. Do not expose a general filesystem, shell or arbitrary HTTP tool in the literature release. Retrieved documents, skills and model text cannot alter policy or grant access.

The first registry loads trusted application modules only. Untrusted executable plugins and arbitrary scientific computation need a separately verified isolation design. Tool approval prompts and a process boundary do not provide that isolation.

## Evolution and reference material

Later phases may add MCP adapters, additional model protocols, configurable loop strategies, checkpoint recovery, isolated scientific computation, multi-agent orchestration, remote environments and independently distributed plugins. Add them through measured requirements and capability declarations. OpenCode and other complete runtimes remain optional future RuntimeAdapter implementations; they need not adopt Harness internals.

The supplied Harness planning document motivates replaceable capabilities, event-driven execution, append-only records and configuration composition. Its references to DeepSeek Harness are architectural inspiration supplied by the project owner. No DeepSeek implementation, upstream API or license has been independently established here, and no upstream code is copied or bundled. Direct reuse requires separately verified source and license records.

## Implementation gates

- Validate native Windows execution, including Unicode and space-containing paths, isolated configuration, pinned skill resources, event ordering, questions, permissions, cancellation and worker loss. WSL remains an explicit optional mode, not an automatic installation step.
- Run a real literature task with the pinned model client and controlled retrieval tools. Record exact dependency versions/licenses, model capability checks, available usage, failures and the test date before claiming compatibility.
- Exercise a second generic skill fixture and resolve Supervisor-Skills licensing before distributing its contents. Installation must preserve resources without upstream-name special cases.
- Test the loop with substitute model, tool, context and event-sink implementations. Test a second RuntimeAdapter and independent AG-UI consumer against the Platform archive.
- Verify denied tool access, invalid tool arguments, malformed model output, bounded retries/limits, no tools before plan confirmation, stale answers, cancel races, persistence failures and explicit restart retry. Storage failure must stop new work rather than silently lose the research record.
- Meet the economics, humanities, language, evidence, offline and export/import cases in the [product](product.md) and [workspace](workspace.md) specifications. These gates require application implementation; repository checks do not establish them.
