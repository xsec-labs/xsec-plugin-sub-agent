# 子 Agent 公共 UI 候选

该候选将 `com.xsec.workspace.sub-agent` 的两个只读工作区工具统一到 XSEC 公共 UI：列表使用 `PageHeader`、`ControlButton`、`ControlIconButton`、`Badge`、`Spinner`、`EmptyState` 和 `ErrorState`，详情复用同一页头与状态布局。`ControlThemeProvider` 同步颜色模式、密度、字号和减少动效偏好；移动视口采用单列详情，列表操作支持键盘焦点和返回后的焦点/滚动恢复。

业务边界保持三个已声明的 frontend API 方法：`xsec.subagents.list`、`xsec.subagents.get` 和 `xsec.workspace.tool.open`。列表、详情、跨会话拒绝、未受管会话错误和显式刷新均保留真实 Host 返回；返回数据执行运行时校验，异常传播到页面错误状态。日志记录操作 ID、方法、结果和耗时，不写入会话正文或工具输入输出。

## 验证

- 隔离 macOS arm64 Host 检查：manifest `2.0.0`、`pluginApi ^1.3.0`、两个权限和前端制品回读通过；原生边界 fixture 返回 8/1/0 条记录，跨会话详情和未受管会话均明确拒绝。证据：[host-inspection.json](/Users/xiaosong/.codex/visualizations/2026/10/02/01a0faad-6517-7cd3-90b5-b818bc64660d/plugin-sub-agent-ui/host-inspection.json)、[native-boundaries.json](/Users/xiaosong/.codex/visualizations/2026/10/02/01a0faad-6517-7cd3-90b5-b818bc64660d/plugin-sub-agent-ui/native-boundaries.json)。
- 真实浏览器候选：7 项流程通过，包含列表、详情、键盘焦点、返回焦点、主题/密度/字号、移动视口、跨会话拒绝和空会话。证据：[candidate-browser.json](/Users/xiaosong/.codex/visualizations/2026/10/02/01a0faad-6517-7cd3-90b5-b818bc64660d/plugin-sub-agent-ui/candidate-browser.json)。
- 生命周期：候选 iframe 释放、Host 控制器释放和日志传输收口通过。证据：[lifecycle.json](/Users/xiaosong/.codex/visualizations/2026/10/02/01a0faad-6517-7cd3-90b5-b818bc64660d/plugin-sub-agent-ui/lifecycle.json)。
- 契约与构建：`npm run typecheck`、9 项真实边界契约、单入口构建、manifest 校验通过；构建报告见 [candidate-final-build-report.json](/Users/xiaosong/.codex/visualizations/2026/10/02/01a0faad-6517-7cd3-90b5-b818bc64660d/plugin-sub-agent-ui/candidate-final-build-report.json)。

原始界面和候选使用同一隔离 Host、真实 SQLite 记录和同一浏览器流程。候选 gzip 为 56,377 B，原始 gzip 为 4,555 B；首次挂载中位数 43.52 ms 对 23.76 ms，详情打开中位数 55.86 ms 对 76.01 ms。该原始制品很小，gzip 百分比由此放大；浏览器 `performance.memory` 在本环境固定返回 10,000,000，内存增量不作结论。完整 AB/BA 记录见 [performance-cost-investigation.json](/Users/xiaosong/.codex/visualizations/2026/10/02/01a0faad-6517-7cd3-90b5-b818bc64660d/plugin-sub-agent-ui/performance-cost-investigation.json)。

候选提交保留在独立分支，等待该批成本决定后再合入源仓主分支；未改变 Desktop Host 或其他项目。
