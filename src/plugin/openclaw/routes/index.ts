import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    name: 'PluginOpenclaw',
    path: '/plugins/openclaw',
    component: () => import('@/plugin/openclaw/layout.vue'),
    redirect: '/plugins/openclaw/chat',
    meta: { title: 'OpenClaw', icon: 'MessageSquare' },
    children: [
      { path: 'overview', name: 'PluginOpenclawOverview', component: () => import('@/plugin/openclaw/views/overview.vue'), meta: { title: 'openclaw.overview', icon: 'LayoutDashboard' } },
      { path: 'chat', name: 'PluginOpenclawChat', component: () => import('@/plugin/openclaw/views/chat.vue'), meta: { title: 'openclaw.chat', icon: 'MessageSquare' } },
      { path: 'channels', name: 'PluginOpenclawChannels', component: () => import('@/plugin/openclaw/views/channels/index.vue'), meta: { title: 'openclaw.channels', icon: 'Radio' } },
      { path: 'instances', name: 'PluginOpenclawInstances', component: () => import('@/plugin/openclaw/views/instances.vue'), meta: { title: 'openclaw.instances', icon: 'Server' } },
      { path: 'sessions', name: 'PluginOpenclawSessions', component: () => import('@/plugin/openclaw/views/sessions.vue'), meta: { title: 'openclaw.sessions', icon: 'MessagesSquare' } },
      { path: 'usage', name: 'PluginOpenclawUsage', component: () => import('@/plugin/openclaw/views/usage.vue'), meta: { title: 'openclaw.usage', icon: 'BarChart3' } },
      { path: 'cron', name: 'PluginOpenclawCron', component: () => import('@/plugin/openclaw/views/cron.vue'), meta: { title: 'openclaw.cron', icon: 'Clock' } },
      { path: 'agents', name: 'PluginOpenclawAgents', component: () => import('@/plugin/openclaw/views/agents.vue'), meta: { title: 'openclaw.agents', icon: 'Bot' } },
      { path: 'skills', name: 'PluginOpenclawSkills', component: () => import('@/plugin/openclaw/views/skills.vue'), meta: { title: 'openclaw.skills', icon: 'Puzzle' } },
      { path: 'nodes', name: 'PluginOpenclawNodes', component: () => import('@/plugin/openclaw/views/nodes.vue'), meta: { title: 'openclaw.nodes', icon: 'Boxes' } },
      { path: 'config', name: 'PluginOpenclawConfig', component: () => import('@/plugin/openclaw/views/config.vue'), meta: { title: 'openclaw.config', icon: 'Settings', configSection: null } },
      { path: 'communications', name: 'PluginOpenclawCommunications', component: () => import('@/plugin/openclaw/views/config.vue'), meta: { title: 'openclaw.communications', icon: 'Radio', configSection: 'communications' } },
      { path: 'appearance', name: 'PluginOpenclawAppearance', component: () => import('@/plugin/openclaw/views/config.vue'), meta: { title: 'openclaw.appearance', icon: 'Palette', configSection: 'appearance' } },
      { path: 'automation', name: 'PluginOpenclawAutomation', component: () => import('@/plugin/openclaw/views/config.vue'), meta: { title: 'openclaw.automation', icon: 'Workflow', configSection: 'automation' } },
      { path: 'infrastructure', name: 'PluginOpenclawInfrastructure', component: () => import('@/plugin/openclaw/views/config.vue'), meta: { title: 'openclaw.infrastructure', icon: 'Server', configSection: 'infrastructure' } },
      { path: 'ai-agents', name: 'PluginOpenclawAiAgents', component: () => import('@/plugin/openclaw/views/config.vue'), meta: { title: 'openclaw.aiAgents', icon: 'Bot', configSection: 'aiAgents' } },
      { path: 'debug', name: 'PluginOpenclawDebug', component: () => import('@/plugin/openclaw/views/debug.vue'), meta: { title: 'openclaw.debug', icon: 'Bug' } },
      { path: 'logs', name: 'PluginOpenclawLogs', component: () => import('@/plugin/openclaw/views/logs.vue'), meta: { title: 'openclaw.logs', icon: 'FileText' } },
    ],
  },
]

export default routes
