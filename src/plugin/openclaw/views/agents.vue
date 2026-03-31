<script setup lang="ts">
/**
 * Agents 页：对齐 openclaw Control UI agents 布局（Agent 选择器、子页签 Overview / Files / Tools / Skills / Channels / Cron）
 */
import {
  Bot,
  Clock,
  ExternalLink,
  Eye,
  FolderOpen,
  MoreHorizontal,
  Puzzle,
  Radio,
  RefreshCw,
  Wrench,
} from 'lucide-vue-next'
import { computed, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import {
  applyToolProfileChange,
  buildToolAccessContext,
  profileSourceLabel,
  setAllToolAccess,
  toggleToolAccess,
} from '@/plugin/openclaw/lib/agent-tool-access'
import {
  applyAgentModelChange,
  applyAgentModelFallbacks,
  buildModelSelectOptions,
  parseFallbackList,
  resolveAgentConfig,
  resolveModelFallbacks,
  resolveModelLabel,
  resolveModelPrimary,
  setAgentSkills,
} from '@/plugin/openclaw/lib/agents-overview-config'
import { formatAgo, formatBytes, formatMs } from '@/plugin/openclaw/lib/format'
import { RPC } from '@/plugin/openclaw/lib/rpc-methods'

const { t } = useI18n()
const router = useRouter()
const gateway = inject<
  ReturnType<typeof import('@/plugin/openclaw/composables/use-openclaw-gateway').useOpenClawGateway>
>('openclaw-gateway')!

interface AgentRow { id: string, name?: string, identity?: { name?: string, emoji?: string, avatar?: string } }
interface AgentsListRes { defaultId?: string, mainKey?: string, scope?: string, agents?: AgentRow[] }
interface FileEntry { name: string, path?: string, missing?: boolean, size?: number, updatedAtMs?: number }
interface FilesListRes { agentId: string, workspace: string, files: FileEntry[] }
interface IdentityRes { agentId: string, name: string, avatar: string, emoji?: string }
interface ToolEntry { id: string, label: string, description?: string, source?: string }
interface ToolGroup { id: string, label: string, tools: ToolEntry[] }
interface ToolsCatalogRes {
  agentId: string
  groups?: ToolGroup[]
  profiles?: { id: string, label: string }[]
}
interface SkillEntry {
  name: string
  disabled?: boolean
  blockedByAllowlist?: boolean
  description?: string
}
interface SkillsReport { skills?: SkillEntry[], workspaceDir?: string }
interface ChannelsSnap {
  channelLabels?: Record<string, string>
  channelAccounts?: Record<string, unknown[]>
}
interface CronJob {
  id: string
  name?: string
  agentId?: string
  enabled?: boolean
  state?: { nextRunAtMs?: number, lastStatus?: string }
}

type Panel = 'overview' | 'files' | 'tools' | 'skills' | 'channels' | 'cron'

const loading = ref(false)
const listError = ref<string | null>(null)
const agentsList = ref<AgentsListRes | null>(null)
const selectedId = ref<string | null>(null)
const panel = ref<Panel>('overview')

const filesList = ref<FilesListRes | null>(null)
const filesLoading = ref(false)
const filesErr = ref<string | null>(null)
const activeFile = ref<string | null>(null)
const fileEditorBase = ref('')
const fileEditorDraft = ref('')
const fileLoading = ref(false)
const fileSaving = ref(false)
const filePreviewOpen = ref(false)

const identity = ref<IdentityRes | null>(null)
const identityLoading = ref(false)

const toolsRes = ref<ToolsCatalogRes | null>(null)
const toolsLoading = ref(false)
const toolsErr = ref<string | null>(null)

const skillsReport = ref<SkillsReport | null>(null)
const skillsReportAgentId = ref<string | null>(null)
const skillsLoading = ref(false)
const skillsErr = ref<string | null>(null)
const skillsFilter = ref('')

const channelsSnap = ref<ChannelsSnap | null>(null)
const channelsLastSuccess = ref<number | null>(null)
const channelsLoading = ref(false)
const channelsErr = ref<string | null>(null)

const cronJobs = ref<CronJob[]>([])
const cronLoading = ref(false)
const cronErr = ref<string | null>(null)

const setDefaultBusy = ref(false)
const actionMsg = ref<string | null>(null)

/** Overview：与 Control UI agents-panels-overview 一致的可编辑配置 */
const configForm = ref<Record<string, unknown> | null>(null)
const configHash = ref<string | null>(null)
const overviewCfgLoading = ref(false)
const overviewCfgErr = ref<string | null>(null)
const overviewCfgDirty = ref(false)
const overviewCfgSaving = ref(false)
/** Fallbacks 输入框：逗号分隔的多个回退模型，与 overviewUi.fallbackChips 同步 */
const fallbacksInput = ref('')

const agents = computed(() => agentsList.value?.agents ?? [])
const defaultId = computed(() => agentsList.value?.defaultId ?? null)
const selectedAgent = computed(() => agents.value.find(a => a.id === selectedId.value) ?? null)

function agentLabel(a: AgentRow) {
  const d = defaultId.value
  const base = a.name || a.id
  return d && a.id === d ? `${base} (${t('openclaw.agentsDefaultBadge')})` : base
}

const tabCounts = computed(() => {
  const fid = selectedId.value
  const files
    = filesList.value?.agentId === fid ? filesList.value.files.length : null
  const toolN = toolsRes.value?.groups?.reduce((n, g) => n + (g.tools?.length ?? 0), 0) ?? null
  const skillsN = skillsReport.value?.skills?.length ?? null
  let ch = 0
  if (channelsSnap.value?.channelAccounts) {
    for (const v of Object.values(channelsSnap.value.channelAccounts)) {
      ch += Array.isArray(v) ? v.length : 0
    }
  }
  const cronN = fid
    ? cronJobs.value.filter(j => !j.agentId || j.agentId === fid).length
    : null
  return { files, tools: toolN, skills: skillsN, channels: ch || null, cron: cronN }
})

const channelRows = computed(() => {
  const snap = channelsSnap.value
  if (!snap?.channelAccounts)
    return []
  return Object.entries(snap.channelAccounts).map(([k, accounts]) => ({
    id: k,
    label: snap.channelLabels?.[k] ?? k,
    value: t('openclaw.agentsLinked', { n: Array.isArray(accounts) ? accounts.length : 0 }),
  }))
})

/** Agent Context 卡片数据（Channels 面板左侧），与 openclaw renderAgentContextCard 一致 */
const channelsAgentContext = computed(() => {
  const agent = selectedAgent.value
  if (!agent)
    return null
  const cfg = configForm.value
  const resolved = cfg ? resolveAgentConfig(cfg, agent.id) : null
  const workspace = resolved?.entry?.workspace || resolved?.defaults?.workspace || '—'
  const primary = resolved?.entry?.model
    ? resolveModelLabel(resolved.entry.model)
    : resolveModelLabel(resolved?.defaults?.model)
  const skills = Array.isArray(resolved?.entry?.skills)
    ? t('openclaw.agentsSkillsFilterSelected', { n: resolved?.entry?.skills.length ?? 0 })
    : t('openclaw.agentsSkillsFilterAll')
  const id = identity.value
  const identityName
    = id?.name ?? agent.identity?.name ?? agent.name ?? agent.id ?? '—'
  const identityAvatar
    = id?.emoji ?? (id?.avatar ? 'custom' : '—')
  return {
    workspace,
    model: primary,
    identityName,
    identityAvatar,
    skillsLabel: skills,
    isDefault: Boolean(defaultId.value === agent.id),
  }
})

const agentCronJobs = computed(() => {
  const id = selectedId.value
  if (!id)
    return []
  return cronJobs.value.filter(j => !j.agentId || j.agentId === id)
})

function resetPerAgentState() {
  filesList.value = null
  filesErr.value = null
  activeFile.value = null
  fileEditorBase.value = ''
  fileEditorDraft.value = ''
  identity.value = null
  toolsRes.value = null
  toolsErr.value = null
  skillsReport.value = null
  skillsReportAgentId.value = null
  skillsErr.value = null
  channelsSnap.value = null
  channelsLastSuccess.value = null
  channelsErr.value = null
  cronJobs.value = []
  cronErr.value = null
  configForm.value = null
  configHash.value = null
  overviewCfgDirty.value = false
  overviewCfgErr.value = null
  fallbacksInput.value = ''
}

async function loadOverviewConfig() {
  if (!gateway?.connected)
    return
  overviewCfgLoading.value = true
  overviewCfgErr.value = null
  try {
    const res = await gateway.request<{ config?: Record<string, unknown>, hash?: string | null }>(
      RPC.configGet,
      {},
    )
    configForm.value = structuredClone((res?.config ?? {}) as Record<string, unknown>)
    configHash.value = typeof res?.hash === 'string' ? res.hash : null
    overviewCfgDirty.value = false
  }
  catch (e) {
    overviewCfgErr.value = e instanceof Error ? e.message : String(e)
    configForm.value = null
    configHash.value = null
  }
  finally {
    overviewCfgLoading.value = false
  }
}

const overviewUi = computed(() => {
  const agent = selectedAgent.value
  const cfg = configForm.value
  if (!agent || !cfg)
    return null
  const id = agent.id
  const { entry, defaults } = resolveAgentConfig(cfg, id)
  const workspaceFromFiles
    = filesList.value?.agentId === id ? filesList.value.workspace : null
  const workspace
    = workspaceFromFiles || entry?.workspace || defaults?.workspace || 'default'
  const primaryDisplay = entry?.model
    ? resolveModelLabel(entry.model)
    : resolveModelLabel(defaults?.model)
  const entryPrimary = resolveModelPrimary(entry?.model)
  const defaultPrimary = resolveModelPrimary(defaults?.model)
  const defaultLabel = resolveModelLabel(defaults?.model)
  const effectivePrimary
    = entryPrimary ?? defaultPrimary ?? (defaultLabel !== '-' ? defaultLabel : null)
  const fallbackChips = resolveModelFallbacks(entry?.model) ?? []
  const skillFilter = Array.isArray(entry?.skills) ? entry.skills : null
  const isDef = defaultId.value === id
  const selectValue = isDef ? (effectivePrimary ?? '') : (entryPrimary ?? '')
  const modelOptions = buildModelSelectOptions(
    cfg,
    isDef ? (effectivePrimary ?? undefined) : (entryPrimary ?? undefined),
  )
  const cfgDisabled = overviewCfgLoading.value || overviewCfgSaving.value
  return {
    workspace,
    primaryDisplay,
    skillsLabel: skillFilter
      ? t('openclaw.agentsSkillsFilterSelected', { n: skillFilter.length })
      : t('openclaw.agentsSkillsFilterAll'),
    isDefault: isDef,
    effectivePrimary,
    defaultPrimary,
    entryPrimary,
    fallbackChips,
    selectValue,
    modelOptions,
    cfgDisabled: !cfg || cfgDisabled,
  }
})

function touchOverviewModel() {
  if (!configForm.value || !selectedAgent.value)
    return
  overviewCfgDirty.value = true
}

function onOverviewPrimaryChange(modelId: string) {
  const id = selectedAgent.value?.id
  const cfg = configForm.value
  if (!id || !cfg)
    return
  applyAgentModelChange(cfg, id, modelId.trim() || null)
  touchOverviewModel()
}

function onFallbacksBlur() {
  const id = selectedAgent.value?.id
  const cfg = configForm.value
  if (!id || !cfg)
    return
  const parsed = parseFallbackList(fallbacksInput.value)
  applyAgentModelFallbacks(cfg, id, parsed)
  fallbacksInput.value = parsed.join(', ')
  touchOverviewModel()
}

watch(
  () => overviewUi.value?.fallbackChips,
  (chips) => {
    fallbacksInput.value = (chips ?? []).join(', ')
  },
  { immediate: true },
)

async function reloadOverviewConfig() {
  await loadOverviewConfig()
}

async function saveOverviewConfig() {
  if (!gateway?.connected || !configForm.value || !configHash.value)
    return
  overviewCfgSaving.value = true
  overviewCfgErr.value = null
  try {
    const raw = JSON.stringify(configForm.value)
    await gateway.request(RPC.configSet, { raw, baseHash: configHash.value })
    await loadOverviewConfig()
  }
  catch (e) {
    overviewCfgErr.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    overviewCfgSaving.value = false
  }
}

async function loadAgentsList() {
  if (!gateway?.connected)
    return
  loading.value = true
  listError.value = null
  try {
    const res = await gateway.request<AgentsListRes>(RPC.agentsList, {})
    agentsList.value = res && typeof res === 'object' ? res : null
    const list = agentsList.value?.agents ?? []
    const def = agentsList.value?.defaultId
    const cur = selectedId.value
    if (!cur || !list.some(a => a.id === cur)) {
      selectedId.value = def && list.some(a => a.id === def) ? def : list[0]?.id ?? null
    }
  }
  catch (e) {
    listError.value = e instanceof Error ? e.message : String(e)
    agentsList.value = null
  }
  finally {
    loading.value = false
  }
}

async function loadFiles(agentId: string) {
  if (!gateway?.connected || !agentId)
    return
  filesLoading.value = true
  filesErr.value = null
  try {
    const res = await gateway.request<FilesListRes>(RPC.agentsFilesList, { agentId })
    filesList.value = res ?? null
    if (activeFile.value && !filesList.value?.files.some(f => f.name === activeFile.value)) {
      activeFile.value = null
      fileEditorBase.value = ''
      fileEditorDraft.value = ''
    }
  }
  catch (e) {
    filesErr.value = e instanceof Error ? e.message : String(e)
    filesList.value = null
  }
  finally {
    filesLoading.value = false
  }
}

async function loadFileContent(agentId: string, name: string) {
  if (!gateway?.connected)
    return
  fileLoading.value = true
  try {
    const res = await gateway.request<{ file?: { content?: string } }>(RPC.agentsFilesGet, {
      agentId,
      name,
    })
    const text = res?.file?.content ?? ''
    fileEditorBase.value = text
    fileEditorDraft.value = text
  }
  catch {
    fileEditorBase.value = ''
    fileEditorDraft.value = ''
  }
  finally {
    fileLoading.value = false
  }
}

function fileRowMeta(f: FileEntry): string {
  if (f.missing)
    return t('openclaw.agentsFileMissing')
  const size = formatBytes(f.size)
  const ago = f.updatedAtMs != null ? formatAgo(f.updatedAtMs) : '—'
  return `${size} · ${ago}`
}

const workspaceFiles = computed(() => {
  const id = selectedId.value
  if (!id || filesList.value?.agentId !== id)
    return []
  return filesList.value.files ?? []
})

const activeFileEntry = computed(() => {
  const n = activeFile.value
  if (!n)
    return null
  return workspaceFiles.value.find(f => f.name === n) ?? null
})

const fileEditorDirty = computed(
  () => Boolean(activeFile.value) && fileEditorDraft.value !== fileEditorBase.value,
)

function resetFileEditor() {
  fileEditorDraft.value = fileEditorBase.value
}

async function saveAgentWorkspaceFile() {
  const agentId = selectedId.value
  const name = activeFile.value
  if (!gateway?.connected || !agentId || !name || fileSaving.value)
    return
  fileSaving.value = true
  filesErr.value = null
  try {
    await gateway.request(RPC.agentsFilesSet, {
      agentId,
      name,
      content: fileEditorDraft.value,
    })
    await loadFiles(agentId)
    await loadFileContent(agentId, name)
  }
  catch (e) {
    filesErr.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    fileSaving.value = false
  }
}

async function loadIdentity(agentId: string) {
  if (!gateway?.connected || !agentId)
    return
  identityLoading.value = true
  try {
    const res = await gateway.request<IdentityRes | null>(RPC.agentIdentityGet, { agentId })
    identity.value = res && res.agentId === agentId ? res : null
  }
  catch {
    identity.value = null
  }
  finally {
    identityLoading.value = false
  }
}

async function loadSkills(agentId: string) {
  if (!gateway?.connected || !agentId)
    return
  skillsLoading.value = true
  skillsErr.value = null
  try {
    const res = await gateway.request<SkillsReport>(RPC.skillsStatus, { agentId })
    skillsReport.value = res ?? null
    skillsReportAgentId.value = res ? agentId : null
  }
  catch (e) {
    skillsErr.value = e instanceof Error ? e.message : String(e)
    skillsReport.value = null
    skillsReportAgentId.value = null
  }
  finally {
    skillsLoading.value = false
  }
}

const skillsUi = computed(() => {
  const id = selectedId.value
  const cfg = configForm.value
  const config = id && cfg ? resolveAgentConfig(cfg, id) : null
  const allowlist = config?.entry?.skills
  const allowSet = new Set((allowlist ?? []).map(n => n.trim()).filter(Boolean))
  const usingAllowlist = allowlist !== undefined
  const reportReady = Boolean(
    skillsReport.value && id && skillsReportAgentId.value === id,
  )
  const rawSkills = reportReady ? (skillsReport.value?.skills ?? []) : []
  const q = skillsFilter.value.trim().toLowerCase()
  const filtered = q
    ? rawSkills.filter(s =>
        [s.name, s.description].filter(Boolean).join(' ').toLowerCase().includes(q),
      )
    : rawSkills
  const enabledCount = usingAllowlist
    ? rawSkills.filter(s => allowSet.has(s.name)).length
    : rawSkills.length
  const totalCount = rawSkills.length
  const editable = Boolean(cfg) && !overviewCfgLoading.value && !overviewCfgSaving.value
  return {
    allowSet,
    usingAllowlist,
    rawSkills,
    filtered,
    enabledCount,
    totalCount,
    editable,
    reportReady,
  }
})

function onSkillToggle(skillName: string, enabled: boolean) {
  const id = selectedId.value
  const cfg = configForm.value
  if (!id || !cfg)
    return
  const { allowSet, rawSkills, usingAllowlist } = skillsUi.value
  const allNames = rawSkills.map(s => s.name)
  let next: string[] | undefined
  if (enabled) {
    const nextSet = new Set(allowSet)
    nextSet.add(skillName)
    next = Array.from(nextSet)
    if (next.length === allNames.length)
      next = undefined
  }
  else {
    if (!usingAllowlist) {
      next = allNames.filter(n => n !== skillName)
    }
    else {
      next = Array.from(allowSet).filter(n => n !== skillName)
    }
  }
  setAgentSkills(cfg, id, next)
  touchOverviewModel()
}

function onSkillsClear() {
  const id = selectedId.value
  const cfg = configForm.value
  if (!id || !cfg)
    return
  setAgentSkills(cfg, id, undefined)
  touchOverviewModel()
}

function onSkillsDisableAll() {
  const id = selectedId.value
  const cfg = configForm.value
  if (!id || !cfg)
    return
  setAgentSkills(cfg, id, [])
  touchOverviewModel()
}

async function loadTools(agentId: string) {
  if (!gateway?.connected || !agentId)
    return
  toolsLoading.value = true
  toolsErr.value = null
  try {
    const res = await gateway.request<ToolsCatalogRes>(RPC.toolsCatalog, {
      agentId,
      includePlugins: true,
    })
    toolsRes.value = res?.agentId === agentId ? res : null
  }
  catch (e) {
    toolsErr.value = e instanceof Error ? e.message : String(e)
    toolsRes.value = null
  }
  finally {
    toolsLoading.value = false
  }
}

const toolAccessView = computed(() => {
  const id = selectedId.value
  if (!id)
    return { state: 'no_agent' as const }
  const cfg = configForm.value
  if (overviewCfgLoading.value && !cfg)
    return { state: 'loading' as const }
  if (!cfg)
    return { state: 'need_config' as const }
  return {
    state: 'ready' as const,
    ctx: buildToolAccessContext(cfg, id, toolsRes.value, {
      configLoading: overviewCfgLoading.value,
      configSaving: overviewCfgSaving.value,
      catalogLoading: toolsLoading.value,
      catalogError: toolsErr.value,
    }),
  }
})

function onToolsProfileChange(profile: string | null, clearAllow: boolean) {
  const cfg = configForm.value
  const id = selectedId.value
  if (!cfg || !id)
    return
  applyToolProfileChange(cfg, id, profile, clearAllow)
  touchOverviewModel()
}

function onToolAccessToggle(toolId: string, enabled: boolean) {
  const cfg = configForm.value
  const id = selectedId.value
  if (!cfg || !id)
    return
  toggleToolAccess(cfg, id, toolId, enabled, toolsRes.value)
  touchOverviewModel()
}

function onToolsEnableAll() {
  const cfg = configForm.value
  const id = selectedId.value
  if (!cfg || !id)
    return
  setAllToolAccess(cfg, id, true, toolsRes.value)
  touchOverviewModel()
}

function onToolsDisableAll() {
  const cfg = configForm.value
  const id = selectedId.value
  if (!cfg || !id)
    return
  setAllToolAccess(cfg, id, false, toolsRes.value)
  touchOverviewModel()
}

async function reloadToolsConfig() {
  await loadOverviewConfig()
  const id = selectedId.value
  if (id)
    await loadTools(id)
}

async function loadChannels() {
  if (!gateway?.connected)
    return
  channelsLoading.value = true
  channelsErr.value = null
  try {
    const res = await gateway.request<ChannelsSnap>(RPC.channelsStatus, {})
    channelsSnap.value = res ?? null
    channelsLastSuccess.value = res ? Date.now() : null
  }
  catch (e) {
    channelsErr.value = e instanceof Error ? e.message : String(e)
    channelsSnap.value = null
  }
  finally {
    channelsLoading.value = false
  }
}

async function loadCron() {
  if (!gateway?.connected)
    return
  cronLoading.value = true
  cronErr.value = null
  try {
    const res = await gateway.request<{ jobs?: CronJob[] }>(RPC.cronList, {
      includeDisabled: true,
      limit: 200,
      offset: 0,
    })
    cronJobs.value = Array.isArray(res?.jobs) ? res.jobs : []
  }
  catch (e) {
    cronErr.value = e instanceof Error ? e.message : String(e)
    cronJobs.value = []
  }
  finally {
    cronLoading.value = false
  }
}

function ensurePanelData(p: Panel, agentId: string | null) {
  if (!agentId)
    return
  if (p === 'overview') {
    void loadOverviewConfig()
    void loadFiles(agentId)
    void loadIdentity(agentId)
    void loadSkills(agentId)
  }
  if (p === 'files')
    void loadFiles(agentId)
  if (p === 'tools') {
    void loadOverviewConfig()
    void loadTools(agentId)
  }
  if (p === 'skills')
    void loadSkills(agentId)
  if (p === 'channels') {
    void loadOverviewConfig()
    void loadIdentity(agentId)
    void loadChannels()
  }
  if (p === 'cron') {
    void loadOverviewConfig()
    void loadIdentity(agentId)
    void loadCron()
  }
}

async function refresh() {
  actionMsg.value = null
  await loadAgentsList()
  const id = selectedId.value
  if (!id)
    return
  resetPerAgentState()
  ensurePanelData(panel.value, id)
}

function selectAgent(id: string) {
  if (selectedId.value === id)
    return
  selectedId.value = id
  resetPerAgentState()
  ensurePanelData(panel.value, id)
}

function selectPanel(p: Panel) {
  panel.value = p
  ensurePanelData(p, selectedId.value)
}

watch(
  () => gateway?.connected,
  (c) => {
    if (c) {
      void loadAgentsList().then(() => {
        const id = selectedId.value
        if (id)
          ensurePanelData(panel.value, id)
      })
    }
    else {
      agentsList.value = null
      selectedId.value = null
      resetPerAgentState()
    }
  },
  { immediate: true },
)

function openFilesFromOverview() {
  selectPanel('files')
}

async function onSelectFile(name: string) {
  const id = selectedId.value
  if (!id)
    return
  activeFile.value = name
  await loadFileContent(id, name)
}

async function copyAgentId() {
  const id = selectedId.value
  if (!id || typeof navigator === 'undefined' || !navigator.clipboard)
    return
  try {
    await navigator.clipboard.writeText(id)
    actionMsg.value = t('openclaw.agentsCopyOk')
  }
  catch {
    actionMsg.value = t('openclaw.agentsCopyFail')
  }
}

async function setAsDefault() {
  const agentId = selectedId.value
  if (!gateway?.connected || !agentId || setDefaultBusy.value)
    return
  if (defaultId.value === agentId)
    return
  setDefaultBusy.value = true
  actionMsg.value = null
  try {
    const cg = await gateway.request<{ hash?: string | null }>(RPC.configGet, {})
    const hash = cg?.hash
    if (!hash) {
      actionMsg.value = t('openclaw.agentsSetDefaultErr')
      return
    }
    await gateway.request(RPC.configPatch, {
      raw: JSON.stringify({ agents: { defaultId: agentId } }),
      baseHash: hash,
    })
    await loadAgentsList()
    const id = selectedId.value
    if (id)
      ensurePanelData(panel.value, id)
    actionMsg.value = t('openclaw.agentsSetDefaultOk')
  }
  catch (e) {
    actionMsg.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    setDefaultBusy.value = false
  }
}

const tabs: { id: Panel, labelKey: string, icon: typeof Bot }[] = [
  { id: 'overview', labelKey: 'openclaw.agentsTabOverview', icon: Bot },
  { id: 'files', labelKey: 'openclaw.agentsTabFiles', icon: FolderOpen },
  { id: 'tools', labelKey: 'openclaw.agentsTabTools', icon: Wrench },
  { id: 'skills', labelKey: 'openclaw.agentsTabSkills', icon: Puzzle },
  { id: 'channels', labelKey: 'openclaw.agentsTabChannels', icon: Radio },
  { id: 'cron', labelKey: 'openclaw.agentsTabCron', icon: Clock },
]

function tabCount(id: Panel): number | null {
  const c = tabCounts.value
  switch (id) {
    case 'files':
      return c.files
    case 'tools':
      return c.tools
    case 'skills':
      return c.skills
    case 'channels':
      return c.channels
    case 'cron':
      return c.cron
    default:
      return null
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ t('openclaw.agentsTitle') }}
      </h1>
      <p class="text-muted-foreground mt-1 text-sm">
        {{ t('openclaw.agentsPageDesc') }}
      </p>
    </div>

    <UiCard v-if="!gateway?.connected">
      <UiCardContent class="text-muted-foreground py-8 text-center text-sm">
        {{ t('openclaw.connectFirst') }}
      </UiCardContent>
    </UiCard>

    <template v-else>
      <UiCard class="shadow-sm">
        <UiCardHeader class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-wrap items-center gap-3">
            <span class="text-muted-foreground text-sm font-medium">{{
              t('openclaw.agentsAgentLabel')
            }}</span>
            <select
              class="border-input bg-background h-9 min-w-[12rem] rounded-md border px-2 text-sm"
              :value="selectedId ?? ''"
              :disabled="loading || agents.length === 0"
              @change="selectAgent(($event.target as HTMLSelectElement).value)"
            >
              <option v-if="agents.length === 0" value="">
                {{ t('openclaw.agentsNoAgents') }}
              </option>
              <option v-for="a in agents" :key="a.id" :value="a.id">
                {{ agentLabel(a) }}
              </option>
            </select>
            <UiDropdownMenu v-if="selectedAgent">
              <UiDropdownMenuTrigger as-child>
                <UiButton variant="outline" size="icon" class="size-9 shrink-0" aria-label="More">
                  <MoreHorizontal class="size-4" />
                </UiButton>
              </UiDropdownMenuTrigger>
              <UiDropdownMenuContent align="start">
                <UiDropdownMenuItem @click="copyAgentId">
                  {{ t('openclaw.agentsCopyId') }}
                </UiDropdownMenuItem>
                <UiDropdownMenuItem
                  :disabled="defaultId === selectedId || setDefaultBusy"
                  @click="setAsDefault"
                >
                  {{ t('openclaw.agentsSetDefault') }}
                </UiDropdownMenuItem>
              </UiDropdownMenuContent>
            </UiDropdownMenu>
            <UiButton size="sm" variant="outline" class="gap-1.5" :disabled="loading" @click="refresh">
              <RefreshCw class="size-3.5" :class="{ 'animate-spin': loading }" />
              {{ loading ? t('common.loading') : t('openclaw.overviewRefresh') }}
            </UiButton>
          </div>
        </UiCardHeader>
        <UiCardContent v-if="listError" class="text-destructive text-sm">
          {{ listError }}
        </UiCardContent>
        <UiCardContent v-else-if="actionMsg" class="text-muted-foreground text-sm">
          {{ actionMsg }}
        </UiCardContent>
      </UiCard>

      <div v-if="!selectedAgent && !loading && agents.length === 0" class="text-muted-foreground text-sm">
        {{ t('openclaw.agentsSelectAgent') }}
      </div>

      <template v-else-if="selectedAgent">
        <div class="flex flex-wrap gap-1 border-b border-border pb-0">
          <UiButton
            v-for="tab in tabs"
            :key="tab.id"
            size="sm"
            :variant="panel === tab.id ? 'secondary' : 'ghost'"
            class="gap-1.5 rounded-b-none"
            @click="selectPanel(tab.id)"
          >
            <component :is="tab.icon" class="size-3.5" />
            {{ t(tab.labelKey) }}
            <UiBadge v-if="tabCount(tab.id) != null" variant="outline" class="ml-0.5 tabular-nums">
              {{ tabCount(tab.id) }}
            </UiBadge>
          </UiButton>
        </div>

        <!-- Overview：与 openclaw Control UI agents-panels-overview 完全一致（section.card 结构与样式） -->
        <section v-if="panel === 'overview'" class="agents-overview-card card rounded-xl">
          <div class="card-title">
            {{ t('openclaw.agentsOverviewTitle') }}
          </div>
          <div class="card-sub">
            {{ t('openclaw.agentsOverviewDesc') }}
          </div>

          <div v-if="overviewCfgErr && !configForm" class="agents-overview-err">
            {{ overviewCfgErr }}
          </div>
          <div v-else-if="overviewCfgLoading && !overviewUi" class="agents-overview-loading">
            {{ t('common.loading') }}
          </div>
          <template v-else-if="overviewUi">
            <div class="agents-overview-grid">
              <div class="agent-kv">
                <div class="label">
                  {{ t('openclaw.agentsWorkspace') }}
                </div>
                <div>
                  <button
                    type="button"
                    class="workspace-link mono"
                    title="Open Files tab"
                    @click="openFilesFromOverview"
                  >
                    {{ overviewUi.workspace }}
                  </button>
                </div>
              </div>
              <div class="agent-kv">
                <div class="label">
                  {{ t('openclaw.agentsPrimaryModelKv') }}
                </div>
                <div class="mono">
                  {{ overviewUi.primaryDisplay }}
                </div>
              </div>
              <div class="agent-kv">
                <div class="label">
                  {{ t('openclaw.agentsSkillsFilterKv') }}
                </div>
                <div>{{ overviewUi.skillsLabel }}</div>
              </div>
            </div>

            <div v-if="overviewCfgDirty" class="callout warn rounded-md">
              {{ t('openclaw.agentsUnsavedConfig') }}
            </div>

            <div class="agent-model-select">
              <div class="label">
                {{ t('openclaw.agentsModelSelection') }}
              </div>
              <div class="agent-model-fields">
                <label class="field">
                  <span>{{
                    overviewUi.isDefault
                      ? t('openclaw.agentsPrimaryModelDefault')
                      : t('openclaw.agentsPrimaryModelAgent')
                  }}</span>
                  <select
                    class="rounded-md"
                    :value="
                      !overviewUi.isDefault && !overviewUi.selectValue
                        ? '__inherit__'
                        : overviewUi.selectValue
                    "
                    :disabled="overviewUi.cfgDisabled"
                    @change="
                      onOverviewPrimaryChange(
                        (($event.target as HTMLSelectElement).value === '__inherit__'
                          ? ''
                          : ($event.target as HTMLSelectElement).value),
                      )
                    "
                  >
                    <option v-if="!overviewUi.isDefault" value="__inherit__">
                      {{
                        overviewUi.defaultPrimary
                          ? t('openclaw.agentsPrimaryInherit', {
                            m: overviewUi.defaultPrimary,
                          })
                          : t('openclaw.agentsPrimaryInheritBare')
                      }}
                    </option>
                    <option
                      v-for="o in overviewUi.modelOptions"
                      :key="o.value"
                      :value="o.value"
                    >
                      {{ o.label }}
                    </option>
                    <option
                      v-if="overviewUi.isDefault && overviewUi.modelOptions.length === 0"
                      disabled
                      value="__none__"
                    >
                      {{ t('openclaw.agentsNoConfiguredModels') }}
                    </option>
                  </select>
                </label>
                <div class="field">
                  <span>{{ t('openclaw.agentsFallbacks') }}</span>
                  <UiInput
                    v-model="fallbacksInput"
                    class="w-full"
                    placeholder="provider/model"
                    :disabled="overviewUi.cfgDisabled"
                    @blur="onFallbacksBlur"
                  />
                </div>
              </div>
              <div class="agent-model-actions">
                <button
                  type="button"
                  class="btn btn--sm rounded-md"
                  :disabled="overviewCfgLoading"
                  @click="reloadOverviewConfig"
                >
                  {{ t('openclaw.agentsReloadConfig') }}
                </button>
                <button
                  type="button"
                  class="btn btn--sm primary rounded-md"
                  :disabled="overviewCfgSaving || !overviewCfgDirty || !configHash"
                  @click="saveOverviewConfig"
                >
                  {{ overviewCfgSaving ? t('openclaw.agentsSaving') : t('openclaw.agentsSaveConfig') }}
                </button>
              </div>
            </div>
          </template>
        </section>

        <!-- Files：Core Files + 编辑器（对齐 Control UI agents-panels-status-files） -->
        <UiCard v-if="panel === 'files'" class="shadow-sm">
          <UiCardHeader class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <UiCardTitle class="text-base">
                {{ t('openclaw.agentsCoreFilesTitle') }}
              </UiCardTitle>
              <UiCardDescription>{{ t('openclaw.agentsCoreFilesDesc') }}</UiCardDescription>
            </div>
            <UiButton
              size="sm"
              variant="outline"
              class="shrink-0 gap-1"
              :disabled="filesLoading || !selectedId"
              @click="selectedId && loadFiles(selectedId)"
            >
              <RefreshCw class="size-3.5" :class="{ 'animate-spin': filesLoading }" />
              {{ filesLoading ? t('common.loading') : t('openclaw.overviewRefresh') }}
            </UiButton>
          </UiCardHeader>
          <UiCardContent class="space-y-4">
            <div
              v-if="filesList?.agentId === selectedId && filesList.workspace"
              class="text-muted-foreground font-mono text-sm"
            >
              {{ t('openclaw.agentsWorkspaceColon') }}{{ filesList.workspace }}
            </div>
            <div v-if="filesErr" class="text-destructive text-sm">
              {{ filesErr }}
            </div>
            <div
              v-else-if="filesLoading || !filesList || filesList.agentId !== selectedId"
              class="text-muted-foreground py-8 text-center text-sm"
            >
              {{ t('common.loading') }}
            </div>
            <div
              v-else
              class="grid min-h-[320px] gap-4 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]"
            >
              <div class="flex min-h-0 flex-col gap-1 overflow-y-auto pr-1">
                <div
                  v-if="!workspaceFiles.length"
                  class="text-muted-foreground py-6 text-center text-sm"
                >
                  {{ t('openclaw.agentsNoWorkspaceFiles') }}
                </div>
                <button
                  v-for="f in workspaceFiles"
                  :key="f.name"
                  type="button"
                  class="flex w-full flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors"
                  :class="
                    activeFile === f.name
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/60 border-border'
                  "
                  @click="onSelectFile(f.name)"
                >
                  <span class="font-mono text-sm font-medium">{{ f.name }}</span>
                  <span class="text-muted-foreground text-xs">{{ fileRowMeta(f) }}</span>
                  <UiBadge v-if="f.missing" variant="destructive" class="mt-1 text-[10px]">
                    {{
                      t('openclaw.agentsFileMissing')
                    }}
                  </UiBadge>
                </button>
              </div>
              <div
                class="border-border bg-muted/20 flex min-h-[280px] min-w-0 flex-col rounded-lg border"
              >
                <template v-if="!activeFile">
                  <div class="text-muted-foreground flex flex-1 items-center justify-center p-6 text-sm">
                    {{ t('openclaw.agentsSelectFileEdit') }}
                  </div>
                </template>
                <template v-else-if="activeFileEntry?.missing">
                  <div class="text-destructive p-4 text-sm">
                    {{ t('openclaw.agentsFileMissing') }}
                  </div>
                </template>
                <template v-else>
                  <div
                    class="border-b px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div class="min-w-0">
                      <div class="font-mono text-sm font-medium">
                        {{ activeFile }}
                      </div>
                      <div v-if="activeFileEntry?.path" class="text-muted-foreground truncate font-mono text-xs">
                        {{ activeFileEntry.path }}
                      </div>
                    </div>
                    <div class="flex flex-wrap gap-1">
                      <UiButton size="sm" variant="outline" class="gap-1" @click="filePreviewOpen = true">
                        <Eye class="size-3.5" />
                        {{ t('openclaw.agentsFilePreview') }}
                      </UiButton>
                      <UiButton
                        size="sm"
                        variant="outline"
                        :disabled="!fileEditorDirty"
                        @click="resetFileEditor"
                      >
                        {{ t('openclaw.agentsFileReset') }}
                      </UiButton>
                      <UiButton
                        size="sm"
                        :disabled="fileSaving || !fileEditorDirty"
                        @click="saveAgentWorkspaceFile"
                      >
                        {{ fileSaving ? t('common.loading') : t('openclaw.agentsFileSave') }}
                      </UiButton>
                    </div>
                  </div>
                  <div v-if="fileLoading" class="text-muted-foreground flex flex-1 items-center p-4 text-sm">
                    {{ t('common.loading') }}
                  </div>
                  <textarea
                    v-else
                    v-model="fileEditorDraft"
                    class="border-0 bg-transparent min-h-[240px] w-full flex-1 resize-y p-3 font-mono text-sm outline-none focus-visible:ring-0"
                    spellcheck="false"
                  />
                </template>
              </div>
            </div>
          </UiCardContent>
        </UiCard>

        <UiDialog :open="filePreviewOpen" @update:open="filePreviewOpen = $event">
          <UiDialogContent class="max-h-[85vh] max-w-3xl overflow-hidden sm:max-w-3xl">
            <UiDialogHeader>
              <UiDialogTitle class="font-mono">
                {{ activeFile || 'Preview' }}
              </UiDialogTitle>
              <UiDialogDescription class="sr-only">
                Markdown / text preview
              </UiDialogDescription>
            </UiDialogHeader>
            <pre
              class="bg-muted/50 max-h-[60vh] overflow-auto rounded-md p-4 font-mono text-xs whitespace-pre-wrap break-words"
            >{{ fileEditorDraft }}</pre>
          </UiDialogContent>
        </UiDialog>

        <!-- Tools：Tool Access（对齐 Control UI agents-panels-tools-skills） -->
        <UiCard v-if="panel === 'tools'" class="shadow-sm">
          <UiCardHeader class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <UiCardTitle class="text-base">
                {{ t('openclaw.agentsToolAccessTitle') }}
              </UiCardTitle>
              <UiCardDescription>
                {{ t('openclaw.agentsToolAccessDesc') }}
                <template v-if="toolAccessView.state === 'ready'">
                  <span class="text-foreground ml-1 font-mono">{{ toolAccessView.ctx.enabledCount }}/{{ toolAccessView.ctx.toolIds.length }}</span>
                  {{ t('openclaw.agentsToolAccessEnabledSuffix') }}
                </template>
              </UiCardDescription>
            </div>
            <div class="flex flex-wrap gap-2">
              <UiButton
                size="sm"
                variant="outline"
                :disabled="toolAccessView.state !== 'ready' || !toolAccessView.ctx.editable"
                @click="onToolsEnableAll"
              >
                {{ t('openclaw.agentsToolEnableAll') }}
              </UiButton>
              <UiButton
                size="sm"
                variant="outline"
                :disabled="toolAccessView.state !== 'ready' || !toolAccessView.ctx.editable"
                @click="onToolsDisableAll"
              >
                {{ t('openclaw.agentsToolDisableAll') }}
              </UiButton>
              <UiButton
                size="sm"
                variant="outline"
                :disabled="overviewCfgLoading"
                @click="reloadToolsConfig"
              >
                {{ t('openclaw.agentsReloadConfig') }}
              </UiButton>
              <UiButton
                size="sm"
                :disabled="overviewCfgSaving || !overviewCfgDirty || !configHash"
                @click="saveOverviewConfig"
              >
                {{
                  overviewCfgSaving ? t('common.loading') : t('openclaw.agentsSaveConfig')
                }}
              </UiButton>
            </div>
          </UiCardHeader>
          <UiCardContent class="space-y-4">
            <div v-if="toolAccessView.state === 'loading'" class="text-muted-foreground text-sm">
              {{ t('common.loading') }}
            </div>
            <UiAlert v-else-if="toolAccessView.state === 'need_config'" variant="secondary" class="text-sm">
              {{ t('openclaw.agentsToolAccessNeedConfig') }}
            </UiAlert>
            <template v-else-if="toolAccessView.state === 'ready'">
              <UiAlert v-if="toolAccessView.ctx.hasAgentAllow" variant="secondary" class="text-sm">
                {{ t('openclaw.agentsToolAccessAllowlistAgent') }}
              </UiAlert>
              <UiAlert v-if="toolAccessView.ctx.hasGlobalAllow" variant="secondary" class="text-sm">
                {{ t('openclaw.agentsToolAccessGlobalAllow') }}
              </UiAlert>
              <UiAlert
                v-if="toolsLoading && !toolsRes?.groups?.length && !toolsErr"
                variant="secondary"
                class="text-sm"
              >
                {{ t('openclaw.agentsToolCatalogLoading') }}
              </UiAlert>
              <UiAlert v-if="toolsErr" variant="secondary" class="text-sm">
                {{ t('openclaw.agentsToolCatalogFallback') }}
              </UiAlert>
              <div
                class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"
              >
                <div>
                  <div class="text-muted-foreground mb-0.5 text-xs">
                    {{ t('openclaw.agentsToolProfile') }}
                  </div>
                  <div class="font-mono">
                    {{ toolAccessView.ctx.profile }}
                  </div>
                </div>
                <div>
                  <div class="text-muted-foreground mb-0.5 text-xs">
                    {{ t('openclaw.agentsToolProfileSource') }}
                  </div>
                  <div>{{ profileSourceLabel(toolAccessView.ctx.profileSource, t) }}</div>
                </div>
                <div v-if="overviewCfgDirty">
                  <div class="text-muted-foreground mb-0.5 text-xs">
                    {{ t('openclaw.status') }}
                  </div>
                  <div class="font-mono">
                    {{ t('openclaw.agentsToolUnsaved') }}
                  </div>
                </div>
              </div>
              <div>
                <div class="text-muted-foreground mb-2 text-xs font-medium">
                  {{ t('openclaw.agentsToolQuickPresets') }}
                </div>
                <div class="flex flex-wrap gap-2">
                  <UiButton
                    v-for="opt in toolAccessView.ctx.profileOptions"
                    :key="opt.id"
                    size="sm"
                    :variant="toolAccessView.ctx.profile === opt.id ? 'default' : 'outline'"
                    :disabled="!toolAccessView.ctx.editable"
                    @click="onToolsProfileChange(opt.id, true)"
                  >
                    {{ opt.label }}
                  </UiButton>
                  <UiButton
                    size="sm"
                    variant="outline"
                    :disabled="!toolAccessView.ctx.editable"
                    @click="onToolsProfileChange(null, false)"
                  >
                    {{ t('openclaw.agentsToolInherit') }}
                  </UiButton>
                </div>
              </div>
              <div v-if="overviewCfgErr" class="text-destructive text-sm">
                {{ overviewCfgErr }}
              </div>
              <div class="space-y-6">
                <div v-for="g in toolAccessView.ctx.sections" :key="g.id">
                  <h3 class="text-muted-foreground mb-2 flex flex-wrap items-center gap-2 text-sm font-medium">
                    {{ g.label || g.id }}
                    <UiBadge v-if="g.pluginId" variant="outline" class="font-mono text-[10px]">
                      plugin:{{ g.pluginId }}
                    </UiBadge>
                    <UiBadge variant="outline">
                      {{ g.tools?.length ?? 0 }}
                    </UiBadge>
                  </h3>
                  <ul class="divide-border m-0 list-none divide-y rounded-lg border p-0 text-sm">
                    <li
                      v-for="tool in g.tools ?? []"
                      :key="tool.id"
                      class="flex items-start justify-between gap-3 px-3 py-2"
                    >
                      <div class="min-w-0 flex-1">
                        <div class="font-mono text-sm font-medium">
                          {{ tool.label || tool.id }}
                        </div>
                        <div v-if="tool.description" class="text-muted-foreground text-xs">
                          {{ tool.description }}
                        </div>
                      </div>
                      <UiSwitch
                        :checked="toolAccessView.ctx.resolveAllowed(tool.id).allowed"
                        :disabled="!toolAccessView.ctx.editable"
                        @update:checked="(v: boolean) => onToolAccessToggle(tool.id, v)"
                      />
                    </li>
                  </ul>
                </div>
              </div>
            </template>
          </UiCardContent>
        </UiCard>

        <!-- Skills：与 openclaw Control UI agents-panels-tools-skills 完全一致 -->
        <section v-if="panel === 'skills'" class="agents-skills-card card rounded-xl">
          <div class="agents-skills-header-row">
            <div>
              <div class="card-title">
                {{ t('openclaw.agentsSkillsTitle') }}
              </div>
              <div class="card-sub">
                {{ t('openclaw.agentsSkillsDesc') }}
                <span
                  v-if="skillsUi.totalCount > 0"
                  class="agents-skills-count"
                >{{ skillsUi.enabledCount }}/{{ skillsUi.totalCount }}</span>
              </div>
            </div>
            <div class="agents-skills-actions">
              <div class="agents-skills-btn-group">
                <UiButton
                  size="sm"
                  variant="outline"
                  class="rounded-md"
                  :disabled="!skillsUi.editable"
                  @click="onSkillsClear"
                >
                  {{ t('openclaw.agentsSkillsEnableAll') }}
                </UiButton>
                <UiButton
                  size="sm"
                  variant="outline"
                  class="rounded-md"
                  :disabled="!skillsUi.editable"
                  @click="onSkillsDisableAll"
                >
                  {{ t('openclaw.agentsSkillsDisableAll') }}
                </UiButton>
                <UiButton
                  size="sm"
                  variant="outline"
                  class="rounded-md"
                  :disabled="!skillsUi.editable || !skillsUi.usingAllowlist"
                  :title="t('openclaw.agentsSkillsReset')"
                  @click="onSkillsClear"
                >
                  {{ t('openclaw.agentsSkillsReset') }}
                </UiButton>
              </div>
              <UiButton
                size="sm"
                variant="outline"
                class="rounded-md"
                :disabled="overviewCfgLoading"
                @click="reloadOverviewConfig"
              >
                {{ t('openclaw.agentsReloadConfig') }}
              </UiButton>
              <UiButton
                size="sm"
                variant="outline"
                class="rounded-md"
                :disabled="skillsLoading"
                @click="selectedId && loadSkills(selectedId)"
              >
                {{ skillsLoading ? t('common.loading') : t('openclaw.overviewRefresh') }}
              </UiButton>
              <UiButton
                size="sm"
                class="rounded-md"
                :disabled="overviewCfgSaving || !overviewCfgDirty || !configHash"
                @click="saveOverviewConfig"
              >
                {{ overviewCfgSaving ? t('openclaw.agentsSaving') : t('openclaw.agentsSaveConfig') }}
              </UiButton>
            </div>
          </div>

          <div v-if="!configForm" class="agents-skills-callout agents-skills-callout-info rounded-md">
            {{ t('openclaw.agentsSkillsLoadConfig') }}
          </div>
          <div
            v-else-if="skillsUi.usingAllowlist"
            class="agents-skills-callout agents-skills-callout-info rounded-md"
          >
            {{ t('openclaw.agentsSkillsCustomAllowlist') }}
          </div>
          <div
            v-else
            class="agents-skills-callout agents-skills-callout-info rounded-md"
          >
            {{ t('openclaw.agentsSkillsAllEnabledHint') }}
          </div>
          <div
            v-if="!skillsUi.reportReady && !skillsLoading"
            class="agents-skills-callout agents-skills-callout-info rounded-md"
          >
            {{ t('openclaw.agentsSkillsLoadForAgent') }}
          </div>
          <div v-if="skillsErr" class="agents-skills-callout agents-skills-callout-danger rounded-md">
            {{ skillsErr }}
          </div>

          <div class="agents-skills-filter-row">
            <label class="agents-skills-filter-label">
              <span class="agents-skills-filter-span">{{ t('openclaw.agentsSkillsFilterLabel') }}</span>
              <UiInput
                v-model="skillsFilter"
                class="flex-1 min-w-0 rounded-md"
                :placeholder="t('openclaw.agentsSkillsFilterPlaceholder')"
                autocomplete="off"
              />
            </label>
            <div class="text-muted-foreground text-sm">
              {{ t('openclaw.agentsSkillsShown', { n: skillsUi.filtered.length }) }}
            </div>
          </div>

          <div v-if="skillsUi.filtered.length === 0" class="text-muted-foreground mt-4 text-sm">
            {{ t('openclaw.agentsSkillsNone') }}
          </div>
          <div v-else class="agents-skills-list mt-4 space-y-2">
            <div
              v-for="s in skillsUi.filtered"
              :key="s.name"
              class="agents-skill-row flex items-start justify-between gap-4 rounded-md border border-border bg-card p-3"
            >
              <div class="min-w-0 flex-1">
                <div class="font-semibold text-sm">
                  {{ s.name }}
                </div>
                <div v-if="s.description" class="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                  {{ s.description }}
                </div>
              </div>
              <div class="flex shrink-0 items-start pt-0.5">
                <UiCheckbox
                  :checked="skillsUi.usingAllowlist ? skillsUi.allowSet.has(s.name) : true"
                  :disabled="!skillsUi.editable"
                  @update:checked="(v: boolean | 'indeterminate') => onSkillToggle(s.name, !!v)"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- Channels：与 openclaw agents-main 一致，两列 grid，左 Agent Context 右 Channels -->
        <section v-if="panel === 'channels'" class="agents-channels-grid grid grid-cols-1 gap-4 lg:grid-cols-2">
          <!-- Agent Context 卡片 -->
          <section
            v-if="channelsAgentContext"
            class="agents-overview-card card rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div class="card-title text-base font-semibold">
              {{ t('openclaw.agentsAgentContextTitle') }}
            </div>
            <div class="card-sub text-muted-foreground mt-1 text-sm">
              {{ t('openclaw.agentsAgentContextDesc') }}
            </div>
            <div class="agents-overview-grid mt-4">
              <div class="agent-kv">
                <div class="label">
                  Workspace
                </div>
                <div class="mono text-sm">
                  {{ channelsAgentContext.workspace }}
                </div>
              </div>
              <div class="agent-kv">
                <div class="label">
                  Primary Model
                </div>
                <div class="mono text-sm">
                  {{ channelsAgentContext.model }}
                </div>
              </div>
              <div class="agent-kv">
                <div class="label">
                  Identity Name
                </div>
                <div class="text-sm">
                  {{ channelsAgentContext.identityName }}
                </div>
              </div>
              <div class="agent-kv">
                <div class="label">
                  Identity Avatar
                </div>
                <div class="text-sm">
                  {{ channelsAgentContext.identityAvatar }}
                </div>
              </div>
              <div class="agent-kv">
                <div class="label">
                  Skills Filter
                </div>
                <div class="text-sm">
                  {{ channelsAgentContext.skillsLabel }}
                </div>
              </div>
              <div class="agent-kv">
                <div class="label">
                  Default
                </div>
                <div class="text-sm">
                  {{ channelsAgentContext.isDefault ? 'yes' : 'no' }}
                </div>
              </div>
            </div>
          </section>
          <!-- Channels 卡片 -->
          <section class="agents-channels-card card rounded-xl border border-border bg-card p-4 shadow-sm">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div class="card-title text-base font-semibold">
                  {{ t('openclaw.agentsChannelsTitle') }}
                </div>
                <div class="card-sub text-muted-foreground mt-1 text-sm">
                  {{ t('openclaw.agentsChannelsDesc') }}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <UiButton
                  variant="outline"
                  size="sm"
                  :disabled="channelsLoading"
                  @click="loadChannels()"
                >
                  <RefreshCw class="mr-1 size-3.5" :class="{ 'animate-spin': channelsLoading }" />
                  {{ channelsLoading ? t('openclaw.agentsChannelsRefreshing') : t('openclaw.agentsChannelsRefresh') }}
                </UiButton>
                <UiButton variant="ghost" size="sm" @click="router.push({ name: 'PluginOpenclawChannels' })">
                  <ExternalLink class="size-3.5" />
                </UiButton>
              </div>
            </div>
            <p class="text-muted-foreground mt-2 text-sm">
              {{ t('openclaw.agentsChannelsLastRefresh', { label: channelsLastSuccess ? formatAgo(channelsLastSuccess) : 'never' }) }}
            </p>
            <UiAlert v-if="channelsErr" variant="destructive" class="mt-3 text-sm">
              {{ channelsErr }}
            </UiAlert>
            <UiAlert v-else-if="!channelsSnap && !channelsLoading" variant="secondary" class="mt-3 text-sm">
              {{ t('openclaw.agentsChannelsLoadHint') }}
            </UiAlert>
            <template v-else-if="!channelsLoading">
              <p v-if="channelRows.length === 0" class="text-muted-foreground mt-4 text-sm">
                {{ t('openclaw.agentsChannelsNone') }}
              </p>
              <div v-else class="agents-channels-list mt-4 space-y-2">
                <div
                  v-for="row in channelRows"
                  :key="row.id"
                  class="agents-channels-list-item flex flex-wrap items-start justify-between gap-x-4 gap-y-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                >
                  <div class="min-w-0">
                    <div class="font-medium">
                      {{ row.label }}
                    </div>
                    <div class="mono text-muted-foreground text-xs">
                      {{ row.id }}
                    </div>
                  </div>
                  <div class="text-muted-foreground shrink-0 text-right">
                    {{ row.value }}
                  </div>
                </div>
              </div>
            </template>
          </section>
        </section>

        <!-- Cron：与 openclaw agents-main 一致，两列 grid，左 Agent Context 右 Cron jobs -->
        <section v-if="panel === 'cron'" class="agents-cron-grid grid grid-cols-1 gap-4 lg:grid-cols-2">
          <!-- Agent Context 卡片（副标题：Workspace and scheduling targets.） -->
          <section
            v-if="channelsAgentContext"
            class="agents-overview-card card rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div class="card-title text-base font-semibold">
              {{ t('openclaw.agentsAgentContextTitle') }}
            </div>
            <div class="card-sub text-muted-foreground mt-1 text-sm">
              {{ t('openclaw.agentsAgentContextDescScheduling') }}
            </div>
            <div class="agents-overview-grid mt-4">
              <div class="agent-kv">
                <div class="label">
                  Workspace
                </div>
                <div class="mono text-sm">
                  {{ channelsAgentContext.workspace }}
                </div>
              </div>
              <div class="agent-kv">
                <div class="label">
                  Primary Model
                </div>
                <div class="mono text-sm">
                  {{ channelsAgentContext.model }}
                </div>
              </div>
              <div class="agent-kv">
                <div class="label">
                  Identity Name
                </div>
                <div class="text-sm">
                  {{ channelsAgentContext.identityName }}
                </div>
              </div>
              <div class="agent-kv">
                <div class="label">
                  Identity Avatar
                </div>
                <div class="text-sm">
                  {{ channelsAgentContext.identityAvatar }}
                </div>
              </div>
              <div class="agent-kv">
                <div class="label">
                  Skills Filter
                </div>
                <div class="text-sm">
                  {{ channelsAgentContext.skillsLabel }}
                </div>
              </div>
              <div class="agent-kv">
                <div class="label">
                  Default
                </div>
                <div class="text-sm">
                  {{ channelsAgentContext.isDefault ? 'yes' : 'no' }}
                </div>
              </div>
            </div>
          </section>
          <!-- Cron jobs 卡片 -->
          <section class="agents-cron-card card rounded-xl border border-border bg-card p-4 shadow-sm">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div class="card-title text-base font-semibold">
                  {{ t('openclaw.agentsCronTitle') }}
                </div>
                <div class="card-sub text-muted-foreground mt-1 text-sm">
                  {{ t('openclaw.agentsCronDesc') }}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <UiButton
                  variant="outline"
                  size="sm"
                  :disabled="cronLoading"
                  @click="loadCron()"
                >
                  <RefreshCw class="mr-1 size-3.5" :class="{ 'animate-spin': cronLoading }" />
                  {{ cronLoading ? t('openclaw.agentsChannelsRefreshing') : t('openclaw.agentsChannelsRefresh') }}
                </UiButton>
                <UiButton variant="outline" size="sm" @click="router.push({ name: 'PluginOpenclawCron' })">
                  {{ t('openclaw.agentsCronFullPage') }}
                  <ExternalLink class="ml-1 size-3.5" />
                </UiButton>
              </div>
            </div>
            <UiAlert v-if="cronErr" variant="destructive" class="mt-3 text-sm">
              {{ cronErr }}
            </UiAlert>
            <p v-else-if="cronLoading" class="text-muted-foreground mt-3 text-sm">
              {{ t('common.loading') }}
            </p>
            <template v-else>
              <p v-if="!agentCronJobs.length" class="text-muted-foreground mt-4 text-sm">
                {{ t('openclaw.agentsCronEmpty') }}
              </p>
              <UiTable v-else class="mt-4">
                <UiTableHeader>
                  <UiTableRow>
                    <UiTableHead>{{ t('openclaw.agentsCronName') }}</UiTableHead>
                    <UiTableHead>{{ t('openclaw.status') }}</UiTableHead>
                    <UiTableHead>{{ t('openclaw.cronColNext') }}</UiTableHead>
                  </UiTableRow>
                </UiTableHeader>
                <UiTableBody>
                  <UiTableRow v-for="j in agentCronJobs" :key="j.id">
                    <UiTableCell class="font-medium">
                      {{ j.name || j.id }}
                    </UiTableCell>
                    <UiTableCell>
                      <UiBadge :variant="j.enabled ? 'default' : 'secondary'">
                        {{
                          j.enabled ? t('openclaw.cronYes') : t('openclaw.cronNo')
                        }}
                      </UiBadge>
                    </UiTableCell>
                    <UiTableCell class="text-muted-foreground text-xs">
                      {{
                        j.state?.nextRunAtMs != null
                          ? formatMs(j.state.nextRunAtMs)
                          : t('openclaw.overviewNone')
                      }}
                    </UiTableCell>
                  </UiTableRow>
                </UiTableBody>
              </UiTable>
            </template>
          </section>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
/* 与 openclaw Control UI agents-panels-overview / components.css 完全一致的卡片样式 */
/* 圆角由 Tailwind rounded-xl 提供，与主内容区、其他卡片一致，使用系统 --radius-xl */
.agents-overview-card.card {
  border: 1px solid var(--border);
  background: var(--card);
  padding: 18px;
  box-shadow: var(--shadow-sm, 0 1px 2px 0 rgb(0 0 0 / 0.05));
}
.card-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--card-foreground, var(--foreground));
}
.card-sub {
  color: var(--muted-foreground);
  font-size: 13px;
  margin-top: 6px;
  line-height: 1.5;
}
.agents-overview-err {
  color: var(--destructive);
  font-size: 13px;
  margin-top: 16px;
}
.agents-overview-loading {
  color: var(--muted-foreground);
  font-size: 13px;
  margin-top: 16px;
}
.agents-overview-grid {
  margin-top: 16px;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
.agent-kv {
  display: grid;
  gap: 6px;
  min-width: 0;
}
.agent-kv > div {
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.agent-kv .label {
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 500;
}
.workspace-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: var(--primary);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  padding: 2px 0;
  cursor: pointer;
  word-break: break-all;
  text-align: left;
}
.workspace-link:hover {
  opacity: 0.85;
  text-decoration: underline;
}
.mono {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
}
.callout.warn {
  margin-top: 16px;
  padding: 14px 16px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  font-size: 13px;
  line-height: 1.5;
  color: var(--warning-foreground, #b45309);
}
.agent-model-select {
  margin-top: 20px;
  display: grid;
  gap: 10px;
}
.agent-model-select > .label {
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 500;
}
.agent-model-fields {
  display: grid;
  gap: 10px;
}
.agent-model-fields .field {
  display: grid;
  gap: 6px;
}
.agent-model-fields .field span {
  color: var(--muted-foreground);
  font-size: 13px;
  font-weight: 500;
}
.agent-model-fields .field input,
.agent-model-fields .field select {
  border: 1px solid var(--border);
  background: var(--card);
  padding: 8px 12px;
  outline: none;
  font-size: 13px;
}
.agent-model-fields .field select {
  appearance: none;
  padding-right: 36px;
  cursor: pointer;
}
.agent-model-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.agent-model-actions .btn {
  border: 1px solid var(--border);
  background: var(--background);
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.agent-model-actions .btn:hover:not(:disabled) {
  background: var(--muted);
}
.agent-model-actions .btn.primary {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--primary-foreground);
}
.agent-model-actions .btn.primary:hover:not(:disabled) {
  opacity: 0.9;
}
.agent-model-actions .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Skills 面板：与 openclaw agents-panels-tools-skills 一致 */
.agents-skills-card.card {
  border: 1px solid var(--border);
  background: var(--card);
  padding: 18px;
  box-shadow: var(--shadow-sm, 0 1px 2px 0 rgb(0 0 0 / 0.05));
}
.agents-skills-header-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.agents-skills-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.agents-skills-btn-group {
  display: flex;
  gap: 4px;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.agents-skills-count {
  font-family: var(--font-mono, ui-monospace, monospace);
  margin-left: 4px;
}
.agents-skills-callout {
  margin-top: 12px;
  padding: 14px 16px;
  font-size: 13px;
  line-height: 1.5;
}
.agents-skills-callout-info {
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.25);
  color: var(--primary);
}
.agents-skills-callout-danger {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: var(--destructive);
}
.agents-skills-filter-row {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.agents-skills-filter-label {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}
.agents-skills-filter-span {
  color: var(--muted-foreground);
  font-size: 13px;
  font-weight: 500;
}
</style>
