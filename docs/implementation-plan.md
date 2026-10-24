# First application implementation plan

This plan implements the accepted [product](product.md), [workspace](workspace.md) and [Harness](harness.md) specifications. A checked item requires recorded evidence; fixture tests alone do not establish live provider compatibility.

## Iterations

1. Preserve the accepted workspace/Harness design through a checked and merged PR.
2. Implement the platform archive and generic Harness: typed contracts, SQLite transactions, immutable artifact revisions, validated interactions, idempotent commands, cancellation, supervised execution and restart reconciliation. Exercise native Windows paths and substitute implementations.
3. Add provider and retrieval adapters, pinned skill installation, protected credentials, an authenticated loopback API, replay and AG-UI projection. Validate with controlled HTTP services and record live retrieval separately.
4. Build the React workspace with assistant-ui, project/history navigation, settings, decisions, artifacts and sources. Check desktop, drawers, keyboard operation, English and Chinese.
5. Complete the economics/humanities acceptance matrix, archive portability, limits and failure cases. Record live model compatibility only with configured user credentials. Update the documentation and release identity after the release gates pass.

Each iteration uses a short-lived branch, local checks, a PR, passing required CI and squash merge. Update this file and the verification record with delivered scope and unresolved gates before proceeding. Later roadmap phases (compute, multiple agents, institutional deployment and ecosystem infrastructure) are outside the first application release.

## Evidence ledger

| Iteration | Result |
| --- | --- |
| Design baseline | PR #6 merged; Windows/Linux required CI passed |
| Platform and Harness | PR #7 merged; 28 tests, type checking, Gitleaks and Windows/Linux CI passed; live DeepSeek streaming/tool calls passed |
| Services and adapters | PR #8 merged; 38 native Windows tests and required Windows/Linux CI passed; two live metadata research/export/import tasks passed |
| Research workspace | Implemented React/assistant-ui and official AG-UI adapter, project/history navigation, decisions, reports, sources, attachments and bilingual settings; 42 unit/integration tests and two desktop/mobile browser scenarios passed; exercised axe A/AA checks report no violations; a real browser/DeepSeek/Crossref loop passed; PR checks pending |
| Application acceptance | Pending |
