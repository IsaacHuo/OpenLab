# OpenLab 当前状态与交接

更新时间：2026-10-25（Asia/Shanghai）。ENG-02 已完成：对齐实现、历史文档与验证证据，三项文档检查通过，仅改文档。当前进入 ENG-03，优先定位真实 XeLaTeX CI 超时；ENG-04 仍等待 ENG-03 通过。用户已授权按路线图逐阶段提交、PR 和通过检查后的合并，继续至满足门槛的源码预发布。任务合同见 [ROADMAP](ROADMAP.md)，已确认约束见 [DECISIONS](DECISIONS.md)。

## Git 与环境快照

- 分支：`codex/research-acceptance`。
- ENG-01 初次检查起点为 `ac2b5274f4693f1b0c7cca3c26f4cac131ffd0a7`。实现已提交为 `22d6db524c08abfd4976bded081cf415b25919c1`，随后交接提交 `1574645b8b8bc4da9b7559d7794540e75775724c` 是本轮 HEAD，与 PR #11 的 head 一致。
- ENG-01 盘点开始时有 34 个受跟踪文件修改及未跟踪实现，现已按分类纳入项目提交或保留本机。ENG-02 开始时只有本页的 RUN-01 记录未提交，无暂存改动及 Git 可见未跟踪文件；本轮保留原记录，新增文档改动尚未提交。
- 当前 Windows 环境为 Node.js `v24.19.0`、npm `11.17.0`，依赖已存在。本轮未安装或升级依赖；本轮不提交、推送、合并或发布。
- `.openlab/`、`.cache/`、`dist/`、`test-results/` 等已有本地产物；按忽略规则保留。本轮没有读取凭据或研究项目内容。
- 版本文件仍为 `0.0.1`。该历史发布为基础设施版；本轮不升版、不打 tag、不创建 Release。
- PR #11 的 main 基线为 `99813c6cc890c1e3e6c080e9cc18fa5ab6ba4865`，对应工作区预览 PR #9 的 squash 提交。ENG-01 已推送既有项目改动；ENG-02 不重复交付旧功能。
- ENG-01 遇到 SSH 网络关闭，使用单次命令 HTTPS 地址映射完成推送，未修改仓库远程配置；本轮只读取 GitHub 状态与日志。
- [PR #11](https://github.com/IsaacHuo/OpenLab/pull/11) 仍未合并，包含 86 个项目文件；2026-10-25 重新读取精确 head 的检查，Windows/Linux 仓库、actionlint、Gitleaks 通过，浏览器 11/12、required-checks 失败。实际临时合并 checkout、环境及诊断见 [verification](verification.md#pr-11-ci-inspection-2026-10-25)。本轮文档改动没有远程 CI 结果。

## ENG-01 交付范围（历史）

- 纳入：既有应用源码、测试、依赖与锁文件、构建脚本、已确认的 `doc/design/` 参考/令牌/许可、原台账、验收及协作文档。
- 保留本机：`.agents/` 的已安装第三方 Skills（241 个文件，约 26 MB）、`.codex/` hooks、`output/design/` 的四份未选稿；在 `.gitignore` 中明确排除，文件不删除。
- 继续排除：研究数据、保护凭据、`.openlab/`、`.cache/`、依赖目录、构建与测试产物。以精确路径暂存，不使用全量添加。
- 同步补齐 Unreleased 变更记录，保留既有用户改动。项目文件通过新 PR 进入既有 required-checks；本次不合并 main。

## 实际实现进度

| 范围 | 本地事实 | 证据与边界 |
| --- | --- | --- |
| 工程基础 | 已有贡献、许可、安全、版本、发布脚本和 Windows/Linux/browser CI | `.github/`、`scripts/`、[maintaining](maintaining.md)；本轮未运行远程管理操作 |
| 研究闭环 | 平台、SQLite/文件档案、受监督单 Agent、模型配置、Crossref、计划确认、问题/权限、取消、重放和导出已实现 | 代码与历史 57 项测试；ENG-02 未重跑；live 记录见 [verification](verification.md) |
| 日常工作区 | 连续对话、冻结上下文、材料选择、启动恢复、模型编辑、响应式黑白灰工作区已实现 | [plan.md](../plan.md) 第一轮；已纳入 ENG-01 提交 |
| 插件文档工作区 | 静态插件、Markdown/LaTeX 编辑、草稿、人工不可变修订、比较、BusyTeX、PDF.js、档案 v2 已在本地实现 | 第二轮台账、[plugins](plugins.md)、`app/tests/documents.test.ts`；v1 导入兼容 |
| 浏览器与真实 TeX | ENG-01 的 Windows 本地 12 项通过；最新 PR CI 11 项通过、真实 XeLaTeX 场景超时 | 本地使用已有缓存、隔离研究夹具；CI 根因未定，ENG-02 未重跑浏览器 |
| 后续产品能力 | 尚无第二学术提供商、可靠全文验收、任意代码执行、外部插件隔离、多 Agent、团队部署或安装包 | 这些是后续方向；元数据和模型解读不等于科学论点核实 |

## 任务状态

| ID | 状态 | 当前交接 |
| --- | --- | --- |
| ENG-00 | 已完成 | 完善 AGENTS，新增三个协作文档；仅改文档，保留既有台账和 ADR |
| ENG-01 | 已完成 | 范围盘点、本地验证、项目提交及推送完成；[PR #11](https://github.com/IsaacHuo/OpenLab/pull/11) 保留未合并 |
| ENG-02 | 已完成 | 文档事实、历史阶段及 CI 失败记录已对齐，三项文档检查通过；改动保留本地 |
| ENG-03 | 进行中 | 依赖 ENG-02；优先复现真实 XeLaTeX CI 超时，取得日志/准备状态/失败产物并最小修复 |
| ENG-04 | 待开始 | 依赖 ENG-03；复核 alpha 数据与权限门槛 |
| ENG-05 | 待开始 | 依赖 ENG-04；准备版本、许可与候选证据 |
| ENG-06 | 待开始 | 本轮已授权按门槛发布；仍依赖 ENG-05 和精确 main CI |

## ENG-00 规划检查记录

在已有未提交实现上执行了 `npm run check`：Markdown、仓库本地链接/YAML/版本策略、服务端及浏览器 TypeScript 全通过；57 项 Node 核心/接口/治理测试通过，0 失败、0 跳过。原生 worker、Windows 凭据保护、归档与文档修订边界属于这些测试；没有真实模型或检索调用。

协作文档写入后，`npm run lint:markdown` 通过（36 份 Markdown），`npm run check:repository` 通过（159 个参与检查的文件），`git diff --check` 通过。对检查前的 397 个 Git 可见文件做 SHA-256 比对：仅根 `AGENTS.md` 内容改变，新增本页、ROADMAP、DECISIONS，无既有文件删除或其他内容变化。任务依赖与新增文档空白检查也通过。

上述为首次规划轮记录；该轮没有重跑构建/浏览器，也没有新增测试、依赖或 CI 机制。

## ENG-01 推送前验证，2026-10-25

- `npm run check`：Markdown、仓库校验、服务端/浏览器类型与 57 项测试通过，0 失败、0 跳过。
- `npm run build`：通过；已有超过 500 kB 分块提示仍在，不影响构建成功。
- `npm run test:browser`：12 项通过，用时约 1.5 分钟。真实 XeLaTeX/pdflatex、中文/公式/图片/BibTeX、保留旧 PDF、Worker 取消/截止、插件替换/故障、历史/材料/模型配置及响应式场景通过；使用已有 BusyTeX 缓存，未重新验证冷缓存下载。
- 本轮生成的文档桌面/手机截图已人工检查；截图保留在忽略的 `.cache/`，不提交用户数据或测试产物。
- `npm run check:actions`：actionlint 1.7.12 通过。
- `npm run check:secrets`：Gitleaks 8.30.1 历史与工作区扫描通过，输出脱敏。
- `git diff --check origin/main...HEAD`：通过；清理了新增上下文测试文件末尾多余空行，无测试逻辑或业务行为变化。
- 没有真实付费模型调用或新 live 检索兼容声明。远程 [PR 检查](https://github.com/IsaacHuo/OpenLab/pull/11/checks) 必须查看精确最新 head；不以本地通过替代远程门槛。本次任务完成的是提交与推送，尚未合并或发布。

## 已发现的问题与阻塞

| 项目 | 影响 | 下一步与是否阻塞 |
| --- | --- | --- |
| 原先大量未提交工作 | 已收敛到远程可审阅的项目基线，本地工具/试稿不进入交付 | 已解决；继续保留 [PR #11](https://github.com/IsaacHuo/OpenLab/pull/11) 的提交与检查证据 |
| 文档历史与当前口径 | ENG-02 已区分 45/3、45/5、51/8、57/12 的阶段，按代码说明材料/请求体限制及档案/数据库版本 | 已解决；三项文档检查通过，不改变实现或历史证据 |
| 合并门槛失败 | 精确 PR head 的浏览器和 required-checks 失败；本地历史通过不能替代远程结果 | 阻塞合并；ENG-03 优先复现并修复，ENG-04 继续等待 |
| TeX 超时根因未定 | 首次完成断言超时 125 秒；CI 未上传失败截图和 trace，冷缓存需要约 203 MB，但尚不能认定下载是根因 | ENG-03 补准备状态、编译日志及失败产物，区分资源准备和编译故障 |
| 大分块提示 | 旧构建记录提示部分 JavaScript 超过 500 kB，未提供用户性能影响测量 | 先记录，非当前发布阻塞，不安排无目标重构 |
| 全文访问、平台与许可范围 | 历史网络无法成功完成通用全文读取；原生凭据持久化为 Windows；Supervisor-Skills 再分发条款未解决 | 保留预览限制；不捆绑上游内容时不阻塞第一方源码预览，扩大声明前单独解决 |

ENG-01 的提交、推送范围已完成；ENG-02 是本地文档修正，不解决 CI 编译失败。本地工具配置和未选稿继续保留本机；项目源码推送不等于已合并或已发布。

## ENG-02 文档对齐，2026-10-25

本轮仅修改开发、验收、验证、原实施台账、路线图、本页、安全说明和变更日志；热门项目调研的来源与采用方式收录在原有 [verification](verification.md#documentation-alignment-eng-02-2026-10-25)。两份 README 已正确区分当前源码与历史发布，保持原文；原始愿景、ADR、业务代码、API、依赖和数据格式未改。

实际验证（Windows、Node.js 24.19.0、npm 11.17.0）：`npm.cmd run lint:markdown` 通过（36 份 Markdown），`npm.cmd run check:repository` 通过（159 个文件），`git diff --check` 通过；逐项对照服务/存储代码、既有兼容测试与具日期的验证记录。本轮不重跑历史应用测试、构建、浏览器或 live 调用；未安装依赖、提交、推送或触发远程重跑。

## 下一次对话入口

2026-10-25，RUN-01 本地预览：按用户要求以隐藏后台进程启动 `node app/main.ts`，复用已验证的生产构建与既有本地数据。启动时进程为 `43904`，地址为 `http://127.0.0.1:64865`；HTTP 首页返回 200 且包含前端挂载节点，进程存活，已请求在 Codex 浏览器打开。带认证片段的启动链接只在本地日志和本次会话提供，不写入仓库。无业务代码修改、模型调用、提交或推送；本页操作记录保留为本地改动。

下一项为 **ENG-03：优先复现 PR #11 的真实 XeLaTeX 超时，补齐准备状态、编译诊断和失败产物，再按证据最小修复并复核构建与浏览器。** 不以本地缓存成功或旧截图代替 CI；未取得通过证据前 ENG-04 不进入验收。

每次任务结束必须更新本文件：日期、任务 ID/状态、实际结果、验证命令和环境、剩余问题、下一项任务。只保留简短交接，详细长期证据继续写入已有 verification/acceptance，不按每轮对话新增台账文件。
