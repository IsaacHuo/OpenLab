# Foundation verification

This record describes the v0.0.1 acceptance boundary. Commands are repeatable; exact workflow outcomes and source commits remain in GitHub Actions and the Release.

## Baseline checks

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

No application, OpenCode execution, scientific result, sandbox, research export, or diagnostic bundle has been implemented or tested by this foundation release. Native Windows runtime feasibility, full-text verification, retrieval reliability, and Supervisor-Skills licensing resolution remain explicit application gates in the [product](product.md), [architecture](architecture.md), and [third-party record](../THIRD_PARTY_NOTICES.md).
