# Plugin SDK and document workspace

Status: local implementation, 2026-10-24. The [execution ledger](../PLAN.md) records validation. All bundled capabilities declare the same version-1 manifest contract in `app/plugin-contracts.ts`. This iteration uses static registration; it does not install or evaluate external plugin packages.

## Registration and lifecycle

A manifest declares `id`, `name`, `version`, `apiVersion`, `license`, `requires` and `contributes`. Contributions identify a capability kind and supported format identifiers. Optional document templates and compiler parameters belong to the provider. Browser views register a lazy module through `registerViewPlugin`; compilers register a lazy `CompilerProvider`. Exporter functions register through `exporterRegistry`; original-file recovery downloads remain a platform responsibility. Server adapters remain statically registered behind the existing model, tool and RuntimeAdapter boundaries. Duplicate identifiers are rejected.

The catalog supports editor, previewer, compiler, comparator, exporter, panel, model, tool, skill and runtime contributions. `GET /api/v1/plugins` returns metadata and preferences; `PATCH` updates enabled flags and defaults keyed by `kind:format`. Incompatible providers cannot become defaults. Disabling a selected provider does not silently enable another one. Active research blocks disabling execution capabilities. Disabling a view retains its files, revisions and archived results.

The browser host provides `readRevision`, `readAsset`, `saveRevision`, `openArtifact` and a validated `requestOperation`. The platform owns persistence and authorization. Browser plugins receive no provider credential. Bundled browser modules are trusted application code; this SDK is not an isolation guarantee for arbitrary third-party JavaScript. An external package loader requires a separate trust and isolation design.

A view module exports a React component receiving `PluginViewProps`. It consumes document content and emits changes without owning a second archive. An editor can be replaced by registering another manifest and lazy component, then selecting it in preferences. The bundled plain-text editor exercises this same path. Loading/render failures are contained by a per-view error boundary; metadata and original downloads remain available.

## Documents, revisions and drafts

Manual documents belong to a conversation without a synthetic run. Existing run-owned reports remain readable as Markdown. Agent revisions keep run/step provenance and `latestGenerated`; manual revisions have `origin: user` and an optional parent revision. A manual edit never writes into the old report file or appends an Agent execution event. Historical runs select their generated revision rather than a later human edit.

The platform creates immutable revision bytes before publishing metadata. Saving requires a base revision, expected latest revision and request key. An identical retry returns its saved identity; stale pointers return HTTP 409. The browser keeps the draft, fetches current metadata and exposes explicit comparison and rebase actions. It does not automatically merge or replace another revision.

Editing drafts are saved separately from formal revisions. They survive refresh and plugin substitution, and are excluded from portable published archives. Dirty editor closure offers save revision, keep draft or discard changes. The Markdown and LaTeX editors use lazy CodeMirror modules, source editing and preview. Comparison uses a separate jsdiff Worker with a bounded computation time and neutral addition/deletion marks.

Resources have safe project-relative logical names and immutable stored bytes. Resource uploads allow text/TeX/BibTeX, PNG/JPEG and font files, up to 10 MB each, 50 files and 20 MB total. Physical storage uses generated identifiers, not supplied paths. Text documents retain the existing 2,000,000-character limit. Source links must resolve within the project, including preserved original IDs from imported archives. Editing never promotes source verification.

## TeX compiler and PDF preview

The default compiler uses BusyTeX release `build_wasm_4499aa69fd3cf77ad86a47287d9a5193cf5ad993_7936974349_1`. The upstream pipeline runs in an OpenLab browser Worker adapter with no shell escape and no native filesystem mount. XeLaTeX is the default; pdfLaTeX is selectable. The adapter clones Emscripten argument arrays to preserve repeated BibTeX passes and enables file/line diagnostics. TeX Live supports the package collection bundled with that pinned build, not an unrestricted system installation.

Run `npm run plugins:prepare` to prepare the components ahead of first use. The workspace can perform the same preparation when compilation is requested. Downloads use the pinned upstream release, resumable cached ranges and actual byte progress. The prepared cache lives under `.cache/plugin-assets/busytex/`; data-package digests are checked against upstream loader metadata. A receipt records all asset SHA-256 values and is checked before serving them. Preparation uses the host's curl executable. Runtime components are separate from the initial chat bundle and from project archives.

Browser CI runs that preparation as a separate bounded step before Playwright. This keeps a cold download of 202,592,248 bytes outside the first test's 125-second completion wait. Preparation must report `ready`; a failed download stops the job before browser assertions. Failed document tests attach preparation state and rendered build diagnostics; CI retains the isolated fixture's screenshots, trace and diagnostics from `test-results/` for seven days. The compiler's 120-second Worker deadline is unchanged.

The Fandol Song 0.3 font is supplied as `fonts/FandolSong-Regular.otf` in the compiler's virtual project. For Chinese text, use fontspec and select this font by that relative path. It retains its GPL font-exception licensing. Package and font availability is explicit: cached inputs compile offline, while unavailable dependencies fail visibly.

The font download uses the fixed MIT CTAN mirror at `https://ctan.csail.mit.edu/fonts/fandol/FandolSong-Regular.otf`, retaining the existing 4,947,904-byte size and SHA-256 pin. This avoids selecting a different redirecting CTAN mirror during preparation; certificate verification remains enabled. Candidate CI exposed a certificate failure on one font range when using the rotating mirror endpoint. The replacement file was independently fetched and matched the existing hash before changing the source URL.

Compilation freezes an already saved revision and its resource hashes. Unsaved changes use save-and-compile. Only one compiler invocation runs per browser module at a time; cancellation and the 120-second deadline terminate its Worker. Logs and failed/cancelled status remain inspectable. A failed build does not discard the previous successful PDF; the preview identifies its source revision.

PDF.js CMaps, standard fonts and decoder resources are copied to separate on-demand static assets during the build. PDF.js is a separate lazy preview provider, with pages, zoom, text selection and download. Build records contain input revision/hash, resource hashes, compiler/plugin versions, status, log and output hash. These are client-submitted compiler receipts, not server attestation or scientific-claim verification.

## Portable records and compatibility

Exports use archive version 2. Imports accept versions 1 and 2, validate ownership, revision ancestry, resource and build checksums, and remap references while preserving original report bytes. New record kinds are `asset` and `build`; internal editor drafts are excluded. Original source files and successful PDFs remain usable without the editor or compiler plugin. No executable plugin code, TeX installation or credential is exported.

Existing Markdown read routes and run requests remain compatible. A null `contextRevisionId` explicitly excludes report context; omission retains automatic report selection. Conversation history accepts optional `limit` (1–50, browser default 20) and `before` run ID; omission preserves the original full response. Import requests allow 128 MB; ordinary mutation requests retain their 32 MB limit.

See the [OpenAPI definition](openapi.json), [development guide](development.md), and [verification record](verification.md).
