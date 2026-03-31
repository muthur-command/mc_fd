import type { RouteRecordRaw } from 'vue-router'

import { setupLayouts } from 'virtual:generated-layouts'
import { createRouter, createWebHistory } from 'vue-router'
import { handleHotUpdate, routes } from 'vue-router/auto-routes'

import { mergeRouteModules } from '@/lib/merge-route-modules'

import { createRouterGuard } from './guard'

// 插件路由：与 fastapi_best_architecture_ui 一致，各插件在 plugin/*/routes/index.ts 声明，直接指向 views/index.vue
const pluginRouteFiles = import.meta.glob<{ default: RouteRecordRaw | RouteRecordRaw[] }>('../plugin/*/routes/index.ts', {
  eager: true,
})
const pluginRoutes = mergeRouteModules(pluginRouteFiles as Record<string, unknown>)
const baseRoutes = routes as RouteRecordRaw[]
// 插件具体路径放前面，使 /plugin/card 优先于 /plugin/:name 匹配
const allRoutes = [...pluginRoutes, ...baseRoutes]

const router = createRouter({
  history: createWebHistory(),
  routes: setupLayouts(allRoutes),

  scrollBehavior() {
    return { left: 0, top: 0, behavior: 'smooth' }
  },
})

createRouterGuard(router)

export default router

if (import.meta.hot) {
  handleHotUpdate(router)
}
