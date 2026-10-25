# Verification record

This record retains dated evidence from the v0.0.1 foundation through the current development source. Test counts describe their recorded stage and environment; they are not assertions about every later revision. The published v0.0.1 remains foundation-only. Exact workflow outcomes and tested commits remain in GitHub Actions; current work and dependencies are in [STATUS](STATUS.md) and [ROADMAP](ROADMAP.md).

## Evidence stages

| Date and stage | Recorded local checks | Evidence boundary |
| --- | --- | --- |
| 2026-10-24 first preview acceptance | 45 Node tests / 3 Chrome scenarios | [First preview](#final-preview-acceptance-2026-10-24); separate live pinned-skill and direct Crossref records |
| 2026-10-24 approved workspace redesign | 45 Node tests / 5 Chrome scenarios | [Redesign](#approved-workspace-redesign-2026-10-24); controlled browser data, no live model/retrieval |
| 2026-10-24 daily research workflow | 51 Node tests / 8 Chrome scenarios | [Daily workflow](#current-product-completion-2026-10-24); frozen context, materials and provider editing |
| 2026-10-24 plugin document workspace | 57 Node tests / 12 Chrome scenarios | [Plugin stage](#plugin-document-workspace-2026-10-24); real compiler/PDF checks and controlled stalled-Worker fault tests |
| 2026-10-25 ENG-01 local preflight | 57 Node tests / 12 Chrome scenarios | [Windows preflight](#local-delivery-preflight-2026-10-25); existing BusyTeX cache, no new live model calls |

Node totals include application and governance tests. The dates and environments above remain historical evidence. ENG-02 did not rerun these application checks, builds, browser scenarios or live probes.

## PR #11 CI inspection, 2026-10-25

[PR #11](https://github.com/IsaacHuo/OpenLab/pull/11) is open and unmerged. Its head is `1574645b8b8bc4da9b7559d7794540e75775724c`, based on main `99813c6cc890c1e3e6c080e9cc18fa5ab6ba4865`. [Workflow run 40165761893](https://github.com/IsaacHuo/OpenLab/actions/runs/40165761893) checked out GitHub's temporary merge revision `5cd15b4b9582a8195494a58b1ba8fe2d0d285346`; that checkout is not a merge into main. These results do not cover the uncommitted ENG-02 documentation edits.

Windows/Linux repository jobs, actionlint and Gitleaks passed. The [browser acceptance job](https://github.com/IsaacHuo/OpenLab/actions/runs/40165761893/job/121086433393) passed 11 scenarios and failed one; required-checks consequently failed. That job ran Ubuntu 26.04.1, Node.js 24.21.0 and npm 11.19.0. Its production build succeeded with the existing large-chunk advisory. Browser acceptance remains a merge blocker.

The failing scenario is `real XeLaTeX compiles Chinese, formula, image and BibTeX; failure retains the exact previous PDF`. The first completion assertion at `browser-tests/documents.spec.ts:54` did not find `编译完成` within 125,000 ms. The log names a failure screenshot, error context and trace, but this workflow uploaded no artifacts. It does not expose enough compiler or preparation state to identify the cause. The workflow has no separate compiler-preparation step; cold-cache download is a hypothesis, not a demonstrated root cause. The independent controlled stalled-Worker scenario passed and does not explain this real compiler failure.

ENG-03 must obtain preparation state, compiler diagnostics and failure artifacts, reproduce the timeout in an isolated fixture, and repair the demonstrated failure. Cached Windows success remains valid for its recorded conditions, but does not prove fresh CI preparation or the failed Linux path. ENG-04 remains dependent on ENG-03 passing; no checks were remotely rerun by ENG-02.

## Documentation alignment, ENG-02, 2026-10-25

Code inspection confirmed three separate limits: one material is at most 10,000,000 decoded bytes (`app/store.ts`), ordinary request bodies allow 32,000,000 bytes, and the import route allows 128,000,000 bytes (`app/service.ts`). SQLite remains at `user_version=1`; exports carry archive `schemaVersion: 2` and imports accept v1/v2. Existing compatibility cases are in `app/tests/store.test.ts` and `app/tests/documents.test.ts`. ENG-02 changes documentation only; it introduces no API, storage or migration change.

Both README versions already distinguish current source from the v0.0.1 foundation release and were left unchanged. The security policy now makes the same distinction. Historical ADR text and the original vision are retained. Documentation validation results are recorded in [STATUS](STATUS.md); application checks were not rerun for this task.

The planning research inspected these popular projects on 2026-10-25. Star counts below are approximate observations from their GitHub pages, not quality ratings. The adopted documentation practices do not introduce their dependencies or architectures:

| Reference | Observed practice | Application to OpenLab |
| --- | --- | --- |
| [GPT Researcher](https://github.com/assafelovic/gpt-researcher), about 30.3k stars; [evaluation method and caveats](https://docs.gptr.dev/docs/gpt-researcher/gptr/context-filter) | Separates benchmark method, results, model/task limits and reproduction | Keep dates, environment and evidence limits beside results; distinguish controlled fixtures, real compiler runs and live provider calls |
| [Dify](https://github.com/langgenius/dify), about 159.4k stars; [file configuration source](https://github.com/langgenius/dify/blob/main/api/configs/feature/__init__.py) | Defines file-size and batch-count limits separately by resource | Document material bytes and request-body bytes separately, using OpenLab's existing values |
| [Open WebUI](https://github.com/open-webui/open-webui), about 156.7k stars; [version and commit guidance](https://docs.openwebui.com/getting-started/quick-start/) | Distinguishes rolling main/dev builds, fixed releases and exact commits | Identify historical releases, current source, local checks and the exact CI checkout independently |

## Local delivery preflight, 2026-10-25

### ENG-05 source candidate

ENG-04's [PR #12](https://github.com/IsaacHuo/OpenLab/pull/12) passed [workflow 40170593908](https://github.com/IsaacHuo/OpenLab/actions/runs/40170593908) on head `b1373907f448642991c55840d2c9893c7af1d4b0`, with all required jobs successful and no unresolved review threads, then merged as `14b8a652f63c196b1746878f376bab259a141192`. The source candidate starts from that commit.

The candidate sets VERSION, package.json, both root package-lock version fields and OpenAPI info metadata to `0.1.0-alpha.1`; the generated OpenAPI JSON matches the source exactly. An explicit comparison against the parent lockfile confirmed that the dependency graph is unchanged. API paths/types, database version 1 and archive v1/v2 compatibility are unchanged. The dated changelog includes startup, evidence and preview limits. English/Chinese README instructions, security scope and third-party notices were updated together where applicable.

On native Windows x64, Node.js 24.19.0 / npm 11.17.0, this candidate passed `npm run check` (57 tests, no failures/skips), `npm run build`, all 13 `npm run test:browser` scenarios, `npm run check:actions` (actionlint 1.7.12), `npm run check:secrets` (Gitleaks 8.30.1), `npm audit --audit-level=high` (zero vulnerabilities) and `git diff --check`. The compiler test used the existing pinned cache. The existing large-chunk advisory remains. No live model/retrieval calls were made; the earlier dated live records were reused without broadening their compatibility claims.

Inspection of all 154 tracked paths found uppercase PLAN.md and no tracked research/configuration/cache/dependency/build/test-output directories. Direct dependency version/license metadata was checked against installed lockfile-matched packages; retained component notices remain present. GitHub source archives exclude Supervisor-Skills, local Skills/hooks and prepared TeX/font binaries. Remote candidate CI and exact main push CI remain separate gates; these local results alone do not establish publication.

### ENG-03 remote completion and ENG-04 gate audit

[Workflow 40170016084](https://github.com/IsaacHuo/OpenLab/actions/runs/40170016084) passed on PR #11 head `73ad1658c7f9f3d4d283d5221af4922668661a99`, using temporary merge checkout `c99db1b22a68a6296889d687cbe51f8400f05ba7`. Both repository jobs, actionlint, Gitleaks, independent compiler preparation, all 13 browser scenarios and required-checks succeeded. Compiler preparation took 12 seconds on that runner. Review threads were empty, and PR #11 was squash merged to main `c9a96f3ca22fd85276ca9fb09defa1a541bd08c1`. This resolves the merge blocker; the old timeout's exact cause remains unproven.

ENG-04 then mapped each alpha data/permission requirement to the existing tests in [acceptance](acceptance.md#alpha-data-and-permission-gates-eng-04-2026-10-25). Its seven-file `node --test` command passed 30 tests with no failures/skips on Windows, Node.js 24.19.0 / npm 11.17.0. Existing controlled/native-worker evidence covers the documented preview boundary; live metadata/provider records remain dated historical evidence. There were no new live model/retrieval calls or schema changes.

The user requested an uppercase root `PLAN.md` with visible current execution stages. The file was renamed through a temporary Git path to preserve the case-only change on Windows; all tracked root-plan links were updated. Its prior two rounds remain as history. Both README navigation entries were updated together. The original vision, ADR bodies, research data, dependencies and application code were unchanged by ENG-04.

### ENG-03 reproduction and local repair

On Windows x64, Node.js 24.19.0 and npm 11.17.0, the initial rerun passed real XeLaTeX with the existing cache but failed plugin fault containment because an unrelated `Artifact revision not found` alert appeared. A new document-switching regression failed against the original code: the browser requested the previous document's comparison revision through the new artifact's route. The document panel now checks revision ownership before loading comparison bytes. The same regression and the full browser suite then passed: 13 scenarios, including real Chinese/BibTeX/PDF compilation, cached offline pdfLaTeX, controlled cancellation/deadline, plugin faults and responsive/axe checks. Desktop, tablet and phone document screenshots were inspected.

`npm run check` passed all 57 Node tests, Markdown/repository validation and type checking; `npm run build`, actionlint 1.7.12 and Gitleaks 8.30.1 passed. The existing large-chunk advisory remains. Compiler download errors now identify the asset, byte range, curl exit and actual/expected length without exposing credentials. No model provider was called.

A separate empty compiler cache was created under ignored `.cache/eng03-cold/`, leaving the working cache and user data untouched. Preparation failed after approximately 33 MB; explicit retries reused cached ranges and reached approximately 197 MB, but further downloads failed with curl exit 35 (TLS connection failure). This demonstrates a local cold-preparation failure, not the precise cause of the earlier Linux timeout. New CI separates `plugins:prepare` from the browser completion wait and fails visibly at preparation if it cannot reach `ready`. Failed document scenarios attach compiler resource state and build text; CI uploads `test-results/` for seven days. The Worker deadline remains 120 seconds. Subsequent remote completion is recorded above.

### ENG-01 preflight (historical)

Before submitting the existing research/document workspace changes, native Windows x64 with Node.js 24.19.0 and npm 11.17.0 passed `npm run check` (57 tests, no failures or skips), `npm run build`, all 12 `npm run test:browser` scenarios, actionlint 1.7.12 and Gitleaks 8.30.1. The build still reports existing chunks over 500 kB. These ENG-01 local preflight results cover the implementation submitted as `22d6db524c08abfd4976bded081cf415b25919c1`; `1574645b8b8bc4da9b7559d7794540e75775724c` subsequently updated only STATUS. The failed PR browser CI is recorded separately above.

The real compiler test reused the pinned BusyTeX cache and passed Chinese text, math, a managed chapter, PNG, BibTeX, PDF text checks, failure preservation and the cached offline pdfLaTeX case. Controlled stalled Workers supply cancellation/deadline evidence. Fresh desktop and mobile document screenshots were inspected; generated screenshots and PDFs remain ignored. This run did not re-test cold-cache downloads or call a live model provider. Local installed Skills, hooks and unselected design drafts remain outside the source delivery.

## Results recorded on 2026-10-24

On Windows x64 with Node.js 24.19.0, Markdown lint, local links, YAML and policy validation, all nine automation tests, actionlint 1.7.12, and Gitleaks 8.30.1 passed. An npm dependency audit reported zero vulnerabilities after the documented KaTeX override. GitHub settings, topics, all 22 managed labels, private reporting, and both active rulesets matched the committed configuration.

The original Chinese vision was copied byte-for-byte; its SHA-256 is `d016e43369ff44d929cee2896b7fdfb4e79d58dddf7837f8d5a2e1f0bb0d0299`. Git attributes preserve its original line endings. Both vector logo variants match the code generator exactly; the dark mark was rendered to a PNG for visual inspection, while the distributed assets remain pure SVG paths. The outline uses exact mirror geometry, the lower bowl is a true circular arc, and the internal wave has 180-degree rotational symmetry.

The online merge and release evidence is retained in the foundation PR, push workflow and v0.0.1 Release linked below. These live records are the authority for the final publishing outcome.

GitHub page inspection confirmed the README mark, navigation and license display. The initial remote Mermaid renderer failed in that inspection, so both READMEs now use a repository-owned SVG architecture diagram that loads without a diagram rendering service. The Windows/Linux PR checks and the main push checks passed for the foundation merge; subsequent workflow runs record the rendering fix and release gate outcomes.

## Workspace and Harness documentation validation, 2026-10-24

This revision adds workspace and minimal Harness specifications, ADR 0002, and coordinated updates to product, architecture, provenance, third-party references, bilingual README, changelog and the SVG architecture diagram. It supplies no application code or runtime packages. ADR 0001 retains the superseded OpenCode-first decision as history; current specifications select OpenLab Harness and AG-UI.

On native Windows with Node.js 24.19.0, `npm run check` passed Markdown lint, repository/link validation and all nine existing tooling tests. `git diff --check` passed. The SVG was rendered locally for layout inspection; this verifies a documentation diagram, not an implemented research workspace. The application acceptance matrices in [workspace](workspace.md#application-acceptance-scenarios) and [Harness](harness.md#implementation-gates) remain unexecuted implementation gates.

The Chinese vision is byte-identical to the committed file at the start of this revision. Both have SHA-256 `4a1089d837bfaea988418ceffec5b395e9c39fbd2c85c42cdabe69a31fab191f`. This differs from the historical source hash recorded above; this revision verifies preservation against Git, not equality to the original external source. No vision content or line endings were changed.

## Current product completion, 2026-10-24

This historical section records the daily-workflow batch in the [execution ledger](../PLAN.md). At that stage, native Windows checks covered 51 unit/integration/governance tests and eight Chrome browser scenarios. Added behavior covers launch-link recovery; project/conversation search and rename; continuous history and scoped refresh restoration; frozen follow-up references, selected old reports, truncation and archive compatibility; selected/empty/default materials; protected provider updates, rollback and active-run blocking. Native worker tests verify that history and material excerpts cross the IPC boundary into the controlled model request without enabling planning tools.

The browser suite uses controlled records and a substitute runtime, with no real model calls. It covers Chinese composition/keyboard submission, 1440/1280/1024/768/390-pixel layouts, drawers, old revisions, evidence navigation, material choices, downloads and settings errors. Exercised desktop/mobile axe scans have zero violations. The production build succeeds with the existing advisory about large JavaScript chunks. Earlier live provider/retrieval evidence below remains separate and was not rerun for this batch.

Local screenshots are `.cache/workspace-desktop.png`, `.cache/workspace-mobile.png` and the manually inspected local workspace captures recorded in the ledger. Test project names and acceptance slogans are excluded from the normal workspace; provider names remain in model configuration only.

## Baseline checks

### Final preview acceptance, 2026-10-24

The [acceptance matrix](acceptance.md) maps the first preview requirements to evidence. At this historical stage, native Windows checks covered 45 unit/integration/governance tests and three Chrome browser scenarios, including direct metadata retrieval without any model, preserved revision selection on provenance navigation, and interrupted-stream protocol closure. Type checking, production build, actionlint, Gitleaks and npm audit passed; that audit reported zero vulnerabilities. Initial application work was merged through PRs #7, #8 and #9 after required checks.

A real generic installation fetched OpenLab commit `7b927080f722ca547969ef84eb22a9a7d1b1698f`, preserved 89 files and loaded the first-party literature skill's linked evidence resource. Its live DeepSeek Flash/Crossref task produced five metadata sources, one final report and a passing archive round trip. The isolated Windows Git process initially hit Schannel's unavailable revocation lookup; selecting its OpenSSL backend with certificate verification enabled fixed the fetch. No upstream scripts were executed. A separate direct-tool live Crossref task returned five records, saved one report and recorded zero model calls/tokens. Sanitized local receipts are `.cache/live-skill-install.json`, `.cache/live-pinned-skill-run.json` and `.cache/live-direct-tool.json`.

### Research services, 2026-10-24

On native Windows x64 with Node.js 24.19.0, strict type checking and 38 tests passed. Added cases cover authenticated loopback sessions, origin and CSRF rejection, disconnected subscriptions, domain/AG-UI replay with an independent consumer, inert pinned skill fixtures, invalid paths, protected/public provider separation, metadata limitations, permission denial without fetching, inaccessible content, public/reserved address policy and lost-worker interruption.

Two live DeepSeek Flash/Crossref tasks completed: minimum wage/employment in English and Hamlet text research in Chinese. Each retrieved five metadata sources, committed one final Markdown report and passed export/import checks. Reported model totals across four calls per task were 8,502 and 8,499 tokens. The local sanitized record is `.cache/live-research-smoke.json`; the repeatable opt-in procedure is `scripts/live-research-smoke.mjs`. Reports explicitly limit their conclusions to available metadata. This test denied public-page reading and supplies no full-text or claim-verification evidence.

The local network resolves external names to reserved VPN fake DNS ranges. General source reads correctly reject those ranges. The fixed Crossref metadata adapter uses HTTPS with redirects disabled and successfully retrieved its records. This is an environment-specific full-text limitation, not a reason to expand arbitrary network access.

### Browser workspace, 2026-10-24

On native Windows x64 with Node.js 24.19.0 and Chrome 155.0.8059.85, 42 unit/integration tests, strict server/browser TypeScript and the production build passed. Two synthetic Playwright scenarios passed desktop and 390-pixel flows: planning, a structured answer, denied permission, live draft/final revisions, citation and producing-step navigation, conversation reload without duplicate text, cancellation, UTF-8 material preview and Chinese/English controls. Axe's exercised WCAG A/AA checks reported zero violations after fixing contrast and upload-control labels. Screenshots were inspected locally. This automated check is not a complete accessibility certification.

A separate real browser session tested the protected DeepSeek provider and Crossref diagnostics through settings, created a Chinese economics project, confirmed its plan, retrieved five metadata records, saved an immutable report and downloaded the portable archive. No frontend exceptions were recorded. The README screenshot is from that task. The sanitized record is `.cache/live-browser-record.json`, with a local research export; it contains no provider credential. Full-text and claim verification were explicitly excluded from that task.

The native credential helper initially failed because the PowerShell Core host's module path reached Windows PowerShell. The helper now selects the Windows system executable and system module path explicitly; a real DPAPI round-trip test passes. The local service then started and the browser/provider task completed. Data-root ownership, imported reference checks, attachment integrity and private-configuration rejection have separate regression tests.

### Initial application core, 2026-10-24

On native Windows x64 with Node.js 24.19.0, strict TypeScript validation and 28 tests passed (19 application-core tests and nine governance tests). Core cases include confirmation before dispatch, substitute model/tool/context/sink and RuntimeAdapter implementations, validated questions and denied permission, duplicate/stale decisions, usage/turn limits, worker cancellation, restart reconciliation, SQLite transaction rollback, Unicode/space-containing paths, junction rejection, immutable revisions, corrupted archive rejection and offline export/import. These do not establish browser UI or full literature research acceptance.

Two opt-in calls to `https://api.deepseek.com` with `deepseek-flash` passed Chinese text streaming and a structured `record_probe` tool call. The provider reported input/output usage of 19/8 and 285/39 tokens respectively. The selected credential was stored locally with Windows user-scoped protection and was excluded from source and verification output. The sanitized machine record remains in the local ignored cache; `scripts/live-model-smoke.mjs` supplies the repeatable procedure. This is narrow model-interface evidence, not a completed research task or a claim about all DeepSeek models.

- `npm ci`: install development dependencies from the committed lockfile.
- `npm run check`: Markdown style, internal links and anchors, YAML parsing, required files, Issue Form fields, immutable Actions references, version consistency, label configuration, and release-policy tests.
- `npm run check:actions`: validate workflow syntax and expression semantics with pinned actionlint.
- `npm run check:secrets`: scan Git history and working files using pinned Gitleaks with redacted output.
- `npm run github:verify`: compare live settings, topics, managed labels, private-reporting status and both rulesets against versioned policy.
- `npm run release:check -- 0.0.1`: dry-run the release gate on the current main commit after its push checks succeed.

Automation tests exercise valid and invalid versions, mismatched version files, missing release notes, prerelease handling, a non-main release target, failed or unrelated CI, duplicate tag rejection, and policy drift including an added bypass actor. CI runs repository checks on Windows and Linux; actionlint and Gitleaks run on Linux. Local tooling also supports Windows x64 binaries.

## Online acceptance

The implementation is accepted when the foundation PR passes required checks and can squash merge with one maintainer, the live repository matches versioned policy, the version tag is annotated and protected against update/deletion, and the published v0.0.1 notes identify the foundation-only scope. Verify the final results through the [checks](https://github.com/IsaacHuo/OpenLab/actions/workflows/checks.yml), [rules](https://github.com/IsaacHuo/OpenLab/rules), [issue chooser](https://github.com/IsaacHuo/OpenLab/issues/new/choose), and [release](https://github.com/IsaacHuo/OpenLab/releases/tag/v0.0.1).

## Verification limits

Static validation checks local document links, YAML structure and Issue Form fields. GitHub's rendering and form behavior should also be inspected on the published default branch. Badges and remote resources depend on their services and are not fetched during PR lint.

The foundation release and historical documentation revision above supplied no application execution. Current development's native core/browser and live metadata evidence is recorded separately above. This does not establish a verified scientific result, a sandbox, full-text access on this network, compatibility with every browser/provider, or Supervisor-Skills redistribution permission. Remaining release gates are tracked in the [implementation plan](implementation-plan.md); deferred capabilities and third-party terms remain in the [product](product.md) and [third-party record](../THIRD_PARTY_NOTICES.md).

## Approved workspace redesign, 2026-10-24

The frontend now applies the selected light workspace design from [doc/design](../doc/design/README.md), including a 24px composer radius and no persistent caption beneath the input. The shell uses neutral tokens, a project/conversation sidebar, a collapsible execution record, an optional report pane, and responsive project/artifact drawers. Mode, model and revision controls use Radix compositions adapted from shadcn/ui; research interactions use the AI Elements Plan adaptation recorded in [component sources](../doc/design/component-sources.md). The existing API and assistant-ui/AG-UI run flow remain the behavior boundary.

On native Windows x64 with Node.js 24.19.0, `npm run check` passes Markdown validation, repository/link validation, TypeScript and all 45 core tests. `npm run build` passes; the existing conversation dependency chunk and the initial bundle still emit the build tool's size advisory. `npm run test:browser` passes five Chrome scenarios covering plan confirmation, structured input, denied permission, revisions and citations, reconnect/replay, direct model-free metadata retrieval, attachments, confirmed cancellation, project-scoped drafts, IME-safe Enter, Shift+Enter, responsive panel sizing and drawer focus restoration. No live model or external retrieval was used in these browser checks.

The exercised desktop and mobile screens have zero axe WCAG A/AA violations. Browser screenshots were saved to ignored `.cache/workspace-desktop.png` and `.cache/workspace-mobile.png` and visually inspected. Layout tests exercise 1440px, 1280px, 1024px, 768px and 390px widths, including the minimum chat width while the artifact pane is open. These checks are evidence for the exercised states, not a complete accessibility certification or a claim of pixel-perfect identity with the generated concept image.

Repository-owned Markdown and local links remain checked. Third-party installed Skills under `.agents/` are excluded from the project Markdown/link checks, like dependencies under `node_modules/`, without rewriting upstream Skill files.

A separate manual preview opened the existing local project history with the production bundle, inspected a saved research report and adjusted the artifact pane with the keyboard. It read saved records without starting a model or retrieval run. The screenshot is `.cache/workspace-live-desktop.png`; the synthetic screenshots above remain the repeatable visual test evidence.

## Plugin document workspace, 2026-10-24

At this historical plugin stage on Windows, `npm run check` passed Markdown/repository validation, TypeScript and **57 tests**; `npm run build` succeeded; all **12 Chrome browser scenarios** passed. These counts extend the earlier local stages without replacing their recorded results. The additional coverage includes capability replacement/disablement, dependency/interface failures, immutable human revisions, optimistic conflicts, idempotent submissions, v1/v2 archives, CSRF-protected document APIs, history pagination, persisted drafts, CodeMirror, comparison, and view fault containment. The existing research confirmation and permission checks were also covered. The 2026-10-25 local rerun and the failed PR CI are recorded separately above.

The pinned BusyTeX WASM actually compiled Chinese text, a formula, a managed chapter, PNG and BibTeX with XeLaTeX. PDF.js extracted the Chinese and bibliography text, and the v2 export retained the real PDF output hash. A second real pdfLaTeX build succeeded with external network requests blocked while the loopback service stayed available. Missing-package and undefined-command builds failed with file/line diagnostics and retained the previous successful PDF with its source-version cue. Cancellation and the 120-second deadline use a deliberately stalled Worker; those fault tests do not claim a real compiler timeout or substitute a fabricated PDF for compilation evidence.

The pinned upstream multi-pass pipeline reused argument arrays mutated by Emscripten. The OpenLab Worker adapter clones them before each invocation, preserving repeated TeX/BibTeX passes, and enables file/line errors. PDF.js CMaps, fonts and decoder assets are served locally on demand. Compiler preparation cached 202,592,248 actual bytes; receipts record release, source and per-file SHA-256. No model service was called by these tests.

Actual screenshots of the same compiled document at desktop 1440×1000, tablet 768×1024 and mobile 390×844 were inspected: `.cache/document-desktop.png`, `.cache/document-tablet.png`, `.cache/document-mobile.png`. The exercised focus document, desktop and mobile workspace states have zero axe A/AA violations. The existing user project was also reopened on the local service and its editor inspected at desktop, tablet and phone widths, including narrow-screen draft preview. The retained screenshots are `.cache/plugin-editor-live-desktop.png`, `.cache/plugin-editor-live-tablet.png` and `.cache/plugin-editor-live-mobile.png`. Screenshots and the real compiled proof PDF stay in ignored `.cache/`; test fixtures never use the user's project store.

See the [plugin SDK](plugins.md) and [retained execution ledger](../PLAN.md). Compiler dependencies are the pinned package collection, not an arbitrary TeX installation. Static browser plugins are trusted code; no external installer or untrusted plugin sandbox is supplied. Existing large JavaScript chunks still trigger the size advisory.
