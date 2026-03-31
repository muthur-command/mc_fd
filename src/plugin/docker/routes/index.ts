import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    name: 'PluginDocker',
    path: '/plugins/docker',
    component: () => import('@/plugin/docker/layout.vue'),
    redirect: '/plugins/docker/dashboard',
    meta: {
      title: 'Container',
      icon: 'Box',
    },
    children: [
      {
        name: 'PluginDockerDashboard',
        path: 'dashboard',
        component: () => import('@/plugin/docker/views/dashboard.vue'),
        meta: {
          title: '仪表板',
          icon: 'LayoutDashboard',
        },
      },
      {
        name: 'PluginDockerContainers',
        path: 'containers',
        component: () => import('@/plugin/docker/views/containers/index.vue'),
        meta: {
          title: '容器',
          icon: 'Box',
        },
      },
      {
        name: 'PluginDockerImages',
        path: 'images',
        component: () => import('@/plugin/docker/views/images/index.vue'),
        meta: {
          title: '镜像',
          icon: 'Images',
        },
      },
      {
        name: 'PluginDockerNetworks',
        path: 'networks',
        component: () => import('@/plugin/docker/views/networks/index.vue'),
        meta: {
          title: '网络',
          icon: 'Network',
        },
      },
      {
        name: 'PluginDockerVolumes',
        path: 'volumes',
        component: () => import('@/plugin/docker/views/volumes/index.vue'),
        meta: {
          title: '卷',
          icon: 'Database',
        },
      },
      {
        name: 'PluginDockerStacks',
        path: 'stacks',
        component: () => import('@/plugin/docker/views/stacks/index.vue'),
        meta: {
          title: '堆栈',
          icon: 'Layers',
        },
      },
    ],
  },
]

export default routes
