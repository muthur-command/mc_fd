import type { RouteRecordRaw } from 'vue-router'

interface RouteModuleType {
  default: RouteRecordRaw | RouteRecordRaw[]
}

/**
 * 合并插件路由模块（与 fastapi_best_architecture_ui 一致）
 * 每个模块 default 可为单条或数组
 */
export function mergeRouteModules(
  routeModules: Record<string, unknown>,
): RouteRecordRaw[] {
  const merged: RouteRecordRaw[] = []
  for (const mod of Object.values(routeModules)) {
    const def = (mod as RouteModuleType)?.default
    if (Array.isArray(def))
      merged.push(...def)
    else if (def)
      merged.push(def)
  }
  return merged
}
