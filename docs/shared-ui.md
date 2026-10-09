# 子 Agent 公共 UI 本地集成

2026-10-09，已接受本批实测成本，产品提交 `05b065a8a1191d83ec2e1dff97a5b7125b40fc35` 已本地合入源仓 `main`。主仓 `rtk npm run check` 和 `rtk npm test` 均 PASS，包含类型、构建、制品、manifest 检查及 9 项真实边界契约；检查前后源码保持 clean。前端 SHA-256 为 `e84a5648ebcab6580ce614e1a789628a6fa9b572c810c0bb782396dd86e3d786`，与已接受及原生检查时的制品一致。当前收据：[cost-acceptance.json](/Users/xiaosong/.codex/visualizations/2026/10/02/01a0faad-6517-7cd3-90b5-b818bc64660d/plugin-sub-agent-ui/cost-acceptance.json)、[main-integration-checks.json](/Users/xiaosong/.codex/visualizations/2026/10/02/01a0faad-6517-7cd3-90b5-b818bc64660d/plugin-sub-agent-ui/main-integration-checks.json)。

该插件将 `com.xsec.workspace.sub-agent` 的两个只读工作区工具统一到 XSEC 公共 UI：列表使用 `PageHeader`、`ControlButton`、`ControlIconButton`、`Badge`、`Spinner`、`EmptyState` 和 `ErrorState`，详情复用同一页头与状态布局。`ControlThemeProvider` 同步颜色模式、密度、字号和减少动效偏好；移动视口采用单列详情，列表操作支持键盘焦点和返回后的焦点/滚动恢复。

业务边界保持三个已声明的 frontend API 方法：`xsec.subagents.list`、`xsec.subagents.get` 和 `xsec.workspace.tool.open`。列表、详情、跨会话拒绝、未受管会话错误和显式刷新均保留真实 Host 返回；返回数据执行运行时校验，异常传播到页面错误状态。日志记录操作 ID、方法、结果和耗时，不写入会话正文或工具输入输出。

## 候选阶段验证

以下为当前已集成制品的原有验收证据；本次主仓集成检查沿用该制品摘要，新增原生运行次数为 0。

- 隔离 macOS arm64 Host 检查：manifest `2.0.0`、`pluginApi ^1.3.0`、两个权限和前端制品回读通过；原生边界 fixture 返回 8/1/0 条记录，跨会话详情和未受管会话均明确拒绝。证据：[host-inspection.json](/Users/xiaosong/.codex/visualizations/2026/10/02/01a0faad-6517-7cd3-90b5-b818bc64660d/plugin-sub-agent-ui/host-inspection.json)、[native-boundaries.json](/Users/xiaosong/.codex/visualizations/2026/10/02/01a0faad-6517-7cd3-90b5-b818bc64660d/plugin-sub-agent-ui/native-boundaries.json)。
- 真实浏览器候选：7 项流程通过，包含列表、详情、键盘焦点、返回焦点、主题/密度/字号、移动视口、跨会话拒绝和空会话。证据：[candidate-browser.json](/Users/xiaosong/.codex/visualizations/2026/10/02/01a0faad-6517-7cd3-90b5-b818bc64660d/plugin-sub-agent-ui/candidate-browser.json)。
- 生命周期：候选 iframe 释放、Host 控制器释放和日志传输收口通过。证据：[lifecycle.json](/Users/xiaosong/.codex/visualizations/2026/10/02/01a0faad-6517-7cd3-90b5-b818bc64660d/plugin-sub-agent-ui/lifecycle.json)。
- 契约与构建：`npm run typecheck`、9 项真实边界契约、单入口构建、manifest 校验通过；构建报告见 [candidate-final-build-report.json](/Users/xiaosong/.codex/visualizations/2026/10/02/01a0faad-6517-7cd3-90b5-b818bc64660d/plugin-sub-agent-ui/candidate-final-build-report.json)。

原始界面和候选使用同一隔离 Host、真实 SQLite 记录和同一浏览器流程。候选 gzip 为 56,377 B，原始 gzip 为 4,555 B；首次挂载中位数 43.52 ms 对 23.76 ms，详情打开中位数 55.86 ms 对 76.01 ms。该原始制品很小，gzip 百分比由此放大；浏览器 `performance.memory` 在本环境固定返回 10,000,000，内存增量不作结论。完整 AB/BA 记录见 [performance-cost-investigation.json](/Users/xiaosong/.codex/visualizations/2026/10/02/01a0faad-6517-7cd3-90b5-b818bc64660d/plugin-sub-agent-ui/performance-cost-investigation.json)。

## 集成资源与验证边界

主仓检查在统一资源入口的 `dev` 槽内执行 `rtk node /Users/xiaosong/.codex/visualizations/2026/10/02/01a0faad-6517-7cd3-90b5-b818bc64660d/plugin-sub-agent-ui/main-integration-stage.mjs sub-agent`。runId `f2798ce3-26c8-4506-aee5-c51924a53878`，耗时 3,569 ms，采样峰值 RSS 313,671,680 B，物理卷净增量 +675,840 B，机器 swap 前后均 59,894,661.12 B。报告与计划分别为 [main-integration-report.json](/Users/xiaosong/.codex/visualizations/2026/10/02/01a0faad-6517-7cd3-90b5-b818bc64660d/plugin-sub-agent-ui/main-integration-report.json) 和 [main-plan.json](/Users/xiaosong/.codex/visualizations/2026/10/02/01a0faad-6517-7cd3-90b5-b818bc64660d/plugin-sub-agent-ui/main-plan.json)；构建缓存为 `/Users/xiaosong/dev/xsec-labs/.worktree-cache/build-resources/targets/5920b9dfdac09953e8faae69d50257325fd1a5767031cc9751bf25e09b9e9baa`。

主仓依赖稳定链接到 `/Users/xiaosong/dev/xsec-labs/.worktree-cache/pnpm/desktop-main-dev/virtual-store`，下载数 0；React/ReactDOM 18.3.1、Lucide 0.468.0、ui-react 0.1.7、tokens 0.1.2、TypeScript 5.9.3、esbuild 0.25.12 已回读，见 [main-dependency-readback.json](/Users/xiaosong/.codex/visualizations/2026/10/02/01a0faad-6517-7cd3-90b5-b818bc64660d/plugin-sub-agent-ui/main-dependency-readback.json)。已接受成本还包括 DOM 35→47（+12）；上述固定堆读数仍无法证明内存增量。dev 预算为缓存软/硬上限 60/80 GiB、开始/底线空闲 50/20 GiB、RSS 上限 32 GiB、Cargo jobs 2、Node heap 4,096 MiB、Vitest workers 2、采样间隔 2,000 ms。

原生证据范围为 macOS arm64 Host；Windows、Linux、macOS Intel Host、OS 键盘/中文 IME/读屏、完整正式 Composer/导航和原生性能/RSS 尚待验证。回滚时在产品仓 `rtk git revert 05b065a8a1191d83ec2e1dff97a5b7125b40fc35`，经统一资源入口重建并复验列表、详情、权限拒绝、主题和生命周期；持久化格式沿用基线。整体共享 UI 迁移继续 active。
