# Research workspace specification

Status: accepted implementation design, updated 2026-10-24. No workspace application ships in historical v0.0.1; current development implementation and native browser evidence are described in [development](development.md) and [verification](verification.md). This document defines the first UI against the [product specification](product.md), [platform contracts](architecture.md), and [Harness specification](harness.md).

## Research work stays visible

The workspace combines conversation, agent execution state, and live research artifacts. A researcher should be able to ask a question, understand what is happening, inspect the evidence, and keep using the result after changing a runtime or model. OpenLab is an open research platform, not a wrapper around a single agent framework.

The supplied OpenLab layout is the structural reference: a project sidebar, a central conversation with execution progress, and an artifact pane. Its example performance chart is illustrative and does not establish an experiment capability. Use OpenLab's existing vector brand assets.

| Region | First-release contents and actions |
| --- | --- |
| Left: workspace | New research, project selection, conversations and run history within the selected project, tools and Skills, settings |
| Center: conversation and execution | Question and attachments, selected model and skill, proposed brief and plan, streaming messages, current stage, tool activity, pending questions and permission requests, cancellation |
| Right: research artifacts | Artifact list, selected revision preview, report citations, source metadata and verification status, originating run and step, export |

A project can contain multiple conversations; a conversation can contain multiple runs. Selecting an old run shows its own state and products without relabeling them as the latest run. First release allows one active run per conversation; a follow-up during execution is saved as an unsent composer draft. Answers to a pending question use its dedicated form. Starting another run requires the active run to finish or cancellation to be confirmed.

Desktop shows all three regions, with a collapsible left sidebar and a keyboard-adjustable divider for the artifact pane. On narrow screens the conversation is the main view; projects and artifacts open in labeled drawers. Preserve the selected project, run, artifact revision, and composer draft across layout changes. Opening a citation on a narrow screen opens the artifact drawer at that source.

## Component responsibilities

