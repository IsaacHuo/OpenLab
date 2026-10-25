# OpenLab 当前状态与交接

更新时间：2026-10-25（Asia/Shanghai）。**本轮 ENG-00 至 ENG-06 已全部完成**，[v0.1.0-alpha.1 科研源码预览](https://github.com/IsaacHuo/OpenLab/releases/tag/v0.1.0-alpha.1) 已发布。当前仅整理最终文档交接。根 [PLAN.md](../PLAN.md) 是用户指定的计划入口；任务合同保留在 [ROADMAP](ROADMAP.md)，约束见 [DECISIONS](DECISIONS.md)。

## 交付与版本身份

- PR #11（实现、文档对齐、构建/浏览器修复）、#12（数据/权限验收、大写 PLAN）和 #13（alpha 候选及候选失败修复）均在精确 PR CI 全通过、无待解决讨论后 squash 合并。
- 发布源码：`0e6f348612b56ac17e848c88fd9a3034b61bfc56`。带注释 tag `v0.1.0-alpha.1` 的对象为 `de7a92e79707af54e55b868464baa7392bee3748`，远程与本地解引用均指向该源码提交。版本文件、npm 根版本和 OpenAPI 元数据一致。
- GitHub Release 于 2026-10-25 15:17（Asia/Shanghai）发布，非草稿、prerelease，无二进制附件；提供源码档案，不提供安装包或托管部署。活动 v* tag 规则禁止更新/删除。
- 当前最终交接分支：`codex/source-preview-handoff`，基于发布提交，仅改文档；后续 main 文档提交不改变已发布 tag。
- 用户已授权逐阶段提交、PR、检查通过后合并及满足门槛的源码预发布。本轮未调用付费模型，未修改或发布用户研究数据，未使用子 Agent。

## 阶段结果

| ID | 状态 | 交付 |
| --- | --- | --- |
| ENG-00 | 已完成 | 协作规则、路线图、状态和决策入口 |
| ENG-01 | 已完成 | 既有实现分类、提交和推送；本地工具及数据排除 |
| ENG-02 | 已完成 | 能力、请求限制、档案/数据库版本与历史证据口径一致 |
| ENG-03 | 已完成 | 独立 TeX 准备、失败证据留存及跨文档比较修复；本地/远程验收通过 |
| ENG-04 | 已完成 | 30 项边界测试与验收映射，PLAN 大写更名及双语入口，PR #12 已合并 |
| ENG-05 | 已完成 | 候选身份、许可与说明；固定字体镜像及并发材料选择修复；PR #13 全检查通过后合并 |
| ENG-06 | 已完成 | 精确 main push CI、release dry-run、发布工作流和 tag/Release 身份核验通过 |

## 实际验证

- 本地：Windows x64、Node.js `24.19.0`、npm `11.17.0`。check（57 项 Node，0 失败/跳过）、build、browser（13 项）、actionlint 1.7.12、Gitleaks 8.30.1、npm audit（零漏洞）、Markdown/仓库和空白检查通过。跨文档对比与确定性并发上传回归均先失败后通过；类型/构建及完整浏览器在对应修复后重跑通过。
- alpha 专项：既定七文件 `node --test` 命令 30 项通过；计划确认、权限拒绝、重放、取消/重启、凭据隔离、人工修订、v1/v2 往返与跨项目引用均有证据。完整映射见 [acceptance](acceptance.md#alpha-data-and-permission-gates-eng-04-2026-10-25)。
- [候选 CI 40171822447](https://github.com/IsaacHuo/OpenLab/actions/runs/40171822447)（head `bba97f0`）和[精确 main push CI 40172012839](https://github.com/IsaacHuo/OpenLab/actions/runs/40172012839)（源码 `0e6f348`）均通过全部必需检查，包含新环境字体准备与真实编译。
- `npm.cmd run release:check -- 0.1.0-alpha.1` 在干净、精确 main 源码上通过；[发布工作流 40172172425](https://github.com/IsaacHuo/OpenLab/actions/runs/40172172425) 成功；发布结果、注释 tag 及活动 tag 保护规则已读取核对。
- 实际发布 tag 源码 tar 检查通过：PLAN/许可文件存在；本地数据、凭据、Skills/hooks、依赖、缓存、构建、测试和编译器/字体二进制不在档案中。原始愿景与前置 main 的 Git blob 一致。详细证据及历史失败见 [verification](verification.md#source-preview-release-eng-06-2026-10-25)。

## 限制与后续

- 仍为 Windows 优先、Crossref 元数据研究和具日期的 DeepSeek 非思考模式兼容；通用全文、科学论点核实、任意代码、动态插件隔离、多 Agent、安装包及团队部署均为远期候选。Supervisor-Skills 未分发；数据库版本 1、导出档案 v2、导入 v1/v2 保持原兼容边界。
- 本机隔离冷下载遇到 TLS/撤销查询错误；已有缓存和新 Linux CI 的真实准备/编译通过。字体固定 MIT 镜像的实取字节与原 SHA-256 一致，TLS 检查未关闭。JavaScript 超过 500 kB 的已有分块提示保留。
- 本轮没有未完成的路线图任务或发布阻塞。下一动作：保留发布身份，从实际研究需求选择一个远期候选，单独定义输入输出、失败边界和验收后再开发，不重复本轮阶段。

## 保留的本地预览记录

2026-10-25，RUN-01 本地预览：按用户要求以隐藏后台进程启动 `node app/main.ts`，复用已验证的生产构建与既有本地数据。启动时进程为 `43904`，地址为 `http://127.0.0.1:64865`；HTTP 首页返回 200 且包含前端挂载节点，进程存活，已请求在 Codex 浏览器打开。带认证片段的启动链接只在本地日志和本次会话提供，不写入仓库。无业务代码修改、模型调用、提交或推送；本页操作记录保留为本地改动。
