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

### Implemented development dependencies

Current development pins React/React DOM 19.3.1 (MIT), assistant-ui React 0.15.31 (MIT), its AG-UI adapter 0.1.0 (MIT), AG-UI client/core 1.0.3 (MIT), react-markdown 10.1.0 (MIT), and YAML 2.9.1 (ISC). Build/test tooling adds Vite 8.3.5 (MIT), its React plugin 6.1.2 (MIT), Playwright 1.64.1 (Apache-2.0), and axe-core Playwright 4.14.0 (MPL-2.0). Package license metadata was inspected on 2026-10-24. Transitive versions, integrity hashes and license metadata remain in package-lock.json; installed packages retain their license files. Supporting controls now include adaptations of shadcn/ui Select, Popover and Dialog (MIT), plus AI Elements Plan (Apache-2.0). The frontend pins Radix Select 2.4.1, Dialog/Popover 1.3.1, Tabs/Collapsible 1.2.1 (MIT) and Lucide React 1.61.0 (ISC). [Component sources and retained license notices](doc/design/component-sources.md) record the adaptation scope and registry response hashes; the existing assistant-ui/AG-UI runtime remains in place.

Zod is overridden to 4.6.7 to avoid [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). The AG-UI client already imports Zod's v4 API despite a v3 package range. Type checks, the official client and browser flows pass with the override; npm audit reports zero vulnerabilities in the verified lockfile. Review this override with future upstream upgrades.

- [assistant-ui](https://github.com/assistant-ui/assistant-ui) is the planned conversation foundation, with its [official AG-UI adapter](https://www.assistant-ui.com/docs/runtimes/ag-ui/overview).
- [AG-UI](https://docs.ag-ui.com/introduction) is the selected frontend interaction protocol. OpenLab retains its own research archive and runtime contracts.
- [shadcn/ui AI Elements](https://ui.shadcn.com/docs/ai-elements) provides supporting UI composition patterns; copied component code must retain applicable source and license records.
- [CopilotKit](https://github.com/CopilotKit/CopilotKit) is an interaction-pattern reference; no SDK or hosted service is selected for the first release.
- OpenCode was the original first-runtime selection in ADR 0001. [ADR 0002](docs/decisions/0002-workspace-and-harness.md) selects self-developed OpenLab Harness and retains OpenCode as an optional future adapter.
- DeepSeek Harness is named in the supplied planning material as architectural inspiration. No upstream implementation or license has been independently established in this revision; no code is copied or bundled on that basis.

These application components are not installed or bundled in the historical v0.0.1 release. Current development's pinned dependencies and verification are recorded above. A design reference does not imply upstream endorsement.

## Document plugins and editor dependencies

### Source-preview inventory, 2026-10-25

The v0.1.0-alpha.1 candidate reuses the existing lockfile dependency graph; only the root application version changes. Direct package metadata in the installed lockfile-matched packages was checked as follows, in addition to the React/assistant-ui/AG-UI/Radix/Lucide inventory above:

| Package | Installed version | Declared license |
| --- | --- | --- |
| `@codemirror/commands` | 6.11.1 | MIT |
| `@codemirror/lang-markdown` | 6.5.2 | MIT |
| `@codemirror/language` | 6.13.1 | MIT |
| `@codemirror/legacy-modes` | 6.5.5 | MIT |
| `@codemirror/search` | 6.7.2 | MIT |
| `@codemirror/state` | 6.7.6 | MIT |
| `@codemirror/view` | 6.43.15 | MIT |
| `@lezer/highlight` | 1.2.5 | MIT |
| `diff` | 9.0.0 | BSD-3-Clause |
| `pdfjs-dist` | 6.4.299 | Apache-2.0 |

GitHub source archives contain tracked OpenLab code and retained design/license notices. They exclude `node_modules`, `dist`, prepared BusyTeX/font components, research data, protected credentials, local `.agents`/`.codex` installations and unselected mockups. `npm ci` installs dependencies with their own license files. Preparing compiler resources downloads third-party components separately; their terms and sources below still apply. No Supervisor-Skills contents or compiler/font binaries are redistributed by this source release.

### Editor and compiler provenance

The default editors use CodeMirror 6 (`@codemirror/state`, `view`, `commands`, `search`, `language`, `lang-markdown`, `legacy-modes` and `@lezer/highlight`), under MIT licenses. Current upstream sources and licenses are linked from [CodeMirror](https://codemirror.net/); its repositories have moved to the maintainer's forge. OpenLab supplies a React host and a neutral theme, not a fork of the editor.

Version comparison uses [jsdiff](https://github.com/kpdecker/jsdiff), BSD-3-Clause, in a bounded Worker. PDF previews use [PDF.js](https://github.com/mozilla/pdf.js), Apache-2.0; the dependency and worker are loaded only for PDF viewing. Installed versions are pinned in the npm lockfile.

The default TeX adapter uses [BusyTeX](https://github.com/busytex/busytex) release `build_wasm_4499aa69fd3cf77ad86a47287d9a5193cf5ad993_7936974349_1`, source commit `4499aa69fd3cf77ad86a47287d9a5193cf5ad993`. BusyTeX's repository glue is MIT; its compiled binaries include TeX Live and other components under their respective licenses. Those binaries are downloaded into a separate runtime cache, with release/source references and checksums. They are not relicensed as OpenLab code. The pinned pipeline invokes TeX with shell escape disabled.

The compiler additionally supplies [Fandol Song](https://ctan.org/tex-archive/fonts/fandol) 0.3 by the Fandol team, GPL with the font exception described in its COPYING file. Its SHA-256 is `a3820003227d4abe31fe28b493200d94a849ccfd078b50a019264f70353020b0`. Downloads use the [MIT CTAN mirror](https://ctan.csail.mit.edu/fonts/fandol/), with the same bytes and hash; TLS verification is retained. Retain the upstream license/source materials when redistributing prepared compiler/font components. The plugin SDK, resource layout and scope are documented in [plugins](docs/plugins.md).
