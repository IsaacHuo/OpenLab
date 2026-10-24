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

The foundation release and historical documentation revision above supplied no application execution. Current development core verification is recorded separately above. A complete research application, scientific result, sandbox, diagnostic bundle, assistant-ui/AG-UI compatibility, full-text verification, retrieval reliability and Supervisor-Skills licensing resolution remain explicit application gates in the [product](product.md), [architecture](architecture.md), [Harness](harness.md), and [third-party record](../THIRD_PARTY_NOTICES.md).
