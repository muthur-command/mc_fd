<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

import { Database, MessagesSquare, MoreHorizontal, RefreshCw } from 'lucide-vue-next'
/**
 * Sessions：对齐 openclaw Control UI sessions.ts + sessions controller
 * 页头与双列卡参考 Overview / Instances；表格含筛选、排序、分页、下拉补丁与删除。
 */
import { computed, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { formatAgo } from '@/plugin/openclaw/lib/format'
import { RPC } from '@/plugin/openclaw/lib/rpc-methods'

const { t } = useI18n()
const gateway = inject<ReturnType<typeof import('@/plugin/openclaw/composables/use-openclaw-gateway').useOpenClawGateway>>('openclaw-gateway')!

interface SessionRow {
  key: string
  kind?: string
  label?: string | null
  displayName?: string | null
  updatedAt?: number | null
  thinkingLevel?: string | null
  fastMode?: boolean | null
  verboseLevel?: string | null
  reasoningLevel?: string | null
  modelProvider?: string | null
  totalTokens?: number | null
  contextTokens?: number | null
  inputTokens?: number | null
  outputTokens?: number | null
}

const THINK_LEVELS = ['', 'off', 'minimal', 'low', 'medium', 'high', 'xhigh'] as const
const BINARY_THINK = ['', 'off', 'on'] as const
const VERBOSE_LEVELS = [
  { value: '', labelKey: 'openclaw.sessionsInherit' as const },
  { value: 'off', labelKey: 'openclaw.sessionsVerboseOff' as const },
  { value: 'on', labelKey: 'openclaw.sessionsVerboseOn' as const },
  { value: 'full', labelKey: 'openclaw.sessionsVerboseFull' as const },
]
const FAST_LEVELS = [
  { value: '', labelKey: 'openclaw.sessionsInherit' as const },
  { value: 'on', labelKey: 'openclaw.sessionsFastOn' as const },
  { value: 'off', labelKey: 'openclaw.sessionsFastOff' as const },
]
const REASONING_LEVELS = ['', 'off', 'on', 'stream'] as const
const PAGE_SIZES = [10, 25, 50, 100] as const

function toNum(s: string, fb: number): number {
  const n = Number(String(s).trim())
  return Number.isFinite(n) ? n : fb
}

function normProvider(p?: string | null): string {
  if (!p)
    return ''
  const x = p.trim().toLowerCase()
  if (x === 'z.ai' || x === 'z-ai')
    return 'zai'
  return x
}

function isBinaryThink(p?: string | null): boolean {
  return normProvider(p) === 'zai'
}

function thinkDisplay(raw: string, binary: boolean): string {
  if (!binary)
    return raw
  if (!raw || raw === 'off')
    return raw
  return 'on'
}

function thinkPatchVal(v: string, binary: boolean): string | null {
  if (!v)
    return null
  if (!binary)
    return v
  if (v === 'on')
    return 'low'
  return v
}

function formatTokens(row: SessionRow): string {
  if (row.totalTokens == null)
    return t('openclaw.overviewNone')
  const ctx = row.contextTokens
  return ctx != null && ctx > 0 ? `${row.totalTokens} / ${ctx}` : String(row.totalTokens)
}

const loading = ref(false)
const error = ref<string | null>(null)
const result = ref<{ path?: string, sessions?: SessionRow[] } | null>(null)
const activeMinutes = ref('')
const limit = ref('120')
const includeGlobal = ref(true)
const includeUnknown = ref(false)
const searchQuery = ref('')
const sortColumn = ref<'key' | 'kind' | 'updated' | 'tokens'>('updated')
const sortDir = ref<'asc' | 'desc'>('desc')
const page = ref(0)
const pageSize = ref(25)

function listParams(): Record<string, unknown> {
  const params: Record<string, unknown> = {
    includeGlobal: includeGlobal.value,
    includeUnknown: includeUnknown.value,
  }
  const am = toNum(activeMinutes.value, 0)
  const lim = toNum(limit.value, 0)
  if (am > 0)
    params.activeMinutes = Math.floor(am)
  if (lim > 0)
    params.limit = Math.floor(lim)
  return params
}

async function load() {
  if (!gateway?.connected)
    return
  loading.value = true
  error.value = null
  try {
    const res = await gateway.request<{ path?: string, sessions?: SessionRow[] }>(
      RPC.sessionsList,
      listParams(),
    )
    result.value = res && typeof res === 'object' ? res : null
    page.value = 0
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    result.value = null
  }
  finally {
    loading.value = false
  }
}

async function onPatch(
  key: string,
  patch: {
    label?: string | null
    thinkingLevel?: string | null
    fastMode?: boolean | null
    verboseLevel?: string | null
    reasoningLevel?: string | null
  },
) {
  if (!gateway?.connected)
    return
  try {
    await gateway.request(RPC.sessionsPatch, { key, ...patch })
    await load()
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

async function onDelete(key: string) {
  if (!gateway?.connected)
    return
  try {
    await gateway.request(RPC.sessionsDelete, { key, deleteTranscript: true })
    await load()
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

const rawRows = computed(() => result.value?.sessions ?? [])

const filteredRows = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q)
    return rawRows.value
  return rawRows.value.filter((row) => {
    const key = (row.key ?? '').toLowerCase()
    const label = (row.label ?? '').toLowerCase()
    const kind = (row.kind ?? '').toLowerCase()
    const dn = (row.displayName ?? '').toLowerCase()
    return key.includes(q) || label.includes(q) || kind.includes(q) || dn.includes(q)
  })
})

const sortedRows = computed(() => {
  const rows = [...filteredRows.value]
  const cmp = sortDir.value === 'asc' ? 1 : -1
  const col = sortColumn.value
  rows.sort((a, b) => {
    let d = 0
    if (col === 'key') {
      d = (a.key ?? '').localeCompare(b.key ?? '')
    }
    else if (col === 'kind') {
      d = (a.kind ?? '').localeCompare(b.kind ?? '')
    }
    else if (col === 'updated') {
      d = (a.updatedAt ?? 0) - (b.updatedAt ?? 0)
    }
    else {
      const at = a.totalTokens ?? a.inputTokens ?? a.outputTokens ?? 0
      const bt = b.totalTokens ?? b.inputTokens ?? b.outputTokens ?? 0
      d = at - bt
    }
    return d * cmp
  })
  return rows
})

const totalRows = computed(() => sortedRows.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize.value)))
const safePage = computed(() => Math.min(page.value, totalPages.value - 1))
const paginatedRows = computed(() => {
  const p = safePage.value
  const sz = pageSize.value
  return sortedRows.value.slice(p * sz, p * sz + sz)
})

