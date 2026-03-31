import type { RouteRecordRaw } from 'vue-router'

/**
 * 卡片插件路由（与 fastapi_best_architecture_ui 一致：路由直接指向插件 views/index.vue）
 */
const routes: RouteRecordRaw[] = [
  {
    name: 'PluginCard',
    path: '/plugin/card',
    component: () => import('@/plugin/card/views/index.vue'),
    meta: { title: 'Card' },
  },
]

export default routes
