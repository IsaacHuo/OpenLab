# Foundation verification

This record describes the v0.0.1 acceptance boundary. Commands are repeatable; exact workflow outcomes and source commits remain in GitHub Actions and the Release.

## Results recorded on 2026-10-24

On Windows x64 with Node.js 24.19.0, Markdown lint, local links, YAML and policy validation, all nine automation tests, actionlint 1.7.12, and Gitleaks 8.30.1 passed. An npm dependency audit reported zero vulnerabilities after the documented KaTeX override. GitHub settings, topics, all 22 managed labels, private reporting, and both active rulesets matched the committed configuration.

The original Chinese vision was copied byte-for-byte; its SHA-256 is `d016e43369ff44d929cee2896b7fdfb4e79d58dddf7837f8d5a2e1f0bb0d0299`. Git attributes preserve its original line endings. Both vector logo variants match the code generator exactly; the dark mark was rendered to a PNG for visual inspection, while the distributed assets remain pure SVG paths. The outline uses exact mirror geometry, the lower bowl is a true circular arc, and the internal wave has 180-degree rotational symmetry.

The online merge and release evidence is retained in the foundation PR, push workflow and v0.0.1 Release linked below. These live records are the authority for the final publishing outcome.

GitHub page inspection confirmed the README mark, navigation and license display. The initial remote Mermaid renderer failed in that inspection, so both READMEs now use a repository-owned SVG architecture diagram that loads without a diagram rendering service. The Windows/Linux PR checks and the main push checks passed for the foundation merge; subsequent workflow runs record the rendering fix and release gate outcomes.

## Workspace and Harness documentation validation, 2026-10-24

This revision adds workspace and minimal Harness specifications, ADR 0002, and coordinated updates to product, architecture, provenance, third-party references, bilingual README, changelog and the SVG architecture diagram. It supplies no application code or runtime packages. ADR 0001 retains the superseded OpenCode-first decision as history; current specifications select OpenLab Harness and AG-UI.

On native Windows with Node.js 24.19.0, `npm run check` passed Markdown lint, repository/link validation and all nine existing tooling tests. `git diff --check` passed. The SVG was rendered locally for layout inspection; this verifies a documentation diagram, not an implemented research workspace. The application acceptance matrices in [workspace](workspace.md#application-acceptance-scenarios) and [Harness](harness.md#implementation-gates) remain unexecuted implementation gates.

The Chinese vision is byte-identical to the committed file at the start of this revision. Both have SHA-256 `4a1089d837bfaea988418ceffec5b395e9c39fbd2c85c42cdabe69a31fab191f`. This differs from the historical source hash recorded above; this revision verifies preservation against Git, not equality to the original external source. No vision content or line endings were changed.

## Baseline checks

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
