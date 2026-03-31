<script lang="ts" setup>
import { Clock, Cpu, Database, HardDrive, Hash, MemoryStick, Server, Users } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

import type { RedisMonitorResult, ServerMonitorResult } from '@/services/api/monitor.api'

/**
 * 系统监控 - 插件视图（原 Dashboard System Monitor 移植至 src/plugin/system-monitor）
 */
import { BasicPage } from '@/components/global-layout'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { getRedisMonitorApi, getServerMonitorApi } from '@/services/api/monitor.api'

const { t } = useI18n()

const loading = ref(false)
const serverData = ref<Partial<ServerMonitorResult>>({})
const redisData = ref<RedisMonitorResult | null>(null)

/** 定时刷新：仅在本页挂载时运行，离开页面清除 */
const autoRefreshEnabled = ref(true)
const REFRESH_INTERVAL_OPTIONS = ['1', '5', '10', '30', '60'] as const
const refreshIntervalSeconds = ref<string>('10')
let refreshTimerId: ReturnType<typeof setInterval> | null = null

function startRefreshTimer() {
  stopRefreshTimer()
  if (!autoRefreshEnabled.value)
    return
  const sec = Number(refreshIntervalSeconds.value) || 10
  refreshTimerId = setInterval(() => {
    fetchServerData(true)
  }, sec * 1000)
}

function stopRefreshTimer() {
  if (refreshTimerId) {
    clearInterval(refreshTimerId)
    refreshTimerId = null
  }
}

const cpu = computed(() => serverData.value.cpu ?? {}) as ComputedRef<Record<string, number | undefined>>
const mem = computed(() => serverData.value.mem ?? {}) as ComputedRef<Record<string, number | undefined>>
const sys = computed(() => serverData.value.sys ?? {}) as ComputedRef<Record<string, unknown>>
const diskList = computed(() => (serverData.value.disk ?? []) as Record<string, unknown>[])

const cpuUsage = computed(() => cpu.value?.usage ?? 0)
const memUsage = computed(() => mem.value?.usage ?? 0)
const diskUsageFirst = computed(() => {
  const first = diskList.value[0]
  if (!first?.usage)
    return 0
  const p = Number.parseFloat(String(first.usage))
  return Number.isNaN(p) ? 0 : p
})

/** 与插件页一致：字符串哈希 */
function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++)
    h = Math.imul(31, h) + s.charCodeAt(i)
  return Math.abs(h)
}

/** 与插件页一致：三层 HSL 径向渐变弥散背景 */
function getCardBackgroundStyle(cardKey: string): { background: string } {
  const seed = hashString(cardKey)
  const h1 = (seed % 360)
  const h2 = (seed * 7 + 137) % 360
  const h3 = (seed * 13 + 241) % 360
  const s1 = 50 + (seed % 36)
  const s2 = 48 + ((seed >> 4) % 32)
  const s3 = 45 + ((seed >> 8) % 30)
  const l1 = 52 + (seed % 16)
  const l2 = 48 + ((seed >> 8) % 17)
  const l3 = 55 + ((seed >> 12) % 14)
  return {
    background: [
      `radial-gradient(ellipse 90% 70% at 15% 20%, hsl(${h1}, ${s1}%, ${l1}%), transparent 65%)`,
      `radial-gradient(ellipse 80% 60% at 85% 80%, hsl(${h2}, ${s2}%, ${l2}%), transparent 60%)`,
      `radial-gradient(ellipse 70% 80% at 50% 50%, hsl(${h3}, ${s3}%, ${l3}%), transparent 55%)`,
    ].join(', '),
  }
}

