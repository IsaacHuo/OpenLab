# First application implementation plan

This plan implements the accepted [product](product.md), [workspace](workspace.md) and [Harness](harness.md) specifications. A checked item requires recorded evidence; fixture tests alone do not establish live provider compatibility.

This is the retained first-application iteration ledger. Current task dependencies and acceptance contracts are in [ROADMAP](ROADMAP.md); current outcomes and blockers are in [STATUS](STATUS.md). The v0.0.1 release remains foundation-only.

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
| Research workspace | PR #9 merged after required Windows/Linux/browser CI; 42 native tests, two desktop/mobile browser scenarios and exercised axe A/AA checks passed; a real browser/DeepSeek/Crossref loop passed |
| Application acceptance, 2026-10-24 | [Evidence matrix](acceptance.md) covers the first preview; 45 native tests and three browser scenarios passed, including direct tool selection and revision preservation; real pinned skill execution and direct Crossref query passed; PR checks were pending at that stage |
| Approved workspace redesign, 2026-10-24 | 45 native tests and five browser scenarios passed locally; retained in [verification](verification.md#approved-workspace-redesign-2026-10-24) |
| Daily research workflow, 2026-10-24 | 51 native tests and eight browser scenarios passed locally; first batch in the root ledger |
| Plugin documents and ENG-01 preflight, 2026-10-24/25 | 57 tests and 12 browser scenarios passed locally on Windows; 2026-10-25 reused the BusyTeX cache, with no live model calls |
| PR #11 CI, inspected 2026-10-25 | Head `1574645b8b8bc4da9b7559d7794540e75775724c`; Windows/Linux repository jobs, actionlint and Gitleaks passed; browser acceptance passed 11/12 and required-checks failed. See [exact tested revision and failure](verification.md#pr-11-ci-inspection-2026-10-25) |

## Current product completion batch

The approved [root execution ledger](../PLAN.md) extends the delivered preview incrementally: authenticated launch recovery, searchable/renameable conversations, continuous history, frozen follow-up context, per-run material choices and editable providers. The black/white/gray [UI specification](../doc/design/README.md) remains authoritative, including the 24px composer and absence of a caption underneath it. Historical iteration counts above remain evidence for their original revisions; current suite counts and local results are in [verification](verification.md).

This batch is implemented and included in commit `22d6db524c08abfd4976bded081cf415b25919c1`, pushed in [PR #11](https://github.com/IsaacHuo/OpenLab/pull/11). The PR is unmerged as inspected on 2026-10-25. This creates no release, installer, publication or new multi-agent capability.

## Plugin document iteration

The approved [root ledger](../PLAN.md) records completed plugin contracts and document records, editors and revision management, real TeX/PDF validation, workspace interaction and integrated local checks. The [plugin SDK](plugins.md) defines the current static-registration boundary. This implemented iteration adds default Markdown/LaTeX editors, revision comparison, browser-side compilation and PDF preview, included in the same PR #11 implementation commit. External plugin installation, additional scholarly services, arbitrary execution, multiple agents and publishing remain outside this batch.

ENG-02 aligns these records without changing the application. ENG-03 must first reproduce the real XeLaTeX CI timeout and record compiler preparation and cache conditions, then repair the demonstrated failure. ENG-04 remains dependent on ENG-03 passing. The existing CI log does not establish a cold-cache root cause.
