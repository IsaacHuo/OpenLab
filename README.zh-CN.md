# OpenLab

当前源码为 v0.1.0-alpha.1 科研预览，包括平台档案、通用 Harness、受监督的 worker 和浏览器工作区。已实现范围、验证结果与后续任务见[开发说明](docs/development.md)和[执行计划](PLAN.md)。历史 v0.0.1 仍为仓库基础设施版。

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/brand/openlab-mark-inverse.svg">
  <img src="assets/brand/openlab-mark.svg" alt="OpenLab 烧瓶与波浪标识" width="112" height="112">
</picture>

开放式科研操作系统 · The Open Research Operating System

[![仓库检查](https://github.com/IsaacHuo/OpenLab/actions/workflows/checks.yml/badge.svg)](https://github.com/IsaacHuo/OpenLab/actions/workflows/checks.yml)
[![许可证](https://img.shields.io/github/license/IsaacHuo/OpenLab)](LICENSE)
[![最新版本](https://img.shields.io/github/v/release/IsaacHuo/OpenLab)](https://github.com/IsaacHuo/OpenLab/releases)

[English](README.md) · [产品规格](docs/product.md) · [架构](docs/architecture.md) · [贡献指南](CONTRIBUTING.zh-CN.md)

</div>

OpenLab 致力于建立本地优先的科研工作空间，将已有的开源科研工具、AI Agent、文献、数据和计算能力组织起来。研究项目、成果和证据由研究者持有，并能够在更换模型或工具后继续使用。

## 当前状态

**当前源码为 v0.1.0-alpha.1 科研预览。** 使用 Node.js 24 和浏览器在本地运行，尚不提供安装包。历史 v0.0.1 仅交付仓库基础设施；预览边界见[变更日志](CHANGELOG.md)，交付进度见[PLAN](PLAN.md)。

| 能力 | 状态 |
| --- | --- |
| 贡献指南、Issue/PR 模板与发布流程 | 本仓库提供 |
| 文档、工作流与密钥扫描 | GitHub Actions 与本地工具提供 |
| Windows 优先、本地启动、浏览器交互 | 已实现，已检查桌面与窄屏 Chrome |
| 项目管理、固定版本技能安装、模型配置与元数据研究 | 已实现，已验证两条 DeepSeek/Crossref 真实研究任务 |
| OpenLab Harness：默认单 Agent 文献研究运行时 | 已实现原生 Windows worker 与可替换接口 |
| 通过平台运行时适配器执行 Supervisor-Skills | 计划集成，尚未通过执行验证 |
| 对话、执行状态与实时研究产物工作台 | React/assistant-ui 与 AG-UI，已验证确认、回答、拒绝与重放 |
| 来源追踪、运行历史与成果导出 | 不可变修订、附件副本与校验后的档案导入导出 |
| Markdown/LaTeX 文档插件 | 可恢复草稿、不可变人工修订、对比、BusyTeX 与 PDF.js；v2 档案及 v1 导入兼容 |

## 运行开发预览

在 Windows 上安装 Node.js 24，然后执行：

```sh
npm ci
npm run build
npm start
```

打开终端输出的启动链接，在设置中添加并测试模型服务，新建项目后提交研究问题。研究工具会等待你确认计划；生成计划和执行研究会使用你的模型账户。Windows 使用当前用户保护凭据，已保存项目不依赖模型服务即可查看。Crossref 检索需要网络。公开页面读取会请求具体授权，也可能不可用；仅有元数据不能证明论文支持某个结论。当前 DeepSeek 使用非思考模式。

直接元数据检索可选择工具模式，无需模型凭据。文档编辑和 TeX 编译也不调用模型。首次使用 TeX 前可先运行 `npm run plugins:prepare`，通过 curl 下载约 203 MB 固定组件；这些组件独立于源码档案。工作区也可按需准备，下载失败会保留分片供显式重试。[编译准备与限制](docs/plugins.md#tex-compiler-and-pdf-preview)有详细说明。PowerShell 若阻止 `npm.ps1`，请使用 `npm.cmd`。

![原生 Windows 上真实 DeepSeek/Crossref 元数据研究预览](assets/docs/workspace-preview.png)

截图展示真实的元数据研究任务，不代表全文或科学论点已经核实。[验证记录](docs/verification.md)分别说明真实测试与合成浏览器夹具。

## 首个科研版本

1. 创建研究项目，明确研究问题。
2. 安装固定版本的技能，配置模型与检索服务。
3. 审查研究计划和所需权限。
4. 查看执行过程、回答问题，或停止任务。
5. 核对来源与成果，区分已验证证据、模型推断和待检验假设，并导出研究记录。

首版采用本地服务和网页界面，用户自行配置模型凭据。已有项目与成果应可离线查看；模型执行和在线检索需要对应服务可用。

## 架构方向

![OpenLab 规划架构：科研工作台、平台 API 与 AG-UI 网关、平台研究记录、运行时适配器及 OpenLab Harness](assets/docs/architecture.svg)

OpenLab 是开放科研平台，不是某个 Agent 框架的封装。平台持有项目、对话、执行记录、成果和来源信息；运行时、模型、科研工具和界面必须能够独立替换，研究记录与成果由 OpenLab 及用户掌握。

科研工作台采用“项目导航 + 对话与执行状态 + 实时研究产物”布局。assistant-ui 提供对话基础，平台网关采用 AG-UI，shadcn/ui 与 AI Elements 补充计划、审批和引用等视图；CopilotKit 作为交互模式参考，首版不引入其 SDK。首个运行时改为通过 RuntimeAdapter 接入的最小自研 OpenLab Harness；OpenCode 保留为后续可选适配器。实现边界见[架构文档](docs/architecture.md)与[新技术决策](docs/decisions/0002-workspace-and-harness.md)。

## 文档导航

- [开发执行计划](PLAN.md)：当前阶段、顺序任务、验收出口及既有执行台账。
- [原始产品愿景](docs/vision.zh-CN.md)：保留用户提供的完整规划。
- [产品规格](docs/product.md)：用户、首版流程和验收条件。
- [架构与接口](docs/architecture.md)、[技术决策](docs/decisions/0001-foundation.md)。
- [科研工作台规格](docs/workspace.md)：布局、交互状态、实时成果与界面验收。
- [OpenLab Harness 规格](docs/harness.md)：最小运行时、可替换接口与验证条件。
- [工作台与 Harness 决策](docs/decisions/0002-workspace-and-harness.md)：记录界面协议和默认运行时的路线变更。
- [日志与科研追溯规范](docs/logging.md)。
- [产品标识与矢量文件](docs/brand.md)：精确镜像轮廓、圆弧与中心对称波浪。
- [仓库维护与发布](docs/maintaining.md)、[验证记录](docs/verification.md)、[变更日志](CHANGELOG.md)。

## 参与贡献

仓库维护工具需要 Node.js 24 LTS：

```sh
npm ci
npm run check
npm run check:actions
npm run check:secrets
```

后两项命令会下载校验过 SHA-256 的工具到本地缓存。Windows PowerShell 的操作方式见[中文贡献指南](CONTRIBUTING.zh-CN.md)。可以通过 [Issue](https://github.com/IsaacHuo/OpenLab/issues/new/choose) 报告问题，通过 [Discussions](https://github.com/IsaacHuo/OpenLab/discussions) 交流研究需求；欢迎中英文参与。

## 许可与来源

OpenLab 自有代码与文档采用 [Apache-2.0](LICENSE)，明确标注例外的文件除外。第三方工具、技能、模型和科研资料保留自己的许可。

[Supervisor-Skills](https://github.com/HKUSTDial/Supervisor-Skills) 是计划中的首个集成参考，尚未随本项目分发；其仓库与部分文件存在许可标注差异，集成发布前需要核实。详见[第三方说明](THIRD_PARTY_NOTICES.md)与[贡献者](CONTRIBUTORS.md)。
