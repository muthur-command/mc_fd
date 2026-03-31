/**
 * OpenClaw Gateway RPC 方法名（与 openclaw-cn server-methods 一致）
 */
export const RPC = {
  connect: 'connect',
  // chat
  chatHistory: 'chat.history',
  chatSend: 'chat.send',
  chatAbort: 'chat.abort',
  chatInject: 'chat.inject',
  // channels
  channelsStatus: 'channels.status',
  webLoginStart: 'web.login.start',
  webLoginWait: 'web.login.wait',
  channelsLogout: 'channels.logout',
  // config
  configGet: 'config.get',
  configSet: 'config.set',
  configSchema: 'config.schema',
  configApply: 'config.apply',
  configPatch: 'config.patch',
  // sessions
  sessionsList: 'sessions.list',
  sessionsPatch: 'sessions.patch',
  sessionsDelete: 'sessions.delete',
  sessionsPreview: 'sessions.preview',
  sessionsResolve: 'sessions.resolve',
  // cron
  cronList: 'cron.list',
  cronStatus: 'cron.status',
  cronAdd: 'cron.add',
  cronUpdate: 'cron.update',
  cronRemove: 'cron.remove',
  cronRun: 'cron.run',
  cronRuns: 'cron.runs',
  // skills
  skillsStatus: 'skills.status',
  skillsInstall: 'skills.install',
  skillsUpdate: 'skills.update',
  skillsBins: 'skills.bins',
  // agents
  agentsList: 'agents.list',
  agentsFilesList: 'agents.files.list',
  agentsFilesGet: 'agents.files.get',
  agentsFilesSet: 'agents.files.set',
  agentIdentityGet: 'agent.identity.get',
  toolsCatalog: 'tools.catalog',
  // nodes
  nodeList: 'node.list',
  nodeDescribe: 'node.describe',
  // exec
  execApprovalsGet: 'exec.approvals.get',
  execApprovalsSet: 'exec.approvals.set',
  execApprovalsNodeGet: 'exec.approvals.node.get',
  execApprovalsNodeSet: 'exec.approvals.node.set',
  execApprovalRequest: 'exec.approval.request',
  execApprovalResolve: 'exec.approval.resolve',
  // devices
  devicePairList: 'device.pair.list',
  devicePairApprove: 'device.pair.approve',
  devicePairReject: 'device.pair.reject',
  deviceTokenRotate: 'device.token.rotate',
  deviceTokenRevoke: 'device.token.revoke',
  // presence / system
  systemPresence: 'system-presence',
  // logs / debug
  logsTail: 'logs.tail',
  status: 'status',
  health: 'health',
  modelsList: 'models.list',
  // usage
  sessionsUsage: 'sessions.usage',
  usageCost: 'usage.cost',
  // update
  updateRun: 'update.run',
} as const
