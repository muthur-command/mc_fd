<script setup lang="ts">
import type { Component, ComputedRef, Ref } from 'vue'

/**
 * 配置页：与 openclaw Control UI config 完全一致（actions bar、section tabs、Form/Raw、diff、content）
 */
import {
  AppWindow,
  BarChart3,
  Brain,
  Check,
  ChevronDown,
  Cpu,
  FileText,
  Globe,
  Image as ImageLucide,
  Layers,
  LayoutTemplate,
  Link2,
  MessagesSquare,
  Minus,
  Monitor,
  Moon,
  Network,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Server,
  Sun,
  Upload,
  Workflow,
  Wrench,
  Zap,
} from 'lucide-vue-next'
import {

  computed,
  inject,
  onMounted,
  ref,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import { RPC } from '@/plugin/openclaw/lib/rpc-methods'

const { t, locale } = useI18n()
const route = useRoute()
const gateway = inject<
  ReturnType<typeof import('@/plugin/openclaw/composables/use-openclaw-gateway').useOpenClawGateway>
>('openclaw-gateway')!
const ocConfig = inject<ReturnType<typeof import('@/plugin/openclaw/composables/use-openclaw-config').useOpenClawConfig>>(
  'openclaw-config',
)!

/** 与 OpenClaw Control UI `ui/src/ui/storage.ts` 一致，便于与独立 Control UI 共享主题偏好 */
const OPENCLAW_CONTROL_SETTINGS_KEY = 'openclaw.control.settings.v1'
type OcThemeName = 'claw' | 'knot' | 'dash'
type OcThemeMode = 'system' | 'light' | 'dark'
const VALID_OC_THEME = new Set<OcThemeName>(['claw', 'knot', 'dash'])
const VALID_OC_MODE = new Set<OcThemeMode>(['system', 'light', 'dark'])
const OC_THEME_LEGACY: Record<string, { theme: OcThemeName, themeMode: OcThemeMode }> = {
  defaultTheme: { theme: 'claw', themeMode: 'dark' },
  docsTheme: { theme: 'claw', themeMode: 'light' },
  lightTheme: { theme: 'knot', themeMode: 'dark' },
  landingTheme: { theme: 'knot', themeMode: 'dark' },
  newTheme: { theme: 'knot', themeMode: 'dark' },
  dark: { theme: 'claw', themeMode: 'dark' },
  light: { theme: 'claw', themeMode: 'light' },
  openknot: { theme: 'knot', themeMode: 'dark' },
  fieldmanual: { theme: 'dash', themeMode: 'dark' },
  clawdash: { theme: 'dash', themeMode: 'light' },
  system: { theme: 'claw', themeMode: 'system' },
}

function parseOcThemeSelection(themeRaw: unknown, modeRaw: unknown): { theme: OcThemeName, themeMode: OcThemeMode } {
  const theme = typeof themeRaw === 'string' ? themeRaw : ''
  const mode = typeof modeRaw === 'string' ? modeRaw : ''
  const normalizedTheme = VALID_OC_THEME.has(theme as OcThemeName)
    ? (theme as OcThemeName)
    : (OC_THEME_LEGACY[theme]?.theme ?? 'claw')
  const normalizedMode = VALID_OC_MODE.has(mode as OcThemeMode)
    ? (mode as OcThemeMode)
    : (OC_THEME_LEGACY[theme]?.themeMode ?? 'system')
  return { theme: normalizedTheme, themeMode: normalizedMode }
}

function loadOcControlThemeFromStorage(): { theme: OcThemeName, themeMode: OcThemeMode } {
  try {
    const raw = localStorage.getItem(OPENCLAW_CONTROL_SETTINGS_KEY)
    if (!raw)
      return { theme: 'claw', themeMode: 'system' }
    const parsed = JSON.parse(raw) as { theme?: unknown, themeMode?: unknown }
    return parseOcThemeSelection(parsed.theme, parsed.themeMode)
  }
  catch {
    return { theme: 'claw', themeMode: 'system' }
  }
}

function persistOcControlTheme(theme: OcThemeName, themeMode: OcThemeMode) {
  try {
    const raw = localStorage.getItem(OPENCLAW_CONTROL_SETTINGS_KEY)
    const parsed: Record<string, unknown> = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    parsed.theme = theme
    parsed.themeMode = themeMode
    localStorage.setItem(OPENCLAW_CONTROL_SETTINGS_KEY, JSON.stringify(parsed))
  }
  catch {
    /* best-effort */
  }
}

const ocControlTheme = ref<OcThemeName>('claw')
const ocControlThemeMode = ref<OcThemeMode>('system')

function refreshOcControlThemeFromStorage() {
  const next = loadOcControlThemeFromStorage()
  ocControlTheme.value = next.theme
  ocControlThemeMode.value = next.themeMode
}

function setOcControlTheme(next: OcThemeName) {
  if (next === ocControlTheme.value)
    return
  ocControlTheme.value = next
  persistOcControlTheme(ocControlTheme.value, ocControlThemeMode.value)
}

function setOcControlThemeMode(next: OcThemeMode) {
  if (next === ocControlThemeMode.value)
    return
  ocControlThemeMode.value = next
  persistOcControlTheme(ocControlTheme.value, ocControlThemeMode.value)
}

const appearanceGatewayWsUrl = computed(() => {
  const u = ocConfig.config.value?.wsUrl
  return typeof u === 'string' && u.trim() ? u.trim() : '-'
})

const appearanceThemeOptions = [
  { id: 'claw' as const, icon: Zap },
  { id: 'knot' as const, icon: Link2 },
  { id: 'dash' as const, icon: BarChart3 },
]

const appearanceModeOptions = [
  { id: 'system' as const, icon: Monitor },
  { id: 'light' as const, icon: Sun },
  { id: 'dark' as const, icon: Moon },
]

interface ConfigSnapshot {
  path?: string | null
  exists?: boolean | null
  raw?: string | null
  hash?: string | null
  config?: Record<string, unknown> | null
  valid?: boolean | null
  issues?: Array<{ path: string, message: string }> | null
}

/**
 * 主 Config 页（/config）内分区 Tab —— 对齐 OpenClaw `excludeSections` 后的 config 视图。
 * 其它设置子路由（Communication / Appearance / …）使用另一套 `includeSections` Tab，见 `settingsSubPage`。
 */
const SECTION_TABS_MAIN: Array<{ key: string | null, label: string }> = [
  { key: null, label: 'Settings' },
  { key: 'env', label: 'Environment' },
  { key: 'auth', label: 'Authentication' },
  { key: 'update', label: 'Updates' },
  { key: 'meta', label: 'Meta' },
  { key: 'logging', label: 'Logging' },
  { key: 'diagnostics', label: 'Diagnostics' },
  { key: 'cli', label: 'Cli' },
  { key: 'secrets', label: 'Secrets' },
  { key: 'acp', label: 'Acp' },
]

/** 与 OpenClaw `ui/src/ui/app-render.ts` 中各 Tab 的 `includeSections` 一致 */
const COMMUNICATION_SECTION_KEYS = ['channels', 'messages', 'broadcast', 'talk', 'audio'] as const
const APPEARANCE_SECTION_KEYS = ['__appearance__', 'ui', 'wizard'] as const
const AUTOMATION_SECTION_KEYS = [
  'commands',
  'hooks',
  'bindings',
  'cron',
  'approvals',
  'plugins',
] as const
const INFRASTRUCTURE_SECTION_KEYS = [
  'gateway',
  'web',
  'browser',
  'nodeHost',
  'canvasHost',
  'discovery',
  'media',
] as const
const AI_AGENTS_SECTION_KEYS = ['agents', 'models', 'skills', 'tools', 'memory', 'session'] as const

type SettingsSubPage = 'main' | 'communications' | 'appearance' | 'automation' | 'infrastructure' | 'aiAgents'

/** OpenClaw `topTabs` 首项：`{ key: null, label: navRootLabel }`（如 Communication、Appearance） */
interface SatelliteRootTab { key: null, labelKey: string }
interface SatelliteSectionTab { key: string, labelKey: string }
type VisibleSectionTab = (typeof SECTION_TABS_MAIN)[number] | SatelliteRootTab | SatelliteSectionTab

/** 与各设置子页 `navRootLabel`（app-render.ts）一致 */
const SATELLITE_NAV_ROOT_KEYS: Record<Exclude<SettingsSubPage, 'main'>, string> = {
  communications: 'openclaw.configNavRoot.communication',
  appearance: 'openclaw.configNavRoot.appearance',
  automation: 'openclaw.configNavRoot.automation',
  infrastructure: 'openclaw.configNavRoot.infrastructure',
  aiAgents: 'openclaw.configNavRoot.aiAgents',
}

const settingsSubPage = computed<SettingsSubPage>(() => {
  const cs = route.meta.configSection
  if (cs === 'communications')
    return 'communications'
  if (cs === 'appearance')
    return 'appearance'
  if (cs === 'automation')
    return 'automation'
  if (cs === 'infrastructure')
    return 'infrastructure'
  if (cs === 'aiAgents')
    return 'aiAgents'
  return 'main'
})

function satelliteSectionTabs(page: Exclude<SettingsSubPage, 'main'>): SatelliteSectionTab[] {
  const keys
    = page === 'communications'
      ? COMMUNICATION_SECTION_KEYS
      : page === 'appearance'
        ? APPEARANCE_SECTION_KEYS
        : page === 'automation'
          ? AUTOMATION_SECTION_KEYS
          : page === 'infrastructure'
            ? INFRASTRUCTURE_SECTION_KEYS
            : AI_AGENTS_SECTION_KEYS
  return keys.map(key => ({
    key,
    labelKey:
      key === '__appearance__'
        ? 'openclaw.configSchemaSection.appearanceRoot'
        : `openclaw.configSchemaSection.${key}`,
  }))
}

const snapshot = ref<ConfigSnapshot | null>(null)
const loading = ref(false)
const saving = ref(false)
const formMode = ref<'form' | 'raw'>('form')
/** 当前编辑分区：主 Config 页含 `null` = Settings；子设置页为对应 schema 顶级键（如 channels、gateway）。 */
const activeSection = ref<string | null>(null)

watch(
  settingsSubPage,
  (page) => {
    if (page === 'main') {
      activeSection.value = 'update'
      return
    }
    /** 与 OpenClaw 一致：默认选中根 Tab（key null，如 Communication），再选子分区 */
    activeSection.value = null
  },
  { immediate: true },
)
const rawInput = ref('')
const configPath = ref<string | null>(null)

/** 表单模式下的可编辑副本（与网关 snapshot 分离，便于 diff / Save） */
const draftConfig = ref<Record<string, unknown> | null>(null)

const appearanceAssistantName = computed(() => {
  const ui = draftConfig.value?.ui
  if (!ui || typeof ui !== 'object')
    return ''
  const a = (ui as Record<string, unknown>).assistant
  if (!a || typeof a !== 'object')
    return ''
  const n = (a as Record<string, unknown>).name
  return typeof n === 'string' && n.trim() ? n.trim() : ''
})

onMounted(() => {
  refreshOcControlThemeFromStorage()
})

watch(
  () => [settingsSubPage.value, activeSection.value] as const,
  () => {
    if (
      settingsSubPage.value === 'appearance'
      && (activeSection.value === '__appearance__' || activeSection.value === null)
    ) {
      refreshOcControlThemeFromStorage()
    }
  },
)

const baseHash = computed(() => snapshot.value?.hash ?? '')

const originalRaw = ref('')
const hasRawChanges = computed(() => rawInput.value !== originalRaw.value)

function cloneConfig(obj: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!obj || typeof obj !== 'object')
    return {}
  try {
    return JSON.parse(JSON.stringify(obj)) as Record<string, unknown>
  }
  catch {
    return {}
  }
}

function resetDraftFromSnapshot(s: ConfigSnapshot | null) {
  draftConfig.value = cloneConfig(s?.config ?? undefined)
}

function setFromSnapshot(s: ConfigSnapshot | null) {
  if (!s) {
    originalRaw.value = ''
    rawInput.value = ''
    return
  }
  const raw
    = typeof s.raw === 'string' && s.raw
      ? s.raw
      : s.config
        ? JSON.stringify(s.config, null, 2)
        : '{}'
  originalRaw.value = raw
  if (formMode.value === 'raw') {
    rawInput.value = raw
  }
}

const formValue = computed(() => {
  if (formMode.value === 'raw') {
    try {
      return JSON.parse(rawInput.value || '{}') as Record<string, unknown>
    }
    catch {
      return null
    }
  }
  return draftConfig.value
})

const originalFormValue = computed(() => {
  try {
    return JSON.parse(originalRaw.value || '{}') as Record<string, unknown>
  }
  catch {
    return null
  }
})

function computeDiff(
  orig: Record<string, unknown> | null,
  curr: Record<string, unknown> | null,
): Array<{ path: string, from: unknown, to: unknown }> {
  if (!orig || !curr)
    return []
  const changes: Array<{ path: string, from: unknown, to: unknown }> = []
  function compare(o: unknown, c: unknown, path: string) {
    if (o === c)
      return
    if (typeof o !== typeof c || (typeof o === 'object' && (o === null || c === null))) {
      changes.push({ path, from: o, to: c })
      return
    }
    if (typeof o !== 'object' || Array.isArray(o) || Array.isArray(c)) {
      if (JSON.stringify(o) !== JSON.stringify(c))
        changes.push({ path, from: o, to: c })
      return
    }
    const oo = o as Record<string, unknown>
    const cc = c as Record<string, unknown>
    const keys = new Set([...Object.keys(oo), ...Object.keys(cc)])
    for (const k of keys) compare(oo[k], cc[k], path ? `${path}.${k}` : k)
  }
  compare(orig, curr, '')
  return changes
}

const diff = computed(() =>
  formMode.value === 'form'
    ? computeDiff(originalFormValue.value, formValue.value)
    : [],
)
const hasChanges = computed(() =>
  formMode.value === 'form' ? diff.value.length > 0 : hasRawChanges.value,
)
const canSave = computed(
  () => Boolean(gateway?.connected) && !saving.value && hasChanges.value,
)

const visibleTabs = computed((): VisibleSectionTab[] => {
  if (settingsSubPage.value === 'main')
    return SECTION_TABS_MAIN
  const page = settingsSubPage.value
  const root: SatelliteRootTab = {
    key: null,
    labelKey: SATELLITE_NAV_ROOT_KEYS[page],
  }
  return [root, ...satelliteSectionTabs(page)]
})

function sectionTabLabel(tab: VisibleSectionTab): string {
  if ('labelKey' in tab && typeof tab.labelKey === 'string')
    return t(tab.labelKey)
  if ('label' in tab && typeof tab.label === 'string')
    return tab.label
  return ''
}

const activeSectionTitle = computed(() => {
  const cur = activeSection.value
  const list = visibleTabs.value
  const tab = list.find(x => x.key === cur)
  if (!tab)
    return ''
  return sectionTabLabel(tab)
})

/** OpenClaw Control UI：子设置页表单模式下顶部 `config-section-hero`（与 `ui/src/styles/config.css` 一致） */
const showConfigFormHero = computed(
  () =>
    formMode.value === 'form'
    && settingsSubPage.value !== 'main'
    && Boolean(draftConfig.value)
    && Boolean(gateway?.connected)
    && !loading.value,
)

const SATELLITE_ROOT_HERO_ICONS: Record<Exclude<SettingsSubPage, 'main'>, Component> = {
  communications: MessagesSquare,
  appearance: Palette,
  automation: Workflow,
  infrastructure: Server,
  aiAgents: Brain,
}

const CONFIG_SECTION_HERO_ICONS: Record<string, Component> = {
  gateway: Globe,
  web: Network,
  browser: AppWindow,
  nodeHost: Cpu,
  canvasHost: LayoutTemplate,
  discovery: Network,
  media: ImageLucide,
  channels: MessagesSquare,
  messages: MessagesSquare,
  broadcast: MessagesSquare,
  talk: MessagesSquare,
  audio: Monitor,
  __appearance__: Palette,
  ui: Palette,
  wizard: Palette,
  commands: FileText,
  hooks: Link2,
  bindings: Link2,
  cron: Monitor,
  approvals: Check,
  plugins: Zap,
  agents: Brain,
  models: Layers,
  skills: Zap,
  tools: Wrench,
  memory: Brain,
  session: Monitor,
}

const configFormHeroIcon = computed((): Component => {
  const page = settingsSubPage.value
  if (page === 'main')
    return FileText
  const key = activeSection.value
  if (key === null)
    return SATELLITE_ROOT_HERO_ICONS[page] ?? Server
  return CONFIG_SECTION_HERO_ICONS[key] ?? FileText
})

const CONFIG_SECTION_HERO_DESC_KEYS: Record<string, string> = {
  gateway: 'openclaw.configGatewaySectionMeta',
  web: 'openclaw.configWebSectionMeta',
  browser: 'openclaw.configBrowserSectionMeta',
  nodeHost: 'openclaw.configNodeHostSectionMeta',
  canvasHost: 'openclaw.configCanvasHostSectionMeta',
  discovery: 'openclaw.configDiscoverySectionMeta',
  media: 'openclaw.configMediaSectionMeta',
  agents: 'openclaw.configAgentsSectionMeta',
  models: 'openclaw.configModelsSectionMeta',
  skills: 'openclaw.configSkillsSectionMeta',
  tools: 'openclaw.configToolsSectionMeta',
  memory: 'openclaw.configMemorySectionMeta',
  session: 'openclaw.configSessionSectionMeta',
  plugins: 'openclaw.configPluginsSectionMeta',
  hooks: 'openclaw.configHooksSectionMeta',
  bindings: 'openclaw.configBindingsSectionMeta',
  cron: 'openclaw.configCronSectionMeta',
}

const configFormHeroDesc = computed(() => {
  const cur = activeSection.value
  if (cur === null)
    return t('openclaw.configSatelliteRootIntro')
  const k = CONFIG_SECTION_HERO_DESC_KEYS[cur]
  if (k) {
    const translated = t(k)
    if (translated !== k)
      return translated
    if (cur === 'browser') {
      return String(locale.value).toLowerCase().startsWith('zh')
        ? '浏览器自动化设置'
        : 'Browser automation settings'
    }
    if (cur === 'nodeHost') {
      return String(locale.value).toLowerCase().startsWith('zh')
        ? '节点主机与浏览器代理路由'
        : 'Node host and browser proxy routing'
    }
    if (cur === 'canvasHost') {
      return String(locale.value).toLowerCase().startsWith('zh')
        ? 'Canvas 渲染与展示'
        : 'Canvas rendering and display'
    }
    if (cur === 'discovery') {
      return String(locale.value).toLowerCase().startsWith('zh')
        ? '服务发现与网络'
        : 'Service discovery and networking'
    }
    if (cur === 'media') {
      return String(locale.value).toLowerCase().startsWith('zh')
        ? '入站媒体的命名与保留策略'
        : 'Inbound media filenames and retention'
    }
    if (cur === 'agents') {
      return String(locale.value).toLowerCase().startsWith('zh')
        ? '智能体配置、模型与身份'
        : 'Agent configurations, models, and identities'
    }
    if (cur === 'models') {
      return String(locale.value).toLowerCase().startsWith('zh')
        ? 'AI 模型配置与推理提供商'
        : 'AI model configurations and providers'
    }
    if (cur === 'skills') {
      return String(locale.value).toLowerCase().startsWith('zh')
        ? '技能包与能力'
        : 'Skill packs and capabilities'
    }
    if (cur === 'tools') {
      return String(locale.value).toLowerCase().startsWith('zh')
        ? '工具配置（浏览器、搜索等）'
        : 'Tool configurations (browser, search, etc.)'
    }
    if (cur === 'memory') {
      return String(locale.value).toLowerCase().startsWith('zh')
        ? '全局记忆后端配置。'
        : 'Memory backend configuration (global).'
    }
    if (cur === 'session') {
      return String(locale.value).toLowerCase().startsWith('zh')
        ? '会话管理与持久化'
        : 'Session management and persistence'
    }
  }
  return t('openclaw.configSatelliteIntro')
})

/** —— Updates 分区：与 openclaw schema（zod update）一致 —— */
function ensureUpdateNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.update || typeof r.update !== 'object' || Array.isArray(r.update)) {
    r.update = {}
  }
  return r.update as Record<string, unknown>
}

function ensureAutoNode(): Record<string, unknown> {
  const u = ensureUpdateNode()
  if (!u.auto || typeof u.auto !== 'object' || Array.isArray(u.auto)) {
    u.auto = {}
  }
  return u.auto as Record<string, unknown>
}

/** Select 不支持空 value 时用占位 */
const CHANNEL_AUTO = '__auto__'

const updateChannelSelect = computed({
  get() {
    const u = draftConfig.value?.update as Record<string, unknown> | undefined
    const ch = u?.channel
    if (ch === 'stable' || ch === 'beta' || ch === 'dev')
      return ch
    return CHANNEL_AUTO
  },
  set(v: string) {
    const u = ensureUpdateNode()
    if (v === CHANNEL_AUTO) {
      delete u.channel
      return
    }
    if (v === 'stable' || v === 'beta' || v === 'dev')
      u.channel = v
  },
})

const updateSub = computed(() => draftConfig.value?.update as Record<string, unknown> | undefined)

const autoSub = computed(() => {
  const u = updateSub.value?.auto
  if (u && typeof u === 'object' && !Array.isArray(u))
    return u as Record<string, unknown>
  return undefined
})

const stableDelayStr = computed({
  get() {
    const a = autoSub.value
    if (a && typeof a.stableDelayHours === 'number')
      return String(a.stableDelayHours)
    return '6'
  },
  set(v: string) {
    const n = Number.parseInt(String(v), 10)
    if (!Number.isFinite(n))
      return
    const a = ensureAutoNode()
    a.stableDelayHours = Math.min(168, Math.max(0, n))
  },
})

const stableJitterStr = computed({
  get() {
    const a = autoSub.value
    if (a && typeof a.stableJitterHours === 'number')
      return String(a.stableJitterHours)
    return '12'
  },
  set(v: string) {
    const n = Number.parseInt(String(v), 10)
    if (!Number.isFinite(n))
      return
    const a = ensureAutoNode()
    a.stableJitterHours = Math.min(168, Math.max(0, n))
  },
})

const betaIntervalStr = computed({
  get() {
    const a = autoSub.value
    if (a && typeof a.betaCheckIntervalHours === 'number')
      return String(a.betaCheckIntervalHours)
    return '1'
  },
  set(v: string) {
    const n = Number.parseInt(String(v), 10)
    if (!Number.isFinite(n))
      return
    const a = ensureAutoNode()
    a.betaCheckIntervalHours = Math.min(24, Math.max(1, n))
  },
})

/** —— Environment 分区（env.vars + env.shellEnv）—— */
function ensureEnvNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.env || typeof r.env !== 'object' || Array.isArray(r.env)) {
    r.env = {}
  }
  return r.env as Record<string, unknown>
}

function ensureShellEnvNode(): Record<string, unknown> {
  const env = ensureEnvNode()
  if (!env.shellEnv || typeof env.shellEnv !== 'object' || Array.isArray(env.shellEnv)) {
    env.shellEnv = {}
  }
  return env.shellEnv as Record<string, unknown>
}

function ensureEnvVarsNode(): Record<string, string> {
  const env = ensureEnvNode()
  if (!env.vars || typeof env.vars !== 'object' || Array.isArray(env.vars)) {
    env.vars = {}
  }
  return env.vars as Record<string, string>
}

const envSub = computed(() => draftConfig.value?.env as Record<string, unknown> | undefined)

const shellEnvSub = computed(() => {
  const node = envSub.value?.shellEnv
  if (node && typeof node === 'object' && !Array.isArray(node))
    return node as Record<string, unknown>
  return undefined
})

const shellEnvEnabled = computed({
  get() {
    return shellEnvSub.value?.enabled !== false
  },
  set(v: boolean) {
    const shell = ensureShellEnvNode()
    shell.enabled = v
  },
})

const shellEnvTimeoutStr = computed({
  get() {
    const timeout = shellEnvSub.value?.timeoutMs
    if (typeof timeout === 'number' && Number.isFinite(timeout))
      return String(timeout)
    return '2000'
  },
  set(v: string) {
    const n = Number.parseInt(String(v), 10)
    if (!Number.isFinite(n))
      return
    const shell = ensureShellEnvNode()
    shell.timeoutMs = Math.max(0, n)
  },
})

const envVarEntries = computed(() => {
  const vars = envSub.value?.vars
  if (!vars || typeof vars !== 'object' || Array.isArray(vars))
    return [] as Array<[string, string]>
  return Object.entries(vars as Record<string, unknown>)
    .filter(([k]) => k.length > 0)
    .map(([k, v]) => [k, typeof v === 'string' ? v : String(v ?? '')] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b))
})

const newEnvKey = ref('')
const newEnvValue = ref('')

function updateEnvVarValue(key: string, value: string) {
  const vars = ensureEnvVarsNode()
  vars[key] = value
}

function removeEnvVar(key: string) {
  const vars = ensureEnvVarsNode()
  delete vars[key]
}

function addEnvVar() {
  const key = newEnvKey.value.trim()
  if (!key)
    return
  const vars = ensureEnvVarsNode()
  vars[key] = newEnvValue.value
  newEnvKey.value = ''
  newEnvValue.value = ''
}

/** —— Authentication 分区（auth.cooldowns）—— */
function ensureAuthNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.auth || typeof r.auth !== 'object' || Array.isArray(r.auth)) {
    r.auth = {}
  }
  return r.auth as Record<string, unknown>
}

function ensureAuthCooldownsNode(): Record<string, unknown> {
  const auth = ensureAuthNode()
  if (!auth.cooldowns || typeof auth.cooldowns !== 'object' || Array.isArray(auth.cooldowns)) {
    auth.cooldowns = {}
  }
  return auth.cooldowns as Record<string, unknown>
}

const authSub = computed(() => draftConfig.value?.auth as Record<string, unknown> | undefined)
const authCooldownsSub = computed(() => {
  const node = authSub.value?.cooldowns
  if (node && typeof node === 'object' && !Array.isArray(node))
    return node as Record<string, unknown>
  return undefined
})

const authBillingBackoffStr = computed({
  get() {
    const v = authCooldownsSub.value?.billingBackoffHours
    if (typeof v === 'number' && Number.isFinite(v))
      return String(v)
    return '5'
  },
  set(v: string) {
    const n = Number(v)
    if (!Number.isFinite(n))
      return
    const c = ensureAuthCooldownsNode()
    c.billingBackoffHours = Math.max(0, n)
  },
})

const authBillingMaxStr = computed({
  get() {
    const v = authCooldownsSub.value?.billingMaxHours
    if (typeof v === 'number' && Number.isFinite(v))
      return String(v)
    return '24'
  },
  set(v: string) {
    const n = Number(v)
    if (!Number.isFinite(n))
      return
    const c = ensureAuthCooldownsNode()
    c.billingMaxHours = Math.max(0, n)
  },
})

const authFailureWindowStr = computed({
  get() {
    const v = authCooldownsSub.value?.failureWindowHours
    if (typeof v === 'number' && Number.isFinite(v))
      return String(v)
    return '24'
  },
  set(v: string) {
    const n = Number(v)
    if (!Number.isFinite(n))
      return
    const c = ensureAuthCooldownsNode()
    c.failureWindowHours = Math.max(0, n)
  },
})

const authBackoffByProviderText = computed({
  get() {
    const v = authCooldownsSub.value?.billingBackoffHoursByProvider
    if (v && typeof v === 'object' && !Array.isArray(v))
      return JSON.stringify(v, null, 2)
    return '{}'
  },
  set(v: string) {
    try {
      const parsed = JSON.parse(v || '{}')
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        return
      const c = ensureAuthCooldownsNode()
      c.billingBackoffHoursByProvider = parsed
    }
    catch {
      // Keep draft untouched while user is typing invalid JSON.
    }
  },
})

function bumpAuthNumber(path: 'billingBackoffHours' | 'billingMaxHours' | 'failureWindowHours', delta: number) {
  const c = ensureAuthCooldownsNode()
  const cur = typeof c[path] === 'number' && Number.isFinite(c[path] as number) ? (c[path] as number) : 0
  c[path] = Math.max(0, cur + delta)
}

/** —— Metadata 分区（meta.lastTouched*）—— */
function ensureMetaNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.meta || typeof r.meta !== 'object' || Array.isArray(r.meta)) {
    r.meta = {}
  }
  return r.meta as Record<string, unknown>
}

const metaSub = computed(() => draftConfig.value?.meta as Record<string, unknown> | undefined)

const metaLastTouchedAtText = computed(() => {
  const v = metaSub.value?.lastTouchedAt
  if (typeof v === 'string')
    return v
  return ''
})

const metaLastTouchedVersion = computed({
  get() {
    const v = metaSub.value?.lastTouchedVersion
    if (typeof v === 'string')
      return v
    return ''
  },
  set(v: string) {
    const m = ensureMetaNode()
    if (!v.trim()) {
      delete m.lastTouchedVersion
      return
    }
    m.lastTouchedVersion = v.trim()
  },
})

/** —— Logging 分区（logging.*）—— */
function ensureLoggingNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.logging || typeof r.logging !== 'object' || Array.isArray(r.logging)) {
    r.logging = {}
  }
  return r.logging as Record<string, unknown>
}

const LOG_LEVELS = ['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const
const LOG_STYLES = ['pretty', 'compact', 'json'] as const
const REDACT_MODES = ['off', 'tools'] as const

const loggingSub = computed(() => draftConfig.value?.logging as Record<string, unknown> | undefined)

const loggingConsoleLevel = computed({
  get() {
    const v = loggingSub.value?.consoleLevel
    return LOG_LEVELS.includes(v as (typeof LOG_LEVELS)[number]) ? (v as string) : 'info'
  },
  set(v: string) {
    if (!LOG_LEVELS.includes(v as (typeof LOG_LEVELS)[number]))
      return
    const l = ensureLoggingNode()
    l.consoleLevel = v
  },
})

const loggingLevel = computed({
  get() {
    const v = loggingSub.value?.level
    return LOG_LEVELS.includes(v as (typeof LOG_LEVELS)[number]) ? (v as string) : 'info'
  },
  set(v: string) {
    if (!LOG_LEVELS.includes(v as (typeof LOG_LEVELS)[number]))
      return
    const l = ensureLoggingNode()
    l.level = v
  },
})

const loggingConsoleStyle = computed({
  get() {
    const v = loggingSub.value?.consoleStyle
    return LOG_STYLES.includes(v as (typeof LOG_STYLES)[number]) ? (v as string) : 'pretty'
  },
  set(v: string) {
    if (!LOG_STYLES.includes(v as (typeof LOG_STYLES)[number]))
      return
    const l = ensureLoggingNode()
    l.consoleStyle = v
  },
})

const loggingRedactMode = computed({
  get() {
    const v = loggingSub.value?.redactSensitive
    return REDACT_MODES.includes(v as (typeof REDACT_MODES)[number]) ? (v as string) : 'tools'
  },
  set(v: string) {
    if (!REDACT_MODES.includes(v as (typeof REDACT_MODES)[number]))
      return
    const l = ensureLoggingNode()
    l.redactSensitive = v
  },
})

const loggingFilePath = computed({
  get() {
    const v = loggingSub.value?.file
    return typeof v === 'string' ? v : ''
  },
  set(v: string) {
    const l = ensureLoggingNode()
    if (!v.trim()) {
      delete l.file
      return
    }
    l.file = v
  },
})

const loggingRedactPatternsText = computed({
  get() {
    const v = loggingSub.value?.redactPatterns
    if (Array.isArray(v))
      return JSON.stringify(v, null, 2)
    return '[]'
  },
  set(v: string) {
    try {
      const parsed = JSON.parse(v || '[]')
      if (!Array.isArray(parsed))
        return
      const list = parsed.filter(item => typeof item === 'string')
      const l = ensureLoggingNode()
      l.redactPatterns = list
    }
    catch {
      // keep draft unchanged while user types invalid JSON
    }
  },
})

/** —— Diagnostics 分区（diagnostics.cacheTrace / diagnostics.otel）—— */
function ensureDiagnosticsNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.diagnostics || typeof r.diagnostics !== 'object' || Array.isArray(r.diagnostics)) {
    r.diagnostics = {}
  }
  return r.diagnostics as Record<string, unknown>
}

function ensureCacheTraceNode(): Record<string, unknown> {
  const d = ensureDiagnosticsNode()
  if (!d.cacheTrace || typeof d.cacheTrace !== 'object' || Array.isArray(d.cacheTrace)) {
    d.cacheTrace = {}
  }
  return d.cacheTrace as Record<string, unknown>
}

const diagnosticsSub = computed(() => draftConfig.value?.diagnostics as Record<string, unknown> | undefined)
const cacheTraceSub = computed(() => {
  const node = diagnosticsSub.value?.cacheTrace
  if (node && typeof node === 'object' && !Array.isArray(node))
    return node as Record<string, unknown>
  return undefined
})

const cacheTraceEnabled = computed({
  get() {
    return cacheTraceSub.value?.enabled === true
  },
  set(v: boolean) {
    const c = ensureCacheTraceNode()
    c.enabled = v
  },
})

const cacheTraceFilePath = computed({
  get() {
    const v = cacheTraceSub.value?.filePath
    return typeof v === 'string' ? v : ''
  },
  set(v: string) {
    const c = ensureCacheTraceNode()
    if (!v.trim()) {
      delete c.filePath
      return
    }
    c.filePath = v.trim()
  },
})

const cacheTraceIncludeMessages = computed({
  get() {
    return cacheTraceSub.value?.includeMessages === true
  },
  set(v: boolean) {
    const c = ensureCacheTraceNode()
    c.includeMessages = v
  },
})

const cacheTraceIncludePrompt = computed({
  get() {
    return cacheTraceSub.value?.includePrompt === true
  },
  set(v: boolean) {
    const c = ensureCacheTraceNode()
    c.includePrompt = v
  },
})

const cacheTraceIncludeSystem = computed({
  get() {
    return cacheTraceSub.value?.includeSystem === true
  },
  set(v: boolean) {
    const c = ensureCacheTraceNode()
    c.includeSystem = v
  },
})

/** —— Cli 分区（cli.banner.taglineMode）—— */
function ensureCliNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.cli || typeof r.cli !== 'object' || Array.isArray(r.cli)) {
    r.cli = {}
  }
  return r.cli as Record<string, unknown>
}

function ensureCliBannerNode(): Record<string, unknown> {
  const cli = ensureCliNode()
  if (!cli.banner || typeof cli.banner !== 'object' || Array.isArray(cli.banner)) {
    cli.banner = {}
  }
  return cli.banner as Record<string, unknown>
}

const CLI_TAGLINE_MODES = ['random', 'default', 'off'] as const
const cliSub = computed(() => draftConfig.value?.cli as Record<string, unknown> | undefined)
const cliBannerSub = computed(() => {
  const node = cliSub.value?.banner
  if (node && typeof node === 'object' && !Array.isArray(node))
    return node as Record<string, unknown>
  return undefined
})

const cliTaglineMode = computed({
  get() {
    const v = cliBannerSub.value?.taglineMode
    return CLI_TAGLINE_MODES.includes(v as (typeof CLI_TAGLINE_MODES)[number]) ? (v as string) : 'random'
  },
  set(v: string) {
    if (!CLI_TAGLINE_MODES.includes(v as (typeof CLI_TAGLINE_MODES)[number]))
      return
    const b = ensureCliBannerNode()
    b.taglineMode = v
  },
})

/** —— Secrets 分区（secrets.defaults / providers / resolution，对齐 OpenClaw schema）—— */
function ensureSecretsNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.secrets || typeof r.secrets !== 'object' || Array.isArray(r.secrets)) {
    r.secrets = {}
  }
  return r.secrets as Record<string, unknown>
}

function ensureSecretsDefaultsNode(): Record<string, unknown> {
  const s = ensureSecretsNode()
  if (!s.defaults || typeof s.defaults !== 'object' || Array.isArray(s.defaults)) {
    s.defaults = {}
  }
  return s.defaults as Record<string, unknown>
}

function ensureSecretsProvidersNode(): Record<string, unknown> {
  const s = ensureSecretsNode()
  if (!s.providers || typeof s.providers !== 'object' || Array.isArray(s.providers)) {
    s.providers = {}
  }
  return s.providers as Record<string, unknown>
}

function ensureSecretsResolutionNode(): Record<string, unknown> {
  const s = ensureSecretsNode()
  if (!s.resolution || typeof s.resolution !== 'object' || Array.isArray(s.resolution)) {
    s.resolution = {}
  }
  return s.resolution as Record<string, unknown>
}

function pruneEmptySecretsSubtree() {
  const root = draftConfig.value
  if (!root)
    return
  const s = root.secrets
  if (!s || typeof s !== 'object' || Array.isArray(s))
    return
  const sec = s as Record<string, unknown>
  const d = sec.defaults
  if (d && typeof d === 'object' && !Array.isArray(d) && Object.keys(d).length === 0) {
    delete sec.defaults
  }
  const p = sec.providers
  if (p && typeof p === 'object' && !Array.isArray(p) && Object.keys(p).length === 0) {
    delete sec.providers
  }
  const r = sec.resolution
  if (r && typeof r === 'object' && !Array.isArray(r) && Object.keys(r).length === 0) {
    delete sec.resolution
  }
  if (Object.keys(sec).length === 0) {
    delete root.secrets
  }
}

const secretsSub = computed(() => {
  const s = draftConfig.value?.secrets
  if (s && typeof s === 'object' && !Array.isArray(s))
    return s as Record<string, unknown>
  return undefined
})

const secretsDefaultsSub = computed(() => {
  const d = secretsSub.value?.defaults
  if (d && typeof d === 'object' && !Array.isArray(d))
    return d as Record<string, unknown>
  return undefined
})

const secretsResolutionSub = computed(() => {
  const r = secretsSub.value?.resolution
  if (r && typeof r === 'object' && !Array.isArray(r))
    return r as Record<string, unknown>
  return undefined
})

const secretProviderKeys = computed(() => {
  const prov = secretsSub.value?.providers
  if (!prov || typeof prov !== 'object' || Array.isArray(prov))
    return [] as string[]
  return Object.keys(prov as Record<string, unknown>).sort((a, b) => a.localeCompare(b))
})

const secretsDefaultEnv = computed({
  get() {
    const v = secretsDefaultsSub.value?.env
    return typeof v === 'string' ? v : ''
  },
  set(v: string) {
    const d = ensureSecretsDefaultsNode()
    const t = v.trim()
    if (!t) {
      delete d.env
      pruneEmptySecretsSubtree()
      return
    }
    d.env = t
  },
})

const secretsDefaultExec = computed({
  get() {
    const v = secretsDefaultsSub.value?.exec
    return typeof v === 'string' ? v : ''
  },
  set(v: string) {
    const d = ensureSecretsDefaultsNode()
    const t = v.trim()
    if (!t) {
      delete d.exec
      pruneEmptySecretsSubtree()
      return
    }
    d.exec = t
  },
})

const secretsDefaultFile = computed({
  get() {
    const v = secretsDefaultsSub.value?.file
    return typeof v === 'string' ? v : ''
  },
  set(v: string) {
    const d = ensureSecretsDefaultsNode()
    const t = v.trim()
    if (!t) {
      delete d.file
      pruneEmptySecretsSubtree()
      return
    }
    d.file = t
  },
})

function providerJsonFor(key: string): string {
  const prov = ensureSecretsProvidersNode()
  const v = prov[key]
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    return '{\n  "source": "env"\n}'
  }
  try {
    return JSON.stringify(v, null, 2)
  }
  catch {
    return '{\n  "source": "env"\n}'
  }
}

function applyProviderJson(key: string, raw: string) {
  const prov = ensureSecretsProvidersNode()
  const trimmed = raw.trim()
  if (!trimmed) {
    delete prov[key]
    pruneEmptySecretsSubtree()
    return
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return
    const p = parsed as Record<string, unknown>
    const src = p.source
    if (src !== 'env' && src !== 'file' && src !== 'exec')
      return
    prov[key] = parsed
  }
  catch {
    // Keep draft unchanged while JSON is invalid.
  }
}

function onSecretProviderKeyChange(oldKey: string, newKeyRaw: string) {
  const nk = newKeyRaw.trim()
  if (!nk || nk === oldKey)
    return
  const prov = ensureSecretsProvidersNode()
  if (nk in prov)
    return
  prov[nk] = prov[oldKey]
  delete prov[oldKey]
}

function addSecretProvider() {
  const prov = ensureSecretsProvidersNode()
  let index = 1
  let key = `custom-${index}`
  while (key in prov) {
    index += 1
    key = `custom-${index}`
  }
  prov[key] = { source: 'env' }
}

function removeSecretProvider(key: string) {
  const prov = ensureSecretsProvidersNode()
  delete prov[key]
  pruneEmptySecretsSubtree()
}

const SECRET_RES_MAX_BATCH = 5 * 1024 * 1024

const secretsMaxBatchBytesStr = computed({
  get() {
    const v = secretsResolutionSub.value?.maxBatchBytes
    if (typeof v === 'number' && Number.isFinite(v))
      return String(v)
    return ''
  },
  set(v: string) {
    const res = ensureSecretsResolutionNode()
    const n = Number.parseInt(String(v), 10)
    if (!v.trim() || !Number.isFinite(n)) {
      delete res.maxBatchBytes
      pruneEmptySecretsSubtree()
      return
    }
    res.maxBatchBytes = Math.min(SECRET_RES_MAX_BATCH, Math.max(1, n))
  },
})

const secretsMaxProviderConcurrencyStr = computed({
  get() {
    const v = secretsResolutionSub.value?.maxProviderConcurrency
    if (typeof v === 'number' && Number.isFinite(v))
      return String(v)
    return ''
  },
  set(v: string) {
    const res = ensureSecretsResolutionNode()
    const n = Number.parseInt(String(v), 10)
    if (!v.trim() || !Number.isFinite(n)) {
      delete res.maxProviderConcurrency
      pruneEmptySecretsSubtree()
      return
    }
    res.maxProviderConcurrency = Math.min(16, Math.max(1, n))
  },
})

const secretsMaxRefsPerProviderStr = computed({
  get() {
    const v = secretsResolutionSub.value?.maxRefsPerProvider
    if (typeof v === 'number' && Number.isFinite(v))
      return String(v)
    return ''
  },
  set(v: string) {
    const res = ensureSecretsResolutionNode()
    const n = Number.parseInt(String(v), 10)
    if (!v.trim() || !Number.isFinite(n)) {
      delete res.maxRefsPerProvider
      pruneEmptySecretsSubtree()
      return
    }
    res.maxRefsPerProvider = Math.min(4096, Math.max(1, n))
  },
})

function bumpSecretResolution(
  key: 'maxBatchBytes' | 'maxProviderConcurrency' | 'maxRefsPerProvider',
  delta: number,
) {
  const res = ensureSecretsResolutionNode()
  if (key === 'maxBatchBytes') {
    const cur
      = typeof res.maxBatchBytes === 'number' && Number.isFinite(res.maxBatchBytes)
        ? res.maxBatchBytes
        : 65536
    const step = 1024
    res.maxBatchBytes = Math.min(SECRET_RES_MAX_BATCH, Math.max(1, cur + delta * step))
    return
  }
  if (key === 'maxProviderConcurrency') {
    const cur
      = typeof res.maxProviderConcurrency === 'number' && Number.isFinite(res.maxProviderConcurrency)
        ? res.maxProviderConcurrency
        : 2
    res.maxProviderConcurrency = Math.min(16, Math.max(1, cur + delta))
    return
  }
  const cur
    = typeof res.maxRefsPerProvider === 'number' && Number.isFinite(res.maxRefsPerProvider)
      ? res.maxRefsPerProvider
      : 128
  res.maxRefsPerProvider = Math.min(4096, Math.max(1, cur + delta))
}

/** —— ACP 分区（acp.allowedAgents）—— */
function ensureAcpNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.acp || typeof r.acp !== 'object' || Array.isArray(r.acp)) {
    r.acp = {}
  }
  return r.acp as Record<string, unknown>
}

function ensureAcpAllowedAgents(): string[] {
  const acp = ensureAcpNode()
  if (!Array.isArray(acp.allowedAgents)) {
    acp.allowedAgents = []
  }
  return acp.allowedAgents as string[]
}

function cleanupEmptyAcpNode() {
  const root = draftConfig.value
  if (!root || !root.acp || typeof root.acp !== 'object' || Array.isArray(root.acp))
    return
  const acp = root.acp as Record<string, unknown>
  if (Array.isArray(acp.allowedAgents) && acp.allowedAgents.length === 0) {
    delete acp.allowedAgents
  }
  if (Object.keys(acp).length === 0) {
    delete root.acp
  }
}

const acpSub = computed(() => {
  const node = draftConfig.value?.acp
  if (node && typeof node === 'object' && !Array.isArray(node))
    return node as Record<string, unknown>
  return undefined
})

const acpAllowedAgents = computed(() => {
  const v = acpSub.value?.allowedAgents
  if (!Array.isArray(v))
    return [] as string[]
  return v.map(item => String(item ?? ''))
})

function addAcpAllowedAgent() {
  const arr = ensureAcpAllowedAgents()
  arr.push('')
}

function updateAcpAllowedAgent(index: number, value: string) {
  const arr = ensureAcpAllowedAgents()
  if (index < 0 || index >= arr.length)
    return
  arr[index] = value.trim()
}

function removeAcpAllowedAgent(index: number) {
  const arr = ensureAcpAllowedAgents()
  if (index < 0 || index >= arr.length)
    return
  arr.splice(index, 1)
  cleanupEmptyAcpNode()
}

/**
 * OpenClaw `ChannelsSchema` 显式字段（zod-schema.providers.ts）；其余键为 passthrough 扩展通道，
 * 在 Control UI 中作为「Custom entries」编辑。
 */
const CHANNELS_RESERVED_KEYS = new Set([
  'defaults',
  'modelByChannel',
  'whatsapp',
  'telegram',
  'discord',
  'irc',
  'googlechat',
  'slack',
  'signal',
  'imessage',
  'bluebubbles',
  'msteams',
])

function ensureChannelsNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.channels || typeof r.channels !== 'object' || Array.isArray(r.channels)) {
    r.channels = {}
  }
  return r.channels as Record<string, unknown>
}

function cleanupEmptyChannelsNode() {
  const root = draftConfig.value
  if (!root?.channels || typeof root.channels !== 'object' || Array.isArray(root.channels))
    return
  const c = root.channels as Record<string, unknown>
  if (Object.keys(c).length === 0) {
    delete root.channels
  }
}

const channelsCustomKeys = computed(() => {
  const ch = draftConfig.value?.channels as Record<string, unknown> | undefined
  if (!ch || typeof ch !== 'object' || Array.isArray(ch))
    return [] as string[]
  return Object.keys(ch)
    .filter(k => !CHANNELS_RESERVED_KEYS.has(k))
    .sort((a, b) => a.localeCompare(b))
})

function channelsJsonFor(key: string): string {
  const ch = ensureChannelsNode()
  const v = ch[key]
  if (v === undefined)
    return '{}'
  try {
    return JSON.stringify(v, null, 2)
  }
  catch {
    return '{}'
  }
}

function applyChannelsCustomJson(key: string, raw: string) {
  const ch = ensureChannelsNode()
  const trimmed = raw.trim()
  if (!trimmed) {
    delete ch[key]
    cleanupEmptyChannelsNode()
    return
  }
  try {
    ch[key] = JSON.parse(trimmed) as unknown
  }
  catch {
    // 非法 JSON 时不改 draft（与 OpenClaw cfg-map 一致）
  }
}

function onChannelsCustomKeyChange(oldKey: string, newKeyRaw: string) {
  const nk = newKeyRaw.trim()
  if (!nk || nk === oldKey)
    return
  const ch = ensureChannelsNode()
  if (nk in ch)
    return
  if (CHANNELS_RESERVED_KEYS.has(nk))
    return
  ch[nk] = ch[oldKey]
  delete ch[oldKey]
}

function addChannelsCustomEntry() {
  const ch = ensureChannelsNode()
  let index = 1
  let key = `custom-${index}`
  while (key in ch) {
    index += 1
    key = `custom-${index}`
  }
  ch[key] = {}
}

function removeChannelsCustomEntry(key: string) {
  const ch = ensureChannelsNode()
  delete ch[key]
  cleanupEmptyChannelsNode()
}

/** —— Messages 分区（对齐 zod MessagesSchema）—— */
const ACK_SCOPE_VALUES = [
  'group-mentions',
  'group-all',
  'direct',
  'all',
  'off',
  'none',
] as const

const MESSAGES_ACK_SCOPE_AUTO = '__messages_ack_scope_auto__'

function ensureMessagesNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.messages || typeof r.messages !== 'object' || Array.isArray(r.messages)) {
    r.messages = {}
  }
  return r.messages as Record<string, unknown>
}

function cleanupEmptyMessagesNode() {
  const root = draftConfig.value
  if (!root?.messages || typeof root.messages !== 'object' || Array.isArray(root.messages))
    return
  const m = root.messages as Record<string, unknown>
  if (Object.keys(m).length === 0) {
    delete root.messages
  }
}

const messagesAckReaction = computed({
  get() {
    const msg = draftConfig.value?.messages as Record<string, unknown> | undefined
    const v = msg?.ackReaction
    return typeof v === 'string' ? v : ''
  },
  set(v: string) {
    const m = ensureMessagesNode()
    const t = v.trim()
    if (!t) {
      delete m.ackReaction
      cleanupEmptyMessagesNode()
      return
    }
    m.ackReaction = t
  },
})

const messagesAckReactionScopeSelect = computed({
  get() {
    const msg = draftConfig.value?.messages as Record<string, unknown> | undefined
    const v = msg?.ackReactionScope
    if (typeof v === 'string' && (ACK_SCOPE_VALUES as readonly string[]).includes(v)) {
      return v
    }
    return MESSAGES_ACK_SCOPE_AUTO
  },
  set(v: string) {
    const m = ensureMessagesNode()
    if (v === MESSAGES_ACK_SCOPE_AUTO) {
      delete m.ackReactionScope
      cleanupEmptyMessagesNode()
      return
    }
    if ((ACK_SCOPE_VALUES as readonly string[]).includes(v)) {
      m.ackReactionScope = v
    }
  },
})

const messagesRemoveAckAfterReply = computed({
  get() {
    const msg = draftConfig.value?.messages as Record<string, unknown> | undefined
    return msg?.removeAckAfterReply === true
  },
  set(v: boolean) {
    const m = ensureMessagesNode()
    if (!v) {
      delete m.removeAckAfterReply
      cleanupEmptyMessagesNode()
      return
    }
    m.removeAckAfterReply = true
  },
})

/** —— Talk 分区（对齐 zod TalkSchema）—— */
function ensureTalkNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.talk || typeof r.talk !== 'object' || Array.isArray(r.talk)) {
    r.talk = {}
  }
  return r.talk as Record<string, unknown>
}

function cleanupEmptyTalkNode() {
  const root = draftConfig.value
  if (!root?.talk || typeof root.talk !== 'object' || Array.isArray(root.talk))
    return
  const t = root.talk as Record<string, unknown>
  if (Object.keys(t).length === 0) {
    delete root.talk
  }
}

function ensureTalkProvidersNode(): Record<string, unknown> {
  const talk = ensureTalkNode()
  if (!talk.providers || typeof talk.providers !== 'object' || Array.isArray(talk.providers)) {
    talk.providers = {}
  }
  return talk.providers as Record<string, unknown>
}

function ensureTalkProviderElevenlabs(): Record<string, unknown> {
  const prov = ensureTalkProvidersNode()
  if (!prov.elevenlabs || typeof prov.elevenlabs !== 'object' || Array.isArray(prov.elevenlabs)) {
    prov.elevenlabs = {}
  }
  return prov.elevenlabs as Record<string, unknown>
}

function pruneEmptyTalkProviders() {
  const talk = draftConfig.value?.talk as Record<string, unknown> | undefined
  if (!talk?.providers || typeof talk.providers !== 'object' || Array.isArray(talk.providers))
    return
  const prov = talk.providers as Record<string, unknown>
  const el = prov.elevenlabs
  if (el && typeof el === 'object' && !Array.isArray(el) && Object.keys(el as object).length === 0) {
    delete prov.elevenlabs
  }
  if (Object.keys(prov).length === 0) {
    delete talk.providers
  }
  cleanupEmptyTalkNode()
}

const talkApiKeyLegacy = computed({
  get() {
    const talk = draftConfig.value?.talk as Record<string, unknown> | undefined
    const v = talk?.apiKey
    return typeof v === 'string' ? v : ''
  },
  set(v: string) {
    const t = ensureTalkNode()
    const x = v.trim()
    if (!x) {
      delete t.apiKey
      cleanupEmptyTalkNode()
      return
    }
    t.apiKey = x
  },
})

const talkProviderStr = computed({
  get() {
    const talk = draftConfig.value?.talk as Record<string, unknown> | undefined
    const v = talk?.provider
    return typeof v === 'string' ? v : ''
  },
  set(v: string) {
    const t = ensureTalkNode()
    const x = v.trim()
    if (!x) {
      delete t.provider
      cleanupEmptyTalkNode()
      return
    }
    t.provider = x
  },
})

const talkElevenlabsApiKey = computed({
  get() {
    const talk = draftConfig.value?.talk as Record<string, unknown> | undefined
    const prov = talk?.providers as Record<string, unknown> | undefined
    const el = prov?.elevenlabs as Record<string, unknown> | undefined
    const v = el?.apiKey
    return typeof v === 'string' ? v : ''
  },
  set(v: string) {
    const eleven = ensureTalkProviderElevenlabs()
    const x = v.trim()
    if (!x) {
      delete eleven.apiKey
      pruneEmptyTalkProviders()
      return
    }
    eleven.apiKey = x
  },
})

const talkVoiceIdLegacy = computed({
  get() {
    const talk = draftConfig.value?.talk as Record<string, unknown> | undefined
    const v = talk?.voiceId
    return typeof v === 'string' ? v : ''
  },
  set(v: string) {
    const t = ensureTalkNode()
    const x = v.trim()
    if (!x) {
      delete t.voiceId
      cleanupEmptyTalkNode()
      return
    }
    t.voiceId = x
  },
})

const talkModelIdLegacy = computed({
  get() {
    const talk = draftConfig.value?.talk as Record<string, unknown> | undefined
    const v = talk?.modelId
    return typeof v === 'string' ? v : ''
  },
  set(v: string) {
    const t = ensureTalkNode()
    const x = v.trim()
    if (!x) {
      delete t.modelId
      cleanupEmptyTalkNode()
      return
    }
    t.modelId = x
  },
})

const talkOutputFormatLegacy = computed({
  get() {
    const talk = draftConfig.value?.talk as Record<string, unknown> | undefined
    const v = talk?.outputFormat
    return typeof v === 'string' ? v : ''
  },
  set(v: string) {
    const t = ensureTalkNode()
    const x = v.trim()
    if (!x) {
      delete t.outputFormat
      cleanupEmptyTalkNode()
      return
    }
    t.outputFormat = x
  },
})

function talkVoiceAliasesFromDraft(): string {
  const talk = draftConfig.value?.talk as Record<string, unknown> | undefined
  const va = talk?.voiceAliases
  if (!va || typeof va !== 'object' || Array.isArray(va))
    return '{}'
  try {
    return JSON.stringify(va, null, 2)
  }
  catch {
    return '{}'
  }
}

const talkVoiceAliasesJsonLocal = ref('')

watch(
  () => [settingsSubPage.value, activeSection.value, formMode.value, snapshot.value?.hash] as const,
  () => {
    if (formMode.value !== 'form')
      return
    if (settingsSubPage.value === 'communications' && activeSection.value === 'talk') {
      talkVoiceAliasesJsonLocal.value = talkVoiceAliasesFromDraft()
    }
  },
  { immediate: true },
)

function applyTalkVoiceAliasesJson(raw: string) {
  try {
    const parsed = JSON.parse(raw || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      talkVoiceAliasesJsonLocal.value = talkVoiceAliasesFromDraft()
      return
    }
    for (const val of Object.values(parsed)) {
      if (typeof val !== 'string') {
        talkVoiceAliasesJsonLocal.value = talkVoiceAliasesFromDraft()
        return
      }
    }
    const t = ensureTalkNode()
    if (Object.keys(parsed).length === 0) {
      delete t.voiceAliases
    }
    else {
      t.voiceAliases = parsed as Record<string, string>
    }
    cleanupEmptyTalkNode()
    talkVoiceAliasesJsonLocal.value = talkVoiceAliasesFromDraft()
  }
  catch {
    talkVoiceAliasesJsonLocal.value = talkVoiceAliasesFromDraft()
  }
}

const talkInterruptOnSpeech = computed({
  get() {
    const talk = draftConfig.value?.talk as Record<string, unknown> | undefined
    return talk?.interruptOnSpeech !== false
  },
  set(on: boolean) {
    const t = ensureTalkNode()
    if (on) {
      delete t.interruptOnSpeech
    }
    else {
      t.interruptOnSpeech = false
    }
    cleanupEmptyTalkNode()
  },
})

const talkSilenceTimeoutStr = computed({
  get() {
    const talk = draftConfig.value?.talk as Record<string, unknown> | undefined
    const v = talk?.silenceTimeoutMs
    if (typeof v === 'number' && Number.isFinite(v) && v > 0)
      return String(Math.trunc(v))
    return ''
  },
  set(s: string) {
    const t = ensureTalkNode()
    const tr = s.trim()
    if (!tr) {
      delete t.silenceTimeoutMs
      cleanupEmptyTalkNode()
      return
    }
    const n = Number.parseInt(tr, 10)
    if (!Number.isFinite(n) || n <= 0)
      return
    t.silenceTimeoutMs = n
  },
})

/** —— Audio 分区（对齐 zod AudioSchema / TranscribeAudioSchema）—— */
function ensureAudioNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.audio || typeof r.audio !== 'object' || Array.isArray(r.audio)) {
    r.audio = {}
  }
  return r.audio as Record<string, unknown>
}

function ensureAudioTranscriptionNode(): Record<string, unknown> {
  const a = ensureAudioNode()
  if (!a.transcription || typeof a.transcription !== 'object' || Array.isArray(a.transcription)) {
    a.transcription = {}
  }
  return a.transcription as Record<string, unknown>
}

function cleanupEmptyAudioRoot() {
  const root = draftConfig.value
  if (!root?.audio || typeof root.audio !== 'object' || Array.isArray(root.audio))
    return
  const audio = root.audio as Record<string, unknown>
  if (Object.keys(audio).length === 0) {
    delete root.audio
  }
}

function cleanupAudioTranscriptionAndAudio() {
  const root = draftConfig.value
  if (!root?.audio || typeof root.audio !== 'object' || Array.isArray(root.audio))
    return
  const a = root.audio as Record<string, unknown>
  const tr = a.transcription as Record<string, unknown> | undefined
  if (!tr || typeof tr !== 'object') {
    cleanupEmptyAudioRoot()
    return
  }
  const cmd = tr.command
  const hasCmd
    = Array.isArray(cmd) && cmd.some(x => typeof x === 'string' && x.trim().length > 0)
  const to = tr.timeoutSeconds
  const hasTimeout = typeof to === 'number' && Number.isFinite(to) && to > 0
  if (!hasCmd && !hasTimeout) {
    delete a.transcription
  }
  cleanupEmptyAudioRoot()
}

const audioTranscriptionCommandRows = computed(() => {
  const a = draftConfig.value?.audio as Record<string, unknown> | undefined
  const tr = a?.transcription as Record<string, unknown> | undefined
  const cmd = tr?.command
  if (!Array.isArray(cmd) || cmd.length === 0)
    return ['']
  return cmd.map(x => (typeof x === 'string' ? x : String(x ?? '')))
})

function setAudioTranscriptionCommandArg(index: number, value: string) {
  const tr = ensureAudioTranscriptionNode()
  const prev = Array.isArray(tr.command) ? [...(tr.command as unknown[])] : []
  while (prev.length <= index) {
    prev.push('')
  }
  prev[index] = value
  let end = prev.length
  while (end > 1 && !String(prev[end - 1] ?? '').trim()) {
    end -= 1
  }
  const sliced = prev.slice(0, end)
  const hasAny = sliced.some(x => String(x).trim().length > 0)
  if (!hasAny) {
    delete tr.command
  }
  else {
    tr.command = sliced.map(x => (typeof x === 'string' ? x : String(x ?? '')))
  }
  cleanupAudioTranscriptionAndAudio()
}

function addAudioTranscriptionCommandArg() {
  const tr = ensureAudioTranscriptionNode()
  const prev = Array.isArray(tr.command)
    ? (tr.command as unknown[]).map(x => (typeof x === 'string' ? x : String(x ?? '')))
    : ['']
  tr.command = [...prev, '']
}

function removeAudioTranscriptionCommandArg(index: number) {
  const tr = ensureAudioTranscriptionNode()
  if (!Array.isArray(tr.command))
    return
  const arr = [...(tr.command as unknown[])].map(x => (typeof x === 'string' ? x : String(x ?? '')))
  if (index < 0 || index >= arr.length)
    return
  arr.splice(index, 1)
  if (arr.length === 0) {
    delete tr.command
  }
  else {
    tr.command = arr
  }
  cleanupAudioTranscriptionAndAudio()
}

const audioTranscriptionTimeoutStr = computed({
  get() {
    const a = draftConfig.value?.audio as Record<string, unknown> | undefined
    const tr = a?.transcription as Record<string, unknown> | undefined
    const v = tr?.timeoutSeconds
    if (typeof v === 'number' && Number.isFinite(v) && v > 0)
      return String(Math.trunc(v))
    return ''
  },
  set(s: string) {
    const tr = ensureAudioTranscriptionNode()
    const t = s.trim()
    if (!t) {
      delete tr.timeoutSeconds
      cleanupAudioTranscriptionAndAudio()
      return
    }
    const n = Number.parseInt(t, 10)
    if (!Number.isFinite(n) || n <= 0)
      return
    tr.timeoutSeconds = n
  },
})

/** —— Broadcast 分区（broadcast.strategy + catchall peer → string[]）—— */
const BROADCAST_STRATEGY_AUTO = '__broadcast_strategy_auto__'

function ensureBroadcastNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.broadcast || typeof r.broadcast !== 'object' || Array.isArray(r.broadcast)) {
    r.broadcast = {}
  }
  return r.broadcast as Record<string, unknown>
}

function cleanupEmptyBroadcastNode() {
  const root = draftConfig.value
  if (!root?.broadcast || typeof root.broadcast !== 'object' || Array.isArray(root.broadcast))
    return
  const b = root.broadcast as Record<string, unknown>
  if (Object.keys(b).length === 0) {
    delete root.broadcast
  }
}

const broadcastStrategySelect = computed({
  get() {
    const b = draftConfig.value?.broadcast as Record<string, unknown> | undefined
    const s = b?.strategy
    if (s === 'parallel' || s === 'sequential')
      return s
    return BROADCAST_STRATEGY_AUTO
  },
  set(v: string) {
    const b = ensureBroadcastNode()
    if (v === BROADCAST_STRATEGY_AUTO) {
      delete b.strategy
      cleanupEmptyBroadcastNode()
      return
    }
    if (v === 'parallel' || v === 'sequential') {
      b.strategy = v
    }
  },
})

function broadcastPeerMapFromDraft(): string {
  const b = draftConfig.value?.broadcast as Record<string, unknown> | undefined
  if (!b || typeof b !== 'object' || Array.isArray(b))
    return '{}'
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(b)) {
    if (k !== 'strategy')
      out[k] = b[k]
  }
  try {
    return JSON.stringify(out, null, 2)
  }
  catch {
    return '{}'
  }
}

const broadcastDestinationsJsonLocal = ref('')

/** 仅在进入分区 / 表单模式切换 / 远端重载快照时同步，避免编辑 textarea 过程中被 draft 深监听覆盖 */
watch(
  () =>
    [settingsSubPage.value, activeSection.value, formMode.value, snapshot.value?.hash] as const,
  () => {
    if (formMode.value !== 'form')
      return
    if (settingsSubPage.value === 'communications' && activeSection.value === 'broadcast') {
      broadcastDestinationsJsonLocal.value = broadcastPeerMapFromDraft()
    }
  },
  { immediate: true },
)

function applyBroadcastDestinationsJson(raw: string) {
  try {
    const parsed = JSON.parse(raw || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      broadcastDestinationsJsonLocal.value = broadcastPeerMapFromDraft()
      return
    }
    const b = ensureBroadcastNode()
    const strat = b.strategy
    for (const k of Object.keys(b)) {
      if (k !== 'strategy')
        delete b[k]
    }
    for (const [k, val] of Object.entries(parsed)) {
      if (k === 'strategy')
        continue
      if (Array.isArray(val) && val.every(x => typeof x === 'string')) {
        b[k] = val
      }
    }
    if (strat !== undefined)
      b.strategy = strat
    cleanupEmptyBroadcastNode()
    broadcastDestinationsJsonLocal.value = broadcastPeerMapFromDraft()
  }
  catch {
    broadcastDestinationsJsonLocal.value = broadcastPeerMapFromDraft()
  }
}

/** —— UI 分区（对齐 zod-schema `ui`：seamColor + assistant.name / assistant.avatar）—— */
const UI_ASSISTANT_NAME_MAX = 50
const UI_ASSISTANT_AVATAR_MAX = 200

function ensureUiNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.ui || typeof r.ui !== 'object' || Array.isArray(r.ui)) {
    r.ui = {}
  }
  return r.ui as Record<string, unknown>
}

function ensureUiAssistantNode(): Record<string, unknown> {
  const ui = ensureUiNode()
  if (!ui.assistant || typeof ui.assistant !== 'object' || Array.isArray(ui.assistant)) {
    ui.assistant = {}
  }
  return ui.assistant as Record<string, unknown>
}

function cleanupEmptyUiNode() {
  const root = draftConfig.value
  if (!root?.ui || typeof root.ui !== 'object' || Array.isArray(root.ui))
    return
  const ui = root.ui as Record<string, unknown>
  const asst = ui.assistant
  if (asst && typeof asst === 'object' && !Array.isArray(asst)) {
    const a = asst as Record<string, unknown>
    if (a.name === '' || a.name === undefined)
      delete a.name
    if (a.avatar === '' || a.avatar === undefined)
      delete a.avatar
    if (Object.keys(a).length === 0)
      delete ui.assistant
  }
  if (ui.seamColor === '' || ui.seamColor === undefined)
    delete ui.seamColor
  if (Object.keys(ui).length === 0)
    delete root.ui
}

const uiSeamColor = computed({
  get() {
    const ui = draftConfig.value?.ui as Record<string, unknown> | undefined
    const v = ui?.seamColor
    return typeof v === 'string' ? v : ''
  },
  set(v: string) {
    const ui = ensureUiNode()
    const t = v.trim()
    if (!t) {
      delete ui.seamColor
      cleanupEmptyUiNode()
      return
    }
    ui.seamColor = t
  },
})

const uiAssistantNameField = computed({
  get() {
    const ui = draftConfig.value?.ui as Record<string, unknown> | undefined
    const a = ui?.assistant as Record<string, unknown> | undefined
    const v = a?.name
    return typeof v === 'string' ? v : ''
  },
  set(v: string) {
    const a = ensureUiAssistantNode()
    const t = v.trim().slice(0, UI_ASSISTANT_NAME_MAX)
    if (!t) {
      delete a.name
      cleanupEmptyUiNode()
      return
    }
    a.name = t
  },
})

const uiAssistantAvatarField = computed({
  get() {
    const ui = draftConfig.value?.ui as Record<string, unknown> | undefined
    const a = ui?.assistant as Record<string, unknown> | undefined
    const v = a?.avatar
    return typeof v === 'string' ? v : ''
  },
  set(v: string) {
    const a = ensureUiAssistantNode()
    const t = v.trim().slice(0, UI_ASSISTANT_AVATAR_MAX)
    if (!t) {
      delete a.avatar
      cleanupEmptyUiNode()
      return
    }
    a.avatar = t
  },
})

/** —— Wizard 分区（对齐 zod-schema `wizard`：lastRun* 字段）—— */
function ensureWizardNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.wizard || typeof r.wizard !== 'object' || Array.isArray(r.wizard)) {
    r.wizard = {}
  }
  return r.wizard as Record<string, unknown>
}

function cleanupEmptyWizardNode() {
  const root = draftConfig.value
  if (!root?.wizard || typeof root.wizard !== 'object' || Array.isArray(root.wizard))
    return
  const w = root.wizard as Record<string, unknown>
  const keys = ['lastRunAt', 'lastRunVersion', 'lastRunCommit', 'lastRunCommand', 'lastRunMode'] as const
  for (const k of keys) {
    const v = w[k]
    if (v === '' || v === undefined)
      delete w[k]
  }
  if (w.lastRunMode !== 'local' && w.lastRunMode !== 'remote')
    delete w.lastRunMode
  if (Object.keys(w).length === 0)
    delete root.wizard
}

function wizardStringField(key: 'lastRunAt' | 'lastRunVersion' | 'lastRunCommit' | 'lastRunCommand') {
  return computed({
    get() {
      const w = draftConfig.value?.wizard as Record<string, unknown> | undefined
      const v = w?.[key]
      return typeof v === 'string' ? v : ''
    },
    set(v: string) {
      const w = ensureWizardNode()
      const t = v.trim()
      if (!t) {
        delete w[key]
        cleanupEmptyWizardNode()
        return
      }
      w[key] = t
    },
  })
}

const wizardLastRunAt = wizardStringField('lastRunAt')
const wizardLastRunVersion = wizardStringField('lastRunVersion')
const wizardLastRunCommit = wizardStringField('lastRunCommit')
const wizardLastRunCommand = wizardStringField('lastRunCommand')

const WIZARD_MODE_AUTO = '__wizard_mode_auto__'

const wizardLastRunModeSelect = computed({
  get() {
    const w = draftConfig.value?.wizard as Record<string, unknown> | undefined
    const m = w?.lastRunMode
    if (m === 'local' || m === 'remote')
      return m
    return WIZARD_MODE_AUTO
  },
  set(v: string) {
    const w = ensureWizardNode()
    if (v === WIZARD_MODE_AUTO) {
      delete w.lastRunMode
      cleanupEmptyWizardNode()
      return
    }
    if (v === 'local' || v === 'remote') {
      w.lastRunMode = v
    }
  },
})

/** —— Commands 分区（对齐 zod-schema.session `CommandsSchema`）—— */
const COMMANDS_TRISTATE_AUTO = 'auto'
const COMMANDS_TRISTATE_ON = 'true'
const COMMANDS_TRISTATE_OFF = 'false'

function ensureCommandsNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.commands || typeof r.commands !== 'object' || Array.isArray(r.commands)) {
    r.commands = {}
  }
  return r.commands as Record<string, unknown>
}

function cleanupEmptyCommandsNode() {
  const root = draftConfig.value
  if (!root?.commands || typeof root.commands !== 'object' || Array.isArray(root.commands))
    return
  const c = root.commands as Record<string, unknown>
  for (const k of Object.keys(c)) {
    if (c[k] === undefined)
      delete c[k]
  }
  if (Array.isArray(c.ownerAllowFrom) && c.ownerAllowFrom.length === 0)
    delete c.ownerAllowFrom
  const af = c.allowFrom
  if (af && typeof af === 'object' && !Array.isArray(af) && Object.keys(af as object).length === 0) {
    delete c.allowFrom
  }
  if (Object.keys(c).length === 0)
    delete root.commands
}

function parseCommandsTristate(v: unknown): string {
  if (v === true)
    return COMMANDS_TRISTATE_ON
  if (v === false)
    return COMMANDS_TRISTATE_OFF
  return COMMANDS_TRISTATE_AUTO
}

function setCommandsTristate(key: 'native' | 'nativeSkills', sel: string) {
  const c = ensureCommandsNode()
  if (sel === COMMANDS_TRISTATE_AUTO) {
    delete c[key]
  }
  else if (sel === COMMANDS_TRISTATE_ON) {
    c[key] = true
  }
  else {
    c[key] = false
  }
  cleanupEmptyCommandsNode()
}

const commandsNativeSelect = computed({
  get() {
    const cmd = draftConfig.value?.commands as Record<string, unknown> | undefined
    return parseCommandsTristate(cmd?.native)
  },
  set(v: string) {
    setCommandsTristate('native', v)
  },
})

const commandsNativeSkillsSelect = computed({
  get() {
    const cmd = draftConfig.value?.commands as Record<string, unknown> | undefined
    return parseCommandsTristate(cmd?.nativeSkills)
  },
  set(v: string) {
    setCommandsTristate('nativeSkills', v)
  },
})

function commandsOptionalTrueOnly(key: 'text' | 'bash' | 'config' | 'debug' | 'useAccessGroups') {
  return computed({
    get() {
      const cmd = draftConfig.value?.commands as Record<string, unknown> | undefined
      return cmd?.[key] === true
    },
    set(v: boolean) {
      const c = ensureCommandsNode()
      if (!v) {
        delete c[key]
        cleanupEmptyCommandsNode()
        return
      }
      c[key] = true
    },
  })
}

const commandsTextEnabled = commandsOptionalTrueOnly('text')
const commandsBashEnabled = commandsOptionalTrueOnly('bash')
const commandsConfigEnabled = commandsOptionalTrueOnly('config')
const commandsDebugEnabled = commandsOptionalTrueOnly('debug')
const commandsUseAccessGroupsEnabled = commandsOptionalTrueOnly('useAccessGroups')

const commandsRestartEnabled = computed({
  get() {
    const cmd = draftConfig.value?.commands as Record<string, unknown> | undefined
    return cmd?.restart !== false
  },
  set(v: boolean) {
    const c = ensureCommandsNode()
    if (v) {
      delete c.restart
    }
    else {
      c.restart = false
    }
    cleanupEmptyCommandsNode()
  },
})

const commandsBashForegroundMs = computed({
  get() {
    const cmd = draftConfig.value?.commands as Record<string, unknown> | undefined
    const n = cmd?.bashForegroundMs
    return typeof n === 'number' && Number.isFinite(n) ? String(n) : ''
  },
  set(v: string) {
    const c = ensureCommandsNode()
    const t = v.trim()
    if (!t) {
      delete c.bashForegroundMs
      cleanupEmptyCommandsNode()
      return
    }
    const n = Number.parseInt(t, 10)
    if (!Number.isFinite(n) || n < 0 || n > 30_000)
      return
    c.bashForegroundMs = n
  },
})

const commandsOwnerDisplaySelect = computed({
  get() {
    const cmd = draftConfig.value?.commands as Record<string, unknown> | undefined
    return cmd?.ownerDisplay === 'hash' ? 'hash' : 'raw'
  },
  set(v: string) {
    const c = ensureCommandsNode()
    if (v === 'hash') {
      c.ownerDisplay = 'hash'
    }
    else {
      delete c.ownerDisplay
    }
    cleanupEmptyCommandsNode()
  },
})

const commandsOwnerDisplaySecret = computed({
  get() {
    const cmd = draftConfig.value?.commands as Record<string, unknown> | undefined
    const v = cmd?.ownerDisplaySecret
    return typeof v === 'string' ? v : ''
  },
  set(v: string) {
    const c = ensureCommandsNode()
    const t = v.trim()
    if (!t) {
      delete c.ownerDisplaySecret
      cleanupEmptyCommandsNode()
      return
    }
    c.ownerDisplaySecret = t
  },
})

function commandsOwnerAllowFromToJson(): string {
  const cmd = draftConfig.value?.commands as Record<string, unknown> | undefined
  const a = cmd?.ownerAllowFrom
  if (!Array.isArray(a))
    return '[]'
  try {
    return JSON.stringify(a, null, 2)
  }
  catch {
    return '[]'
  }
}

function commandsAllowFromToJson(): string {
  const cmd = draftConfig.value?.commands as Record<string, unknown> | undefined
  const a = cmd?.allowFrom
  if (!a || typeof a !== 'object' || Array.isArray(a))
    return '{}'
  try {
    return JSON.stringify(a, null, 2)
  }
  catch {
    return '{}'
  }
}

const commandsOwnerAllowFromJsonLocal = ref('')
const commandsAllowFromJsonLocal = ref('')

watch(
  () =>
    [settingsSubPage.value, activeSection.value, formMode.value, snapshot.value?.hash] as const,
  () => {
    if (formMode.value !== 'form')
      return
    if (settingsSubPage.value === 'automation' && activeSection.value === 'commands') {
      commandsOwnerAllowFromJsonLocal.value = commandsOwnerAllowFromToJson()
      commandsAllowFromJsonLocal.value = commandsAllowFromToJson()
    }
  },
  { immediate: true },
)

function applyCommandsOwnerAllowFromJson(raw: string) {
  try {
    const parsed = JSON.parse(raw.trim() || '[]')
    if (!Array.isArray(parsed)) {
      commandsOwnerAllowFromJsonLocal.value = commandsOwnerAllowFromToJson()
      return
    }
    const norm: Array<string | number> = []
    for (const item of parsed) {
      if (typeof item === 'string' || typeof item === 'number')
        norm.push(item)
    }
    const c = ensureCommandsNode()
    if (norm.length === 0)
      delete c.ownerAllowFrom
    else c.ownerAllowFrom = norm
    cleanupEmptyCommandsNode()
    commandsOwnerAllowFromJsonLocal.value = commandsOwnerAllowFromToJson()
  }
  catch {
    commandsOwnerAllowFromJsonLocal.value = commandsOwnerAllowFromToJson()
  }
}

function applyCommandsAllowFromJson(raw: string) {
  try {
    const parsed = JSON.parse(raw.trim() || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      commandsAllowFromJsonLocal.value = commandsAllowFromToJson()
      return
    }
    const out: Record<string, Array<string | number>> = {}
    for (const [k, val] of Object.entries(parsed as Record<string, unknown>)) {
      if (!k.trim())
        continue
      if (!Array.isArray(val))
        continue
      const arr: Array<string | number> = []
      for (const x of val) {
        if (typeof x === 'string' || typeof x === 'number')
          arr.push(x)
      }
      if (arr.length > 0)
        out[k] = arr
    }
    const c = ensureCommandsNode()
    if (Object.keys(out).length === 0)
      delete c.allowFrom
    else c.allowFrom = out
    cleanupEmptyCommandsNode()
    commandsAllowFromJsonLocal.value = commandsAllowFromToJson()
  }
  catch {
    commandsAllowFromJsonLocal.value = commandsAllowFromToJson()
  }
}

/** —— Approvals 分区（对齐 zod-schema.approvals `ApprovalsSchema`）—— */
const APPROVALS_MODE_AUTO = '__auto__'

function ensureApprovalsNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.approvals || typeof r.approvals !== 'object' || Array.isArray(r.approvals)) {
    r.approvals = {}
  }
  return r.approvals as Record<string, unknown>
}

function ensureApprovalsExecNode(): Record<string, unknown> {
  const a = ensureApprovalsNode()
  if (!a.exec || typeof a.exec !== 'object' || Array.isArray(a.exec)) {
    a.exec = {}
  }
  return a.exec as Record<string, unknown>
}

function cleanupEmptyApprovalsNode() {
  const root = draftConfig.value
  if (!root?.approvals || typeof root.approvals !== 'object' || Array.isArray(root.approvals))
    return
  const a = root.approvals as Record<string, unknown>
  const ex = a.exec
  if (ex && typeof ex === 'object' && !Array.isArray(ex)) {
    const e = ex as Record<string, unknown>
    if (Array.isArray(e.agentFilter) && e.agentFilter.length === 0)
      delete e.agentFilter
    if (Array.isArray(e.sessionFilter) && e.sessionFilter.length === 0)
      delete e.sessionFilter
    if (Array.isArray(e.targets) && e.targets.length === 0)
      delete e.targets
    if (e.enabled !== true)
      delete e.enabled
    if (e.mode !== 'session' && e.mode !== 'targets' && e.mode !== 'both')
      delete e.mode
    if (Object.keys(e).length === 0)
      delete a.exec
  }
  if (Object.keys(a).length === 0)
    delete root.approvals
}

const approvalsExecEnabled = computed({
  get() {
    const ap = draftConfig.value?.approvals as Record<string, unknown> | undefined
    const exec = ap?.exec as Record<string, unknown> | undefined
    return exec?.enabled === true
  },
  set(v: boolean) {
    const e = ensureApprovalsExecNode()
    if (!v) {
      delete e.enabled
      cleanupEmptyApprovalsNode()
      return
    }
    e.enabled = true
  },
})

const approvalsExecModeSelect = computed({
  get() {
    const ap = draftConfig.value?.approvals as Record<string, unknown> | undefined
    const exec = ap?.exec as Record<string, unknown> | undefined
    const m = exec?.mode
    if (m === 'session' || m === 'targets' || m === 'both')
      return m
    return APPROVALS_MODE_AUTO
  },
  set(v: string) {
    const e = ensureApprovalsExecNode()
    if (v === APPROVALS_MODE_AUTO) {
      delete e.mode
    }
    else if (v === 'session' || v === 'targets' || v === 'both') {
      e.mode = v
    }
    cleanupEmptyApprovalsNode()
  },
})

function approvalsAgentFilterToJson(): string {
  const ap = draftConfig.value?.approvals as Record<string, unknown> | undefined
  const exec = ap?.exec as Record<string, unknown> | undefined
  const a = exec?.agentFilter
  if (!Array.isArray(a))
    return '[]'
  try {
    return JSON.stringify(a, null, 2)
  }
  catch {
    return '[]'
  }
}

function approvalsSessionFilterToJson(): string {
  const ap = draftConfig.value?.approvals as Record<string, unknown> | undefined
  const exec = ap?.exec as Record<string, unknown> | undefined
  const a = exec?.sessionFilter
  if (!Array.isArray(a))
    return '[]'
  try {
    return JSON.stringify(a, null, 2)
  }
  catch {
    return '[]'
  }
}

const APPROVALS_TARGET_ROW_TEMPLATE = `{
  "channel": "",
  "to": ""
}`

const approvalsAgentFilterJsonLocal = ref('')
const approvalsSessionFilterJsonLocal = ref('')
const approvalsTargetsRowJsonLocal = ref<string[]>([])

function syncApprovalsTargetsRowsFromDraft() {
  const ap = draftConfig.value?.approvals as Record<string, unknown> | undefined
  const exec = ap?.exec as Record<string, unknown> | undefined
  const a = exec?.targets
  if (!Array.isArray(a)) {
    approvalsTargetsRowJsonLocal.value = []
    return
  }
  approvalsTargetsRowJsonLocal.value = a.map((item) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      try {
        return JSON.stringify(item, null, 2)
      }
      catch {
        return '{}'
      }
    }
    return '{}'
  })
}

function normalizeApprovalsTargetObject(o: Record<string, unknown>): Record<string, unknown> | null {
  const channel = typeof o.channel === 'string' ? o.channel.trim() : ''
  const to = typeof o.to === 'string' ? o.to.trim() : ''
  if (!channel || !to)
    return null
  const t: Record<string, unknown> = { channel, to }
  if (typeof o.accountId === 'string' && o.accountId.trim())
    t.accountId = o.accountId.trim()
  if (typeof o.threadId === 'string' && o.threadId.trim())
    t.threadId = o.threadId.trim()
  else if (typeof o.threadId === 'number' && Number.isFinite(o.threadId))
    t.threadId = o.threadId
  return t
}

function commitApprovalsTargetsFromRows() {
  const e = ensureApprovalsExecNode()
  const out: Record<string, unknown>[] = []
  const newRows: string[] = []
  for (const raw of approvalsTargetsRowJsonLocal.value) {
    const t = raw.trim()
    if (!t) {
      newRows.push(raw)
      continue
    }
    try {
      const parsed = JSON.parse(t) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        syncApprovalsTargetsRowsFromDraft()
        return
      }
      const norm = normalizeApprovalsTargetObject(parsed as Record<string, unknown>)
      if (norm) {
        out.push(norm)
        newRows.push(JSON.stringify(norm, null, 2))
      }
      else {
        newRows.push(raw)
      }
    }
    catch {
      syncApprovalsTargetsRowsFromDraft()
      return
    }
  }
  approvalsTargetsRowJsonLocal.value = newRows
  if (out.length === 0)
    delete e.targets
  else e.targets = out
  cleanupEmptyApprovalsNode()
}

function addApprovalsTargetRow() {
  approvalsTargetsRowJsonLocal.value = [...approvalsTargetsRowJsonLocal.value, APPROVALS_TARGET_ROW_TEMPLATE]
}

function removeApprovalsTargetRow(i: number) {
  approvalsTargetsRowJsonLocal.value = approvalsTargetsRowJsonLocal.value.filter((_, j) => j !== i)
  commitApprovalsTargetsFromRows()
}

function applyApprovalsAgentFilterFromJson(raw: string) {
  try {
    const parsed = JSON.parse(raw.trim() || '[]')
    if (!Array.isArray(parsed)) {
      approvalsAgentFilterJsonLocal.value = approvalsAgentFilterToJson()
      return
    }
    const norm: string[] = []
    for (const x of parsed) {
      if (typeof x === 'string')
        norm.push(x)
    }
    const e = ensureApprovalsExecNode()
    if (norm.length === 0)
      delete e.agentFilter
    else e.agentFilter = norm
    cleanupEmptyApprovalsNode()
    approvalsAgentFilterJsonLocal.value = approvalsAgentFilterToJson()
  }
  catch {
    approvalsAgentFilterJsonLocal.value = approvalsAgentFilterToJson()
  }
}

function applyApprovalsSessionFilterFromJson(raw: string) {
  try {
    const parsed = JSON.parse(raw.trim() || '[]')
    if (!Array.isArray(parsed)) {
      approvalsSessionFilterJsonLocal.value = approvalsSessionFilterToJson()
      return
    }
    const norm: string[] = []
    for (const x of parsed) {
      if (typeof x === 'string')
        norm.push(x)
    }
    const e = ensureApprovalsExecNode()
    if (norm.length === 0)
      delete e.sessionFilter
    else e.sessionFilter = norm
    cleanupEmptyApprovalsNode()
    approvalsSessionFilterJsonLocal.value = approvalsSessionFilterToJson()
  }
  catch {
    approvalsSessionFilterJsonLocal.value = approvalsSessionFilterToJson()
  }
}

watch(
  () =>
    [settingsSubPage.value, activeSection.value, formMode.value, snapshot.value?.hash] as const,
  () => {
    if (formMode.value !== 'form')
      return
    if (
      settingsSubPage.value === 'automation'
      && (activeSection.value === null || activeSection.value === 'approvals')
    ) {
      approvalsAgentFilterJsonLocal.value = approvalsAgentFilterToJson()
      approvalsSessionFilterJsonLocal.value = approvalsSessionFilterToJson()
      syncApprovalsTargetsRowsFromDraft()
    }
  },
  { immediate: true },
)

/** —— Hooks 分区（对齐 zod-schema `hooks` 对象）—— */
function ensureHooksNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.hooks || typeof r.hooks !== 'object' || Array.isArray(r.hooks)) {
    r.hooks = {}
  }
  return r.hooks as Record<string, unknown>
}

function cleanupEmptyHooksNode() {
  const root = draftConfig.value
  if (!root?.hooks || typeof root.hooks !== 'object' || Array.isArray(root.hooks))
    return
  const h = root.hooks as Record<string, unknown>
  if (Array.isArray(h.mappings) && h.mappings.length === 0)
    delete h.mappings
  if (Array.isArray(h.presets) && h.presets.length === 0)
    delete h.presets
  if (Array.isArray(h.allowedSessionKeyPrefixes) && h.allowedSessionKeyPrefixes.length === 0) {
    delete h.allowedSessionKeyPrefixes
  }
  const g = h.gmail
  if (g && typeof g === 'object' && !Array.isArray(g) && Object.keys(g as object).length === 0) {
    delete h.gmail
  }
  const internal = h.internal
  if (
    internal
    && typeof internal === 'object'
    && !Array.isArray(internal)
    && Object.keys(internal as object).length === 0
  ) {
    delete h.internal
  }
  if (Object.keys(h).length === 0)
    delete root.hooks
}

const hooksEnabled = computed({
  get() {
    const h = draftConfig.value?.hooks as Record<string, unknown> | undefined
    return h?.enabled === true
  },
  set(v: boolean) {
    const h = ensureHooksNode()
    if (!v) {
      delete h.enabled
      cleanupEmptyHooksNode()
      return
    }
    h.enabled = true
  },
})

const hooksPath = computed({
  get() {
    const h = draftConfig.value?.hooks as Record<string, unknown> | undefined
    return typeof h?.path === 'string' ? h.path : ''
  },
  set(v: string) {
    const h = ensureHooksNode()
    const t = v.trim()
    if (!t) {
      delete h.path
      cleanupEmptyHooksNode()
      return
    }
    h.path = t
  },
})

const hooksToken = computed({
  get() {
    const h = draftConfig.value?.hooks as Record<string, unknown> | undefined
    return typeof h?.token === 'string' ? h.token : ''
  },
  set(v: string) {
    const h = ensureHooksNode()
    const t = v.trim()
    if (!t) {
      delete h.token
      cleanupEmptyHooksNode()
      return
    }
    h.token = t
  },
})

const hooksDefaultSessionKey = computed({
  get() {
    const h = draftConfig.value?.hooks as Record<string, unknown> | undefined
    return typeof h?.defaultSessionKey === 'string' ? h.defaultSessionKey : ''
  },
  set(v: string) {
    const h = ensureHooksNode()
    const t = v.trim()
    if (!t) {
      delete h.defaultSessionKey
      cleanupEmptyHooksNode()
      return
    }
    h.defaultSessionKey = t
  },
})

const hooksAllowRequestSessionKey = computed({
  get() {
    const h = draftConfig.value?.hooks as Record<string, unknown> | undefined
    return h?.allowRequestSessionKey === true
  },
  set(v: boolean) {
    const h = ensureHooksNode()
    if (!v) {
      delete h.allowRequestSessionKey
      cleanupEmptyHooksNode()
      return
    }
    h.allowRequestSessionKey = true
  },
})

const hooksMaxBodyBytes = computed({
  get() {
    const h = draftConfig.value?.hooks as Record<string, unknown> | undefined
    const n = h?.maxBodyBytes
    return typeof n === 'number' && Number.isFinite(n) ? String(n) : ''
  },
  set(v: string) {
    const h = ensureHooksNode()
    const t = v.trim()
    if (!t) {
      delete h.maxBodyBytes
      cleanupEmptyHooksNode()
      return
    }
    const n = Number.parseInt(t, 10)
    if (!Number.isFinite(n) || n < 1)
      return
    h.maxBodyBytes = n
  },
})

const hooksTransformsDir = computed({
  get() {
    const h = draftConfig.value?.hooks as Record<string, unknown> | undefined
    return typeof h?.transformsDir === 'string' ? h.transformsDir : ''
  },
  set(v: string) {
    const h = ensureHooksNode()
    const t = v.trim()
    if (!t) {
      delete h.transformsDir
      cleanupEmptyHooksNode()
      return
    }
    h.transformsDir = t
  },
})

const hooksAllowedAgentIdsRows = ref<string[]>([])

function syncHooksAllowedAgentIdsRowsFromDraft() {
  const h = draftConfig.value?.hooks as Record<string, unknown> | undefined
  const a = h?.allowedAgentIds
  if (!Array.isArray(a)) {
    hooksAllowedAgentIdsRows.value = []
    return
  }
  hooksAllowedAgentIdsRows.value = a.map(x => (typeof x === 'string' ? x : String(x)))
}

function applyHooksAllowedAgentIdsFromRows() {
  const trimmed = hooksAllowedAgentIdsRows.value.map(s => s.trim()).filter(s => s.length > 0)
  const h = ensureHooksNode()
  if (trimmed.length === 0)
    delete h.allowedAgentIds
  else h.allowedAgentIds = trimmed
  cleanupEmptyHooksNode()
}

function addHooksAllowedAgentIdRow() {
  hooksAllowedAgentIdsRows.value = [...hooksAllowedAgentIdsRows.value, '']
}

function removeHooksAllowedAgentIdRow(i: number) {
  const next = hooksAllowedAgentIdsRows.value.filter((_, j) => j !== i)
  hooksAllowedAgentIdsRows.value = next
  applyHooksAllowedAgentIdsFromRows()
}

function updateHooksAllowedAgentIdRow(i: number, v: string) {
  const next = [...hooksAllowedAgentIdsRows.value]
  next[i] = v
  hooksAllowedAgentIdsRows.value = next
}

function hooksAllowedSessionKeyPrefixesToJson(): string {
  const h = draftConfig.value?.hooks as Record<string, unknown> | undefined
  const a = h?.allowedSessionKeyPrefixes
  if (!Array.isArray(a))
    return '[]'
  try {
    return JSON.stringify(a, null, 2)
  }
  catch {
    return '[]'
  }
}

function hooksPresetsToJson(): string {
  const h = draftConfig.value?.hooks as Record<string, unknown> | undefined
  const a = h?.presets
  if (!Array.isArray(a))
    return '[]'
  try {
    return JSON.stringify(a, null, 2)
  }
  catch {
    return '[]'
  }
}

function hooksMappingsToJson(): string {
  const h = draftConfig.value?.hooks as Record<string, unknown> | undefined
  const a = h?.mappings
  if (!Array.isArray(a))
    return '[]'
  try {
    return JSON.stringify(a, null, 2)
  }
  catch {
    return '[]'
  }
}

function hooksGmailToJson(): string {
  const h = draftConfig.value?.hooks as Record<string, unknown> | undefined
  const g = h?.gmail
  if (!g || typeof g !== 'object' || Array.isArray(g))
    return '{}'
  try {
    return JSON.stringify(g, null, 2)
  }
  catch {
    return '{}'
  }
}

function hooksInternalToJson(): string {
  const h = draftConfig.value?.hooks as Record<string, unknown> | undefined
  const internal = h?.internal
  if (!internal || typeof internal !== 'object' || Array.isArray(internal))
    return '{}'
  try {
    return JSON.stringify(internal, null, 2)
  }
  catch {
    return '{}'
  }
}

const hooksAllowedSessionKeyPrefixesJsonLocal = ref('')
const hooksPresetsJsonLocal = ref('')
const hooksMappingsJsonLocal = ref('')
const hooksGmailJsonLocal = ref('')
const hooksInternalJsonLocal = ref('')

function applyHooksAllowedSessionKeyPrefixesFromJson(raw: string) {
  try {
    const parsed = JSON.parse(raw.trim() || '[]')
    if (!Array.isArray(parsed)) {
      hooksAllowedSessionKeyPrefixesJsonLocal.value = hooksAllowedSessionKeyPrefixesToJson()
      return
    }
    const norm: string[] = []
    for (const x of parsed) {
      if (typeof x === 'string')
        norm.push(x)
    }
    const h = ensureHooksNode()
    if (norm.length === 0)
      delete h.allowedSessionKeyPrefixes
    else h.allowedSessionKeyPrefixes = norm
    cleanupEmptyHooksNode()
    hooksAllowedSessionKeyPrefixesJsonLocal.value = hooksAllowedSessionKeyPrefixesToJson()
  }
  catch {
    hooksAllowedSessionKeyPrefixesJsonLocal.value = hooksAllowedSessionKeyPrefixesToJson()
  }
}

function applyHooksPresetsFromJson(raw: string) {
  try {
    const parsed = JSON.parse(raw.trim() || '[]')
    if (!Array.isArray(parsed)) {
      hooksPresetsJsonLocal.value = hooksPresetsToJson()
      return
    }
    const norm: string[] = []
    for (const x of parsed) {
      if (typeof x === 'string')
        norm.push(x)
    }
    const h = ensureHooksNode()
    if (norm.length === 0)
      delete h.presets
    else h.presets = norm
    cleanupEmptyHooksNode()
    hooksPresetsJsonLocal.value = hooksPresetsToJson()
  }
  catch {
    hooksPresetsJsonLocal.value = hooksPresetsToJson()
  }
}

function applyHooksMappingsFromJson(raw: string) {
  try {
    const parsed = JSON.parse(raw.trim() || '[]')
    if (!Array.isArray(parsed)) {
      hooksMappingsJsonLocal.value = hooksMappingsToJson()
      return
    }
    const norm: unknown[] = []
    for (const item of parsed) {
      if (item && typeof item === 'object' && !Array.isArray(item))
        norm.push(item)
    }
    const h = ensureHooksNode()
    if (norm.length === 0)
      delete h.mappings
    else h.mappings = norm
    cleanupEmptyHooksNode()
    hooksMappingsJsonLocal.value = hooksMappingsToJson()
  }
  catch {
    hooksMappingsJsonLocal.value = hooksMappingsToJson()
  }
}

function applyHooksGmailFromJson(raw: string) {
  try {
    const parsed = JSON.parse(raw.trim() || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      hooksGmailJsonLocal.value = hooksGmailToJson()
      return
    }
    const h = ensureHooksNode()
    if (Object.keys(parsed as object).length === 0)
      delete h.gmail
    else h.gmail = parsed as Record<string, unknown>
    cleanupEmptyHooksNode()
    hooksGmailJsonLocal.value = hooksGmailToJson()
  }
  catch {
    hooksGmailJsonLocal.value = hooksGmailToJson()
  }
}

function applyHooksInternalFromJson(raw: string) {
  try {
    const parsed = JSON.parse(raw.trim() || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      hooksInternalJsonLocal.value = hooksInternalToJson()
      return
    }
    const h = ensureHooksNode()
    if (Object.keys(parsed as object).length === 0)
      delete h.internal
    else h.internal = parsed as Record<string, unknown>
    cleanupEmptyHooksNode()
    hooksInternalJsonLocal.value = hooksInternalToJson()
  }
  catch {
    hooksInternalJsonLocal.value = hooksInternalToJson()
  }
}

watch(
  () =>
    [settingsSubPage.value, activeSection.value, formMode.value, snapshot.value?.hash] as const,
  () => {
    if (formMode.value !== 'form')
      return
    if (settingsSubPage.value === 'automation' && activeSection.value === 'hooks') {
      syncHooksAllowedAgentIdsRowsFromDraft()
      hooksAllowedSessionKeyPrefixesJsonLocal.value = hooksAllowedSessionKeyPrefixesToJson()
      hooksPresetsJsonLocal.value = hooksPresetsToJson()
      hooksMappingsJsonLocal.value = hooksMappingsToJson()
      hooksGmailJsonLocal.value = hooksGmailToJson()
      hooksInternalJsonLocal.value = hooksInternalToJson()
    }
  },
  { immediate: true },
)

/** —— Bindings 分区（对齐 zod-schema.agents `BindingsSchema`）—— */
const BINDINGS_ROUTE_ROW_TEMPLATE = `{
  "agentId": "",
  "match": {
    "channel": "telegram"
  }
}`

const bindingsRowJsonLocal = ref<string[]>([])

function syncBindingsRowsFromDraft() {
  const b = draftConfig.value?.bindings
  if (!Array.isArray(b)) {
    bindingsRowJsonLocal.value = []
    return
  }
  bindingsRowJsonLocal.value = b.map((item) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      try {
        return JSON.stringify(item, null, 2)
      }
      catch {
        return '{}'
      }
    }
    return '{}'
  })
}

function commitBindingsFromRows() {
  const root = draftConfig.value
  if (!root)
    return
  const out: unknown[] = []
  const newRows: string[] = []
  for (const raw of bindingsRowJsonLocal.value) {
    const t = raw.trim()
    if (!t)
      continue
    try {
      const p = JSON.parse(t) as unknown
      if (p && typeof p === 'object' && !Array.isArray(p)) {
        out.push(p)
        newRows.push(JSON.stringify(p, null, 2))
      }
      else {
        syncBindingsRowsFromDraft()
        return
      }
    }
    catch {
      syncBindingsRowsFromDraft()
      return
    }
  }
  bindingsRowJsonLocal.value = newRows
  if (out.length === 0)
    delete root.bindings
  else root.bindings = out
}

function addBindingsRow() {
  bindingsRowJsonLocal.value = [...bindingsRowJsonLocal.value, BINDINGS_ROUTE_ROW_TEMPLATE]
  commitBindingsFromRows()
}

function removeBindingsRow(i: number) {
  bindingsRowJsonLocal.value = bindingsRowJsonLocal.value.filter((_, j) => j !== i)
  commitBindingsFromRows()
}

watch(
  () =>
    [settingsSubPage.value, activeSection.value, formMode.value, snapshot.value?.hash] as const,
  () => {
    if (formMode.value !== 'form')
      return
    if (settingsSubPage.value === 'automation' && activeSection.value === 'bindings') {
      syncBindingsRowsFromDraft()
    }
  },
  { immediate: true },
)

/** —— Cron 分区（对齐 zod-schema `cron` 对象）—— */
const CRON_FAILURE_MODE_AUTO = '__auto__'
const CRON_RETRY_ON_VALUES = [
  'rate_limit',
  'overloaded',
  'network',
  'timeout',
  'server_error',
] as const

function ensureCronNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.cron || typeof r.cron !== 'object' || Array.isArray(r.cron)) {
    r.cron = {}
  }
  return r.cron as Record<string, unknown>
}

function pruneEmptyNested(parent: Record<string, unknown>, key: string) {
  const v = parent[key]
  if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0) {
    delete parent[key]
  }
}

function cleanupEmptyCronNode() {
  const root = draftConfig.value
  if (!root?.cron || typeof root.cron !== 'object' || Array.isArray(root.cron))
    return
  const c = root.cron as Record<string, unknown>
  const retry = c.retry
  if (retry && typeof retry === 'object' && !Array.isArray(retry)) {
    const r = retry as Record<string, unknown>
    if (Array.isArray(r.backoffMs) && r.backoffMs.length === 0)
      delete r.backoffMs
    if (Array.isArray(r.retryOn) && r.retryOn.length === 0)
      delete r.retryOn
    pruneEmptyNested(c, 'retry')
  }
  const runLog = c.runLog
  if (runLog && typeof runLog === 'object' && !Array.isArray(runLog)) {
    const rl = runLog as Record<string, unknown>
    if (rl.maxBytes === '' || rl.maxBytes === undefined) {
      delete rl.maxBytes
    }
    if (rl.keepLines === undefined) {
      delete rl.keepLines
    }
    pruneEmptyNested(c, 'runLog')
  }
  const fa = c.failureAlert
  if (fa && typeof fa === 'object' && !Array.isArray(fa)) {
    pruneEmptyNested(c, 'failureAlert')
  }
  const fd = c.failureDestination
  if (fd && typeof fd === 'object' && !Array.isArray(fd)) {
    pruneEmptyNested(c, 'failureDestination')
  }
  if (Object.keys(c).length === 0)
    delete root.cron
}

const cronEnabled = computed({
  get() {
    const c = draftConfig.value?.cron as Record<string, unknown> | undefined
    return c?.enabled !== false
  },
  set(v: boolean) {
    const h = ensureCronNode()
    if (v) {
      delete h.enabled
    }
    else {
      h.enabled = false
    }
    cleanupEmptyCronNode()
  },
})

const cronStore = computed({
  get() {
    const c = draftConfig.value?.cron as Record<string, unknown> | undefined
    return typeof c?.store === 'string' ? c.store : ''
  },
  set(v: string) {
    const h = ensureCronNode()
    const t = v.trim()
    if (!t) {
      delete h.store
      cleanupEmptyCronNode()
      return
    }
    h.store = t
  },
})

const cronMaxConcurrentRuns = computed({
  get() {
    const c = draftConfig.value?.cron as Record<string, unknown> | undefined
    const n = c?.maxConcurrentRuns
    return typeof n === 'number' && Number.isFinite(n) ? String(n) : ''
  },
  set(v: string) {
    const h = ensureCronNode()
    const t = v.trim()
    if (!t) {
      delete h.maxConcurrentRuns
      cleanupEmptyCronNode()
      return
    }
    const n = Number.parseInt(t, 10)
    if (!Number.isFinite(n) || n < 1)
      return
    h.maxConcurrentRuns = n
  },
})

const cronSessionRetentionText = computed({
  get() {
    const c = draftConfig.value?.cron as Record<string, unknown> | undefined
    const v = c?.sessionRetention
    if (v === false)
      return 'false'
    if (typeof v === 'string')
      return v
    return ''
  },
  set(v: string) {
    const h = ensureCronNode()
    const t = v.trim()
    if (!t) {
      delete h.sessionRetention
      cleanupEmptyCronNode()
      return
    }
    if (t.toLowerCase() === 'false') {
      h.sessionRetention = false
      cleanupEmptyCronNode()
      return
    }
    h.sessionRetention = t
  },
})

function ensureCronRetryNode(): Record<string, unknown> {
  const c = ensureCronNode()
  if (!c.retry || typeof c.retry !== 'object' || Array.isArray(c.retry)) {
    c.retry = {}
  }
  return c.retry as Record<string, unknown>
}

const cronRetryMaxAttempts = computed({
  get() {
    const r = draftConfig.value?.cron as Record<string, unknown> | undefined
    const retry = r?.retry as Record<string, unknown> | undefined
    const n = retry?.maxAttempts
    return typeof n === 'number' && Number.isFinite(n) ? String(n) : ''
  },
  set(v: string) {
    const h = ensureCronRetryNode()
    const t = v.trim()
    if (!t) {
      delete h.maxAttempts
      const c = ensureCronNode()
      pruneEmptyNested(c, 'retry')
      cleanupEmptyCronNode()
      return
    }
    const n = Number.parseInt(t, 10)
    if (!Number.isFinite(n) || n < 0 || n > 10)
      return
    h.maxAttempts = n
  },
})

function cronRetryBackoffMsToJson(): string {
  const r = draftConfig.value?.cron as Record<string, unknown> | undefined
  const retry = r?.retry as Record<string, unknown> | undefined
  const a = retry?.backoffMs
  if (!Array.isArray(a))
    return '[]'
  try {
    return JSON.stringify(a, null, 2)
  }
  catch {
    return '[]'
  }
}

function cronRetryRetryOnToJson(): string {
  const r = draftConfig.value?.cron as Record<string, unknown> | undefined
  const retry = r?.retry as Record<string, unknown> | undefined
  const a = retry?.retryOn
  if (!Array.isArray(a))
    return '[]'
  try {
    return JSON.stringify(a, null, 2)
  }
  catch {
    return '[]'
  }
}

const cronRetryBackoffMsJsonLocal = ref('')
const cronRetryRetryOnJsonLocal = ref('')

function applyCronRetryBackoffMsFromJson(raw: string) {
  try {
    const parsed = JSON.parse(raw.trim() || '[]')
    if (!Array.isArray(parsed)) {
      cronRetryBackoffMsJsonLocal.value = cronRetryBackoffMsToJson()
      return
    }
    const norm: number[] = []
    for (const x of parsed) {
      if (typeof x === 'number' && Number.isFinite(x) && x >= 0)
        norm.push(Math.floor(x))
    }
    const h = ensureCronRetryNode()
    if (norm.length === 0)
      delete h.backoffMs
    else h.backoffMs = norm.slice(0, 10)
    const c = ensureCronNode()
    pruneEmptyNested(c, 'retry')
    cleanupEmptyCronNode()
    cronRetryBackoffMsJsonLocal.value = cronRetryBackoffMsToJson()
  }
  catch {
    cronRetryBackoffMsJsonLocal.value = cronRetryBackoffMsToJson()
  }
}

function applyCronRetryRetryOnFromJson(raw: string) {
  try {
    const parsed = JSON.parse(raw.trim() || '[]')
    if (!Array.isArray(parsed)) {
      cronRetryRetryOnJsonLocal.value = cronRetryRetryOnToJson()
      return
    }
    const allowed = new Set<string>(CRON_RETRY_ON_VALUES)
    const norm: string[] = []
    for (const x of parsed) {
      if (typeof x === 'string' && allowed.has(x))
        norm.push(x)
    }
    const h = ensureCronRetryNode()
    if (norm.length === 0)
      delete h.retryOn
    else h.retryOn = norm
    const c = ensureCronNode()
    pruneEmptyNested(c, 'retry')
    cleanupEmptyCronNode()
    cronRetryRetryOnJsonLocal.value = cronRetryRetryOnToJson()
  }
  catch {
    cronRetryRetryOnJsonLocal.value = cronRetryRetryOnToJson()
  }
}

const cronWebhook = computed({
  get() {
    const c = draftConfig.value?.cron as Record<string, unknown> | undefined
    return typeof c?.webhook === 'string' ? c.webhook : ''
  },
  set(v: string) {
    const h = ensureCronNode()
    const t = v.trim()
    if (!t) {
      delete h.webhook
      cleanupEmptyCronNode()
      return
    }
    h.webhook = t
  },
})

const cronWebhookToken = computed({
  get() {
    const c = draftConfig.value?.cron as Record<string, unknown> | undefined
    return typeof c?.webhookToken === 'string' ? c.webhookToken : ''
  },
  set(v: string) {
    const h = ensureCronNode()
    const t = v.trim()
    if (!t) {
      delete h.webhookToken
      cleanupEmptyCronNode()
      return
    }
    h.webhookToken = t
  },
})

const cronRunLogMaxBytes = computed({
  get() {
    const c = draftConfig.value?.cron as Record<string, unknown> | undefined
    const rl = c?.runLog as Record<string, unknown> | undefined
    const v = rl?.maxBytes
    if (typeof v === 'number' && Number.isFinite(v))
      return String(v)
    if (typeof v === 'string')
      return v
    return ''
  },
  set(v: string) {
    const c = ensureCronNode()
    if (!c.runLog || typeof c.runLog !== 'object' || Array.isArray(c.runLog)) {
      c.runLog = {}
    }
    const rl = c.runLog as Record<string, unknown>
    const t = v.trim()
    if (!t) {
      delete rl.maxBytes
      pruneEmptyNested(c, 'runLog')
      cleanupEmptyCronNode()
      return
    }
    if (/^\d+$/.test(t)) {
      rl.maxBytes = Number.parseInt(t, 10)
    }
    else {
      rl.maxBytes = t
    }
  },
})

const cronRunLogKeepLines = computed({
  get() {
    const c = draftConfig.value?.cron as Record<string, unknown> | undefined
    const rl = c?.runLog as Record<string, unknown> | undefined
    const n = rl?.keepLines
    return typeof n === 'number' && Number.isFinite(n) ? String(n) : ''
  },
  set(v: string) {
    const c = ensureCronNode()
    if (!c.runLog || typeof c.runLog !== 'object' || Array.isArray(c.runLog)) {
      c.runLog = {}
    }
    const rl = c.runLog as Record<string, unknown>
    const t = v.trim()
    if (!t) {
      delete rl.keepLines
      pruneEmptyNested(c, 'runLog')
      cleanupEmptyCronNode()
      return
    }
    const n = Number.parseInt(t, 10)
    if (!Number.isFinite(n) || n < 1)
      return
    rl.keepLines = n
  },
})

function ensureCronFailureAlertNode(): Record<string, unknown> {
  const c = ensureCronNode()
  if (!c.failureAlert || typeof c.failureAlert !== 'object' || Array.isArray(c.failureAlert)) {
    c.failureAlert = {}
  }
  return c.failureAlert as Record<string, unknown>
}

const cronFailureAlertEnabled = computed({
  get() {
    const c = draftConfig.value?.cron as Record<string, unknown> | undefined
    const fa = c?.failureAlert as Record<string, unknown> | undefined
    return fa?.enabled === true
  },
  set(v: boolean) {
    const h = ensureCronFailureAlertNode()
    if (!v) {
      delete h.enabled
      const cr = ensureCronNode()
      pruneEmptyNested(cr, 'failureAlert')
      cleanupEmptyCronNode()
      return
    }
    h.enabled = true
  },
})

const cronFailureAlertAfter = computed({
  get() {
    const c = draftConfig.value?.cron as Record<string, unknown> | undefined
    const fa = c?.failureAlert as Record<string, unknown> | undefined
    const n = fa?.after
    return typeof n === 'number' && Number.isFinite(n) ? String(n) : ''
  },
  set(v: string) {
    const h = ensureCronFailureAlertNode()
    const t = v.trim()
    if (!t) {
      delete h.after
      const cr = ensureCronNode()
      pruneEmptyNested(cr, 'failureAlert')
      cleanupEmptyCronNode()
      return
    }
    const n = Number.parseInt(t, 10)
    if (!Number.isFinite(n) || n < 1)
      return
    h.after = n
  },
})

const cronFailureAlertCooldownMs = computed({
  get() {
    const c = draftConfig.value?.cron as Record<string, unknown> | undefined
    const fa = c?.failureAlert as Record<string, unknown> | undefined
    const n = fa?.cooldownMs
    return typeof n === 'number' && Number.isFinite(n) ? String(n) : ''
  },
  set(v: string) {
    const h = ensureCronFailureAlertNode()
    const t = v.trim()
    if (!t) {
      delete h.cooldownMs
      const cr = ensureCronNode()
      pruneEmptyNested(cr, 'failureAlert')
      cleanupEmptyCronNode()
      return
    }
    const n = Number.parseInt(t, 10)
    if (!Number.isFinite(n) || n < 0)
      return
    h.cooldownMs = n
  },
})

const cronFailureAlertModeSelect = computed({
  get() {
    const c = draftConfig.value?.cron as Record<string, unknown> | undefined
    const fa = c?.failureAlert as Record<string, unknown> | undefined
    const m = fa?.mode
    if (m === 'announce' || m === 'webhook')
      return m
    return CRON_FAILURE_MODE_AUTO
  },
  set(v: string) {
    const h = ensureCronFailureAlertNode()
    if (v === CRON_FAILURE_MODE_AUTO) {
      delete h.mode
    }
    else if (v === 'announce' || v === 'webhook') {
      h.mode = v
    }
    const cr = ensureCronNode()
    pruneEmptyNested(cr, 'failureAlert')
    cleanupEmptyCronNode()
  },
})

const cronFailureAlertAccountId = computed({
  get() {
    const c = draftConfig.value?.cron as Record<string, unknown> | undefined
    const fa = c?.failureAlert as Record<string, unknown> | undefined
    return typeof fa?.accountId === 'string' ? fa.accountId : ''
  },
  set(v: string) {
    const h = ensureCronFailureAlertNode()
    const t = v.trim()
    if (!t) {
      delete h.accountId
      const cr = ensureCronNode()
      pruneEmptyNested(cr, 'failureAlert')
      cleanupEmptyCronNode()
      return
    }
    h.accountId = t
  },
})

function ensureCronFailureDestinationNode(): Record<string, unknown> {
  const c = ensureCronNode()
  if (
    !c.failureDestination
    || typeof c.failureDestination !== 'object'
    || Array.isArray(c.failureDestination)
  ) {
    c.failureDestination = {}
  }
  return c.failureDestination as Record<string, unknown>
}

const cronFailureDestChannel = computed({
  get() {
    const c = draftConfig.value?.cron as Record<string, unknown> | undefined
    const fd = c?.failureDestination as Record<string, unknown> | undefined
    return typeof fd?.channel === 'string' ? fd.channel : ''
  },
  set(v: string) {
    const h = ensureCronFailureDestinationNode()
    const t = v.trim()
    if (!t) {
      delete h.channel
      const cr = ensureCronNode()
      pruneEmptyNested(cr, 'failureDestination')
      cleanupEmptyCronNode()
      return
    }
    h.channel = t
  },
})

const cronFailureDestTo = computed({
  get() {
    const c = draftConfig.value?.cron as Record<string, unknown> | undefined
    const fd = c?.failureDestination as Record<string, unknown> | undefined
    return typeof fd?.to === 'string' ? fd.to : ''
  },
  set(v: string) {
    const h = ensureCronFailureDestinationNode()
    const t = v.trim()
    if (!t) {
      delete h.to
      const cr = ensureCronNode()
      pruneEmptyNested(cr, 'failureDestination')
      cleanupEmptyCronNode()
      return
    }
    h.to = t
  },
})

const cronFailureDestAccountId = computed({
  get() {
    const c = draftConfig.value?.cron as Record<string, unknown> | undefined
    const fd = c?.failureDestination as Record<string, unknown> | undefined
    return typeof fd?.accountId === 'string' ? fd.accountId : ''
  },
  set(v: string) {
    const h = ensureCronFailureDestinationNode()
    const t = v.trim()
    if (!t) {
      delete h.accountId
      const cr = ensureCronNode()
      pruneEmptyNested(cr, 'failureDestination')
      cleanupEmptyCronNode()
      return
    }
    h.accountId = t
  },
})

const cronFailureDestModeSelect = computed({
  get() {
    const c = draftConfig.value?.cron as Record<string, unknown> | undefined
    const fd = c?.failureDestination as Record<string, unknown> | undefined
    const m = fd?.mode
    if (m === 'announce' || m === 'webhook')
      return m
    return CRON_FAILURE_MODE_AUTO
  },
  set(v: string) {
    const h = ensureCronFailureDestinationNode()
    if (v === CRON_FAILURE_MODE_AUTO) {
      delete h.mode
    }
    else if (v === 'announce' || v === 'webhook') {
      h.mode = v
    }
    const cr = ensureCronNode()
    pruneEmptyNested(cr, 'failureDestination')
    cleanupEmptyCronNode()
  },
})

watch(
  () =>
    [settingsSubPage.value, activeSection.value, formMode.value, snapshot.value?.hash] as const,
  () => {
    if (formMode.value !== 'form')
      return
    if (settingsSubPage.value === 'automation' && activeSection.value === 'cron') {
      cronRetryBackoffMsJsonLocal.value = cronRetryBackoffMsToJson()
      cronRetryRetryOnJsonLocal.value = cronRetryRetryOnToJson()
    }
  },
  { immediate: true },
)

/** —— Plugins 分区（对齐 zod-schema `plugins`：enabled、allow、deny）—— */
function ensurePluginsNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.plugins || typeof r.plugins !== 'object' || Array.isArray(r.plugins)) {
    r.plugins = {}
  }
  return r.plugins as Record<string, unknown>
}

function cleanupEmptyPluginsNode() {
  const root = draftConfig.value
  if (!root?.plugins || typeof root.plugins !== 'object' || Array.isArray(root.plugins))
    return
  const p = root.plugins as Record<string, unknown>
  if (Array.isArray(p.allow) && p.allow.length === 0)
    delete p.allow
  if (Array.isArray(p.deny) && p.deny.length === 0)
    delete p.deny
  const nonemptyObj = (v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length > 0
  if (
    !nonemptyObj(p.load)
    && !nonemptyObj(p.slots)
    && !nonemptyObj(p.entries)
    && !nonemptyObj(p.installs)
    && !p.allow
    && !p.deny
    && p.enabled !== false
  ) {
    delete root.plugins
  }
}

const pluginsEnabled = computed({
  get() {
    const p = draftConfig.value?.plugins
    if (!p || typeof p !== 'object' || Array.isArray(p))
      return true
    return (p as Record<string, unknown>).enabled !== false
  },
  set(v: boolean) {
    const n = ensurePluginsNode()
    if (v)
      delete n.enabled
    else n.enabled = false
    cleanupEmptyPluginsNode()
  },
})

const pluginsAllowRows = ref<string[]>([])
const pluginsDenyRows = ref<string[]>([])

function syncPluginsAllowRowsFromDraft() {
  const p = draftConfig.value?.plugins as Record<string, unknown> | undefined
  const a = p?.allow
  if (!Array.isArray(a)) {
    pluginsAllowRows.value = []
    return
  }
  pluginsAllowRows.value = a.map(x => (typeof x === 'string' ? x : String(x)))
}

function syncPluginsDenyRowsFromDraft() {
  const p = draftConfig.value?.plugins as Record<string, unknown> | undefined
  const a = p?.deny
  if (!Array.isArray(a)) {
    pluginsDenyRows.value = []
    return
  }
  pluginsDenyRows.value = a.map(x => (typeof x === 'string' ? x : String(x)))
}

function applyPluginsAllowFromRows() {
  const trimmed = pluginsAllowRows.value.map(s => s.trim()).filter(s => s.length > 0)
  const pl = ensurePluginsNode()
  if (trimmed.length === 0)
    delete pl.allow
  else pl.allow = trimmed
  cleanupEmptyPluginsNode()
}

function applyPluginsDenyFromRows() {
  const trimmed = pluginsDenyRows.value.map(s => s.trim()).filter(s => s.length > 0)
  const pl = ensurePluginsNode()
  if (trimmed.length === 0)
    delete pl.deny
  else pl.deny = trimmed
  cleanupEmptyPluginsNode()
}

function addPluginsAllowRow() {
  pluginsAllowRows.value = [...pluginsAllowRows.value, '']
}

function removePluginsAllowRow(i: number) {
  pluginsAllowRows.value = pluginsAllowRows.value.filter((_, j) => j !== i)
  applyPluginsAllowFromRows()
}

function updatePluginsAllowRow(i: number, v: string) {
  const next = [...pluginsAllowRows.value]
  next[i] = v
  pluginsAllowRows.value = next
}

function addPluginsDenyRow() {
  pluginsDenyRows.value = [...pluginsDenyRows.value, '']
}

function removePluginsDenyRow(i: number) {
  pluginsDenyRows.value = pluginsDenyRows.value.filter((_, j) => j !== i)
  applyPluginsDenyFromRows()
}

function updatePluginsDenyRow(i: number, v: string) {
  const next = [...pluginsDenyRows.value]
  next[i] = v
  pluginsDenyRows.value = next
}

watch(
  () =>
    [settingsSubPage.value, activeSection.value, formMode.value, snapshot.value?.hash] as const,
  () => {
    if (formMode.value !== 'form')
      return
    if (settingsSubPage.value === 'automation' && activeSection.value === 'plugins') {
      syncPluginsAllowRowsFromDraft()
      syncPluginsDenyRowsFromDraft()
    }
  },
  { immediate: true },
)

/** Select value：省略顶层字段（与 zod optional 一致） */
const GW_CFG_OMIT = '__omit__'
const GW_GATEWAY_BIND_VALUES = ['auto', 'lan', 'loopback', 'custom', 'tailnet'] as const
const GW_GATEWAY_RELOAD_MODES = ['off', 'restart', 'hot', 'hybrid'] as const

/** —— Infrastructure → Gateway（对齐 zod-schema `gateway`）—— */
function ensureConfigGatewayNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.gateway || typeof r.gateway !== 'object' || Array.isArray(r.gateway)) {
    r.gateway = {}
  }
  return r.gateway as Record<string, unknown>
}

function ensureConfigGatewayControlUiNode(): Record<string, unknown> {
  const g = ensureConfigGatewayNode()
  if (!g.controlUi || typeof g.controlUi !== 'object' || Array.isArray(g.controlUi)) {
    g.controlUi = {}
  }
  return g.controlUi as Record<string, unknown>
}

function ensureConfigGatewayAuthNode(): Record<string, unknown> {
  const g = ensureConfigGatewayNode()
  if (!g.auth || typeof g.auth !== 'object' || Array.isArray(g.auth)) {
    g.auth = {}
  }
  return g.auth as Record<string, unknown>
}

function ensureConfigGatewayToolsNode(): Record<string, unknown> {
  const g = ensureConfigGatewayNode()
  if (!g.tools || typeof g.tools !== 'object' || Array.isArray(g.tools)) {
    g.tools = {}
  }
  return g.tools as Record<string, unknown>
}

function ensureConfigGatewayTailscaleNode(): Record<string, unknown> {
  const g = ensureConfigGatewayNode()
  if (!g.tailscale || typeof g.tailscale !== 'object' || Array.isArray(g.tailscale)) {
    g.tailscale = {}
  }
  return g.tailscale as Record<string, unknown>
}

function ensureConfigGatewayRemoteNode(): Record<string, unknown> {
  const g = ensureConfigGatewayNode()
  if (!g.remote || typeof g.remote !== 'object' || Array.isArray(g.remote)) {
    g.remote = {}
  }
  return g.remote as Record<string, unknown>
}

function ensureConfigGatewayReloadNode(): Record<string, unknown> {
  const g = ensureConfigGatewayNode()
  if (!g.reload || typeof g.reload !== 'object' || Array.isArray(g.reload)) {
    g.reload = {}
  }
  return g.reload as Record<string, unknown>
}

function ensureConfigGatewayTlsNode(): Record<string, unknown> {
  const g = ensureConfigGatewayNode()
  if (!g.tls || typeof g.tls !== 'object' || Array.isArray(g.tls)) {
    g.tls = {}
  }
  return g.tls as Record<string, unknown>
}

function pruneIfEmptyChild(parent: Record<string, unknown>, key: string) {
  const v = parent[key]
  if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) {
    delete parent[key]
  }
}

function cleanupEmptyConfigGatewayNode() {
  const root = draftConfig.value
  if (!root?.gateway || typeof root.gateway !== 'object' || Array.isArray(root.gateway))
    return
  const g = root.gateway as Record<string, unknown>
  const auth = g.auth as Record<string, unknown> | undefined
  if (auth) {
    pruneIfEmptyChild(auth, 'rateLimit')
    pruneIfEmptyChild(auth, 'trustedProxy')
    if (Object.keys(auth).length === 0)
      delete g.auth
  }
  pruneIfEmptyChild(g, 'controlUi')
  pruneIfEmptyChild(g, 'tools')
  pruneIfEmptyChild(g, 'tailscale')
  pruneIfEmptyChild(g, 'remote')
  pruneIfEmptyChild(g, 'reload')
  pruneIfEmptyChild(g, 'tls')
  if (Object.keys(g).length === 0)
    delete root.gateway
}

/** 只读访问 draft.gateway；避免 `as T\n  ?.foo` 换行导致 Vue/Babel 解析失败 */
function getDraftGateway(): Record<string, unknown> | undefined {
  const g = draftConfig.value?.gateway
  if (!g || typeof g !== 'object' || Array.isArray(g))
    return undefined
  return g as Record<string, unknown>
}

/** —— Infrastructure → Web（对齐 zod-schema `web`）—— */
function ensureConfigWebNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.web || typeof r.web !== 'object' || Array.isArray(r.web)) {
    r.web = {}
  }
  return r.web as Record<string, unknown>
}

function ensureConfigWebReconnectNode(): Record<string, unknown> {
  const w = ensureConfigWebNode()
  if (!w.reconnect || typeof w.reconnect !== 'object' || Array.isArray(w.reconnect)) {
    w.reconnect = {}
  }
  return w.reconnect as Record<string, unknown>
}

function cleanupEmptyConfigWebNode() {
  const root = draftConfig.value
  if (!root?.web || typeof root.web !== 'object' || Array.isArray(root.web))
    return
  const w = root.web as Record<string, unknown>
  pruneIfEmptyChild(w, 'reconnect')
  if (Object.keys(w).length === 0)
    delete root.web
}

function getDraftWeb(): Record<string, unknown> | undefined {
  const x = draftConfig.value?.web
  if (!x || typeof x !== 'object' || Array.isArray(x))
    return undefined
  return x as Record<string, unknown>
}

const cfgWebEnabled = computed({
  get() {
    const w = getDraftWeb()
    if (!w)
      return true
    return w.enabled !== false
  },
  set(v: boolean) {
    const w = ensureConfigWebNode()
    if (v)
      delete w.enabled
    else w.enabled = false
    cleanupEmptyConfigWebNode()
  },
})

const cfgWebHeartbeatSeconds = computed({
  get() {
    const n = getDraftWeb()?.heartbeatSeconds
    if (typeof n === 'number' && Number.isInteger(n) && n > 0)
      return String(n)
    return ''
  },
  set(v: string) {
    const w = ensureConfigWebNode()
    const t = v.trim()
    if (!t) {
      delete w.heartbeatSeconds
      cleanupEmptyConfigWebNode()
      return
    }
    const num = Number.parseInt(t, 10)
    if (!Number.isInteger(num) || num <= 0)
      return
    w.heartbeatSeconds = num
    cleanupEmptyConfigWebNode()
  },
})

function webReconnectSub(): Record<string, unknown> | undefined {
  const r = getDraftWeb()?.reconnect
  if (r && typeof r === 'object' && !Array.isArray(r))
    return r as Record<string, unknown>
  return undefined
}

const cfgWebReconnectInitialMs = computed({
  get() {
    const n = webReconnectSub()?.initialMs
    if (typeof n === 'number' && Number.isFinite(n) && n > 0)
      return String(n)
    return ''
  },
  set(v: string) {
    const r = ensureConfigWebReconnectNode()
    const t = v.trim()
    if (!t) {
      delete r.initialMs
      cleanupEmptyConfigWebNode()
      return
    }
    const num = Number(t)
    if (!Number.isFinite(num) || num <= 0)
      return
    r.initialMs = num
    cleanupEmptyConfigWebNode()
  },
})

const cfgWebReconnectMaxMs = computed({
  get() {
    const n = webReconnectSub()?.maxMs
    if (typeof n === 'number' && Number.isFinite(n) && n > 0)
      return String(n)
    return ''
  },
  set(v: string) {
    const r = ensureConfigWebReconnectNode()
    const t = v.trim()
    if (!t) {
      delete r.maxMs
      cleanupEmptyConfigWebNode()
      return
    }
    const num = Number(t)
    if (!Number.isFinite(num) || num <= 0)
      return
    r.maxMs = num
    cleanupEmptyConfigWebNode()
  },
})

const cfgWebReconnectFactor = computed({
  get() {
    const n = webReconnectSub()?.factor
    if (typeof n === 'number' && Number.isFinite(n) && n > 0)
      return String(n)
    return ''
  },
  set(v: string) {
    const r = ensureConfigWebReconnectNode()
    const t = v.trim()
    if (!t) {
      delete r.factor
      cleanupEmptyConfigWebNode()
      return
    }
    const num = Number(t)
    if (!Number.isFinite(num) || num <= 0)
      return
    r.factor = num
    cleanupEmptyConfigWebNode()
  },
})

const cfgWebReconnectJitter = computed({
  get() {
    const n = webReconnectSub()?.jitter
    if (typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1)
      return String(n)
    return ''
  },
  set(v: string) {
    const r = ensureConfigWebReconnectNode()
    const t = v.trim()
    if (!t) {
      delete r.jitter
      cleanupEmptyConfigWebNode()
      return
    }
    const num = Number(t)
    if (!Number.isFinite(num) || num < 0 || num > 1)
      return
    r.jitter = num
    cleanupEmptyConfigWebNode()
  },
})

const cfgWebReconnectMaxAttempts = computed({
  get() {
    const n = webReconnectSub()?.maxAttempts
    if (typeof n === 'number' && Number.isInteger(n) && n >= 0)
      return String(n)
    return ''
  },
  set(v: string) {
    const r = ensureConfigWebReconnectNode()
    const t = v.trim()
    if (!t) {
      delete r.maxAttempts
      cleanupEmptyConfigWebNode()
      return
    }
    const num = Number.parseInt(t, 10)
    if (!Number.isInteger(num) || num < 0)
      return
    r.maxAttempts = num
    cleanupEmptyConfigWebNode()
  },
})

const BROWSER_SNAPSHOT_MODE_OMIT = '__omit__'

/** —— Infrastructure → Browser（对齐 zod-schema `browser`）—— */
function ensureConfigBrowserNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.browser || typeof r.browser !== 'object' || Array.isArray(r.browser)) {
    r.browser = {}
  }
  return r.browser as Record<string, unknown>
}

function ensureConfigBrowserSsrfNode(): Record<string, unknown> {
  const b = ensureConfigBrowserNode()
  if (!b.ssrfPolicy || typeof b.ssrfPolicy !== 'object' || Array.isArray(b.ssrfPolicy)) {
    b.ssrfPolicy = {}
  }
  return b.ssrfPolicy as Record<string, unknown>
}

function ensureConfigBrowserSnapshotDefaultsNode(): Record<string, unknown> {
  const b = ensureConfigBrowserNode()
  if (!b.snapshotDefaults || typeof b.snapshotDefaults !== 'object' || Array.isArray(b.snapshotDefaults)) {
    b.snapshotDefaults = {}
  }
  return b.snapshotDefaults as Record<string, unknown>
}

function cleanupEmptyConfigBrowserNode() {
  const root = draftConfig.value
  if (!root?.browser || typeof root.browser !== 'object' || Array.isArray(root.browser))
    return
  const b = root.browser as Record<string, unknown>
  pruneIfEmptyChild(b, 'ssrfPolicy')
  pruneIfEmptyChild(b, 'snapshotDefaults')
  const prof = b.profiles
  if (prof && typeof prof === 'object' && !Array.isArray(prof) && Object.keys(prof).length === 0) {
    delete b.profiles
  }
  if (Array.isArray(b.extraArgs) && b.extraArgs.length === 0)
    delete b.extraArgs
  if (Object.keys(b).length === 0)
    delete root.browser
}

function getDraftBrowser(): Record<string, unknown> | undefined {
  const x = draftConfig.value?.browser
  if (!x || typeof x !== 'object' || Array.isArray(x))
    return undefined
  return x as Record<string, unknown>
}

function browserSsrfSub(): Record<string, unknown> | undefined {
  const s = getDraftBrowser()?.ssrfPolicy
  if (s && typeof s === 'object' && !Array.isArray(s))
    return s as Record<string, unknown>
  return undefined
}

const cfgBrowserEnabled = computed({
  get() {
    const b = getDraftBrowser()
    if (!b)
      return true
    return b.enabled !== false
  },
  set(v: boolean) {
    const b = ensureConfigBrowserNode()
    if (v)
      delete b.enabled
    else b.enabled = false
    cleanupEmptyConfigBrowserNode()
  },
})

const cfgBrowserEvaluateEnabled = computed({
  get() {
    return getDraftBrowser()?.evaluateEnabled === true
  },
  set(v: boolean) {
    const b = ensureConfigBrowserNode()
    if (v)
      b.evaluateEnabled = true
    else delete b.evaluateEnabled
    cleanupEmptyConfigBrowserNode()
  },
})

const cfgBrowserAttachOnly = computed({
  get() {
    return getDraftBrowser()?.attachOnly === true
  },
  set(v: boolean) {
    const b = ensureConfigBrowserNode()
    if (v)
      b.attachOnly = true
    else delete b.attachOnly
    cleanupEmptyConfigBrowserNode()
  },
})

const cfgBrowserHeadless = computed({
  get() {
    return getDraftBrowser()?.headless === true
  },
  set(v: boolean) {
    const b = ensureConfigBrowserNode()
    if (v)
      b.headless = true
    else delete b.headless
    cleanupEmptyConfigBrowserNode()
  },
})

const cfgBrowserNoSandbox = computed({
  get() {
    return getDraftBrowser()?.noSandbox === true
  },
  set(v: boolean) {
    const b = ensureConfigBrowserNode()
    if (v)
      b.noSandbox = true
    else delete b.noSandbox
    cleanupEmptyConfigBrowserNode()
  },
})

function browserStringField(key: string) {
  return computed({
    get() {
      const v = getDraftBrowser()?.[key]
      return typeof v === 'string' ? v : ''
    },
    set(s: string) {
      const b = ensureConfigBrowserNode()
      const t = s.trim()
      if (!t)
        delete b[key]
      else b[key] = t
      cleanupEmptyConfigBrowserNode()
    },
  })
}

const cfgBrowserCdpUrl = browserStringField('cdpUrl')
const cfgBrowserColor = browserStringField('color')
const cfgBrowserExecutablePath = browserStringField('executablePath')
const cfgBrowserDefaultProfile = browserStringField('defaultProfile')
const cfgBrowserRelayBindHost = browserStringField('relayBindHost')

const cfgBrowserCdpPortRangeStart = computed({
  get() {
    const n = getDraftBrowser()?.cdpPortRangeStart
    if (typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 65535)
      return String(n)
    return ''
  },
  set(v: string) {
    const b = ensureConfigBrowserNode()
    const t = v.trim()
    if (!t) {
      delete b.cdpPortRangeStart
      cleanupEmptyConfigBrowserNode()
      return
    }
    const num = Number.parseInt(t, 10)
    if (!Number.isInteger(num) || num < 1 || num > 65535)
      return
    b.cdpPortRangeStart = num
    cleanupEmptyConfigBrowserNode()
  },
})

const cfgBrowserRemoteCdpTimeoutMs = computed({
  get() {
    const n = getDraftBrowser()?.remoteCdpTimeoutMs
    if (typeof n === 'number' && Number.isInteger(n) && n >= 0)
      return String(n)
    return ''
  },
  set(v: string) {
    const b = ensureConfigBrowserNode()
    const t = v.trim()
    if (!t) {
      delete b.remoteCdpTimeoutMs
      cleanupEmptyConfigBrowserNode()
      return
    }
    const num = Number.parseInt(t, 10)
    if (!Number.isInteger(num) || num < 0)
      return
    b.remoteCdpTimeoutMs = num
    cleanupEmptyConfigBrowserNode()
  },
})

const cfgBrowserRemoteCdpHandshakeTimeoutMs = computed({
  get() {
    const n = getDraftBrowser()?.remoteCdpHandshakeTimeoutMs
    if (typeof n === 'number' && Number.isInteger(n) && n >= 0)
      return String(n)
    return ''
  },
  set(v: string) {
    const b = ensureConfigBrowserNode()
    const t = v.trim()
    if (!t) {
      delete b.remoteCdpHandshakeTimeoutMs
      cleanupEmptyConfigBrowserNode()
      return
    }
    const num = Number.parseInt(t, 10)
    if (!Number.isInteger(num) || num < 0)
      return
    b.remoteCdpHandshakeTimeoutMs = num
    cleanupEmptyConfigBrowserNode()
  },
})

const cfgBrowserSnapshotModeSelect = computed({
  get() {
    const m = getDraftBrowser()?.snapshotDefaults as Record<string, unknown> | undefined
    return m?.mode === 'efficient' ? 'efficient' : BROWSER_SNAPSHOT_MODE_OMIT
  },
  set(v: string) {
    const s = ensureConfigBrowserSnapshotDefaultsNode()
    if (v !== 'efficient') {
      delete s.mode
      cleanupEmptyConfigBrowserNode()
      return
    }
    s.mode = 'efficient'
    cleanupEmptyConfigBrowserNode()
  },
})

const cfgBrowserSsrfAllowPrivateNetwork = computed({
  get() {
    return browserSsrfSub()?.allowPrivateNetwork === true
  },
  set(v: boolean) {
    const s = ensureConfigBrowserSsrfNode()
    if (v)
      s.allowPrivateNetwork = true
    else delete s.allowPrivateNetwork
    cleanupEmptyConfigBrowserNode()
  },
})

const cfgBrowserSsrfDangerouslyAllowPrivateNetwork = computed({
  get() {
    return browserSsrfSub()?.dangerouslyAllowPrivateNetwork === true
  },
  set(v: boolean) {
    const s = ensureConfigBrowserSsrfNode()
    if (v)
      s.dangerouslyAllowPrivateNetwork = true
    else delete s.dangerouslyAllowPrivateNetwork
    cleanupEmptyConfigBrowserNode()
  },
})

const browserExtraArgsJsonLocal = ref('')
const browserProfilesJsonLocal = ref('')
const browserSsrfAllowedHostnamesJsonLocal = ref('')
const browserSsrfHostnameAllowlistJsonLocal = ref('')

function syncBrowserJsonLocalsFromDraft() {
  const b = getDraftBrowser()
  const ea = b?.extraArgs
  if (Array.isArray(ea) && ea.every(x => typeof x === 'string')) {
    try {
      browserExtraArgsJsonLocal.value = JSON.stringify(ea, null, 2)
    }
    catch {
      browserExtraArgsJsonLocal.value = ''
    }
  }
  else {
    browserExtraArgsJsonLocal.value = ''
  }
  const prof = b?.profiles
  if (prof && typeof prof === 'object' && !Array.isArray(prof)) {
    try {
      browserProfilesJsonLocal.value = JSON.stringify(prof, null, 2)
    }
    catch {
      browserProfilesJsonLocal.value = ''
    }
  }
  else {
    browserProfilesJsonLocal.value = ''
  }
  const ssrf = b?.ssrfPolicy as Record<string, unknown> | undefined
  const ah = ssrf?.allowedHostnames
  if (Array.isArray(ah) && ah.every(x => typeof x === 'string')) {
    try {
      browserSsrfAllowedHostnamesJsonLocal.value = JSON.stringify(ah, null, 2)
    }
    catch {
      browserSsrfAllowedHostnamesJsonLocal.value = ''
    }
  }
  else {
    browserSsrfAllowedHostnamesJsonLocal.value = ''
  }
  const hl = ssrf?.hostnameAllowlist
  if (Array.isArray(hl) && hl.every(x => typeof x === 'string')) {
    try {
      browserSsrfHostnameAllowlistJsonLocal.value = JSON.stringify(hl, null, 2)
    }
    catch {
      browserSsrfHostnameAllowlistJsonLocal.value = ''
    }
  }
  else {
    browserSsrfHostnameAllowlistJsonLocal.value = ''
  }
}

function parseStringArrayFromJson(raw: string): string[] | null {
  try {
    const p = JSON.parse(raw) as unknown
    if (!Array.isArray(p) || !p.every(x => typeof x === 'string'))
      return null
    return p
  }
  catch {
    return null
  }
}

function applyBrowserExtraArgsFromJson(raw: string) {
  const b = ensureConfigBrowserNode()
  const t = raw.trim()
  if (!t) {
    delete b.extraArgs
    cleanupEmptyConfigBrowserNode()
    return
  }
  const parsed = parseStringArrayFromJson(t)
  if (!parsed)
    return
  b.extraArgs = parsed
  cleanupEmptyConfigBrowserNode()
}

function applyBrowserProfilesFromJson(raw: string) {
  const b = ensureConfigBrowserNode()
  const t = raw.trim()
  if (!t) {
    delete b.profiles
    cleanupEmptyConfigBrowserNode()
    return
  }
  try {
    const p = JSON.parse(t) as unknown
    if (!p || typeof p !== 'object' || Array.isArray(p))
      return
    b.profiles = p as Record<string, unknown>
    cleanupEmptyConfigBrowserNode()
  }
  catch {
    /* keep previous */
  }
}

function applyBrowserSsrfAllowedHostnamesFromJson(raw: string) {
  const s = ensureConfigBrowserSsrfNode()
  const t = raw.trim()
  if (!t) {
    delete s.allowedHostnames
    cleanupEmptyConfigBrowserNode()
    return
  }
  const parsed = parseStringArrayFromJson(t)
  if (!parsed)
    return
  s.allowedHostnames = parsed
  cleanupEmptyConfigBrowserNode()
}

function applyBrowserSsrfHostnameAllowlistFromJson(raw: string) {
  const s = ensureConfigBrowserSsrfNode()
  const t = raw.trim()
  if (!t) {
    delete s.hostnameAllowlist
    cleanupEmptyConfigBrowserNode()
    return
  }
  const parsed = parseStringArrayFromJson(t)
  if (!parsed)
    return
  s.hostnameAllowlist = parsed
  cleanupEmptyConfigBrowserNode()
}

/** —— Infrastructure → NodeHost（对齐 zod-schema `nodeHost`）—— */
function ensureConfigNodeHostNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.nodeHost || typeof r.nodeHost !== 'object' || Array.isArray(r.nodeHost)) {
    r.nodeHost = {}
  }
  return r.nodeHost as Record<string, unknown>
}

function ensureConfigNodeHostBrowserProxyNode(): Record<string, unknown> {
  const nh = ensureConfigNodeHostNode()
  if (!nh.browserProxy || typeof nh.browserProxy !== 'object' || Array.isArray(nh.browserProxy)) {
    nh.browserProxy = {}
  }
  return nh.browserProxy as Record<string, unknown>
}

function cleanupEmptyConfigNodeHostNode() {
  const root = draftConfig.value
  if (!root?.nodeHost || typeof root.nodeHost !== 'object' || Array.isArray(root.nodeHost))
    return
  const nh = root.nodeHost as Record<string, unknown>
  pruneIfEmptyChild(nh, 'browserProxy')
  if (Object.keys(nh).length === 0)
    delete root.nodeHost
}

function getDraftNodeHost(): Record<string, unknown> | undefined {
  const x = draftConfig.value?.nodeHost
  if (!x || typeof x !== 'object' || Array.isArray(x))
    return undefined
  return x as Record<string, unknown>
}

function getNodeHostBrowserProxySub(): Record<string, unknown> | undefined {
  const bp = getDraftNodeHost()?.browserProxy
  if (bp && typeof bp === 'object' && !Array.isArray(bp))
    return bp as Record<string, unknown>
  return undefined
}

const cfgNodeHostBrowserProxyEnabled = computed({
  get() {
    return getNodeHostBrowserProxySub()?.enabled === true
  },
  set(v: boolean) {
    const p = ensureConfigNodeHostBrowserProxyNode()
    if (v)
      p.enabled = true
    else delete p.enabled
    cleanupEmptyConfigNodeHostNode()
  },
})

const nodeHostAllowProfilesJsonLocal = ref('')

function syncNodeHostAllowProfilesJsonFromDraft() {
  const ap = getNodeHostBrowserProxySub()?.allowProfiles
  if (Array.isArray(ap) && ap.every(x => typeof x === 'string')) {
    try {
      nodeHostAllowProfilesJsonLocal.value = JSON.stringify(ap, null, 2)
    }
    catch {
      nodeHostAllowProfilesJsonLocal.value = ''
    }
  }
  else {
    nodeHostAllowProfilesJsonLocal.value = ''
  }
}

function applyNodeHostAllowProfilesFromJson(raw: string) {
  const p = ensureConfigNodeHostBrowserProxyNode()
  const t = raw.trim()
  if (!t) {
    delete p.allowProfiles
    cleanupEmptyConfigNodeHostNode()
    return
  }
  const parsed = parseStringArrayFromJson(t)
  if (!parsed)
    return
  p.allowProfiles = parsed
  cleanupEmptyConfigNodeHostNode()
}

/** —— Infrastructure → Canvas Host（对齐 zod-schema `canvasHost`；enabled 缺省为开，与 gateway runtime 一致）—— */
function ensureConfigCanvasHostNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.canvasHost || typeof r.canvasHost !== 'object' || Array.isArray(r.canvasHost)) {
    r.canvasHost = {}
  }
  return r.canvasHost as Record<string, unknown>
}

function cleanupEmptyConfigCanvasHostNode() {
  const root = draftConfig.value
  if (!root?.canvasHost || typeof root.canvasHost !== 'object' || Array.isArray(root.canvasHost))
    return
  const h = root.canvasHost as Record<string, unknown>
  if (h.enabled === true)
    delete h.enabled
  if (h.liveReload !== true)
    delete h.liveReload
  const rt = h.root
  if (typeof rt === 'string' && !rt.trim())
    delete h.root
  const po = h.port
  if (typeof po !== 'number' || !Number.isInteger(po) || po <= 0)
    delete h.port
  if (Object.keys(h).length === 0)
    delete root.canvasHost
}

function getDraftCanvasHost(): Record<string, unknown> | undefined {
  const x = draftConfig.value?.canvasHost
  if (!x || typeof x !== 'object' || Array.isArray(x))
    return undefined
  return x as Record<string, unknown>
}

/** 与 OPENCLAW_SKIP_CANVAS_HOST 无关；配置语义为 canvasHost.enabled !== false 时启用 */
const cfgCanvasHostEnabled = computed({
  get() {
    const h = getDraftCanvasHost()
    if (!h)
      return true
    return h.enabled !== false
  },
  set(v: boolean) {
    const h = ensureConfigCanvasHostNode()
    if (v)
      delete h.enabled
    else h.enabled = false
    cleanupEmptyConfigCanvasHostNode()
  },
})

const cfgCanvasHostRoot = computed({
  get() {
    const r = getDraftCanvasHost()?.root
    return typeof r === 'string' ? r : ''
  },
  set(v: string) {
    const h = ensureConfigCanvasHostNode()
    const t = v.trim()
    if (!t)
      delete h.root
    else h.root = t
    cleanupEmptyConfigCanvasHostNode()
  },
})

const cfgCanvasHostPort = computed({
  get() {
    const n = getDraftCanvasHost()?.port
    if (typeof n === 'number' && Number.isFinite(n))
      return String(n)
    return ''
  },
  set(v: string) {
    const h = ensureConfigCanvasHostNode()
    const t = v.trim()
    if (!t) {
      delete h.port
      cleanupEmptyConfigCanvasHostNode()
      return
    }
    const num = Number(t)
    if (!Number.isInteger(num) || num <= 0)
      return
    h.port = num
    cleanupEmptyConfigCanvasHostNode()
  },
})

const cfgCanvasHostLiveReload = computed({
  get() {
    return getDraftCanvasHost()?.liveReload === true
  },
  set(v: boolean) {
    const h = ensureConfigCanvasHostNode()
    if (v)
      h.liveReload = true
    else delete h.liveReload
    cleanupEmptyConfigCanvasHostNode()
  },
})

/** —— Infrastructure → Discovery（对齐 zod-schema `discovery`）—— */
const DISCOVERY_MDNS_MODES = ['off', 'minimal', 'full'] as const

function ensureConfigDiscoveryNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.discovery || typeof r.discovery !== 'object' || Array.isArray(r.discovery)) {
    r.discovery = {}
  }
  return r.discovery as Record<string, unknown>
}

function ensureDiscoveryWideAreaNode(): Record<string, unknown> {
  const d = ensureConfigDiscoveryNode()
  if (!d.wideArea || typeof d.wideArea !== 'object' || Array.isArray(d.wideArea)) {
    d.wideArea = {}
  }
  return d.wideArea as Record<string, unknown>
}

function ensureDiscoveryMdnsNode(): Record<string, unknown> {
  const d = ensureConfigDiscoveryNode()
  if (!d.mdns || typeof d.mdns !== 'object' || Array.isArray(d.mdns)) {
    d.mdns = {}
  }
  return d.mdns as Record<string, unknown>
}

function getDraftDiscoveryMdns(): Record<string, unknown> | undefined {
  const m = draftConfig.value?.discovery as Record<string, unknown> | undefined
  const x = m?.mdns
  if (!x || typeof x !== 'object' || Array.isArray(x))
    return undefined
  return x as Record<string, unknown>
}

function getDraftDiscoveryWideArea(): Record<string, unknown> | undefined {
  const m = draftConfig.value?.discovery as Record<string, unknown> | undefined
  const x = m?.wideArea
  if (!x || typeof x !== 'object' || Array.isArray(x))
    return undefined
  return x as Record<string, unknown>
}

function cleanupEmptyConfigDiscoveryNode() {
  const root = draftConfig.value
  if (!root?.discovery || typeof root.discovery !== 'object' || Array.isArray(root.discovery))
    return
  const d = root.discovery as Record<string, unknown>
  const md = d.mdns as Record<string, unknown> | undefined
  if (md) {
    const mode = md.mode
    if (mode === 'minimal' || mode === undefined)
      delete md.mode
    pruneIfEmptyChild(d, 'mdns')
  }
  const wa = d.wideArea as Record<string, unknown> | undefined
  if (wa) {
    if (wa.enabled !== true)
      delete wa.enabled
    const dom = wa.domain
    if (typeof dom === 'string' && !dom.trim())
      delete wa.domain
    pruneIfEmptyChild(d, 'wideArea')
  }
  if (Object.keys(d).length === 0)
    delete root.discovery
}

/** 运行时默认 minimal；配置省略 mode 等价于 minimal */
const cfgDiscoveryMdnsMode = computed({
  get() {
    const m = getDraftDiscoveryMdns()?.mode
    if (m === 'off' || m === 'minimal' || m === 'full')
      return m
    return 'minimal'
  },
  set(v: string) {
    const md = ensureDiscoveryMdnsNode()
    if (v === 'minimal')
      delete md.mode
    else if (v === 'off' || v === 'full')
      md.mode = v
    cleanupEmptyConfigDiscoveryNode()
  },
})

const cfgDiscoveryWideAreaEnabled = computed({
  get() {
    return getDraftDiscoveryWideArea()?.enabled === true
  },
  set(v: boolean) {
    const wa = ensureDiscoveryWideAreaNode()
    if (v)
      wa.enabled = true
    else delete wa.enabled
    cleanupEmptyConfigDiscoveryNode()
  },
})

const cfgDiscoveryWideAreaDomain = computed({
  get() {
    const dom = getDraftDiscoveryWideArea()?.domain
    return typeof dom === 'string' ? dom : ''
  },
  set(v: string) {
    const wa = ensureDiscoveryWideAreaNode()
    const t = v.trim()
    if (!t)
      delete wa.domain
    else wa.domain = t
    cleanupEmptyConfigDiscoveryNode()
  },
})

/** —— Infrastructure → Media（对齐 zod-schema `media`）—— */
const MEDIA_TTL_HOURS_MAX = 24 * 7

function ensureConfigMediaNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.media || typeof r.media !== 'object' || Array.isArray(r.media)) {
    r.media = {}
  }
  return r.media as Record<string, unknown>
}

function getDraftMedia(): Record<string, unknown> | undefined {
  const x = draftConfig.value?.media
  if (!x || typeof x !== 'object' || Array.isArray(x))
    return undefined
  return x as Record<string, unknown>
}

function cleanupEmptyConfigMediaNode() {
  const root = draftConfig.value
  if (!root?.media || typeof root.media !== 'object' || Array.isArray(root.media))
    return
  const m = root.media as Record<string, unknown>
  if (m.preserveFilenames !== true)
    delete m.preserveFilenames
  const t = m.ttlHours
  if (
    typeof t !== 'number'
    || !Number.isInteger(t)
    || t < 1
    || t > MEDIA_TTL_HOURS_MAX
  ) {
    delete m.ttlHours
  }
  if (Object.keys(m).length === 0)
    delete root.media
}

const cfgMediaPreserveFilenames = computed({
  get() {
    return getDraftMedia()?.preserveFilenames === true
  },
  set(v: boolean) {
    const m = ensureConfigMediaNode()
    if (v)
      m.preserveFilenames = true
    else delete m.preserveFilenames
    cleanupEmptyConfigMediaNode()
  },
})

const cfgMediaTtlHours = computed({
  get() {
    const n = getDraftMedia()?.ttlHours
    if (typeof n === 'number' && Number.isInteger(n))
      return String(n)
    return ''
  },
  set(v: string) {
    const m = ensureConfigMediaNode()
    const t = v.trim()
    if (!t) {
      delete m.ttlHours
      cleanupEmptyConfigMediaNode()
      return
    }
    const num = Number(t)
    if (!Number.isInteger(num) || num < 1 || num > MEDIA_TTL_HOURS_MAX)
      return
    m.ttlHours = num
    cleanupEmptyConfigMediaNode()
  },
})

/** —— AI Agents → Agents（对齐 zod-schema `agents`：`defaults` + `list`）—— */
function ensureConfigAgentsNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.agents || typeof r.agents !== 'object' || Array.isArray(r.agents)) {
    r.agents = {}
  }
  return r.agents as Record<string, unknown>
}

function getDraftAgents(): Record<string, unknown> | undefined {
  const x = draftConfig.value?.agents
  if (!x || typeof x !== 'object' || Array.isArray(x))
    return undefined
  return x as Record<string, unknown>
}

function cleanupEmptyConfigAgentsNode() {
  const root = draftConfig.value
  if (!root?.agents || typeof root.agents !== 'object' || Array.isArray(root.agents))
    return
  const a = root.agents as Record<string, unknown>
  const d = a.defaults
  if (d && typeof d === 'object' && !Array.isArray(d) && Object.keys(d).length === 0) {
    delete a.defaults
  }
  if (Array.isArray(a.list) && a.list.length === 0)
    delete a.list
  pruneIfEmptyChild(root, 'agents')
}

const agentsDefaultsJsonLocal = ref('')
const agentsListJsonLocal = ref('')

function syncAgentsJsonLocalsFromDraft() {
  const ag = getDraftAgents()
  const defs = ag?.defaults
  if (defs && typeof defs === 'object' && !Array.isArray(defs)) {
    try {
      agentsDefaultsJsonLocal.value = JSON.stringify(defs, null, 2)
    }
    catch {
      agentsDefaultsJsonLocal.value = ''
    }
  }
  else {
    agentsDefaultsJsonLocal.value = ''
  }
  const list = ag?.list
  if (Array.isArray(list)) {
    try {
      agentsListJsonLocal.value = JSON.stringify(list, null, 2)
    }
    catch {
      agentsListJsonLocal.value = ''
    }
  }
  else {
    agentsListJsonLocal.value = ''
  }
}

function applyAgentsDefaultsFromJson(raw: string) {
  const ag = ensureConfigAgentsNode()
  const t = raw.trim()
  if (!t) {
    delete ag.defaults
    cleanupEmptyConfigAgentsNode()
    return
  }
  try {
    const p = JSON.parse(t) as unknown
    if (!p || typeof p !== 'object' || Array.isArray(p))
      return
    ag.defaults = p as Record<string, unknown>
    cleanupEmptyConfigAgentsNode()
  }
  catch {
    /* keep previous */
  }
}

function applyAgentsListFromJson(raw: string) {
  const ag = ensureConfigAgentsNode()
  const t = raw.trim()
  if (!t) {
    delete ag.list
    cleanupEmptyConfigAgentsNode()
    return
  }
  try {
    const p = JSON.parse(t) as unknown
    if (!Array.isArray(p))
      return
    ag.list = p
    cleanupEmptyConfigAgentsNode()
  }
  catch {
    /* keep previous */
  }
}

/** —— AI Agents → Models（对齐 zod `models`：mode、providers、bedrockDiscovery）—— */
function ensureConfigModelsNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.models || typeof r.models !== 'object' || Array.isArray(r.models)) {
    r.models = {}
  }
  return r.models as Record<string, unknown>
}

function getDraftModels(): Record<string, unknown> | undefined {
  const x = draftConfig.value?.models
  if (!x || typeof x !== 'object' || Array.isArray(x))
    return undefined
  return x as Record<string, unknown>
}

function ensureModelsBedrockNode(): Record<string, unknown> {
  const m = ensureConfigModelsNode()
  if (
    !m.bedrockDiscovery
    || typeof m.bedrockDiscovery !== 'object'
    || Array.isArray(m.bedrockDiscovery)
  ) {
    m.bedrockDiscovery = {}
  }
  return m.bedrockDiscovery as Record<string, unknown>
}

function cleanupEmptyConfigModelsNode() {
  const root = draftConfig.value
  if (!root?.models || typeof root.models !== 'object' || Array.isArray(root.models))
    return
  const m = root.models as Record<string, unknown>
  const prov = m.providers
  if (prov && typeof prov === 'object' && !Array.isArray(prov) && Object.keys(prov).length === 0) {
    delete m.providers
  }
  const bd = m.bedrockDiscovery
  if (bd && typeof bd === 'object' && !Array.isArray(bd)) {
    const b = bd as Record<string, unknown>
    if (Array.isArray(b.providerFilter) && b.providerFilter.length === 0) {
      delete b.providerFilter
    }
    if (Object.keys(b).length === 0) {
      delete m.bedrockDiscovery
    }
  }
  if (Object.keys(m).length === 0) {
    delete root.models
  }
}

const MODEL_MODE_AUTO = '__auto__'

const modelsModeSelect = computed({
  get() {
    const mode = getDraftModels()?.mode
    if (mode === 'merge' || mode === 'replace')
      return mode
    return MODEL_MODE_AUTO
  },
  set(v: string) {
    const m = ensureConfigModelsNode()
    if (v === MODEL_MODE_AUTO) {
      delete m.mode
    }
    else if (v === 'merge' || v === 'replace') {
      m.mode = v
    }
    cleanupEmptyConfigModelsNode()
  },
})

const modelsProvidersJsonLocal = ref('')
const modelsBedrockProviderFilterJsonLocal = ref('')

function syncModelsJsonLocalsFromDraft() {
  const mod = getDraftModels()
  const prov = mod?.providers
  if (prov && typeof prov === 'object' && !Array.isArray(prov)) {
    try {
      modelsProvidersJsonLocal.value = JSON.stringify(prov, null, 2)
    }
    catch {
      modelsProvidersJsonLocal.value = ''
    }
  }
  else {
    modelsProvidersJsonLocal.value = ''
  }
  const bd = mod?.bedrockDiscovery
  if (bd && typeof bd === 'object' && !Array.isArray(bd)) {
    const pf = (bd as Record<string, unknown>).providerFilter
    if (Array.isArray(pf)) {
      try {
        modelsBedrockProviderFilterJsonLocal.value = JSON.stringify(pf, null, 2)
      }
      catch {
        modelsBedrockProviderFilterJsonLocal.value = ''
      }
    }
    else {
      modelsBedrockProviderFilterJsonLocal.value = ''
    }
  }
  else {
    modelsBedrockProviderFilterJsonLocal.value = ''
  }
}

function applyModelsProvidersFromJson(raw: string) {
  const m = ensureConfigModelsNode()
  const t = raw.trim()
  if (!t) {
    delete m.providers
    cleanupEmptyConfigModelsNode()
    return
  }
  try {
    const p = JSON.parse(t) as unknown
    if (!p || typeof p !== 'object' || Array.isArray(p))
      return
    m.providers = p as Record<string, unknown>
    cleanupEmptyConfigModelsNode()
  }
  catch {
    /* keep previous */
  }
}

function applyModelsBedrockProviderFilterFromJson(raw: string) {
  const b = ensureModelsBedrockNode()
  const t = raw.trim()
  if (!t || t === '[]') {
    delete b.providerFilter
    cleanupEmptyConfigModelsNode()
    return
  }
  try {
    const p = JSON.parse(t) as unknown
    if (!Array.isArray(p))
      return
    if (p.length === 0) {
      delete b.providerFilter
      cleanupEmptyConfigModelsNode()
      return
    }
    if (!p.every(x => typeof x === 'string'))
      return
    b.providerFilter = p
    cleanupEmptyConfigModelsNode()
  }
  catch {
    /* keep previous */
  }
}

function modelsBedrockOptionalNonnegStr(key: 'refreshInterval'): ComputedRef<string> {
  return computed({
    get() {
      const bd = getDraftModels()?.bedrockDiscovery
      if (!bd || typeof bd !== 'object' || Array.isArray(bd))
        return ''
      const n = (bd as Record<string, unknown>)[key]
      if (typeof n === 'number' && Number.isFinite(n) && n >= 0)
        return String(Math.trunc(n))
      return ''
    },
    set(v: string) {
      const b = ensureModelsBedrockNode()
      const t = v.trim()
      if (!t) {
        delete b[key]
        cleanupEmptyConfigModelsNode()
        return
      }
      const num = Number.parseInt(t, 10)
      if (!Number.isFinite(num) || num < 0)
        return
      b[key] = num
      cleanupEmptyConfigModelsNode()
    },
  })
}

function modelsBedrockOptionalPositiveStr(key: 'defaultContextWindow' | 'defaultMaxTokens'): ComputedRef<string> {
  return computed({
    get() {
      const bd = getDraftModels()?.bedrockDiscovery
      if (!bd || typeof bd !== 'object' || Array.isArray(bd))
        return ''
      const n = (bd as Record<string, unknown>)[key]
      if (typeof n === 'number' && Number.isFinite(n) && n > 0)
        return String(Math.trunc(n))
      return ''
    },
    set(v: string) {
      const b = ensureModelsBedrockNode()
      const t = v.trim()
      if (!t) {
        delete b[key]
        cleanupEmptyConfigModelsNode()
        return
      }
      const num = Number.parseInt(t, 10)
      if (!Number.isFinite(num) || num <= 0)
        return
      b[key] = num
      cleanupEmptyConfigModelsNode()
    },
  })
}

const modelsBedrockRefreshStr = modelsBedrockOptionalNonnegStr('refreshInterval')
const modelsBedrockCtxStr = modelsBedrockOptionalPositiveStr('defaultContextWindow')
const modelsBedrockMaxTokensStr = modelsBedrockOptionalPositiveStr('defaultMaxTokens')

const modelsBedrockEnabled = computed({
  get() {
    const bd = getDraftModels()?.bedrockDiscovery
    if (!bd || typeof bd !== 'object' || Array.isArray(bd))
      return false
    return (bd as Record<string, unknown>).enabled === true
  },
  set(v: boolean) {
    const b = ensureModelsBedrockNode()
    if (v) {
      b.enabled = true
    }
    else {
      delete b.enabled
    }
    cleanupEmptyConfigModelsNode()
  },
})

const modelsBedrockRegion = computed({
  get() {
    const bd = getDraftModels()?.bedrockDiscovery
    if (!bd || typeof bd !== 'object' || Array.isArray(bd))
      return ''
    const r = (bd as Record<string, unknown>).region
    return typeof r === 'string' ? r : ''
  },
  set(v: string) {
    const b = ensureModelsBedrockNode()
    const t = v.trim()
    if (!t) {
      delete b.region
      cleanupEmptyConfigModelsNode()
      return
    }
    b.region = t
    cleanupEmptyConfigModelsNode()
  },
})

/** —— AI Agents → Skills（对齐 zod `skills`）—— */
function ensureConfigSkillsNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.skills || typeof r.skills !== 'object' || Array.isArray(r.skills)) {
    r.skills = {}
  }
  return r.skills as Record<string, unknown>
}

function getDraftSkills(): Record<string, unknown> | undefined {
  const x = draftConfig.value?.skills
  if (!x || typeof x !== 'object' || Array.isArray(x))
    return undefined
  return x as Record<string, unknown>
}

function ensureSkillsLoadNode(): Record<string, unknown> {
  const s = ensureConfigSkillsNode()
  if (!s.load || typeof s.load !== 'object' || Array.isArray(s.load)) {
    s.load = {}
  }
  return s.load as Record<string, unknown>
}

function ensureSkillsInstallNode(): Record<string, unknown> {
  const s = ensureConfigSkillsNode()
  if (!s.install || typeof s.install !== 'object' || Array.isArray(s.install)) {
    s.install = {}
  }
  return s.install as Record<string, unknown>
}

function ensureSkillsLimitsNode(): Record<string, unknown> {
  const s = ensureConfigSkillsNode()
  if (!s.limits || typeof s.limits !== 'object' || Array.isArray(s.limits)) {
    s.limits = {}
  }
  return s.limits as Record<string, unknown>
}

function ensureSkillsEntriesNode(): Record<string, unknown> {
  const s = ensureConfigSkillsNode()
  if (!s.entries || typeof s.entries !== 'object' || Array.isArray(s.entries)) {
    s.entries = {}
  }
  return s.entries as Record<string, unknown>
}

function cleanupEmptyConfigSkillsNode() {
  const root = draftConfig.value
  if (!root?.skills || typeof root.skills !== 'object' || Array.isArray(root.skills))
    return
  const s = root.skills as Record<string, unknown>
  if (Array.isArray(s.allowBundled) && s.allowBundled.length === 0) {
    delete s.allowBundled
  }
  const load = s.load
  if (load && typeof load === 'object' && !Array.isArray(load)) {
    const L = load as Record<string, unknown>
    if (Array.isArray(L.extraDirs) && L.extraDirs.length === 0) {
      delete L.extraDirs
    }
    if (L.watch !== true) {
      delete L.watch
    }
    if (L.watchDebounceMs === undefined) {
      /* noop */
    }
    else if (typeof L.watchDebounceMs !== 'number') {
      delete L.watchDebounceMs
    }
    if (Object.keys(L).length === 0) {
      delete s.load
    }
  }
  const install = s.install
  if (install && typeof install === 'object' && !Array.isArray(install)) {
    const I = install as Record<string, unknown>
    if (I.preferBrew !== true) {
      delete I.preferBrew
    }
    if (
      I.nodeManager !== 'npm'
      && I.nodeManager !== 'pnpm'
      && I.nodeManager !== 'yarn'
      && I.nodeManager !== 'bun'
    ) {
      delete I.nodeManager
    }
    if (Object.keys(I).length === 0) {
      delete s.install
    }
  }
  const limits = s.limits
  if (limits && typeof limits === 'object' && !Array.isArray(limits)) {
    const Z = limits as Record<string, unknown>
    for (const k of Object.keys(Z)) {
      const v = Z[k]
      if (v === undefined || v === null || (typeof v === 'number' && !Number.isFinite(v))) {
        delete Z[k]
      }
    }
    if (Object.keys(Z).length === 0) {
      delete s.limits
    }
  }
  const entries = s.entries
  if (entries && typeof entries === 'object' && !Array.isArray(entries)) {
    const E = entries as Record<string, unknown>
    if (Object.keys(E).length === 0) {
      delete s.entries
    }
  }
  if (Object.keys(s).length === 0) {
    delete root.skills
  }
}

const skillsAllowBundledRows = ref<string[]>([])
const skillsExtraDirsRows = ref<string[]>([])

function syncSkillsRowsFromDraft() {
  const sk = getDraftSkills()
  const ab = sk?.allowBundled
  if (Array.isArray(ab) && ab.every(x => typeof x === 'string')) {
    skillsAllowBundledRows.value = ab.length > 0 ? [...ab] : []
  }
  else {
    skillsAllowBundledRows.value = []
  }
  const load = sk?.load
  if (load && typeof load === 'object' && !Array.isArray(load)) {
    const ed = (load as Record<string, unknown>).extraDirs
    if (Array.isArray(ed) && ed.every(x => typeof x === 'string')) {
      skillsExtraDirsRows.value = ed.length > 0 ? [...ed] : []
    }
    else {
      skillsExtraDirsRows.value = []
    }
  }
  else {
    skillsExtraDirsRows.value = []
  }
}

function applySkillsAllowBundledFromRows() {
  const sk = ensureConfigSkillsNode()
  const rows = skillsAllowBundledRows.value.map(x => x.trim()).filter(Boolean)
  if (rows.length === 0) {
    delete sk.allowBundled
  }
  else {
    sk.allowBundled = rows
  }
  cleanupEmptyConfigSkillsNode()
}

function applySkillsExtraDirsFromRows() {
  const L = ensureSkillsLoadNode()
  const rows = skillsExtraDirsRows.value.map(x => x.trim()).filter(Boolean)
  if (rows.length === 0) {
    delete L.extraDirs
  }
  else {
    L.extraDirs = rows
  }
  cleanupEmptyConfigSkillsNode()
}

function addSkillsAllowBundledRow() {
  skillsAllowBundledRows.value = [...skillsAllowBundledRows.value, '']
}

function removeSkillsAllowBundledRow(i: number) {
  skillsAllowBundledRows.value = skillsAllowBundledRows.value.filter((_, j) => j !== i)
  applySkillsAllowBundledFromRows()
}

function updateSkillsAllowBundledRow(i: number, v: string) {
  const next = [...skillsAllowBundledRows.value]
  next[i] = v
  skillsAllowBundledRows.value = next
  applySkillsAllowBundledFromRows()
}

function addSkillsExtraDirRow() {
  skillsExtraDirsRows.value = [...skillsExtraDirsRows.value, '']
}

function removeSkillsExtraDirRow(i: number) {
  skillsExtraDirsRows.value = skillsExtraDirsRows.value.filter((_, j) => j !== i)
  applySkillsExtraDirsFromRows()
}

function updateSkillsExtraDirRow(i: number, v: string) {
  const next = [...skillsExtraDirsRows.value]
  next[i] = v
  skillsExtraDirsRows.value = next
  applySkillsExtraDirsFromRows()
}

const skillsLoadWatch = computed({
  get() {
    const load = getDraftSkills()?.load as Record<string, unknown> | undefined
    return load?.watch === true
  },
  set(v: boolean) {
    const L = ensureSkillsLoadNode()
    if (!v) {
      delete L.watch
    }
    else {
      L.watch = true
    }
    cleanupEmptyConfigSkillsNode()
  },
})

const skillsLoadWatchDebounceStr = computed({
  get() {
    const load = getDraftSkills()?.load as Record<string, unknown> | undefined
    const n = load?.watchDebounceMs
    if (typeof n === 'number' && Number.isFinite(n) && n >= 0)
      return String(Math.trunc(n))
    return ''
  },
  set(v: string) {
    const L = ensureSkillsLoadNode()
    const t = v.trim()
    if (!t) {
      delete L.watchDebounceMs
      cleanupEmptyConfigSkillsNode()
      return
    }
    const num = Number.parseInt(t, 10)
    if (!Number.isFinite(num) || num < 0)
      return
    L.watchDebounceMs = num
    cleanupEmptyConfigSkillsNode()
  },
})

const SKILLS_NODE_MANAGER_AUTO = '__auto__'

const skillsInstallNodeManagerSelect = computed({
  get() {
    const ins = getDraftSkills()?.install as Record<string, unknown> | undefined
    const v = ins?.nodeManager
    if (v === 'npm' || v === 'pnpm' || v === 'yarn' || v === 'bun')
      return v
    return SKILLS_NODE_MANAGER_AUTO
  },
  set(v: string) {
    const ins = ensureSkillsInstallNode()
    if (v === SKILLS_NODE_MANAGER_AUTO) {
      delete ins.nodeManager
    }
    else if (v === 'npm' || v === 'pnpm' || v === 'yarn' || v === 'bun') {
      ins.nodeManager = v
    }
    cleanupEmptyConfigSkillsNode()
  },
})

const skillsInstallPreferBrew = computed({
  get() {
    const ins = getDraftSkills()?.install as Record<string, unknown> | undefined
    return ins?.preferBrew === true
  },
  set(v: boolean) {
    const ins = ensureSkillsInstallNode()
    if (!v) {
      delete ins.preferBrew
    }
    else {
      ins.preferBrew = true
    }
    cleanupEmptyConfigSkillsNode()
  },
})

function skillsLimitsInt(
  key:
    | 'maxCandidatesPerRoot'
    | 'maxSkillsLoadedPerSource'
    | 'maxSkillsInPrompt'
    | 'maxSkillsPromptChars'
    | 'maxSkillFileBytes',
  minWhenSet: number,
): ComputedRef<string> {
  return computed({
    get() {
      const lim = getDraftSkills()?.limits as Record<string, unknown> | undefined
      const n = lim?.[key]
      if (typeof n === 'number' && Number.isFinite(n))
        return String(Math.trunc(n))
      return ''
    },
    set(v: string) {
      const Z = ensureSkillsLimitsNode()
      const t = v.trim()
      if (!t) {
        delete Z[key]
        cleanupEmptyConfigSkillsNode()
        return
      }
      const num = Number.parseInt(t, 10)
      if (!Number.isFinite(num) || num < minWhenSet)
        return
      Z[key] = num
      cleanupEmptyConfigSkillsNode()
    },
  })
}

const skillsLimitMaxCandidatesStr = skillsLimitsInt('maxCandidatesPerRoot', 1)
const skillsLimitMaxLoadedStr = skillsLimitsInt('maxSkillsLoadedPerSource', 1)
const skillsLimitMaxInPromptStr = skillsLimitsInt('maxSkillsInPrompt', 0)
const skillsLimitMaxPromptCharsStr = skillsLimitsInt('maxSkillsPromptChars', 0)
const skillsLimitMaxFileBytesStr = skillsLimitsInt('maxSkillFileBytes', 0)

const skillsEntriesKeys = computed(() => {
  const ent = getDraftSkills()?.entries
  if (!ent || typeof ent !== 'object' || Array.isArray(ent))
    return [] as string[]
  return Object.keys(ent as Record<string, unknown>).sort((a, b) => a.localeCompare(b))
})

function skillsEntryJsonFor(key: string): string {
  const ent = getDraftSkills()?.entries as Record<string, unknown> | undefined
  if (!ent || typeof ent !== 'object' || Array.isArray(ent))
    return '{}'
  const v = ent[key]
  if (v === undefined)
    return '{}'
  try {
    return JSON.stringify(v, null, 2)
  }
  catch {
    return '{}'
  }
}

function applySkillsEntryJson(key: string, raw: string) {
  const E = ensureSkillsEntriesNode()
  const trimmed = raw.trim()
  if (!trimmed) {
    delete E[key]
    cleanupEmptyConfigSkillsNode()
    return
  }
  try {
    E[key] = JSON.parse(trimmed) as unknown
    cleanupEmptyConfigSkillsNode()
  }
  catch {
    /* keep previous */
  }
}

function onSkillsEntryKeyChange(oldKey: string, newKeyRaw: string) {
  const nk = newKeyRaw.trim()
  if (!nk || nk === oldKey)
    return
  const E = ensureSkillsEntriesNode()
  if (nk in E)
    return
  E[nk] = E[oldKey]
  delete E[oldKey]
  cleanupEmptyConfigSkillsNode()
}

function addSkillsEntry() {
  const E = ensureSkillsEntriesNode()
  let index = 1
  let key = `entry-${index}`
  while (key in E) {
    index += 1
    key = `entry-${index}`
  }
  E[key] = {}
}

function removeSkillsEntry(key: string) {
  const E = ensureSkillsEntriesNode()
  delete E[key]
  cleanupEmptyConfigSkillsNode()
}

/** —— AI Agents → Tools（对齐 zod `ToolsSchema`）—— */
function ensureConfigToolsNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.tools || typeof r.tools !== 'object' || Array.isArray(r.tools)) {
    r.tools = {}
  }
  return r.tools as Record<string, unknown>
}

function getDraftTools(): Record<string, unknown> | undefined {
  const x = draftConfig.value?.tools
  if (!x || typeof x !== 'object' || Array.isArray(x))
    return undefined
  return x as Record<string, unknown>
}

function ensureToolsAgentToAgentNode(): Record<string, unknown> {
  const tk = ensureConfigToolsNode()
  if (!tk.agentToAgent || typeof tk.agentToAgent !== 'object' || Array.isArray(tk.agentToAgent)) {
    tk.agentToAgent = {}
  }
  return tk.agentToAgent as Record<string, unknown>
}

function ensureToolsSessionsNode(): Record<string, unknown> {
  const tk = ensureConfigToolsNode()
  if (!tk.sessions || typeof tk.sessions !== 'object' || Array.isArray(tk.sessions)) {
    tk.sessions = {}
  }
  return tk.sessions as Record<string, unknown>
}

function ensureToolsElevatedNode(): Record<string, unknown> {
  const tk = ensureConfigToolsNode()
  if (!tk.elevated || typeof tk.elevated !== 'object' || Array.isArray(tk.elevated)) {
    tk.elevated = {}
  }
  return tk.elevated as Record<string, unknown>
}

function ensureToolsByProviderNode(): Record<string, unknown> {
  const tk = ensureConfigToolsNode()
  if (!tk.byProvider || typeof tk.byProvider !== 'object' || Array.isArray(tk.byProvider)) {
    tk.byProvider = {}
  }
  return tk.byProvider as Record<string, unknown>
}

function cleanupEmptyConfigToolsNode() {
  const root = draftConfig.value
  if (!root?.tools || typeof root.tools !== 'object' || Array.isArray(root.tools))
    return
  const tk = root.tools as Record<string, unknown>
  for (const k of ['allow', 'alsoAllow', 'deny'] as const) {
    const v = tk[k]
    if (Array.isArray(v) && v.length === 0) {
      delete tk[k]
    }
  }
  const ata = tk.agentToAgent
  if (ata && typeof ata === 'object' && !Array.isArray(ata)) {
    const a = ata as Record<string, unknown>
    if (Array.isArray(a.allow) && a.allow.length === 0) {
      delete a.allow
    }
    if (a.enabled !== true) {
      delete a.enabled
    }
    if (Object.keys(a).length === 0) {
      delete tk.agentToAgent
    }
  }
  const bp = tk.byProvider
  if (bp && typeof bp === 'object' && !Array.isArray(bp) && Object.keys(bp).length === 0) {
    delete tk.byProvider
  }
  const sess = tk.sessions
  if (sess && typeof sess === 'object' && !Array.isArray(sess)) {
    const s = sess as Record<string, unknown>
    if (Object.keys(s).length === 0) {
      delete tk.sessions
    }
  }
  const el = tk.elevated
  if (el && typeof el === 'object' && !Array.isArray(el)) {
    const e = el as Record<string, unknown>
    if (e.enabled !== true) {
      delete e.enabled
    }
    const af = e.allowFrom
    if (af && typeof af === 'object' && !Array.isArray(af) && Object.keys(af).length === 0) {
      delete e.allowFrom
    }
    if (Object.keys(e).length === 0) {
      delete tk.elevated
    }
  }
  for (const nk of [
    'web',
    'media',
    'links',
    'loopDetection',
    'message',
    'exec',
    'fs',
    'subagents',
    'sandbox',
    'sessions_spawn',
  ] as const) {
    const sub = tk[nk]
    if (sub && typeof sub === 'object' && !Array.isArray(sub) && Object.keys(sub).length === 0) {
      delete tk[nk]
    }
  }
  if (Object.keys(tk).length === 0) {
    delete root.tools
  }
}

const TOOLS_PROFILE_AUTO = '__auto__'

const toolsProfileSelect = computed({
  get() {
    const p = getDraftTools()?.profile
    if (p === 'minimal' || p === 'coding' || p === 'messaging' || p === 'full')
      return p
    return TOOLS_PROFILE_AUTO
  },
  set(v: string) {
    const tk = ensureConfigToolsNode()
    if (v === TOOLS_PROFILE_AUTO) {
      delete tk.profile
    }
    else if (v === 'minimal' || v === 'coding' || v === 'messaging' || v === 'full') {
      tk.profile = v
    }
    cleanupEmptyConfigToolsNode()
  },
})

const TOOLS_SESSIONS_VISIBILITY_AUTO = '__auto__'

const toolsSessionsVisibilitySelect = computed({
  get() {
    const v = (getDraftTools()?.sessions as Record<string, unknown> | undefined)?.visibility
    if (v === 'self' || v === 'tree' || v === 'agent' || v === 'all')
      return v
    return TOOLS_SESSIONS_VISIBILITY_AUTO
  },
  set(v: string) {
    const s = ensureToolsSessionsNode()
    if (v === TOOLS_SESSIONS_VISIBILITY_AUTO) {
      delete s.visibility
      cleanupEmptyConfigToolsNode()
      return
    }
    if (v === 'self' || v === 'tree' || v === 'agent' || v === 'all') {
      s.visibility = v
    }
    cleanupEmptyConfigToolsNode()
  },
})

const toolsAllowRows = ref<string[]>([])
const toolsAlsoAllowRows = ref<string[]>([])
const toolsDenyRows = ref<string[]>([])
const toolsAgentToAgentAllowRows = ref<string[]>([])

function syncStringArrayRefFromDraft(arr: unknown, target: Ref<string[]>) {
  if (Array.isArray(arr) && arr.every(x => typeof x === 'string')) {
    target.value = arr.length > 0 ? [...arr] : []
  }
  else {
    target.value = []
  }
}

function applyToolsStringList(key: 'allow' | 'alsoAllow' | 'deny', rows: string[]) {
  const tk = ensureConfigToolsNode()
  const trimmed = rows.map(s => s.trim()).filter(s => s.length > 0)
  if (trimmed.length === 0) {
    delete tk[key]
  }
  else {
    tk[key] = trimmed
  }
  cleanupEmptyConfigToolsNode()
}

function addToolsAllowRow() {
  toolsAllowRows.value = [...toolsAllowRows.value, '']
}
function removeToolsAllowRow(i: number) {
  toolsAllowRows.value = toolsAllowRows.value.filter((_, j) => j !== i)
  applyToolsStringList('allow', toolsAllowRows.value)
}
function updateToolsAllowRow(i: number, v: string) {
  const next = [...toolsAllowRows.value]
  next[i] = v
  toolsAllowRows.value = next
  applyToolsStringList('allow', toolsAllowRows.value)
}

function addToolsAlsoAllowRow() {
  toolsAlsoAllowRows.value = [...toolsAlsoAllowRows.value, '']
}
function removeToolsAlsoAllowRow(i: number) {
  toolsAlsoAllowRows.value = toolsAlsoAllowRows.value.filter((_, j) => j !== i)
  applyToolsStringList('alsoAllow', toolsAlsoAllowRows.value)
}
function updateToolsAlsoAllowRow(i: number, v: string) {
  const next = [...toolsAlsoAllowRows.value]
  next[i] = v
  toolsAlsoAllowRows.value = next
  applyToolsStringList('alsoAllow', toolsAlsoAllowRows.value)
}

function addToolsDenyRow() {
  toolsDenyRows.value = [...toolsDenyRows.value, '']
}
function removeToolsDenyRow(i: number) {
  toolsDenyRows.value = toolsDenyRows.value.filter((_, j) => j !== i)
  applyToolsStringList('deny', toolsDenyRows.value)
}
function updateToolsDenyRow(i: number, v: string) {
  const next = [...toolsDenyRows.value]
  next[i] = v
  toolsDenyRows.value = next
  applyToolsStringList('deny', toolsDenyRows.value)
}

const toolsAgentToAgentEnabled = computed({
  get() {
    const ata = getDraftTools()?.agentToAgent as Record<string, unknown> | undefined
    return ata?.enabled === true
  },
  set(v: boolean) {
    const a = ensureToolsAgentToAgentNode()
    if (!v) {
      delete a.enabled
    }
    else {
      a.enabled = true
    }
    cleanupEmptyConfigToolsNode()
  },
})

function applyToolsAgentToAgentAllowFromRows() {
  const a = ensureToolsAgentToAgentNode()
  const trimmed = toolsAgentToAgentAllowRows.value.map(s => s.trim()).filter(s => s.length > 0)
  if (trimmed.length === 0) {
    delete a.allow
  }
  else {
    a.allow = trimmed
  }
  cleanupEmptyConfigToolsNode()
}

function addToolsAgentToAgentAllowRow() {
  toolsAgentToAgentAllowRows.value = [...toolsAgentToAgentAllowRows.value, '']
}
function removeToolsAgentToAgentAllowRow(i: number) {
  toolsAgentToAgentAllowRows.value = toolsAgentToAgentAllowRows.value.filter((_, j) => j !== i)
  applyToolsAgentToAgentAllowFromRows()
}
function updateToolsAgentToAgentAllowRow(i: number, v: string) {
  const next = [...toolsAgentToAgentAllowRows.value]
  next[i] = v
  toolsAgentToAgentAllowRows.value = next
  applyToolsAgentToAgentAllowFromRows()
}

const toolsByProviderKeys = computed(() => {
  const bp = getDraftTools()?.byProvider
  if (!bp || typeof bp !== 'object' || Array.isArray(bp))
    return [] as string[]
  return Object.keys(bp as Record<string, unknown>).sort((a, b) => a.localeCompare(b))
})

function toolsByProviderJsonFor(key: string): string {
  const bp = getDraftTools()?.byProvider as Record<string, unknown> | undefined
  if (!bp || typeof bp !== 'object' || Array.isArray(bp))
    return '{}'
  const v = bp[key]
  if (v === undefined)
    return '{}'
  try {
    return JSON.stringify(v, null, 2)
  }
  catch {
    return '{}'
  }
}

function applyToolsByProviderJson(key: string, raw: string) {
  const bp = ensureToolsByProviderNode()
  const trimmed = raw.trim()
  if (!trimmed) {
    delete bp[key]
    cleanupEmptyConfigToolsNode()
    return
  }
  try {
    bp[key] = JSON.parse(trimmed) as unknown
    cleanupEmptyConfigToolsNode()
  }
  catch {
    /* keep */
  }
}

function onToolsByProviderKeyChange(oldKey: string, newKeyRaw: string) {
  const nk = newKeyRaw.trim()
  if (!nk || nk === oldKey)
    return
  const bp = ensureToolsByProviderNode()
  if (nk in bp)
    return
  bp[nk] = bp[oldKey]
  delete bp[oldKey]
  cleanupEmptyConfigToolsNode()
}

function addToolsByProviderEntry() {
  const bp = ensureToolsByProviderNode()
  let index = 1
  let key = `provider-${index}`
  while (key in bp) {
    index += 1
    key = `provider-${index}`
  }
  bp[key] = {}
}

function removeToolsByProviderEntry(key: string) {
  const bp = ensureToolsByProviderNode()
  delete bp[key]
  cleanupEmptyConfigToolsNode()
}

const toolsElevatedEnabled = computed({
  get() {
    const e = getDraftTools()?.elevated as Record<string, unknown> | undefined
    return e?.enabled === true
  },
  set(v: boolean) {
    const e = ensureToolsElevatedNode()
    if (!v) {
      delete e.enabled
    }
    else {
      e.enabled = true
    }
    cleanupEmptyConfigToolsNode()
  },
})

const toolsElevatedAllowFromJsonLocal = ref('')

function syncToolsElevatedAllowFromFromDraft() {
  const e = getDraftTools()?.elevated as Record<string, unknown> | undefined
  const af = e?.allowFrom
  if (af && typeof af === 'object' && !Array.isArray(af)) {
    try {
      toolsElevatedAllowFromJsonLocal.value = JSON.stringify(af, null, 2)
    }
    catch {
      toolsElevatedAllowFromJsonLocal.value = ''
    }
  }
  else {
    toolsElevatedAllowFromJsonLocal.value = ''
  }
}

function applyToolsElevatedAllowFromJson(raw: string) {
  const e = ensureToolsElevatedNode()
  const t = raw.trim()
  if (!t || t === '{}') {
    delete e.allowFrom
    cleanupEmptyConfigToolsNode()
    return
  }
  try {
    const p = JSON.parse(t) as unknown
    if (!p || typeof p !== 'object' || Array.isArray(p))
      return
    e.allowFrom = p as Record<string, unknown>
    cleanupEmptyConfigToolsNode()
  }
  catch {
    /* keep */
  }
}

const TOOLS_NESTED_JSON_KEYS = [
  'web',
  'media',
  'links',
  'loopDetection',
  'message',
  'exec',
  'fs',
  'subagents',
  'sandbox',
  'sessions_spawn',
] as const

type ToolsNestedJsonKey = (typeof TOOLS_NESTED_JSON_KEYS)[number]

function stringifyToolsSub(v: unknown): string {
  if (v === undefined || v === null)
    return ''
  if (typeof v !== 'object' || Array.isArray(v))
    return ''
  try {
    return JSON.stringify(v, null, 2)
  }
  catch {
    return ''
  }
}

const toolsWebJsonLocal = ref('')
const toolsMediaJsonLocal = ref('')
const toolsLinksJsonLocal = ref('')
const toolsLoopDetectionJsonLocal = ref('')
const toolsMessageJsonLocal = ref('')
const toolsExecJsonLocal = ref('')
const toolsFsJsonLocal = ref('')
const toolsSubagentsJsonLocal = ref('')
const toolsSandboxJsonLocal = ref('')
const toolsSessionsSpawnJsonLocal = ref('')

const TOOLS_NESTED_LOCALS: Record<ToolsNestedJsonKey, Ref<string>> = {
  web: toolsWebJsonLocal,
  media: toolsMediaJsonLocal,
  links: toolsLinksJsonLocal,
  loopDetection: toolsLoopDetectionJsonLocal,
  message: toolsMessageJsonLocal,
  exec: toolsExecJsonLocal,
  fs: toolsFsJsonLocal,
  subagents: toolsSubagentsJsonLocal,
  sandbox: toolsSandboxJsonLocal,
  sessions_spawn: toolsSessionsSpawnJsonLocal,
}

function syncToolsNestedJsonFromDraft() {
  const tk = getDraftTools()
  for (const k of TOOLS_NESTED_JSON_KEYS) {
    TOOLS_NESTED_LOCALS[k].value = stringifyToolsSub(tk?.[k])
  }
}

function applyToolsNestedJsonKey(key: ToolsNestedJsonKey, raw: string) {
  const tk = ensureConfigToolsNode()
  const t = raw.trim()
  if (!t) {
    delete tk[key]
    cleanupEmptyConfigToolsNode()
    return
  }
  try {
    const p = JSON.parse(t) as unknown
    if (p === null || typeof p !== 'object' || Array.isArray(p))
      return
    if (Object.keys(p as Record<string, unknown>).length === 0) {
      delete tk[key]
    }
    else {
      tk[key] = p
    }
    cleanupEmptyConfigToolsNode()
  }
  catch {
    /* keep */
  }
}

function syncToolsFormLocalsFromDraft() {
  syncStringArrayRefFromDraft(getDraftTools()?.allow, toolsAllowRows)
  syncStringArrayRefFromDraft(getDraftTools()?.alsoAllow, toolsAlsoAllowRows)
  syncStringArrayRefFromDraft(getDraftTools()?.deny, toolsDenyRows)
  const ata = getDraftTools()?.agentToAgent
  syncStringArrayRefFromDraft(
    ata && typeof ata === 'object' && !Array.isArray(ata) ? (ata as Record<string, unknown>).allow : undefined,
    toolsAgentToAgentAllowRows,
  )
  syncToolsNestedJsonFromDraft()
  syncToolsElevatedAllowFromFromDraft()
}

function getToolsNestedLocal(k: ToolsNestedJsonKey): string {
  return TOOLS_NESTED_LOCALS[k].value
}

function setToolsNestedLocal(k: ToolsNestedJsonKey, v: string) {
  TOOLS_NESTED_LOCALS[k].value = v
}

const toolsNestedTabs: { key: ToolsNestedJsonKey, titleKey: string, helpKey: string }[] = [
  { key: 'web', titleKey: 'openclaw.configToolsJsonWebTitle', helpKey: 'openclaw.configToolsJsonWebHelp' },
  { key: 'media', titleKey: 'openclaw.configToolsJsonMediaTitle', helpKey: 'openclaw.configToolsJsonMediaHelp' },
  { key: 'links', titleKey: 'openclaw.configToolsJsonLinksTitle', helpKey: 'openclaw.configToolsJsonLinksHelp' },
  {
    key: 'loopDetection',
    titleKey: 'openclaw.configToolsJsonLoopTitle',
    helpKey: 'openclaw.configToolsJsonLoopHelp',
  },
  { key: 'message', titleKey: 'openclaw.configToolsJsonMessageTitle', helpKey: 'openclaw.configToolsJsonMessageHelp' },
  { key: 'exec', titleKey: 'openclaw.configToolsJsonExecTitle', helpKey: 'openclaw.configToolsJsonExecHelp' },
  { key: 'fs', titleKey: 'openclaw.configToolsJsonFsTitle', helpKey: 'openclaw.configToolsJsonFsHelp' },
  {
    key: 'subagents',
    titleKey: 'openclaw.configToolsJsonSubagentsTitle',
    helpKey: 'openclaw.configToolsJsonSubagentsHelp',
  },
  { key: 'sandbox', titleKey: 'openclaw.configToolsJsonSandboxTitle', helpKey: 'openclaw.configToolsJsonSandboxHelp' },
  {
    key: 'sessions_spawn',
    titleKey: 'openclaw.configToolsJsonSessionsSpawnTitle',
    helpKey: 'openclaw.configToolsJsonSessionsSpawnHelp',
  },
]

/** —— AI Agents → Memory（对齐 zod `MemorySchema`）—— */
function getDraftMemory(): Record<string, unknown> | undefined {
  const x = draftConfig.value?.memory
  if (!x || typeof x !== 'object' || Array.isArray(x))
    return undefined
  return x as Record<string, unknown>
}

function ensureConfigMemoryNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.memory || typeof r.memory !== 'object' || Array.isArray(r.memory)) {
    r.memory = {}
  }
  return r.memory as Record<string, unknown>
}

function cleanupEmptyConfigMemoryNode() {
  const root = draftConfig.value
  if (!root?.memory || typeof root.memory !== 'object' || Array.isArray(root.memory))
    return
  const m = root.memory as Record<string, unknown>
  const qmd = m.qmd
  if (qmd && typeof qmd === 'object' && !Array.isArray(qmd) && Object.keys(qmd as Record<string, unknown>).length === 0) {
    delete m.qmd
  }
  if (Object.keys(m).length === 0) {
    delete root.memory
  }
}

const MEMORY_BACKEND_AUTO = '__auto__'

const memoryBackendSelect = computed({
  get() {
    const b = getDraftMemory()?.backend
    if (b === 'builtin' || b === 'qmd')
      return b
    return MEMORY_BACKEND_AUTO
  },
  set(v: string) {
    const m = ensureConfigMemoryNode()
    if (v === MEMORY_BACKEND_AUTO) {
      delete m.backend
    }
    else if (v === 'builtin' || v === 'qmd') {
      m.backend = v
    }
    cleanupEmptyConfigMemoryNode()
  },
})

const MEMORY_CITATIONS_AUTO = '__auto__'

const memoryCitationsSelect = computed({
  get() {
    const c = getDraftMemory()?.citations
    if (c === 'auto' || c === 'on' || c === 'off')
      return c
    return MEMORY_CITATIONS_AUTO
  },
  set(v: string) {
    const m = ensureConfigMemoryNode()
    if (v === MEMORY_CITATIONS_AUTO) {
      delete m.citations
    }
    else if (v === 'auto' || v === 'on' || v === 'off') {
      m.citations = v
    }
    cleanupEmptyConfigMemoryNode()
  },
})

const memoryQmdJsonLocal = ref('')

function syncMemoryQmdJsonFromDraft() {
  const q = getDraftMemory()?.qmd
  if (q !== undefined && q !== null && typeof q === 'object' && !Array.isArray(q)) {
    try {
      memoryQmdJsonLocal.value = JSON.stringify(q, null, 2)
    }
    catch {
      memoryQmdJsonLocal.value = ''
    }
  }
  else {
    memoryQmdJsonLocal.value = ''
  }
}

function applyMemoryQmdJson(raw: string) {
  const m = ensureConfigMemoryNode()
  const t = raw.trim()
  if (!t || t === '{}') {
    delete m.qmd
    cleanupEmptyConfigMemoryNode()
    return
  }
  try {
    const p = JSON.parse(t) as unknown
    if (p === null || typeof p !== 'object' || Array.isArray(p))
      return
    if (Object.keys(p as Record<string, unknown>).length === 0) {
      delete m.qmd
    }
    else {
      m.qmd = p as Record<string, unknown>
    }
    cleanupEmptyConfigMemoryNode()
  }
  catch {
    /* keep */
  }
}

function syncMemoryFormLocalsFromDraft() {
  syncMemoryQmdJsonFromDraft()
}

/** —— AI Agents → Session（对齐 zod `SessionSchema`）—— */
function getDraftSession(): Record<string, unknown> | undefined {
  const x = draftConfig.value?.session
  if (!x || typeof x !== 'object' || Array.isArray(x))
    return undefined
  return x as Record<string, unknown>
}

function ensureConfigSessionNode(): Record<string, unknown> {
  const root = draftConfig.value
  if (!root)
    draftConfig.value = {}
  const r = draftConfig.value!
  if (!r.session || typeof r.session !== 'object' || Array.isArray(r.session)) {
    r.session = {}
  }
  return r.session as Record<string, unknown>
}

function cleanupEmptyConfigSessionNode() {
  const root = draftConfig.value
  if (!root?.session || typeof root.session !== 'object' || Array.isArray(root.session))
    return
  const s = root.session as Record<string, unknown>

  const ata = s.agentToAgent
  if (ata && typeof ata === 'object' && !Array.isArray(ata) && Object.keys(ata as Record<string, unknown>).length === 0) {
    delete s.agentToAgent
  }

  const rst = s.reset
  if (rst && typeof rst === 'object' && !Array.isArray(rst) && Object.keys(rst as Record<string, unknown>).length === 0) {
    delete s.reset
  }

  const rbt = s.resetByType
  if (rbt && typeof rbt === 'object' && !Array.isArray(rbt)) {
    const o = rbt as Record<string, unknown>
    for (const k of Object.keys(o)) {
      const v = o[k]
      if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v as Record<string, unknown>).length === 0) {
        delete o[k]
      }
    }
    if (Object.keys(o).length === 0) {
      delete s.resetByType
    }
  }

  const tb = s.threadBindings
  if (tb && typeof tb === 'object' && !Array.isArray(tb)) {
    const t = tb as Record<string, unknown>
    if (Object.keys(t).length === 0) {
      delete s.threadBindings
    }
  }

  for (const nk of ['resetByChannel', 'identityLinks', 'sendPolicy', 'maintenance'] as const) {
    const v = s[nk]
    if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v as Record<string, unknown>).length === 0) {
      delete s[nk]
    }
  }

  if (Array.isArray(s.resetTriggers) && s.resetTriggers.length === 0) {
    delete s.resetTriggers
  }

  if (Object.keys(s).length === 0) {
    delete root.session
  }
}

const SESSION_SCOPE_AUTO = '__auto__'

const sessionScopeSelect = computed({
  get() {
    const sc = getDraftSession()?.scope
    if (sc === 'per-sender' || sc === 'global')
      return sc
    return SESSION_SCOPE_AUTO
  },
  set(v: string) {
    const m = ensureConfigSessionNode()
    if (v === SESSION_SCOPE_AUTO) {
      delete m.scope
    }
    else if (v === 'per-sender' || v === 'global') {
      m.scope = v
    }
    cleanupEmptyConfigSessionNode()
  },
})

const SESSION_DM_SCOPE_AUTO = '__auto__'

const sessionDmScopeSelect = computed({
  get() {
    const d = getDraftSession()?.dmScope
    if (
      d === 'main'
      || d === 'per-peer'
      || d === 'per-channel-peer'
      || d === 'per-account-channel-peer'
    ) {
      return d
    }
    return SESSION_DM_SCOPE_AUTO
  },
  set(v: string) {
    const m = ensureConfigSessionNode()
    if (v === SESSION_DM_SCOPE_AUTO) {
      delete m.dmScope
    }
    else if (
      v === 'main'
      || v === 'per-peer'
      || v === 'per-channel-peer'
      || v === 'per-account-channel-peer'
    ) {
      m.dmScope = v
    }
    cleanupEmptyConfigSessionNode()
  },
})

const sessionStoreStr = computed({
  get() {
    const v = getDraftSession()?.store
    return typeof v === 'string' ? v : ''
  },
  set(s: string) {
    const m = ensureConfigSessionNode()
    const t = s.trim()
    if (!t) {
      delete m.store
    }
    else {
      m.store = t
    }
    cleanupEmptyConfigSessionNode()
  },
})

const sessionMainKeyStr = computed({
  get() {
    const v = getDraftSession()?.mainKey
    return typeof v === 'string' ? v : ''
  },
  set(s: string) {
    const m = ensureConfigSessionNode()
    const t = s.trim()
    if (!t) {
      delete m.mainKey
    }
    else {
      m.mainKey = t
    }
    cleanupEmptyConfigSessionNode()
  },
})

const SESSION_TYPING_MODE_AUTO = '__auto__'

const sessionTypingModeSelect = computed({
  get() {
    const tm = getDraftSession()?.typingMode
    if (tm === 'never' || tm === 'instant' || tm === 'thinking' || tm === 'message')
      return tm
    return SESSION_TYPING_MODE_AUTO
  },
  set(v: string) {
    const m = ensureConfigSessionNode()
    if (v === SESSION_TYPING_MODE_AUTO) {
      delete m.typingMode
    }
    else if (v === 'never' || v === 'instant' || v === 'thinking' || v === 'message') {
      m.typingMode = v
    }
    cleanupEmptyConfigSessionNode()
  },
})

const sessionTypingIntervalSecondsStr = ref('')
const sessionIdleMinutesStr = ref('')
const sessionParentForkMaxTokensStr = ref('')

function syncSessionNumericLocalsFromDraft() {
  const s = getDraftSession()
  const ti = s?.typingIntervalSeconds
  sessionTypingIntervalSecondsStr.value = typeof ti === 'number' && ti > 0 ? String(ti) : ''
  const im = s?.idleMinutes
  sessionIdleMinutesStr.value = typeof im === 'number' && im > 0 ? String(im) : ''
  const pf = s?.parentForkMaxTokens
  sessionParentForkMaxTokensStr.value = typeof pf === 'number' && pf >= 0 && Number.isFinite(pf) ? String(pf) : ''
}

function applySessionTypingIntervalSeconds() {
  const m = ensureConfigSessionNode()
  const t = sessionTypingIntervalSecondsStr.value.trim()
  if (!t) {
    delete m.typingIntervalSeconds
    cleanupEmptyConfigSessionNode()
    return
  }
  const n = Number.parseInt(t, 10)
  if (!Number.isFinite(n) || n <= 0)
    return
  m.typingIntervalSeconds = n
  cleanupEmptyConfigSessionNode()
}

function applySessionIdleMinutes() {
  const m = ensureConfigSessionNode()
  const t = sessionIdleMinutesStr.value.trim()
  if (!t) {
    delete m.idleMinutes
    cleanupEmptyConfigSessionNode()
    return
  }
  const n = Number.parseInt(t, 10)
  if (!Number.isFinite(n) || n <= 0)
    return
  m.idleMinutes = n
  cleanupEmptyConfigSessionNode()
}

function applySessionParentForkMaxTokens() {
  const m = ensureConfigSessionNode()
  const t = sessionParentForkMaxTokensStr.value.trim()
  if (!t) {
    delete m.parentForkMaxTokens
    cleanupEmptyConfigSessionNode()
    return
  }
  const n = Number.parseInt(t, 10)
  if (!Number.isFinite(n) || n < 0)
    return
  m.parentForkMaxTokens = n
  cleanupEmptyConfigSessionNode()
}

function ensureSessionResetNode(): Record<string, unknown> {
  const m = ensureConfigSessionNode()
  if (!m.reset || typeof m.reset !== 'object' || Array.isArray(m.reset)) {
    m.reset = {}
  }
  return m.reset as Record<string, unknown>
}

const SESSION_RESET_MODE_AUTO = '__auto__'

const sessionResetModeSelect = computed({
  get() {
    const mode = getDraftSession()?.reset as Record<string, unknown> | undefined
    const m = mode?.mode
    if (m === 'daily' || m === 'idle')
      return m
    return SESSION_RESET_MODE_AUTO
  },
  set(v: string) {
    const r = ensureSessionResetNode()
    if (v === SESSION_RESET_MODE_AUTO) {
      delete r.mode
      if (Object.keys(r).length === 0) {
        const s = ensureConfigSessionNode()
        delete s.reset
      }
    }
    else if (v === 'daily' || v === 'idle') {
      r.mode = v
    }
    cleanupEmptyConfigSessionNode()
  },
})

const sessionResetAtHourStr = ref('')
const sessionResetIdleMinutesStr = ref('')

function syncSessionResetLocalsFromDraft() {
  const r = getDraftSession()?.reset as Record<string, unknown> | undefined
  const ah = r?.atHour
  sessionResetAtHourStr.value = typeof ah === 'number' && ah >= 0 && ah <= 23 ? String(ah) : ''
  const im = r?.idleMinutes
  sessionResetIdleMinutesStr.value = typeof im === 'number' && im > 0 ? String(im) : ''
}

function applySessionResetAtHour() {
  const r = ensureSessionResetNode()
  const t = sessionResetAtHourStr.value.trim()
  if (!t) {
    delete r.atHour
    if (Object.keys(r).length === 0) {
      const s = ensureConfigSessionNode()
      delete s.reset
    }
    cleanupEmptyConfigSessionNode()
    return
  }
  const n = Number.parseInt(t, 10)
  if (!Number.isFinite(n) || n < 0 || n > 23)
    return
  r.atHour = n
  cleanupEmptyConfigSessionNode()
}

function applySessionResetIdleMinutes() {
  const r = ensureSessionResetNode()
  const t = sessionResetIdleMinutesStr.value.trim()
  if (!t) {
    delete r.idleMinutes
    if (Object.keys(r).length === 0) {
      const s = ensureConfigSessionNode()
      delete s.reset
    }
    cleanupEmptyConfigSessionNode()
    return
  }
  const n = Number.parseInt(t, 10)
  if (!Number.isFinite(n) || n <= 0)
    return
  r.idleMinutes = n
  cleanupEmptyConfigSessionNode()
}

function ensureSessionAgentToAgentNode(): Record<string, unknown> {
  const m = ensureConfigSessionNode()
  if (!m.agentToAgent || typeof m.agentToAgent !== 'object' || Array.isArray(m.agentToAgent)) {
    m.agentToAgent = {}
  }
  return m.agentToAgent as Record<string, unknown>
}

const sessionAgentToAgentMaxPingPongStr = ref('')

function syncSessionAgentToAgentFromDraft() {
  const a = getDraftSession()?.agentToAgent as Record<string, unknown> | undefined
  const n = a?.maxPingPongTurns
  sessionAgentToAgentMaxPingPongStr.value
    = typeof n === 'number' && n >= 0 && n <= 5 && Number.isInteger(n) ? String(n) : ''
}

function applySessionAgentToAgentMaxPingPong() {
  const t = sessionAgentToAgentMaxPingPongStr.value.trim()
  const m = ensureConfigSessionNode()
  if (!t) {
    const ata = m.agentToAgent as Record<string, unknown> | undefined
    if (ata && typeof ata === 'object' && !Array.isArray(ata)) {
      delete ata.maxPingPongTurns
      if (Object.keys(ata).length === 0) {
        delete m.agentToAgent
      }
    }
    cleanupEmptyConfigSessionNode()
    return
  }
  const n = Number.parseInt(t, 10)
  if (!Number.isFinite(n) || n < 0 || n > 5 || !Number.isInteger(n))
    return
  const a = ensureSessionAgentToAgentNode()
  a.maxPingPongTurns = n
  cleanupEmptyConfigSessionNode()
}

function ensureSessionThreadBindingsNode(): Record<string, unknown> {
  const m = ensureConfigSessionNode()
  if (!m.threadBindings || typeof m.threadBindings !== 'object' || Array.isArray(m.threadBindings)) {
    m.threadBindings = {}
  }
  return m.threadBindings as Record<string, unknown>
}

const sessionThreadBindingsEnabled = computed({
  get() {
    const tb = getDraftSession()?.threadBindings as Record<string, unknown> | undefined
    return tb?.enabled === true
  },
  set(v: boolean) {
    const tb = ensureSessionThreadBindingsNode()
    if (!v) {
      delete tb.enabled
    }
    else {
      tb.enabled = true
    }
    cleanupEmptyConfigSessionNode()
  },
})

const sessionThreadIdleHoursStr = ref('')
const sessionThreadMaxAgeHoursStr = ref('')

function syncSessionThreadBindingsLocalsFromDraft() {
  const tb = getDraftSession()?.threadBindings as Record<string, unknown> | undefined
  const ih = tb?.idleHours
  sessionThreadIdleHoursStr.value = typeof ih === 'number' && ih >= 0 && Number.isFinite(ih) ? String(ih) : ''
  const ma = tb?.maxAgeHours
  sessionThreadMaxAgeHoursStr.value = typeof ma === 'number' && ma >= 0 && Number.isFinite(ma) ? String(ma) : ''
}

function applySessionThreadIdleHours() {
  const tb = ensureSessionThreadBindingsNode()
  const t = sessionThreadIdleHoursStr.value.trim()
  if (!t) {
    delete tb.idleHours
    cleanupEmptyConfigSessionNode()
    return
  }
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0)
    return
  tb.idleHours = n
  cleanupEmptyConfigSessionNode()
}

function applySessionThreadMaxAgeHours() {
  const tb = ensureSessionThreadBindingsNode()
  const t = sessionThreadMaxAgeHoursStr.value.trim()
  if (!t) {
    delete tb.maxAgeHours
    cleanupEmptyConfigSessionNode()
    return
  }
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0)
    return
  tb.maxAgeHours = n
  cleanupEmptyConfigSessionNode()
}

const SESSION_JSON_KEYS = ['resetByType', 'resetByChannel', 'sendPolicy', 'identityLinks', 'maintenance'] as const
type SessionJsonKey = (typeof SESSION_JSON_KEYS)[number]

const sessionResetByTypeJsonLocal = ref('')
const sessionResetByChannelJsonLocal = ref('')
const sessionSendPolicyJsonLocal = ref('')
const sessionIdentityLinksJsonLocal = ref('')
const sessionMaintenanceJsonLocal = ref('')

const SESSION_JSON_LOCALS: Record<SessionJsonKey, Ref<string>> = {
  resetByType: sessionResetByTypeJsonLocal,
  resetByChannel: sessionResetByChannelJsonLocal,
  sendPolicy: sessionSendPolicyJsonLocal,
  identityLinks: sessionIdentityLinksJsonLocal,
  maintenance: sessionMaintenanceJsonLocal,
}

function stringifySessionSub(v: unknown): string {
  if (v === undefined || v === null)
    return ''
  if (typeof v !== 'object' || Array.isArray(v))
    return ''
  try {
    return JSON.stringify(v, null, 2)
  }
  catch {
    return ''
  }
}

function syncSessionJsonLocalsFromDraft() {
  const s = getDraftSession()
  for (const k of SESSION_JSON_KEYS) {
    SESSION_JSON_LOCALS[k].value = stringifySessionSub(s?.[k])
  }
}

function applySessionJsonKey(key: SessionJsonKey, raw: string) {
  const m = ensureConfigSessionNode()
  const t = raw.trim()
  if (!t) {
    delete m[key]
    cleanupEmptyConfigSessionNode()
    return
  }
  try {
    const p = JSON.parse(t) as unknown
    if (p === null || typeof p !== 'object' || Array.isArray(p))
      return
    if (Object.keys(p as Record<string, unknown>).length === 0) {
      delete m[key]
    }
    else {
      m[key] = p
    }
    cleanupEmptyConfigSessionNode()
  }
  catch {
    /* keep */
  }
}

const sessionResetTriggersTextLocal = ref('')

function syncSessionResetTriggersFromDraft() {
  const rt = getDraftSession()?.resetTriggers
  if (Array.isArray(rt) && rt.every(x => typeof x === 'string')) {
    sessionResetTriggersTextLocal.value = rt.length > 0 ? rt.join('\n') : ''
  }
  else {
    sessionResetTriggersTextLocal.value = ''
  }
}

function applySessionResetTriggersText(raw: string) {
  const m = ensureConfigSessionNode()
  const lines = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
  if (lines.length === 0) {
    delete m.resetTriggers
  }
  else {
    m.resetTriggers = lines
  }
  cleanupEmptyConfigSessionNode()
}

const sessionJsonTabs: { key: SessionJsonKey, titleKey: string, helpKey: string }[] = [
  {
    key: 'resetByType',
    titleKey: 'openclaw.configSessionJsonResetByTypeTitle',
    helpKey: 'openclaw.configSessionJsonResetByTypeHelp',
  },
  {
    key: 'resetByChannel',
    titleKey: 'openclaw.configSessionJsonResetByChannelTitle',
    helpKey: 'openclaw.configSessionJsonResetByChannelHelp',
  },
  {
    key: 'sendPolicy',
    titleKey: 'openclaw.configSessionJsonSendPolicyTitle',
    helpKey: 'openclaw.configSessionJsonSendPolicyHelp',
  },
  {
    key: 'identityLinks',
    titleKey: 'openclaw.configSessionJsonIdentityLinksTitle',
    helpKey: 'openclaw.configSessionJsonIdentityLinksHelp',
  },
  {
    key: 'maintenance',
    titleKey: 'openclaw.configSessionJsonMaintenanceTitle',
    helpKey: 'openclaw.configSessionJsonMaintenanceHelp',
  },
]

function getSessionJsonLocal(k: SessionJsonKey): string {
  return SESSION_JSON_LOCALS[k].value
}

function setSessionJsonLocal(k: SessionJsonKey, v: string) {
  SESSION_JSON_LOCALS[k].value = v
}

function syncSessionFormLocalsFromDraft() {
  syncSessionNumericLocalsFromDraft()
  syncSessionResetLocalsFromDraft()
  syncSessionAgentToAgentFromDraft()
  syncSessionThreadBindingsLocalsFromDraft()
  syncSessionJsonLocalsFromDraft()
  syncSessionResetTriggersFromDraft()
}

const cfgGwPort = computed({
  get() {
    const p = draftConfig.value?.gateway as Record<string, unknown> | undefined
    const n = p?.port
    if (typeof n === 'number' && Number.isFinite(n))
      return String(n)
    return ''
  },
  set(v: string) {
    const g = ensureConfigGatewayNode()
    const t = v.trim()
    if (!t) {
      delete g.port
      cleanupEmptyConfigGatewayNode()
      return
    }
    const num = Number(t)
    if (!Number.isInteger(num) || num <= 0)
      return
    g.port = num
  },
})

const cfgGwModeSelect = computed({
  get() {
    const m = (draftConfig.value?.gateway as Record<string, unknown> | undefined)?.mode
    return m === 'remote' ? 'remote' : 'local'
  },
  set(v: string) {
    const g = ensureConfigGatewayNode()
    if (v !== 'remote')
      delete g.mode
    else g.mode = 'remote'
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwBindSelect = computed({
  get() {
    const g = draftConfig.value?.gateway as Record<string, unknown> | undefined
    const b = g?.bind
    if (typeof b === 'string' && (GW_GATEWAY_BIND_VALUES as readonly string[]).includes(b))
      return b
    return GW_CFG_OMIT
  },
  set(v: string) {
    const g = ensureConfigGatewayNode()
    if (!v || v === GW_CFG_OMIT)
      delete g.bind
    else g.bind = v
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwCustomBindHost = computed({
  get() {
    const g = draftConfig.value?.gateway as Record<string, unknown> | undefined
    return typeof g?.customBindHost === 'string' ? g.customBindHost : ''
  },
  set(v: string) {
    const g = ensureConfigGatewayNode()
    const t = v.trim()
    if (!t) {
      delete g.customBindHost
      cleanupEmptyConfigGatewayNode()
      return
    }
    g.customBindHost = t
  },
})

const cfgGwControlUiEnabled = computed({
  get() {
    const c = getDraftGateway()?.controlUi as Record<string, unknown> | undefined
    if (!c)
      return true
    return c.enabled !== false
  },
  set(v: boolean) {
    const c = ensureConfigGatewayControlUiNode()
    if (v)
      delete c.enabled
    else c.enabled = false
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwControlUiBasePath = computed({
  get() {
    const c = getDraftGateway()?.controlUi as Record<string, unknown> | undefined
    return typeof c?.basePath === 'string' ? c.basePath : ''
  },
  set(v: string) {
    const c = ensureConfigGatewayControlUiNode()
    const t = v.trim()
    if (!t)
      delete c.basePath
    else c.basePath = t
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwControlUiRoot = computed({
  get() {
    const c = getDraftGateway()?.controlUi as Record<string, unknown> | undefined
    return typeof c?.root === 'string' ? c.root : ''
  },
  set(v: string) {
    const c = ensureConfigGatewayControlUiNode()
    const t = v.trim()
    if (!t)
      delete c.root
    else c.root = t
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwControlUiDangerHost = computed({
  get() {
    const c = getDraftGateway()?.controlUi as Record<string, unknown> | undefined
    return c?.dangerouslyAllowHostHeaderOriginFallback === true
  },
  set(v: boolean) {
    const c = ensureConfigGatewayControlUiNode()
    if (v)
      c.dangerouslyAllowHostHeaderOriginFallback = true
    else delete c.dangerouslyAllowHostHeaderOriginFallback
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwControlUiAllowInsecureAuth = computed({
  get() {
    const c = getDraftGateway()?.controlUi as Record<string, unknown> | undefined
    return c?.allowInsecureAuth === true
  },
  set(v: boolean) {
    const c = ensureConfigGatewayControlUiNode()
    if (v)
      c.allowInsecureAuth = true
    else delete c.allowInsecureAuth
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwControlUiDisableDeviceAuth = computed({
  get() {
    const c = getDraftGateway()?.controlUi as Record<string, unknown> | undefined
    return c?.dangerouslyDisableDeviceAuth === true
  },
  set(v: boolean) {
    const c = ensureConfigGatewayControlUiNode()
    if (v)
      c.dangerouslyDisableDeviceAuth = true
    else delete c.dangerouslyDisableDeviceAuth
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwAuthModeSelect = computed({
  get() {
    const a = getDraftGateway()?.auth as Record<string, unknown> | undefined
    const m = a?.mode
    if (m === 'none' || m === 'token' || m === 'password' || m === 'trusted-proxy')
      return m
    return GW_CFG_OMIT
  },
  set(v: string) {
    const a = ensureConfigGatewayAuthNode()
    if (!v || v === GW_CFG_OMIT)
      delete a.mode
    else a.mode = v
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwAuthToken = computed({
  get() {
    const a = getDraftGateway()?.auth as Record<string, unknown> | undefined
    return typeof a?.token === 'string' ? a.token : ''
  },
  set(v: string) {
    const a = ensureConfigGatewayAuthNode()
    const t = v.trim()
    if (!t)
      delete a.token
    else a.token = t
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwAuthPassword = computed({
  get() {
    const a = getDraftGateway()?.auth as Record<string, unknown> | undefined
    return typeof a?.password === 'string' ? a.password : ''
  },
  set(v: string) {
    const a = ensureConfigGatewayAuthNode()
    if (!v) {
      delete a.password
      cleanupEmptyConfigGatewayNode()
      return
    }
    a.password = v
  },
})

const cfgGwAuthAllowTailscale = computed({
  get() {
    const a = getDraftGateway()?.auth as Record<string, unknown> | undefined
    return a?.allowTailscale === true
  },
  set(v: boolean) {
    const a = ensureConfigGatewayAuthNode()
    if (v)
      a.allowTailscale = true
    else delete a.allowTailscale
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwAllowRealIpFallback = computed({
  get() {
    const g = draftConfig.value?.gateway as Record<string, unknown> | undefined
    return g?.allowRealIpFallback === true
  },
  set(v: boolean) {
    const g = ensureConfigGatewayNode()
    if (v)
      g.allowRealIpFallback = true
    else delete g.allowRealIpFallback
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwChannelHealthMinutes = computed({
  get() {
    const g = draftConfig.value?.gateway as Record<string, unknown> | undefined
    const n = g?.channelHealthCheckMinutes
    if (typeof n === 'number' && Number.isFinite(n))
      return String(n)
    return ''
  },
  set(v: string) {
    const g = ensureConfigGatewayNode()
    const t = v.trim()
    if (!t) {
      delete g.channelHealthCheckMinutes
      cleanupEmptyConfigGatewayNode()
      return
    }
    const num = Number(t)
    if (!Number.isInteger(num) || num < 0)
      return
    g.channelHealthCheckMinutes = num
  },
})

const cfgGwTailscaleModeSelect = computed({
  get() {
    const ts = getDraftGateway()?.tailscale as Record<string, unknown> | undefined
    const m = ts?.mode
    if (m === 'off' || m === 'serve' || m === 'funnel')
      return m
    return GW_CFG_OMIT
  },
  set(v: string) {
    const t = ensureConfigGatewayTailscaleNode()
    if (!v || v === GW_CFG_OMIT)
      delete t.mode
    else t.mode = v
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwTailscaleResetOnExit = computed({
  get() {
    const ts = getDraftGateway()?.tailscale as Record<string, unknown> | undefined
    return ts?.resetOnExit === true
  },
  set(v: boolean) {
    const t = ensureConfigGatewayTailscaleNode()
    if (v)
      t.resetOnExit = true
    else delete t.resetOnExit
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwRemoteUrl = computed({
  get() {
    const r = getDraftGateway()?.remote as Record<string, unknown> | undefined
    return typeof r?.url === 'string' ? r.url : ''
  },
  set(v: string) {
    const r = ensureConfigGatewayRemoteNode()
    const t = v.trim()
    if (!t)
      delete r.url
    else r.url = t
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwRemoteTransportSelect = computed({
  get() {
    const r = getDraftGateway()?.remote as Record<string, unknown> | undefined
    const tr = r?.transport
    if (tr === 'ssh' || tr === 'direct')
      return tr
    return GW_CFG_OMIT
  },
  set(v: string) {
    const r = ensureConfigGatewayRemoteNode()
    if (!v || v === GW_CFG_OMIT)
      delete r.transport
    else r.transport = v
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwRemoteToken = computed({
  get() {
    const r = getDraftGateway()?.remote as Record<string, unknown> | undefined
    return typeof r?.token === 'string' ? r.token : ''
  },
  set(v: string) {
    const r = ensureConfigGatewayRemoteNode()
    const t = v.trim()
    if (!t)
      delete r.token
    else r.token = t
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwRemotePassword = computed({
  get() {
    const r = getDraftGateway()?.remote as Record<string, unknown> | undefined
    return typeof r?.password === 'string' ? r.password : ''
  },
  set(v: string) {
    const r = ensureConfigGatewayRemoteNode()
    if (!v) {
      delete r.password
      cleanupEmptyConfigGatewayNode()
      return
    }
    r.password = v
  },
})

const cfgGwRemoteTlsFingerprint = computed({
  get() {
    const r = getDraftGateway()?.remote as Record<string, unknown> | undefined
    return typeof r?.tlsFingerprint === 'string' ? r.tlsFingerprint : ''
  },
  set(v: string) {
    const r = ensureConfigGatewayRemoteNode()
    const t = v.trim()
    if (!t)
      delete r.tlsFingerprint
    else r.tlsFingerprint = t
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwRemoteSshTarget = computed({
  get() {
    const r = getDraftGateway()?.remote as Record<string, unknown> | undefined
    return typeof r?.sshTarget === 'string' ? r.sshTarget : ''
  },
  set(v: string) {
    const r = ensureConfigGatewayRemoteNode()
    const t = v.trim()
    if (!t)
      delete r.sshTarget
    else r.sshTarget = t
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwRemoteSshIdentity = computed({
  get() {
    const r = getDraftGateway()?.remote as Record<string, unknown> | undefined
    return typeof r?.sshIdentity === 'string' ? r.sshIdentity : ''
  },
  set(v: string) {
    const r = ensureConfigGatewayRemoteNode()
    const t = v.trim()
    if (!t)
      delete r.sshIdentity
    else r.sshIdentity = t
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwReloadModeSelect = computed({
  get() {
    const rel = getDraftGateway()?.reload as Record<string, unknown> | undefined
    const m = rel?.mode
    if (typeof m === 'string' && (GW_GATEWAY_RELOAD_MODES as readonly string[]).includes(m))
      return m
    return GW_CFG_OMIT
  },
  set(v: string) {
    const r = ensureConfigGatewayReloadNode()
    if (!v || v === GW_CFG_OMIT)
      delete r.mode
    else r.mode = v
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwReloadDebounceMs = computed({
  get() {
    const rel = getDraftGateway()?.reload as Record<string, unknown> | undefined
    const n = rel?.debounceMs
    if (typeof n === 'number' && Number.isFinite(n))
      return String(n)
    return ''
  },
  set(v: string) {
    const r = ensureConfigGatewayReloadNode()
    const t = v.trim()
    if (!t) {
      delete r.debounceMs
      cleanupEmptyConfigGatewayNode()
      return
    }
    const num = Number(t)
    if (!Number.isInteger(num) || num < 0)
      return
    r.debounceMs = num
  },
})

const cfgGwTlsEnabled = computed({
  get() {
    const tls = getDraftGateway()?.tls as Record<string, unknown> | undefined
    return tls?.enabled === true
  },
  set(v: boolean) {
    const t = ensureConfigGatewayTlsNode()
    if (v)
      t.enabled = true
    else delete t.enabled
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwTlsAutoGenerate = computed({
  get() {
    const tls = getDraftGateway()?.tls as Record<string, unknown> | undefined
    return tls?.autoGenerate === true
  },
  set(v: boolean) {
    const t = ensureConfigGatewayTlsNode()
    if (v)
      t.autoGenerate = true
    else delete t.autoGenerate
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwTlsCertPath = computed({
  get() {
    const tls = getDraftGateway()?.tls as Record<string, unknown> | undefined
    return typeof tls?.certPath === 'string' ? tls.certPath : ''
  },
  set(v: string) {
    const t = ensureConfigGatewayTlsNode()
    const s = v.trim()
    if (!s)
      delete t.certPath
    else t.certPath = s
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwTlsKeyPath = computed({
  get() {
    const tls = getDraftGateway()?.tls as Record<string, unknown> | undefined
    return typeof tls?.keyPath === 'string' ? tls.keyPath : ''
  },
  set(v: string) {
    const t = ensureConfigGatewayTlsNode()
    const s = v.trim()
    if (!s)
      delete t.keyPath
    else t.keyPath = s
    cleanupEmptyConfigGatewayNode()
  },
})

const cfgGwTlsCaPath = computed({
  get() {
    const tls = getDraftGateway()?.tls as Record<string, unknown> | undefined
    return typeof tls?.caPath === 'string' ? tls.caPath : ''
  },
  set(v: string) {
    const t = ensureConfigGatewayTlsNode()
    const s = v.trim()
    if (!s)
      delete t.caPath
    else t.caPath = s
    cleanupEmptyConfigGatewayNode()
  },
})

function gwStringArrayToJson(path: 'trustedProxies' | 'controlUiAllowed'): string {
  const g = draftConfig.value?.gateway as Record<string, unknown> | undefined
  if (!g)
    return '[]'
  let a: unknown
  if (path === 'trustedProxies') {
    a = g.trustedProxies
  }
  else {
    const c = g.controlUi as Record<string, unknown> | undefined
    a = c?.allowedOrigins
  }
  if (!Array.isArray(a))
    return '[]'
  try {
    return JSON.stringify(a, null, 2)
  }
  catch {
    return '[]'
  }
}

const gwTrustedProxiesJsonLocal = ref('')
const gwControlUiAllowedOriginsJsonLocal = ref('')
const gwAuthRateLimitJsonLocal = ref('')
const gwAuthTrustedProxyJsonLocal = ref('')

function syncGwJsonLocalsFromDraft() {
  gwTrustedProxiesJsonLocal.value = gwStringArrayToJson('trustedProxies')
  gwControlUiAllowedOriginsJsonLocal.value = gwStringArrayToJson('controlUiAllowed')
  const a = getDraftGateway()?.auth as Record<string, unknown> | undefined
  const rl = a?.rateLimit
  if (rl && typeof rl === 'object' && !Array.isArray(rl)) {
    try {
      gwAuthRateLimitJsonLocal.value = JSON.stringify(rl, null, 2)
    }
    catch {
      gwAuthRateLimitJsonLocal.value = '{}'
    }
  }
  else {
    gwAuthRateLimitJsonLocal.value = ''
  }
  const tp = a?.trustedProxy
  if (tp && typeof tp === 'object' && !Array.isArray(tp)) {
    try {
      gwAuthTrustedProxyJsonLocal.value = JSON.stringify(tp, null, 2)
    }
    catch {
      gwAuthTrustedProxyJsonLocal.value = '{}'
    }
  }
  else {
    gwAuthTrustedProxyJsonLocal.value = ''
  }
}

function applyGwTrustedProxiesFromJson(raw: string) {
  try {
    const parsed = JSON.parse(raw.trim() || '[]')
    if (!Array.isArray(parsed)) {
      gwTrustedProxiesJsonLocal.value = gwStringArrayToJson('trustedProxies')
      return
    }
    const norm = parsed.map(x => (typeof x === 'string' ? x : String(x))).map(s => s.trim())
    const g = ensureConfigGatewayNode()
    const filtered = norm.filter(s => s.length > 0)
    if (filtered.length === 0)
      delete g.trustedProxies
    else g.trustedProxies = filtered
    cleanupEmptyConfigGatewayNode()
    gwTrustedProxiesJsonLocal.value = gwStringArrayToJson('trustedProxies')
  }
  catch {
    gwTrustedProxiesJsonLocal.value = gwStringArrayToJson('trustedProxies')
  }
}

function applyGwControlUiAllowedOriginsFromJson(raw: string) {
  try {
    const parsed = JSON.parse(raw.trim() || '[]')
    if (!Array.isArray(parsed)) {
      gwControlUiAllowedOriginsJsonLocal.value = gwStringArrayToJson('controlUiAllowed')
      return
    }
    const norm = parsed.map(x => (typeof x === 'string' ? x : String(x))).map(s => s.trim())
    const c = ensureConfigGatewayControlUiNode()
    const filtered = norm.filter(s => s.length > 0)
    if (filtered.length === 0)
      delete c.allowedOrigins
    else c.allowedOrigins = filtered
    cleanupEmptyConfigGatewayNode()
    gwControlUiAllowedOriginsJsonLocal.value = gwStringArrayToJson('controlUiAllowed')
  }
  catch {
    gwControlUiAllowedOriginsJsonLocal.value = gwStringArrayToJson('controlUiAllowed')
  }
}

function applyGwAuthRateLimitFromJson(raw: string) {
  const a = ensureConfigGatewayAuthNode()
  try {
    const t = raw.trim()
    if (!t) {
      delete a.rateLimit
      cleanupEmptyConfigGatewayNode()
      syncGwJsonLocalsFromDraft()
      return
    }
    const parsed = JSON.parse(t) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      syncGwJsonLocalsFromDraft()
      return
    }
    a.rateLimit = parsed as Record<string, unknown>
    cleanupEmptyConfigGatewayNode()
    syncGwJsonLocalsFromDraft()
  }
  catch {
    syncGwJsonLocalsFromDraft()
  }
}

function applyGwAuthTrustedProxyFromJson(raw: string) {
  const a = ensureConfigGatewayAuthNode()
  try {
    const t = raw.trim()
    if (!t) {
      delete a.trustedProxy
      cleanupEmptyConfigGatewayNode()
      syncGwJsonLocalsFromDraft()
      return
    }
    const parsed = JSON.parse(t) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      syncGwJsonLocalsFromDraft()
      return
    }
    const o = parsed as Record<string, unknown>
    if (typeof o.userHeader !== 'string' || !o.userHeader.trim()) {
      syncGwJsonLocalsFromDraft()
      return
    }
    a.trustedProxy = o
    cleanupEmptyConfigGatewayNode()
    syncGwJsonLocalsFromDraft()
  }
  catch {
    syncGwJsonLocalsFromDraft()
  }
}

const gatewayToolsAllowRows = ref<string[]>([])
const gatewayToolsDenyRows = ref<string[]>([])

function syncGatewayToolsAllowFromDraft() {
  const g = draftConfig.value?.gateway as Record<string, unknown> | undefined
  const t = g?.tools as Record<string, unknown> | undefined
  const a = t?.allow
  if (!Array.isArray(a)) {
    gatewayToolsAllowRows.value = []
    return
  }
  gatewayToolsAllowRows.value = a.map(x => (typeof x === 'string' ? x : String(x)))
}

function syncGatewayToolsDenyFromDraft() {
  const g = draftConfig.value?.gateway as Record<string, unknown> | undefined
  const t = g?.tools as Record<string, unknown> | undefined
  const a = t?.deny
  if (!Array.isArray(a)) {
    gatewayToolsDenyRows.value = []
    return
  }
  gatewayToolsDenyRows.value = a.map(x => (typeof x === 'string' ? x : String(x)))
}

function applyGatewayToolsAllowFromRows() {
  const trimmed = gatewayToolsAllowRows.value.map(s => s.trim()).filter(s => s.length > 0)
  const t = ensureConfigGatewayToolsNode()
  if (trimmed.length === 0)
    delete t.allow
  else t.allow = trimmed
  cleanupEmptyConfigGatewayNode()
}

function applyGatewayToolsDenyFromRows() {
  const trimmed = gatewayToolsDenyRows.value.map(s => s.trim()).filter(s => s.length > 0)
  const t = ensureConfigGatewayToolsNode()
  if (trimmed.length === 0)
    delete t.deny
  else t.deny = trimmed
  cleanupEmptyConfigGatewayNode()
}

function addGatewayToolsAllowRow() {
  gatewayToolsAllowRows.value = [...gatewayToolsAllowRows.value, '']
}

function removeGatewayToolsAllowRow(i: number) {
  gatewayToolsAllowRows.value = gatewayToolsAllowRows.value.filter((_, j) => j !== i)
  applyGatewayToolsAllowFromRows()
}

function updateGatewayToolsAllowRow(i: number, v: string) {
  const next = [...gatewayToolsAllowRows.value]
  next[i] = v
  gatewayToolsAllowRows.value = next
}

function addGatewayToolsDenyRow() {
  gatewayToolsDenyRows.value = [...gatewayToolsDenyRows.value, '']
}

function removeGatewayToolsDenyRow(i: number) {
  gatewayToolsDenyRows.value = gatewayToolsDenyRows.value.filter((_, j) => j !== i)
  applyGatewayToolsDenyFromRows()
}

function updateGatewayToolsDenyRow(i: number, v: string) {
  const next = [...gatewayToolsDenyRows.value]
  next[i] = v
  gatewayToolsDenyRows.value = next
}

watch(
  () =>
    [settingsSubPage.value, activeSection.value, formMode.value, snapshot.value?.hash] as const,
  () => {
    if (formMode.value !== 'form')
      return
    if (settingsSubPage.value === 'infrastructure' && activeSection.value === 'gateway') {
      syncGwJsonLocalsFromDraft()
      syncGatewayToolsAllowFromDraft()
      syncGatewayToolsDenyFromDraft()
    }
    if (settingsSubPage.value === 'infrastructure' && activeSection.value === 'browser') {
      syncBrowserJsonLocalsFromDraft()
    }
    if (settingsSubPage.value === 'infrastructure' && activeSection.value === 'nodeHost') {
      syncNodeHostAllowProfilesJsonFromDraft()
    }
    if (settingsSubPage.value === 'aiAgents' && activeSection.value === 'agents') {
      syncAgentsJsonLocalsFromDraft()
    }
    if (settingsSubPage.value === 'aiAgents' && activeSection.value === 'models') {
      syncModelsJsonLocalsFromDraft()
    }
    if (settingsSubPage.value === 'aiAgents' && activeSection.value === 'skills') {
      syncSkillsRowsFromDraft()
    }
    if (settingsSubPage.value === 'aiAgents' && activeSection.value === 'tools') {
      syncToolsFormLocalsFromDraft()
    }
    if (settingsSubPage.value === 'aiAgents' && activeSection.value === 'memory') {
      syncMemoryFormLocalsFromDraft()
    }
    if (settingsSubPage.value === 'aiAgents' && activeSection.value === 'session') {
      syncSessionFormLocalsFromDraft()
    }
  },
  { immediate: true },
)

function setCheckOnStart(v: boolean) {
  const u = ensureUpdateNode()
  u.checkOnStart = v
}

function setAutoEnabled(v: boolean) {
  const a = ensureAutoNode()
  a.enabled = v
}

function bumpNumber(
  path: 'stableDelayHours' | 'stableJitterHours' | 'betaCheckIntervalHours',
  delta: number,
) {
  const a = ensureAutoNode()
  if (path === 'betaCheckIntervalHours') {
    const cur = typeof a.betaCheckIntervalHours === 'number' ? a.betaCheckIntervalHours : 1
    const next = Math.min(24, Math.max(1, cur + delta))
    a.betaCheckIntervalHours = next
    return
  }
  const cur
    = typeof a[path] === 'number' && !Number.isNaN(a[path] as number)
      ? (a[path] as number)
      : path === 'stableDelayHours'
        ? 6
        : 12
  const next = Math.min(168, Math.max(0, cur + delta))
  a[path] = next
}

async function load() {
  if (!gateway?.connected)
    return
  loading.value = true
  try {
    const res = await gateway.request<ConfigSnapshot>(RPC.configGet, {})
    snapshot.value = res ?? null
    configPath.value = res?.path ?? null
    setFromSnapshot(res ?? null)
  }
  finally {
    loading.value = false
  }
}

async function save() {
  if (!gateway?.connected || !canSave.value)
    return
  saving.value = true
  try {
    const raw
      = formMode.value === 'raw'
        ? rawInput.value
        : JSON.stringify(formValue.value ?? {}, null, 2)
    await gateway.request(RPC.configSet, { raw, baseHash: baseHash.value })
    await load()
  }
  finally {
    saving.value = false
  }
}

watch(formMode, (mode) => {
  if (mode === 'raw') {
    rawInput.value = JSON.stringify(draftConfig.value ?? {}, null, 2)
    return
  }
  try {
    draftConfig.value = JSON.parse(rawInput.value || '{}') as Record<string, unknown>
  }
  catch {
    resetDraftFromSnapshot(snapshot.value)
  }
})

watch(
  () => gateway?.connected,
  (c) => {
    if (c)
      void load()
  },
  { immediate: true },
)

watch(
  snapshot,
  (s) => {
    setFromSnapshot(s)
    if (formMode.value === 'form')
      resetDraftFromSnapshot(s)
  },
  { immediate: true },
)
</script>

<template>
  <div class="min-h-0 flex-1 overflow-visible pt-1 pl-1 pr-1 pb-1">
    <div class="config-layout flex flex-col gap-3">
      <!-- Actions bar -->
      <div class="config-actions flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <div class="config-actions__left flex items-center gap-2">
          <span v-if="hasChanges" class="config-changes-badge rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-700 text-sm dark:bg-amber-500/20 dark:text-amber-400">
            {{
              formMode === 'raw'
                ? t('openclaw.configUnsavedChanges')
                : t('openclaw.configUnsavedCount', { n: diff.length })
            }}
          </span>
          <span v-else class="text-muted-foreground text-sm">{{ t('openclaw.configNoChanges') }}</span>
        </div>
        <div class="config-actions__right flex flex-wrap items-center gap-2">
          <UiButton
            v-if="configPath"
            variant="outline"
            size="sm"
            :title="t('openclaw.configOpenTitle', { path: configPath })"
            @click="() => {}"
          >
            <FileText class="mr-1 size-3.5" />
            {{ t('openclaw.configOpen') }}
          </UiButton>
          <UiButton variant="outline" size="sm" :disabled="loading" @click="load()">
            <RefreshCw class="mr-1 size-3.5" :class="{ 'animate-spin': loading }" />
            {{ loading ? t('openclaw.configLoading') : t('openclaw.configReload') }}
          </UiButton>
          <UiButton variant="default" size="sm" :disabled="!canSave" @click="save()">
            <Save class="mr-1 size-3.5" />
            {{ saving ? t('openclaw.configSaving') : t('openclaw.configSave') }}
          </UiButton>
          <UiButton variant="outline" size="sm" :disabled="!canSave" @click="save()">
            <Upload class="mr-1 size-3.5" />
            {{ t('openclaw.configApply') }}
          </UiButton>
          <UiButton variant="outline" size="sm" :disabled="!gateway?.connected">
            {{ t('openclaw.configUpdate') }}
          </UiButton>
        </div>
      </div>

      <!-- Section tabs + Form/Raw -->
      <div class="config-tabs flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 shadow-sm">
        <div
          class="config-tabs__scroller flex flex-wrap gap-1"
          role="tablist"
          :aria-label="t('openclaw.configSectionsAriaLabel')"
        >
          <UiButton
            v-for="tab in visibleTabs"
            :key="tab.key === null ? `nav-root-${settingsSubPage}` : tab.key"
            variant="outline"
            size="sm"
            role="tab"
            :aria-selected="activeSection === tab.key"
            :class="{ 'bg-primary text-primary-foreground': activeSection === tab.key }"
            @click="activeSection = tab.key"
          >
            {{ sectionTabLabel(tab) }}
          </UiButton>
        </div>
        <div class="config-tabs__right ml-auto flex items-center gap-1">
          <UiButton
            variant="outline"
            size="sm"
            :class="{ 'bg-primary text-primary-foreground': formMode === 'form' }"
            @click="formMode = 'form'"
          >
            {{ t('openclaw.configForm') }}
          </UiButton>
          <UiButton
            variant="outline"
            size="sm"
            :class="{ 'bg-primary text-primary-foreground': formMode === 'raw' }"
            @click="formMode = 'raw'"
          >
            {{ t('openclaw.configRaw') }}
          </UiButton>
        </div>
      </div>

      <!-- Diff panel (form mode) -->
      <UiCollapsible v-if="hasChanges && formMode === 'form' && diff.length" class="rounded-xl border border-border bg-card">
        <UiCollapsibleTrigger
          class="config-diff-trigger flex w-full items-center justify-between px-4 py-2 text-left text-sm"
        >
          <span>{{ t('openclaw.configViewPendingCount', { n: diff.length }) }}</span>
          <ChevronDown class="size-4 shrink-0 opacity-50" />
        </UiCollapsibleTrigger>
        <UiCollapsibleContent>
          <div class="config-diff-content border-t border-border px-4 py-3">
            <div
              v-for="c in diff"
              :key="c.path"
              class="config-diff-item flex flex-wrap gap-2 text-xs"
            >
              <span class="font-mono text-muted-foreground">{{ c.path }}</span>
              <span class="text-red-600 dark:text-red-400">{{ JSON.stringify(c.from) }}</span>
              <span>→</span>
              <span class="text-green-600 dark:text-green-400">{{ JSON.stringify(c.to) }}</span>
            </div>
          </div>
        </UiCollapsibleContent>
      </UiCollapsible>

      <!-- OpenClaw：config-main → config-section-hero（表单子页）→ config-content -->
      <div
        class="config-main flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      >
        <div
          v-if="showConfigFormHero"
          class="config-section-hero flex shrink-0 items-center gap-3.5 border-b border-border bg-muted/40 px-[22px] py-4 dark:bg-muted/25"
        >
          <div
            class="config-section-hero__icon flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/15 p-1.5 text-primary dark:bg-primary/20"
          >
            <component :is="configFormHeroIcon" class="size-5" stroke-width="2" />
          </div>
          <div class="grid min-w-0 gap-0.5">
            <div
              class="config-section-hero__title truncate text-[15px] font-semibold leading-tight tracking-tight text-foreground"
            >
              {{ activeSectionTitle }}
            </div>
            <div
              v-if="configFormHeroDesc"
              class="config-section-hero__desc text-xs leading-snug text-muted-foreground"
            >
              {{ configFormHeroDesc }}
            </div>
          </div>
        </div>
        <div class="config-content min-h-0 min-w-0 flex-1 overflow-y-auto scroll-smooth px-[22px] py-5">
          <template v-if="!gateway?.connected">
            <p class="py-8 text-center text-muted-foreground text-sm">
              {{ t('openclaw.connectFirst') }}
            </p>
          </template>
          <template v-else-if="loading">
            <p class="text-muted-foreground text-sm">
              {{ t('common.loading') }}
            </p>
          </template>
          <template v-else>
            <template v-if="formMode === 'raw'">
              <UiTextarea
                v-model="rawInput"
                class="font-mono text-xs min-h-[320px]"
                placeholder="{&quot;meta&quot;: {}, ...}"
              />
            </template>
            <template v-else>
              <template v-if="settingsSubPage === 'main'">
                <!-- Updates：与 openclaw Control UI 表单一致 -->
                <div
                  v-if="(activeSection === 'update' || activeSection === null) && draftConfig"
                  class="config-update-form max-h-[70vh] overflow-y-auto pr-1"
                >
                  <header class="config-section-hero mb-8">
                    <h2 class="text-lg font-semibold tracking-tight">
                      {{ activeSection === null ? t('openclaw.configSettingsBlurbTitle') : t('openclaw.configUpdateTitle') }}
                    </h2>
                    <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                      {{ t('openclaw.configUpdateIntro') }}
                    </p>
                  </header>

                  <section class="space-y-2">
                    <h3 class="mb-2 font-medium text-sm">
                      {{ t('openclaw.configUpdateGroupRelease') }}
                    </h3>

                    <div class="space-y-1 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configUpdateChannel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configUpdateChannelHelp') }}
                          </p>
                        </div>
                        <UiSelect v-model="updateChannelSelect" class="w-full max-w-[220px] shrink-0">
                          <UiSelectTrigger class="h-9">
                            <UiSelectValue :placeholder="t('openclaw.configUpdateChannelAuto')" />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem :value="CHANNEL_AUTO">
                              {{ t('openclaw.configUpdateChannelAuto') }}
                            </UiSelectItem>
                            <UiSelectItem value="stable">
                              stable
                            </UiSelectItem>
                            <UiSelectItem value="beta">
                              beta
                            </UiSelectItem>
                            <UiSelectItem value="dev">
                              dev
                            </UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>

                      <UiSeparator class="my-4" />

                      <div class="flex items-center justify-between gap-4 py-1">
                        <div class="min-w-0">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configUpdateCheckOnStart') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configUpdateCheckOnStartHelp') }}
                          </p>
                        </div>
                        <UiSwitch
                          :checked="updateSub?.checkOnStart !== false"
                          @update:checked="setCheckOnStart"
                        />
                      </div>
                    </div>
                  </section>

                  <section class="mt-8 space-y-2">
                    <h3 class="font-medium text-sm">
                      {{ t('openclaw.configUpdateAutoHeading') }}
                    </h3>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configUpdateAutoHeadingDesc') }}
                    </p>

                    <div class="space-y-1 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="flex items-center justify-between gap-4 border-border border-b py-3 first:pt-0">
                        <div class="min-w-0">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configUpdateAutoEnabled') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configUpdateAutoEnabledHelp') }}
                          </p>
                        </div>
                        <UiSwitch
                          :checked="autoSub?.enabled === true"
                          @update:checked="setAutoEnabled"
                        />
                      </div>

                      <div class="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configUpdateStableDelay') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configUpdateStableDelayHelp') }}
                          </p>
                        </div>
                        <div class="flex items-center gap-1">
                          <UiButton
                            type="button"
                            variant="outline"
                            size="icon"
                            class="size-8 shrink-0"
                            @click="bumpNumber('stableDelayHours', -1)"
                          >
                            <Minus class="size-3.5" />
                          </UiButton>
                          <UiInput
                            v-model="stableDelayStr"
                            class="h-8 w-14 text-center font-mono text-xs tabular-nums"
                            type="number"
                            min="0"
                            max="168"
                          />
                          <UiButton
                            type="button"
                            variant="outline"
                            size="icon"
                            class="size-8 shrink-0"
                            @click="bumpNumber('stableDelayHours', 1)"
                          >
                            <Plus class="size-3.5" />
                          </UiButton>
                        </div>
                      </div>

                      <UiSeparator />

                      <div class="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configUpdateStableJitter') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configUpdateStableJitterHelp') }}
                          </p>
                        </div>
                        <div class="flex items-center gap-1">
                          <UiButton
                            type="button"
                            variant="outline"
                            size="icon"
                            class="size-8 shrink-0"
                            @click="bumpNumber('stableJitterHours', -1)"
                          >
                            <Minus class="size-3.5" />
                          </UiButton>
                          <UiInput
                            v-model="stableJitterStr"
                            class="h-8 w-14 text-center font-mono text-xs tabular-nums"
                            type="number"
                            min="0"
                            max="168"
                          />
                          <UiButton
                            type="button"
                            variant="outline"
                            size="icon"
                            class="size-8 shrink-0"
                            @click="bumpNumber('stableJitterHours', 1)"
                          >
                            <Plus class="size-3.5" />
                          </UiButton>
                        </div>
                      </div>

                      <UiSeparator />

                      <div class="flex flex-col gap-1 pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configUpdateBetaInterval') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configUpdateBetaIntervalHelp') }}
                          </p>
                        </div>
                        <div class="flex items-center gap-1">
                          <UiButton
                            type="button"
                            variant="outline"
                            size="icon"
                            class="size-8 shrink-0"
                            @click="bumpNumber('betaCheckIntervalHours', -1)"
                          >
                            <Minus class="size-3.5" />
                          </UiButton>
                          <UiInput
                            v-model="betaIntervalStr"
                            class="h-8 w-14 text-center font-mono text-xs tabular-nums"
                            type="number"
                            min="1"
                            max="24"
                          />
                          <UiButton
                            type="button"
                            variant="outline"
                            size="icon"
                            class="size-8 shrink-0"
                            @click="bumpNumber('betaCheckIntervalHours', 1)"
                          >
                            <Plus class="size-3.5" />
                          </UiButton>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <div
                  v-else-if="activeSection === 'env' && draftConfig"
                  class="config-env-form max-h-[70vh] space-y-8 overflow-y-auto pr-1"
                >
                  <header class="config-section-hero">
                    <h2 class="text-lg font-semibold tracking-tight">
                      {{ t('openclaw.configEnvTitle') }}
                    </h2>
                    <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                      {{ t('openclaw.configEnvIntro') }}
                    </p>
                  </header>

                  <section class="space-y-2">
                    <h3 class="font-medium text-sm">
                      {{ t('openclaw.configEnvVarsTitle') }}
                    </h3>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configEnvVarsHelp') }}
                    </p>

                    <div class="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
                      <div
                        v-for="[key, value] in envVarEntries"
                        :key="key"
                        class="grid grid-cols-1 items-center gap-2 md:grid-cols-[220px_1fr_auto]"
                      >
                        <UiInput :model-value="key" disabled class="h-8 font-mono text-xs" />
                        <UiInput
                          :model-value="value"
                          class="h-8 font-mono text-xs"
                          @update:model-value="(v: string | number) => updateEnvVarValue(key, String(v ?? ''))"
                        />
                        <UiButton type="button" size="icon" variant="ghost" class="size-8" @click="removeEnvVar(key)">
                          <Minus class="size-3.5" />
                        </UiButton>
                      </div>

                      <UiSeparator />

                      <div class="grid grid-cols-1 items-center gap-2 md:grid-cols-[220px_1fr_auto]">
                        <UiInput
                          v-model="newEnvKey"
                          class="h-8 font-mono text-xs"
                          :placeholder="t('openclaw.configEnvKeyPlaceholder')"
                        />
                        <UiInput
                          v-model="newEnvValue"
                          class="h-8 font-mono text-xs"
                          :placeholder="t('openclaw.configEnvValuePlaceholder')"
                        />
                        <UiButton type="button" size="icon" variant="outline" class="size-8" @click="addEnvVar">
                          <Plus class="size-3.5" />
                        </UiButton>
                      </div>
                    </div>
                  </section>

                  <section class="space-y-2">
                    <h3 class="font-medium text-sm">
                      {{ t('openclaw.configShellEnvTitle') }}
                    </h3>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configShellEnvHelp') }}
                    </p>

                    <div class="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="flex items-center justify-between gap-4">
                        <div class="min-w-0">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configShellEnvEnabled') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configShellEnvEnabledHelp') }}
                          </p>
                        </div>
                        <UiSwitch v-model:checked="shellEnvEnabled" />
                      </div>

                      <UiSeparator />

                      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div class="min-w-0">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configShellEnvTimeout') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configShellEnvTimeoutHelp') }}
                          </p>
                        </div>
                        <UiInput
                          v-model="shellEnvTimeoutStr"
                          type="number"
                          min="0"
                          class="h-8 w-28 font-mono text-xs tabular-nums"
                        />
                      </div>
                    </div>
                  </section>
                </div>

                <div
                  v-else-if="activeSection === 'auth' && draftConfig"
                  class="config-auth-form max-h-[70vh] space-y-8 overflow-y-auto pr-1"
                >
                  <header class="config-section-hero">
                    <h2 class="text-lg font-semibold tracking-tight">
                      {{ t('openclaw.configAuthTitle') }}
                    </h2>
                    <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                      {{ t('openclaw.configAuthIntro') }}
                    </p>
                  </header>

                  <section class="space-y-2">
                    <h3 class="font-medium text-sm">
                      {{ t('openclaw.configAuthCooldownsTitle') }}
                    </h3>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configAuthCooldownsHelp') }}
                    </p>

                    <div class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
                        <div>
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configAuthBillingBackoff') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configAuthBillingBackoffHelp') }}
                          </p>
                        </div>
                        <div class="flex items-center gap-1">
                          <UiButton type="button" variant="outline" size="icon" class="size-8" @click="bumpAuthNumber('billingBackoffHours', -1)">
                            <Minus class="size-3.5" />
                          </UiButton>
                          <UiInput v-model="authBillingBackoffStr" type="number" min="0" class="h-8 w-20 text-center font-mono text-xs tabular-nums" />
                          <UiButton type="button" variant="outline" size="icon" class="size-8" @click="bumpAuthNumber('billingBackoffHours', 1)">
                            <Plus class="size-3.5" />
                          </UiButton>
                        </div>
                      </div>

                      <UiSeparator />

                      <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
                        <div>
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configAuthBillingMax') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configAuthBillingMaxHelp') }}
                          </p>
                        </div>
                        <div class="flex items-center gap-1">
                          <UiButton type="button" variant="outline" size="icon" class="size-8" @click="bumpAuthNumber('billingMaxHours', -1)">
                            <Minus class="size-3.5" />
                          </UiButton>
                          <UiInput v-model="authBillingMaxStr" type="number" min="0" class="h-8 w-20 text-center font-mono text-xs tabular-nums" />
                          <UiButton type="button" variant="outline" size="icon" class="size-8" @click="bumpAuthNumber('billingMaxHours', 1)">
                            <Plus class="size-3.5" />
                          </UiButton>
                        </div>
                      </div>

                      <UiSeparator />

                      <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
                        <div>
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configAuthFailureWindow') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configAuthFailureWindowHelp') }}
                          </p>
                        </div>
                        <div class="flex items-center gap-1">
                          <UiButton type="button" variant="outline" size="icon" class="size-8" @click="bumpAuthNumber('failureWindowHours', -1)">
                            <Minus class="size-3.5" />
                          </UiButton>
                          <UiInput v-model="authFailureWindowStr" type="number" min="0" class="h-8 w-20 text-center font-mono text-xs tabular-nums" />
                          <UiButton type="button" variant="outline" size="icon" class="size-8" @click="bumpAuthNumber('failureWindowHours', 1)">
                            <Plus class="size-3.5" />
                          </UiButton>
                        </div>
                      </div>

                      <UiSeparator />

                      <div class="space-y-1">
                        <UiLabel class="text-sm font-medium">
                          {{ t('openclaw.configAuthBackoffOverrides') }}
                        </UiLabel>
                        <p class="text-muted-foreground text-xs">
                          {{ t('openclaw.configAuthBackoffOverridesHelp') }}
                        </p>
                        <UiTextarea
                          v-model="authBackoffByProviderText"
                          class="min-h-[120px] font-mono text-xs"
                          placeholder="{&quot;openai&quot;: 6, &quot;anthropic&quot;: 8}"
                        />
                      </div>
                    </div>
                  </section>
                </div>

                <div
                  v-else-if="activeSection === 'meta' && draftConfig"
                  class="config-meta-form max-h-[70vh] space-y-8 overflow-y-auto pr-1"
                >
                  <header class="config-section-hero">
                    <h2 class="text-lg font-semibold tracking-tight">
                      {{ t('openclaw.configMetaTitle') }}
                    </h2>
                    <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                      {{ t('openclaw.configMetaIntro') }}
                    </p>
                  </header>

                  <section class="space-y-2">
                    <h3 class="font-medium text-sm">
                      {{ t('openclaw.configMetaGroupTitle') }}
                    </h3>

                    <div class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="space-y-1">
                        <UiLabel class="text-sm font-medium">
                          {{ t('openclaw.configMetaLastTouchedAt') }}
                        </UiLabel>
                        <p class="text-muted-foreground text-xs">
                          {{ t('openclaw.configMetaLastTouchedAtHelp') }}
                        </p>
                        <UiInput :model-value="metaLastTouchedAtText || t('openclaw.overviewNone')" disabled class="h-8 font-mono text-xs" />
                      </div>

                      <UiSeparator />

                      <div class="space-y-1">
                        <UiLabel class="text-sm font-medium">
                          {{ t('openclaw.configMetaLastTouchedVersion') }}
                        </UiLabel>
                        <p class="text-muted-foreground text-xs">
                          {{ t('openclaw.configMetaLastTouchedVersionHelp') }}
                        </p>
                        <UiInput
                          v-model="metaLastTouchedVersion"
                          class="h-8 font-mono text-xs"
                          placeholder="2026.3.13"
                        />
                      </div>
                    </div>
                  </section>
                </div>

                <div
                  v-else-if="activeSection === 'logging' && draftConfig"
                  class="config-logging-form max-h-[70vh] space-y-8 overflow-y-auto pr-1"
                >
                  <header class="config-section-hero">
                    <h2 class="text-lg font-semibold tracking-tight">
                      {{ t('openclaw.configLoggingTitle') }}
                    </h2>
                    <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                      {{ t('openclaw.configLoggingIntro') }}
                    </p>
                  </header>

                  <section class="space-y-2">
                    <h3 class="font-medium text-sm">
                      {{ t('openclaw.configLoggingConsoleLevel') }}
                    </h3>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configLoggingConsoleLevelHelp') }}
                    </p>

                    <div class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px] md:items-center">
                        <UiLabel class="text-sm font-medium">
                          {{ t('openclaw.configLoggingConsoleLevel') }}
                        </UiLabel>
                        <UiSelect v-model="loggingConsoleLevel">
                          <UiSelectTrigger class="h-9">
                            <UiSelectValue />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem v-for="level in LOG_LEVELS" :key="`console-${level}`" :value="level">
                              {{ level }}
                            </UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>

                      <UiSeparator />

                      <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px] md:items-center">
                        <UiLabel class="text-sm font-medium">
                          {{ t('openclaw.configLoggingLevel') }}
                        </UiLabel>
                        <UiSelect v-model="loggingLevel">
                          <UiSelectTrigger class="h-9">
                            <UiSelectValue />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem v-for="level in LOG_LEVELS" :key="`level-${level}`" :value="level">
                              {{ level }}
                            </UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>

                      <UiSeparator />

                      <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px] md:items-center">
                        <UiLabel class="text-sm font-medium">
                          {{ t('openclaw.configLoggingConsoleStyle') }}
                        </UiLabel>
                        <UiSelect v-model="loggingConsoleStyle">
                          <UiSelectTrigger class="h-9">
                            <UiSelectValue />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem v-for="style in LOG_STYLES" :key="`style-${style}`" :value="style">
                              {{ style }}
                            </UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>

                      <UiSeparator />

                      <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px] md:items-center">
                        <UiLabel class="text-sm font-medium">
                          {{ t('openclaw.configLoggingRedactMode') }}
                        </UiLabel>
                        <UiSelect v-model="loggingRedactMode">
                          <UiSelectTrigger class="h-9">
                            <UiSelectValue />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem v-for="mode in REDACT_MODES" :key="`redact-${mode}`" :value="mode">
                              {{ mode }}
                            </UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>

                      <UiSeparator />

                      <div class="space-y-1">
                        <UiLabel class="text-sm font-medium">
                          {{ t('openclaw.configLoggingFilePath') }}
                        </UiLabel>
                        <p class="text-muted-foreground text-xs">
                          {{ t('openclaw.configLoggingFilePathHelp') }}
                        </p>
                        <UiInput v-model="loggingFilePath" class="h-8 font-mono text-xs" placeholder="/var/log/openclaw.log" />
                      </div>

                      <UiSeparator />

                      <div class="space-y-1">
                        <UiLabel class="text-sm font-medium">
                          {{ t('openclaw.configLoggingRedactPatterns') }}
                        </UiLabel>
                        <p class="text-muted-foreground text-xs">
                          {{ t('openclaw.configLoggingRedactPatternsHelp') }}
                        </p>
                        <UiTextarea v-model="loggingRedactPatternsText" class="min-h-[120px] font-mono text-xs" placeholder="[&quot;api[_-]?key&quot;,&quot;token&quot;]" />
                      </div>
                    </div>
                  </section>
                </div>

                <div
                  v-else-if="activeSection === 'diagnostics' && draftConfig"
                  class="config-diagnostics-form max-h-[70vh] space-y-8 overflow-y-auto pr-1"
                >
                  <header class="config-section-hero">
                    <h2 class="text-lg font-semibold tracking-tight">
                      {{ t('openclaw.configDiagnosticsTitle') }}
                    </h2>
                    <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                      {{ t('openclaw.configDiagnosticsIntro') }}
                    </p>
                  </header>

                  <section class="space-y-2">
                    <h3 class="font-medium text-sm">
                      {{ t('openclaw.configDiagnosticsCacheTraceTitle') }}
                    </h3>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configDiagnosticsCacheTraceHelp') }}
                    </p>

                    <div class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="flex items-center justify-between gap-4">
                        <div class="min-w-0">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configDiagnosticsEnabled') }}
                          </UiLabel>
                        </div>
                        <UiSwitch v-model:checked="cacheTraceEnabled" />
                      </div>

                      <UiSeparator />

                      <div class="space-y-1">
                        <UiLabel class="text-sm font-medium">
                          {{ t('openclaw.configDiagnosticsFilePath') }}
                        </UiLabel>
                        <p class="text-muted-foreground text-xs">
                          {{ t('openclaw.configDiagnosticsFilePathHelp') }}
                        </p>
                        <UiInput v-model="cacheTraceFilePath" class="h-8 font-mono text-xs" placeholder="logs/cache-trace.log" />
                      </div>

                      <UiSeparator />

                      <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <label class="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
                          <span class="text-sm">{{ t('openclaw.configDiagnosticsIncludeMessages') }}</span>
                          <UiSwitch v-model:checked="cacheTraceIncludeMessages" />
                        </label>
                        <label class="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
                          <span class="text-sm">{{ t('openclaw.configDiagnosticsIncludePrompt') }}</span>
                          <UiSwitch v-model:checked="cacheTraceIncludePrompt" />
                        </label>
                        <label class="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
                          <span class="text-sm">{{ t('openclaw.configDiagnosticsIncludeSystem') }}</span>
                          <UiSwitch v-model:checked="cacheTraceIncludeSystem" />
                        </label>
                      </div>
                    </div>
                  </section>
                </div>

                <div
                  v-else-if="activeSection === 'cli' && draftConfig"
                  class="config-cli-form max-h-[70vh] space-y-8 overflow-y-auto pr-1"
                >
                  <header class="config-section-hero">
                    <h2 class="text-lg font-semibold tracking-tight">
                      {{ t('openclaw.configCliTitle') }}
                    </h2>
                    <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                      {{ t('openclaw.configCliIntro') }}
                    </p>
                  </header>

                  <section class="space-y-2">
                    <h3 class="font-medium text-sm">
                      {{ t('openclaw.configCliBannerTitle') }}
                    </h3>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configCliBannerHelp') }}
                    </p>

                    <div class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px] md:items-center">
                        <div>
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configCliTaglineMode') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configCliTaglineModeHelp') }}
                          </p>
                        </div>
                        <UiSelect v-model="cliTaglineMode">
                          <UiSelectTrigger class="h-9">
                            <UiSelectValue />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem v-for="mode in CLI_TAGLINE_MODES" :key="`cli-${mode}`" :value="mode">
                              {{ mode }}
                            </UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>
                    </div>
                  </section>
                </div>

                <div
                  v-else-if="activeSection === 'secrets' && draftConfig"
                  class="config-secrets-form max-h-[70vh] space-y-8 overflow-y-auto pr-1"
                >
                  <header class="config-section-hero">
                    <h2 class="text-lg font-semibold tracking-tight">
                      {{ t('openclaw.configSecretsTitle') }}
                    </h2>
                    <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                      {{ t('openclaw.configSecretsIntro') }}
                    </p>
                  </header>

                  <section class="space-y-2">
                    <h3 class="font-medium text-sm">
                      {{ t('openclaw.configSecretsDefaultsTitle') }}
                    </h3>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configSecretsDefaultsHelp') }}
                    </p>

                    <div class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px] md:items-center">
                        <div>
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configSecretsDefaultEnv') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configSecretsDefaultEnvHelp') }}
                          </p>
                        </div>
                        <UiInput v-model="secretsDefaultEnv" class="h-8 font-mono text-xs" placeholder="default" />
                      </div>

                      <UiSeparator />

                      <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px] md:items-center">
                        <div>
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configSecretsDefaultExec') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configSecretsDefaultExecHelp') }}
                          </p>
                        </div>
                        <UiInput v-model="secretsDefaultExec" class="h-8 font-mono text-xs" placeholder="default" />
                      </div>

                      <UiSeparator />

                      <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px] md:items-center">
                        <div>
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configSecretsDefaultFile') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configSecretsDefaultFileHelp') }}
                          </p>
                        </div>
                        <UiInput v-model="secretsDefaultFile" class="h-8 font-mono text-xs" placeholder="default" />
                      </div>
                    </div>
                  </section>

                  <section class="space-y-2">
                    <h3 class="font-medium text-sm">
                      {{ t('openclaw.configSecretsProvidersTitle') }}
                    </h3>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configSecretsProvidersHelp') }}
                    </p>

                    <div class="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span class="font-medium text-sm">{{ t('openclaw.configSecretsCustomEntries') }}</span>
                        <UiButton type="button" variant="outline" size="sm" class="shrink-0" @click="addSecretProvider">
                          <Plus class="mr-1 size-3.5" />
                          {{ t('openclaw.configSecretsAddEntry') }}
                        </UiButton>
                      </div>

                      <p v-if="secretProviderKeys.length === 0" class="text-muted-foreground text-sm">
                        {{ t('openclaw.configSecretsNoCustomEntries') }}
                      </p>

                      <div v-else class="space-y-4">
                        <div
                          v-for="pkey in secretProviderKeys"
                          :key="pkey"
                          class="space-y-2 rounded-md border border-border bg-background p-3"
                        >
                          <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-2">
                            <div class="min-w-0 flex-1 space-y-1">
                              <UiLabel class="text-xs font-medium">
                                {{ t('openclaw.configSecretsProviderKey') }}
                              </UiLabel>
                              <UiInput
                                :key="`secret-prov-key-${pkey}`"
                                class="h-8 font-mono text-xs"
                                :default-value="pkey"
                                @blur="(e: FocusEvent) => onSecretProviderKeyChange(pkey, (e.target as HTMLInputElement).value)"
                              />
                            </div>
                            <UiButton
                              type="button"
                              size="icon"
                              variant="ghost"
                              class="size-8 shrink-0 self-end sm:self-auto"
                              @click="removeSecretProvider(pkey)"
                            >
                              <Minus class="size-3.5" />
                            </UiButton>
                          </div>
                          <div class="space-y-1">
                            <UiLabel class="text-xs font-medium">
                              {{ t('openclaw.configSecretsProviderJsonLabel') }}
                            </UiLabel>
                            <p class="text-muted-foreground text-xs">
                              {{ t('openclaw.configSecretsProviderJsonHelp') }}
                            </p>
                            <UiTextarea
                              :key="pkey"
                              class="min-h-[100px] font-mono text-xs"
                              :default-value="providerJsonFor(pkey)"
                              @blur="(e: FocusEvent) => applyProviderJson(pkey, (e.target as HTMLTextAreaElement).value)"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section class="space-y-2">
                    <h3 class="font-medium text-sm">
                      {{ t('openclaw.configSecretsResolutionTitle') }}
                    </h3>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configSecretsResolutionHelp') }}
                    </p>

                    <div class="space-y-1 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configSecretsMaxBatchBytes') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configSecretsMaxBatchBytesHelp') }}
                          </p>
                        </div>
                        <div class="flex items-center gap-1">
                          <UiButton
                            type="button"
                            variant="outline"
                            size="icon"
                            class="size-8 shrink-0"
                            @click="bumpSecretResolution('maxBatchBytes', -1)"
                          >
                            <Minus class="size-3.5" />
                          </UiButton>
                          <UiInput
                            v-model="secretsMaxBatchBytesStr"
                            class="h-8 w-24 text-center font-mono text-xs tabular-nums"
                            type="number"
                            min="1"
                            :max="SECRET_RES_MAX_BATCH"
                          />
                          <UiButton
                            type="button"
                            variant="outline"
                            size="icon"
                            class="size-8 shrink-0"
                            @click="bumpSecretResolution('maxBatchBytes', 1)"
                          >
                            <Plus class="size-3.5" />
                          </UiButton>
                        </div>
                      </div>

                      <UiSeparator />

                      <div class="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configSecretsMaxProviderConcurrency') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configSecretsMaxProviderConcurrencyHelp') }}
                          </p>
                        </div>
                        <div class="flex items-center gap-1">
                          <UiButton
                            type="button"
                            variant="outline"
                            size="icon"
                            class="size-8 shrink-0"
                            @click="bumpSecretResolution('maxProviderConcurrency', -1)"
                          >
                            <Minus class="size-3.5" />
                          </UiButton>
                          <UiInput
                            v-model="secretsMaxProviderConcurrencyStr"
                            class="h-8 w-14 text-center font-mono text-xs tabular-nums"
                            type="number"
                            min="1"
                            max="16"
                          />
                          <UiButton
                            type="button"
                            variant="outline"
                            size="icon"
                            class="size-8 shrink-0"
                            @click="bumpSecretResolution('maxProviderConcurrency', 1)"
                          >
                            <Plus class="size-3.5" />
                          </UiButton>
                        </div>
                      </div>

                      <UiSeparator />

                      <div class="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configSecretsMaxRefsPerProvider') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configSecretsMaxRefsPerProviderHelp') }}
                          </p>
                        </div>
                        <div class="flex items-center gap-1">
                          <UiButton
                            type="button"
                            variant="outline"
                            size="icon"
                            class="size-8 shrink-0"
                            @click="bumpSecretResolution('maxRefsPerProvider', -1)"
                          >
                            <Minus class="size-3.5" />
                          </UiButton>
                          <UiInput
                            v-model="secretsMaxRefsPerProviderStr"
                            class="h-8 w-20 text-center font-mono text-xs tabular-nums"
                            type="number"
                            min="1"
                            max="4096"
                          />
                          <UiButton
                            type="button"
                            variant="outline"
                            size="icon"
                            class="size-8 shrink-0"
                            @click="bumpSecretResolution('maxRefsPerProvider', 1)"
                          >
                            <Plus class="size-3.5" />
                          </UiButton>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <div
                  v-else-if="activeSection === 'acp' && draftConfig"
                  class="config-acp-form max-h-[70vh] space-y-8 overflow-y-auto pr-1"
                >
                  <header class="config-section-hero">
                    <h2 class="text-lg font-semibold tracking-tight">
                      {{ t('openclaw.configAcpTitle') }}
                    </h2>
                    <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                      {{ t('openclaw.configAcpIntro') }}
                    </p>
                  </header>

                  <section class="space-y-2">
                    <h3 class="font-medium text-sm">
                      {{ t('openclaw.configAcpAllowedAgentsTitle') }}
                    </h3>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configAcpAllowedAgentsHelp') }}
                    </p>

                    <div class="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div class="flex items-center gap-2">
                          <span class="text-sm">{{ t('openclaw.configAcpAccessLabel') }}</span>
                          <span class="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium">
                            {{ t('openclaw.configAcpItemsCount', { n: acpAllowedAgents.length }) }}
                          </span>
                        </div>
                        <UiButton type="button" variant="outline" size="sm" class="shrink-0" @click="addAcpAllowedAgent">
                          <Plus class="mr-1 size-3.5" />
                          {{ t('openclaw.configAcpAdd') }}
                        </UiButton>
                      </div>

                      <p v-if="acpAllowedAgents.length === 0" class="text-muted-foreground text-sm">
                        {{ t('openclaw.configAcpNoItems') }}
                      </p>

                      <div v-else class="space-y-2">
                        <div
                          v-for="(agentId, idx) in acpAllowedAgents"
                          :key="`acp-agent-${idx}`"
                          class="grid grid-cols-1 items-center gap-2 md:grid-cols-[1fr_auto]"
                        >
                          <UiInput
                            class="h-8 font-mono text-xs"
                            :model-value="agentId"
                            :placeholder="t('openclaw.configAcpAgentIdPlaceholder')"
                            @update:model-value="(v: string | number) => updateAcpAllowedAgent(idx, String(v ?? ''))"
                          />
                          <UiButton type="button" size="icon" variant="ghost" class="size-8" @click="removeAcpAllowedAgent(idx)">
                            <Minus class="size-3.5" />
                          </UiButton>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <!-- 尚无表单的分区：不展示整份 JSON（仅主 Config 页） -->
                <div v-else class="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
                  <p class="text-foreground text-sm font-medium">
                    {{ t('openclaw.configSectionNoFormTitle') }}
                  </p>
                  <p class="mt-2 text-muted-foreground text-sm">
                    {{ t('openclaw.configSectionNoFormHint') }}
                  </p>
                </div>
              </template>

              <!-- Communication → Channels：与 OpenClaw Control UI（SECTION_META + cfg-map Custom entries）一致 -->
              <div
                v-else-if="settingsSubPage === 'communications' && activeSection === 'channels' && draftConfig"
                class="config-channels-form space-y-8"
              >
                <header v-if="!showConfigFormHero" class="config-section-hero mb-8">
                  <h2 class="text-lg font-semibold tracking-tight">
                    {{ t('openclaw.configChannelsTitle') }}
                  </h2>
                  <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                    {{ t('openclaw.configChannelsIntro') }}
                  </p>
                </header>

                <section class="space-y-2">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span class="font-medium text-sm">{{ t('openclaw.configChannelsCustomEntries') }}</span>
                    <UiButton type="button" variant="outline" size="sm" class="shrink-0" @click="addChannelsCustomEntry">
                      <Plus class="mr-1 size-3.5" />
                      {{ t('openclaw.configChannelsAddEntry') }}
                    </UiButton>
                  </div>

                  <p v-if="channelsCustomKeys.length === 0" class="text-muted-foreground text-sm">
                    {{ t('openclaw.configChannelsNoCustomEntries') }}
                  </p>

                  <div v-else class="space-y-4">
                    <div
                      v-for="ckey in channelsCustomKeys"
                      :key="`ch-custom-${ckey}`"
                      class="space-y-2 rounded-md border border-border bg-background p-3"
                    >
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-2">
                        <div class="min-w-0 flex-1 space-y-1">
                          <UiLabel class="text-xs font-medium">
                            {{ t('openclaw.configChannelsEntryKey') }}
                          </UiLabel>
                          <UiInput
                            :key="`ch-key-input-${ckey}`"
                            class="h-8 font-mono text-xs"
                            :default-value="ckey"
                            @blur="(e: FocusEvent) => onChannelsCustomKeyChange(ckey, (e.target as HTMLInputElement).value)"
                          />
                        </div>
                        <UiButton
                          type="button"
                          size="icon"
                          variant="ghost"
                          class="size-8 shrink-0 self-end sm:self-auto"
                          @click="removeChannelsCustomEntry(ckey)"
                        >
                          <Minus class="size-3.5" />
                        </UiButton>
                      </div>
                      <div class="space-y-1">
                        <UiLabel class="text-xs font-medium">
                          {{ t('openclaw.configChannelsEntryJson') }}
                        </UiLabel>
                        <p class="text-muted-foreground text-xs">
                          {{ t('openclaw.configChannelsEntryJsonHelp') }}
                        </p>
                        <UiTextarea
                          :key="ckey"
                          class="min-h-[100px] font-mono text-xs"
                          :default-value="channelsJsonFor(ckey)"
                          :placeholder="t('openclaw.configChannelsJsonPlaceholder')"
                          @blur="(e: FocusEvent) => applyChannelsCustomJson(ckey, (e.target as HTMLTextAreaElement).value)"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <div class="flex flex-wrap items-center gap-2 pt-2">
                  <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                    {{ t('openclaw.configRaw') }}
                  </UiButton>
                </div>
              </div>

              <!-- Communication → Messages：与 OpenClaw Control UI（SECTION_META + ack 字段）一致 -->
              <div
                v-else-if="settingsSubPage === 'communications' && activeSection === 'messages' && draftConfig"
                class="config-messages-form space-y-8"
              >
                <header v-if="!showConfigFormHero" class="config-section-hero mb-8">
                  <h2 class="text-lg font-semibold tracking-tight">
                    {{ t('openclaw.configMessagesTitle') }}
                  </h2>
                  <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                    {{ t('openclaw.configMessagesIntro') }}
                  </p>
                </header>

                <section class="space-y-2">
                  <div class="space-y-1 rounded-lg border border-border bg-muted/30 p-4">
                    <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                      <div class="min-w-0 flex-1">
                        <UiLabel class="text-sm font-medium">
                          {{ t('openclaw.configMessagesAckEmojiLabel') }}
                        </UiLabel>
                        <p class="mt-0.5 text-muted-foreground text-xs">
                          {{ t('openclaw.configMessagesAckEmojiHelp') }}
                        </p>
                      </div>
                      <UiInput
                        v-model="messagesAckReaction"
                        class="h-9 w-full max-w-[220px] shrink-0 font-mono text-sm"
                        :placeholder="t('openclaw.configMessagesAckEmojiPlaceholder')"
                      />
                    </div>
                  </div>
                </section>

                <UiCollapsible :default-open="false" class="group rounded-lg border border-border">
                  <UiCollapsibleTrigger
                    class="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50"
                  >
                    <span>{{ t('openclaw.configMessagesAdvanced') }}</span>
                    <ChevronDown
                      class="size-4 shrink-0 opacity-50 transition-transform group-data-[state=open]:rotate-180"
                    />
                  </UiCollapsibleTrigger>
                  <UiCollapsibleContent class="border-t border-border px-4 py-3">
                    <div class="space-y-4">
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configMessagesAckScopeLabel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configMessagesAckScopeHelp') }}
                          </p>
                        </div>
                        <UiSelect v-model="messagesAckReactionScopeSelect" class="w-full max-w-[220px] shrink-0">
                          <UiSelectTrigger class="h-9">
                            <UiSelectValue :placeholder="t('openclaw.configMessagesAckScopeAuto')" />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem :value="MESSAGES_ACK_SCOPE_AUTO">
                              {{
                                t('openclaw.configMessagesAckScopeAuto')
                              }}
                            </UiSelectItem>
                            <UiSelectItem value="group-mentions">
                              group-mentions
                            </UiSelectItem>
                            <UiSelectItem value="group-all">
                              group-all
                            </UiSelectItem>
                            <UiSelectItem value="direct">
                              direct
                            </UiSelectItem>
                            <UiSelectItem value="all">
                              all
                            </UiSelectItem>
                            <UiSelectItem value="off">
                              off
                            </UiSelectItem>
                            <UiSelectItem value="none">
                              none
                            </UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>
                      <UiSeparator />
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configMessagesRemoveAckLabel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configMessagesRemoveAckHelp') }}
                          </p>
                        </div>
                        <UiSwitch v-model:checked="messagesRemoveAckAfterReply" />
                      </div>
                    </div>
                  </UiCollapsibleContent>
                </UiCollapsible>

                <div class="flex flex-wrap items-center gap-2 pt-2">
                  <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                    {{ t('openclaw.configRaw') }}
                  </UiButton>
                </div>
              </div>

              <!-- Communication → Talk：与 OpenClaw Control UI（SECTION_META + TalkSchema）一致 -->
              <div
                v-else-if="settingsSubPage === 'communications' && activeSection === 'talk' && draftConfig"
                class="config-talk-form space-y-8"
              >
                <header v-if="!showConfigFormHero" class="config-section-hero mb-8">
                  <h2 class="text-lg font-semibold tracking-tight">
                    {{ t('openclaw.configTalkTitle') }}
                  </h2>
                  <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                    {{ t('openclaw.configTalkIntro') }}
                  </p>
                </header>

                <section class="space-y-2">
                  <div class="space-y-1 rounded-lg border border-border bg-muted/30 p-4">
                    <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                      <div class="min-w-0 flex-1">
                        <UiLabel class="text-sm font-medium">
                          {{ t('openclaw.configTalkApiKeyLabel') }}
                        </UiLabel>
                        <p class="mt-0.5 text-muted-foreground text-xs">
                          {{ t('openclaw.configTalkApiKeyHelp') }}
                        </p>
                      </div>
                      <UiInput
                        v-model="talkApiKeyLegacy"
                        type="password"
                        autocomplete="off"
                        class="h-9 w-full max-w-[320px] shrink-0 font-mono text-sm"
                        :placeholder="t('openclaw.configTalkApiKeyPlaceholder')"
                      />
                    </div>
                  </div>
                </section>

                <UiCollapsible :default-open="false" class="group rounded-lg border border-border">
                  <UiCollapsibleTrigger
                    class="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50"
                  >
                    <span>{{ t('openclaw.configTalkAdvanced') }}</span>
                    <ChevronDown
                      class="size-4 shrink-0 opacity-50 transition-transform group-data-[state=open]:rotate-180"
                    />
                  </UiCollapsibleTrigger>
                  <UiCollapsibleContent class="space-y-4 border-t border-border px-4 py-3">
                    <div class="space-y-1 rounded-lg border border-border bg-muted/20 p-4">
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configTalkProviderLabel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configTalkProviderHelp') }}
                          </p>
                        </div>
                        <UiInput
                          v-model="talkProviderStr"
                          class="h-9 w-full max-w-[220px] shrink-0 font-mono text-sm"
                          :placeholder="t('openclaw.configTalkProviderPlaceholder')"
                        />
                      </div>
                    </div>

                    <div class="space-y-1 rounded-lg border border-border bg-muted/20 p-4">
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configTalkElevenlabsApiKeyLabel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configTalkElevenlabsApiKeyHelp') }}
                          </p>
                        </div>
                        <UiInput
                          v-model="talkElevenlabsApiKey"
                          type="password"
                          autocomplete="off"
                          class="h-9 w-full max-w-[320px] shrink-0 font-mono text-sm"
                          :placeholder="t('openclaw.configTalkElevenlabsApiKeyPlaceholder')"
                        />
                      </div>
                    </div>

                    <UiSeparator />

                    <div class="grid gap-4 sm:grid-cols-1">
                      <div class="space-y-1 rounded-lg border border-border bg-muted/20 p-4">
                        <UiLabel class="text-sm font-medium">
                          {{ t('openclaw.configTalkVoiceIdLabel') }}
                        </UiLabel>
                        <p class="mt-0.5 text-muted-foreground text-xs">
                          {{ t('openclaw.configTalkVoiceIdHelp') }}
                        </p>
                        <UiInput
                          v-model="talkVoiceIdLegacy"
                          class="mt-2 h-9 w-full font-mono text-sm"
                          :placeholder="t('openclaw.configTalkVoiceIdPlaceholder')"
                        />
                      </div>
                      <div class="space-y-1 rounded-lg border border-border bg-muted/20 p-4">
                        <UiLabel class="text-sm font-medium">
                          {{ t('openclaw.configTalkModelIdLabel') }}
                        </UiLabel>
                        <p class="mt-0.5 text-muted-foreground text-xs">
                          {{ t('openclaw.configTalkModelIdHelp') }}
                        </p>
                        <UiInput
                          v-model="talkModelIdLegacy"
                          class="mt-2 h-9 w-full font-mono text-sm"
                          :placeholder="t('openclaw.configTalkModelIdPlaceholder')"
                        />
                      </div>
                      <div class="space-y-1 rounded-lg border border-border bg-muted/20 p-4">
                        <UiLabel class="text-sm font-medium">
                          {{ t('openclaw.configTalkOutputFormatLabel') }}
                        </UiLabel>
                        <p class="mt-0.5 text-muted-foreground text-xs">
                          {{ t('openclaw.configTalkOutputFormatHelp') }}
                        </p>
                        <UiInput
                          v-model="talkOutputFormatLegacy"
                          class="mt-2 h-9 w-full font-mono text-sm"
                          :placeholder="t('openclaw.configTalkOutputFormatPlaceholder')"
                        />
                      </div>
                    </div>

                    <div class="space-y-1 rounded-lg border border-border bg-muted/20 p-4">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configTalkVoiceAliasesLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configTalkVoiceAliasesHelp') }}
                      </p>
                      <UiTextarea
                        v-model="talkVoiceAliasesJsonLocal"
                        class="mt-2 min-h-[100px] font-mono text-xs"
                        :placeholder="t('openclaw.configTalkVoiceAliasesPlaceholder')"
                        @blur="(e: FocusEvent) => applyTalkVoiceAliasesJson((e.target as HTMLTextAreaElement).value)"
                      />
                    </div>

                    <UiSeparator />

                    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div class="min-w-0 flex-1">
                        <UiLabel class="text-sm font-medium">
                          {{ t('openclaw.configTalkInterruptLabel') }}
                        </UiLabel>
                        <p class="mt-0.5 text-muted-foreground text-xs">
                          {{ t('openclaw.configTalkInterruptHelp') }}
                        </p>
                      </div>
                      <UiSwitch v-model:checked="talkInterruptOnSpeech" />
                    </div>

                    <div class="space-y-1 rounded-lg border border-border bg-muted/20 p-4">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configTalkSilenceTimeoutLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configTalkSilenceTimeoutHelp') }}
                      </p>
                      <UiInput
                        v-model="talkSilenceTimeoutStr"
                        type="number"
                        min="1"
                        class="mt-2 h-9 w-full max-w-[220px] font-mono text-sm"
                        :placeholder="t('openclaw.configTalkSilenceTimeoutPlaceholder')"
                      />
                    </div>
                  </UiCollapsibleContent>
                </UiCollapsible>

                <div class="flex flex-wrap items-center gap-2 pt-2">
                  <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                    {{ t('openclaw.configRaw') }}
                  </UiButton>
                </div>
              </div>

              <!-- Communication → Audio：与 OpenClaw Control UI（SECTION_META + TranscribeAudioSchema）一致 -->
              <div
                v-else-if="settingsSubPage === 'communications' && activeSection === 'audio' && draftConfig"
                class="config-audio-form space-y-8"
              >
                <header v-if="!showConfigFormHero" class="config-section-hero mb-8">
                  <h2 class="text-lg font-semibold tracking-tight">
                    {{ t('openclaw.configAudioTitle') }}
                  </h2>
                  <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                    {{ t('openclaw.configAudioIntro') }}
                  </p>
                </header>

                <section class="space-y-2">
                  <h3 class="mb-1 font-medium text-sm">
                    {{ t('openclaw.configAudioTranscriptionHeading') }}
                  </h3>
                  <p class="mb-3 text-muted-foreground text-xs leading-relaxed">
                    {{ t('openclaw.configAudioTranscriptionIntro') }}
                  </p>

                  <div class="space-y-1 rounded-lg border border-border bg-muted/30 p-4">
                    <UiLabel class="text-sm font-medium">
                      {{ t('openclaw.configAudioTranscriptionCommandLabel') }}
                    </UiLabel>
                    <p class="mt-0.5 text-muted-foreground text-xs">
                      {{ t('openclaw.configAudioTranscriptionCommandHelp') }}
                    </p>

                    <div class="mt-3 flex items-center justify-between gap-2">
                      <span class="text-muted-foreground text-xs">{{ t('openclaw.configAudioCommandArgsHint') }}</span>
                      <UiButton type="button" variant="outline" size="sm" class="shrink-0" @click="addAudioTranscriptionCommandArg">
                        <Plus class="mr-1 size-3.5" />
                        {{ t('openclaw.configAudioAddCommandArg') }}
                      </UiButton>
                    </div>

                    <div class="mt-3 space-y-2">
                      <div
                        v-for="(arg, idx) in audioTranscriptionCommandRows"
                        :key="`audio-cmd-${idx}`"
                        class="grid grid-cols-1 items-center gap-2 md:grid-cols-[1fr_auto]"
                      >
                        <UiInput
                          class="h-8 font-mono text-xs"
                          :model-value="arg"
                          :placeholder="t('openclaw.configAudioCommandArgPlaceholder')"
                          @update:model-value="(v: string | number) => setAudioTranscriptionCommandArg(idx, String(v ?? ''))"
                        />
                        <UiButton
                          type="button"
                          size="icon"
                          variant="ghost"
                          class="size-8"
                          @click="removeAudioTranscriptionCommandArg(idx)"
                        >
                          <Minus class="size-3.5" />
                        </UiButton>
                      </div>
                    </div>
                  </div>

                  <div class="space-y-1 rounded-lg border border-border bg-muted/30 p-4">
                    <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                      <div class="min-w-0 flex-1">
                        <UiLabel class="text-sm font-medium">
                          {{ t('openclaw.configAudioTranscriptionTimeoutLabel') }}
                        </UiLabel>
                        <p class="mt-0.5 text-muted-foreground text-xs">
                          {{ t('openclaw.configAudioTranscriptionTimeoutHelp') }}
                        </p>
                      </div>
                      <UiInput
                        v-model="audioTranscriptionTimeoutStr"
                        type="number"
                        min="1"
                        class="h-9 w-full max-w-[220px] shrink-0 font-mono text-sm"
                        :placeholder="t('openclaw.configAudioTranscriptionTimeoutPlaceholder')"
                      />
                    </div>
                  </div>
                </section>

                <div class="flex flex-wrap items-center gap-2 pt-2">
                  <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                    {{ t('openclaw.configRaw') }}
                  </UiButton>
                </div>
              </div>

              <!-- Communication → Broadcast：与 OpenClaw Control UI 一致 -->
              <div
                v-else-if="settingsSubPage === 'communications' && activeSection === 'broadcast' && draftConfig"
                class="config-broadcast-form space-y-8"
              >
                <header v-if="!showConfigFormHero" class="config-section-hero mb-8">
                  <h2 class="text-lg font-semibold tracking-tight">
                    {{ t('openclaw.configBroadcastTitle') }}
                  </h2>
                  <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                    {{ t('openclaw.configBroadcastIntro') }}
                  </p>
                </header>

                <section class="space-y-2">
                  <h3 class="mb-2 font-medium text-sm">
                    {{ t('openclaw.configBroadcastStrategyHeading') }}
                  </h3>
                  <div class="space-y-1 rounded-lg border border-border bg-muted/30 p-4">
                    <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                      <div class="min-w-0 flex-1">
                        <UiLabel class="text-sm font-medium">
                          {{ t('openclaw.configBroadcastStrategyLabel') }}
                        </UiLabel>
                        <p class="mt-0.5 text-muted-foreground text-xs">
                          {{ t('openclaw.configBroadcastStrategyHelp') }}
                        </p>
                      </div>
                      <UiSelect v-model="broadcastStrategySelect" class="w-full max-w-[220px] shrink-0">
                        <UiSelectTrigger class="h-9">
                          <UiSelectValue :placeholder="t('openclaw.configBroadcastStrategyAuto')" />
                        </UiSelectTrigger>
                        <UiSelectContent>
                          <UiSelectItem :value="BROADCAST_STRATEGY_AUTO">
                            {{
                              t('openclaw.configBroadcastStrategyAuto')
                            }}
                          </UiSelectItem>
                          <UiSelectItem value="parallel">
                            parallel
                          </UiSelectItem>
                          <UiSelectItem value="sequential">
                            sequential
                          </UiSelectItem>
                        </UiSelectContent>
                      </UiSelect>
                    </div>
                  </div>
                </section>

                <section class="space-y-2">
                  <h3 class="mb-2 font-medium text-sm">
                    {{ t('openclaw.configBroadcastDestinationsHeading') }}
                  </h3>
                  <div class="space-y-1 rounded-lg border border-border bg-muted/30 p-4">
                    <p class="mb-2 text-muted-foreground text-xs">
                      {{ t('openclaw.configBroadcastDestinationsHelp') }}
                    </p>
                    <UiTextarea
                      v-model="broadcastDestinationsJsonLocal"
                      class="min-h-[160px] font-mono text-xs"
                      :placeholder="t('openclaw.configBroadcastDestinationsPlaceholder')"
                      @blur="(e: FocusEvent) => applyBroadcastDestinationsJson((e.target as HTMLTextAreaElement).value)"
                    />
                  </div>
                </section>

                <div class="flex flex-wrap items-center gap-2 pt-2">
                  <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                    {{ t('openclaw.configRaw') }}
                  </UiButton>
                </div>
              </div>

              <!-- Appearance：与 OpenClaw `showAppearanceOnRoot` + `__appearance__` 一致（根 Tab 与 Appearance 子 Tab 均显示 Theme / Mode / Connection） -->
              <div
                v-else-if="
                  settingsSubPage === 'appearance'
                    && formMode === 'form'
                    && (activeSection === null || activeSection === '__appearance__')
                "
                class="grid gap-[18px]"
              >
                <section class="grid gap-[14px] rounded-xl border border-border bg-muted/40 p-[18px]">
                  <h3 class="m-0 text-[15px] text-foreground font-semibold tracking-tight">
                    {{ t('openclaw.configAppearanceThemeHeading') }}
                  </h3>
                  <p class="-mt-2 m-0 text-[12.5px] text-muted-foreground leading-snug">
                    {{ t('openclaw.configAppearanceThemeHint') }}
                  </p>
                  <div class="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
                    <button
                      v-for="opt in appearanceThemeOptions"
                      :key="opt.id"
                      type="button"
                      class="grid min-h-16 w-full grid-cols-[auto_1fr_auto] items-center gap-2.5 rounded-xl border border-border bg-card py-3.5 pr-4 pl-4 text-left transition-all hover:-translate-y-px hover:border-border hover:bg-muted/50"
                      :class="
                        ocControlTheme === opt.id
                          ? 'border-primary/35 bg-primary/10 shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_14%,transparent)]'
                          : ''
                      "
                      :title="
                        opt.id === 'claw'
                          ? t('openclaw.configAppearanceThemeClawDesc')
                          : opt.id === 'knot'
                            ? t('openclaw.configAppearanceThemeKnotDesc')
                            : t('openclaw.configAppearanceThemeDashDesc')
                      "
                      @click="setOcControlTheme(opt.id)"
                    >
                      <component :is="opt.icon" class="size-[18px] shrink-0 text-primary" aria-hidden="true" />
                      <span class="text-[13px] text-foreground font-semibold">{{
                        opt.id === 'claw'
                          ? t('openclaw.configAppearanceThemeClaw')
                          : opt.id === 'knot'
                            ? t('openclaw.configAppearanceThemeKnot')
                            : t('openclaw.configAppearanceThemeDash')
                      }}</span>
                      <Check
                        v-if="ocControlTheme === opt.id"
                        class="size-[18px] shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <span v-else class="size-[18px] shrink-0" aria-hidden="true" />
                    </button>
                  </div>
                </section>

                <section class="grid gap-[14px] rounded-xl border border-border bg-muted/40 p-[18px]">
                  <h3 class="m-0 text-[15px] text-foreground font-semibold tracking-tight">
                    {{ t('openclaw.configAppearanceModeHeading') }}
                  </h3>
                  <p class="-mt-2 m-0 text-[12.5px] text-muted-foreground leading-snug">
                    {{ t('openclaw.configAppearanceModeHint') }}
                  </p>
                  <div class="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
                    <button
                      v-for="opt in appearanceModeOptions"
                      :key="opt.id"
                      type="button"
                      class="grid min-h-16 w-full grid-cols-[auto_1fr_auto] items-center gap-2.5 rounded-xl border border-border bg-card py-3.5 pr-4 pl-4 text-left transition-all hover:-translate-y-px hover:border-border hover:bg-muted/50"
                      :class="
                        ocControlThemeMode === opt.id
                          ? 'border-primary/35 bg-primary/10 shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_14%,transparent)]'
                          : ''
                      "
                      :title="
                        opt.id === 'system'
                          ? t('openclaw.configAppearanceModeSystemDesc')
                          : opt.id === 'light'
                            ? t('openclaw.configAppearanceModeLightDesc')
                            : t('openclaw.configAppearanceModeDarkDesc')
                      "
                      @click="setOcControlThemeMode(opt.id)"
                    >
                      <component :is="opt.icon" class="size-[18px] shrink-0 text-primary" aria-hidden="true" />
                      <span class="text-[13px] text-foreground font-semibold">{{
                        opt.id === 'system'
                          ? t('openclaw.configAppearanceModeSystem')
                          : opt.id === 'light'
                            ? t('openclaw.configAppearanceModeLight')
                            : t('openclaw.configAppearanceModeDark')
                      }}</span>
                      <Check
                        v-if="ocControlThemeMode === opt.id"
                        class="size-[18px] shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <span v-else class="size-[18px] shrink-0" aria-hidden="true" />
                    </button>
                  </div>
                </section>

                <section class="grid gap-[14px] rounded-xl border border-border bg-muted/40 p-[18px]">
                  <h3 class="m-0 text-[15px] text-foreground font-semibold tracking-tight">
                    {{ t('openclaw.configAppearanceConnectionHeading') }}
                  </h3>
                  <div class="grid gap-2.5">
                    <div
                      class="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-3.5 py-3"
                    >
                      <span class="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{{
                        t('openclaw.configAppearanceGatewayLabel')
                      }}</span>
                      <span class="min-w-0 text-right text-[13px] text-foreground font-medium font-mono break-all">{{
                        appearanceGatewayWsUrl
                      }}</span>
                    </div>
                    <div
                      class="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-3.5 py-3"
                    >
                      <span class="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{{
                        t('openclaw.configAppearanceStatusLabel')
                      }}</span>
                      <span
                        class="inline-flex min-w-0 items-center gap-2 text-right text-[13px] text-foreground font-medium"
                      >
                        <span
                          class="size-2 shrink-0 rounded-full"
                          :class="
                            gateway.connected
                              ? 'bg-emerald-500 shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_14%,transparent)]'
                              : 'bg-muted-foreground/60 shadow-[0_0_0_4px_color-mix(in_oklab,var(--muted)_14%,transparent)]'
                          "
                          aria-hidden="true"
                        />
                        {{ gateway.connected ? t('openclaw.connected') : t('openclaw.configAppearanceStatusOffline') }}
                      </span>
                    </div>
                    <div
                      v-if="appearanceAssistantName"
                      class="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-3.5 py-3"
                    >
                      <span class="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{{
                        t('openclaw.configAppearanceAssistantLabel')
                      }}</span>
                      <span class="min-w-0 text-right text-[13px] text-foreground font-medium">{{
                        appearanceAssistantName
                      }}</span>
                    </div>
                  </div>
                </section>

                <div class="flex flex-wrap items-center gap-2">
                  <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                    {{ t('openclaw.configRaw') }}
                  </UiButton>
                </div>
              </div>

              <!-- Appearance → UI：与 OpenClaw SECTION_META + schema.labels / schema.help + zod `ui` 一致 -->
              <div
                v-else-if="settingsSubPage === 'appearance' && activeSection === 'ui' && draftConfig"
                class="config-ui-form space-y-8"
              >
                <header v-if="!showConfigFormHero" class="config-section-hero mb-8">
                  <h2 class="text-lg font-semibold tracking-tight">
                    {{ t('openclaw.configSchemaSection.ui') }}
                  </h2>
                  <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                    {{ t('openclaw.configUiSectionIntro') }}
                  </p>
                </header>

                <section class="space-y-2">
                  <div class="space-y-1 rounded-lg border border-border bg-muted/30 p-4">
                    <UiLabel class="text-sm font-medium" for="openclaw-ui-seam-color">
                      {{
                        t('openclaw.configUiAccentColorTitle')
                      }}
                    </UiLabel>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configUiAccentColorHelp') }}
                    </p>
                    <UiInput
                      id="openclaw-ui-seam-color"
                      v-model="uiSeamColor"
                      class="mt-2 h-9 max-w-md font-mono text-sm"
                      :placeholder="t('openclaw.configUiAccentColorPlaceholder')"
                    />
                  </div>
                </section>

                <section class="space-y-2">
                  <h3 class="font-medium text-sm">
                    {{ t('openclaw.configUiAssistantGroupTitle') }}
                  </h3>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.configUiAssistantGroupHelp') }}
                  </p>
                  <div class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                    <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                      <div class="min-w-0 flex-1">
                        <UiLabel class="text-sm font-medium" for="openclaw-ui-assistant-name">
                          {{
                            t('openclaw.configUiAssistantNameLabel')
                          }}
                        </UiLabel>
                        <p class="mt-0.5 text-muted-foreground text-xs">
                          {{ t('openclaw.configUiAssistantNameHelp') }}
                        </p>
                      </div>
                      <UiInput
                        id="openclaw-ui-assistant-name"
                        v-model="uiAssistantNameField"
                        class="h-9 w-full max-w-md shrink-0 font-mono text-sm"
                        maxlength="50"
                        :placeholder="t('openclaw.configUiAssistantNamePlaceholder')"
                      />
                    </div>
                    <UiSeparator />
                    <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                      <div class="min-w-0 flex-1">
                        <UiLabel class="text-sm font-medium" for="openclaw-ui-assistant-avatar">
                          {{
                            t('openclaw.configUiAssistantAvatarLabel')
                          }}
                        </UiLabel>
                        <p class="mt-0.5 text-muted-foreground text-xs">
                          {{ t('openclaw.configUiAssistantAvatarHelp') }}
                        </p>
                      </div>
                      <UiInput
                        id="openclaw-ui-assistant-avatar"
                        v-model="uiAssistantAvatarField"
                        class="h-9 w-full max-w-md shrink-0 font-mono text-sm"
                        maxlength="200"
                        :placeholder="t('openclaw.configUiAssistantAvatarPlaceholder')"
                      />
                    </div>
                  </div>
                </section>

                <div class="flex flex-wrap items-center gap-2 pt-2">
                  <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                    {{ t('openclaw.configRaw') }}
                  </UiButton>
                </div>
              </div>

              <!-- Appearance → Wizard：与 OpenClaw SECTION_META + schema.labels / schema.help + zod `wizard` 一致 -->
              <div
                v-else-if="settingsSubPage === 'appearance' && activeSection === 'wizard' && draftConfig"
                class="config-wizard-form space-y-8"
              >
                <header v-if="!showConfigFormHero" class="config-section-hero mb-8">
                  <h2 class="text-lg font-semibold tracking-tight">
                    {{ t('openclaw.configWizardTitle') }}
                  </h2>
                  <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                    {{ t('openclaw.configWizardIntro') }}
                  </p>
                </header>

                <p class="text-muted-foreground text-xs">
                  {{ t('openclaw.configWizardSectionHelp') }}
                </p>

                <section class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-wizard-last-run-at">
                        {{
                          t('openclaw.configWizardLastRunAtLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configWizardLastRunAtHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-wizard-last-run-at"
                      v-model="wizardLastRunAt"
                      class="h-9 w-full max-w-md shrink-0 font-mono text-sm"
                      :placeholder="t('openclaw.configWizardLastRunAtPlaceholder')"
                    />
                  </div>

                  <UiSeparator />

                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-wizard-last-run-version">
                        {{
                          t('openclaw.configWizardLastRunVersionLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configWizardLastRunVersionHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-wizard-last-run-version"
                      v-model="wizardLastRunVersion"
                      class="h-9 w-full max-w-md shrink-0 font-mono text-sm"
                      :placeholder="t('openclaw.configWizardLastRunVersionPlaceholder')"
                    />
                  </div>

                  <UiSeparator />

                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-wizard-last-run-commit">
                        {{
                          t('openclaw.configWizardLastRunCommitLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configWizardLastRunCommitHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-wizard-last-run-commit"
                      v-model="wizardLastRunCommit"
                      class="h-9 w-full max-w-md shrink-0 font-mono text-sm"
                      :placeholder="t('openclaw.configWizardLastRunCommitPlaceholder')"
                    />
                  </div>

                  <UiSeparator />

                  <div class="flex flex-col gap-1">
                    <UiLabel class="text-sm font-medium" for="openclaw-wizard-last-run-command">
                      {{
                        t('openclaw.configWizardLastRunCommandLabel')
                      }}
                    </UiLabel>
                    <p class="mt-0.5 text-muted-foreground text-xs">
                      {{ t('openclaw.configWizardLastRunCommandHelp') }}
                    </p>
                    <UiTextarea
                      id="openclaw-wizard-last-run-command"
                      v-model="wizardLastRunCommand"
                      class="mt-2 min-h-[88px] font-mono text-sm"
                      :placeholder="t('openclaw.configWizardLastRunCommandPlaceholder')"
                    />
                  </div>

                  <UiSeparator />

                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configWizardLastRunModeLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configWizardLastRunModeHelp') }}
                      </p>
                    </div>
                    <UiSelect v-model="wizardLastRunModeSelect" class="w-full max-w-md shrink-0">
                      <UiSelectTrigger class="h-9">
                        <UiSelectValue :placeholder="t('openclaw.configWizardLastRunModeAuto')" />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem :value="WIZARD_MODE_AUTO">
                          {{ t('openclaw.configWizardLastRunModeAuto') }}
                        </UiSelectItem>
                        <UiSelectItem value="local">
                          local
                        </UiSelectItem>
                        <UiSelectItem value="remote">
                          remote
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                  </div>
                </section>

                <div class="flex flex-wrap items-center gap-2 pt-2">
                  <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                    {{ t('openclaw.configRaw') }}
                  </UiButton>
                </div>
              </div>

              <!-- Automation 根 Tab + Approvals：与 OpenClaw schema + zod `ApprovalsSchema` 一致 -->
              <div
                v-else-if="
                  settingsSubPage === 'automation'
                    && formMode === 'form'
                    && (activeSection === null || activeSection === 'approvals')
                    && draftConfig
                "
                class="config-approvals-form space-y-8"
              >
                <header v-if="!showConfigFormHero" class="config-section-hero mb-8">
                  <h2 class="text-lg font-semibold tracking-tight">
                    {{ t('openclaw.configSchemaSection.approvals') }}
                  </h2>
                  <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                    {{ t('openclaw.configApprovalsIntro') }}
                  </p>
                </header>

                <section class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                  <div class="space-y-1">
                    <h3 class="font-medium text-sm">
                      {{ t('openclaw.configApprovalsExecGroupTitle') }}
                    </h3>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configBindingsAdvancedLabel') }}
                    </p>
                    <p class="text-muted-foreground text-xs leading-relaxed">
                      {{ t('openclaw.configApprovalsExecGroupIntro') }}
                    </p>
                  </div>

                  <div class="flex items-center justify-between gap-4 border-border border-t pt-4">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configApprovalsExecEnabledLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configApprovalsExecEnabledHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="approvalsExecEnabled" />
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configApprovalsExecModeLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configApprovalsExecModeHelp') }}
                      </p>
                    </div>
                    <UiSelect v-model="approvalsExecModeSelect" class="w-full max-w-md shrink-0">
                      <UiSelectTrigger class="h-9">
                        <UiSelectValue :placeholder="t('openclaw.configApprovalsModeAuto')" />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem :value="APPROVALS_MODE_AUTO">
                          {{ t('openclaw.configApprovalsModeAuto') }}
                        </UiSelectItem>
                        <UiSelectItem value="session">
                          session
                        </UiSelectItem>
                        <UiSelectItem value="targets">
                          targets
                        </UiSelectItem>
                        <UiSelectItem value="both">
                          both
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                  </div>

                  <UiSeparator />

                  <div class="space-y-2">
                    <h3 class="font-medium text-sm">
                      {{ t('openclaw.configApprovalsAgentFilterLabel') }}
                    </h3>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configApprovalsAgentFilterHelp') }}
                    </p>
                    <UiTextarea
                      v-model="approvalsAgentFilterJsonLocal"
                      class="min-h-[100px] font-mono text-xs"
                      :placeholder="t('openclaw.configApprovalsAgentFilterPlaceholder')"
                      @blur="(e: FocusEvent) => applyApprovalsAgentFilterFromJson((e.target as HTMLTextAreaElement).value)"
                    />
                  </div>

                  <div class="space-y-2">
                    <h3 class="font-medium text-sm">
                      {{ t('openclaw.configApprovalsSessionFilterLabel') }}
                    </h3>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configApprovalsSessionFilterHelp') }}
                    </p>
                    <UiTextarea
                      v-model="approvalsSessionFilterJsonLocal"
                      class="min-h-[100px] font-mono text-xs"
                      :placeholder="t('openclaw.configApprovalsSessionFilterPlaceholder')"
                      @blur="(e: FocusEvent) => applyApprovalsSessionFilterFromJson((e.target as HTMLTextAreaElement).value)"
                    />
                  </div>

                  <UiSeparator />

                  <div class="space-y-3">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div class="min-w-0 flex-1">
                        <h3 class="font-medium text-sm">
                          {{ t('openclaw.configApprovalsTargetsLabel') }}
                        </h3>
                        <p class="mt-0.5 text-muted-foreground text-xs">
                          {{ t('openclaw.configApprovalsTargetsAccessItems', { n: approvalsTargetsRowJsonLocal.length }) }}
                        </p>
                      </div>
                      <UiButton variant="outline" size="sm" type="button" @click="addApprovalsTargetRow">
                        {{ t('openclaw.configBindingsAdd') }}
                      </UiButton>
                    </div>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configApprovalsTargetsHelp') }}
                    </p>
                    <div v-if="approvalsTargetsRowJsonLocal.length === 0" class="text-muted-foreground text-xs italic">
                      {{ t('openclaw.configApprovalsTargetsEmpty') }}
                    </div>
                    <div
                      v-for="(_, i) in approvalsTargetsRowJsonLocal"
                      :key="`approvals-target-${i}`"
                      class="space-y-1"
                    >
                      <UiLabel class="text-muted-foreground text-xs font-normal" :for="`openclaw-approvals-target-${i}`">
                        {{
                          t('openclaw.configApprovalsTargetsRowLabel', { n: i + 1 })
                        }}
                      </UiLabel>
                      <div class="flex flex-wrap items-start gap-2">
                        <UiTextarea
                          :id="`openclaw-approvals-target-${i}`"
                          v-model="approvalsTargetsRowJsonLocal[i]"
                          class="min-h-[140px] min-w-0 flex-1 font-mono text-xs"
                          :placeholder="t('openclaw.configApprovalsTargetsRowPlaceholder')"
                          @blur="commitApprovalsTargetsFromRows"
                        />
                        <UiButton variant="outline" size="sm" type="button" class="shrink-0" @click="removeApprovalsTargetRow(i)">
                          {{ t('openclaw.configBindingsRemove') }}
                        </UiButton>
                      </div>
                    </div>
                  </div>
                </section>

                <div class="flex flex-wrap items-center gap-2 pt-2">
                  <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                    {{ t('openclaw.configRaw') }}
                  </UiButton>
                </div>
              </div>

              <!-- Automation → Hooks：与 OpenClaw SECTION_META + schema + zod `hooks` 一致 -->
              <div
                v-else-if="
                  settingsSubPage === 'automation' && formMode === 'form' && activeSection === 'hooks' && draftConfig
                "
                class="config-hooks-form space-y-8"
              >
                <header v-if="!showConfigFormHero" class="config-section-hero mb-8">
                  <h2 class="text-lg font-semibold tracking-tight">
                    {{ t('openclaw.configSchemaSection.hooks') }}
                  </h2>
                  <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                    {{ t('openclaw.configHooksSectionMeta') }}
                  </p>
                </header>

                <p class="text-muted-foreground text-xs">
                  {{ t('openclaw.configHooksIntro') }}
                </p>

                <section class="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <h3 class="font-medium text-sm">
                        {{ t('openclaw.configHooksAllowedAgentIdsLabel') }}
                      </h3>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configHooksAccessItems', { n: hooksAllowedAgentIdsRows.length }) }}
                      </p>
                    </div>
                    <UiButton variant="outline" size="sm" type="button" @click="addHooksAllowedAgentIdRow">
                      {{ t('openclaw.configHooksAdd') }}
                    </UiButton>
                  </div>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.configHooksAllowedAgentIdsHelp') }}
                  </p>
                  <div v-if="hooksAllowedAgentIdsRows.length === 0" class="text-muted-foreground text-xs italic">
                    {{ t('openclaw.configHooksAllowedAgentIdsEmpty') }}
                  </div>
                  <div
                    v-for="(row, i) in hooksAllowedAgentIdsRows"
                    :key="`hooks-agent-${i}`"
                    class="flex flex-wrap items-center gap-2"
                  >
                    <UiInput
                      :model-value="row"
                      class="h-9 min-w-0 flex-1 font-mono text-sm"
                      :placeholder="t('openclaw.configHooksAllowedAgentIdPlaceholder')"
                      @update:model-value="(v: string | number) => updateHooksAllowedAgentIdRow(i, String(v))"
                      @blur="applyHooksAllowedAgentIdsFromRows"
                    />
                    <UiButton variant="outline" size="sm" type="button" @click="removeHooksAllowedAgentIdRow(i)">
                      {{ t('openclaw.configHooksRemove') }}
                    </UiButton>
                  </div>
                </section>

                <section class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                  <div class="flex items-center justify-between gap-4 border-border border-b py-3 first:pt-0">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configHooksEnabledLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configHooksEnabledHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="hooksEnabled" />
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-hooks-path">
                        {{ t('openclaw.configHooksPathLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configHooksPathHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-hooks-path"
                      v-model="hooksPath"
                      class="h-9 w-full max-w-md shrink-0 font-mono text-sm"
                      :placeholder="t('openclaw.configHooksPathPlaceholder')"
                    />
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1">
                    <UiLabel class="text-sm font-medium" for="openclaw-hooks-token">
                      {{ t('openclaw.configHooksTokenLabel') }}
                    </UiLabel>
                    <p class="mt-0.5 text-muted-foreground text-xs">
                      {{ t('openclaw.configHooksTokenHelp') }}
                    </p>
                    <UiInput
                      id="openclaw-hooks-token"
                      v-model="hooksToken"
                      class="mt-2 h-9 max-w-md font-mono text-sm"
                      type="password"
                      autocomplete="new-password"
                      :placeholder="t('openclaw.configHooksTokenPlaceholder')"
                    />
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-hooks-default-session">
                        {{
                          t('openclaw.configHooksDefaultSessionKeyLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configHooksDefaultSessionKeyHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-hooks-default-session"
                      v-model="hooksDefaultSessionKey"
                      class="h-9 w-full max-w-md shrink-0 font-mono text-sm"
                      :placeholder="t('openclaw.configHooksDefaultSessionKeyPlaceholder')"
                    />
                  </div>
                  <UiSeparator />
                  <div class="flex items-center justify-between gap-4 py-3">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configHooksAllowRequestSessionKeyLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configHooksAllowRequestSessionKeyHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="hooksAllowRequestSessionKey" />
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-hooks-max-body">
                        {{
                          t('openclaw.configHooksMaxBodyBytesLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configHooksMaxBodyBytesHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-hooks-max-body"
                      v-model="hooksMaxBodyBytes"
                      class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                      inputmode="numeric"
                      :placeholder="t('openclaw.configHooksMaxBodyBytesPlaceholder')"
                    />
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-hooks-transforms-dir">
                        {{
                          t('openclaw.configHooksTransformsDirLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configHooksTransformsDirHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-hooks-transforms-dir"
                      v-model="hooksTransformsDir"
                      class="h-9 w-full max-w-md shrink-0 font-mono text-sm"
                      :placeholder="t('openclaw.configHooksTransformsDirPlaceholder')"
                    />
                  </div>
                </section>

                <section class="space-y-2">
                  <h3 class="font-medium text-sm">
                    {{ t('openclaw.configHooksAllowedSessionKeyPrefixesLabel') }}
                  </h3>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.configHooksAllowedSessionKeyPrefixesHelp') }}
                  </p>
                  <UiTextarea
                    v-model="hooksAllowedSessionKeyPrefixesJsonLocal"
                    class="min-h-[100px] font-mono text-xs"
                    :placeholder="t('openclaw.configHooksAllowedSessionKeyPrefixesPlaceholder')"
                    @blur="(e: FocusEvent) => applyHooksAllowedSessionKeyPrefixesFromJson((e.target as HTMLTextAreaElement).value)"
                  />
                </section>

                <section class="space-y-2">
                  <h3 class="font-medium text-sm">
                    {{ t('openclaw.configHooksPresetsLabel') }}
                  </h3>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.configHooksPresetsHelp') }}
                  </p>
                  <UiTextarea
                    v-model="hooksPresetsJsonLocal"
                    class="min-h-[88px] font-mono text-xs"
                    :placeholder="t('openclaw.configHooksPresetsPlaceholder')"
                    @blur="(e: FocusEvent) => applyHooksPresetsFromJson((e.target as HTMLTextAreaElement).value)"
                  />
                </section>

                <section class="space-y-2">
                  <h3 class="font-medium text-sm">
                    {{ t('openclaw.configHooksMappingsLabel') }}
                  </h3>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.configHooksMappingsHelp') }}
                  </p>
                  <UiTextarea
                    v-model="hooksMappingsJsonLocal"
                    class="min-h-[200px] font-mono text-xs"
                    :placeholder="t('openclaw.configHooksMappingsPlaceholder')"
                    @blur="(e: FocusEvent) => applyHooksMappingsFromJson((e.target as HTMLTextAreaElement).value)"
                  />
                </section>

                <section class="space-y-2">
                  <h3 class="font-medium text-sm">
                    {{ t('openclaw.configHooksGmailLabel') }}
                  </h3>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.configHooksGmailHelp') }}
                  </p>
                  <UiTextarea
                    v-model="hooksGmailJsonLocal"
                    class="min-h-[120px] font-mono text-xs"
                    :placeholder="t('openclaw.configHooksGmailPlaceholder')"
                    @blur="(e: FocusEvent) => applyHooksGmailFromJson((e.target as HTMLTextAreaElement).value)"
                  />
                </section>

                <section class="space-y-2">
                  <h3 class="font-medium text-sm">
                    {{ t('openclaw.configHooksInternalLabel') }}
                  </h3>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.configHooksInternalHelp') }}
                  </p>
                  <UiTextarea
                    v-model="hooksInternalJsonLocal"
                    class="min-h-[120px] font-mono text-xs"
                    :placeholder="t('openclaw.configHooksInternalPlaceholder')"
                    @blur="(e: FocusEvent) => applyHooksInternalFromJson((e.target as HTMLTextAreaElement).value)"
                  />
                </section>

                <div class="flex flex-wrap items-center gap-2 pt-2">
                  <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                    {{ t('openclaw.configRaw') }}
                  </UiButton>
                </div>
              </div>

              <!-- Automation → Bindings：与 OpenClaw SECTION_META + schema + zod `BindingsSchema` 一致 -->
              <div
                v-else-if="
                  settingsSubPage === 'automation' && formMode === 'form' && activeSection === 'bindings' && draftConfig
                "
                class="config-bindings-form space-y-8"
              >
                <header v-if="!showConfigFormHero" class="config-section-hero mb-8">
                  <h2 class="text-lg font-semibold tracking-tight">
                    {{ t('openclaw.configSchemaSection.bindings') }}
                  </h2>
                  <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                    {{ t('openclaw.configBindingsSectionMeta') }}
                  </p>
                </header>

                <p class="text-muted-foreground text-xs">
                  {{ t('openclaw.configBindingsIntro') }}
                </p>

                <section class="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <h3 class="font-medium text-sm">
                        {{ t('openclaw.configBindingsAdvancedLabel') }}
                      </h3>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configBindingsAccessItems', { n: bindingsRowJsonLocal.length }) }}
                      </p>
                    </div>
                    <UiButton variant="outline" size="sm" type="button" @click="addBindingsRow">
                      {{ t('openclaw.configBindingsAdd') }}
                    </UiButton>
                  </div>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.configBindingsAdvancedHelp') }}
                  </p>
                  <div v-if="bindingsRowJsonLocal.length === 0" class="text-muted-foreground text-xs italic">
                    {{ t('openclaw.configBindingsEmpty') }}
                  </div>
                  <div
                    v-for="(_, i) in bindingsRowJsonLocal"
                    :key="`bindings-row-${i}`"
                    class="space-y-1"
                  >
                    <UiLabel class="text-muted-foreground text-xs font-normal" :for="`openclaw-bindings-row-${i}`">
                      {{
                        t('openclaw.configBindingsRowLabel', { n: i + 1 })
                      }}
                    </UiLabel>
                    <div class="flex flex-wrap items-start gap-2">
                      <UiTextarea
                        :id="`openclaw-bindings-row-${i}`"
                        v-model="bindingsRowJsonLocal[i]"
                        class="min-h-[140px] min-w-0 flex-1 font-mono text-xs"
                        :placeholder="t('openclaw.configBindingsRowPlaceholder')"
                        @blur="commitBindingsFromRows"
                      />
                      <UiButton variant="outline" size="sm" type="button" class="shrink-0" @click="removeBindingsRow(i)">
                        {{ t('openclaw.configBindingsRemove') }}
                      </UiButton>
                    </div>
                  </div>
                </section>

                <div class="flex flex-wrap items-center gap-2 pt-2">
                  <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                    {{ t('openclaw.configRaw') }}
                  </UiButton>
                </div>
              </div>

              <!-- Automation → Cron：与 OpenClaw SECTION_META + schema + zod `cron` 一致 -->
              <div
                v-else-if="
                  settingsSubPage === 'automation' && formMode === 'form' && activeSection === 'cron' && draftConfig
                "
                class="config-cron-form space-y-8"
              >
                <header v-if="!showConfigFormHero" class="config-section-hero mb-8">
                  <h2 class="text-lg font-semibold tracking-tight">
                    {{ t('openclaw.configSchemaSection.cron') }}
                  </h2>
                  <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                    {{ t('openclaw.configCronSectionMeta') }}
                  </p>
                </header>

                <p class="text-muted-foreground text-xs">
                  {{ t('openclaw.configCronIntro') }}
                </p>

                <section class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                  <div class="flex items-center justify-between gap-4 border-border border-b py-3 first:pt-0">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configCronEnabledLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCronEnabledHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="cronEnabled" />
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-cron-store">
                        {{ t('openclaw.configCronStoreLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCronStoreHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-cron-store"
                      v-model="cronStore"
                      class="h-9 w-full max-w-md shrink-0 font-mono text-sm"
                      :placeholder="t('openclaw.configCronStorePlaceholder')"
                    />
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-cron-max-concurrent">
                        {{
                          t('openclaw.configCronMaxConcurrentRunsLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCronMaxConcurrentRunsHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-cron-max-concurrent"
                      v-model="cronMaxConcurrentRuns"
                      class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                      inputmode="numeric"
                      :placeholder="t('openclaw.configCronMaxConcurrentRunsPlaceholder')"
                    />
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-cron-session-retention">
                        {{
                          t('openclaw.configCronSessionRetentionLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCronSessionRetentionHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-cron-session-retention"
                      v-model="cronSessionRetentionText"
                      class="h-9 w-full max-w-md shrink-0 font-mono text-sm"
                      :placeholder="t('openclaw.configCronSessionRetentionPlaceholder')"
                    />
                  </div>
                </section>

                <section class="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                  <h3 class="font-medium text-sm">
                    {{ t('openclaw.configCronRetryGroupTitle') }}
                  </h3>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.configCronRetryHelp') }}
                  </p>
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-cron-retry-max">
                        {{
                          t('openclaw.configCronRetryMaxAttemptsLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCronRetryMaxAttemptsHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-cron-retry-max"
                      v-model="cronRetryMaxAttempts"
                      class="h-9 w-full max-w-[120px] shrink-0 font-mono text-sm"
                      inputmode="numeric"
                      placeholder="3"
                    />
                  </div>
                  <UiSeparator />
                  <div class="space-y-2">
                    <UiLabel class="text-sm font-medium">
                      {{ t('openclaw.configCronRetryBackoffMsLabel') }}
                    </UiLabel>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configCronRetryBackoffMsHelp') }}
                    </p>
                    <UiTextarea
                      v-model="cronRetryBackoffMsJsonLocal"
                      class="min-h-[88px] font-mono text-xs"
                      :placeholder="t('openclaw.configCronRetryBackoffMsPlaceholder')"
                      @blur="(e: FocusEvent) => applyCronRetryBackoffMsFromJson((e.target as HTMLTextAreaElement).value)"
                    />
                  </div>
                  <UiSeparator />
                  <div class="space-y-2">
                    <UiLabel class="text-sm font-medium">
                      {{ t('openclaw.configCronRetryRetryOnLabel') }}
                    </UiLabel>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configCronRetryRetryOnHelp') }}
                    </p>
                    <UiTextarea
                      v-model="cronRetryRetryOnJsonLocal"
                      class="min-h-[88px] font-mono text-xs"
                      :placeholder="t('openclaw.configCronRetryRetryOnPlaceholder')"
                      @blur="(e: FocusEvent) => applyCronRetryRetryOnFromJson((e.target as HTMLTextAreaElement).value)"
                    />
                  </div>
                </section>

                <section class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                  <div class="flex flex-col gap-1">
                    <UiLabel class="text-sm font-medium" for="openclaw-cron-webhook">
                      {{ t('openclaw.configCronWebhookLabel') }}
                    </UiLabel>
                    <p class="mt-0.5 text-muted-foreground text-xs">
                      {{ t('openclaw.configCronWebhookHelp') }}
                    </p>
                    <UiInput
                      id="openclaw-cron-webhook"
                      v-model="cronWebhook"
                      class="mt-2 h-9 max-w-xl font-mono text-sm"
                      :placeholder="t('openclaw.configCronWebhookPlaceholder')"
                    />
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1">
                    <UiLabel class="text-sm font-medium" for="openclaw-cron-webhook-token">
                      {{
                        t('openclaw.configCronWebhookTokenLabel')
                      }}
                    </UiLabel>
                    <p class="mt-0.5 text-muted-foreground text-xs">
                      {{ t('openclaw.configCronWebhookTokenHelp') }}
                    </p>
                    <UiInput
                      id="openclaw-cron-webhook-token"
                      v-model="cronWebhookToken"
                      class="mt-2 h-9 max-w-md font-mono text-sm"
                      type="password"
                      autocomplete="new-password"
                      :placeholder="t('openclaw.configCronWebhookTokenPlaceholder')"
                    />
                  </div>
                </section>

                <section class="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                  <h3 class="font-medium text-sm">
                    {{ t('openclaw.configCronRunLogGroupTitle') }}
                  </h3>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.configCronRunLogHelp') }}
                  </p>
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-cron-runlog-maxbytes">
                        {{
                          t('openclaw.configCronRunLogMaxBytesLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCronRunLogMaxBytesHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-cron-runlog-maxbytes"
                      v-model="cronRunLogMaxBytes"
                      class="h-9 w-full max-w-[220px] shrink-0 font-mono text-sm"
                      :placeholder="t('openclaw.configCronRunLogMaxBytesPlaceholder')"
                    />
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-cron-runlog-keeplines">
                        {{
                          t('openclaw.configCronRunLogKeepLinesLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCronRunLogKeepLinesHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-cron-runlog-keeplines"
                      v-model="cronRunLogKeepLines"
                      class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                      inputmode="numeric"
                      :placeholder="t('openclaw.configCronRunLogKeepLinesPlaceholder')"
                    />
                  </div>
                </section>

                <section class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                  <h3 class="font-medium text-sm">
                    {{ t('openclaw.configCronFailureAlertGroupTitle') }}
                  </h3>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.configCronFailureAlertGroupHelp') }}
                  </p>
                  <div class="flex items-center justify-between gap-4 border-border border-b py-3 first:pt-0">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configCronFailureAlertEnabledLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCronFailureAlertEnabledHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="cronFailureAlertEnabled" />
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-cron-fail-after">
                        {{
                          t('openclaw.configCronFailureAlertAfterLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCronFailureAlertAfterHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-cron-fail-after"
                      v-model="cronFailureAlertAfter"
                      class="h-9 w-full max-w-[140px] shrink-0 font-mono text-sm"
                      inputmode="numeric"
                      placeholder="1"
                    />
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-cron-fail-cooldown">
                        {{
                          t('openclaw.configCronFailureAlertCooldownLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCronFailureAlertCooldownHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-cron-fail-cooldown"
                      v-model="cronFailureAlertCooldownMs"
                      class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                      inputmode="numeric"
                      placeholder="0"
                    />
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configCronFailureAlertModeLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCronFailureAlertModeHelp') }}
                      </p>
                    </div>
                    <UiSelect v-model="cronFailureAlertModeSelect" class="w-full max-w-md shrink-0">
                      <UiSelectTrigger class="h-9">
                        <UiSelectValue :placeholder="t('openclaw.configCronModeAuto')" />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem :value="CRON_FAILURE_MODE_AUTO">
                          {{ t('openclaw.configCronModeAuto') }}
                        </UiSelectItem>
                        <UiSelectItem value="announce">
                          announce
                        </UiSelectItem>
                        <UiSelectItem value="webhook">
                          webhook
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-cron-fail-account">
                        {{
                          t('openclaw.configCronFailureAlertAccountIdLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCronFailureAlertAccountIdHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-cron-fail-account"
                      v-model="cronFailureAlertAccountId"
                      class="h-9 w-full max-w-md shrink-0 font-mono text-sm"
                      :placeholder="t('openclaw.configCronFailureAlertAccountIdPlaceholder')"
                    />
                  </div>
                </section>

                <section class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                  <h3 class="font-medium text-sm">
                    {{ t('openclaw.configCronFailureDestinationGroupTitle') }}
                  </h3>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.configCronFailureDestinationGroupHelp') }}
                  </p>
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-cron-fdest-channel">
                        {{
                          t('openclaw.configCronFailureDestChannelLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCronFailureDestChannelHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-cron-fdest-channel"
                      v-model="cronFailureDestChannel"
                      class="h-9 w-full max-w-md shrink-0 font-mono text-sm"
                      :placeholder="t('openclaw.configCronFailureDestChannelPlaceholder')"
                    />
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-cron-fdest-to">
                        {{ t('openclaw.configCronFailureDestToLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCronFailureDestToHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-cron-fdest-to"
                      v-model="cronFailureDestTo"
                      class="h-9 w-full max-w-md shrink-0 font-mono text-sm"
                      :placeholder="t('openclaw.configCronFailureDestToPlaceholder')"
                    />
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-cron-fdest-account">
                        {{
                          t('openclaw.configCronFailureDestAccountIdLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCronFailureDestAccountIdHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-cron-fdest-account"
                      v-model="cronFailureDestAccountId"
                      class="h-9 w-full max-w-md shrink-0 font-mono text-sm"
                      :placeholder="t('openclaw.configCronFailureDestAccountIdPlaceholder')"
                    />
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configCronFailureDestModeLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCronFailureDestModeHelp') }}
                      </p>
                    </div>
                    <UiSelect v-model="cronFailureDestModeSelect" class="w-full max-w-md shrink-0">
                      <UiSelectTrigger class="h-9">
                        <UiSelectValue :placeholder="t('openclaw.configCronModeAuto')" />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem :value="CRON_FAILURE_MODE_AUTO">
                          {{ t('openclaw.configCronModeAuto') }}
                        </UiSelectItem>
                        <UiSelectItem value="announce">
                          announce
                        </UiSelectItem>
                        <UiSelectItem value="webhook">
                          webhook
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                  </div>
                </section>

                <div class="flex flex-wrap items-center gap-2 pt-2">
                  <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                    {{ t('openclaw.configRaw') }}
                  </UiButton>
                </div>
              </div>

              <!-- Automation → Commands：与 OpenClaw SECTION_META + schema + zod `CommandsSchema` 一致 -->
              <div
                v-else-if="settingsSubPage === 'automation' && activeSection === 'commands' && draftConfig"
                class="config-commands-form space-y-8"
              >
                <header v-if="!showConfigFormHero" class="config-section-hero mb-8">
                  <h2 class="text-lg font-semibold tracking-tight">
                    {{ t('openclaw.configSchemaSection.commands') }}
                  </h2>
                  <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                    {{ t('openclaw.configCommandsIntro') }}
                  </p>
                </header>

                <p class="text-muted-foreground text-xs">
                  {{ t('openclaw.configCommandsSectionHelp') }}
                </p>

                <section class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configCommandsNativeLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCommandsNativeHelp') }}
                      </p>
                    </div>
                    <UiSelect v-model="commandsNativeSelect" class="w-full max-w-md shrink-0">
                      <UiSelectTrigger class="h-9">
                        <UiSelectValue :placeholder="t('openclaw.configCommandsTristateAuto')" />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem :value="COMMANDS_TRISTATE_AUTO">
                          {{ t('openclaw.configCommandsTristateAuto') }}
                        </UiSelectItem>
                        <UiSelectItem :value="COMMANDS_TRISTATE_ON">
                          {{ t('openclaw.configCommandsTristateOn') }}
                        </UiSelectItem>
                        <UiSelectItem :value="COMMANDS_TRISTATE_OFF">
                          {{ t('openclaw.configCommandsTristateOff') }}
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configCommandsNativeSkillsLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCommandsNativeSkillsHelp') }}
                      </p>
                    </div>
                    <UiSelect v-model="commandsNativeSkillsSelect" class="w-full max-w-md shrink-0">
                      <UiSelectTrigger class="h-9">
                        <UiSelectValue :placeholder="t('openclaw.configCommandsTristateAuto')" />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem :value="COMMANDS_TRISTATE_AUTO">
                          {{ t('openclaw.configCommandsTristateAuto') }}
                        </UiSelectItem>
                        <UiSelectItem :value="COMMANDS_TRISTATE_ON">
                          {{ t('openclaw.configCommandsTristateOn') }}
                        </UiSelectItem>
                        <UiSelectItem :value="COMMANDS_TRISTATE_OFF">
                          {{ t('openclaw.configCommandsTristateOff') }}
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                  </div>
                </section>

                <section class="space-y-1 rounded-lg border border-border bg-muted/30 p-4">
                  <div class="flex items-center justify-between gap-4 border-border border-b py-3 first:pt-0">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configCommandsTextLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCommandsTextHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="commandsTextEnabled" />
                  </div>
                  <div class="flex items-center justify-between gap-4 border-border border-b py-3">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configCommandsBashLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCommandsBashHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="commandsBashEnabled" />
                  </div>
                  <div class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-commands-bash-fg">
                        {{
                          t('openclaw.configCommandsBashForegroundLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCommandsBashForegroundHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-commands-bash-fg"
                      v-model="commandsBashForegroundMs"
                      class="h-9 w-full max-w-[140px] shrink-0 font-mono text-sm"
                      inputmode="numeric"
                      :placeholder="t('openclaw.configCommandsBashForegroundPlaceholder')"
                    />
                  </div>
                  <div class="flex items-center justify-between gap-4 border-border border-b py-3">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configCommandsConfigLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCommandsConfigHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="commandsConfigEnabled" />
                  </div>
                  <div class="flex items-center justify-between gap-4 border-border border-b py-3">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configCommandsDebugLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCommandsDebugHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="commandsDebugEnabled" />
                  </div>
                  <div class="flex items-center justify-between gap-4 border-border border-b py-3">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configCommandsRestartLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCommandsRestartHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="commandsRestartEnabled" />
                  </div>
                  <div class="flex items-center justify-between gap-4 py-3">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configCommandsUseAccessGroupsLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCommandsUseAccessGroupsHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="commandsUseAccessGroupsEnabled" />
                  </div>
                </section>

                <section class="space-y-2">
                  <h3 class="font-medium text-sm">
                    {{ t('openclaw.configCommandsOwnerAllowFromLabel') }}
                  </h3>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.configCommandsOwnerAllowFromHelp') }}
                  </p>
                  <UiTextarea
                    v-model="commandsOwnerAllowFromJsonLocal"
                    class="min-h-[120px] font-mono text-xs"
                    :placeholder="t('openclaw.configCommandsOwnerAllowFromPlaceholder')"
                    @blur="(e: FocusEvent) => applyCommandsOwnerAllowFromJson((e.target as HTMLTextAreaElement).value)"
                  />
                </section>

                <section class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configCommandsOwnerDisplayLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configCommandsOwnerDisplayHelp') }}
                      </p>
                    </div>
                    <UiSelect v-model="commandsOwnerDisplaySelect" class="w-full max-w-md shrink-0">
                      <UiSelectTrigger class="h-9">
                        <UiSelectValue :placeholder="t('openclaw.configCommandsOwnerDisplayRaw')" />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem value="raw">
                          {{ t('openclaw.configCommandsOwnerDisplayRaw') }}
                        </UiSelectItem>
                        <UiSelectItem value="hash">
                          {{ t('openclaw.configCommandsOwnerDisplayHash') }}
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1">
                    <UiLabel class="text-sm font-medium" for="openclaw-commands-owner-secret">
                      {{
                        t('openclaw.configCommandsOwnerDisplaySecretLabel')
                      }}
                    </UiLabel>
                    <p class="mt-0.5 text-muted-foreground text-xs">
                      {{ t('openclaw.configCommandsOwnerDisplaySecretHelp') }}
                    </p>
                    <UiInput
                      id="openclaw-commands-owner-secret"
                      v-model="commandsOwnerDisplaySecret"
                      class="mt-2 h-9 max-w-md font-mono text-sm"
                      type="password"
                      autocomplete="new-password"
                      :placeholder="t('openclaw.configCommandsOwnerDisplaySecretPlaceholder')"
                    />
                  </div>
                </section>

                <section class="space-y-2">
                  <h3 class="font-medium text-sm">
                    {{ t('openclaw.configCommandsAllowFromLabel') }}
                  </h3>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.configCommandsAllowFromHelp') }}
                  </p>
                  <UiTextarea
                    v-model="commandsAllowFromJsonLocal"
                    class="min-h-[160px] font-mono text-xs"
                    :placeholder="t('openclaw.configCommandsAllowFromPlaceholder')"
                    @blur="(e: FocusEvent) => applyCommandsAllowFromJson((e.target as HTMLTextAreaElement).value)"
                  />
                </section>

                <div class="flex flex-wrap items-center gap-2 pt-2">
                  <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                    {{ t('openclaw.configRaw') }}
                  </UiButton>
                </div>
              </div>

              <!-- Automation → Plugins：与 OpenClaw SECTION_META + schema.labels `plugins.*` 一致 -->
              <div
                v-else-if="
                  settingsSubPage === 'automation' && formMode === 'form' && activeSection === 'plugins' && draftConfig
                "
                class="config-plugins-form space-y-8"
              >
                <header v-if="!showConfigFormHero" class="config-section-hero mb-8">
                  <h2 class="text-lg font-semibold tracking-tight">
                    {{ t('openclaw.configSchemaSection.plugins') }}
                  </h2>
                  <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                    {{ t('openclaw.configPluginsSectionMeta') }}
                  </p>
                </header>

                <section class="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                  <div class="flex items-center justify-between gap-4 border-border border-b pb-4">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configPluginsEnabledLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configPluginsEnabledHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="pluginsEnabled" />
                  </div>
                  <UiSeparator />
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <h3 class="font-medium text-sm">
                        {{ t('openclaw.configPluginsAllowLabel') }}
                      </h3>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configHooksAccessItems', { n: pluginsAllowRows.length }) }}
                      </p>
                    </div>
                    <UiButton variant="outline" size="sm" type="button" @click="addPluginsAllowRow">
                      {{ t('openclaw.configBindingsAdd') }}
                    </UiButton>
                  </div>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.configPluginsAllowHelp') }}
                  </p>
                  <div v-if="pluginsAllowRows.length === 0" class="text-muted-foreground text-xs italic">
                    {{ t('openclaw.configPluginsAllowEmpty') }}
                  </div>
                  <div
                    v-for="(row, i) in pluginsAllowRows"
                    :key="`plugins-allow-${i}`"
                    class="flex flex-wrap items-center gap-2"
                  >
                    <UiInput
                      :model-value="row"
                      class="h-9 min-w-0 flex-1 font-mono text-sm"
                      :placeholder="t('openclaw.configPluginsPluginIdPlaceholder')"
                      @update:model-value="(v: string | number) => updatePluginsAllowRow(i, String(v))"
                      @blur="applyPluginsAllowFromRows"
                    />
                    <UiButton variant="outline" size="sm" type="button" @click="removePluginsAllowRow(i)">
                      {{ t('openclaw.configBindingsRemove') }}
                    </UiButton>
                  </div>
                  <UiSeparator />
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <h3 class="font-medium text-sm">
                        {{ t('openclaw.configPluginsDenyLabel') }}
                      </h3>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configHooksAccessItems', { n: pluginsDenyRows.length }) }}
                      </p>
                    </div>
                    <UiButton variant="outline" size="sm" type="button" @click="addPluginsDenyRow">
                      {{ t('openclaw.configBindingsAdd') }}
                    </UiButton>
                  </div>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.configPluginsDenyHelp') }}
                  </p>
                  <div v-if="pluginsDenyRows.length === 0" class="text-muted-foreground text-xs italic">
                    {{ t('openclaw.configPluginsDenyEmpty') }}
                  </div>
                  <div
                    v-for="(row, i) in pluginsDenyRows"
                    :key="`plugins-deny-${i}`"
                    class="flex flex-wrap items-center gap-2"
                  >
                    <UiInput
                      :model-value="row"
                      class="h-9 min-w-0 flex-1 font-mono text-sm"
                      :placeholder="t('openclaw.configPluginsPluginIdPlaceholder')"
                      @update:model-value="(v: string | number) => updatePluginsDenyRow(i, String(v))"
                      @blur="applyPluginsDenyFromRows"
                    />
                    <UiButton variant="outline" size="sm" type="button" @click="removePluginsDenyRow(i)">
                      {{ t('openclaw.configBindingsRemove') }}
                    </UiButton>
                  </div>
                </section>

                <div class="flex flex-wrap items-center gap-2 pt-2">
                  <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                    {{ t('openclaw.configRaw') }}
                  </UiButton>
                </div>
              </div>

              <!-- Infrastructure → Web：与 OpenClaw SECTION_META + schema.labels / schema.help 一致 -->
              <div
                v-else-if="
                  settingsSubPage === 'infrastructure'
                    && formMode === 'form'
                    && activeSection === 'web'
                    && draftConfig
                "
                class="config-web-form space-y-8"
              >
                <p class="mb-6 text-sm leading-relaxed text-muted-foreground">
                  {{ t('openclaw.configWebIntro') }}
                </p>

                <section class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                  <div class="flex items-center justify-between gap-4 py-1">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configWebEnabledLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configWebEnabledHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="cfgWebEnabled" />
                  </div>

                  <UiSeparator />

                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-web-heartbeat">
                        {{
                          t('openclaw.configWebHeartbeatLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configWebHeartbeatHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-web-heartbeat"
                      v-model="cfgWebHeartbeatSeconds"
                      class="h-9 w-full max-w-[160px] shrink-0 font-mono text-sm"
                      inputmode="numeric"
                      :placeholder="t('openclaw.configWebHeartbeatPlaceholder')"
                    />
                  </div>

                  <UiSeparator />

                  <div>
                    <h3 class="font-medium text-sm">
                      {{ t('openclaw.configWebReconnectHeading') }}
                    </h3>
                    <p class="mt-0.5 text-muted-foreground text-xs">
                      {{ t('openclaw.configWebReconnectHelp') }}
                    </p>
                  </div>

                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-web-rc-init">
                        {{
                          t('openclaw.configWebReconnectInitialMsLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configWebReconnectInitialMsHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-web-rc-init"
                      v-model="cfgWebReconnectInitialMs"
                      class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                      inputmode="decimal"
                    />
                  </div>

                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-web-rc-max">
                        {{
                          t('openclaw.configWebReconnectMaxMsLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configWebReconnectMaxMsHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-web-rc-max"
                      v-model="cfgWebReconnectMaxMs"
                      class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                      inputmode="decimal"
                    />
                  </div>

                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-web-rc-factor">
                        {{
                          t('openclaw.configWebReconnectFactorLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configWebReconnectFactorHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-web-rc-factor"
                      v-model="cfgWebReconnectFactor"
                      class="h-9 w-full max-w-[140px] shrink-0 font-mono text-sm"
                      inputmode="decimal"
                    />
                  </div>

                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-web-rc-jitter">
                        {{
                          t('openclaw.configWebReconnectJitterLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configWebReconnectJitterHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-web-rc-jitter"
                      v-model="cfgWebReconnectJitter"
                      class="h-9 w-full max-w-[120px] shrink-0 font-mono text-sm"
                      inputmode="decimal"
                    />
                  </div>

                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-web-rc-attempts">
                        {{
                          t('openclaw.configWebReconnectMaxAttemptsLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configWebReconnectMaxAttemptsHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-web-rc-attempts"
                      v-model="cfgWebReconnectMaxAttempts"
                      class="h-9 w-full max-w-[120px] shrink-0 font-mono text-sm"
                      inputmode="numeric"
                    />
                  </div>
                </section>

                <div class="flex flex-wrap items-center gap-2 pt-2">
                  <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                    {{ t('openclaw.configRaw') }}
                  </UiButton>
                </div>
              </div>

              <!-- Infrastructure → Gateway：与 OpenClaw SECTION_META + schema.labels / schema.help 一致 -->
              <div
                v-else-if="
                  settingsSubPage === 'infrastructure'
                    && formMode === 'form'
                    && activeSection === 'gateway'
                    && draftConfig
                "
                class="config-gateway-form space-y-8"
              >
                <p class="mb-6 text-sm leading-relaxed text-muted-foreground">
                  {{ t('openclaw.configGatewayIntro') }}
                </p>

                <section class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-gw-port">
                        {{ t('openclaw.configGatewayPortLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayPortHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-gw-port"
                      v-model="cfgGwPort"
                      class="h-9 w-full max-w-[140px] shrink-0 font-mono text-sm"
                      inputmode="numeric"
                      :placeholder="t('openclaw.configGatewayPortPlaceholder')"
                    />
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configGatewayModeLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayModeHelp') }}
                      </p>
                    </div>
                    <UiSelect v-model="cfgGwModeSelect" class="w-full max-w-md shrink-0">
                      <UiSelectTrigger class="h-9">
                        <UiSelectValue />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem value="local">
                          {{ t('openclaw.configGatewayModeLocal') }}
                        </UiSelectItem>
                        <UiSelectItem value="remote">
                          {{ t('openclaw.configGatewayModeRemote') }}
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configGatewayBindLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayBindHelp') }}
                      </p>
                    </div>
                    <UiSelect v-model="cfgGwBindSelect" class="w-full max-w-md shrink-0">
                      <UiSelectTrigger class="h-9">
                        <UiSelectValue />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem :value="GW_CFG_OMIT">
                          {{ t('openclaw.configGatewayBindDefault') }}
                        </UiSelectItem>
                        <UiSelectItem value="auto">
                          {{ t('openclaw.configGatewayBindAuto') }}
                        </UiSelectItem>
                        <UiSelectItem value="lan">
                          {{ t('openclaw.configGatewayBindLan') }}
                        </UiSelectItem>
                        <UiSelectItem value="loopback">
                          {{ t('openclaw.configGatewayBindLoopback') }}
                        </UiSelectItem>
                        <UiSelectItem value="custom">
                          {{ t('openclaw.configGatewayBindCustom') }}
                        </UiSelectItem>
                        <UiSelectItem value="tailnet">
                          {{ t('openclaw.configGatewayBindTailnet') }}
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                  </div>
                  <UiSeparator />
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-gw-custom-host">
                        {{
                          t('openclaw.configGatewayCustomBindHostLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayCustomBindHostHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-gw-custom-host"
                      v-model="cfgGwCustomBindHost"
                      class="h-9 w-full max-w-md shrink-0 font-mono text-sm"
                      :placeholder="t('openclaw.configGatewayCustomBindHostPlaceholder')"
                    />
                  </div>

                  <UiSeparator />

                  <h3 class="font-medium text-sm">
                    {{ t('openclaw.configGatewayControlUiSectionTitle') }}
                  </h3>
                  <div class="flex items-center justify-between gap-4 border-border border-t pt-4">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configGatewayControlUiEnabledLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayControlUiEnabledHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="cfgGwControlUiEnabled" />
                  </div>
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-gw-cui-base">
                        {{ t('openclaw.configGatewayControlUiBasePathLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayControlUiBasePathHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-gw-cui-base"
                      v-model="cfgGwControlUiBasePath"
                      class="h-9 w-full max-w-md shrink-0 font-mono text-sm"
                    />
                  </div>
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-gw-cui-root">
                        {{ t('openclaw.configGatewayControlUiRootLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayControlUiRootHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-gw-cui-root"
                      v-model="cfgGwControlUiRoot"
                      class="h-9 w-full max-w-md shrink-0 font-mono text-sm"
                    />
                  </div>
                  <div class="space-y-2">
                    <h4 class="font-medium text-sm">
                      {{ t('openclaw.configGatewayControlUiAllowedOriginsLabel') }}
                    </h4>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configGatewayControlUiAllowedOriginsHelp') }}
                    </p>
                    <UiTextarea
                      v-model="gwControlUiAllowedOriginsJsonLocal"
                      class="min-h-[88px] font-mono text-xs"
                      :placeholder="t('openclaw.configGatewayControlUiAllowedOriginsPlaceholder')"
                      @blur="(e: FocusEvent) => applyGwControlUiAllowedOriginsFromJson((e.target as HTMLTextAreaElement).value)"
                    />
                  </div>
                  <div class="flex items-center justify-between gap-4 py-2">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configGatewayControlUiDangerHostLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayControlUiDangerHostHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="cfgGwControlUiDangerHost" />
                  </div>
                  <div class="flex items-center justify-between gap-4 py-2">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configGatewayControlUiInsecureAuthLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayControlUiInsecureAuthHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="cfgGwControlUiAllowInsecureAuth" />
                  </div>
                  <div class="flex items-center justify-between gap-4 py-2">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configGatewayControlUiDisableDeviceAuthLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayControlUiDisableDeviceAuthHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="cfgGwControlUiDisableDeviceAuth" />
                  </div>

                  <UiSeparator />

                  <h3 class="font-medium text-sm">
                    {{ t('openclaw.configGatewayAuthSectionTitle') }}
                  </h3>
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configGatewayAuthModeLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayAuthModeHelp') }}
                      </p>
                    </div>
                    <UiSelect v-model="cfgGwAuthModeSelect" class="w-full max-w-md shrink-0">
                      <UiSelectTrigger class="h-9">
                        <UiSelectValue />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem :value="GW_CFG_OMIT">
                          {{ t('openclaw.configGatewayAuthModeDefault') }}
                        </UiSelectItem>
                        <UiSelectItem value="none">
                          {{ t('openclaw.configGatewayAuthModeNone') }}
                        </UiSelectItem>
                        <UiSelectItem value="token">
                          {{ t('openclaw.configGatewayAuthModeToken') }}
                        </UiSelectItem>
                        <UiSelectItem value="password">
                          {{ t('openclaw.configGatewayAuthModePassword') }}
                        </UiSelectItem>
                        <UiSelectItem value="trusted-proxy">
                          {{ t('openclaw.configGatewayAuthModeTrustedProxy') }}
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                  </div>
                  <div class="flex flex-col gap-1">
                    <UiLabel class="text-sm font-medium" for="openclaw-gw-auth-token">
                      {{ t('openclaw.configGatewayAuthTokenLabel') }}
                    </UiLabel>
                    <p class="mt-0.5 text-muted-foreground text-xs">
                      {{ t('openclaw.configGatewayAuthTokenHelp') }}
                    </p>
                    <UiInput
                      id="openclaw-gw-auth-token"
                      v-model="cfgGwAuthToken"
                      class="mt-1 h-9 max-w-md font-mono text-sm"
                      type="password"
                      autocomplete="new-password"
                      :placeholder="t('openclaw.configGatewayAuthTokenPlaceholder')"
                    />
                  </div>
                  <div class="flex flex-col gap-1">
                    <UiLabel class="text-sm font-medium" for="openclaw-gw-auth-pass">
                      {{ t('openclaw.configGatewayAuthPasswordLabel') }}
                    </UiLabel>
                    <p class="mt-0.5 text-muted-foreground text-xs">
                      {{ t('openclaw.configGatewayAuthPasswordHelp') }}
                    </p>
                    <UiInput
                      id="openclaw-gw-auth-pass"
                      v-model="cfgGwAuthPassword"
                      class="mt-1 h-9 max-w-md font-mono text-sm"
                      type="password"
                      autocomplete="new-password"
                      :placeholder="t('openclaw.configGatewayAuthPasswordPlaceholder')"
                    />
                  </div>
                  <div class="flex items-center justify-between gap-4 py-2">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configGatewayAuthAllowTailscaleLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayAuthAllowTailscaleHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="cfgGwAuthAllowTailscale" />
                  </div>
                  <div class="space-y-2">
                    <h4 class="font-medium text-sm">
                      {{ t('openclaw.configGatewayAuthRateLimitLabel') }}
                    </h4>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configGatewayAuthRateLimitHelp') }}
                    </p>
                    <UiTextarea
                      v-model="gwAuthRateLimitJsonLocal"
                      class="min-h-[100px] font-mono text-xs"
                      :placeholder="t('openclaw.configGatewayAuthRateLimitPlaceholder')"
                      @blur="(e: FocusEvent) => applyGwAuthRateLimitFromJson((e.target as HTMLTextAreaElement).value)"
                    />
                  </div>
                  <div class="space-y-2">
                    <h4 class="font-medium text-sm">
                      {{ t('openclaw.configGatewayAuthTrustedProxyLabel') }}
                    </h4>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configGatewayAuthTrustedProxyHelp') }}
                    </p>
                    <UiTextarea
                      v-model="gwAuthTrustedProxyJsonLocal"
                      class="min-h-[120px] font-mono text-xs"
                      :placeholder="t('openclaw.configGatewayAuthTrustedProxyPlaceholder')"
                      @blur="(e: FocusEvent) => applyGwAuthTrustedProxyFromJson((e.target as HTMLTextAreaElement).value)"
                    />
                  </div>

                  <UiSeparator />

                  <div class="space-y-2">
                    <h4 class="font-medium text-sm">
                      {{ t('openclaw.configGatewayTrustedProxiesLabel') }}
                    </h4>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configGatewayTrustedProxiesHelp') }}
                    </p>
                    <UiTextarea
                      v-model="gwTrustedProxiesJsonLocal"
                      class="min-h-[88px] font-mono text-xs"
                      :placeholder="t('openclaw.configGatewayTrustedProxiesPlaceholder')"
                      @blur="(e: FocusEvent) => applyGwTrustedProxiesFromJson((e.target as HTMLTextAreaElement).value)"
                    />
                  </div>

                  <UiSeparator />

                  <div class="flex items-center justify-between gap-4 py-2">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configGatewayAllowRealIpFallbackLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayAllowRealIpFallbackHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="cfgGwAllowRealIpFallback" />
                  </div>

                  <UiSeparator />

                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <h4 class="font-medium text-sm">
                        {{ t('openclaw.configGatewayToolsAllowLabel') }}
                      </h4>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configHooksAccessItems', { n: gatewayToolsAllowRows.length }) }}
                      </p>
                    </div>
                    <UiButton variant="outline" size="sm" type="button" @click="addGatewayToolsAllowRow">
                      {{ t('openclaw.configBindingsAdd') }}
                    </UiButton>
                  </div>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.configGatewayToolsAllowHelp') }}
                  </p>
                  <div v-if="gatewayToolsAllowRows.length === 0" class="text-muted-foreground text-xs italic">
                    {{ t('openclaw.configGatewayToolsAllowEmpty') }}
                  </div>
                  <div
                    v-for="(row, i) in gatewayToolsAllowRows"
                    :key="`gw-tool-allow-${i}`"
                    class="flex flex-wrap items-center gap-2"
                  >
                    <UiInput
                      :model-value="row"
                      class="h-9 min-w-0 flex-1 font-mono text-sm"
                      :placeholder="t('openclaw.configGatewayToolNamePlaceholder')"
                      @update:model-value="(v: string | number) => updateGatewayToolsAllowRow(i, String(v))"
                      @blur="applyGatewayToolsAllowFromRows"
                    />
                    <UiButton variant="outline" size="sm" type="button" @click="removeGatewayToolsAllowRow(i)">
                      {{ t('openclaw.configBindingsRemove') }}
                    </UiButton>
                  </div>

                  <UiSeparator />

                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <h4 class="font-medium text-sm">
                        {{ t('openclaw.configGatewayToolsDenyLabel') }}
                      </h4>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configHooksAccessItems', { n: gatewayToolsDenyRows.length }) }}
                      </p>
                    </div>
                    <UiButton variant="outline" size="sm" type="button" @click="addGatewayToolsDenyRow">
                      {{ t('openclaw.configBindingsAdd') }}
                    </UiButton>
                  </div>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.configGatewayToolsDenyHelp') }}
                  </p>
                  <div v-if="gatewayToolsDenyRows.length === 0" class="text-muted-foreground text-xs italic">
                    {{ t('openclaw.configGatewayToolsDenyEmpty') }}
                  </div>
                  <div
                    v-for="(row, i) in gatewayToolsDenyRows"
                    :key="`gw-tool-deny-${i}`"
                    class="flex flex-wrap items-center gap-2"
                  >
                    <UiInput
                      :model-value="row"
                      class="h-9 min-w-0 flex-1 font-mono text-sm"
                      :placeholder="t('openclaw.configGatewayToolNamePlaceholder')"
                      @update:model-value="(v: string | number) => updateGatewayToolsDenyRow(i, String(v))"
                      @blur="applyGatewayToolsDenyFromRows"
                    />
                    <UiButton variant="outline" size="sm" type="button" @click="removeGatewayToolsDenyRow(i)">
                      {{ t('openclaw.configBindingsRemove') }}
                    </UiButton>
                  </div>

                  <UiSeparator />

                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-gw-ch-health">
                        {{
                          t('openclaw.configGatewayChannelHealthLabel')
                        }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayChannelHealthHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-gw-ch-health"
                      v-model="cfgGwChannelHealthMinutes"
                      class="h-9 w-full max-w-[140px] shrink-0 font-mono text-sm"
                      inputmode="numeric"
                      :placeholder="t('openclaw.configGatewayChannelHealthPlaceholder')"
                    />
                  </div>

                  <UiSeparator />

                  <h3 class="font-medium text-sm">
                    {{ t('openclaw.configGatewayTailscaleSectionTitle') }}
                  </h3>
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configGatewayTailscaleModeLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayTailscaleModeHelp') }}
                      </p>
                    </div>
                    <UiSelect v-model="cfgGwTailscaleModeSelect" class="w-full max-w-md shrink-0">
                      <UiSelectTrigger class="h-9">
                        <UiSelectValue />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem :value="GW_CFG_OMIT">
                          {{ t('openclaw.configGatewayTailscaleModeDefault') }}
                        </UiSelectItem>
                        <UiSelectItem value="off">
                          {{ t('openclaw.configGatewayTailscaleModeOff') }}
                        </UiSelectItem>
                        <UiSelectItem value="serve">
                          {{ t('openclaw.configGatewayTailscaleModeServe') }}
                        </UiSelectItem>
                        <UiSelectItem value="funnel">
                          {{ t('openclaw.configGatewayTailscaleModeFunnel') }}
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                  </div>
                  <div class="flex items-center justify-between gap-4 py-2">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configGatewayTailscaleResetLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayTailscaleResetHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="cfgGwTailscaleResetOnExit" />
                  </div>

                  <UiSeparator />

                  <h3 class="font-medium text-sm">
                    {{ t('openclaw.configGatewayRemoteSectionTitle') }}
                  </h3>
                  <div class="flex flex-col gap-1">
                    <UiLabel class="text-sm font-medium" for="openclaw-gw-rmt-url">
                      {{ t('openclaw.configGatewayRemoteUrlLabel') }}
                    </UiLabel>
                    <p class="text-muted-foreground text-xs">
                      {{ t('openclaw.configGatewayRemoteUrlHelp') }}
                    </p>
                    <UiInput id="openclaw-gw-rmt-url" v-model="cfgGwRemoteUrl" class="mt-1 h-9 max-w-xl font-mono text-sm" />
                  </div>
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configGatewayRemoteTransportLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayRemoteTransportHelp') }}
                      </p>
                    </div>
                    <UiSelect v-model="cfgGwRemoteTransportSelect" class="w-full max-w-md shrink-0">
                      <UiSelectTrigger class="h-9">
                        <UiSelectValue />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem :value="GW_CFG_OMIT">
                          {{ t('openclaw.configGatewayAuthModeDefault') }}
                        </UiSelectItem>
                        <UiSelectItem value="direct">
                          {{ t('openclaw.configGatewayRemoteTransportDirect') }}
                        </UiSelectItem>
                        <UiSelectItem value="ssh">
                          {{ t('openclaw.configGatewayRemoteTransportSsh') }}
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                  </div>
                  <div class="flex flex-col gap-1">
                    <UiLabel class="text-sm font-medium" for="openclaw-gw-rmt-token">
                      {{ t('openclaw.configGatewayRemoteTokenLabel') }}
                    </UiLabel>
                    <p class="mt-0.5 text-muted-foreground text-xs">
                      {{ t('openclaw.configGatewayRemoteTokenHelp') }}
                    </p>
                    <UiInput
                      id="openclaw-gw-rmt-token"
                      v-model="cfgGwRemoteToken"
                      class="mt-1 h-9 max-w-xl font-mono text-sm"
                      type="password"
                      autocomplete="new-password"
                    />
                  </div>
                  <div class="flex flex-col gap-1">
                    <UiLabel class="text-sm font-medium" for="openclaw-gw-rmt-pass">
                      {{ t('openclaw.configGatewayRemotePasswordLabel') }}
                    </UiLabel>
                    <p class="mt-0.5 text-muted-foreground text-xs">
                      {{ t('openclaw.configGatewayRemotePasswordHelp') }}
                    </p>
                    <UiInput
                      id="openclaw-gw-rmt-pass"
                      v-model="cfgGwRemotePassword"
                      class="mt-1 h-9 max-w-xl font-mono text-sm"
                      type="password"
                      autocomplete="new-password"
                    />
                  </div>
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-gw-rmt-fp">
                        {{ t('openclaw.configGatewayRemoteTlsFpLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayRemoteTlsFpHelp') }}
                      </p>
                    </div>
                    <UiInput id="openclaw-gw-rmt-fp" v-model="cfgGwRemoteTlsFingerprint" class="h-9 w-full max-w-xl shrink-0 font-mono text-sm" />
                  </div>
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-gw-ssh-tgt">
                        {{ t('openclaw.configGatewayRemoteSshTargetLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayRemoteSshTargetHelp') }}
                      </p>
                    </div>
                    <UiInput id="openclaw-gw-ssh-tgt" v-model="cfgGwRemoteSshTarget" class="h-9 w-full max-w-md shrink-0 font-mono text-sm" />
                  </div>
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-gw-ssh-id">
                        {{ t('openclaw.configGatewayRemoteSshIdentityLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayRemoteSshIdentityHelp') }}
                      </p>
                    </div>
                    <UiInput id="openclaw-gw-ssh-id" v-model="cfgGwRemoteSshIdentity" class="h-9 w-full max-w-md shrink-0 font-mono text-sm" />
                  </div>

                  <UiSeparator />

                  <h3 class="font-medium text-sm">
                    {{ t('openclaw.configGatewayReloadSectionTitle') }}
                  </h3>
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configGatewayReloadModeLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayReloadModeHelp') }}
                      </p>
                    </div>
                    <UiSelect v-model="cfgGwReloadModeSelect" class="w-full max-w-md shrink-0">
                      <UiSelectTrigger class="h-9">
                        <UiSelectValue />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem :value="GW_CFG_OMIT">
                          {{ t('openclaw.configGatewayReloadModeDefault') }}
                        </UiSelectItem>
                        <UiSelectItem value="off">
                          off
                        </UiSelectItem>
                        <UiSelectItem value="restart">
                          restart
                        </UiSelectItem>
                        <UiSelectItem value="hot">
                          hot
                        </UiSelectItem>
                        <UiSelectItem value="hybrid">
                          hybrid
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                  </div>
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div class="min-w-0 flex-1">
                      <UiLabel class="text-sm font-medium" for="openclaw-gw-reload-db">
                        {{ t('openclaw.configGatewayReloadDebounceLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayReloadDebounceHelp') }}
                      </p>
                    </div>
                    <UiInput
                      id="openclaw-gw-reload-db"
                      v-model="cfgGwReloadDebounceMs"
                      class="h-9 w-full max-w-[160px] shrink-0 font-mono text-sm"
                      inputmode="numeric"
                    />
                  </div>

                  <UiSeparator />

                  <h3 class="font-medium text-sm">
                    {{ t('openclaw.configGatewayTlsSectionTitle') }}
                  </h3>
                  <div class="flex items-center justify-between gap-4 py-2">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configGatewayTlsEnabledLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayTlsEnabledHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="cfgGwTlsEnabled" />
                  </div>
                  <div class="flex items-center justify-between gap-4 py-2">
                    <div class="min-w-0">
                      <UiLabel class="text-sm font-medium">
                        {{ t('openclaw.configGatewayTlsAutoGenLabel') }}
                      </UiLabel>
                      <p class="mt-0.5 text-muted-foreground text-xs">
                        {{ t('openclaw.configGatewayTlsAutoGenHelp') }}
                      </p>
                    </div>
                    <UiSwitch v-model:checked="cfgGwTlsAutoGenerate" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <UiLabel class="text-sm font-medium" for="openclaw-gw-tls-cert">
                      {{ t('openclaw.configGatewayTlsCertPathLabel') }}
                    </UiLabel>
                    <p class="mt-0.5 text-muted-foreground text-xs">
                      {{ t('openclaw.configGatewayTlsCertPathHelp') }}
                    </p>
                    <UiInput id="openclaw-gw-tls-cert" v-model="cfgGwTlsCertPath" class="mt-1 h-9 max-w-xl font-mono text-sm" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <UiLabel class="text-sm font-medium" for="openclaw-gw-tls-key">
                      {{ t('openclaw.configGatewayTlsKeyPathLabel') }}
                    </UiLabel>
                    <p class="mt-0.5 text-muted-foreground text-xs">
                      {{ t('openclaw.configGatewayTlsKeyPathHelp') }}
                    </p>
                    <UiInput id="openclaw-gw-tls-key" v-model="cfgGwTlsKeyPath" class="mt-1 h-9 max-w-xl font-mono text-sm" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <UiLabel class="text-sm font-medium" for="openclaw-gw-tls-ca">
                      {{ t('openclaw.configGatewayTlsCaPathLabel') }}
                    </UiLabel>
                    <p class="mt-0.5 text-muted-foreground text-xs">
                      {{ t('openclaw.configGatewayTlsCaPathHelp') }}
                    </p>
                    <UiInput id="openclaw-gw-tls-ca" v-model="cfgGwTlsCaPath" class="mt-1 h-9 max-w-xl font-mono text-sm" />
                  </div>
                </section>

                <div class="flex flex-wrap items-center gap-2 pt-2">
                  <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                    {{ t('openclaw.configRaw') }}
                  </UiButton>
                </div>
              </div>

              <!-- Communication / Appearance / … 子路由：首项为 OpenClaw 同款根 Tab（key null），其余为 includeSections -->
              <div
                v-else-if="draftConfig"
                class="config-satellite-section space-y-8"
              >
                <!-- Infrastructure → Browser：放在卫星容器内 v-if，避免长 v-else-if 链偶发未命中时误显示「未实现」提示 -->
                <template
                  v-if="
                    settingsSubPage === 'infrastructure'
                      && formMode === 'form'
                      && activeSection === 'browser'
                      && draftConfig
                  "
                >
                  <div class="config-browser-form space-y-8">
                    <p class="mb-6 text-sm leading-relaxed text-muted-foreground">
                      {{ t('openclaw.configBrowserIntro') }}
                    </p>

                    <section class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="flex items-center justify-between gap-4 py-1">
                        <div class="min-w-0">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configBrowserEnabledLabel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configBrowserEnabledHelp') }}
                          </p>
                        </div>
                        <UiSwitch v-model:checked="cfgBrowserEnabled" />
                      </div>

                      <UiSeparator />

                      <div class="flex items-center justify-between gap-4 py-1">
                        <div class="min-w-0">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configBrowserEvaluateEnabledLabel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configBrowserEvaluateEnabledHelp') }}
                          </p>
                        </div>
                        <UiSwitch v-model:checked="cfgBrowserEvaluateEnabled" />
                      </div>
                      <div class="flex items-center justify-between gap-4 py-1">
                        <div class="min-w-0">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configBrowserAttachOnlyLabel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configBrowserAttachOnlyHelp') }}
                          </p>
                        </div>
                        <UiSwitch v-model:checked="cfgBrowserAttachOnly" />
                      </div>
                      <div class="flex items-center justify-between gap-4 py-1">
                        <div class="min-w-0">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configBrowserHeadlessLabel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configBrowserHeadlessHelp') }}
                          </p>
                        </div>
                        <UiSwitch v-model:checked="cfgBrowserHeadless" />
                      </div>
                      <div class="flex items-center justify-between gap-4 py-1">
                        <div class="min-w-0">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configBrowserNoSandboxLabel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configBrowserNoSandboxHelp') }}
                          </p>
                        </div>
                        <UiSwitch v-model:checked="cfgBrowserNoSandbox" />
                      </div>

                      <UiSeparator />

                      <div class="flex flex-col gap-1">
                        <UiLabel class="text-sm font-medium" for="openclaw-browser-cdp-url">
                          {{ t('openclaw.configBrowserCdpUrlLabel') }}
                        </UiLabel>
                        <p class="mt-0.5 text-muted-foreground text-xs">
                          {{ t('openclaw.configBrowserCdpUrlHelp') }}
                        </p>
                        <UiInput
                          id="openclaw-browser-cdp-url"
                          v-model="cfgBrowserCdpUrl"
                          class="mt-1 h-9 max-w-xl font-mono text-sm"
                        />
                      </div>

                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium" for="openclaw-browser-rc-to">
                            {{
                              t('openclaw.configBrowserRemoteCdpTimeoutMsLabel')
                            }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configBrowserRemoteCdpTimeoutMsHelp') }}
                          </p>
                        </div>
                        <UiInput
                          id="openclaw-browser-rc-to"
                          v-model="cfgBrowserRemoteCdpTimeoutMs"
                          class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                          inputmode="numeric"
                        />
                      </div>
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium" for="openclaw-browser-rc-hs">
                            {{
                              t('openclaw.configBrowserRemoteCdpHandshakeTimeoutMsLabel')
                            }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configBrowserRemoteCdpHandshakeTimeoutMsHelp') }}
                          </p>
                        </div>
                        <UiInput
                          id="openclaw-browser-rc-hs"
                          v-model="cfgBrowserRemoteCdpHandshakeTimeoutMs"
                          class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                          inputmode="numeric"
                        />
                      </div>

                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium" for="openclaw-browser-cdp-port-start">
                            {{
                              t('openclaw.configBrowserCdpPortRangeStartLabel')
                            }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configBrowserCdpPortRangeStartHelp') }}
                          </p>
                        </div>
                        <UiInput
                          id="openclaw-browser-cdp-port-start"
                          v-model="cfgBrowserCdpPortRangeStart"
                          class="h-9 w-full max-w-[140px] shrink-0 font-mono text-sm"
                          inputmode="numeric"
                        />
                      </div>

                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium" for="openclaw-browser-def-prof">
                            {{
                              t('openclaw.configBrowserDefaultProfileLabel')
                            }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configBrowserDefaultProfileHelp') }}
                          </p>
                        </div>
                        <UiInput
                          id="openclaw-browser-def-prof"
                          v-model="cfgBrowserDefaultProfile"
                          class="h-9 w-full max-w-md shrink-0 font-mono text-sm"
                        />
                      </div>

                      <div class="flex flex-col gap-1">
                        <UiLabel class="text-sm font-medium" for="openclaw-browser-exe">
                          {{ t('openclaw.configBrowserExecutablePathLabel') }}
                        </UiLabel>
                        <p class="mt-0.5 text-muted-foreground text-xs">
                          {{ t('openclaw.configBrowserExecutablePathHelp') }}
                        </p>
                        <UiInput id="openclaw-browser-exe" v-model="cfgBrowserExecutablePath" class="mt-1 h-9 max-w-xl font-mono text-sm" />
                      </div>
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium" for="openclaw-browser-color">
                            {{ t('openclaw.configBrowserColorLabel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configBrowserColorHelp') }}
                          </p>
                        </div>
                        <UiInput id="openclaw-browser-color" v-model="cfgBrowserColor" class="h-9 w-full max-w-xs shrink-0 font-mono text-sm" />
                      </div>
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium" for="openclaw-browser-relay-host">
                            {{
                              t('openclaw.configBrowserRelayBindHostLabel')
                            }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configBrowserRelayBindHostHelp') }}
                          </p>
                        </div>
                        <UiInput
                          id="openclaw-browser-relay-host"
                          v-model="cfgBrowserRelayBindHost"
                          class="h-9 w-full max-w-xs shrink-0 font-mono text-sm"
                        />
                      </div>

                      <UiSeparator />

                      <div class="space-y-2">
                        <h3 class="font-medium text-sm">
                          {{ t('openclaw.configBrowserExtraArgsLabel') }}
                        </h3>
                        <p class="text-muted-foreground text-xs">
                          {{ t('openclaw.configBrowserExtraArgsHelp') }}
                        </p>
                        <UiTextarea
                          v-model="browserExtraArgsJsonLocal"
                          class="min-h-[88px] font-mono text-xs"
                          :placeholder="t('openclaw.configBrowserExtraArgsPlaceholder')"
                          @blur="(e: FocusEvent) => applyBrowserExtraArgsFromJson((e.target as HTMLTextAreaElement).value)"
                        />
                      </div>
                      <div class="space-y-2">
                        <h3 class="font-medium text-sm">
                          {{ t('openclaw.configBrowserProfilesLabel') }}
                        </h3>
                        <p class="text-muted-foreground text-xs">
                          {{ t('openclaw.configBrowserProfilesHelp') }}
                        </p>
                        <UiTextarea
                          v-model="browserProfilesJsonLocal"
                          class="min-h-[120px] font-mono text-xs"
                          :placeholder="t('openclaw.configBrowserProfilesPlaceholder')"
                          @blur="(e: FocusEvent) => applyBrowserProfilesFromJson((e.target as HTMLTextAreaElement).value)"
                        />
                      </div>

                      <UiSeparator />

                      <h3 class="font-medium text-sm">
                        {{ t('openclaw.configBrowserSnapshotDefaultsHeading') }}
                      </h3>
                      <p class="text-muted-foreground text-xs">
                        {{ t('openclaw.configBrowserSnapshotDefaultsHelp') }}
                      </p>
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configBrowserSnapshotModeLabel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configBrowserSnapshotModeHelp') }}
                          </p>
                        </div>
                        <UiSelect v-model="cfgBrowserSnapshotModeSelect" class="w-full max-w-md shrink-0">
                          <UiSelectTrigger class="h-9">
                            <UiSelectValue />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem :value="BROWSER_SNAPSHOT_MODE_OMIT">
                              {{ t('openclaw.configBrowserSnapshotModeDefault') }}
                            </UiSelectItem>
                            <UiSelectItem value="efficient">
                              efficient
                            </UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>

                      <UiSeparator />

                      <h3 class="font-medium text-sm">
                        {{ t('openclaw.configBrowserSsrfPolicyHeading') }}
                      </h3>
                      <p class="text-muted-foreground text-xs">
                        {{ t('openclaw.configBrowserSsrfPolicyHelp') }}
                      </p>
                      <div class="flex items-center justify-between gap-4 py-1">
                        <div class="min-w-0">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configBrowserSsrfAllowPrivateNetworkLabel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configBrowserSsrfAllowPrivateNetworkHelp') }}
                          </p>
                        </div>
                        <UiSwitch v-model:checked="cfgBrowserSsrfAllowPrivateNetwork" />
                      </div>
                      <div class="flex items-center justify-between gap-4 py-1">
                        <div class="min-w-0">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configBrowserSsrfDangerouslyAllowPrivateNetworkLabel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configBrowserSsrfDangerouslyAllowPrivateNetworkHelp') }}
                          </p>
                        </div>
                        <UiSwitch v-model:checked="cfgBrowserSsrfDangerouslyAllowPrivateNetwork" />
                      </div>
                      <div class="space-y-2">
                        <h4 class="font-medium text-sm">
                          {{ t('openclaw.configBrowserSsrfAllowedHostnamesLabel') }}
                        </h4>
                        <p class="text-muted-foreground text-xs">
                          {{ t('openclaw.configBrowserSsrfAllowedHostnamesHelp') }}
                        </p>
                        <UiTextarea
                          v-model="browserSsrfAllowedHostnamesJsonLocal"
                          class="min-h-[88px] font-mono text-xs"
                          :placeholder="t('openclaw.configBrowserSsrfAllowedHostnamesPlaceholder')"
                          @blur="
                            (e: FocusEvent) => applyBrowserSsrfAllowedHostnamesFromJson((e.target as HTMLTextAreaElement).value)
                          "
                        />
                      </div>
                      <div class="space-y-2">
                        <h4 class="font-medium text-sm">
                          {{ t('openclaw.configBrowserSsrfHostnameAllowlistLabel') }}
                        </h4>
                        <p class="text-muted-foreground text-xs">
                          {{ t('openclaw.configBrowserSsrfHostnameAllowlistHelp') }}
                        </p>
                        <UiTextarea
                          v-model="browserSsrfHostnameAllowlistJsonLocal"
                          class="min-h-[88px] font-mono text-xs"
                          :placeholder="t('openclaw.configBrowserSsrfHostnameAllowlistPlaceholder')"
                          @blur="
                            (e: FocusEvent) => applyBrowserSsrfHostnameAllowlistFromJson((e.target as HTMLTextAreaElement).value)
                          "
                        />
                      </div>
                    </section>

                    <div class="flex flex-wrap items-center gap-2 pt-2">
                      <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                        {{ t('openclaw.configRaw') }}
                      </UiButton>
                    </div>
                  </div>
                </template>
                <template
                  v-else-if="
                    settingsSubPage === 'infrastructure'
                      && formMode === 'form'
                      && activeSection === 'nodeHost'
                      && draftConfig
                  "
                >
                  <div class="config-nodehost-form space-y-8">
                    <p class="mb-6 text-sm leading-relaxed text-muted-foreground">
                      {{ t('openclaw.configNodeHostIntro') }}
                    </p>

                    <section class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="space-y-1">
                        <h3 class="font-medium text-sm">
                          {{ t('openclaw.configNodeHostBrowserProxyHeading') }}
                        </h3>
                        <p class="text-muted-foreground text-xs leading-relaxed">
                          {{ t('openclaw.configNodeHostBrowserProxyHelp') }}
                        </p>
                      </div>

                      <UiSeparator />

                      <div class="flex items-center justify-between gap-4 py-1">
                        <div class="min-w-0">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configNodeHostBrowserProxyEnabledLabel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configNodeHostBrowserProxyEnabledHelp') }}
                          </p>
                        </div>
                        <UiSwitch v-model:checked="cfgNodeHostBrowserProxyEnabled" />
                      </div>

                      <UiSeparator />

                      <div class="space-y-2">
                        <h3 class="font-medium text-sm">
                          {{ t('openclaw.configNodeHostBrowserProxyAllowProfilesLabel') }}
                        </h3>
                        <p class="text-muted-foreground text-xs">
                          {{ t('openclaw.configNodeHostBrowserProxyAllowProfilesHelp') }}
                        </p>
                        <UiTextarea
                          v-model="nodeHostAllowProfilesJsonLocal"
                          class="min-h-[120px] font-mono text-xs"
                          :placeholder="t('openclaw.configNodeHostBrowserProxyAllowProfilesPlaceholder')"
                          @blur="(e: FocusEvent) => applyNodeHostAllowProfilesFromJson((e.target as HTMLTextAreaElement).value)"
                        />
                      </div>
                    </section>

                    <div class="flex flex-wrap items-center gap-2 pt-2">
                      <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                        {{ t('openclaw.configRaw') }}
                      </UiButton>
                    </div>
                  </div>
                </template>
                <template
                  v-else-if="
                    settingsSubPage === 'infrastructure'
                      && formMode === 'form'
                      && activeSection === 'canvasHost'
                      && draftConfig
                  "
                >
                  <div class="config-canvashost-form space-y-8">
                    <p class="mb-6 text-sm leading-relaxed text-muted-foreground">
                      {{ t('openclaw.configCanvasHostIntro') }}
                    </p>

                    <section class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="flex items-center justify-between gap-4 py-1">
                        <div class="min-w-0">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configCanvasHostEnabledLabel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configCanvasHostEnabledHelp') }}
                          </p>
                        </div>
                        <UiSwitch v-model:checked="cfgCanvasHostEnabled" />
                      </div>

                      <UiSeparator />

                      <div class="flex flex-col gap-1">
                        <UiLabel class="text-sm font-medium" for="openclaw-canvas-root">
                          {{
                            t('openclaw.configCanvasHostRootLabel')
                          }}
                        </UiLabel>
                        <p class="mt-0.5 text-muted-foreground text-xs">
                          {{ t('openclaw.configCanvasHostRootHelp') }}
                        </p>
                        <UiInput
                          id="openclaw-canvas-root"
                          v-model="cfgCanvasHostRoot"
                          class="mt-1 h-9 max-w-xl font-mono text-sm"
                        />
                      </div>

                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium" for="openclaw-canvas-port">
                            {{
                              t('openclaw.configCanvasHostPortLabel')
                            }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configCanvasHostPortHelp') }}
                          </p>
                        </div>
                        <UiInput
                          id="openclaw-canvas-port"
                          v-model="cfgCanvasHostPort"
                          class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                          inputmode="numeric"
                        />
                      </div>

                      <UiSeparator />

                      <div class="flex items-center justify-between gap-4 py-1">
                        <div class="min-w-0">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configCanvasHostLiveReloadLabel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configCanvasHostLiveReloadHelp') }}
                          </p>
                        </div>
                        <UiSwitch v-model:checked="cfgCanvasHostLiveReload" />
                      </div>
                    </section>

                    <div class="flex flex-wrap items-center gap-2 pt-2">
                      <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                        {{ t('openclaw.configRaw') }}
                      </UiButton>
                    </div>
                  </div>
                </template>
                <template
                  v-else-if="
                    settingsSubPage === 'infrastructure'
                      && formMode === 'form'
                      && activeSection === 'discovery'
                      && draftConfig
                  "
                >
                  <div class="config-discovery-form space-y-8">
                    <p class="mb-6 text-sm leading-relaxed text-muted-foreground">
                      {{ t('openclaw.configDiscoveryIntro') }}
                    </p>

                    <section class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="space-y-1">
                        <h3 class="font-medium text-sm">
                          {{ t('openclaw.configDiscoveryMdnsHeading') }}
                        </h3>
                        <p class="text-muted-foreground text-xs leading-relaxed">
                          {{ t('openclaw.configDiscoveryMdnsGroupHelp') }}
                        </p>
                      </div>

                      <UiSeparator />

                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium" for="openclaw-discovery-mdns-mode">
                            {{
                              t('openclaw.configDiscoveryMdnsModeLabel')
                            }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configDiscoveryMdnsModeHelp') }}
                          </p>
                        </div>
                        <UiSelect v-model="cfgDiscoveryMdnsMode" class="w-full max-w-[220px] shrink-0">
                          <UiSelectTrigger id="openclaw-discovery-mdns-mode" class="h-9">
                            <UiSelectValue />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem v-for="mode in DISCOVERY_MDNS_MODES" :key="mode" :value="mode">
                              {{
                                mode
                              }}
                            </UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>
                    </section>

                    <section class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="space-y-1">
                        <h3 class="font-medium text-sm">
                          {{ t('openclaw.configDiscoveryWideAreaHeading') }}
                        </h3>
                        <p class="text-muted-foreground text-xs leading-relaxed">
                          {{ t('openclaw.configDiscoveryWideAreaGroupHelp') }}
                        </p>
                      </div>

                      <UiSeparator />

                      <div class="flex items-center justify-between gap-4 py-1">
                        <div class="min-w-0">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configDiscoveryWideAreaEnabledLabel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configDiscoveryWideAreaEnabledHelp') }}
                          </p>
                        </div>
                        <UiSwitch v-model:checked="cfgDiscoveryWideAreaEnabled" />
                      </div>

                      <UiSeparator />

                      <div class="flex flex-col gap-1">
                        <UiLabel class="text-sm font-medium" for="openclaw-discovery-wa-domain">
                          {{
                            t('openclaw.configDiscoveryWideAreaDomainLabel')
                          }}
                        </UiLabel>
                        <p class="mt-0.5 text-muted-foreground text-xs">
                          {{ t('openclaw.configDiscoveryWideAreaDomainHelp') }}
                        </p>
                        <UiInput
                          id="openclaw-discovery-wa-domain"
                          v-model="cfgDiscoveryWideAreaDomain"
                          class="mt-1 h-9 max-w-xl font-mono text-sm"
                        />
                      </div>
                    </section>

                    <div class="flex flex-wrap items-center gap-2 pt-2">
                      <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                        {{ t('openclaw.configRaw') }}
                      </UiButton>
                    </div>
                  </div>
                </template>
                <template
                  v-else-if="
                    settingsSubPage === 'infrastructure'
                      && formMode === 'form'
                      && activeSection === 'media'
                      && draftConfig
                  "
                >
                  <div class="config-media-form space-y-8">
                    <p class="mb-6 text-sm leading-relaxed text-muted-foreground">
                      {{ t('openclaw.configMediaIntro') }}
                    </p>

                    <section class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="flex items-center justify-between gap-4 py-1">
                        <div class="min-w-0">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configMediaPreserveFilenamesLabel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configMediaPreserveFilenamesHelp') }}
                          </p>
                        </div>
                        <UiSwitch v-model:checked="cfgMediaPreserveFilenames" />
                      </div>

                      <UiSeparator />

                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium" for="openclaw-media-ttl">
                            {{
                              t('openclaw.configMediaTtlHoursLabel')
                            }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs">
                            {{ t('openclaw.configMediaTtlHoursHelp') }}
                          </p>
                        </div>
                        <UiInput
                          id="openclaw-media-ttl"
                          v-model="cfgMediaTtlHours"
                          class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                          inputmode="numeric"
                        />
                      </div>
                    </section>

                    <div class="flex flex-wrap items-center gap-2 pt-2">
                      <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                        {{ t('openclaw.configRaw') }}
                      </UiButton>
                    </div>
                  </div>
                </template>
                <template
                  v-else-if="
                    settingsSubPage === 'aiAgents'
                      && formMode === 'form'
                      && activeSection === 'agents'
                      && draftConfig
                  "
                >
                  <div class="config-form--modern config-agents-form space-y-5">
                    <header v-if="!showConfigFormHero" class="config-section-hero mb-8">
                      <h2 class="text-lg font-semibold tracking-tight">
                        {{ t('openclaw.configSchemaSection.agents') }}
                      </h2>
                      <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                        {{ t('openclaw.configAgentsSectionMeta') }}
                      </p>
                    </header>

                    <!-- 与 OpenClaw Control UI `config-section-card` + schema 根说明一致 -->
                    <section
                      class="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                    >
                      <div
                        class="flex items-center gap-3.5 border-b border-border bg-muted/40 px-5 py-[18px] dark:bg-muted/25"
                      >
                        <div
                          class="flex size-[30px] shrink-0 items-center justify-center rounded-md bg-primary/15 p-1.5 text-primary dark:bg-primary/20"
                        >
                          <Brain class="size-full" stroke-width="2" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <h3 class="m-0 truncate text-sm font-semibold tracking-tight text-foreground">
                            {{ t('openclaw.configSchemaSection.agents') }}
                          </h3>
                          <p class="mt-0.5 text-xs leading-snug text-muted-foreground">
                            {{ t('openclaw.configAgentsSectionMeta') }}
                          </p>
                        </div>
                      </div>
                      <div class="min-w-0 px-[18px] py-4">
                        <p class="text-sm leading-relaxed text-muted-foreground">
                          {{ t('openclaw.configAgentsIntro') }}
                        </p>
                      </div>
                    </section>

                    <!-- Agent Defaults：对应官方 `<details open>` + advanced 标签 -->
                    <UiCollapsible
                      :default-open="true"
                      class="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                    >
                      <div class="border-b border-border bg-muted/40 dark:bg-muted/25">
                        <UiCollapsibleTrigger
                          class="flex w-full items-center justify-between gap-3 px-5 py-[18px] text-left hover:bg-muted/50"
                        >
                          <div class="flex min-w-0 flex-wrap items-baseline gap-2">
                            <span class="text-sm font-semibold tracking-tight">{{
                              t('openclaw.configAgentsDefaultsHeading')
                            }}</span>
                            <span
                              class="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                            >{{ t('openclaw.configAgentsAdvancedBadge') }}</span>
                          </div>
                          <ChevronDown
                            class="size-4 shrink-0 opacity-50 transition-transform group-data-[state=open]:rotate-180"
                          />
                        </UiCollapsibleTrigger>
                      </div>
                      <UiCollapsibleContent class="min-w-0 px-[18px] py-4">
                        <p class="mb-4 text-muted-foreground text-xs leading-relaxed">
                          {{ t('openclaw.configAgentsDefaultsGroupHelp') }}
                        </p>
                        <UiSeparator class="mb-4" />
                        <div class="space-y-2">
                          <UiLabel class="text-sm font-medium" for="openclaw-agents-defaults-json">
                            {{
                              t('openclaw.configAgentsDefaultsJsonLabel')
                            }}
                          </UiLabel>
                          <p class="text-muted-foreground text-xs">
                            {{ t('openclaw.configAgentsDefaultsJsonHelp') }}
                          </p>
                          <UiTextarea
                            id="openclaw-agents-defaults-json"
                            v-model="agentsDefaultsJsonLocal"
                            class="min-h-[220px] font-mono text-xs"
                            :placeholder="t('openclaw.configAgentsDefaultsPlaceholder')"
                            @blur="(e: FocusEvent) => applyAgentsDefaultsFromJson((e.target as HTMLTextAreaElement).value)"
                          />
                        </div>
                      </UiCollapsibleContent>
                    </UiCollapsible>

                    <section
                      class="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                    >
                      <div
                        class="flex items-center gap-3.5 border-b border-border bg-muted/40 px-5 py-[18px] dark:bg-muted/25"
                      >
                        <div
                          class="flex size-[30px] shrink-0 items-center justify-center rounded-md bg-primary/15 p-1.5 text-primary dark:bg-primary/20"
                        >
                          <Workflow class="size-full" stroke-width="2" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <h3 class="m-0 truncate text-sm font-semibold tracking-tight text-foreground">
                            {{ t('openclaw.configAgentsListHeading') }}
                          </h3>
                        </div>
                      </div>
                      <div class="min-w-0 px-[18px] py-4">
                        <p class="mb-4 text-muted-foreground text-xs leading-relaxed">
                          {{ t('openclaw.configAgentsListGroupHelp') }}
                        </p>
                        <UiSeparator class="mb-4" />
                        <div class="space-y-2">
                          <UiLabel class="text-sm font-medium" for="openclaw-agents-list-json">
                            {{
                              t('openclaw.configAgentsListJsonLabel')
                            }}
                          </UiLabel>
                          <p class="text-muted-foreground text-xs">
                            {{ t('openclaw.configAgentsListJsonHelp') }}
                          </p>
                          <UiTextarea
                            id="openclaw-agents-list-json"
                            v-model="agentsListJsonLocal"
                            class="min-h-[220px] font-mono text-xs"
                            :placeholder="t('openclaw.configAgentsListPlaceholder')"
                            @blur="(e: FocusEvent) => applyAgentsListFromJson((e.target as HTMLTextAreaElement).value)"
                          />
                        </div>
                      </div>
                    </section>

                    <div class="flex flex-wrap items-center gap-2 pt-2">
                      <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                        {{ t('openclaw.configRaw') }}
                      </UiButton>
                    </div>
                  </div>
                </template>
                <template
                  v-else-if="
                    settingsSubPage === 'aiAgents'
                      && formMode === 'form'
                      && activeSection === 'models'
                      && draftConfig
                  "
                >
                  <div class="config-form--modern config-models-form space-y-5">
                    <header v-if="!showConfigFormHero" class="config-section-hero mb-8">
                      <h2 class="text-lg font-semibold tracking-tight">
                        {{ t('openclaw.configSchemaSection.models') }}
                      </h2>
                      <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                        {{ t('openclaw.configModelsSectionMeta') }}
                      </p>
                    </header>

                    <section
                      class="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                    >
                      <div
                        class="flex items-center gap-3.5 border-b border-border bg-muted/40 px-5 py-[18px] dark:bg-muted/25"
                      >
                        <div
                          class="flex size-[30px] shrink-0 items-center justify-center rounded-md bg-primary/15 p-1.5 text-primary dark:bg-primary/20"
                        >
                          <Layers class="size-full" stroke-width="2" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <h3 class="m-0 truncate text-sm font-semibold tracking-tight text-foreground">
                            {{ t('openclaw.configSchemaSection.models') }}
                          </h3>
                          <p class="mt-0.5 text-xs leading-snug text-muted-foreground">
                            {{ t('openclaw.configModelsSectionMeta') }}
                          </p>
                        </div>
                      </div>
                      <div class="min-w-0 px-[18px] py-4">
                        <p class="text-sm leading-relaxed text-muted-foreground">
                          {{ t('openclaw.configModelsIntro') }}
                        </p>
                      </div>
                    </section>

                    <section class="space-y-1 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configModelsModeLabel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                            {{ t('openclaw.configModelsModeHelp') }}
                          </p>
                        </div>
                        <UiSelect v-model="modelsModeSelect" class="w-full max-w-[220px] shrink-0">
                          <UiSelectTrigger class="h-9">
                            <UiSelectValue :placeholder="t('openclaw.configModelsModeAuto')" />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem :value="MODEL_MODE_AUTO">
                              {{ t('openclaw.configModelsModeAuto') }}
                            </UiSelectItem>
                            <UiSelectItem value="merge">
                              {{ t('openclaw.configModelsModeMerge') }}
                            </UiSelectItem>
                            <UiSelectItem value="replace">
                              {{ t('openclaw.configModelsModeReplace') }}
                            </UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>
                    </section>

                    <UiCollapsible
                      :default-open="true"
                      class="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                    >
                      <div class="border-b border-border bg-muted/40 dark:bg-muted/25">
                        <UiCollapsibleTrigger
                          class="flex w-full items-center justify-between gap-3 px-5 py-[18px] text-left hover:bg-muted/50"
                        >
                          <span class="text-sm font-semibold tracking-tight">{{
                            t('openclaw.configModelsProvidersHeading')
                          }}</span>
                          <ChevronDown
                            class="size-4 shrink-0 opacity-50 transition-transform group-data-[state=open]:rotate-180"
                          />
                        </UiCollapsibleTrigger>
                      </div>
                      <UiCollapsibleContent class="min-w-0 px-[18px] py-4">
                        <p class="mb-4 text-muted-foreground text-xs leading-relaxed">
                          {{ t('openclaw.configModelsProvidersGroupHelp') }}
                        </p>
                        <UiSeparator class="mb-4" />
                        <div class="space-y-2">
                          <UiLabel class="text-sm font-medium" for="openclaw-models-providers-json">
                            {{
                              t('openclaw.configModelsProvidersJsonLabel')
                            }}
                          </UiLabel>
                          <p class="text-muted-foreground text-xs">
                            {{ t('openclaw.configModelsProvidersJsonHelp') }}
                          </p>
                          <UiTextarea
                            id="openclaw-models-providers-json"
                            v-model="modelsProvidersJsonLocal"
                            class="min-h-[220px] font-mono text-xs"
                            :placeholder="t('openclaw.configModelsProvidersPlaceholder')"
                            @blur="(e: FocusEvent) => applyModelsProvidersFromJson((e.target as HTMLTextAreaElement).value)"
                          />
                        </div>
                      </UiCollapsibleContent>
                    </UiCollapsible>

                    <UiCollapsible
                      :default-open="true"
                      class="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                    >
                      <div class="border-b border-border bg-muted/40 dark:bg-muted/25">
                        <UiCollapsibleTrigger
                          class="flex w-full items-center justify-between gap-3 px-5 py-[18px] text-left hover:bg-muted/50"
                        >
                          <span class="text-sm font-semibold tracking-tight">{{
                            t('openclaw.configModelsBedrockHeading')
                          }}</span>
                          <ChevronDown
                            class="size-4 shrink-0 opacity-50 transition-transform group-data-[state=open]:rotate-180"
                          />
                        </UiCollapsibleTrigger>
                      </div>
                      <UiCollapsibleContent class="min-w-0 space-y-4 px-[18px] py-4">
                        <p class="text-muted-foreground text-xs leading-relaxed">
                          {{ t('openclaw.configModelsBedrockGroupHelp') }}
                        </p>
                        <UiSeparator />
                        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium">
                              {{ t('openclaw.configModelsBedrockEnabledLabel') }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configModelsBedrockEnabledHelp') }}
                            </p>
                          </div>
                          <UiSwitch v-model:checked="modelsBedrockEnabled" />
                        </div>
                        <UiSeparator />
                        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium" for="openclaw-models-bedrock-region">
                              {{
                                t('openclaw.configModelsBedrockRegionLabel')
                              }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configModelsBedrockRegionHelp') }}
                            </p>
                          </div>
                          <UiInput
                            id="openclaw-models-bedrock-region"
                            v-model="modelsBedrockRegion"
                            class="h-9 w-full max-w-[280px] shrink-0 font-mono text-sm"
                            :placeholder="t('openclaw.configModelsBedrockRegionPlaceholder')"
                          />
                        </div>
                        <div class="space-y-2">
                          <UiLabel class="text-sm font-medium" for="openclaw-models-bedrock-filter-json">
                            {{
                              t('openclaw.configModelsBedrockProviderFilterLabel')
                            }}
                          </UiLabel>
                          <p class="text-muted-foreground text-xs">
                            {{ t('openclaw.configModelsBedrockProviderFilterHelp') }}
                          </p>
                          <UiTextarea
                            id="openclaw-models-bedrock-filter-json"
                            v-model="modelsBedrockProviderFilterJsonLocal"
                            class="min-h-[72px] font-mono text-xs"
                            :placeholder="t('openclaw.configModelsBedrockProviderFilterPlaceholder')"
                            @blur="
                              (e: FocusEvent) =>
                                applyModelsBedrockProviderFilterFromJson((e.target as HTMLTextAreaElement).value)
                            "
                          />
                        </div>
                        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium" for="openclaw-models-bedrock-refresh">
                              {{
                                t('openclaw.configModelsBedrockRefreshLabel')
                              }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configModelsBedrockRefreshHelp') }}
                            </p>
                          </div>
                          <UiInput
                            id="openclaw-models-bedrock-refresh"
                            v-model="modelsBedrockRefreshStr"
                            class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                            inputmode="numeric"
                          />
                        </div>
                        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium" for="openclaw-models-bedrock-ctx">
                              {{
                                t('openclaw.configModelsBedrockCtxLabel')
                              }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configModelsBedrockCtxHelp') }}
                            </p>
                          </div>
                          <UiInput
                            id="openclaw-models-bedrock-ctx"
                            v-model="modelsBedrockCtxStr"
                            class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                            inputmode="numeric"
                          />
                        </div>
                        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium" for="openclaw-models-bedrock-max">
                              {{
                                t('openclaw.configModelsBedrockMaxTokensLabel')
                              }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configModelsBedrockMaxTokensHelp') }}
                            </p>
                          </div>
                          <UiInput
                            id="openclaw-models-bedrock-max"
                            v-model="modelsBedrockMaxTokensStr"
                            class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                            inputmode="numeric"
                          />
                        </div>
                      </UiCollapsibleContent>
                    </UiCollapsible>

                    <div class="flex flex-wrap items-center gap-2 pt-2">
                      <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                        {{ t('openclaw.configRaw') }}
                      </UiButton>
                    </div>
                  </div>
                </template>
                <template
                  v-else-if="
                    settingsSubPage === 'aiAgents'
                      && formMode === 'form'
                      && activeSection === 'skills'
                      && draftConfig
                  "
                >
                  <div class="config-form--modern config-skills-form space-y-5">
                    <header v-if="!showConfigFormHero" class="config-section-hero mb-8">
                      <h2 class="text-lg font-semibold tracking-tight">
                        {{ t('openclaw.configSchemaSection.skills') }}
                      </h2>
                      <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                        {{ t('openclaw.configSkillsSectionMeta') }}
                      </p>
                    </header>

                    <section
                      class="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                    >
                      <div
                        class="flex items-center gap-3.5 border-b border-border bg-muted/40 px-5 py-[18px] dark:bg-muted/25"
                      >
                        <div
                          class="flex size-[30px] shrink-0 items-center justify-center rounded-md bg-primary/15 p-1.5 text-primary dark:bg-primary/20"
                        >
                          <Zap class="size-full" stroke-width="2" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <h3 class="m-0 truncate text-sm font-semibold tracking-tight text-foreground">
                            {{ t('openclaw.configSchemaSection.skills') }}
                          </h3>
                          <p class="mt-0.5 text-xs leading-snug text-muted-foreground">
                            {{ t('openclaw.configSkillsSectionMeta') }}
                          </p>
                        </div>
                      </div>
                      <div class="min-w-0 px-[18px] py-4">
                        <p class="text-sm leading-relaxed text-muted-foreground">
                          {{ t('openclaw.configSkillsIntro') }}
                        </p>
                      </div>
                    </section>

                    <section class="space-y-2">
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div class="flex items-center gap-2">
                          <span class="font-medium text-sm">{{ t('openclaw.configSkillsAllowBundledHeading') }}</span>
                          <span class="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium">
                            {{ t('openclaw.configSkillsItemsCount', { n: skillsAllowBundledRows.filter((x) => x.trim()).length }) }}
                          </span>
                        </div>
                        <UiButton type="button" variant="outline" size="sm" class="shrink-0" @click="addSkillsAllowBundledRow">
                          <Plus class="mr-1 size-3.5" />
                          {{ t('openclaw.configSkillsAdd') }}
                        </UiButton>
                      </div>
                      <p v-if="skillsAllowBundledRows.length === 0" class="text-muted-foreground text-sm">
                        {{ t('openclaw.configSkillsAllowBundledEmpty') }}
                      </p>
                      <div v-else class="space-y-2">
                        <div
                          v-for="(row, idx) in skillsAllowBundledRows"
                          :key="`skills-allow-${idx}`"
                          class="grid grid-cols-1 items-center gap-2 md:grid-cols-[1fr_auto]"
                        >
                          <UiInput
                            class="h-8 font-mono text-xs"
                            :model-value="row"
                            :placeholder="t('openclaw.configSkillsAllowBundledPlaceholder')"
                            @update:model-value="(v: string | number) => updateSkillsAllowBundledRow(idx, String(v ?? ''))"
                          />
                          <UiButton type="button" size="icon" variant="ghost" class="size-8" @click="removeSkillsAllowBundledRow(idx)">
                            <Minus class="size-3.5" />
                          </UiButton>
                        </div>
                      </div>
                    </section>

                    <section class="space-y-2">
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span class="font-medium text-sm">{{ t('openclaw.configSkillsEntriesHeading') }}</span>
                        <UiButton type="button" variant="outline" size="sm" class="shrink-0" @click="addSkillsEntry">
                          <Plus class="mr-1 size-3.5" />
                          {{ t('openclaw.configSkillsAddEntry') }}
                        </UiButton>
                      </div>
                      <p v-if="skillsEntriesKeys.length === 0" class="text-muted-foreground text-sm">
                        {{ t('openclaw.configSkillsNoEntries') }}
                      </p>
                      <div v-else class="space-y-4">
                        <div
                          v-for="ekey in skillsEntriesKeys"
                          :key="`skills-entry-${ekey}`"
                          class="space-y-2 rounded-md border border-border bg-background p-3"
                        >
                          <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-2">
                            <div class="min-w-0 flex-1 space-y-1">
                              <UiLabel class="text-xs font-medium">
                                {{ t('openclaw.configSkillsEntryKey') }}
                              </UiLabel>
                              <UiInput
                                :key="`skills-key-${ekey}`"
                                class="h-8 font-mono text-xs"
                                :default-value="ekey"
                                @blur="(ev: FocusEvent) => onSkillsEntryKeyChange(ekey, (ev.target as HTMLInputElement).value)"
                              />
                            </div>
                            <UiButton
                              type="button"
                              size="icon"
                              variant="ghost"
                              class="size-8 shrink-0 self-end sm:self-auto"
                              @click="removeSkillsEntry(ekey)"
                            >
                              <Minus class="size-3.5" />
                            </UiButton>
                          </div>
                          <div class="space-y-1">
                            <UiLabel class="text-xs font-medium">
                              {{ t('openclaw.configSkillsEntryJson') }}
                            </UiLabel>
                            <p class="text-muted-foreground text-xs">
                              {{ t('openclaw.configSkillsEntryJsonHelp') }}
                            </p>
                            <UiTextarea
                              :key="ekey"
                              class="min-h-[100px] font-mono text-xs"
                              :default-value="skillsEntryJsonFor(ekey)"
                              :placeholder="t('openclaw.configSkillsEntryJsonPlaceholder')"
                              @blur="(ev: FocusEvent) => applySkillsEntryJson(ekey, (ev.target as HTMLTextAreaElement).value)"
                            />
                          </div>
                        </div>
                      </div>
                    </section>

                    <UiCollapsible
                      :default-open="true"
                      class="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                    >
                      <div class="border-b border-border bg-muted/40 dark:bg-muted/25">
                        <UiCollapsibleTrigger
                          class="flex w-full items-center justify-between gap-3 px-5 py-[18px] text-left hover:bg-muted/50"
                        >
                          <span class="text-sm font-semibold tracking-tight">{{ t('openclaw.configSkillsLoadHeading') }}</span>
                          <ChevronDown
                            class="size-4 shrink-0 opacity-50 transition-transform group-data-[state=open]:rotate-180"
                          />
                        </UiCollapsibleTrigger>
                      </div>
                      <UiCollapsibleContent class="min-w-0 space-y-4 px-[18px] py-4">
                        <div class="space-y-2">
                          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div class="flex items-center gap-2">
                              <span class="text-sm font-medium">{{ t('openclaw.configSkillsExtraDirsHeading') }}</span>
                              <span class="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium">
                                {{ t('openclaw.configSkillsItemsCount', { n: skillsExtraDirsRows.filter((x) => x.trim()).length }) }}
                              </span>
                            </div>
                            <UiButton type="button" variant="outline" size="sm" class="shrink-0" @click="addSkillsExtraDirRow">
                              <Plus class="mr-1 size-3.5" />
                              {{ t('openclaw.configSkillsAdd') }}
                            </UiButton>
                          </div>
                          <p v-if="skillsExtraDirsRows.length === 0" class="text-muted-foreground text-sm">
                            {{ t('openclaw.configSkillsExtraDirsEmpty') }}
                          </p>
                          <div v-else class="space-y-2">
                            <div
                              v-for="(row, idx) in skillsExtraDirsRows"
                              :key="`skills-extra-${idx}`"
                              class="grid grid-cols-1 items-center gap-2 md:grid-cols-[1fr_auto]"
                            >
                              <UiInput
                                class="h-8 font-mono text-xs"
                                :model-value="row"
                                :placeholder="t('openclaw.configSkillsExtraDirsPlaceholder')"
                                @update:model-value="(v: string | number) => updateSkillsExtraDirRow(idx, String(v ?? ''))"
                              />
                              <UiButton type="button" size="icon" variant="ghost" class="size-8" @click="removeSkillsExtraDirRow(idx)">
                                <Minus class="size-3.5" />
                              </UiButton>
                            </div>
                          </div>
                        </div>
                        <UiSeparator />
                        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium">
                              {{ t('openclaw.configSkillsLoadWatchLabel') }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configSkillsLoadWatchHelp') }}
                            </p>
                          </div>
                          <UiSwitch v-model:checked="skillsLoadWatch" />
                        </div>
                        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium" for="openclaw-skills-watch-debounce">
                              {{
                                t('openclaw.configSkillsLoadDebounceLabel')
                              }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configSkillsLoadDebounceHelp') }}
                            </p>
                          </div>
                          <UiInput
                            id="openclaw-skills-watch-debounce"
                            v-model="skillsLoadWatchDebounceStr"
                            class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                            inputmode="numeric"
                          />
                        </div>
                      </UiCollapsibleContent>
                    </UiCollapsible>

                    <UiCollapsible
                      :default-open="true"
                      class="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                    >
                      <div class="border-b border-border bg-muted/40 dark:bg-muted/25">
                        <UiCollapsibleTrigger
                          class="flex w-full items-center justify-between gap-3 px-5 py-[18px] text-left hover:bg-muted/50"
                        >
                          <span class="text-sm font-semibold tracking-tight">{{ t('openclaw.configSkillsInstallHeading') }}</span>
                          <ChevronDown
                            class="size-4 shrink-0 opacity-50 transition-transform group-data-[state=open]:rotate-180"
                          />
                        </UiCollapsibleTrigger>
                      </div>
                      <UiCollapsibleContent class="min-w-0 space-y-4 px-[18px] py-4">
                        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium">
                              {{ t('openclaw.configSkillsInstallPreferBrewLabel') }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configSkillsInstallPreferBrewHelp') }}
                            </p>
                          </div>
                          <UiSwitch v-model:checked="skillsInstallPreferBrew" />
                        </div>
                        <UiSeparator />
                        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium">
                              {{ t('openclaw.configSkillsInstallNodeManagerLabel') }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configSkillsInstallNodeManagerHelp') }}
                            </p>
                          </div>
                          <UiSelect v-model="skillsInstallNodeManagerSelect" class="w-full max-w-[220px] shrink-0">
                            <UiSelectTrigger class="h-9">
                              <UiSelectValue :placeholder="t('openclaw.configSkillsInstallNodeManagerAuto')" />
                            </UiSelectTrigger>
                            <UiSelectContent>
                              <UiSelectItem :value="SKILLS_NODE_MANAGER_AUTO">
                                {{
                                  t('openclaw.configSkillsInstallNodeManagerAuto')
                                }}
                              </UiSelectItem>
                              <UiSelectItem value="npm">
                                npm
                              </UiSelectItem>
                              <UiSelectItem value="pnpm">
                                pnpm
                              </UiSelectItem>
                              <UiSelectItem value="yarn">
                                yarn
                              </UiSelectItem>
                              <UiSelectItem value="bun">
                                bun
                              </UiSelectItem>
                            </UiSelectContent>
                          </UiSelect>
                        </div>
                      </UiCollapsibleContent>
                    </UiCollapsible>

                    <UiCollapsible
                      :default-open="false"
                      class="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                    >
                      <div class="border-b border-border bg-muted/40 dark:bg-muted/25">
                        <UiCollapsibleTrigger
                          class="flex w-full items-center justify-between gap-3 px-5 py-[18px] text-left hover:bg-muted/50"
                        >
                          <span class="text-sm font-semibold tracking-tight">{{ t('openclaw.configSkillsLimitsHeading') }}</span>
                          <ChevronDown
                            class="size-4 shrink-0 opacity-50 transition-transform group-data-[state=open]:rotate-180"
                          />
                        </UiCollapsibleTrigger>
                      </div>
                      <UiCollapsibleContent class="min-w-0 space-y-4 px-[18px] py-4">
                        <p class="text-muted-foreground text-xs leading-relaxed">
                          {{ t('openclaw.configSkillsLimitsIntro') }}
                        </p>
                        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium" for="openclaw-skills-max-cand">
                              {{
                                t('openclaw.configSkillsLimitMaxCandidatesLabel')
                              }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configSkillsLimitMaxCandidatesHelp') }}
                            </p>
                          </div>
                          <UiInput
                            id="openclaw-skills-max-cand"
                            v-model="skillsLimitMaxCandidatesStr"
                            class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                            inputmode="numeric"
                          />
                        </div>
                        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium" for="openclaw-skills-max-loaded">
                              {{
                                t('openclaw.configSkillsLimitMaxLoadedLabel')
                              }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configSkillsLimitMaxLoadedHelp') }}
                            </p>
                          </div>
                          <UiInput
                            id="openclaw-skills-max-loaded"
                            v-model="skillsLimitMaxLoadedStr"
                            class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                            inputmode="numeric"
                          />
                        </div>
                        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium" for="openclaw-skills-max-prompt">
                              {{
                                t('openclaw.configSkillsLimitMaxInPromptLabel')
                              }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configSkillsLimitMaxInPromptHelp') }}
                            </p>
                          </div>
                          <UiInput
                            id="openclaw-skills-max-prompt"
                            v-model="skillsLimitMaxInPromptStr"
                            class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                            inputmode="numeric"
                          />
                        </div>
                        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium" for="openclaw-skills-max-chars">
                              {{
                                t('openclaw.configSkillsLimitMaxPromptCharsLabel')
                              }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configSkillsLimitMaxPromptCharsHelp') }}
                            </p>
                          </div>
                          <UiInput
                            id="openclaw-skills-max-chars"
                            v-model="skillsLimitMaxPromptCharsStr"
                            class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                            inputmode="numeric"
                          />
                        </div>
                        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium" for="openclaw-skills-max-bytes">
                              {{
                                t('openclaw.configSkillsLimitMaxFileBytesLabel')
                              }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configSkillsLimitMaxFileBytesHelp') }}
                            </p>
                          </div>
                          <UiInput
                            id="openclaw-skills-max-bytes"
                            v-model="skillsLimitMaxFileBytesStr"
                            class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                            inputmode="numeric"
                          />
                        </div>
                      </UiCollapsibleContent>
                    </UiCollapsible>

                    <div class="flex flex-wrap items-center gap-2 pt-2">
                      <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                        {{ t('openclaw.configRaw') }}
                      </UiButton>
                    </div>
                  </div>
                </template>
                <template
                  v-else-if="
                    settingsSubPage === 'aiAgents'
                      && formMode === 'form'
                      && activeSection === 'tools'
                      && draftConfig
                  "
                >
                  <div class="config-form--modern config-tools-form space-y-5">
                    <header v-if="!showConfigFormHero" class="config-section-hero mb-8">
                      <h2 class="text-lg font-semibold tracking-tight">
                        {{ t('openclaw.configSchemaSection.tools') }}
                      </h2>
                      <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                        {{ t('openclaw.configToolsSectionMeta') }}
                      </p>
                    </header>

                    <section
                      class="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                    >
                      <div
                        class="flex items-center gap-3.5 border-b border-border bg-muted/40 px-5 py-[18px] dark:bg-muted/25"
                      >
                        <div
                          class="flex size-[30px] shrink-0 items-center justify-center rounded-md bg-primary/15 p-1.5 text-primary dark:bg-primary/20"
                        >
                          <Wrench class="size-full" stroke-width="2" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <h3 class="m-0 truncate text-sm font-semibold tracking-tight text-foreground">
                            {{ t('openclaw.configSchemaSection.tools') }}
                          </h3>
                          <p class="mt-0.5 text-xs leading-snug text-muted-foreground">
                            {{ t('openclaw.configToolsSectionMeta') }}
                          </p>
                        </div>
                      </div>
                      <div class="min-w-0 px-[18px] py-4">
                        <p class="text-sm leading-relaxed text-muted-foreground">
                          {{ t('openclaw.configToolsIntro') }}
                        </p>
                      </div>
                    </section>

                    <UiCollapsible
                      :default-open="true"
                      class="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                    >
                      <div class="border-b border-border bg-muted/40 dark:bg-muted/25">
                        <UiCollapsibleTrigger
                          class="flex w-full items-center justify-between gap-3 px-5 py-[18px] text-left hover:bg-muted/50"
                        >
                          <span class="text-sm font-semibold tracking-tight">{{
                            t('openclaw.configToolsAgentToAgentHeading')
                          }}</span>
                          <ChevronDown
                            class="size-4 shrink-0 opacity-50 transition-transform group-data-[state=open]:rotate-180"
                          />
                        </UiCollapsibleTrigger>
                      </div>
                      <UiCollapsibleContent class="min-w-0 space-y-4 px-[18px] py-4">
                        <p class="text-muted-foreground text-xs leading-relaxed">
                          {{ t('openclaw.configToolsAgentToAgentHelp') }}
                        </p>
                        <UiSeparator />
                        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium">
                              {{ t('openclaw.configToolsAgentToAgentEnabledLabel') }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configToolsAgentToAgentEnabledHelp') }}
                            </p>
                          </div>
                          <UiSwitch v-model:checked="toolsAgentToAgentEnabled" />
                        </div>
                        <UiSeparator />
                        <div class="space-y-2">
                          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div class="flex items-center gap-2">
                              <span class="text-sm font-medium">{{ t('openclaw.configToolsAgentToAgentAllowHeading') }}</span>
                              <span class="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium">
                                {{
                                  t('openclaw.configToolsItemsCount', {
                                    n: toolsAgentToAgentAllowRows.filter((x) => x.trim()).length,
                                  })
                                }}
                              </span>
                            </div>
                            <UiButton type="button" variant="outline" size="sm" class="shrink-0" @click="addToolsAgentToAgentAllowRow">
                              <Plus class="mr-1 size-3.5" />
                              {{ t('openclaw.configToolsAdd') }}
                            </UiButton>
                          </div>
                          <p v-if="toolsAgentToAgentAllowRows.length === 0" class="text-muted-foreground text-sm">
                            {{ t('openclaw.configToolsAgentToAgentAllowEmpty') }}
                          </p>
                          <div v-else class="space-y-2">
                            <div
                              v-for="(row, idx) in toolsAgentToAgentAllowRows"
                              :key="`tools-ata-${idx}`"
                              class="grid grid-cols-1 items-center gap-2 md:grid-cols-[1fr_auto]"
                            >
                              <UiInput
                                class="h-8 font-mono text-xs"
                                :model-value="row"
                                :placeholder="t('openclaw.configToolsAgentIdPlaceholder')"
                                @update:model-value="(v: string | number) => updateToolsAgentToAgentAllowRow(idx, String(v ?? ''))"
                              />
                              <UiButton type="button" size="icon" variant="ghost" class="size-8" @click="removeToolsAgentToAgentAllowRow(idx)">
                                <Minus class="size-3.5" />
                              </UiButton>
                            </div>
                          </div>
                        </div>
                      </UiCollapsibleContent>
                    </UiCollapsible>

                    <section class="space-y-1 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configToolsProfileLabel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                            {{ t('openclaw.configToolsProfileHelp') }}
                          </p>
                        </div>
                        <UiSelect v-model="toolsProfileSelect" class="w-full max-w-[220px] shrink-0">
                          <UiSelectTrigger class="h-9">
                            <UiSelectValue :placeholder="t('openclaw.configToolsProfileAuto')" />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem :value="TOOLS_PROFILE_AUTO">
                              {{ t('openclaw.configToolsProfileAuto') }}
                            </UiSelectItem>
                            <UiSelectItem value="minimal">
                              minimal
                            </UiSelectItem>
                            <UiSelectItem value="coding">
                              coding
                            </UiSelectItem>
                            <UiSelectItem value="messaging">
                              messaging
                            </UiSelectItem>
                            <UiSelectItem value="full">
                              full
                            </UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>
                    </section>

                    <section class="space-y-2">
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div class="flex items-center gap-2">
                          <span class="font-medium text-sm">{{ t('openclaw.configToolsAllowHeading') }}</span>
                          <span class="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium">
                            {{ t('openclaw.configToolsItemsCount', { n: toolsAllowRows.filter((x) => x.trim()).length }) }}
                          </span>
                        </div>
                        <UiButton type="button" variant="outline" size="sm" class="shrink-0" @click="addToolsAllowRow">
                          <Plus class="mr-1 size-3.5" />
                          {{ t('openclaw.configToolsAdd') }}
                        </UiButton>
                      </div>
                      <p class="text-muted-foreground text-xs">
                        {{ t('openclaw.configToolsAllowHelp') }}
                      </p>
                      <p v-if="toolsAllowRows.length === 0" class="text-muted-foreground text-sm">
                        {{ t('openclaw.configToolsListEmpty') }}
                      </p>
                      <div v-else class="space-y-2">
                        <div
                          v-for="(row, idx) in toolsAllowRows"
                          :key="`tools-allow-${idx}`"
                          class="grid grid-cols-1 items-center gap-2 md:grid-cols-[1fr_auto]"
                        >
                          <UiInput
                            class="h-8 font-mono text-xs"
                            :model-value="row"
                            :placeholder="t('openclaw.configToolsToolIdPlaceholder')"
                            @update:model-value="(v: string | number) => updateToolsAllowRow(idx, String(v ?? ''))"
                          />
                          <UiButton type="button" size="icon" variant="ghost" class="size-8" @click="removeToolsAllowRow(idx)">
                            <Minus class="size-3.5" />
                          </UiButton>
                        </div>
                      </div>
                    </section>

                    <section class="space-y-2">
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div class="flex items-center gap-2">
                          <span class="font-medium text-sm">{{ t('openclaw.configToolsAlsoAllowHeading') }}</span>
                          <span class="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium">
                            {{ t('openclaw.configToolsItemsCount', { n: toolsAlsoAllowRows.filter((x) => x.trim()).length }) }}
                          </span>
                        </div>
                        <UiButton type="button" variant="outline" size="sm" class="shrink-0" @click="addToolsAlsoAllowRow">
                          <Plus class="mr-1 size-3.5" />
                          {{ t('openclaw.configToolsAdd') }}
                        </UiButton>
                      </div>
                      <p class="text-muted-foreground text-xs">
                        {{ t('openclaw.configToolsAlsoAllowHelp') }}
                      </p>
                      <p v-if="toolsAlsoAllowRows.length === 0" class="text-muted-foreground text-sm">
                        {{ t('openclaw.configToolsListEmpty') }}
                      </p>
                      <div v-else class="space-y-2">
                        <div
                          v-for="(row, idx) in toolsAlsoAllowRows"
                          :key="`tools-also-${idx}`"
                          class="grid grid-cols-1 items-center gap-2 md:grid-cols-[1fr_auto]"
                        >
                          <UiInput
                            class="h-8 font-mono text-xs"
                            :model-value="row"
                            :placeholder="t('openclaw.configToolsToolIdPlaceholder')"
                            @update:model-value="(v: string | number) => updateToolsAlsoAllowRow(idx, String(v ?? ''))"
                          />
                          <UiButton type="button" size="icon" variant="ghost" class="size-8" @click="removeToolsAlsoAllowRow(idx)">
                            <Minus class="size-3.5" />
                          </UiButton>
                        </div>
                      </div>
                    </section>

                    <section class="space-y-2">
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div class="flex items-center gap-2">
                          <span class="font-medium text-sm">{{ t('openclaw.configToolsDenyHeading') }}</span>
                          <span class="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium">
                            {{ t('openclaw.configToolsItemsCount', { n: toolsDenyRows.filter((x) => x.trim()).length }) }}
                          </span>
                        </div>
                        <UiButton type="button" variant="outline" size="sm" class="shrink-0" @click="addToolsDenyRow">
                          <Plus class="mr-1 size-3.5" />
                          {{ t('openclaw.configToolsAdd') }}
                        </UiButton>
                      </div>
                      <p class="text-muted-foreground text-xs">
                        {{ t('openclaw.configToolsDenyHelp') }}
                      </p>
                      <p v-if="toolsDenyRows.length === 0" class="text-muted-foreground text-sm">
                        {{ t('openclaw.configToolsListEmpty') }}
                      </p>
                      <div v-else class="space-y-2">
                        <div
                          v-for="(row, idx) in toolsDenyRows"
                          :key="`tools-deny-${idx}`"
                          class="grid grid-cols-1 items-center gap-2 md:grid-cols-[1fr_auto]"
                        >
                          <UiInput
                            class="h-8 font-mono text-xs"
                            :model-value="row"
                            :placeholder="t('openclaw.configToolsToolIdPlaceholder')"
                            @update:model-value="(v: string | number) => updateToolsDenyRow(idx, String(v ?? ''))"
                          />
                          <UiButton type="button" size="icon" variant="ghost" class="size-8" @click="removeToolsDenyRow(idx)">
                            <Minus class="size-3.5" />
                          </UiButton>
                        </div>
                      </div>
                    </section>

                    <section class="space-y-1 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium">
                            {{ t('openclaw.configToolsSessionsVisibilityLabel') }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                            {{ t('openclaw.configToolsSessionsVisibilityHelp') }}
                          </p>
                        </div>
                        <UiSelect v-model="toolsSessionsVisibilitySelect" class="w-full max-w-[220px] shrink-0">
                          <UiSelectTrigger class="h-9">
                            <UiSelectValue :placeholder="t('openclaw.configToolsSessionsVisibilityAuto')" />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem :value="TOOLS_SESSIONS_VISIBILITY_AUTO">
                              {{
                                t('openclaw.configToolsSessionsVisibilityAuto')
                              }}
                            </UiSelectItem>
                            <UiSelectItem value="self">
                              self
                            </UiSelectItem>
                            <UiSelectItem value="tree">
                              tree
                            </UiSelectItem>
                            <UiSelectItem value="agent">
                              agent
                            </UiSelectItem>
                            <UiSelectItem value="all">
                              all
                            </UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>
                    </section>

                    <section class="space-y-2">
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span class="font-medium text-sm">{{ t('openclaw.configToolsByProviderHeading') }}</span>
                        <UiButton type="button" variant="outline" size="sm" class="shrink-0" @click="addToolsByProviderEntry">
                          <Plus class="mr-1 size-3.5" />
                          {{ t('openclaw.configToolsByProviderAdd') }}
                        </UiButton>
                      </div>
                      <p class="text-muted-foreground text-xs">
                        {{ t('openclaw.configToolsByProviderHelp') }}
                      </p>
                      <p v-if="toolsByProviderKeys.length === 0" class="text-muted-foreground text-sm">
                        {{ t('openclaw.configToolsByProviderEmpty') }}
                      </p>
                      <div v-else class="space-y-4">
                        <div
                          v-for="pkey in toolsByProviderKeys"
                          :key="`tools-bp-${pkey}`"
                          class="space-y-2 rounded-md border border-border bg-background p-3"
                        >
                          <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-2">
                            <div class="min-w-0 flex-1 space-y-1">
                              <UiLabel class="text-xs font-medium">
                                {{ t('openclaw.configToolsByProviderKey') }}
                              </UiLabel>
                              <UiInput
                                :key="`tools-bp-key-${pkey}`"
                                class="h-8 font-mono text-xs"
                                :default-value="pkey"
                                @blur="(ev: FocusEvent) => onToolsByProviderKeyChange(pkey, (ev.target as HTMLInputElement).value)"
                              />
                            </div>
                            <UiButton
                              type="button"
                              size="icon"
                              variant="ghost"
                              class="size-8 shrink-0 self-end sm:self-auto"
                              @click="removeToolsByProviderEntry(pkey)"
                            >
                              <Minus class="size-3.5" />
                            </UiButton>
                          </div>
                          <div class="space-y-1">
                            <UiLabel class="text-xs font-medium">
                              {{ t('openclaw.configToolsByProviderJson') }}
                            </UiLabel>
                            <p class="text-muted-foreground text-xs">
                              {{ t('openclaw.configToolsByProviderJsonHelp') }}
                            </p>
                            <UiTextarea
                              :key="pkey"
                              class="min-h-[100px] font-mono text-xs"
                              :default-value="toolsByProviderJsonFor(pkey)"
                              :placeholder="t('openclaw.configToolsByProviderJsonPlaceholder')"
                              @blur="(ev: FocusEvent) => applyToolsByProviderJson(pkey, (ev.target as HTMLTextAreaElement).value)"
                            />
                          </div>
                        </div>
                      </div>
                    </section>

                    <UiCollapsible
                      :default-open="false"
                      class="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                    >
                      <div class="border-b border-border bg-muted/40 dark:bg-muted/25">
                        <UiCollapsibleTrigger
                          class="flex w-full items-center justify-between gap-3 px-5 py-[18px] text-left hover:bg-muted/50"
                        >
                          <span class="text-sm font-semibold tracking-tight">{{ t('openclaw.configToolsElevatedHeading') }}</span>
                          <ChevronDown
                            class="size-4 shrink-0 opacity-50 transition-transform group-data-[state=open]:rotate-180"
                          />
                        </UiCollapsibleTrigger>
                      </div>
                      <UiCollapsibleContent class="min-w-0 space-y-4 px-[18px] py-4">
                        <p class="text-muted-foreground text-xs leading-relaxed">
                          {{ t('openclaw.configToolsElevatedHelp') }}
                        </p>
                        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium">
                              {{ t('openclaw.configToolsElevatedEnabledLabel') }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configToolsElevatedEnabledHelp') }}
                            </p>
                          </div>
                          <UiSwitch v-model:checked="toolsElevatedEnabled" />
                        </div>
                        <UiSeparator />
                        <div class="space-y-2">
                          <UiLabel class="text-sm font-medium" for="openclaw-tools-elevated-allowfrom">
                            {{
                              t('openclaw.configToolsElevatedAllowFromLabel')
                            }}
                          </UiLabel>
                          <p class="text-muted-foreground text-xs">
                            {{ t('openclaw.configToolsElevatedAllowFromHelp') }}
                          </p>
                          <UiTextarea
                            id="openclaw-tools-elevated-allowfrom"
                            v-model="toolsElevatedAllowFromJsonLocal"
                            class="min-h-[120px] font-mono text-xs"
                            :placeholder="t('openclaw.configToolsElevatedAllowFromPlaceholder')"
                            @blur="(ev: FocusEvent) => applyToolsElevatedAllowFromJson((ev.target as HTMLTextAreaElement).value)"
                          />
                        </div>
                      </UiCollapsibleContent>
                    </UiCollapsible>

                    <section class="space-y-3">
                      <h3 class="text-sm font-semibold tracking-tight">
                        {{ t('openclaw.configToolsNestedPoliciesHeading') }}
                      </h3>
                      <p class="text-muted-foreground text-xs leading-relaxed">
                        {{ t('openclaw.configToolsNestedPoliciesIntro') }}
                      </p>
                      <UiCollapsible
                        v-for="tab in toolsNestedTabs"
                        :key="tab.key"
                        :default-open="false"
                        class="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                      >
                        <div class="border-b border-border bg-muted/40 dark:bg-muted/25">
                          <UiCollapsibleTrigger
                            class="flex w-full items-center justify-between gap-3 px-5 py-[18px] text-left hover:bg-muted/50"
                          >
                            <span class="text-sm font-semibold tracking-tight">{{ t(tab.titleKey) }}</span>
                            <ChevronDown
                              class="size-4 shrink-0 opacity-50 transition-transform group-data-[state=open]:rotate-180"
                            />
                          </UiCollapsibleTrigger>
                        </div>
                        <UiCollapsibleContent class="min-w-0 space-y-2 px-[18px] py-4">
                          <p class="text-muted-foreground text-xs leading-relaxed">
                            {{ t(tab.helpKey) }}
                          </p>
                          <UiTextarea
                            class="min-h-[140px] font-mono text-xs"
                            :model-value="getToolsNestedLocal(tab.key)"
                            :placeholder="t('openclaw.configToolsJsonPlaceholder')"
                            @update:model-value="(v: string | number) => setToolsNestedLocal(tab.key, String(v ?? ''))"
                            @blur="(ev: FocusEvent) => applyToolsNestedJsonKey(tab.key, (ev.target as HTMLTextAreaElement).value)"
                          />
                        </UiCollapsibleContent>
                      </UiCollapsible>
                    </section>

                    <div class="flex flex-wrap items-center gap-2 pt-2">
                      <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                        {{ t('openclaw.configRaw') }}
                      </UiButton>
                    </div>
                  </div>
                </template>
                <template
                  v-else-if="
                    settingsSubPage === 'aiAgents'
                      && formMode === 'form'
                      && activeSection === 'memory'
                      && draftConfig
                  "
                >
                  <div class="config-form--modern config-memory-form space-y-5">
                    <header v-if="!showConfigFormHero" class="config-section-hero mb-8">
                      <h2 class="text-lg font-semibold tracking-tight">
                        {{ t('openclaw.configSchemaSection.memory') }}
                      </h2>
                      <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                        {{ t('openclaw.configMemorySectionMeta') }}
                      </p>
                    </header>

                    <section
                      class="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                    >
                      <div
                        class="flex items-center gap-3.5 border-b border-border bg-muted/40 px-5 py-[18px] dark:bg-muted/25"
                      >
                        <div
                          class="flex size-[30px] shrink-0 items-center justify-center rounded-md bg-primary/15 p-1.5 text-primary dark:bg-primary/20"
                        >
                          <Brain class="size-full" stroke-width="2" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <h3 class="m-0 truncate text-sm font-semibold tracking-tight text-foreground">
                            {{ t('openclaw.configSchemaSection.memory') }}
                          </h3>
                          <p class="mt-0.5 text-xs leading-snug text-muted-foreground">
                            {{ t('openclaw.configMemorySectionMeta') }}
                          </p>
                        </div>
                      </div>
                      <div class="min-w-0 px-[18px] py-4">
                        <p class="text-sm leading-relaxed text-muted-foreground">
                          {{ t('openclaw.configMemoryIntro') }}
                        </p>
                      </div>
                    </section>

                    <section class="space-y-1 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium" for="openclaw-memory-backend">
                            {{
                              t('openclaw.configMemoryBackendLabel')
                            }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                            {{ t('openclaw.configMemoryBackendHelp') }}
                          </p>
                        </div>
                        <UiSelect v-model="memoryBackendSelect" class="w-full max-w-[220px] shrink-0">
                          <UiSelectTrigger id="openclaw-memory-backend" class="h-9">
                            <UiSelectValue :placeholder="t('openclaw.configMemoryBackendAuto')" />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem :value="MEMORY_BACKEND_AUTO">
                              {{ t('openclaw.configMemoryBackendAuto') }}
                            </UiSelectItem>
                            <UiSelectItem value="builtin">
                              builtin
                            </UiSelectItem>
                            <UiSelectItem value="qmd">
                              qmd
                            </UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>
                    </section>

                    <section class="space-y-1 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium" for="openclaw-memory-citations">
                            {{
                              t('openclaw.configMemoryCitationsLabel')
                            }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                            {{ t('openclaw.configMemoryCitationsHelp') }}
                          </p>
                        </div>
                        <UiSelect v-model="memoryCitationsSelect" class="w-full max-w-[220px] shrink-0">
                          <UiSelectTrigger id="openclaw-memory-citations" class="h-9">
                            <UiSelectValue :placeholder="t('openclaw.configMemoryCitationsAuto')" />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem :value="MEMORY_CITATIONS_AUTO">
                              {{ t('openclaw.configMemoryCitationsAuto') }}
                            </UiSelectItem>
                            <UiSelectItem value="auto">
                              auto
                            </UiSelectItem>
                            <UiSelectItem value="on">
                              on
                            </UiSelectItem>
                            <UiSelectItem value="off">
                              off
                            </UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>
                    </section>

                    <UiCollapsible
                      :default-open="true"
                      class="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                    >
                      <div class="border-b border-border bg-muted/40 dark:bg-muted/25">
                        <UiCollapsibleTrigger
                          class="flex w-full items-center justify-between gap-3 px-5 py-[18px] text-left hover:bg-muted/50"
                        >
                          <span class="text-sm font-semibold tracking-tight">{{ t('openclaw.configMemoryQmdHeading') }}</span>
                          <ChevronDown
                            class="size-4 shrink-0 opacity-50 transition-transform group-data-[state=open]:rotate-180"
                          />
                        </UiCollapsibleTrigger>
                      </div>
                      <UiCollapsibleContent class="min-w-0 space-y-3 px-[18px] py-4">
                        <p class="text-muted-foreground text-xs leading-relaxed">
                          {{ t('openclaw.configMemoryQmdHelp') }}
                        </p>
                        <UiSeparator />
                        <UiTextarea
                          id="openclaw-memory-qmd-json"
                          v-model="memoryQmdJsonLocal"
                          class="min-h-[180px] font-mono text-xs"
                          :placeholder="t('openclaw.configMemoryQmdPlaceholder')"
                          @blur="(ev: FocusEvent) => applyMemoryQmdJson((ev.target as HTMLTextAreaElement).value)"
                        />
                      </UiCollapsibleContent>
                    </UiCollapsible>

                    <div class="flex flex-wrap items-center gap-2 pt-2">
                      <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                        {{ t('openclaw.configRaw') }}
                      </UiButton>
                    </div>
                  </div>
                </template>
                <template
                  v-else-if="
                    settingsSubPage === 'aiAgents'
                      && formMode === 'form'
                      && activeSection === 'session'
                      && draftConfig
                  "
                >
                  <div class="config-form--modern config-session-form space-y-5">
                    <header v-if="!showConfigFormHero" class="config-section-hero mb-8">
                      <h2 class="text-lg font-semibold tracking-tight">
                        {{ t('openclaw.configSchemaSection.session') }}
                      </h2>
                      <p class="mt-1 text-muted-foreground text-sm leading-relaxed">
                        {{ t('openclaw.configSessionSectionMeta') }}
                      </p>
                    </header>

                    <section
                      class="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                    >
                      <div
                        class="flex items-center gap-3.5 border-b border-border bg-muted/40 px-5 py-[18px] dark:bg-muted/25"
                      >
                        <div
                          class="flex size-[30px] shrink-0 items-center justify-center rounded-md bg-primary/15 p-1.5 text-primary dark:bg-primary/20"
                        >
                          <Monitor class="size-full" stroke-width="2" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <h3 class="m-0 truncate text-sm font-semibold tracking-tight text-foreground">
                            {{ t('openclaw.configSchemaSection.session') }}
                          </h3>
                          <p class="mt-0.5 text-xs leading-snug text-muted-foreground">
                            {{ t('openclaw.configSessionSectionMeta') }}
                          </p>
                        </div>
                      </div>
                      <div class="min-w-0 px-[18px] py-4">
                        <p class="text-sm leading-relaxed text-muted-foreground">
                          {{ t('openclaw.configSessionIntro') }}
                        </p>
                      </div>
                    </section>

                    <section class="space-y-1 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium" for="openclaw-session-scope">
                            {{
                              t('openclaw.configSessionScopeLabel')
                            }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                            {{ t('openclaw.configSessionScopeHelp') }}
                          </p>
                        </div>
                        <UiSelect v-model="sessionScopeSelect" class="w-full max-w-[220px] shrink-0">
                          <UiSelectTrigger id="openclaw-session-scope" class="h-9">
                            <UiSelectValue :placeholder="t('openclaw.configSessionScopeAuto')" />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem :value="SESSION_SCOPE_AUTO">
                              {{ t('openclaw.configSessionScopeAuto') }}
                            </UiSelectItem>
                            <UiSelectItem value="per-sender">
                              per-sender
                            </UiSelectItem>
                            <UiSelectItem value="global">
                              global
                            </UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>
                    </section>

                    <section class="space-y-1 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium" for="openclaw-session-dm-scope">
                            {{
                              t('openclaw.configSessionDmScopeLabel')
                            }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                            {{ t('openclaw.configSessionDmScopeHelp') }}
                          </p>
                        </div>
                        <UiSelect v-model="sessionDmScopeSelect" class="w-full max-w-[280px] shrink-0">
                          <UiSelectTrigger id="openclaw-session-dm-scope" class="h-9">
                            <UiSelectValue :placeholder="t('openclaw.configSessionDmScopeAuto')" />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem :value="SESSION_DM_SCOPE_AUTO">
                              {{ t('openclaw.configSessionDmScopeAuto') }}
                            </UiSelectItem>
                            <UiSelectItem value="main">
                              main
                            </UiSelectItem>
                            <UiSelectItem value="per-peer">
                              per-peer
                            </UiSelectItem>
                            <UiSelectItem value="per-channel-peer">
                              per-channel-peer
                            </UiSelectItem>
                            <UiSelectItem value="per-account-channel-peer">
                              per-account-channel-peer
                            </UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>
                    </section>

                    <section class="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium" for="openclaw-session-store">
                            {{
                              t('openclaw.configSessionStoreLabel')
                            }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                            {{ t('openclaw.configSessionStoreHelp') }}
                          </p>
                        </div>
                        <UiInput
                          id="openclaw-session-store"
                          v-model="sessionStoreStr"
                          class="h-9 w-full max-w-md shrink-0 font-mono text-xs"
                          :placeholder="t('openclaw.configSessionStorePlaceholder')"
                        />
                      </div>
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium" for="openclaw-session-main-key">
                            {{
                              t('openclaw.configSessionMainKeyLabel')
                            }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                            {{ t('openclaw.configSessionMainKeyHelp') }}
                          </p>
                        </div>
                        <UiInput
                          id="openclaw-session-main-key"
                          v-model="sessionMainKeyStr"
                          class="h-9 w-full max-w-md shrink-0 font-mono text-xs"
                          :placeholder="t('openclaw.configSessionMainKeyPlaceholder')"
                        />
                      </div>
                    </section>

                    <section class="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium" for="openclaw-session-typing-mode">
                            {{
                              t('openclaw.configSessionTypingModeLabel')
                            }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                            {{ t('openclaw.configSessionTypingModeHelp') }}
                          </p>
                        </div>
                        <UiSelect v-model="sessionTypingModeSelect" class="w-full max-w-[220px] shrink-0">
                          <UiSelectTrigger id="openclaw-session-typing-mode" class="h-9">
                            <UiSelectValue :placeholder="t('openclaw.configSessionTypingModeAuto')" />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem :value="SESSION_TYPING_MODE_AUTO">
                              {{ t('openclaw.configSessionTypingModeAuto') }}
                            </UiSelectItem>
                            <UiSelectItem value="never">
                              never
                            </UiSelectItem>
                            <UiSelectItem value="instant">
                              instant
                            </UiSelectItem>
                            <UiSelectItem value="thinking">
                              thinking
                            </UiSelectItem>
                            <UiSelectItem value="message">
                              message
                            </UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium" for="openclaw-session-typing-interval">
                            {{
                              t('openclaw.configSessionTypingIntervalLabel')
                            }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                            {{ t('openclaw.configSessionTypingIntervalHelp') }}
                          </p>
                        </div>
                        <UiInput
                          id="openclaw-session-typing-interval"
                          v-model="sessionTypingIntervalSecondsStr"
                          class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                          inputmode="numeric"
                          @blur="applySessionTypingIntervalSeconds"
                        />
                      </div>
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium" for="openclaw-session-idle-minutes">
                            {{
                              t('openclaw.configSessionIdleMinutesLabel')
                            }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                            {{ t('openclaw.configSessionIdleMinutesHelp') }}
                          </p>
                        </div>
                        <UiInput
                          id="openclaw-session-idle-minutes"
                          v-model="sessionIdleMinutesStr"
                          class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                          inputmode="numeric"
                          @blur="applySessionIdleMinutes"
                        />
                      </div>
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <UiLabel class="text-sm font-medium" for="openclaw-session-parent-fork">
                            {{
                              t('openclaw.configSessionParentForkMaxTokensLabel')
                            }}
                          </UiLabel>
                          <p class="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                            {{ t('openclaw.configSessionParentForkMaxTokensHelp') }}
                          </p>
                        </div>
                        <UiInput
                          id="openclaw-session-parent-fork"
                          v-model="sessionParentForkMaxTokensStr"
                          class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                          inputmode="numeric"
                          @blur="applySessionParentForkMaxTokens"
                        />
                      </div>
                    </section>

                    <UiCollapsible
                      :default-open="true"
                      class="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                    >
                      <div class="border-b border-border bg-muted/40 dark:bg-muted/25">
                        <UiCollapsibleTrigger
                          class="flex w-full items-center justify-between gap-3 px-5 py-[18px] text-left hover:bg-muted/50"
                        >
                          <span class="text-sm font-semibold tracking-tight">{{ t('openclaw.configSessionResetHeading') }}</span>
                          <ChevronDown
                            class="size-4 shrink-0 opacity-50 transition-transform group-data-[state=open]:rotate-180"
                          />
                        </UiCollapsibleTrigger>
                      </div>
                      <UiCollapsibleContent class="min-w-0 space-y-4 px-[18px] py-4">
                        <p class="text-muted-foreground text-xs leading-relaxed">
                          {{ t('openclaw.configSessionResetHelp') }}
                        </p>
                        <UiSeparator />
                        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium" for="openclaw-session-reset-mode">
                              {{
                                t('openclaw.configSessionResetModeLabel')
                              }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configSessionResetModeHelp') }}
                            </p>
                          </div>
                          <UiSelect v-model="sessionResetModeSelect" class="w-full max-w-[220px] shrink-0">
                            <UiSelectTrigger id="openclaw-session-reset-mode" class="h-9">
                              <UiSelectValue :placeholder="t('openclaw.configSessionResetModeAuto')" />
                            </UiSelectTrigger>
                            <UiSelectContent>
                              <UiSelectItem :value="SESSION_RESET_MODE_AUTO">
                                {{ t('openclaw.configSessionResetModeAuto') }}
                              </UiSelectItem>
                              <UiSelectItem value="daily">
                                daily
                              </UiSelectItem>
                              <UiSelectItem value="idle">
                                idle
                              </UiSelectItem>
                            </UiSelectContent>
                          </UiSelect>
                        </div>
                        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium" for="openclaw-session-reset-at-hour">
                              {{
                                t('openclaw.configSessionResetAtHourLabel')
                              }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configSessionResetAtHourHelp') }}
                            </p>
                          </div>
                          <UiInput
                            id="openclaw-session-reset-at-hour"
                            v-model="sessionResetAtHourStr"
                            class="h-9 w-full max-w-[120px] shrink-0 font-mono text-sm"
                            inputmode="numeric"
                            @blur="applySessionResetAtHour"
                          />
                        </div>
                        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium" for="openclaw-session-reset-idle">
                              {{
                                t('openclaw.configSessionResetIdleMinutesLabel')
                              }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configSessionResetIdleMinutesHelp') }}
                            </p>
                          </div>
                          <UiInput
                            id="openclaw-session-reset-idle"
                            v-model="sessionResetIdleMinutesStr"
                            class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                            inputmode="numeric"
                            @blur="applySessionResetIdleMinutes"
                          />
                        </div>
                      </UiCollapsibleContent>
                    </UiCollapsible>

                    <UiCollapsible
                      :default-open="true"
                      class="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                    >
                      <div class="border-b border-border bg-muted/40 dark:bg-muted/25">
                        <UiCollapsibleTrigger
                          class="flex w-full items-center justify-between gap-3 px-5 py-[18px] text-left hover:bg-muted/50"
                        >
                          <span class="text-sm font-semibold tracking-tight">{{ t('openclaw.configSessionAgentToAgentHeading') }}</span>
                          <ChevronDown
                            class="size-4 shrink-0 opacity-50 transition-transform group-data-[state=open]:rotate-180"
                          />
                        </UiCollapsibleTrigger>
                      </div>
                      <UiCollapsibleContent class="min-w-0 space-y-4 px-[18px] py-4">
                        <p class="text-muted-foreground text-xs leading-relaxed">
                          {{ t('openclaw.configSessionAgentToAgentHelp') }}
                        </p>
                        <UiSeparator />
                        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium" for="openclaw-session-a2a-pingpong">
                              {{
                                t('openclaw.configSessionMaxPingPongLabel')
                              }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configSessionMaxPingPongHelp') }}
                            </p>
                          </div>
                          <UiInput
                            id="openclaw-session-a2a-pingpong"
                            v-model="sessionAgentToAgentMaxPingPongStr"
                            class="h-9 w-full max-w-[120px] shrink-0 font-mono text-sm"
                            inputmode="numeric"
                            @blur="applySessionAgentToAgentMaxPingPong"
                          />
                        </div>
                      </UiCollapsibleContent>
                    </UiCollapsible>

                    <UiCollapsible
                      :default-open="false"
                      class="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                    >
                      <div class="border-b border-border bg-muted/40 dark:bg-muted/25">
                        <UiCollapsibleTrigger
                          class="flex w-full items-center justify-between gap-3 px-5 py-[18px] text-left hover:bg-muted/50"
                        >
                          <span class="text-sm font-semibold tracking-tight">{{ t('openclaw.configSessionThreadBindingsHeading') }}</span>
                          <ChevronDown
                            class="size-4 shrink-0 opacity-50 transition-transform group-data-[state=open]:rotate-180"
                          />
                        </UiCollapsibleTrigger>
                      </div>
                      <UiCollapsibleContent class="min-w-0 space-y-4 px-[18px] py-4">
                        <p class="text-muted-foreground text-xs leading-relaxed">
                          {{ t('openclaw.configSessionThreadBindingsHelp') }}
                        </p>
                        <UiSeparator />
                        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium">
                              {{ t('openclaw.configSessionThreadBindingsEnabledLabel') }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configSessionThreadBindingsEnabledHelp') }}
                            </p>
                          </div>
                          <UiSwitch v-model:checked="sessionThreadBindingsEnabled" />
                        </div>
                        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium" for="openclaw-session-tb-idle">
                              {{
                                t('openclaw.configSessionThreadIdleHoursLabel')
                              }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configSessionThreadIdleHoursHelp') }}
                            </p>
                          </div>
                          <UiInput
                            id="openclaw-session-tb-idle"
                            v-model="sessionThreadIdleHoursStr"
                            class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                            inputmode="decimal"
                            @blur="applySessionThreadIdleHours"
                          />
                        </div>
                        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                          <div class="min-w-0 flex-1">
                            <UiLabel class="text-sm font-medium" for="openclaw-session-tb-maxage">
                              {{
                                t('openclaw.configSessionThreadMaxAgeHoursLabel')
                              }}
                            </UiLabel>
                            <p class="mt-0.5 text-muted-foreground text-xs">
                              {{ t('openclaw.configSessionThreadMaxAgeHoursHelp') }}
                            </p>
                          </div>
                          <UiInput
                            id="openclaw-session-tb-maxage"
                            v-model="sessionThreadMaxAgeHoursStr"
                            class="h-9 w-full max-w-[180px] shrink-0 font-mono text-sm"
                            inputmode="decimal"
                            @blur="applySessionThreadMaxAgeHours"
                          />
                        </div>
                      </UiCollapsibleContent>
                    </UiCollapsible>

                    <UiCollapsible
                      :default-open="false"
                      class="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                    >
                      <div class="border-b border-border bg-muted/40 dark:bg-muted/25">
                        <UiCollapsibleTrigger
                          class="flex w-full items-center justify-between gap-3 px-5 py-[18px] text-left hover:bg-muted/50"
                        >
                          <span class="text-sm font-semibold tracking-tight">{{ t('openclaw.configSessionResetTriggersHeading') }}</span>
                          <ChevronDown
                            class="size-4 shrink-0 opacity-50 transition-transform group-data-[state=open]:rotate-180"
                          />
                        </UiCollapsibleTrigger>
                      </div>
                      <UiCollapsibleContent class="min-w-0 space-y-3 px-[18px] py-4">
                        <p class="text-muted-foreground text-xs leading-relaxed">
                          {{ t('openclaw.configSessionResetTriggersHelp') }}
                        </p>
                        <UiTextarea
                          id="openclaw-session-reset-triggers"
                          v-model="sessionResetTriggersTextLocal"
                          class="min-h-[100px] font-mono text-xs"
                          :placeholder="t('openclaw.configSessionResetTriggersPlaceholder')"
                          @blur="(ev: FocusEvent) => applySessionResetTriggersText((ev.target as HTMLTextAreaElement).value)"
                        />
                      </UiCollapsibleContent>
                    </UiCollapsible>

                    <section class="space-y-3">
                      <h3 class="text-sm font-semibold tracking-tight">
                        {{ t('openclaw.configSessionAdvancedJsonHeading') }}
                      </h3>
                      <p class="text-muted-foreground text-xs leading-relaxed">
                        {{ t('openclaw.configSessionAdvancedJsonIntro') }}
                      </p>
                      <UiCollapsible
                        v-for="tab in sessionJsonTabs"
                        :key="tab.key"
                        :default-open="false"
                        class="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-sm"
                      >
                        <div class="border-b border-border bg-muted/40 dark:bg-muted/25">
                          <UiCollapsibleTrigger
                            class="flex w-full items-center justify-between gap-3 px-5 py-[18px] text-left hover:bg-muted/50"
                          >
                            <span class="text-sm font-semibold tracking-tight">{{ t(tab.titleKey) }}</span>
                            <ChevronDown
                              class="size-4 shrink-0 opacity-50 transition-transform group-data-[state=open]:rotate-180"
                            />
                          </UiCollapsibleTrigger>
                        </div>
                        <UiCollapsibleContent class="min-w-0 space-y-2 px-[18px] py-4">
                          <p class="text-muted-foreground text-xs leading-relaxed">
                            {{ t(tab.helpKey) }}
                          </p>
                          <UiTextarea
                            class="min-h-[140px] font-mono text-xs"
                            :model-value="getSessionJsonLocal(tab.key)"
                            :placeholder="t('openclaw.configSessionJsonPlaceholder')"
                            @update:model-value="(v: string | number) => setSessionJsonLocal(tab.key, String(v ?? ''))"
                            @blur="(ev: FocusEvent) => applySessionJsonKey(tab.key, (ev.target as HTMLTextAreaElement).value)"
                          />
                        </UiCollapsibleContent>
                      </UiCollapsible>
                    </section>

                    <div class="flex flex-wrap items-center gap-2 pt-2">
                      <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                        {{ t('openclaw.configRaw') }}
                      </UiButton>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div class="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                    <p class="text-muted-foreground text-sm">
                      {{
                        activeSection === null
                          ? t('openclaw.configSatelliteRootHint')
                          : t('openclaw.configSatelliteFormHint')
                      }}
                    </p>
                    <UiButton variant="outline" size="sm" @click="formMode = 'raw'">
                      {{ t('openclaw.configRaw') }}
                    </UiButton>
                  </div>
                </template>
              </div>
            </template>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
