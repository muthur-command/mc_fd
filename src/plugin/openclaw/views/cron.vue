<script setup lang="ts">
import {
  AlarmClock,
  CalendarClock,
  ChevronDown,
  ListChecks,
  Play,
  RefreshCw,
  Trash2,
} from 'lucide-vue-next'
/**
 * Cron：对齐 Control UI（cron.status + cron.list 筛选/排序/分页、运行记录）
 * 布局参考 Overview：页头、三指标卡、筛选条、任务表、可选运行日志。
 */
import { computed, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { formatAgo, formatDurationMs, formatMs, formatNextRun } from '@/plugin/openclaw/lib/format'
import { RPC } from '@/plugin/openclaw/lib/rpc-methods'

const { t } = useI18n()
const gateway = inject<ReturnType<typeof import('@/plugin/openclaw/composables/use-openclaw-gateway').useOpenClawGateway>>('openclaw-gateway')!

interface CronSchedule {
  kind: string
  at?: string
  everyMs?: number
  expr?: string
  tz?: string
}

interface CronJob {
  id: string
  name: string
  enabled: boolean
  schedule: CronSchedule
  state?: {
    lastStatus?: string
    nextRunAtMs?: number
    lastRunAtMs?: number
  }
}

interface CronStatus {
  enabled?: boolean
  jobs?: number
  nextWakeAtMs?: number | null
}

interface CronListResult {
  jobs: CronJob[]
  total?: number
  limit?: number
  offset?: number
  nextOffset?: number | null
  hasMore?: boolean
}

interface RunEntry {
  ts: number
  status?: string
  durationMs?: number
  error?: string
  summary?: string
  deliveryStatus?: string
}

function formatCronSchedule(job: CronJob): string {
  const s = job.schedule
  if (!s)
    return '—'
  if (s.kind === 'at' && s.at) {
    const ms = Date.parse(s.at)
    return Number.isFinite(ms) ? `${t('openclaw.cronAt')} ${formatMs(ms)}` : String(s.at)
  }
  if (s.kind === 'every' && s.everyMs != null) {
    return `${t('openclaw.cronEvery')} ${formatDurationMs(s.everyMs)}`
  }
  if (s.kind === 'cron' && s.expr) {
    return `Cron ${s.expr}${s.tz ? ` (${s.tz})` : ''}`
  }
  return s.kind ?? '—'
}

const status = ref<CronStatus | null>(null)
const jobs = ref<CronJob[]>([])
const total = ref(0)
const nextOffset = ref<number | null>(null)
const hasMore = ref(false)
const limit = 50

const loading = ref(false)
const loadingMore = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)

const query = ref('')
const enabledFilter = ref<'all' | 'enabled' | 'disabled'>('all')
const scheduleKind = ref<'all' | 'at' | 'every' | 'cron'>('all')
const lastStatusFilter = ref<'all' | 'ok' | 'error' | 'skipped'>('all')
const sortBy = ref<'nextRunAtMs' | 'updatedAtMs' | 'name'>('nextRunAtMs')
const sortDir = ref<'asc' | 'desc'>('asc')

const runsJobId = ref<string | null>(null)
const runsJobName = ref('')
const runs = ref<RunEntry[]>([])
const runsLoading = ref(false)

const visibleJobs = computed(() =>
  jobs.value.filter((job) => {
    if (scheduleKind.value !== 'all' && job.schedule?.kind !== scheduleKind.value)
      return false
    const st = job.state?.lastStatus
    if (lastStatusFilter.value !== 'all' && st !== lastStatusFilter.value)
      return false
    return true
  }),
)

async function loadStatus() {
  if (!gateway?.connected)
    return
  try {
    const res = await gateway.request<CronStatus>(RPC.cronStatus, {})
    status.value = res && typeof res === 'object' ? res : null
  }
  catch {
    status.value = null
  }
}

