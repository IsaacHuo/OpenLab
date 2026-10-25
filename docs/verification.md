# Foundation verification

This record describes the v0.0.1 acceptance boundary. Commands are repeatable; exact workflow outcomes and source commits remain in GitHub Actions and the Release.

## Local delivery preflight, 2026-10-25

Before submitting the existing research/document workspace changes, native Windows x64 with Node.js 24.19.0 and npm 11.17.0 passed `npm run check` (57 tests, no failures or skips), `npm run build`, all 12 `npm run test:browser` scenarios, actionlint 1.7.12 and Gitleaks 8.30.1. The build still reports existing chunks over 500 kB. These are local preflight results; the eventual PR's exact-commit CI is a separate delivery gate.

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

The [execution ledger](../plan.md) records the approved daily-workflow batch. Native Windows checks cover 51 unit/integration/governance tests and eight Chrome browser scenarios. Added behavior covers launch-link recovery; project/conversation search and rename; continuous history and scoped refresh restoration; frozen follow-up references, selected old reports, truncation and archive compatibility; selected/empty/default materials; protected provider updates, rollback and active-run blocking. Native worker tests verify that history and material excerpts cross the IPC boundary into the controlled model request without enabling planning tools.

The browser suite uses controlled records and a substitute runtime, with no real model calls. It covers Chinese composition/keyboard submission, 1440/1280/1024/768/390-pixel layouts, drawers, old revisions, evidence navigation, material choices, downloads and settings errors. Exercised desktop/mobile axe scans have zero violations. The production build succeeds with the existing advisory about large JavaScript chunks. Earlier live provider/retrieval evidence below remains separate and was not rerun for this batch.

Local screenshots are `.cache/workspace-desktop.png`, `.cache/workspace-mobile.png` and the manually inspected local workspace captures recorded in the ledger. Test project names and acceptance slogans are excluded from the normal workspace; provider names remain in model configuration only.

## Baseline checks

### Final preview acceptance, 2026-10-24

The [acceptance matrix](acceptance.md) maps the first preview requirements to evidence. Native Windows checks now cover 45 unit/integration/governance tests and three Chrome browser scenarios, including direct metadata retrieval without any model, preserved revision selection on provenance navigation, and interrupted-stream protocol closure. Type checking, production build, actionlint, Gitleaks and npm audit pass; audit reports zero vulnerabilities. Initial application work was merged through PRs #7, #8 and #9 after required checks.

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

Current local verification supersedes earlier development test counts: `npm run check` passes Markdown/repository validation, TypeScript and **57 tests**; `npm run build` succeeds; all **12 Chrome browser scenarios** pass. The additional coverage includes capability replacement/disablement, dependency/interface failures, immutable human revisions, optimistic conflicts, idempotent submissions, v1/v2 archives, CSRF-protected document APIs, history pagination, persisted drafts, CodeMirror, comparison, and view fault containment. Existing research confirmation and permission checks remain covered.

The pinned BusyTeX WASM actually compiled Chinese text, a formula, a managed chapter, PNG and BibTeX with XeLaTeX. PDF.js extracted the Chinese and bibliography text, and the v2 export retained the real PDF output hash. A second real pdfLaTeX build succeeded with external network requests blocked while the loopback service stayed available. Missing-package and undefined-command builds failed with file/line diagnostics and retained the previous successful PDF with its source-version cue. Cancellation and the 120-second deadline use a deliberately stalled Worker; those fault tests do not claim a real compiler timeout or substitute a fabricated PDF for compilation evidence.

The pinned upstream multi-pass pipeline reused argument arrays mutated by Emscripten. The OpenLab Worker adapter clones them before each invocation, preserving repeated TeX/BibTeX passes, and enables file/line errors. PDF.js CMaps, fonts and decoder assets are served locally on demand. Compiler preparation cached 202,592,248 actual bytes; receipts record release, source and per-file SHA-256. No model service was called by these tests.

Actual screenshots of the same compiled document at desktop 1440×1000, tablet 768×1024 and mobile 390×844 were inspected: `.cache/document-desktop.png`, `.cache/document-tablet.png`, `.cache/document-mobile.png`. The exercised focus document, desktop and mobile workspace states have zero axe A/AA violations. The existing user project was also reopened on the local service and its editor inspected at desktop, tablet and phone widths, including narrow-screen draft preview. The retained screenshots are `.cache/plugin-editor-live-desktop.png`, `.cache/plugin-editor-live-tablet.png` and `.cache/plugin-editor-live-mobile.png`. Screenshots and the real compiled proof PDF stay in ignored `.cache/`; test fixtures never use the user's project store.

See the [plugin SDK](plugins.md) and [retained execution ledger](../plan.md). Compiler dependencies are the pinned package collection, not an arbitrary TeX installation. Static browser plugins are trusted code; no external installer or untrusted plugin sandbox is supplied. Existing large JavaScript chunks still trigger the size advisory.
