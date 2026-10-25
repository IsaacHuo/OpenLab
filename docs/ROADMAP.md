# OpenLab 长期开发路线图

本文件整理已有项目的后续工作，不重新立项。首次检查日期：2026-10-25；基于分支 `codex/research-acceptance`、HEAD `ac2b5274f4693f1b0c7cca3c26f4cac131ffd0a7` 及检查时已有的未提交实现。任务执行状态统一记录在 [STATUS](STATUS.md)。首次规划仅修改协作文档；随后用户已明确授权按仓库规则提交、推送已有项目改动。本次授权不包含合并 main 或发布版本。

## 目标与现有基线

长期目标沿用[原始愿景](vision.zh-CN.md)：让研究项目、证据和成果由用户持有，模型、工具、运行时和界面可以替换。近期目标是把已经可运行的本地研究与文档工作台收敛为可复核、可维护的研究预览，再通过既有发布门槛准备 `v0.1.0-alpha.1`。

当前已有 TypeScript/Node.js 24、React/Vite、SQLite 与普通文件、受监督 Harness、Crossref、计划确认、来源追溯、导入导出；未提交实现还包含连续研究上下文、静态插件、Markdown/LaTeX 编辑、修订比较、BusyTeX 与 PDF.js。详细进度和验证边界见 [STATUS](STATUS.md)，不把这些能力重新列为待开发。

## 文档分工

| 文档 | 唯一职责 |
| --- | --- |
| [AGENTS](../AGENTS.md) | 跨对话工作规则、架构边界、测试与交接要求 |
| 本文件 | 整体目标、模块地图、后续任务、依赖与完成条件 |
| [STATUS](STATUS.md) | 当前工作区事实、任务状态、阻塞与下一步 |
| [DECISIONS](DECISIONS.md) 和 [ADR 目录](decisions/) | 已确认决策索引及详细原因、取代关系 |
| [product](product.md)、[architecture](architecture.md)、[workspace](workspace.md)、[harness](harness.md)、[logging](logging.md) | 产品行为与架构目标；原有历史描述继续保留 |
| [已确认 UI](../doc/design/README.md) | 视觉、交互、令牌与用户确认的后续修订 |
| [development](development.md)、[plugins](plugins.md)、[OpenAPI](openapi.json) | 当前实现、操作方法、插件与接口契约 |
| [implementation-plan](implementation-plan.md)、[plan.md](../plan.md) | 已有迭代计划与两轮已完成执行台账；保留历史，不另抄一份任务状态 |
| [acceptance](acceptance.md)、[verification](verification.md) | 验收场景、测试条件、实际证据及局限 |
| [CONTRIBUTING](../CONTRIBUTING.md)、[maintaining](maintaining.md) | 贡献、CI、GitHub 管理与发布流程 |

新对话按 AGENTS → STATUS → 本文件 → DECISIONS → 受影响规格/代码/测试读取。最新明确用户决定优先；不能用旧文档的历史状态覆盖已确认修订，也不能把本地实现或测试通过写成已发布。发现规格与代码不一致时先记录差异，不自行修改产品需求。

## 模块地图

| 模块 | 主要入口 | 现有验证入口 |
| --- | --- | --- |
| 平台与 API | `app/main.ts`、`service.ts`、`platform.ts`、`contracts.ts`、`ag-ui.ts`、`openapi.ts` | `app/tests/platform.test.ts`、`service.test.ts`、`workflow.test.ts` |
| 研究执行 | `app/harness.ts`、`runtime.ts`、`worker.ts`、`model.ts`、`direct-tool.ts` | `harness.test.ts`、`runtime.test.ts`、`model.test.ts`、`direct-tool.test.ts`，均在 `app/tests/` |
| 证据、输入与配置 | `app/research.ts`、`network.ts`、`context.ts`、`settings.ts`、`skills.ts` | `app/tests/research.test.ts`、`context.test.ts`、`settings-skills.test.ts` |
| 档案与文档 | `app/store.ts`、`documents.ts` | `app/tests/store.test.ts`、`documents.test.ts` |
| 浏览器与插件 | `web/workspace.tsx`、`conversation.tsx`、`document-panel.tsx`、`plugins/`；`app/plugin-contracts.ts`、`plugins.ts`、`tex-resources.ts` | `browser-tests/workspace.spec.ts`、`documents.spec.ts`；`app/tests/documents.test.ts` |
| 工程与交付 | `scripts/`、`.github/`、`package.json`、锁文件 | `scripts/tests/`、`npm run check` 与现有 CI |