/** z-0 层背景：四张主卡片 + 六张 Redis 卡片，各自用三层 HSL 径向渐变 */
const cardBgStyles: Record<string, { background: string }> = {
  cpu: getCardBackgroundStyle('cpu'),
  memory: getCardBackgroundStyle('memory'),
  disk: getCardBackgroundStyle('disk'),
  system: getCardBackgroundStyle('system'),
  redisVersion: getCardBackgroundStyle('redisVersion'),
  redisUptime: getCardBackgroundStyle('redisUptime'),
  redisClients: getCardBackgroundStyle('redisClients'),
  redisMemoryUsed: getCardBackgroundStyle('redisMemoryUsed'),
  redisMaxMemory: getCardBackgroundStyle('redisMaxMemory'),
  redisKeys: getCardBackgroundStyle('redisKeys'),
}

/** 进度条统一使用主题色 primary */
const progressBarClass = 'h-2 [&_[data-slot=progress-indicator]]:bg-primary'

/** @param silent 为 true 时不置 loading，用于定时刷新，避免页面闪烁 */
async function fetchServerData(silent = false) {
  if (!silent)
    loading.value = true
  try {
    const [res, redis] = await Promise.all([
      getServerMonitorApi(),
      getRedisMonitorApi().catch(() => null),
    ])
    serverData.value = res ?? {}
    redisData.value = redis ?? null
  }
  catch (e) {
    console.error(e)
  }
  finally {
    if (!silent)
      loading.value = false
  }
}

/** Redis info 字段（后端 RedisServerInfo，含 uptime_seconds 数字供 i18n 格式化） */
const redisInfo = computed(() => redisData.value?.info as Record<string, string | number> | undefined)

/** 将秒数拆分为天/时/分/秒 */
function uptimeParts(seconds: number): { days: number, hours: number, minutes: number, seconds: number } {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return { days, hours, minutes, seconds: secs }
}

/** Redis 运行时长展示：优先用 uptime_seconds 按当前语言格式化，否则回退后端字符串 */
const redisUptimeDisplay = computed(() => {
  const info = redisData.value?.info as Record<string, unknown> | undefined
  if (!info)
    return '—'
  const raw = info.uptime_seconds
  if (typeof raw === 'number') {
    const { days, hours, minutes, seconds } = uptimeParts(raw)
    return t('systemMonitor.redisUptimeFormat', { days, hours, minutes, seconds })
  }
  return (info.uptime_in_seconds as string) ?? '—'
})

watch([autoRefreshEnabled, refreshIntervalSeconds], () => {
  if (autoRefreshEnabled.value)
    startRefreshTimer()
  else stopRefreshTimer()
})

onMounted(() => {
  fetchServerData()
  if (autoRefreshEnabled.value)
    startRefreshTimer()
})

onUnmounted(() => {
  stopRefreshTimer()
})
</script>