| Technology | OpenLab use | Boundary |
| --- | --- | --- |
| [assistant-ui](https://github.com/assistant-ui/assistant-ui) | Conversation primitives, composer, streaming text, tool-call presentation, attachment controls | Its view models are derived from platform-owned messages; no hosted conversation service is required |
| [assistant-ui AG-UI adapter](https://www.assistant-ui.com/docs/runtimes/ag-ui/overview) | Preferred `@assistant-ui/react-ag-ui` adapter with the AG-UI client | Connect only to OpenLab's gateway; validate history, reconnect and cancel integration before release |
| [AG-UI](https://docs.ag-ui.com/introduction) | Frontend event protocol for messages, tools, steps and shared view state | Does not define the research archive or Harness internals |
| [CopilotKit](https://github.com/CopilotKit/CopilotKit) | Reference for shared state, tool result UI and human interaction patterns | No CopilotKit SDK or service dependency in the first release |
| [shadcn/ui AI Elements](https://ui.shadcn.com/docs/ai-elements) | Composed plan, task, confirmation and source/citation views | Reuse presentation patterns without introducing a second conversation store |

The official assistant-ui adapter accepts an AG-UI agent client. shadcn/ui documents AI Elements as compositions copied into a project. These references were reviewed on 2026-10-24; no application package is installed by this specification. Pin exact packages, component source revisions, licenses and compatibility evidence when implementation begins.

The platform is authoritative for messages, run state, pending interactions, artifact revisions and sources. The UI keeps only presentation state such as selection, drawer visibility and unsent text. Shared state is a projection of authorized platform data. A client-side patch cannot grant permissions, change a verification level or mark a run successful.

## Research interaction

1. Create or reopen a project, select a conversation, and describe the question. Copy attached local material into project storage.
2. Select a versioned skill, model and retrieval configuration. Show missing requirements before execution.
3. Generate a brief and plan using the selected model. Show the proposed method, intended sources, requested capabilities and known limits. Model use for planning may incur usage; research tools remain blocked until confirmation.
4. Confirm the plan. Show the current phase, actual tool calls, available usage and newly saved artifacts as execution proceeds.
5. Answer structured questions or decide scoped permission requests inline. Show the exact scope, reason and affected action. Keep the request accessible in the run detail until resolved.
6. Review the report, follow citations to evidence, inspect failures and limitations, then export files with the platform research record.

Progress comes from recorded steps and tool events. Show a phase or indeterminate activity indicator when the amount of work is unknown. A percentage is allowed only for a defined measured total, with its unit visible. Display user-facing activity summaries rather than hidden model reasoning. Missing provider usage stays unknown.

Plan confirmation, question answers and permission decisions are separate operations. Rejecting a permission prevents that action; the runtime may continue with an already authorized alternative or explain that the task cannot proceed. The UI must not turn rejection into approval or cancellation into success. A plan revision that changes scope requires another confirmation before the new work begins.

## Visible states

| State | What the researcher sees and can do |
| --- | --- |
| Empty project | Start with a question or attach material; artifact pane explains where results will appear |
| `queued` | Waiting to start; cancel is available |
| `awaiting_confirmation` | Proposed plan/version with confirm and cancel actions; further research tool dispatch waits for confirmation |
| `running` | Current stage, tool activity, streaming reply and saved draft artifacts; cancel is available |
| `awaiting_input` | A labeled question with text or choice input; submit an answer or cancel |
| `awaiting_permission` | Requested action and scope with approve, deny and cancel controls |
| `cancelling` | Cancellation requested, waiting for confirmed termination; existing products remain visible |
| `succeeded` | Execution completed; review evidence and limitations before treating any claim as checked |
| `failed` | Actionable error, partial products and failed requests; retry creates a linked new run |
| `cancelled` | Termination confirmed; retain partial products and the cancellation record |
| `interrupted` | Runtime lost after reconciliation; retain history and offer an explicit linked retry |
| Disconnected | Connection status shown separately from the last known run state; reconnect without starting new work |

Terminal states close outstanding interactions without applying unanswered approvals. Late or repeated decisions cannot resume a terminated run. Disable decision submission while disconnected and preserve entered answers as drafts until the server can acknowledge them. Closing a tab, switching projects or losing the event stream does not request cancellation. Explicit cancel uses the platform operation even if the UI adapter also aborts its local subscription.

## Artifacts and evidence

First release provides live Markdown report previews, structured source records, and attachment metadata/download. Preview copied text, Markdown, PNG and JPEG attachments; unsupported formats remain downloadable with an explicit preview-unavailable message. Do not execute uploaded code, active HTML, embedded scripts or report HTML. PDF rendering, scientific charts, experiment execution and Notebook rendering are later capabilities. Illustrative fixtures must say that their data is synthetic.

Show a saved streaming report as a draft, including its producing run, last saved sequence and incomplete status when applicable. Artifact change events carry identifiers and revision information; obtain file contents through the platform artifact API. Committed revisions are immutable, hashed and individually selectable. Do not silently replace the revision the user is reading; show a newer-revision indicator with a switch action. Cancellation or failure does not remove saved drafts or committed revisions.

Links use platform identifiers rather than positions in chat text. A message citation opens the source and supporting location when available; a producing-step link opens that step in its run; an artifact link opens the exact revision. Source details link back to the runs and steps that retrieved or used it. Missing full text is stated explicitly. Distinguish metadata verification, content verification and a checked claim-to-source association. Preserve contradictory evidence and failed retrieval alongside successful sources.

All core controls require keyboard operation and accessible labels. Restore focus when drawers or dialogs close, announce stage changes without announcing each streamed token, and keep scroll position while a researcher reads earlier messages. Check both English and Chinese text, including long publication titles and narrow-screen layouts.

## Application acceptance scenarios

These are application acceptance requirements. The [verification record](verification.md) distinguishes implemented and tested cases from remaining gates; a design table alone is not evidence of completion.

| Scenario | Required outcome |
| --- | --- |
| Economics and humanities research, in English and Chinese | Complete setup, confirmed plan, real retrieval, evidence review and export; retain original titles and identifiers |
| Live report and source updates | Conversation, activity and artifact pane update from the same persisted run; drafts and immutable revisions are distinguishable |
| Citation and history navigation | Resolve message-to-source, artifact-to-step and source-to-run links, including old runs and revisions |
| Human input and permission denial | Answer resumes the same run once; denied work never executes; stale/repeated submissions do not duplicate continuation |
| Cancel and completion race | Requested cancellation is distinct from termination; recorded terminal outcome is authoritative and partial products remain |
| Disconnect and tab close | Execution continues; reconnect restores ordered events without duplicate text, artifacts, tool calls or billing |
| Process restart | Completed products remain readable; lost execution becomes interrupted after reconciliation, with explicit linked retry |
| Retrieval limits | Empty results, inaccessible full text and conflicting evidence retain their recorded limitations |
| Responsive and offline viewing | Keyboard-accessible three-pane and drawer layouts; local service can show saved projects without provider/network access |
| Replaceable components | A second runtime test double, substitute model provider and independent AG-UI consumer use the contracts; export/import works without assistant-ui or runtime history |

Use controlled event and retrieval fixtures for automation, plus a separately recorded live retrieval smoke test. The [product acceptance criteria](product.md#acceptance-and-roadmap) remain the release gate.
