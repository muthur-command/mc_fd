# 系统监控插件 (system-monitor)

原 Dashboard System Monitor 页面前端移植至 `src/plugin/system-monitor`。

- **路由**：`/plugin/system-monitor`（由 `plugin/*/routes/index.ts` 自动挂载）
- **侧栏**：Dashboards → System 指向本插件；后端插件名 `system_monitor` 时也可从插件列表注入侧栏
- **接口**：`GET /api/v1/monitors/server`、`GET /api/v1/monitors/redis`（主应用 `@/services/api/monitor.api`）
- **i18n**：插件内 `i18n/zh.json`、`i18n/en.json` 提供 `systemMonitor` 与 `pluginManage.plugins.system_monitor`

旧链接 `/dashboard/system` 会自动重定向到 `/plugin/system-monitor`。