function toggleSort(col: typeof sortColumn.value) {
  if (sortColumn.value === col) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  }
  else {
    sortColumn.value = col
    sortDir.value = col === 'key' || col === 'kind' ? 'asc' : 'desc'
  }
}

function thinkSelectOptions(row: SessionRow): string[] {
  const binary = isBinaryThink(row.modelProvider)
  const base = binary ? [...BINARY_THINK] : [...THINK_LEVELS]
  const v = binary ? thinkDisplay(row.thinkingLevel ?? '', true) : (row.thinkingLevel ?? '')
  if (v && !(base as string[]).includes(v))
    return [...base, v]
  return base as string[]
}

function kindBadgeClass(kind: string | undefined): string {
  switch (kind) {
    case 'direct':
      return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
    case 'group':
      return 'bg-blue-500/15 text-blue-800 dark:text-blue-300'
    case 'global':
      return 'bg-muted text-muted-foreground'
    default:
      return 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
  }
}

watch(
  () => gateway?.connected,
  (c) => {
    if (c)
      load()
  },
  { immediate: true },
)

watch(pageSize, () => {
  page.value = 0
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ t('openclaw.sessionsTitle') }}
      </h1>
      <p class="text-muted-foreground mt-1 text-sm">
        {{ t('openclaw.sessionsPageDesc') }}
      </p>
    </div>

    <UiCard v-if="!gateway?.connected">
      <UiCardContent class="flex flex-col items-center justify-center gap-2 py-8">
        <p class="text-muted-foreground text-sm">
          {{ t('openclaw.connectFirst') }}
        </p>
      </UiCardContent>
    </UiCard>

    <template v-else>
      <div class="grid gap-4 md:grid-cols-2">
        <UiCard class="shadow-sm">
          <UiCardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <UiCardTitle class="text-sm font-medium">
              {{ t('openclaw.sessionsSummaryTitle') }}
            </UiCardTitle>
            <MessagesSquare class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </UiCardHeader>
          <UiCardContent class="space-y-2">
            <div class="font-display text-3xl font-bold tabular-nums">
              {{ rawRows.length }}
            </div>
            <p v-if="result?.path" class="text-muted-foreground flex items-start gap-2 text-xs">
              <Database class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span class="break-all">{{ t('openclaw.sessionsStorage') }}: {{ result.path }}</span>
            </p>
            <p v-else class="text-muted-foreground text-xs">
              {{ t('openclaw.sessionsDesc') }}
            </p>
          </UiCardContent>
        </UiCard>

        <UiCard class="shadow-sm">
          <UiCardHeader class="flex flex-row items-center justify-between space-y-0">
            <div>
              <UiCardTitle class="text-base">
                {{ t('openclaw.sessionsFiltersTitle') }}
              </UiCardTitle>
              <UiCardDescription>{{ t('openclaw.sessionsFiltersDesc') }}</UiCardDescription>
            </div>
            <UiButton size="sm" class="shrink-0 gap-1.5" :disabled="loading" @click="load">
              <RefreshCw class="size-3.5" :class="{ 'animate-spin': loading }" aria-hidden="true" />
              {{ loading ? t('common.loading') : t('openclaw.overviewRefresh') }}
            </UiButton>
          </UiCardHeader>
          <UiCardContent class="flex flex-wrap items-end gap-4">
            <div class="space-y-1.5">
              <label class="text-muted-foreground text-xs font-medium">{{ t('openclaw.sessionsActiveMinutes') }}</label>
              <UiInput v-model="activeMinutes" class="h-9 w-24 font-mono text-sm" placeholder="min" />
            </div>
            <div class="space-y-1.5">
              <label class="text-muted-foreground text-xs font-medium">{{ t('openclaw.sessionsLimit') }}</label>
              <UiInput v-model="limit" class="h-9 w-24 font-mono text-sm" type="text" />
            </div>
            <div class="flex items-center gap-2 pt-5">
              <UiCheckbox
                id="sg"
                :checked="includeGlobal"
                @update:checked="(v: boolean | 'indeterminate') => { includeGlobal = !!v }"
              />
              <label for="sg" class="text-sm">{{ t('openclaw.sessionsIncludeGlobal') }}</label>
            </div>
            <div class="flex items-center gap-2 pt-5">
              <UiCheckbox
                id="su"
                :checked="includeUnknown"
                @update:checked="(v: boolean | 'indeterminate') => { includeUnknown = !!v }"
              />
              <label for="su" class="text-sm">{{ t('openclaw.sessionsIncludeUnknown') }}</label>
            </div>
          </UiCardContent>
        </UiCard>
      </div>

      <UiCard class="shadow-sm overflow-hidden">
        <UiCardHeader class="pb-3">
          <UiCardTitle class="text-base">
            {{ t('openclaw.sessionsTableTitle') }}
          </UiCardTitle>
        </UiCardHeader>
        <UiCardContent class="space-y-4 px-0 pb-6">
          <UiAlert v-if="error" variant="destructive" class="mx-6">
            {{ error }}
          </UiAlert>

          <div class="px-6">
            <UiInput
              v-model="searchQuery"
              class="max-w-md"
              :placeholder="t('openclaw.sessionsSearchPlaceholder')"
            />
          </div>

          <div class="overflow-x-auto border-t">
            <UiTable>
              <UiTableHeader>
                <UiTableRow class="hover:bg-transparent">
                  <UiTableHead class="whitespace-nowrap">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      @click="toggleSort('key')"
                    >
                      {{ t('openclaw.sessionsKey') }}
                      <span v-if="sortColumn === 'key'" class="text-xs text-muted-foreground">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                    </button>
                  </UiTableHead>
                  <UiTableHead>{{ t('openclaw.sessionsLabel') }}</UiTableHead>
                  <UiTableHead>
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      @click="toggleSort('kind')"
                    >
                      {{ t('openclaw.sessionsKind') }}
                      <span v-if="sortColumn === 'kind'" class="text-xs text-muted-foreground">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                    </button>
                  </UiTableHead>
                  <UiTableHead>
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      @click="toggleSort('updated')"
                    >
                      {{ t('openclaw.sessionsUpdated') }}
                      <span v-if="sortColumn === 'updated'" class="text-xs text-muted-foreground">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                    </button>
                  </UiTableHead>
                  <UiTableHead>
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      @click="toggleSort('tokens')"
                    >
                      {{ t('openclaw.sessionsTokens') }}
                      <span v-if="sortColumn === 'tokens'" class="text-xs text-muted-foreground">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                    </button>
                  </UiTableHead>
                  <UiTableHead>{{ t('openclaw.sessionsThinking') }}</UiTableHead>
                  <UiTableHead>{{ t('openclaw.sessionsFast') }}</UiTableHead>
                  <UiTableHead>{{ t('openclaw.sessionsVerbose') }}</UiTableHead>
                  <UiTableHead>{{ t('openclaw.sessionsReasoning') }}</UiTableHead>
                  <UiTableHead class="w-14" />
                </UiTableRow>
              </UiTableHeader>
              <UiTableBody>
                <UiTableRow v-if="!loading && paginatedRows.length === 0">
                  <UiTableCell colspan="10" class="text-muted-foreground py-12 text-center text-sm">
                    {{ t('openclaw.sessionsNone') }}
                  </UiTableCell>
                </UiTableRow>
                <UiTableRow v-for="row in paginatedRows" :key="row.key">
                  <UiTableCell class="max-w-[220px] align-top">
                    <div class="font-mono text-xs break-all">
                      <RouterLink
                        v-if="row.kind !== 'global'"
                        :to="{ name: 'PluginOpenclawChat', query: { session: row.key } } as unknown as RouteLocationRaw"
                        class="text-primary hover:underline"
                      >
                        {{ row.key }}
                      </RouterLink>
                      <span v-else>{{ row.key }}</span>
                    </div>
                    <div
                      v-if="
                        row.displayName
                          && row.displayName !== row.key
                          && row.displayName !== (row.label ?? '').trim()
                      "
                      class="text-muted-foreground mt-0.5 text-xs"
                    >
                      {{ row.displayName }}
                    </div>
                  </UiTableCell>
                  <UiTableCell class="align-top">
                    <input
                      class="border-input bg-background h-8 w-[140px] max-w-full rounded-md border px-2 text-xs"
                      :value="row.label ?? ''"
                      :placeholder="t('openclaw.sessionsLabelOptional')"
                      :disabled="loading"
                      @change="(e) => onPatch(row.key, { label: (e.target as HTMLInputElement).value.trim() || null })"
                    >
                  </UiTableCell>
                  <UiTableCell class="align-top">
                    <span
                      class="inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize"
                      :class="kindBadgeClass(row.kind)"
                    >
                      {{ row.kind ?? '—' }}
                    </span>
                  </UiTableCell>
                  <UiTableCell class="text-muted-foreground whitespace-nowrap text-xs align-top">
                    {{ row.updatedAt != null ? formatAgo(row.updatedAt) : t('openclaw.overviewNone') }}
                  </UiTableCell>
                  <UiTableCell class="font-mono text-xs align-top">
                    {{ formatTokens(row) }}
                  </UiTableCell>
                  <UiTableCell class="align-top">
                    <select
                      class="border-input bg-background h-8 max-w-[100px] rounded-md border px-2 text-xs"
                      :disabled="loading"
                      :value="thinkDisplay(row.thinkingLevel ?? '', isBinaryThink(row.modelProvider))"
                      @change="
                        (e) =>
                          onPatch(row.key, {
                            thinkingLevel: thinkPatchVal((e.target as HTMLSelectElement).value, isBinaryThink(row.modelProvider)),
                          })
                      "
                    >
                      <option
                        v-for="lvl in thinkSelectOptions(row)"
                        :key="lvl"
                        :value="lvl"
                      >
                        {{ lvl || t('openclaw.sessionsInherit') }}
                      </option>
                    </select>
                  </UiTableCell>
                  <UiTableCell class="align-top">
                    <select
                      class="border-input bg-background h-8 max-w-[100px] rounded-md border px-2 text-xs"
                      :disabled="loading"
                      :value="row.fastMode === true ? 'on' : row.fastMode === false ? 'off' : ''"
                      @change="
                        (e) => {
                          const v = (e.target as HTMLSelectElement).value
                          onPatch(row.key, { fastMode: v === '' ? null : v === 'on' })
                        }
                      "
                    >
                      <option
                        v-for="opt in FAST_LEVELS"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ t(opt.labelKey) }}
                      </option>
                    </select>
                  </UiTableCell>
                  <UiTableCell class="align-top">
                    <select
                      class="border-input bg-background h-8 max-w-[100px] rounded-md border px-2 text-xs"
                      :disabled="loading"
                      :value="row.verboseLevel ?? ''"
                      @change="
                        (e) =>
                          onPatch(row.key, {
                            verboseLevel: (e.target as HTMLSelectElement).value || null,
                          })
                      "
                    >
                      <option
                        v-for="opt in VERBOSE_LEVELS"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ t(opt.labelKey) }}
                      </option>
                    </select>
                  </UiTableCell>
                  <UiTableCell class="align-top">
                    <select
                      class="border-input bg-background h-8 max-w-[100px] rounded-md border px-2 text-xs"
                      :disabled="loading"
                      :value="row.reasoningLevel ?? ''"
                      @change="
                        (e) =>
                          onPatch(row.key, {
                            reasoningLevel: (e.target as HTMLSelectElement).value || null,
                          })
                      "
                    >
                      <option v-for="lvl in REASONING_LEVELS" :key="lvl" :value="lvl">
                        {{ lvl || t('openclaw.sessionsInherit') }}
                      </option>
                    </select>
                  </UiTableCell>
                  <UiTableCell class="align-top">
                    <UiDropdownMenu>
                      <UiDropdownMenuTrigger as-child>
                        <UiButton variant="ghost" size="icon" class="size-8">
                          <MoreHorizontal class="size-4" />
                        </UiButton>
                      </UiDropdownMenuTrigger>
                      <UiDropdownMenuContent align="end" class="w-44">
                        <UiDropdownMenuItem v-if="row.kind !== 'global'" as-child>
                          <RouterLink
                            :to="{ name: 'PluginOpenclawChat', query: { session: row.key } } as unknown as RouteLocationRaw"
                            class="w-full cursor-pointer"
                          >
                            {{ t('openclaw.sessionsOpenChat') }}
                          </RouterLink>
                        </UiDropdownMenuItem>
                        <UiDropdownMenuItem
                          class="text-destructive focus:text-destructive"
                          @click="onDelete(row.key)"
                        >
                          {{ t('openclaw.sessionsDelete') }}
                        </UiDropdownMenuItem>
                      </UiDropdownMenuContent>
                    </UiDropdownMenu>
                  </UiTableCell>
                </UiTableRow>
              </UiTableBody>
            </UiTable>
          </div>

          <div
            v-if="totalRows > 0"
            class="text-muted-foreground flex flex-wrap items-center justify-between gap-3 px-6 text-sm"
          >
            <span>
              {{ safePage * pageSize + 1 }}-{{ Math.min((safePage + 1) * pageSize, totalRows) }}
              {{ t('openclaw.sessionsPaginationOf') }} {{ totalRows }}
            </span>
            <div class="flex flex-wrap items-center gap-2">
              <select
                class="border-input bg-background h-8 rounded-md border px-2 text-xs"
                :value="pageSize"
                @change="pageSize = Number((($event.target as HTMLSelectElement).value))"
              >
                <option v-for="s in PAGE_SIZES" :key="s" :value="s">
                  {{ s }} {{ t('openclaw.sessionsPerPage') }}
                </option>
              </select>
              <UiButton variant="outline" size="sm" :disabled="safePage <= 0" @click="page = safePage - 1">
                {{ t('openclaw.sessionsPrevious') }}
              </UiButton>
              <UiButton
                variant="outline"
                size="sm"
                :disabled="safePage >= totalPages - 1"
                @click="page = safePage + 1"
              >
                {{ t('openclaw.sessionsNext') }}
              </UiButton>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </template>
  </div>
</template>
