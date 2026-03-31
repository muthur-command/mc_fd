import type { RouteRecordRaw } from 'vue-router'

/**
 * 系统监控插件路由（原 Dashboard System Monitor 页面前端移植）
 */
const routes: RouteRecordRaw[] = [
  {
    name: 'PluginSystemMonitor',
    path: '/plugin/system-monitor',
    component: () => import('@/plugin/system-monitor/views/index.vue'),
    meta: { title: 'System Monitor' },
  },
]

export default routes