## 里程碑与任务依赖

| 里程碑 | 出口条件 | 任务 |
| --- | --- | --- |
| M0 协作入口 | 规范、路线图、状态、决策可从仓库独立读取，文档检查通过 | ENG-00 |
| M1 可复核开发基线 | 既有改动交付范围清楚、文档口径一致、构建和浏览器证据可复现 | ENG-01 → ENG-02 → ENG-03 |
| M2 alpha 候选准备 | 明确满足及未满足的产品门槛；候选版本、许可、来源与 CI 证据对齐 | ENG-04 → ENG-05 |
| M3 源码预览发布 | 获得明确发布授权后，从通过检查的 main 发布；不默认为安装包 | ENG-06 |

依赖链为 `ENG-00 → ENG-01 → ENG-02 → ENG-03 → ENG-04 → ENG-05 → ENG-06`，无环。默认逐项在当前选定模型的新对话执行；没有自动并行或子 Agent。每项完成后更新 STATUS。文件重叠较多，未收敛基线前不跨对话同时修改 `service.ts`、`store.ts`、`workspace.tsx` 或验收文档。

## 可独立交接的任务

所有命令从仓库根目录执行；环境为 Node.js 24 和锁文件依赖。以下是范围与验收合同，具体修复必须由实际失败或后续用户任务支持，不因路线图主动扩展业务。

### ENG-00 建立轻量协作入口

- 依赖：无。
- 范围：根目录 `AGENTS.md` 及本文件、`STATUS.md`、`DECISIONS.md`。
- 交付：保留原规范和有效文档，列出已有实现、未提交状态、决策来源、任务依赖和每次任务结束更新状态的要求。
- 完成条件：新对话可找到当前事实、第一项任务和准确验收；本轮无业务代码变更。
- 验证：`npm run lint:markdown`、`npm run check:repository`、`git diff --check`；检查新增文件与本轮前后文件哈希。

### ENG-01 盘点并收敛现有改动范围（建议首先执行）

- 依赖：ENG-00。
- 范围：检查 Git 中已有改动、`plan.md`、设计规格、依赖及新文件；交付结论写入 STATUS。2026-10-25 用户授权将已有项目改动提交并推送，沿用现有 PR/CI 规则，不增加业务功能。
- 交付：按已完成行为划分待提交批次，列清依赖和遗漏文件；区分产品源码/测试/许可、已确认设计、本地 `.agents/` 与 `.codex/` 配置、`output/` 未选稿、忽略的数据和缓存。检查 tracked、staged、unstaged、untracked，不使用全量暂存。
- 完成条件：每类改动都有保留/纳入交付/待确认的处置，源码所引用的新文件不会漏交；按新增授权提交、推送项目文件并提供 PR；保留用户所有既有内容和本地工具。需要用户决定的文件列为后续集成阻塞，不妨碍完成盘点。
- 验证：`git status --short --branch`、`git diff --stat`、`git diff --cached --stat`、`git ls-files --others --exclude-standard`、`git diff --check`；逐类核对路径和 import/资源引用，STATUS 记录基线 SHA。单纯盘点无需重跑未变化的完整测试。

### ENG-02 对齐当前实现与文档口径

- 依赖：ENG-01 的改动分类与实现清单。
- 范围：`docs/development.md`、`acceptance.md`、`verification.md`、`implementation-plan.md` 及必要的文档入口；不改原始愿景和历史 ADR 正文来伪造新状态。
- 交付：明确历史 45/5、51/8 与最新 57/12 的验证所属阶段；区分普通请求 32 MB 与导入 128 MB、档案 v2 与数据库版本；将过时“下一轮”措辞定位为历史或更新为当前事实。确认 README/安全说明的“历史发布”与“当前源码”边界没有混淆。
- 完成条件：当前数值和能力说明可追到代码或具日期的证据，旧记录被明确标为历史，未验证的保证不升级；共享双语说明若有变化同步更新。
- 验证：`npm run lint:markdown`、`npm run check:repository`、`git diff --check`；对照 `app/service.ts`、`store.ts`、测试声明及验证记录逐项人工核对。测试数仅作为记录，不建立数量断言。

### ENG-03 复核构建与浏览器验收可复现性

