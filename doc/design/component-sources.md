# UI 组件来源与适配

记录日期：2026-10-24。此记录适用于当前 React/Vite 前端，不表示历史发布包已经包含这些组件。

## 组件源代码

| 来源 | 本地适配 | 修改范围 |
| --- | --- | --- |
| [shadcn/ui Select](https://ui.shadcn.com/r/styles/new-york-v4/select.json) | `web/controls.tsx` 的 Select | 保留 Radix Trigger、Portal、Viewport、Item、Indicator 与滚动按钮组合；适配现有受控值、空模型选项和令牌 CSS |
| [shadcn/ui Popover](https://ui.shadcn.com/r/styles/new-york-v4/popover.json) | `web/controls.tsx` 的 Popover | 保留 Trigger、Portal、Content 组合与碰撞避让，使用本项目样式 |
| [shadcn/ui Dialog](https://ui.shadcn.com/r/styles/new-york-v4/dialog.json) | `web/controls.tsx` 的 Dialog | 保留 Root、Overlay、Content、Title、Close 组合，支持窄屏 Sheet 布局 |
| [AI Elements Plan](https://registry.ai-sdk.dev/plan.json) | `web/components/ai-elements/plan.tsx` | 使用原组件的 Collapsible 与 Header、Content、Footer 呈现；移除 Card、Shimmer 和流式标题上下文，适配现有研究确认、权限和提问回调 |

上表 shadcn/ui 各组件适用 MIT；完整声明保存在 [shadcn-ui.txt](licenses/shadcn-ui.txt)。AI Elements 适用 Apache-2.0，版权与许可声明保存在 [ai-elements.txt](licenses/ai-elements.txt)，Apache-2.0 全文见仓库 [LICENSE](../../LICENSE)。

组件没有引入另一套消息存储、AI SDK 运行时或托管服务。Tabs 使用 Radix 的标签组合；assistant-ui 与 AG-UI 仍负责现有消息流。

## 获取时的注册表摘要

注册表 URL 可以随上游更新。以下 SHA-256 记录本次读取的完整响应字节，用于区分本次适配参考与后续版本；不把上游当前分支链接描述为不可变提交。

| 注册表 | SHA-256 |
| --- | --- |
| Select | `ca3189ea8101a04f144b6d0f0e7330841639bfa5f4d57e7cca0894d39b30817b` |
| Popover | `78793171b536e0c335ad51b1313619e533566b514d3503ef60c94dc9d3ccfbef` |
| Dialog | `0115e3a57aa55a978c5fed0d77f7e98edd694215aae3e569def3fff722ba9f26` |
| Plan | `3cc42e5eee85a2ead808d31efcd2ff17ebf06887721bea4107b5112a21c1cdd4` |

## 运行依赖

| 包 | 精确版本 | 许可 |
| --- | --- | --- |
| `@radix-ui/react-select` | 2.4.1 | MIT |
| `@radix-ui/react-dialog` | 1.3.1 | MIT |
| `@radix-ui/react-popover` | 1.3.1 | MIT |
| `@radix-ui/react-tabs` | 1.2.1 | MIT |
| `@radix-ui/react-collapsible` | 1.2.1 | MIT |
| `lucide-react` | 1.61.0 | ISC |

版本与完整性信息同时记录在 `package-lock.json`。许可类型来自本次安装的包元数据，完整的传递依赖仍以锁文件和各包许可为准。
