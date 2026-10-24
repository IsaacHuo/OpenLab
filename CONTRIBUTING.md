# Contributing to OpenLab

[简体中文](CONTRIBUTING.zh-CN.md)

OpenLab currently contains governance, documentation, and repository tooling. The [product specification](docs/product.md) identifies planned application behavior. Contributions should distinguish working functionality from design proposals.

## Start a contribution

Report reproducible defects using the [bug form](https://github.com/IsaacHuo/OpenLab/issues/new?template=bug.yml), propose features or integrations through the other [issue forms](https://github.com/IsaacHuo/OpenLab/issues/new/choose), and use [Discussions](https://github.com/IsaacHuo/OpenLab/discussions) for questions. Small corrections can go directly to a PR. English and Chinese are welcome.

For substantial architecture or integration changes, describe the user problem, existing alternatives, expected inputs and outputs, upstream license, and verification criteria before implementation. Preserve author credits and negative research results.

## Local checks

Install Node.js 24 LTS and Git. Clone your fork and create a short-lived branch; maintainers use `codex/` by default. Run:

```sh
npm ci
npm run check
npm run check:actions
npm run check:secrets
```

On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm.ps1`. The workflow and secret checks support Windows x64 and Linux x64 and download fixed, checksum-verified binaries into `.cache/`. They need network access on first use. Windows downloads use the built-in curl, with GitHub CLI as a fallback for networks that block direct release downloads. Other platforms can run the documentation checks and rely on CI for these two binaries until tool manifests add their platform.

`npm run check` runs Markdown lint, local-link and repository configuration validation, and automation tests. The original Chinese vision is preserved verbatim and excluded from style lint. External sites are not queried by the link checker because network availability must not block a documentation PR.

## Pull requests

- Use a Conventional Commit PR title, for example `docs: clarify research evidence levels` or `fix(ci): validate release targets`.
- Explain the problem, resulting behavior, actual verification, and related issue when applicable.
- Update both README versions and both contribution guides when changing their shared instructions. Other technical documents currently have English as the canonical version.
- Add a concise entry under `Unreleased` in CHANGELOG for user-visible changes. The release preparation commit moves those entries into the selected version.
- Keep research data, credentials, generated logs, and local configuration out of Git. Use synthetic examples.
- Contributions are submitted under the applicable repository license; retain separate third-party terms. No CLA or mandatory DCO sign-off is required at this stage.

The `main` ruleset requires a PR, passing `required-checks`, and resolved review discussions. A second maintainer's approval is not required during bootstrap. CODEOWNERS routes review requests; it does not imply that self-approval is possible or necessary. Maintainers squash merge, using the PR title as the commit subject, then delete the branch.

## Research and integration quality

Track exact upstream revisions and dependencies. Demonstrate an integration's claimed maturity with a real task, not a repository link or simulated output. Model text is not automatically verified evidence. Record failed retrieval, uncertainty, contradictory results, and known limitations.

Security reports follow [SECURITY](SECURITY.md). Community participation follows the [Code of Conduct](CODE_OF_CONDUCT.md). Release operations are documented in the [maintainer guide](docs/maintaining.md).
