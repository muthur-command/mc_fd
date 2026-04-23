<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

import {
  ArrowDownToLine,
  BarChart3,
  DollarSign,
  Hash,
  MessageSquare,
  Pin,
  PinOff,
  RefreshCw,
  Users,
} from 'lucide-vue-next'
/**
 * Usage：对齐 Control UI（日期范围、Local/UTC、sessions.usage + usage.cost、导出、会话表）
 * 布局参考 Overview：页头 + 指标卡 + 筛选卡 + 日趋势 + 表格。
 */
import { computed, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { formatCost, formatTokens } from '@/plugin/openclaw/lib/format'
import { RPC } from '@/plugin/openclaw/lib/rpc-methods'

const { t } = useI18n()
const gateway = inject<ReturnType<typeof import('@/plugin/openclaw/composables/use-openclaw-gateway').useOpenClawGateway>>('openclaw-gateway')!

const PIN_KEY = 'openclaw-usage-filters-pinned'

interface UsageEntry {
  key: string
  label?: string
  model?: string
  modelProvider?: string
  providerOverride?: string
  channel?: string
  agentId?: string
  updatedAt?: number
  usage?: {
    input?: number
    output?: number
    cacheRead?: number
    cacheWrite?: number
    totalTokens?: number
    totalCost?: number
    messageCounts?: { total?: number, errors?: number, toolCalls?: number }
    durationMs?: number
  } | null
}

interface UsageResult {
  updatedAt?: number
  startDate?: string
  endDate?: string
  sessions?: UsageEntry[]
  totals?: {
    totalCost?: number
    totalTokens?: number
    input?: number
    output?: number
  }
  aggregates?: {
    messages?: { total?: number }
    daily?: Array<{ date: string, tokens?: number, cost?: number, messages?: number }>
  }
}

interface CostSummary {
  totals?: UsageResult['totals'] & {
    inputCost?: number
    outputCost?: number
    cacheReadCost?: number
    cacheWriteCost?: number
  }
  daily?: Array<{
    date: string
    input?: number
    output?: number
    totalTokens?: number
    totalCost?: number
  }>
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDaysYmd(ymdStr: string, delta: number): string {
  const d = new Date(`${ymdStr}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

function formatUtcOffsetMinutes(offsetMin: number): string {
  const east = -offsetMin
  const sign = east >= 0 ? '+' : '-'
  const abs = Math.abs(east)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(m).padStart(2, '0')}`
}

function buildDateInterp(tz: 'local' | 'utc'): Record<string, string> {
  if (tz === 'utc')
    return { mode: 'utc' }
  return { mode: 'specific', utcOffset: formatUtcOffsetMinutes(new Date().getTimezoneOffset()) }
}

const LEGACY_RE = /invalid sessions\.usage params/i
const LEGACY_MODE = /unexpected property ['"]mode['"]/i
const LEGACY_OFF = /unexpected property ['"]utcoffset['"]/i

function isLegacyDateErr(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return LEGACY_RE.test(msg) && (LEGACY_MODE.test(msg) || LEGACY_OFF.test(msg))
}

const endDate = ref(ymd(new Date()))
const startDate = ref(addDaysYmd(ymd(new Date()), -29))
const timeZone = ref<'local' | 'utc'>('local')
const skipDateInterp = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const usageResult = ref<UsageResult | null>(null)
const costSummary = ref<CostSummary | null>(null)
const search = ref('')
const sortBy = ref<'cost' | 'tokens' | 'recent'>('cost')
const pinned = ref(
  typeof localStorage !== 'undefined' && localStorage.getItem(PIN_KEY) === '1',
)

watch(pinned, (v) => {
  try {
    localStorage.setItem(PIN_KEY, v ? '1' : '0')
  }
  catch {
    /* ignore */
  }
})

function setPreset(days: number) {
  const end = ymd(new Date())
  endDate.value = end
  startDate.value = days <= 1 ? end : addDaysYmd(end, -(days - 1))
}

function baseParams(interp: boolean): Record<string, unknown> {
  const p: Record<string, unknown> = {
    startDate: startDate.value,
    endDate: endDate.value,
  }
  if (interp && !skipDateInterp.value)
    Object.assign(p, buildDateInterp(timeZone.value))
  return p
}

async function load() {
  if (!gateway?.connected)
    return
  loading.value = true
  error.value = null
  const run = async (interp: boolean) => {
    const bp = baseParams(interp)
    const sessionsP = {
      ...bp,
      limit: 1000,
      includeContextWeight: true,
    }
    const [u, c] = await Promise.all([
      gateway.request<UsageResult>(RPC.sessionsUsage, sessionsP),
      gateway.request<CostSummary>(RPC.usageCost, bp).catch(() => null),
    ])
    usageResult.value = u && typeof u === 'object' ? u : null
    costSummary.value = c && typeof c === 'object' ? c : null
  }
  try {
    try {
      await run(true)
    }
    catch (e) {
      if (!skipDateInterp.value && isLegacyDateErr(e)) {
        skipDateInterp.value = true
        await run(false)
      }
      else {
        throw e
      }
    }
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    usageResult.value = null
    costSummary.value = null
  }
  finally {
    loading.value = false
  }
}

const totals = computed(() => usageResult.value?.totals ?? costSummary.value?.totals ?? null)
const msgTotal = computed(() => usageResult.value?.aggregates?.messages?.total ?? 0)
const sessionCount = computed(() => usageResult.value?.sessions?.length ?? 0)
const limitReached = computed(() => sessionCount.value >= 1000)

const dailyForChart = computed(() => {
  const a = usageResult.value?.aggregates?.daily
  if (Array.isArray(a) && a.length > 0) {
    return a.map(d => ({
      date: d.date,
      tokens: d.tokens ?? 0,
      cost: d.cost ?? 0,
    }))
  }
  const d = costSummary.value?.daily
  if (!Array.isArray(d) || !d.length)
    return []
  return d.map(x => ({
    date: x.date,
    tokens: x.totalTokens ?? 0,
    cost: x.totalCost ?? 0,
  }))
})

const maxDailyCost = computed(() => {
  let m = 0
  for (const x of dailyForChart.value) m = Math.max(m, x.cost)
  return m || 1
})

const filteredSessions = computed(() => {
  const rows = usageResult.value?.sessions ?? []
  const q = search.value.trim().toLowerCase()
  if (!q)
    return rows
  return rows.filter((s) => {
    const hay = [s.key, s.label, s.model, s.modelProvider, s.channel, s.agentId]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
})

const sortedSessions = computed(() => {
  const rows = [...filteredSessions.value]
  const by = sortBy.value
  rows.sort((a, b) => {
    const ua = a.usage
    const ub = b.usage
    if (by === 'cost')
      return (ub?.totalCost ?? 0) - (ua?.totalCost ?? 0)
    if (by === 'tokens')
      return (ub?.totalTokens ?? 0) - (ua?.totalTokens ?? 0)
    return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
  })
  return rows
})

function downloadJson() {
  const blob = new Blob([JSON.stringify({ usage: usageResult.value, cost: costSummary.value }, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `openclaw-usage-${startDate.value}_${endDate.value}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

function csvEscape(v: string): string {
  if (/[",\n]/.test(v))
    return `"${v.replaceAll('"', '""')}"`
  return v
}

function downloadCsv() {
  const headers = [
    'key',
    'label',
    'model',
    'provider',
    'channel',
    'inputTokens',
    'outputTokens',
    'totalTokens',
    'totalCost',
    'messages',
    'errors',
    'toolCalls',
  ]
  const lines = [headers.join(',')]
  for (const s of usageResult.value?.sessions ?? []) {
    const u = s.usage
    lines.push(
      [
        s.key,
        s.label ?? '',
        s.model ?? '',
        s.modelProvider ?? s.providerOverride ?? '',
        s.channel ?? '',
        u?.input ?? '',
        u?.output ?? '',
        u?.totalTokens ?? '',
        u?.totalCost ?? '',
        u?.messageCounts?.total ?? '',
        u?.messageCounts?.errors ?? '',
        u?.messageCounts?.toolCalls ?? '',
      ]
        .map(x => csvEscape(String(x)))
        .join(','),
    )
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `openclaw-usage-sessions-${startDate.value}_${endDate.value}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

watch(
  () => gateway?.connected,
  (c) => {
    if (c)
      load()
  },
  { immediate: true },
)

function setSortBy(v: string) {
  if (v === 'cost' || v === 'tokens' || v === 'recent')
    sortBy.value = v
}

watch(timeZone, () => {
  if (gateway?.connected && !skipDateInterp.value)
    load()
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ t('openclaw.usageTitle') }}
      </h1>
      <p class="text-muted-foreground mt-1 text-sm">
        {{ t('openclaw.usagePageDesc') }}
      </p>
    </div>

    <UiCard v-if="!gateway?.connected">
      <UiCardContent class="py-8 text-center text-muted-foreground text-sm">
        {{ t('openclaw.connectFirst') }}
      </UiCardContent>
    </UiCard>

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiCard class="shadow-sm">
          <UiCardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <UiCardDescription>{{ t('openclaw.overviewCardsCost') }}</UiCardDescription>
            <DollarSign class="size-4 text-muted-foreground" />
          </UiCardHeader>
          <UiCardContent>
            <div class="font-display text-2xl font-bold">
              ${{ totals ? formatCost(totals.totalCost) : '0.00' }}
            </div>
          </UiCardContent>
        </UiCard>
        <UiCard class="shadow-sm">
          <UiCardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <UiCardDescription>{{ t('openclaw.usageStatTokens') }}</UiCardDescription>
            <Hash class="size-4 text-muted-foreground" />
          </UiCardHeader>
          <UiCardContent>
            <div class="font-display text-2xl font-bold">
              {{ totals ? formatTokens(totals.totalTokens) : '0' }}
            </div>
          </UiCardContent>
        </UiCard>
        <UiCard class="shadow-sm">
          <UiCardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <UiCardDescription>{{ t('openclaw.overviewStatMsgs') }}</UiCardDescription>
            <MessageSquare class="size-4 text-muted-foreground" />
          </UiCardHeader>
          <UiCardContent>
            <div class="font-display text-2xl font-bold">
              {{ msgTotal }}
            </div>
          </UiCardContent>
        </UiCard>
        <UiCard class="shadow-sm">
          <UiCardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <UiCardDescription>{{ t('openclaw.usageStatSessions') }}</UiCardDescription>
            <Users class="size-4 text-muted-foreground" />
          </UiCardHeader>
          <UiCardContent>
            <div class="font-display text-2xl font-bold">
              {{ sessionCount }}
            </div>
            <p v-if="limitReached" class="text-destructive mt-1 text-xs">
              {{ t('openclaw.usageLimitReached') }}
            </p>
          </UiCardContent>
        </UiCard>
      </div>

      <UiCard
        class="shadow-sm"
        :class="pinned ? 'sticky top-2 z-20 border bg-card/95 shadow-md backdrop-blur-sm' : ''"
      >
        <UiCardHeader class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <UiCardTitle class="text-base">
              {{ t('openclaw.usageFiltersTitle') }}
            </UiCardTitle>
            <UiCardDescription>{{ t('openclaw.usageFiltersDesc') }}</UiCardDescription>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UiButton variant="outline" size="sm" class="gap-1" @click="pinned = !pinned">
              <Pin v-if="!pinned" class="size-3.5" />
              <PinOff v-else class="size-3.5" />
              {{ pinned ? t('openclaw.usageUnpin') : t('openclaw.usagePin') }}
            </UiButton>
            <UiDropdownMenu>
              <UiDropdownMenuTrigger as-child>
                <UiButton variant="outline" size="sm" class="gap-1">
                  <ArrowDownToLine class="size-3.5" />
                  {{ t('openclaw.usageExport') }}
                </UiButton>
              </UiDropdownMenuTrigger>
              <UiDropdownMenuContent align="end">
                <UiDropdownMenuItem :disabled="!usageResult" @click="downloadJson">
                  JSON
                </UiDropdownMenuItem>
                <UiDropdownMenuItem :disabled="!usageResult?.sessions?.length" @click="downloadCsv">
                  CSV ({{ t('openclaw.usageSessions') }})
                </UiDropdownMenuItem>
              </UiDropdownMenuContent>
            </UiDropdownMenu>
            <UiButton size="sm" class="gap-1.5" :disabled="loading" @click="load">
              <RefreshCw class="size-3.5" :class="{ 'animate-spin': loading }" />
              {{ loading ? t('common.loading') : t('openclaw.overviewRefresh') }}
            </UiButton>
          </div>
        </UiCardHeader>
        <UiCardContent class="flex flex-col gap-4">
          <div class="flex flex-wrap gap-2">
            <UiButton variant="secondary" size="sm" @click="setPreset(1)">
              {{ t('openclaw.usagePresetToday') }}
            </UiButton>
            <UiButton variant="secondary" size="sm" @click="setPreset(7)">
              {{ t('openclaw.usagePreset7d') }}
            </UiButton>
            <UiButton variant="secondary" size="sm" @click="setPreset(30)">
              {{ t('openclaw.usagePreset30d') }}
            </UiButton>
          </div>
          <div class="flex flex-wrap items-end gap-4">
            <div class="space-y-1.5">
              <label class="text-muted-foreground text-xs font-medium">{{ t('openclaw.usageStart') }}</label>
              <UiInput v-model="startDate" type="date" class="h-9 w-[160px] font-mono text-sm" />
            </div>
            <div class="space-y-1.5">
              <label class="text-muted-foreground text-xs font-medium">{{ t('openclaw.usageEnd') }}</label>
              <UiInput v-model="endDate" type="date" class="h-9 w-[160px] font-mono text-sm" />
            </div>
            <div class="space-y-1.5">
              <label class="text-muted-foreground text-xs font-medium">{{ t('openclaw.usageTimeZone') }}</label>
              <div class="flex rounded-md border p-0.5">
                <button
                  type="button"
                  class="rounded px-3 py-1.5 text-xs font-medium transition-colors"
                  :class="timeZone === 'local' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'"
                  @click="timeZone = 'local'"
                >
                  {{ t('openclaw.usageLocal') }}
                </button>
                <button
                  type="button"
                  class="rounded px-3 py-1.5 text-xs font-medium transition-colors"
                  :class="timeZone === 'utc' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'"
                  @click="timeZone = 'utc'"
                >
                  UTC
                </button>
              </div>
            </div>
          </div>
          <UiAlert v-if="skipDateInterp" variant="default" class="text-xs">
            {{ t('openclaw.usageLegacyTz') }}
          </UiAlert>
        </UiCardContent>
      </UiCard>

      <UiCard v-if="dailyForChart.length > 0" class="shadow-sm">
        <UiCardHeader>
          <UiCardTitle class="text-base flex items-center gap-2">
            <BarChart3 class="size-4" />
            {{ t('openclaw.usageDailyTitle') }}
          </UiCardTitle>
          <UiCardDescription>{{ t('openclaw.usageDailyDesc') }}</UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <div class="flex h-36 items-end gap-1 overflow-x-auto pb-6 pt-2">
            <div
              v-for="day in dailyForChart"
              :key="day.date"
              class="flex min-w-[28px] flex-1 flex-col items-center gap-1"
            >
              <div
                class="bg-primary/80 w-full max-w-[40px] rounded-t transition-all hover:bg-primary"
                :style="{ height: `${Math.max(6, (day.cost / maxDailyCost) * 120)}px` }"
                :title="`${day.date}: $${formatCost(day.cost)}`"
              />
              <span class="text-muted-foreground origin-top-left -rotate-45 whitespace-nowrap text-[10px]">
                {{ day.date.slice(5) }}
              </span>
            </div>
          </div>
        </UiCardContent>
      </UiCard>

      <UiCard class="shadow-sm overflow-hidden">
        <UiCardHeader>
          <UiCardTitle class="text-base">
            {{ t('openclaw.usageSessionsTable') }}
          </UiCardTitle>
          <UiCardDescription v-if="usageResult?.updatedAt">
            {{ t('openclaw.usageUpdated') }} {{ new Date(usageResult.updatedAt).toLocaleString() }}
          </UiCardDescription>
        </UiCardHeader>
        <UiCardContent class="space-y-4 px-0">
          <UiAlert v-if="error" variant="destructive" class="mx-6">
            {{ error }}
          </UiAlert>
          <div class="flex flex-wrap items-center gap-3 px-6">
            <UiInput
              v-model="search"
              class="max-w-sm"
              :placeholder="t('openclaw.usageSearchSessions')"
            />
            <div class="flex items-center gap-2">
              <span class="text-muted-foreground text-xs">{{ t('openclaw.usageSort') }}</span>
              <select
                class="border-input bg-background h-9 rounded-md border px-2 text-sm"
                :value="sortBy"
                @change="setSortBy(($event.target as HTMLSelectElement).value)"
              >
                <option value="cost">
                  {{ t('openclaw.usageSortCost') }}
                </option>
                <option value="tokens">
                  {{ t('openclaw.usageSortTokens') }}
                </option>
                <option value="recent">
                  {{ t('openclaw.usageSortRecent') }}
                </option>
              </select>
            </div>
          </div>
          <div class="overflow-x-auto border-t">
            <UiTable>
              <UiTableHeader>
                <UiTableRow class="hover:bg-transparent">
                  <UiTableHead>{{ t('openclaw.sessionsKey') }}</UiTableHead>
                  <UiTableHead>{{ t('openclaw.sessionsLabel') }}</UiTableHead>
                  <UiTableHead>{{ t('openclaw.usageColModel') }}</UiTableHead>
                  <UiTableHead>{{ t('openclaw.usageColProvider') }}</UiTableHead>
                  <UiTableHead class="text-right">
                    {{ t('openclaw.sessionsTokens') }}
                  </UiTableHead>
                  <UiTableHead class="text-right">
                    {{ t('openclaw.usageColCost') }}
                  </UiTableHead>
                  <UiTableHead class="text-right">
                    {{ t('openclaw.usageColMsgs') }}
                  </UiTableHead>
                </UiTableRow>
              </UiTableHeader>
              <UiTableBody>
                <UiTableRow v-if="!loading && !sortedSessions.length">
                  <UiTableCell colspan="7" class="text-muted-foreground py-12 text-center text-sm">
                    {{ t('openclaw.noData') }}
                  </UiTableCell>
                </UiTableRow>
                <UiTableRow v-for="s in sortedSessions" :key="s.key">
                  <UiTableCell class="max-w-[200px] font-mono text-xs break-all">
                    <RouterLink
                      :to="{ name: 'PluginOpenclawChat', query: { session: s.key } } as unknown as RouteLocationRaw"
                      class="text-primary hover:underline"
                    >
                      {{ s.key }}
                    </RouterLink>
                  </UiTableCell>
                  <UiTableCell class="text-sm">
                    {{ s.label || '—' }}
                  </UiTableCell>
                  <UiTableCell class="max-w-[140px] truncate text-xs">
                    {{ s.model || '—' }}
                  </UiTableCell>
                  <UiTableCell class="text-xs">
                    {{ s.modelProvider || s.providerOverride || '—' }}
                  </UiTableCell>
                  <UiTableCell class="text-right font-mono text-xs">
                    {{ s.usage?.totalTokens != null ? formatTokens(s.usage.totalTokens) : '—' }}
                  </UiTableCell>
                  <UiTableCell class="text-right font-mono text-xs">
                    {{ s.usage?.totalCost != null ? `$${formatCost(s.usage.totalCost)}` : '—' }}
                  </UiTableCell>
                  <UiTableCell class="text-right text-xs">
                    {{ s.usage?.messageCounts?.total ?? '—' }}
                    <span
                      v-if="(s.usage?.messageCounts?.errors ?? 0) > 0"
                      class="text-destructive ml-1"
                    >
                      ({{ s.usage?.messageCounts?.errors }} {{ t('openclaw.usageErrors') }})
                    </span>
                  </UiTableCell>
                </UiTableRow>
              </UiTableBody>
            </UiTable>
          </div>
        </UiCardContent>
      </UiCard>
    </template>
  </div>
</template>
