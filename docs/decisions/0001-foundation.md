# ADR 0001: local-first foundation and replaceable execution

Date: 2026-10-24. Status: accepted design; repository governance implemented in v0.0.1, application decisions await implementation.

## Context

OpenLab begins with an empty public repository and a long-term cross-disciplinary research vision. The first user-facing value is a traceable literature task using existing research skills. The project needs reliable contribution and release practices before claiming runtime capabilities.

## Decisions

1. Use Apache-2.0 for OpenLab-authored work, retaining independent third-party licenses and source records.
2. Publish English primary documentation with Chinese README and contribution guides. Preserve the original Chinese vision verbatim.
3. Use a local service and browser UI, prioritizing native Windows; keep WSL an explicit compatibility option. No hosted platform account is required.
4. Use a modular TypeScript/Node.js 24 service, React UI, SQLite metadata and ordinary project files for the application. Avoid distributed infrastructure until concrete scale or isolation needs justify it.
5. Reuse OpenCode as the first runtime behind the platform adapter. Own the research archive independently of runtime history.
6. Ship literature research before arbitrary code execution, visual workflows, multi-agent scheduling, remote compute or team hosting. Public users can bring their own supported models.
7. Keep CI required on all PRs, use squash merges and Conventional Commit titles, and allow a single maintainer to merge without a second person's approval. Protect release tags from update/deletion.
8. Release the foundation as v0.0.1. The first runnable preview uses v0.1.0-alpha.1 and must meet the product acceptance criteria.

## Consequences and gates

This keeps the core small while introducing an adapter boundary, explicit research objects, and an archive that can survive tool changes. It does not make runtime output scientifically trustworthy by itself.

Before application implementation proceeds beyond a feasibility slice, record the exact OpenCode version and test native Windows skill loading, tool restriction, isolated configuration, event translation, permission replies, cancellation and crash recovery. If the runtime cannot enforce the literature release's tool boundary, keep that integration non-executable until a supported adapter or isolation solution is verified. Do not silently broaden user access.

Before distributing Supervisor-Skills content, pin a revision and resolve its repository/file license declarations. v0.0.1 links to upstream and bundles no skills. Before shipping a model client or database package, record its exact version, license, and compatibility in a new or amended ADR. Before calling a release reproducible, distinguish archived conditions from deterministic output and pass a documented independent rerun.

## Alternatives considered

- A new internal agent runtime offers control but duplicates existing tool loops and creates additional maintenance; defer it.
- A mandatory external CLI setup reduces packaging work but places environment administration on public users; use it only for early developer feasibility.
- A full desktop shell or container requirement adds deployment surface before the local browser workflow is validated; defer both.
- A broad marketplace at launch increases the compatibility and security matrix before one task works end to end; begin with a curated reference integration and a generic importer.

See [architecture](../architecture.md) for contracts and [product](../product.md) for acceptance criteria.
