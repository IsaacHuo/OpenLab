# Third-party notices

OpenLab's Apache-2.0 license applies to OpenLab-authored material. Referenced or installed third-party components retain their own licenses. This file is an inventory, not a relicensing grant or a statement of upstream endorsement.

## Supervisor-Skills: planned integration reference

- Upstream: [HKUSTDial/Supervisor-Skills](https://github.com/HKUSTDial/Supervisor-Skills).
- Authors credited by upstream: Yuyu Luo (methodology) and contributors.
- Repository [LICENSE](https://github.com/HKUSTDial/Supervisor-Skills/blob/main/LICENSE) declares CC BY-NC-SA 4.0.
- The [idea-evaluator skill](https://github.com/HKUSTDial/Supervisor-Skills/blob/main/skills/idea-evaluator/SKILL.md) declares CC BY 4.0; [deep-research](https://github.com/HKUSTDial/Supervisor-Skills/blob/main/skills/deep-research/SKILL.md) declares CC BY-NC-SA 4.0.
- These declarations were inspected on 2026-10-24. The links track upstream `main`, so a future integration must pin and recheck an exact revision.
- No upstream skill content is bundled in this release. Resolve applicable repository, file, and reference-material terms before redistribution or making commercial-use claims. Preserve all applicable author and license information in the integration record.

## Development dependencies and tools

The npm lockfile records exact development dependencies and integrity hashes. Their license metadata is available in the installed packages. CI downloads actionlint (MIT) and Gitleaks (MIT) from their official releases; pinned versions, archive URLs, and SHA-256 digests are recorded in [the tool manifest](scripts/tools.json). These executables are cached locally and are not included in the source release.

GitHub Actions used by the workflows retain their upstream licenses and are pinned to immutable commit SHAs. OpenCode is an architectural runtime selection, not a bundled dependency in v0.0.1. Any future application distribution must include an updated dependency and license inventory.
