# ADR 0002: research workspace, AG-UI and OpenLab Harness

Date: 2026-10-24. Status: accepted design, not implemented application functionality. Supersedes the OpenCode-first selection in decision 5, its runtime-specific feasibility gate, and the deferred-internal-runtime alternative in [ADR 0001](0001-foundation.md). Other foundation decisions remain in force.

## Context

Researchers need to see conversation, execution state and developing results together. Projects, conversations, evidence and artifacts must remain usable when any model, runtime, scientific tool or interface changes. The repository currently contains governance, tooling and design documents; selecting these components does not make an application available.

The approved direction chooses a minimal self-developed OpenLab Harness for the first literature release and formally adopts AG-UI for frontend interaction. It changes the previous first-runtime choice while retaining a replaceable execution boundary.

## Decisions

1. Use a three-region research workspace: project/history/tools navigation, conversation with execution and human interaction, and live artifacts with evidence navigation. Provide collapsed panels and narrow-screen drawers. Specify behavior in [workspace](../workspace.md).
2. Use assistant-ui as the conversation foundation and prefer its official AG-UI adapter. Use shadcn/ui and AI Elements for supporting presentation. Refer to CopilotKit's shared-state and human-interaction patterns without adding its SDK or cloud service.
3. Adopt AG-UI at the Platform gateway. Keep canonical research objects, persisted events and RuntimeAdapter contracts owned by OpenLab. A stream disconnect or end is not sufficient evidence of scientific task success.
4. Build OpenLab Harness as the default first runtime behind RuntimeAdapter. Begin with one agent, replaceable model/tool/loop/context/storage interfaces and static registration. Research-specific retrieval and artifact behavior belongs to an extension. See [Harness](../harness.md).
5. Keep model credentials and tool policy under Platform control. Require confirmation before research tools run, persist human decisions and partial results, support confirmed cancellation and explicit retry after interruption, and preserve separate evidence verification levels.
6. Retain TypeScript/Node.js 24, React, SQLite, ordinary project files, a loopback control plane and a separately supervised runtime worker. Keep native Windows first; WSL is optional. Defer arbitrary code execution, multi-agent scheduling, remote compute and teams.
7. Keep OpenCode as an optional future adapter. Neither OpenCode nor Harness internals may become the canonical archive or leak into browser contracts. Prove the boundary with a second runtime test double, a substitute model and an independent UI consumer.

## Consequences and gates

Self-development adds ownership of the model/tool loop, cancellation, input validation and recovery behavior. Limit the first runtime to the literature workflow before expanding the plugin system. No dynamic plugin loader, general dependency resolver or distributed infrastructure is required at this milestone.

Before implementation proceeds beyond feasibility, record exact runtime and client versions/licenses and validate the native Windows gates in the [Harness specification](../harness.md#implementation-gates). Verify assistant-ui/AG-UI history, human interaction and reconnect behavior against pinned packages. Current documentation supplies a preferred integration, not proof that a particular package combination passes those gates.

First-release acceptance requires the [product scenarios](../product.md#acceptance-and-roadmap), including no tool execution before confirmation, permissions, cancellation, restart handling, source verification and archive portability. A model or runtime substitution must not change project or export schemas. No application packages, runtime code or migration are delivered by this documentation revision.

## Alternatives considered

- OpenCode first would reuse an existing execution loop; the approved direction instead prioritizes control of the minimal Harness while retaining OpenCode as a later option.
- A complete plugin kernel before a research task would broaden dependency and lifecycle work; start with explicit interfaces and static registration.
- A custom frontend protocol would duplicate existing event conventions; adopt AG-UI and document OpenLab's research extensions.
- Combining assistant-ui and CopilotKit as conversation owners would add overlapping state management; use one conversation layer and borrow interaction patterns.

The supplied DeepSeek Harness reference is a source of architectural ideas, not verified evidence of upstream implementation behavior or permission to reuse code.
