# Changelog

Delivered changes are recorded here. Version tags use `v` followed by a semantic version. Foundation releases describe repository infrastructure; the first runnable preview is planned as `v0.1.0-alpha.1`.

## [Unreleased]

### Added

- Research workspace specification covering conversation, execution state, live artifact revisions, evidence navigation, responsive layouts and application acceptance scenarios.
- Minimal OpenLab Harness specification and ADR 0002 selecting a self-developed first runtime, AG-UI at the Platform gateway and assistant-ui for conversation.

### Changed

- Product, architecture, logging, architecture diagram and bilingual README now describe Platform-owned conversations, steps, human interactions and artifacts independently of runtime, model, tools and UI.
- OpenCode becomes an optional future adapter; ADR 0001 preserves the historical selection with a supersession notice. This revision delivers documentation only, with no application code or new runtime dependency.

## [0.0.1] - 2026-10-24

### Added

- Apache-2.0 licensing, third-party attribution, contributor guidance, community conduct, support, and private security reporting policy.
- English and Chinese README and contribution guides; original vision, product specification, architecture, technical decisions, and logging specification.
- Code-generated vector product marks with mirrored shoulders, a circular bowl and a half-turn-symmetric wave, plus reproducible geometry and usage guidance.
- Bug, feature, and integration issue forms; PR template, ownership, labels, topics, and repository rules managed from versioned configuration.
- Cross-platform documentation and configuration checks, actionlint, Gitleaks, dependency updates, and PR module labeling.
- Maintainer-triggered releases with version, changelog, main-branch, CI, and duplicate-tag validation; protected version tags.

### Release boundary

This foundation release contains specifications and repository tooling. It does not contain a runnable research application, an installer, a verified Supervisor-Skills integration, or runtime security guarantees.

[Unreleased]: https://github.com/IsaacHuo/OpenLab/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/IsaacHuo/OpenLab/releases/tag/v0.0.1
