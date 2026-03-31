<script setup lang="ts">
/**
 * 概览页：与 Control UI Overview 布局与参数位置完全一致
 * 页头(Overview / Status, entry points, health)、Gateway Access 卡、Snapshot 卡、统计卡片、注意事项、日志入口
 */
import { Activity, ArrowUp, Eye, EyeOff, FileText, Gauge, Play, RefreshCw, Timer } from 'lucide-vue-next'
import { computed, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { formatAgo, formatCost, formatDurationMs, formatNextRun, formatTokens } from '@/plugin/openclaw/lib/format'
import { RPC } from '@/plugin/openclaw/lib/rpc-methods'

const { t } = useI18n()
const router = useRouter()
const config = inject<ReturnType<typeof import('@/plugin/openclaw/composables/use-openclaw-config').useOpenClawConfig>>('openclaw-config')!
const auth = inject<ReturnType<typeof import('@/plugin/openclaw/composables/use-openclaw-auth').useOpenClawAuth>>('openclaw-auth')!
const gateway = inject<ReturnType<typeof import('@/plugin/openclaw/composables/use-openclaw-gateway').useOpenClawGateway>>('openclaw-gateway')!

const showGatewayToken = ref(false)
const showGatewayPassword = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const sessionsCount = ref<number | null>(null)
const cronEnabled = ref<boolean | null>(null)
const cronNext = ref<number | null>(null)
const cronJobs = ref<Array<{ state?: { lastStatus?: string } }>>([])
const lastUpdated = ref<number | null>(null)
const usageTotals = ref<{ totalCost?: number, totalTokens?: number } | null>(null)
const usageMessages = ref<number>(0)
const skillsReport = ref<{
  skills?: Array<{
    name?: string
    id?: string
    disabled?: boolean
    blockedByAllowlist?: boolean
    missingDependencies?: string[]
  }>
} | null>(null)
const logLinesCount = ref<number>(0)

const logQuickLinks = [
  { icon: Play, titleKey: 'openclaw.overviewEventLogs' as const },
  { icon: FileText, titleKey: 'openclaw.overviewGatewayLogs' as const },
]
const availableSince = ref<number | null>(null)

const helloSnapshot = computed(() => {
  const h = gateway.hello as { snapshot?: { uptimeMs?: number } } | null | undefined
  return h?.snapshot ?? null
})

const helloPolicy = computed(() => {
  const h = gateway.hello as { policy?: { tickIntervalMs?: number } } | null | undefined
  return h?.policy ?? null
})

const showPairingHint = computed(() => {
  if (gateway?.connected || !gateway?.lastError)
    return false
  const msg = (gateway.lastError || '').toLowerCase()
  return msg.includes('pairing required')
})

const showAuthHint = computed(() => {
  if (gateway?.connected || !gateway?.lastError)
    return null
  const msg = (gateway.lastError || '').toLowerCase()
  if (!msg.includes('unauthorized') && !msg.includes('auth'))
    return null
  return auth.token.value.trim() || auth.password.value.trim() ? 'failed' : 'required'
})

const showInsecureHint = computed(() => {
  if (gateway?.connected || !gateway?.lastError)
    return false
  const msg = (gateway.lastError || '').toLowerCase()
  return msg.includes('secure context') || msg.includes('device identity required')
})

const showOriginHint = computed(() => {
  if (gateway?.connected || !gateway?.lastError)
    return false
  const msg = gateway.lastError || ''
  return msg.includes('origin not allowed')
})

const pageOrigin = computed(() =>
  typeof window !== 'undefined' ? window.location.origin : '',
)

/** 与 Control UI overview-cards.ts skills 卡一致：enabled/total，hint 为 N blocked 或 N active */
const skillsSummary = computed(() => {
  const skills = skillsReport.value?.skills ?? []
  const total = skills.length
  const enabled = skills.filter(s => !s.disabled).length
  const blocked = skills.filter(s => s.blockedByAllowlist).length
  return { total, enabled, blocked }
})

const skillsMissingDeps = computed(() => {
  const skills = skillsReport.value?.skills ?? []
  return skills.filter(s => s.disabled || (s.missingDependencies && s.missingDependencies.length > 0) || s.blockedByAllowlist)
})

const skillsMissingDepsPreview = computed(() => {
  const list = skillsMissingDeps.value
  const names = list.slice(0, 3).map(s => s.name || s.id || '—')
  const more = list.length - 3
  if (more > 0)
    return [...names, `+${more} more`].join(', ')
  return names.join(', ') || null
})

const cronFailedCount = computed(() =>
  cronJobs.value.filter(j => j.state?.lastStatus === 'error').length,
)

async function loadOverview() {
  if (!gateway?.connected)
    return
  loading.value = true
  error.value = null
  if (availableSince.value == null)
    availableSince.value = Date.now()
  try {
    const [
      sessions,
      cronStatus,
      usage,
      skills,
      cronList,
      logsRes,
    ] = await Promise.all([
      gateway.request<{ count?: number }>(RPC.sessionsList, {}).catch(() => null),
      gateway.request<{ enabled?: boolean, nextWakeAtMs?: number }>(RPC.cronStatus).catch(() => null),
      gateway.request<{ totals?: { totalCost?: number, totalTokens?: number }, aggregates?: { messages?: { total?: number } } }>(RPC.sessionsUsage).catch(() => null),
      gateway.request<{ skills?: Array<{ name?: string, id?: string, disabled?: boolean, blockedByAllowlist?: boolean, missingDependencies?: string[] }> }>(RPC.skillsStatus).catch(() => null),
      gateway.request<{ jobs?: Array<{ state?: { lastStatus?: string } }> }>(RPC.cronList).catch(() => ({ jobs: [] })),
      gateway.request<{ lines?: string[], log?: string }>(RPC.logsTail, { limit: 500 }).catch(() => ({ lines: [] })),
    ])
    sessionsCount.value = sessions && typeof sessions === 'object' && 'count' in sessions ? (sessions as { count?: number }).count ?? null : null
    cronEnabled.value = cronStatus?.enabled ?? null
    cronNext.value = cronStatus?.nextWakeAtMs ?? null
    cronJobs.value = cronList?.jobs ?? []
    lastUpdated.value = Date.now()
    usageTotals.value = usage?.totals ?? null
    usageMessages.value = usage?.aggregates?.messages?.total ?? 0
    skillsReport.value = skills ?? null
    if (logsRes && Array.isArray(logsRes.lines))
      logLinesCount.value = logsRes.lines.length
    else if (logsRes && typeof logsRes.log === 'string')
      logLinesCount.value = logsRes.log.split('\n').length
    else logLinesCount.value = 0
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    loading.value = false
  }
}

function onConnect() {
  gateway.connect({ explicit: true })
}

function onRefresh() {
  loadOverview()
}

function setWsUrl(v: string) {
  const c = config.config.value
  const prevUrl = (c?.wsUrl ?? '').trim()
  const nextUrl = v.trim()
  config.setConfig(c ? { ...c, baseUrl: nextUrl.replace(/^ws/, 'http').replace(/\/$/, ''), wsUrl: v } : { baseUrl: '', wsUrl: v })
  if (nextUrl !== prevUrl)
    auth.setToken('')
}

function onNavigate(tab: string) {
  router.push(`/plugins/openclaw/${tab}`)
}

watch(() => gateway?.connected, (connected) => {
  if (!connected)
    availableSince.value = null
  if (connected)
    loadOverview()
}, { immediate: true })
</script>

<template>
  <div class="space-y-6">
    <!-- 页头：与 Control UI 完全一致 Overview / Status, entry points, health. -->
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ t('openclaw.tabs.overview') }}
      </h1>
      <p class="text-muted-foreground mt-1 text-sm">
        {{ t('openclaw.overviewPageDesc') }}
      </p>
    </div>

    <!-- 未连接时：仅显示“请先连接”提示 -->
    <UiCard v-if="!gateway?.connected">
      <UiCardContent class="flex flex-col items-center justify-center gap-2 py-8">
        <p class="text-muted-foreground text-sm">
          {{ t('openclaw.connectFirst') }}
        </p>
      </UiCardContent>
    </UiCard>

    <template v-else>
      <!-- 第一行两卡：Gateway Access（左） + Snapshot（右），布局与参数位置完全参考 Control UI -->
      <div class="grid gap-4 md:grid-cols-2">
        <!-- Card 1: Gateway Access - Where the dashboard connects and how it authenticates. -->
        <UiCard>
          <UiCardHeader>
            <UiCardTitle>{{ t('openclaw.overviewGatewayAccess') }}</UiCardTitle>
            <UiCardDescription>{{ t('openclaw.overviewGatewayAccessDesc') }}</UiCardDescription>
          </UiCardHeader>
          <UiCardContent class="space-y-4">
            <!-- WebSocket URL (full width) -->
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none">{{ t('openclaw.overviewWsUrl') }}</label>
              <UiInput
                :model-value="config.config.value?.wsUrl ?? ''"
                :placeholder="t('openclaw.overviewWsUrlPlaceholder')"
                @update:model-value="setWsUrl"
              />
            </div>
            <!-- Gateway Token + visibility toggle -->
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none">{{ t('openclaw.overviewToken') }}</label>
              <div class="flex items-center gap-2">
                <UiInput
                  :model-value="auth.token.value"
                  :type="showGatewayToken ? 'text' : 'password'"
                  :placeholder="t('openclaw.overviewTokenPlaceholder')"
                  autocomplete="off"
                  class="flex-1"
                  @update:model-value="auth.setToken"
                />
                <UiButton
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="shrink-0 size-9"
                  :aria-label="showGatewayToken ? 'Hide token' : 'Show token'"
                  @click="showGatewayToken = !showGatewayToken"
                >
                  <Eye v-if="showGatewayToken" class="size-4" />
                  <EyeOff v-else class="size-4" />
                </UiButton>
              </div>
            </div>
            <!-- Password (not stored) + visibility toggle -->
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none">{{ t('openclaw.overviewPasswordNoStore') }}</label>
              <div class="flex items-center gap-2">
                <UiInput
                  :model-value="auth.password.value"
                  :type="showGatewayPassword ? 'text' : 'password'"
                  :placeholder="t('openclaw.overviewPasswordPlaceholder')"
                  autocomplete="off"
                  class="flex-1"
                  @update:model-value="auth.setPassword"
                />
                <UiButton
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="shrink-0 size-9"
                  :aria-label="showGatewayPassword ? 'Hide password' : 'Show password'"
                  @click="showGatewayPassword = !showGatewayPassword"
                >
                  <Eye v-if="showGatewayPassword" class="size-4" />
                  <EyeOff v-else class="size-4" />
                </UiButton>
              </div>
            </div>
            <!-- Default Session Key -->
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none">{{ t('openclaw.overviewSessionKeyLabel') }}</label>
              <UiInput
                :model-value="auth.sessionKey.value"
                :placeholder="t('openclaw.overviewSessionKeyPlaceholder')"
                @update:model-value="auth.setSessionKey"
              />
            </div>
            <!-- Connect, Refresh + hint (与 Control UI 一致) -->
            <div class="flex flex-wrap items-center gap-2 pt-1">
              <UiButton size="sm" @click="onConnect">
                {{ t('openclaw.overviewConnect') }}
              </UiButton>
              <UiButton size="sm" variant="outline" :disabled="loading" @click="onRefresh">
                {{ loading ? t('common.loading') : t('openclaw.overviewRefresh') }}
              </UiButton>
              <span class="text-muted-foreground text-xs">{{ t('openclaw.overviewConnectHint') }}</span>
            </div>
          </UiCardContent>
        </UiCard>

        <!-- Snapshot：与左侧 Gateway Access 同结构的外层卡片 + 内嵌四指标小卡 -->
        <UiCard class="flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
          <UiCardHeader>
            <UiCardTitle>{{ t('openclaw.overviewSnapshot') }}</UiCardTitle>
            <UiCardDescription>{{ t('openclaw.overviewSnapshotSubtitle') }}</UiCardDescription>
          </UiCardHeader>
          <UiCardContent class="space-y-4">
            <!-- 与仪表盘 Segment 统计卡同结构：标题行 + 图标 / 大数字 + 灰色说明 -->
            <div class="grid gap-4 sm:grid-cols-2">
              <UiCard>
                <UiCardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                  <UiCardTitle class="text-sm font-medium">
                    {{ t('openclaw.overviewStatusLabel') }}
                  </UiCardTitle>
                  <Activity class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </UiCardHeader>
                <UiCardContent>
                  <div
                    class="text-2xl font-bold" :class="[
                      gateway.connected ? 'text-green-600 dark:text-green-500' : 'text-amber-600 dark:text-amber-500',
                    ]"
                  >
                    {{ gateway.connected ? t('openclaw.overviewStatusNormal') : t('openclaw.disconnected') }}
                  </div>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.overviewSnapshotCardStatusCaption') }}
                  </p>
                </UiCardContent>
              </UiCard>
              <UiCard>
                <UiCardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                  <UiCardTitle class="text-sm font-medium">
                    {{ t('openclaw.overviewUptime') }}
                  </UiCardTitle>
                  <Timer class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </UiCardHeader>
                <UiCardContent>
                  <div class="font-mono text-2xl font-bold">
                    {{ helloSnapshot?.uptimeMs != null ? formatDurationMs(helloSnapshot.uptimeMs) : '—' }}
                  </div>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.overviewSnapshotCardUptimeCaption') }}
                  </p>
                </UiCardContent>
              </UiCard>
              <UiCard>
                <UiCardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                  <UiCardTitle class="text-sm font-medium">
                    {{ t('openclaw.overviewTickInterval') }}
                  </UiCardTitle>
                  <Gauge class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </UiCardHeader>
                <UiCardContent>
                  <div class="font-mono text-2xl font-bold">
                    {{ helloPolicy?.tickIntervalMs != null ? `${(helloPolicy.tickIntervalMs / 1000).toFixed(0)}s` : '—' }}
                  </div>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.overviewSnapshotCardTickCaption') }}
                  </p>
                </UiCardContent>
              </UiCard>
              <UiCard>
                <UiCardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                  <UiCardTitle class="text-sm font-medium">
                    {{ t('openclaw.overviewLastChannelsRefresh') }}
                  </UiCardTitle>
                  <RefreshCw class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </UiCardHeader>
                <UiCardContent>
                  <div class="font-mono text-2xl font-bold">
                    {{ lastUpdated != null ? formatAgo(lastUpdated) : '—' }}
                  </div>
                  <p class="text-muted-foreground text-xs">
                    {{ t('openclaw.overviewSnapshotCardRefreshCaption') }}
                  </p>
                </UiCardContent>
              </UiCard>
            </div>
            <UiAlert v-if="gateway.lastError" variant="destructive" class="space-y-2">
              <div class="text-sm">
                {{ gateway.lastError }}
              </div>
              <div v-if="showPairingHint" class="text-muted-foreground mt-2 text-xs">
                {{ t('openclaw.overviewPairingHint') }}
                <span class="mt-1 block font-mono">openclaw devices list</span>
                <span class="mt-1 block font-mono">openclaw devices approve &lt;requestId&gt;</span>
              </div>
              <div v-else-if="showAuthHint === 'required'" class="text-muted-foreground mt-2 text-xs">
                {{ t('openclaw.overviewAuthRequired') }}
                <span class="mt-1 block font-mono">openclaw dashboard --no-open</span> → tokenized URL
              </div>
              <div v-else-if="showAuthHint === 'failed'" class="text-muted-foreground mt-2 text-xs">
                {{ t('openclaw.overviewAuthFailed') }}
              </div>
              <div v-else-if="showInsecureHint" class="text-muted-foreground mt-2 text-xs">
                {{ t('openclaw.overviewInsecureHint') }}
              </div>
              <div v-else-if="showOriginHint" class="text-muted-foreground mt-2 text-xs">
                {{ t('openclaw.overviewOriginHint') }}
                <span class="mt-1 block font-mono">{{ pageOrigin || t('openclaw.overviewOriginHintExample') }}</span>
              </div>
            </UiAlert>
            <p v-else class="text-muted-foreground text-sm">
              {{ t('openclaw.overviewChannelsHint') }}
            </p>
          </UiCardContent>
        </UiCard>
      </div>

      <!-- 统计卡片：与 sales/income-card 同结构（UiCardDescription + font-display 大数字 + 底部绿字+说明） -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiCard class="cursor-pointer shadow-sm transition-colors hover:bg-muted/50" @click="onNavigate('usage')">
          <UiCardHeader class="space-y-1">
            <UiCardDescription>{{ t('openclaw.overviewCardsCost') }}</UiCardDescription>
            <div class="font-display text-2xl lg:text-3xl">
              {{ usageTotals ? `$${formatCost(usageTotals.totalCost)}` : '$0.00' }}
            </div>
            <div class="flex items-center text-xs">
              <ArrowUp
                v-if="usageMessages > 0"
                class="mr-1 size-3 shrink-0 text-green-500"
                aria-hidden="true"
              />
              <span
                class="font-medium" :class="[
                  usageMessages > 0 ? 'text-green-500' : 'text-muted-foreground',
                ]"
              >
                {{ usageMessages }} {{ t('openclaw.overviewStatMsgs') }}
              </span>
              <span class="ml-1 text-muted-foreground">
                {{ usageTotals ? formatTokens(usageTotals.totalTokens) : '0' }} {{ t('openclaw.overviewStatTokens') }}
              </span>
            </div>
          </UiCardHeader>
        </UiCard>
        <UiCard class="cursor-pointer shadow-sm transition-colors hover:bg-muted/50" @click="onNavigate('sessions')">
          <UiCardHeader class="space-y-1">
            <UiCardDescription>{{ t('openclaw.overviewStatsSessions') }}</UiCardDescription>
            <div class="font-display text-2xl lg:text-3xl">
              {{ sessionsCount ?? 0 }}
            </div>
            <div class="flex items-center text-xs">
              <Activity class="mr-1 size-3 shrink-0 text-green-500" aria-hidden="true" />
              <span class="font-medium text-green-500">{{ t('openclaw.overviewStatSessionsLive') }}</span>
              <span class="ml-1 text-muted-foreground">{{ t('openclaw.overviewStatsSessionsHint') }}</span>
            </div>
          </UiCardHeader>
        </UiCard>
        <UiCard class="cursor-pointer shadow-sm transition-colors hover:bg-muted/50" @click="onNavigate('skills')">
          <UiCardHeader class="space-y-1">
            <UiCardDescription>{{ t('openclaw.overviewCardsSkills') }}</UiCardDescription>
            <div class="font-display text-2xl lg:text-3xl">
              {{ skillsSummary.enabled }}/{{ skillsSummary.total }}
            </div>
            <div class="flex items-center text-xs">
              <template v-if="skillsSummary.blocked > 0">
                <span class="font-medium text-destructive">
                  {{ t('openclaw.overviewStatSkillsBlocked', { n: skillsSummary.blocked }) }}
                </span>
              </template>
              <template v-else>
                <ArrowUp
                  v-if="skillsSummary.enabled > 0"
                  class="mr-1 size-3 shrink-0 text-green-500"
                  aria-hidden="true"
                />
                <span
                  class="font-medium" :class="[
                    skillsSummary.enabled > 0 ? 'text-green-500' : 'text-muted-foreground',
                  ]"
                >
                  {{ t('openclaw.overviewStatSkillsActive', { n: skillsSummary.enabled }) }}
                </span>
              </template>
            </div>
          </UiCardHeader>
        </UiCard>
        <UiCard class="cursor-pointer shadow-sm transition-colors hover:bg-muted/50" @click="onNavigate('cron')">
          <UiCardHeader class="space-y-1">
            <UiCardDescription>{{ t('openclaw.overviewStatsCron') }}</UiCardDescription>
            <div class="font-display text-2xl lg:text-3xl">
              <template v-if="cronEnabled == null">
                {{ t('openclaw.overviewNone') }}
              </template>
              <template v-else-if="!cronEnabled">
                {{ t('openclaw.overviewCronDisabled') }}
              </template>
              <template v-else>
                {{ cronJobs.length }} {{ t('openclaw.overviewStatJobs') }}
              </template>
            </div>
            <div class="flex items-center text-xs">
              <template v-if="cronEnabled == null || !cronEnabled">
                <span class="text-muted-foreground">{{ t('openclaw.overviewStatCronIdleCaption') }}</span>
              </template>
              <template v-else-if="cronFailedCount > 0">
                <span class="font-medium text-destructive">{{ cronFailedCount }} {{ t('openclaw.overviewStatFailed') }}</span>
                <span class="ml-1 text-muted-foreground">{{ t('openclaw.overviewCronNextWake') }} {{ formatNextRun(cronNext) }}</span>
              </template>
              <template v-else>
                <span class="font-medium text-green-500">{{ formatNextRun(cronNext) }}</span>
                <span class="ml-1 text-muted-foreground">{{ t('openclaw.overviewStatCronNextCaption') }}</span>
              </template>
            </div>
          </UiCardHeader>
        </UiCard>
      </div>

      <!-- 注意事项：Skills with missing dependencies（与 Control UI 一致） -->
      <UiCard v-if="skillsMissingDeps.length > 0" class="border-amber-200 dark:border-amber-800">
        <UiCardHeader>
          <UiCardTitle class="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <span class="inline-flex size-5 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
              <svg xmlns="http://www.w3.org/2000/svg" class="size-3.5 text-amber-600 dark:text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
              </svg>
            </span>
            {{ t('openclaw.overviewImportantNotes') }}
          </UiCardTitle>
          <UiCardDescription>{{ t('openclaw.overviewSkillsMissingDeps') }}</UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <p class="text-sm text-muted-foreground">
            {{ skillsMissingDepsPreview }}
          </p>
          <UiButton variant="link" class="mt-2 h-auto p-0 text-xs" @click="onNavigate('skills')">
            {{ t('openclaw.overviewViewSkills') }}
          </UiButton>
        </UiCardContent>
      </UiCard>

      <!-- 日志入口：与 timeline 附件行一致 bg-muted/30 + border + 两格相同布局 -->
      <UiCard class="flex flex-col gap-0 overflow-hidden pb-0 shadow-sm">
        <UiCardHeader class="pb-3">
          <UiCardTitle class="text-base">
            {{ t('openclaw.overviewLogSectionTitle') }}
          </UiCardTitle>
          <UiCardDescription>
            {{ t('openclaw.overviewLogSectionDesc') }}
          </UiCardDescription>
        </UiCardHeader>
        <UiCardContent class="px-6 pb-6 pt-0">
          <div class="grid gap-3 sm:grid-cols-2">
            <RouterLink
              v-for="item in logQuickLinks"
              :key="item.titleKey"
              :to="{ name: 'PluginOpenclawLogs' }"
              class="bg-muted/30 hover:bg-muted text-foreground flex items-center gap-3 rounded-lg border p-4 no-underline transition-colors"
            >
              <component :is="item.icon" class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span class="min-w-0 flex-1 truncate font-medium">
                {{ t(item.titleKey) }}
              </span>
              <span class="text-muted-foreground shrink-0 text-sm tabular-nums">
                {{ logLinesCount }} {{ t('openclaw.overviewLogLines') }}
              </span>
            </RouterLink>
          </div>
        </UiCardContent>
      </UiCard>
    </template>
  </div>
</template>
