# 参与 OpenLab

[English](CONTRIBUTING.md)

当前仓库提供项目治理、文档、维护工具和本地科研预览。[产品规格](docs/product.md)定义目标行为，[开发说明](docs/development.md)记录已实现范围。贡献内容需要清楚区分已经可用的功能与设计方案。

## 开始贡献

通过 [Issue 表单](https://github.com/IsaacHuo/OpenLab/issues/new/choose) 报告缺陷、提出功能或工具集成，通过 [Discussions](https://github.com/IsaacHuo/OpenLab/discussions) 咨询和交流。小范围修正可以直接提交 PR，欢迎使用中文或英文。

涉及主要架构或新集成时，先说明用户问题、现有替代方案、输入输出、上游许可与验收方式。保留作者归属和研究中的负面结果。

## 本地校验

安装 Node.js 24 LTS 和 Git，克隆自己的 fork，创建短期分支；维护者默认使用 `codex/` 前缀。

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd run check:actions
npm.cmd run check:secrets
npm.cmd run build
npm.cmd run test:browser
```

PowerShell 执行策略可能阻止 `npm.ps1`，使用 `npm.cmd` 即可。工作流检查和密钥扫描支持 Windows x64、Linux x64，首次运行需要联网，固定版本工具经 SHA-256 校验后存入 `.cache/`。Windows 使用系统自带的 curl 下载；网络阻止直接下载时回退到 GitHub CLI。其他系统可执行文档检查，暂由 CI 执行这两项工具检查。

`npm run check` 包括 Markdown 格式、内部链接、仓库配置与自动化测试。原始中文愿景逐字保留，不参与风格检查。外部网址不参与本地链接检查，避免网络波动阻塞 PR。

应用检查包括服务端与浏览器 TypeScript，以及受控运行时、存储和 API 测试。浏览器验收通过 Playwright 使用已安装的 Chrome，连接独立的合成本地服务，覆盖桌面、窄屏和 axe 检查，不使用你的模型凭据。真实模型和检索测试需要单独执行，见[开发说明](docs/development.md)。运行 `npm start` 前先构建浏览器产物。

## 提交与审查

- PR 标题采用 Conventional Commits，例如 `docs: clarify research evidence levels`。
- 描述问题、实际变化、已执行的验证与关联 Issue；小修正不要求先新建 Issue。
- 共用说明发生变化时同步更新中英文 README 和贡献指南，其余技术文档当前以英文为准。
- 面向用户的变化写入 CHANGELOG 的 `Unreleased`；准备发布时归档到对应版本。
- 不提交凭据、研究私有资料、运行日志或本机配置，示例使用合成数据。
- 贡献遵循适用的仓库许可证，第三方内容保留原许可；当前不要求 CLA 或 DCO 签署。

`main` 要求经过 PR、通过 `required-checks` 并解决审查讨论。单维护者阶段不要求第二人批准；CODEOWNERS 用于路由审查。维护者使用 squash 合并，以 PR 标题作为提交标题，随后删除分支。

## 科研与集成质量

记录上游版本和依赖，通过真实任务证明集成成熟度。模型输出不自动成为已验证证据；检索失败、不确定性、矛盾证据和已知局限均需保留。

安全问题遵循 [SECURITY](SECURITY.md)，社区互动遵循[行为准则](CODE_OF_CONDUCT.md)，版本操作见[维护指南](docs/maintaining.md)。
