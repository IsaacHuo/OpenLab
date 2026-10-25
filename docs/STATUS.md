# OpenLab 当前状态与交接

更新时间：2026-10-25（Asia/Shanghai）。ENG-01 已完成：按用户后续授权整理、提交、推送既有项目改动并建立 PR，不增加业务功能。下一项为 ENG-02。任务合同见 [ROADMAP](ROADMAP.md)，已确认约束见 [DECISIONS](DECISIONS.md)。

## Git 与环境快照

- 分支：`codex/research-acceptance`。
- 初次检查起点：`ac2b5274f4693f1b0c7cca3c26f4cac131ffd0a7`，2026-10-24，`feat(workspace): ship the local research browser preview`。当前实现提交为 `22d6db524c08abfd4976bded081cf415b25919c1`，随后仅补交本页交接记录。
- 检查开始时已有 34 个受跟踪文件修改，无暂存改动；另有未跟踪的应用模块、测试、设计规范、`plan.md`、根 AGENTS、`.agents/`、`.codex/` 和 `output/` 等。目录折叠显示不能当成文件数量。HEAD 不包含当前全部实现。
- 当前 Windows 环境为 Node.js `v24.19.0`、npm `11.17.0`，依赖已存在。本轮未安装或升级依赖；用户已授权提交、推送，未授权合并 main 或发布版本。
- `.openlab/`、`.cache/`、`dist/`、`test-results/` 等已有本地产物；按忽略规则保留。本轮没有读取凭据或研究项目内容。
- 版本文件仍为 `0.0.1`。该历史发布为基础设施版；本次提交不升版、不打 tag、不创建 Release。
- 已读取远程：`origin/main` 为 `99813c6cc890c1e3e6c080e9cc18fa5ab6ba4865`，其文件树与检查起点 HEAD 完全相同（工作区预览 PR #9 的 squash 提交）。新提交将在该 main 基线上进入 `codex/research-acceptance`，不重复交付旧功能。
- SSH 被当前网络关闭，HTTPS 和 GitHub 已登录账号可用；使用单次命令的 HTTPS 地址映射，不修改仓库远程配置或暴露凭据。
- 已推送：`origin/codex/research-acceptance`；推送后读取远程 ref，确认与本地实现提交一致。已建立 [PR #11](https://github.com/IsaacHuo/OpenLab/pull/11)，目标 main，包含 86 个项目文件。本页随随后交接提交同步推送；精确最新 SHA 和 required-checks 状态以该 PR 为准。

## 本次交付范围

- 纳入：既有应用源码、测试、依赖与锁文件、构建脚本、已确认的 `doc/design/` 参考/令牌/许可、原台账、验收及协作文档。
- 保留本机：`.agents/` 的已安装第三方 Skills（241 个文件，约 26 MB）、`.codex/` hooks、`output/design/` 的四份未选稿；在 `.gitignore` 中明确排除，文件不删除。
- 继续排除：研究数据、保护凭据、`.openlab/`、`.cache/`、依赖目录、构建与测试产物。以精确路径暂存，不使用全量添加。
- 同步补齐 Unreleased 变更记录，保留既有用户改动。项目文件通过新 PR 进入既有 required-checks；本次不合并 main。

## 实际实现进度

| 范围 | 本地事实 | 证据与边界 |
| --- | --- | --- |
| 工程基础 | 已有贡献、许可、安全、版本、发布脚本和 Windows/Linux/browser CI | `.github/`、`scripts/`、[maintaining](maintaining.md)；本轮未运行远程管理操作 |
| 研究闭环 | 平台、SQLite/文件档案、受监督单 Agent、模型配置、Crossref、计划确认、问题/权限、取消、重放和导出已实现 | 代码与 57 项受控测试；历史 live 记录见 [verification](verification.md) |
| 日常工作区 | 连续对话、冻结上下文、材料选择、启动恢复、模型编辑、响应式黑白灰工作区已实现 | [plan.md](../plan.md) 第一轮；纳入本次提交 |
| 插件文档工作区 | 静态插件、Markdown/LaTeX 编辑、草稿、人工不可变修订、比较、BusyTeX、PDF.js、档案 v2 已在本地实现 | 第二轮台账、[plugins](plugins.md)、`app/tests/documents.test.ts`；v1 导入兼容 |
| 浏览器与真实 TeX | 2026-10-25 重新运行 12 项浏览器场景全部通过，包含真实中文/BibTeX/PDF 与响应式/axe | 使用固定资源的已有缓存、隔离研究夹具；不调用真实模型 |
| 后续产品能力 | 尚无第二学术提供商、可靠全文验收、任意代码执行、外部插件隔离、多 Agent、团队部署或安装包 | 这些是后续方向；元数据和模型解读不等于科学论点核实 |

## 任务状态

| ID | 状态 | 当前交接 |
| --- | --- | --- |
| ENG-00 | 已完成 | 完善 AGENTS，新增三个协作文档；仅改文档，保留既有台账和 ADR |
| ENG-01 | 已完成 | 范围盘点、本地验证、项目提交及推送完成；[PR #11](https://github.com/IsaacHuo/OpenLab/pull/11) 保留未合并 |
| ENG-02 | 待开始 | 依赖 ENG-01；收敛当前与历史文档口径 |
| ENG-03 | 待开始 | 依赖 ENG-02；复核构建、浏览器和编译资源准备 |
| ENG-04 | 待开始 | 依赖 ENG-03；复核 alpha 数据与权限门槛 |
| ENG-05 | 待开始 | 依赖 ENG-04；准备版本、许可与候选证据 |
| ENG-06 | 未授权发布 | 依赖 ENG-05、发布授权和精确 main CI |

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
| 文档混有历史与当前口径 | `acceptance.md` 前段 51/8、后段 57/12；`development.md` 旧段导入 32 MB，而当前接口为 128 MB；部分段落仍写下一轮 | ENG-02 按阶段和实际接口对齐；本轮不额外改这些已有文档 |
| 合并门槛 | 本地构建和 12 项浏览器已复核，不能替代精确 head 的 PR CI | 本次不合并；未来合并前检查 required-checks；ENG-03 复用有效证据并核对冷缓存/CI 条件 |
| TeX 冷缓存需要约 203 MB 固定资源 | 首次浏览器验收与纯本地模型夹具的环境需求不同 | ENG-03 记录下载/缓存/失败条件；尚未证明是 CI 缺陷 |
| 大分块提示 | 旧构建记录提示部分 JavaScript 超过 500 kB，未提供用户性能影响测量 | 先记录，非当前发布阻塞，不安排无目标重构 |
| 全文访问、平台与许可范围 | 历史网络无法成功完成通用全文读取；原生凭据持久化为 Windows；Supervisor-Skills 再分发条款未解决 | 保留预览限制；不捆绑上游内容时不阻塞第一方源码预览，扩大声明前单独解决 |

本次提交、推送已完成，无本地交付阻塞。本地工具配置和未选稿按贡献规范保留本机；项目源码推送不等于已合并或已发布。

## 下一次对话入口

本次交付完成后建议执行 **ENG-02：对齐当前实现与历史文档口径，保留原始愿景和 ADR 历史；不增加业务功能。** ENG-03 可复用本轮未变化的本地验证，仍需核对冷缓存和精确提交 CI。

每次任务结束必须更新本文件：日期、任务 ID/状态、实际结果、验证命令和环境、剩余问题、下一项任务。只保留简短交接，详细长期证据继续写入已有 verification/acceptance，不按每轮对话新增台账文件。