- 依赖：ENG-02；实际提交范围和测试入口已清楚。
- 范围：既有 `package.json`、`playwright.config.ts`、`scripts/browser-fixture.mjs`、两份浏览器 spec、`.github/workflows/checks.yml` 的验证与必要操作文档。
- 交付：在隔离测试目录执行现有构建/浏览器场景，记录 Chrome、编译资源冷缓存准备和已有缓存条件；确认研究夹具无真实模型调用，真实 TeX 与停滞 Worker 故障测试分开。若失败，记录最小复现并拆出有验收的修复任务。
- 完成条件：`npm run build` 和现有 12 项浏览器场景有本次结果；中文 TeX/PDF、失败保留旧 PDF、取消/超时、响应式与 axe 的证据边界清楚；冷缓存或 CI 环境限制有具体处理动作，不能用旧截图替代结果。
- 验证：`npm run build`、`npm run test:browser`；完整真实编译需要固定资源，必要时先运行 `npm run plugins:prepare`（约 203 MB 下载），准备失败应标为阻塞。人工检查生成的桌面/平板/手机截图；不访问用户研究数据。

### ENG-04 复核 alpha 的数据与权限门槛

- 依赖：ENG-03 通过；若存在新失败先完成对应修复。
- 范围：`docs/product.md`、`harness.md`、`plugins.md`、`acceptance.md` 及 `app/tests/` 中现有边界测试。
- 交付：逐项将 alpha 验收映射到代码与证据，覆盖新轮确认、权限拒绝、重放不执行、取消/重启、凭据隔离、不可变人工修订、v1/v2 往返与跨项目引用拒绝；列清仍属预览限制的能力。
- 完成条件：门槛各有“通过/限制/阻塞”和可定位证据。发现缺测或失败时拆出有明确断言的修复任务并阻止依赖任务，不在一次对话做全仓重构；历史 live 结果保留日期与模型身份。
- 验证：`node --test app/tests/platform.test.ts app/tests/runtime.test.ts app/tests/service.test.ts app/tests/store.test.ts app/tests/documents.test.ts app/tests/context.test.ts app/tests/workflow.test.ts`；对照验收表人工检查。新增外部模型调用需单独授权，受控测试不冒充 live 结果。

### ENG-05 准备 alpha 发布候选

- 依赖：ENG-04 门槛通过或限制得到明确接受，并已形成明确纳入交付的基线。
- 范围：`VERSION`、`package.json`、`package-lock.json`、`CHANGELOG.md`、README、第三方声明与既有维护文档；不自动创建 tag、Release 或安装包。
- 交付：按已接受的 `v0.1.0-alpha.1` 目标核对版本身份、源码启动说明、预览限制、依赖和 TeX/字体再分发边界；提供可审阅的候选差异和 CI 结果。保持未解决的 Supervisor-Skills 内容不被打包。
- 完成条件：候选只包含明确纳入的文件，贡献/发布流程一致，必需 CI 在实际候选提交通过，限制写入发布说明；无以 HEAD 历史 CI 代替未提交代码验证的情况。
- 验证：在候选上运行 `npm run check`、`npm run build`、`npm run test:browser`、`npm run check:actions`、`npm run check:secrets`；依照 [maintaining](maintaining.md) 核对候选对应的 Windows/Linux/browser CI。未合并 main 前不声称 release gate 通过。

### ENG-06 按授权发布源码预览

- 依赖：ENG-05；另需用户明确授权发布、候选合并 main，且该精确 main 提交的 push CI 通过。
- 范围：现有发布脚本/工作流与发布结果记录，不新增部署系统。
- 交付：先 `npm run release:check -- 0.1.0-alpha.1`，通过后按维护文档发布不可变 tag 与预发布说明，更新 STATUS 和发布记录。
- 完成条件：tag、源码提交、版本文件、预发布说明一致，线上结果可访问；失败时保留已创建 tag，遵循既有恢复流程。
- 验证：release dry-run 通过；核对 tag 的目标 SHA、精确 main CI 和 Release 的预发布标记。本任务未授权前仅准备材料。

## 远期方向与进入条件

更多检索源（如 OpenAlex）、全文/PDF 提取、其他 RuntimeAdapter、安装包与诊断导出仍是候选方向；在 M1 收敛后，按用户实际需求一次选择一个，先定义来源、输入输出、失败行为和验证方式再拆任务。现有 JavaScript 大分块提示先记录，只有测得加载问题或明确性能目标时才安排优化。

任意代码执行、动态外部插件、多 Agent、远程计算、团队与机构部署沿用原始愿景，尚无本轮实施授权。它们需要先形成相应数据、权限、隔离或兼容决策，不为远期目标提前引入微服务、调度器或插件市场。
