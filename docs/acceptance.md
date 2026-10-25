# First research preview acceptance

Scope: the first local research loop in [product](product.md), with the explicit preview limits below. This record does not claim completion of the founding vision's later compute, multi-agent, institutional or ecosystem phases.

[v0.1.0-alpha.1](https://github.com/IsaacHuo/OpenLab/releases/tag/v0.1.0-alpha.1) was published on 2026-10-25 from `0e6f348612b56ac17e848c88fd9a3034b61bfc56` after the exact candidate and main push CI, release dry-run and release workflow passed. The final 13 browser scenarios include deterministic concurrent-material selection and cross-document comparison regressions. The preview limits below remain applicable; this publication adds no new live provider or full-text compatibility claim.

As of 2026-10-25, ENG-03 passed 57 Node tests and 13 browser scenarios locally. [PR #11 checks](https://github.com/IsaacHuo/OpenLab/actions/runs/40170016084) passed Windows/Linux repository validation, independently prepared compiler resources, all 13 browser scenarios, actionlint, Gitleaks and required-checks. PR #11 was squash merged as `c9a96f3ca22fd85276ca9fb09defa1a541bd08c1`. The earlier first-compilation timeout and its evidence remain historical in [verification](verification.md). No additional live model calls were made. The current task is in [PLAN](../PLAN.md).

## Evidence matrix

| Requirement | Evidence and result |
| --- | --- |
| New-user model/retrieval setup, plan confirmation, research and export | Native Windows Chrome session with real DeepSeek Flash/Crossref; five economics metadata sources, final report and archive download; screenshot in README |
| Economics and humanities, English and Chinese | Two live supervised tasks each returned five metadata records and one final report; both archive round trips passed |
| Generic pinned skill with original resources | Real Git installation of OpenLab commit `7b927080f722ca547969ef84eb22a9a7d1b1698f`, 89 original files preserved, literature SKILL.md and linked evidence resource loaded; a live DeepSeek/Crossref task with that context produced five sources and an exported/imported final report |
| Independent repository fixture | Economics and humanities skill trees preserve exact bytes, resources and separate license metadata without upstream-name special cases; traversal, links, case collisions and corruption rejected |
| Direct tool selection | Separate metadata RuntimeAdapter calls no model, confirms scope first and saves sources/report; controlled unit/browser tests plus real Crossref query returned five records and zero model tokens |
| Questions and permission denial | Same-run structured answer, stale/duplicate/contradictory decisions and denial tests; browser reload preserved the pending question; denied source read performed no fetch |
| Live artifacts and exact references | Draft/final revisions, immutable checksums, newer-version cue, source citations and producing-step navigation checked in native desktop browser; navigating to a step preserves the selected revision |
| Empty, contradictory or inaccessible evidence | Controlled retrieval cases retain empty results, conflicting records and inaccessible content; model interpretations remain unchecked |
| Invalid credentials and malformed provider output | Controlled HTTP 401, incomplete SSE, malformed arguments, output-limit finishes and usage errors fail without research dispatch or fake success |
| Cancellation and completion race | Native child exit confirmed before cancellation terminal state; completed runs retain completion; interrupted text/step AG-UI projections close correctly for the official client |
| Worker/control-plane loss and explicit retry | Killed native worker becomes interrupted; SQLite reopen retains records and never invokes a model; linked retry and single-owner data root tested |
| Lost browser subscription and replay | Disconnect/reload does not cancel work; domain cursors and AG-UI replay are read-only; conversation reconstruction has one user message and no duplicate tools/model dispatch |
| Offline archive and export/import integrity | Store-only round trips preserve report/material bytes and hashes; imported historical decisions cannot dispatch; foreign references, private configuration and tampering rejected |
| Component independence | Substitute model/tool/context/sink, second runtime test double, real direct-tool runtime and independent official AG-UI client all use platform-owned records |
| Keyboard, narrow layouts and language | Native Chrome desktop and 390-pixel drawers, focus/escape, keyboard divider, UTF-8 materials and English/Chinese controls checked; exercised axe WCAG A/AA checks have zero violations |
| Launch recovery and first use | Missing/expired credentials, wrong-origin link, offline service and pasted valid launch link covered in a fresh browser; metadata path remains available without a model |
| Conversations and follow-up context | Search, rename, continuous history, old-run focus and draft/selection reload checked in Chrome; server freezes at most six terminal runs, 40,000 history characters and a selected report excerpt of 20,000 characters |
| Context isolation and archives | Foreign conversation revisions rejected; new plans require new confirmation; truncation recorded; context IDs remapped on import and archives without context remain readable |
| Materials and provider editing | Selected/empty/default material sets frozen; excluded text omitted and foreign IDs rejected; browser selections persist; blank credential retained, failed saves rolled back, active provider edits blocked and changed connections require retesting |
| Repository delivery | PR #11 required-checks passed on head `73ad1658c7f9f3d4d283d5221af4922668661a99`, then merged as `c9a96f3`; later candidate changes require their own exact-revision checks |

The daily-workflow stage on 2026-10-24 recorded 51 unit/integration/governance tests and eight browser scenarios. The later plugin stage and 2026-10-25 local preflight recorded 57/12. Live probes are opt-in and separate from synthetic automation and real compiler tests; none were repeated for ENG-02. Detailed outcomes and the earlier 45/3 and 45/5 stages are in [verification](verification.md).

## Preview limits

- Crossref is the available scholarly metadata provider. General public-page reads require scoped permission and public HTTPS addresses. The native network's reserved fake DNS ranges prevent successful general page access; the fixed Crossref endpoint works. No full-text or scientific-claim verification is asserted.
- Windows is the credential-persistence target. Native DPAPI and Chrome were tested; Linux CI tests use synthetic credentials. Other operating systems, browsers and model providers require their own compatibility evidence.
- DeepSeek Flash is tested in non-thinking mode. Reported token budgets stop new calls but are not hard billing caps; missing usage stays unknown. Model calls have bounded turns/time and no automatic ambiguous retry.
- Text/Markdown and PNG/JPEG attachments can be previewed; image model input, research-source PDF extraction, active HTML/code, arbitrary execution, long-running compute, checkpoint recovery and multiple agents are deferred. The plugin PDF.js preview of compiled documents does not establish research-source extraction.
- One material is limited to 10,000,000 bytes before base64 encoding. Ordinary JSON request bodies are limited to 32,000,000 bytes; `POST /api/v1/import` allows 128,000,000 bytes including encoded files and records. See the [code-backed limit table](development.md#local-research-api).
- Generic skills remain inert files and bounded instructions, with separate upstream declarations and no executed scripts. Supervisor-Skills is not bundled or endorsed; its redistribution terms remain unresolved and are not needed for the first-party preview.
- OpenAlex, further adapters, diagnostic bundles, packaging/installers, additional security isolation and the longer-term roadmap are subsequent work. The current source preview does not advertise those capabilities.

## Plugin workspace acceptance

The plugin stage recorded 57 core/API/governance tests and 12 browser scenarios on Windows on 2026-10-24, repeated in the 2026-10-25 local preflight; see the [verification record](verification.md) and [execution ledger](../PLAN.md). Default capabilities use the shared plugin catalog and host contract. Markdown/LaTeX editing, platform drafts, immutable manual revisions, explicit comparison/conflicts, standalone documents, v2 archives and v1 imports are implemented. Archive versions are independent of SQLite `user_version=1`. Disabling or crashing a view preserves original downloads and the conversation.

Those local runs covered real XeLaTeX compilation of Chinese, math, PNG, a managed chapter and BibTeX; PDF.js confirmed readable text. Real pdfLaTeX also passed with external network access blocked and components cached. Missing-package recovery preserved the prior PDF; controlled stalled Workers verified cancel/deadline behavior. Desktop, tablet and phone screenshots of the same compiled document were inspected at that stage. ENG-03 repeated these checks and added the cross-document comparison regression; its CI passed after resource preparation was separated. No additional live model/provider compatibility claim is made by this stage.

## Alpha data and permission gates, ENG-04, 2026-10-25

On Windows x64 with Node.js 24.19.0 and npm 11.17.0, the command below passed 30 tests, with no failures or skips. These are controlled local tests using isolated stores, not live provider acceptance. ENG-03's full 57-test run and 13 browser scenarios provide unchanged supporting evidence.

```sh
node --test app/tests/platform.test.ts app/tests/runtime.test.ts app/tests/service.test.ts app/tests/store.test.ts app/tests/documents.test.ts app/tests/context.test.ts app/tests/workflow.test.ts
```

| Gate | Result | Code and test evidence |
| --- | --- | --- |
| Each new run confirms its current plan | Pass, controlled | `platform.test.ts`: confirmation gates dispatch and duplicate creation keys; `context.test.ts`: follow-up context requires fresh confirmation |
| Permission denial and stale decisions | Pass, controlled | `platform.test.ts`: structured answers validate IDs/versions, denial is retained and contradictory/stale decisions are rejected |
| Reconnect, imported approvals and replay cannot execute | Pass, controlled | `service.test.ts`: independent AG-UI/domain cursor replay creates no work; `store.test.ts`: executable imported runs rejected; `context.test.ts`: historical authorization excluded |
| Cancellation confirms worker termination | Pass, native worker and controlled race | `runtime.test.ts`: child cancellation is terminal only after exit; `platform.test.ts`: cancelling blocks late decisions, completed runs keep completion |
| Restart and explicit linked retry | Pass, controlled/native worker | `platform.test.ts`: reopening reconciles lost runs without dispatch and retries link to a valid parent; `runtime.test.ts`: lost worker is interrupted without automatic restart |
| Credentials and request authorization | Pass, controlled | `service.test.ts`: session/origin/CSRF checks and public-only provider responses; `workflow.test.ts`: protected credential retention/rollback and active-run editing blocked; `store.test.ts`: private imported configuration rejected |
| Manual revisions preserve Agent records | Pass, controlled | `documents.test.ts`: original bytes/events unchanged, human origin retained, idempotent saves and conflicts preserve drafts |
| Portable v1/v2 and exact file bytes | Pass, controlled | `documents.test.ts`: legacy v1 imports, v2 documents/resources/build round trips and source-hash rejection; `store.test.ts`: report/material hashes, corruption and future versions |
| Cross-project and filesystem isolation | Pass, controlled/native filesystem | `context.test.ts`, `workflow.test.ts` and `documents.test.ts`: foreign revisions/materials/citations rejected; `store.test.ts`: traversal, foreign references and junction redirects rejected |
| Persistence and single ownership | Pass, controlled | `platform.test.ts`: state/events roll back together; `store.test.ts`: one control plane owns each data root |

All test filenames in the table are under `app/tests/`; owners remain Platform, Store, Documents and the existing local HTTP service. No new archive format, database schema, runtime or permission policy was introduced by this audit.

The release boundary remains a Windows-first, metadata-research source preview: one scholarly provider, Windows-only protected credential persistence, dated DeepSeek non-thinking compatibility, no verified general full-text/claim support, static trusted plugins and no installer. Supervisor-Skills is excluded; prepared TeX/font binaries are downloaded into an ignored runtime cache and are not bundled in source archives. These are documented preview limits, not passed tests for deferred features. Within that boundary the reviewed data and permission gates have no unresolved blocker; candidate identity, licenses and exact candidate/main CI remain ENG-05/06 gates.
