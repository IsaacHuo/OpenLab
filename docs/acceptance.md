# First research preview acceptance

Scope: the first local research loop in [product](product.md), with the explicit preview limits below. This record does not claim completion of the founding vision's later compute, multi-agent, institutional or ecosystem phases.

As of 2026-10-25, the latest recorded Windows local preflight passed 57 core/API/governance tests and 12 browser scenarios, using an existing compiler cache. The latest inspected [PR #11 browser CI job](https://github.com/IsaacHuo/OpenLab/actions/runs/40165761893/job/121086433393) passed 11 scenarios and failed the first real XeLaTeX completion wait; required-checks failed. The [verification record](verification.md) identifies the head, tested merge revision, environment and unresolved cause. This document retains earlier stages as dated evidence; local success does not establish the merge gate.

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
| Repository delivery | Historical local preflight results are in [verification](verification.md); PR #11 remains unmerged with failed browser acceptance and required-checks as inspected on 2026-10-25 |

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

The plugin stage recorded 57 core/API/governance tests and 12 browser scenarios on Windows on 2026-10-24, repeated in the 2026-10-25 local preflight; see the [verification record](verification.md) and [execution ledger](../plan.md). Default capabilities use the shared plugin catalog and host contract. Markdown/LaTeX editing, platform drafts, immutable manual revisions, explicit comparison/conflicts, standalone documents, v2 archives and v1 imports are implemented. Archive versions are independent of SQLite `user_version=1`. Disabling or crashing a view preserves original downloads and the conversation.

Those local runs covered real XeLaTeX compilation of Chinese, math, PNG, a managed chapter and BibTeX; PDF.js confirmed readable text. Real pdfLaTeX also passed with external network access blocked and components cached. Missing-package recovery preserved the prior PDF; controlled stalled Workers verified cancel/deadline behavior. Desktop, tablet and phone screenshots of the same compiled document were inspected at that stage. ENG-02 did not rerun these checks; the CI timeout remains unresolved. No additional live model/provider compatibility claim is made by this stage.
