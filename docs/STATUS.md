# OpenLab 当前状态与交接

更新时间：2026-10-25（Asia/Shanghai）。当前任务 **ENG-05：alpha 源码候选准备**。ENG-04 的 [PR #12](https://github.com/IsaacHuo/OpenLab/pull/12) 已通过全部必需检查并合并，当前准备 `0.1.0-alpha.1` 版本身份、启动说明、许可和发布材料。计划入口为根 [PLAN.md](../PLAN.md)，详细任务合同见 [ROADMAP](ROADMAP.md)，约束见 [DECISIONS](DECISIONS.md)。

## Git、授权与交付边界

- 当前分支：`codex/alpha-source-candidate`，起点为 main `14b8a652f63c196b1746878f376bab259a141192`（[PR #12](https://github.com/IsaacHuo/OpenLab/pull/12) squash 合并）。此前 PR #11 交付实现、ENG-02 文档和 ENG-03 修复。
- 用户已授权按 ENG-00 至 ENG-06 顺序提交、PR、必需检查通过后合并，满足候选和精确 main CI 门槛后源码预发布；不绕过规则，不调用付费模型，不把远期候选当成已批准功能。
- Windows x64、Node.js `24.19.0`、npm `11.17.0`；沿用锁文件和已有依赖，未升级依赖。
- 原小写根计划已按用户要求更名为大写 `PLAN.md`，顶部补当前阶段和验收出口，保留两轮历史台账并同步链接。README 中英文导航已同步。
- 用户研究数据、保护凭据、本地 Skills/hooks、未选稿、缓存和测试产物保留本机，不纳入源码交付。档案 v2 与 SQLite `user_version=1` 独立；v1 导入兼容。

## 任务状态

| ID | 状态 | 交接 |
| --- | --- | --- |
| ENG-00 | 已完成 | 协作入口及架构约束已交付 |
| ENG-01 | 已完成 | 既有实现盘点、提交、推送，PR #11 已合并 |
| ENG-02 | 已完成 | 文档能力、限制、版本和历史证据对齐；三项文档检查通过 |
| ENG-03 | 已完成 | 本地 57 项 Node、13 项浏览器、构建和检查通过；精确 PR CI 全通过后合并 |
| ENG-04 | 已完成 | 30 项边界测试通过，验收映射和大写 PLAN 入口在 PR #12 通过 CI 后合并 |
| ENG-05 | 进行中 | 版本、双语启动说明、许可及发布边界已整理；完整本地候选检查通过，待精确候选 PR CI |
| ENG-06 | 待开始 | 已授权按门槛发布；依赖 ENG-05、release dry-run 与精确 main push CI |

## 本轮实际验证

- ENG-03：`npm run check`（57 项 Node，0 失败/跳过）、`npm run build`、`npm run test:browser`（13 项）、`npm run check:actions`、`npm run check:secrets`、`git diff --check` 通过。桌面/平板/手机文档截图已检查。
- [CI 40170016084](https://github.com/IsaacHuo/OpenLab/actions/runs/40170016084)：head `73ad1658c7f9f3d4d283d5221af4922668661a99` 的 Windows/Linux、独立 TeX 准备、13 项浏览器、actionlint、Gitleaks、required-checks 全通过。该结果不替代后续文档和版本候选的 CI。
- ENG-04：`node --test app/tests/platform.test.ts app/tests/runtime.test.ts app/tests/service.test.ts app/tests/store.test.ts app/tests/documents.test.ts app/tests/context.test.ts app/tests/workflow.test.ts`：30 项通过，0 失败/跳过。均使用隔离受控夹具，未调用真实模型。
- [CI 40170593908](https://github.com/IsaacHuo/OpenLab/actions/runs/40170593908)：PR #12 head `b1373907f448642991c55840d2c9893c7af1d4b0` 的全部必需检查通过，已合并为 main `14b8a65`。
- 本阶段 `npm.cmd run lint:markdown`（36 份）、`npm.cmd run check:repository`（159 个文件）及 `git diff --check` 通过，大写路径和链接已核对；详细阶段证据见 [verification](verification.md)，alpha 门槛映射见 [acceptance](acceptance.md#alpha-data-and-permission-gates-eng-04-2026-10-25)。
- ENG-05 候选：`npm run check`（57 项）、build、browser（13 项）、actionlint、Gitleaks、npm audit（零漏洞）和空白检查通过；版本/OpenAPI 一致、依赖图未变及 154 个源码路径的排除检查通过。尚未发布；精确候选和 main CI 不用历史结果替代。

## 限制与下一动作

- 早期 XeLaTeX CI 超时的精确原因没有被日志证明；分离准备后的新 CI 已通过。隔离本地冷下载仍观察到 curl 35 TLS 错误，缓存分片保留，明确重试可续传；不把本地 TLS 故障等同于旧 CI 根因。
- 预览范围保持 Windows 凭据保护、单 Crossref 元数据提供商、具日期的 DeepSeek 非思考模式兼容；没有通用全文/科学论点核实、任意代码、动态插件隔离、多 Agent、安装包或团队部署。Supervisor-Skills 不随源码分发。
- 现有超过 500 kB 的分块提示保留；尚无用户性能测量，不为发布引入无目标重构。
- 下一动作：执行 ENG-05 的完整候选检查，建立候选 PR，通过后合并；ENG-06 继续等待精确 main push CI 和 release dry-run。

## 保留的本地预览记录

2026-10-25，RUN-01 本地预览：按用户要求以隐藏后台进程启动 `node app/main.ts`，复用已验证的生产构建与既有本地数据。启动时进程为 `43904`，地址为 `http://127.0.0.1:64865`；HTTP 首页返回 200 且包含前端挂载节点，进程存活，已请求在 Codex 浏览器打开。带认证片段的启动链接只在本地日志和本次会话提供，不写入仓库。无业务代码修改、模型调用、提交或推送；本页操作记录保留为本地改动。