async function loadJobs(append: boolean) {
  if (!gateway?.connected)
    return
  if (append) {
    if (!hasMore.value || loadingMore.value)
      return
    loadingMore.value = true
  }
  else {
    loading.value = true
  }
  error.value = null
  const offset = append ? (nextOffset.value ?? jobs.value.length) : 0
  try {
    const res = await gateway.request<CronListResult>(RPC.cronList, {
      includeDisabled: enabledFilter.value === 'all',
      enabled: enabledFilter.value,
      limit,
      offset,
      query: query.value.trim() || undefined,
      sortBy: sortBy.value,
      sortDir: sortDir.value,
    })
    const list = Array.isArray(res?.jobs) ? res.jobs : []
    jobs.value = append ? [...jobs.value, ...list] : list
    const t0 = typeof res?.total === 'number' && Number.isFinite(res.total) ? res.total : jobs.value.length
    total.value = Math.max(t0, jobs.value.length)
    hasMore.value = res?.hasMore === true || (typeof res?.nextOffset === 'number' && res.nextOffset > offset)
    nextOffset.value
      = typeof res?.nextOffset === 'number' ? res.nextOffset : hasMore.value ? offset + list.length : null
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    if (!append)
      jobs.value = []
  }
  finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function refresh() {
  await loadStatus()
  await loadJobs(false)
}

async function toggleEnabled(job: CronJob, enabled: boolean) {
  if (!gateway?.connected || busy.value)
    return
  busy.value = true
  try {
    await gateway.request(RPC.cronUpdate, { id: job.id, patch: { enabled } })
    await refresh()
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    busy.value = false
  }
}

async function runJob(job: CronJob, mode: 'force' | 'due' = 'due') {
  if (!gateway?.connected || busy.value)
    return
  busy.value = true
  try {
    await gateway.request(RPC.cronRun, { id: job.id, mode })
    await refresh()
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    busy.value = false
  }
}

async function removeJob(job: CronJob) {
  if (!gateway?.connected || busy.value)
    return
  busy.value = true
  try {
    await gateway.request(RPC.cronRemove, { id: job.id })
    if (runsJobId.value === job.id) {
      runsJobId.value = null
      runs.value = []
    }
    await refresh()
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    busy.value = false
  }
}

async function openRuns(job: CronJob) {
  if (!gateway?.connected)
    return
  runsJobId.value = job.id
  runsJobName.value = job.name || job.id
  runsLoading.value = true
  runs.value = []
  try {
    const res = await gateway.request<{ entries?: RunEntry[] }>(RPC.cronRuns, {
      id: job.id,
      limit: 40,
    })
    runs.value = Array.isArray(res?.entries) ? res.entries : []
  }
  catch {
    runs.value = []
  }
  finally {
    runsLoading.value = false
  }
}

function setSort(col: typeof sortBy.value) {
  if (sortBy.value === col) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  }
  else {
    sortBy.value = col
    sortDir.value = col === 'name' ? 'asc' : 'asc'
  }
  loadJobs(false)
}

