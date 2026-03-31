import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    name: 'PluginAppriseNotify',
    path: '/plugin/apprise-notify',
    component: () => import('@/plugin/apprise_notify/views/index.vue'),
    meta: {
      title: 'appriseNotify.routeTitle',
      icon: 'Bell',
    },
  },
]

export default routes