<template>
  <BasicPage :title="t('systemMonitor.title')" :description="t('systemMonitor.description')">
    <template #actions>
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch v-model:checked="autoRefreshEnabled" />
          <span>{{ t('systemMonitor.autoRefresh') }}</span>
        </label>
        <div class="flex items-center gap-2">
          <span class="text-muted-foreground text-sm">{{ t('systemMonitor.refreshEvery') }}</span>
          <UiSelect v-model:model-value="refreshIntervalSeconds">
            <UiSelectTrigger class="h-8 w-[110px]">
              <UiSelectValue />
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectItem
                v-for="sec in REFRESH_INTERVAL_OPTIONS"
                :key="sec"
                :value="sec"
              >
                {{ sec === '1' ? t('systemMonitor.every1s') : sec === '5' ? t('systemMonitor.every5s') : sec === '10' ? t('systemMonitor.every10s') : sec === '30' ? t('systemMonitor.every30s') : t('systemMonitor.every60s') }}
              </UiSelectItem>
            </UiSelectContent>
          </UiSelect>
        </div>
      </div>
    </template>
    <div class="space-y-4">
      <!-- 第一行：4 张统计卡片 -->
      <div class="space-y-2">
        <h3 class="text-muted-foreground text-sm font-medium">
          {{ t('systemMonitor.platformOverview') }}
        </h3>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <!-- CPU -->
          <Card class="relative flex h-full flex-col overflow-hidden pb-6">
            <div class="absolute inset-0 z-0 rounded-xl" :style="cardBgStyles.cpu" />
            <div class="absolute inset-0 z-[1] rounded-xl bg-card/90" />
            <div class="relative z-10 flex min-h-0 flex-1 flex-col gap-6">
              <CardHeader>
                <CardTitle>
                  {{ t('systemMonitor.cpu') }}
                </CardTitle>
                <CardAction>
                  <span class="text-card-foreground">
                    <Cpu class="size-6" />
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent v-if="loading" class="py-8 text-center text-sm text-muted-foreground">
                {{ t('pluginSystem.loading') }}
              </CardContent>
              <CardContent v-else class="space-y-4">
                <div class="font-display text-2xl lg:text-3xl">
                  {{ cpu?.usage != null ? `${cpu.usage}${t('systemMonitor.unitPercent')}` : '—' }}
                </div>
                <div class="space-y-2">
                  <div class="text-muted-foreground text-sm">
                    {{ cpu?.current_freq != null ? `${cpu.current_freq} ${t('systemMonitor.unitMhz')}` : '' }}
                    {{ cpu?.logical_num != null ? ` · ${t('systemMonitor.logicalCores', { n: cpu.logical_num })}` : '—' }}
                  </div>
                  <Progress :model-value="cpuUsage" :class="progressBarClass" />
                  <div class="text-muted-foreground text-sm">
                    {{ t('systemMonitor.usedPercent', { p: cpu?.usage ?? '—' }) }}
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          <!-- Memory -->
          <Card class="relative flex h-full flex-col overflow-hidden pb-6">
            <div class="absolute inset-0 z-0 rounded-xl" :style="cardBgStyles.memory" />
            <div class="absolute inset-0 z-[1] rounded-xl bg-card/90" />
            <div class="relative z-10 flex min-h-0 flex-1 flex-col gap-6">
              <CardHeader>
                <CardTitle>
                  {{ t('systemMonitor.memory') }}
                </CardTitle>
                <CardAction>
                  <span class="text-card-foreground">
                    <MemoryStick class="size-6" />
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent v-if="loading" class="py-8 text-center text-sm text-muted-foreground">
                {{ t('pluginSystem.loading') }}
              </CardContent>
              <CardContent v-else class="space-y-4">
                <div class="font-display text-2xl lg:text-3xl">
                  {{ mem?.usage != null ? `${mem.usage}${t('systemMonitor.unitPercent')}` : '—' }}
                </div>
                <div class="space-y-2">
                  <div class="text-muted-foreground text-sm">
                    {{ mem?.used != null && mem?.total != null ? t('systemMonitor.usedOfTotal', { used: mem.used, total: mem.total }) : '—' }}
                  </div>
                  <Progress :model-value="memUsage" :class="progressBarClass" />
                  <div class="text-muted-foreground text-sm">
                    {{ t('systemMonitor.usedPercent', { p: mem?.usage ?? '—' }) }}
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          <!-- Disk -->
          <Card class="relative flex h-full flex-col overflow-hidden pb-6">
            <div class="absolute inset-0 z-0 rounded-xl" :style="cardBgStyles.disk" />
            <div class="absolute inset-0 z-[1] rounded-xl bg-card/90" />
            <div class="relative z-10 flex min-h-0 flex-1 flex-col gap-6">
              <CardHeader>
                <CardTitle>
                  {{ t('systemMonitor.disk') }}
                </CardTitle>
                <CardAction>
                  <span class="text-card-foreground">
                    <HardDrive class="size-6" />
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent v-if="loading" class="py-8 text-center text-sm text-muted-foreground">
                {{ t('pluginSystem.loading') }}
              </CardContent>
              <CardContent v-else class="space-y-4">
                <div class="font-display text-2xl lg:text-3xl">
                  {{ diskList.length > 0 ? t('systemMonitor.partitions', { n: diskList.length }) : '—' }}
                </div>
                <div class="space-y-2">
                  <div class="text-muted-foreground text-sm">
                    {{ diskList.length > 0 && diskList[0]?.used != null && diskList[0]?.total != null ? `${diskList[0].used} / ${diskList[0].total}` : '—' }}
                  </div>
                  <Progress :model-value="diskUsageFirst" :class="progressBarClass" />
                  <div class="text-muted-foreground text-sm">
                    {{ diskList.length > 0 ? t('systemMonitor.usedPercent', { p: diskList[0]?.usage ?? '—' }) : '—' }}
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          <!-- System -->
          <Card class="relative flex h-full flex-col overflow-hidden pb-6">
            <div class="absolute inset-0 z-0 rounded-xl" :style="cardBgStyles.system" />
            <div class="absolute inset-0 z-[1] rounded-xl bg-card/90" />
            <div class="relative z-10 flex min-h-0 flex-1 flex-col gap-6">
              <CardHeader>
                <CardTitle>
                  {{ t('systemMonitor.system') }}
                </CardTitle>
                <CardAction>
                  <span class="text-card-foreground">
                    <Server class="size-6" />
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent v-if="loading" class="py-8 text-center text-sm text-muted-foreground">
                {{ t('pluginSystem.loading') }}
              </CardContent>
              <CardContent v-else class="space-y-4">
                <div class="font-display text-2xl lg:text-3xl leading-tight truncate">
                  {{ (sys?.name as string) ?? '—' }}
                </div>
                <div class="space-y-2">
                  <div class="text-muted-foreground text-sm">
                    {{ sys?.os && sys?.arch ? `${sys.os} · ${sys.arch}` : (sys?.ip ?? '') || '—' }}
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </div>

      <!-- Redis 概览 -->
      <div class="space-y-2">
        <h3 class="text-muted-foreground text-sm font-medium">
          {{ t('systemMonitor.redisOverview') }}
        </h3>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <!-- Redis 版本 -->
          <Card class="relative flex h-full flex-col overflow-hidden pb-6">
            <div class="absolute inset-0 z-0 rounded-xl" :style="cardBgStyles.redisVersion" />
            <div class="absolute inset-0 z-[1] rounded-xl bg-card/90" />
            <div class="relative z-10 flex min-h-0 flex-1 flex-col gap-6">
              <CardHeader>
                <CardTitle class="text-red-600 dark:text-red-400">
                  Redis
                </CardTitle>
                <CardAction>
                  <span class="text-card-foreground">
                    <Database class="size-6" />
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent v-if="loading" class="py-8 text-center text-sm text-muted-foreground">
                {{ t('pluginSystem.loading') }}
              </CardContent>
              <CardContent v-else class="space-y-4">
                <div class="font-display text-2xl lg:text-3xl">
                  {{ redisInfo?.redis_version ?? '—' }}
                </div>
              </CardContent>
            </div>
          </Card>
          <!-- 运行时长 -->
          <Card class="relative flex h-full flex-col overflow-hidden pb-6">
            <div class="absolute inset-0 z-0 rounded-xl" :style="cardBgStyles.redisUptime" />
            <div class="absolute inset-0 z-[1] rounded-xl bg-card/90" />
            <div class="relative z-10 flex min-h-0 flex-1 flex-col gap-6">
              <CardHeader>
                <CardTitle>
                  {{ t('systemMonitor.redisUptime') }}
                </CardTitle>
                <CardAction>
                  <span class="text-card-foreground">
                    <Clock class="size-6" />
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent v-if="loading" class="py-8 text-center text-sm text-muted-foreground">
                {{ t('pluginSystem.loading') }}
              </CardContent>
              <CardContent v-else class="space-y-4">
                <div class="font-display text-2xl lg:text-3xl">
                  {{ redisUptimeDisplay }}
                </div>
              </CardContent>
            </div>
          </Card>
          <!-- 连接数 -->
          <Card class="relative flex h-full flex-col overflow-hidden pb-6">
            <div class="absolute inset-0 z-0 rounded-xl" :style="cardBgStyles.redisClients" />
            <div class="absolute inset-0 z-[1] rounded-xl bg-card/90" />
            <div class="relative z-10 flex min-h-0 flex-1 flex-col gap-6">
              <CardHeader>
                <CardTitle>
                  {{ t('systemMonitor.redisConnectedClients') }}
                </CardTitle>
                <CardAction>
                  <span class="text-card-foreground">
                    <Users class="size-6" />
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent v-if="loading" class="py-8 text-center text-sm text-muted-foreground">
                {{ t('pluginSystem.loading') }}
              </CardContent>
              <CardContent v-else class="space-y-4">
                <div class="font-display text-2xl lg:text-3xl text-primary">
                  {{ redisInfo?.connected_clients ?? '—' }}
                </div>
              </CardContent>
            </div>
          </Card>
          <!-- 已用内存 -->
          <Card class="relative flex h-full flex-col overflow-hidden pb-6">
            <div class="absolute inset-0 z-0 rounded-xl" :style="cardBgStyles.redisMemoryUsed" />
            <div class="absolute inset-0 z-[1] rounded-xl bg-card/90" />
            <div class="relative z-10 flex min-h-0 flex-1 flex-col gap-6">
              <CardHeader>
                <CardTitle>
                  {{ t('systemMonitor.redisMemoryUsed') }}
                </CardTitle>
                <CardAction>
                  <span class="text-card-foreground">
                    <MemoryStick class="size-6" />
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent v-if="loading" class="py-8 text-center text-sm text-muted-foreground">
                {{ t('pluginSystem.loading') }}
              </CardContent>
              <CardContent v-else class="space-y-4">
                <div class="font-display text-2xl lg:text-3xl text-primary">
                  {{ redisInfo?.used_memory_human ?? '—' }}
                </div>
              </CardContent>
            </div>
          </Card>
          <!-- 最大内存 -->
          <Card class="relative flex h-full flex-col overflow-hidden pb-6">
            <div class="absolute inset-0 z-0 rounded-xl" :style="cardBgStyles.redisMaxMemory" />
            <div class="absolute inset-0 z-[1] rounded-xl bg-card/90" />
            <div class="relative z-10 flex min-h-0 flex-1 flex-col gap-6">
              <CardHeader>
                <CardTitle>
                  {{ t('systemMonitor.redisMaxMemory') }}
                </CardTitle>
                <CardAction>
                  <span class="text-card-foreground">
                    <HardDrive class="size-6" />
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent v-if="loading" class="py-8 text-center text-sm text-muted-foreground">
                {{ t('pluginSystem.loading') }}
              </CardContent>
              <CardContent v-else class="space-y-4">
                <div class="font-display text-2xl lg:text-3xl">
                  {{ redisInfo?.maxmemory_human ?? '0 B' }}
                </div>
              </CardContent>
            </div>
          </Card>
          <!-- 键总数 -->
          <Card class="relative flex h-full flex-col overflow-hidden pb-6">
            <div class="absolute inset-0 z-0 rounded-xl" :style="cardBgStyles.redisKeys" />
            <div class="absolute inset-0 z-[1] rounded-xl bg-card/90" />
            <div class="relative z-10 flex min-h-0 flex-1 flex-col gap-6">
              <CardHeader>
                <CardTitle>
                  {{ t('systemMonitor.redisKeys') }}
                </CardTitle>
                <CardAction>
                  <span class="text-card-foreground">
                    <Hash class="size-6" />
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent v-if="loading" class="py-8 text-center text-sm text-muted-foreground">
                {{ t('pluginSystem.loading') }}
              </CardContent>
              <CardContent v-else class="space-y-4">
                <div class="font-display text-2xl lg:text-3xl">
                  {{ redisInfo?.keys_num ?? '—' }}
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </div>
    </div>
  </BasicPage>
</template>