watch(
  () => gateway?.connected,
  (c) => {
    if (c)
      refresh()
  },
  { immediate: true },
)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ t('openclaw.cronTitle') }}
      </h1>
      <p class="text-muted-foreground mt-1 text-sm">
        {{ t('openclaw.cronPageDesc') }}
      </p>
    </div>

    <UiCard v-if="!gateway?.connected">
      <UiCardContent class="py-8 text-center text-muted-foreground text-sm">
        {{ t('openclaw.connectFirst') }}
      </UiCardContent>
    </UiCard>

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-3">
        <UiCard class="shadow-sm">
          <UiCardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <UiCardDescription>{{ t('openclaw.cronEnabled') }}</UiCardDescription>
            <ListChecks class="size-4 text-muted-foreground" />
          </UiCardHeader>
          <UiCardContent>
            <div
              class="text-2xl font-bold"
              :class="status?.enabled ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground'"
            >
              {{ status?.enabled ? t('openclaw.cronYes') : t('openclaw.cronNo') }}
            </div>
          </UiCardContent>
        </UiCard>
        <UiCard class="shadow-sm">
          <UiCardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <UiCardDescription>{{ t('openclaw.cronJobsCount') }}</UiCardDescription>
            <CalendarClock class="size-4 text-muted-foreground" />
          </UiCardHeader>
          <UiCardContent>
            <div class="font-display text-2xl font-bold tabular-nums">
              {{ status?.jobs ?? total }}
            </div>
          </UiCardContent>
        </UiCard>
        <UiCard class="shadow-sm">
          <UiCardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <UiCardDescription>{{ t('openclaw.cronNextWake') }}</UiCardDescription>
            <AlarmClock class="size-4 text-muted-foreground" />
          </UiCardHeader>
          <UiCardContent>
            <div class="text-sm font-medium leading-snug">
              {{
                status?.nextWakeAtMs != null
                  ? formatNextRun(status.nextWakeAtMs)
                  : t('openclaw.overviewNone')
              }}
            </div>
          </UiCardContent>
        </UiCard>
      </div>

      <UiCard class="shadow-sm">
        <UiCardHeader class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <UiCardTitle class="text-base">
              {{ t('openclaw.cronFiltersTitle') }}
            </UiCardTitle>
            <UiCardDescription>{{ t('openclaw.cronFiltersDesc') }}</UiCardDescription>
          </div>
          <UiButton size="sm" class="shrink-0 gap-1.5" :disabled="loading" @click="refresh">
            <RefreshCw class="size-3.5" :class="{ 'animate-spin': loading }" />
            {{ loading ? t('common.loading') : t('openclaw.overviewRefresh') }}
          </UiButton>
        </UiCardHeader>
        <UiCardContent class="flex flex-col gap-4">
          <UiInput
            v-model="query"
            class="max-w-md"
            :placeholder="t('openclaw.cronSearchPlaceholder')"
            @keydown.enter="loadJobs(false)"
          />
          <div class="flex flex-wrap gap-3">
            <div class="space-y-1">
              <span class="text-muted-foreground text-xs">{{ t('openclaw.cronFilterEnabled') }}</span>
              <select
                class="border-input bg-background h-9 rounded-md border px-2 text-sm"
                :value="enabledFilter"
                @change="
                  enabledFilter = ($event.target as HTMLSelectElement).value as typeof enabledFilter;
                  loadJobs(false)
                "
              >
                <option value="all">
                  {{ t('openclaw.cronAll') }}
                </option>
                <option value="enabled">
                  {{ t('openclaw.cronEnabledOnly') }}
                </option>
                <option value="disabled">
                  {{ t('openclaw.cronDisabledOnly') }}
                </option>
              </select>
            </div>
            <div class="space-y-1">
              <span class="text-muted-foreground text-xs">{{ t('openclaw.cronFilterSchedule') }}</span>
              <select
                class="border-input bg-background h-9 rounded-md border px-2 text-sm capitalize"
                :value="scheduleKind"
                @change="scheduleKind = ($event.target as HTMLSelectElement).value as typeof scheduleKind"
              >
                <option value="all">
                  {{ t('openclaw.cronAll') }}
                </option>
                <option value="at">
                  At
                </option>
                <option value="every">
                  Every
                </option>
                <option value="cron">
                  Cron
                </option>
              </select>
            </div>
            <div class="space-y-1">
              <span class="text-muted-foreground text-xs">{{ t('openclaw.cronFilterLastRun') }}</span>
              <select
                class="border-input bg-background h-9 rounded-md border px-2 text-sm capitalize"
                :value="lastStatusFilter"
                @change="lastStatusFilter = ($event.target as HTMLSelectElement).value as typeof lastStatusFilter"
              >
                <option value="all">
                  {{ t('openclaw.cronAll') }}
                </option>
                <option value="ok">
                  ok
                </option>
                <option value="error">
                  error
                </option>
                <option value="skipped">
                  skipped
                </option>
              </select>
            </div>
            <UiButton variant="secondary" size="sm" class="self-end" @click="loadJobs(false)">
              {{ t('openclaw.cronApplyFilters') }}
            </UiButton>
          </div>
          <p class="text-muted-foreground text-xs">
            {{ visibleJobs.length }} {{ t('openclaw.cronShownOf') }} {{ jobs.length }}
            <template v-if="total > jobs.length">
              ({{ t('openclaw.cronTotalListed') }} {{ total }})
            </template>
          </p>
        </UiCardContent>
      </UiCard>

      <UiCard class="shadow-sm overflow-hidden">
        <UiCardHeader>
          <UiCardTitle class="text-base">
            {{ t('openclaw.cronJobsTable') }}
          </UiCardTitle>
        </UiCardHeader>
        <UiCardContent class="px-0">
          <UiAlert v-if="error" variant="destructive" class="mx-6 mb-4">
            {{ error }}
          </UiAlert>
          <div class="overflow-x-auto border-t">
            <UiTable>
              <UiTableHeader>
                <UiTableRow class="hover:bg-transparent">
                  <UiTableHead>
                    <button type="button" class="inline-flex items-center gap-1 font-medium hover:underline" @click="setSort('name')">
                      {{ t('openclaw.cronColName') }}
                      <span v-if="sortBy === 'name'" class="text-xs">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                    </button>
                  </UiTableHead>
                  <UiTableHead>{{ t('openclaw.cronId') }}</UiTableHead>
                  <UiTableHead>{{ t('openclaw.cronSchedule') }}</UiTableHead>
                  <UiTableHead>{{ t('openclaw.cronColEnabled') }}</UiTableHead>
                  <UiTableHead>{{ t('openclaw.cronColLast') }}</UiTableHead>
                  <UiTableHead>
                    <button type="button" class="inline-flex items-center gap-1 font-medium hover:underline" @click="setSort('nextRunAtMs')">
                      {{ t('openclaw.cronColNext') }}
                      <span v-if="sortBy === 'nextRunAtMs'" class="text-xs">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                    </button>
                  </UiTableHead>
                  <UiTableHead class="text-right w-[220px]">
                    {{ t('openclaw.sessionsActions') }}
                  </UiTableHead>
                </UiTableRow>
              </UiTableHeader>
              <UiTableBody>
                <UiTableRow v-if="!loading && visibleJobs.length === 0">
                  <UiTableCell colspan="7" class="text-muted-foreground py-12 text-center text-sm">
                    {{ t('openclaw.cronNoJobs') }}
                  </UiTableCell>
                </UiTableRow>
                <UiTableRow v-for="job in visibleJobs" :key="job.id">
                  <UiTableCell class="max-w-[160px] truncate font-medium">
                    {{ job.name || '—' }}
                  </UiTableCell>
                  <UiTableCell class="font-mono text-xs">
                    {{ job.id }}
                  </UiTableCell>
                  <UiTableCell class="max-w-[220px] text-sm">
                    {{ formatCronSchedule(job) }}
                  </UiTableCell>
                  <UiTableCell>
                    <UiSwitch
                      :checked="job.enabled"
                      :disabled="busy"
                      @update:checked="(v: boolean) => toggleEnabled(job, v)"
                    />
                  </UiTableCell>
                  <UiTableCell class="text-xs capitalize">
                    <span
                      :class="{
                        'text-green-600': job.state?.lastStatus === 'ok',
                        'text-destructive': job.state?.lastStatus === 'error',
                        'text-muted-foreground': job.state?.lastStatus === 'skipped',
                      }"
                    >
                      {{ job.state?.lastStatus ?? '—' }}
                    </span>
                  </UiTableCell>
                  <UiTableCell class="text-muted-foreground whitespace-nowrap text-xs">
                    {{
                      job.state?.nextRunAtMs != null
                        ? formatAgo(job.state.nextRunAtMs)
                        : t('openclaw.overviewNone')
                    }}
                  </UiTableCell>
                  <UiTableCell>
                    <div class="flex flex-wrap justify-end gap-1">
                      <UiButton size="sm" variant="outline" :disabled="busy" @click="runJob(job, 'due')">
                        <Play class="size-3.5" />
                        {{ t('openclaw.cronRunDue') }}
                      </UiButton>
                      <UiButton size="sm" variant="secondary" :disabled="busy" @click="runJob(job, 'force')">
                        {{ t('openclaw.cronRunForce') }}
                      </UiButton>
                      <UiButton size="sm" variant="ghost" @click="openRuns(job)">
                        {{ t('openclaw.cronRuns') }}
                      </UiButton>
                      <UiButton size="sm" variant="ghost" class="text-destructive" :disabled="busy" @click="removeJob(job)">
                        <Trash2 class="size-3.5" />
                      </UiButton>
                    </div>
                  </UiTableCell>
                </UiTableRow>
              </UiTableBody>
            </UiTable>
          </div>
          <div v-if="hasMore" class="flex justify-center border-t p-4">
            <UiButton variant="outline" :disabled="loadingMore" @click="loadJobs(true)">
              <ChevronDown class="mr-1 size-4" />
              {{ loadingMore ? t('common.loading') : t('openclaw.cronLoadMore') }}
            </UiButton>
          </div>
        </UiCardContent>
      </UiCard>

      <UiCard v-if="runsJobId" class="shadow-sm">
        <UiCardHeader>
          <UiCardTitle class="text-base">
            {{ t('openclaw.cronRunsTitle') }}: {{ runsJobName }}
          </UiCardTitle>
          <UiButton variant="ghost" size="sm" class="w-fit" @click="runsJobId = null">
            {{ t('openclaw.cronCloseRuns') }}
          </UiButton>
        </UiCardHeader>
        <UiCardContent>
          <div v-if="runsLoading" class="text-muted-foreground text-sm">
            {{ t('common.loading') }}
          </div>
          <UiTable v-else-if="runs.length">
            <UiTableHeader>
              <UiTableRow>
                <UiTableHead>{{ t('openclaw.cronRunTime') }}</UiTableHead>
                <UiTableHead>{{ t('openclaw.cronRunStatus') }}</UiTableHead>
                <UiTableHead>{{ t('openclaw.cronRunDuration') }}</UiTableHead>
                <UiTableHead>{{ t('openclaw.cronRunSummary') }}</UiTableHead>
              </UiTableRow>
            </UiTableHeader>
            <UiTableBody>
              <UiTableRow v-for="(r, i) in runs" :key="i">
                <UiTableCell class="text-xs">
                  {{ formatMs(r.ts) }}
                </UiTableCell>
                <UiTableCell class="text-xs capitalize">
                  {{ r.status ?? '—' }}
                </UiTableCell>
                <UiTableCell class="text-xs">
                  {{ r.durationMs != null ? `${r.durationMs}ms` : '—' }}
                </UiTableCell>
                <UiTableCell class="max-w-md truncate text-xs">
                  {{ r.summary || r.error || '—' }}
                </UiTableCell>
              </UiTableRow>
            </UiTableBody>
          </UiTable>
          <p v-else class="text-muted-foreground text-sm">
            {{ t('openclaw.cronNoRuns') }}
          </p>
        </UiCardContent>
      </UiCard>
    </template>
  </div>
</template>
