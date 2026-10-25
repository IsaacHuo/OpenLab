# Repository operations and releases

## Sources of truth

| Configuration | Controls |
| --- | --- |
| [repository.json](../.github/repository.json) | Repository settings, topics, main and tag rulesets |
| [labels.json](../.github/labels.json) | Managed label names, colors and descriptions |
| [labeler.yml](../.github/labeler.yml) | Non-destructive PR module labeling |
| [release.yml](../.github/release.yml) | Generated release-note categories |
| [VERSION](../VERSION), [package.json](../package.json), [CHANGELOG](../CHANGELOG.md) | Release identity and delivered changes |
| [tools.json](../scripts/tools.json) | Fixed actionlint/Gitleaks archives and SHA-256 digests |

## GitHub configuration

With GitHub CLI installed and authenticated as a repository administrator, run:

```sh
npm run github:sync
npm run github:verify
```

Sync is repeatable: it updates managed labels in place, adds missing labels, preserves unmanaged labels and all existing Issue/PR associations, and only changes the two named OpenLab rulesets. It does not delete existing issues or labels. If a mutation returns an ambiguous network error, rerun sync: it reads the current state before deciding whether another mutation is needed. Verification performs reads only and fails on configuration drift.

The tooling pins KaTeX 0.18.2 through an npm override because the Markdown linter's transitive range otherwise selects a version affected by [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7). Recheck the upstream dependency range and advisory before removing this override.

The settings enable Issues and Discussions, disable Wiki, allow squash merging only, and delete merged branches. The main ruleset requires a PR, resolved review discussions, linear history and `required-checks` on the latest head. It permits zero required approvals during single-maintainer bootstrap. There is no permanent administrator bypass. The tag ruleset prevents updates and deletion of `v*` tags without blocking creation of a new version.

CI runs on every PR and every push to `main`, with no path filter that could leave required checks pending. `required-checks` aggregates Windows/Linux repository validation, actionlint and Gitleaks and fails if any dependency did not succeed. Fork PR checks have read-only repository access and no model or maintainer secrets. The separate PR-target labeling workflow runs a SHA-pinned labeler against trusted base configuration and never checks out or executes contributor code.

The Gitleaks check scans Git history and the current working tree. This is complementary to private reporting and safe credential handling; a clean result is not a security certification. Dependabot checks npm and Actions weekly. Downloaded-tool versions and hashes in tools.json are reviewed manually against official release assets; update the version, URLs and hashes together. No stale-Issue auto-close policy is configured.

## Prepare a release

1. Use a PR to update VERSION, package.json and package-lock.json to the same version. Move actual delivered changes from `Unreleased` into a dated CHANGELOG section. Keep an empty `Unreleased` section for subsequent work.
2. Check local validation and the PR's CI. Squash merge after all required checks pass and discussions are resolved.
3. Wait for the `Repository checks` push workflow on the exact new `main` commit to succeed. PR checks alone do not authorize a release.
4. Run `npm run release:check -- 0.1.0-alpha.1` from a clean checkout at current main for this preview. It performs all identity, changelog, CI, main-target and remote-tag checks without creating a tag or release.
5. Dispatch the [Release workflow](https://github.com/IsaacHuo/OpenLab/actions/workflows/release.yml) on `main`, entering the version without `v`. Example:

   ```sh
   gh workflow run release.yml --repo IsaacHuo/OpenLab --ref main -f version=0.1.0-alpha.1
   ```

The workflow runs with default read permission and job-scoped content write permission. It revalidates identity and the exact main commit, creates an annotated tag, pushes it, then publishes a GitHub Release with reviewed CHANGELOG content plus categorized merged-PR notes and contributor credits. Stable semantic versions become the latest release; versions containing a prerelease suffix are marked prerelease. A repository-wide release concurrency group serializes publication.

The historical first release is `v0.0.1`: repository governance, specifications and tooling. The first research source preview is `v0.1.0-alpha.1`, gated by the [alpha acceptance](acceptance.md#alpha-data-and-permission-gates-eng-04-2026-10-25) and [execution plan](../PLAN.md). GitHub provides source archives; no application installer, npm publication or prepared TeX/font binary bundle is attached. Publishing still requires the exact main push workflow to pass and explicit release authorization; candidate version files alone do not prove publication.

## Failure and recovery

Invalid versions, mismatched files, missing or empty dated notes, a non-main target, missing/failed CI and an existing local or remote tag fail before publication. Never reuse a published version, move its tag, or delete it to retry.

If tag creation succeeds but Release publication fails, inspect the tag's commit and whether a Release already exists. If there is no Release, a maintainer can publish from that existing tag using `gh release create <tag> --verify-tag --notes-file <reviewed-file>`; reuse the verified commit's changelog and generated categories. The normal release workflow deliberately rejects the existing tag rather than silently treating an ambiguous partial publication as a new release. Record the recovery in the workflow/PR history.

Branch rules are policy, not a substitute for review. Changes to required check names, bypass actors or release permissions need explicit rationale in the PR and a matching configuration update. Add a reviewer approval requirement only when another maintainer can provide it.
