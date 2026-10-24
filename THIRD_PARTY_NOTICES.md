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

The initial application core uses Node.js 24's built-in APIs, including SQLite and child processes, without an additional runtime npm dependency. Development adds TypeScript 7.0.2 (Apache-2.0) and `@types/node` 24.19.2 (MIT); exact transitive packages and integrity hashes are in the lockfile. Their package license metadata was inspected on 2026-10-24. The DeepSeek API is an external user-configured service; no DeepSeek implementation is bundled.

GitHub Actions used by the workflows retain their upstream licenses and are pinned to immutable commit SHAs. Any future application distribution must include an updated dependency and license inventory.

## Planned application components and design references

- [assistant-ui](https://github.com/assistant-ui/assistant-ui) is the planned conversation foundation, with its [official AG-UI adapter](https://www.assistant-ui.com/docs/runtimes/ag-ui/overview).
- [AG-UI](https://docs.ag-ui.com/introduction) is the selected frontend interaction protocol. OpenLab retains its own research archive and runtime contracts.
- [shadcn/ui AI Elements](https://ui.shadcn.com/docs/ai-elements) provides supporting UI composition patterns; copied component code must retain applicable source and license records.
- [CopilotKit](https://github.com/CopilotKit/CopilotKit) is an interaction-pattern reference; no SDK or hosted service is selected for the first release.
- OpenCode was the original first-runtime selection in ADR 0001. [ADR 0002](docs/decisions/0002-workspace-and-harness.md) selects self-developed OpenLab Harness and retains OpenCode as an optional future adapter.
- DeepSeek Harness is named in the supplied planning material as architectural inspiration. No upstream implementation or license has been independently established in this revision; no code is copied or bundled on that basis.

These application components are not installed or bundled in v0.0.1. The referenced documentation was reviewed on 2026-10-24; exact dependency/component revisions, license terms and compatibility must be recorded before implementation distribution. A design reference does not imply upstream endorsement.
