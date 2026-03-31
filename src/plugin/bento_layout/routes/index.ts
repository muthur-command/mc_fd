import type { RouteRecordRaw } from 'vue-router'

/**
 * meta.title：i18n 键，供侧栏/命令面板等用 t(route.meta.title) 解析（与插件 i18n 中 bentoLayout.routeTitle 一致）
 */
const routes: RouteRecordRaw[] = [
  {
    name: 'PluginBentoLayout',
    path: '/plugin/bento-layout',
    component: () => import('@/plugin/bento_layout/views/index.vue'),
    meta: {
      title: 'bentoLayout.routeTitle',
      icon: 'LayoutGrid',
    },
  },
]

export default routes
