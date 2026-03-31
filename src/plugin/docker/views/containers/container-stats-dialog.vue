<script setup lang="ts">
import { VisArea, VisAxis, VisLine, VisXYContainer } from '@unovis/vue'
import { HelpCircle } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { ChartConfig } from '@/components/ui/chart'
import type { ContainerStatsResponse } from '@/plugin/docker/api'

import { Card, CardContent } from '@/components/ui/card'
import {
  ChartContainer,
  ChartCrosshair,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  componentToString,
} from '@/components/ui/chart'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const props = defineProps<{
  open: boolean
  containerId: string | undefined
}>()

const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const { t } = useI18n()

// WebSocket
const stats = ref<ContainerStatsResponse | null>(null)
const ws = ref<WebSocket | null>(null)
const connected = ref(false)
const reconnectTimer = ref<number | null>(null)
const isManualDisconnect = ref(false)
const connectionError = ref<string | null>(null)
const reconnectAttempts = ref(0)
const maxReconnectAttempts = 5

// History (max 60 points) — include date for Unovis charts
interface StatsDataPoint {
  date: Date
  time: string
  cpu: number
  memory: number
  networkRx: number
  networkTx: number
  ioRead: number
  ioWrite: number
}
type DataPoint = StatsDataPoint
const maxDataPoints = 60
const historyData = ref<StatsDataPoint[]>([])

const bytesToMB = (bytes: number) => bytes / (1024 * 1024)
const formatTime = (date: Date) => date.toLocaleTimeString('zh-CN', { hour12: false })
function timeLabelFormatter(d: number | Date) {
  return new Date(d).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function addDataPoint(statsData: ContainerStatsResponse) {
  const now = new Date()
  historyData.value.push({
    date: now,
    time: formatTime(now),
    cpu: statsData.cpu_percent ?? 0,
    memory: bytesToMB(statsData.memory_usage ?? 0),
    networkRx: bytesToMB(statsData.network_rx ?? 0),
    networkTx: bytesToMB(statsData.network_tx ?? 0),
    ioRead: bytesToMB(statsData.io_read ?? 0),
    ioWrite: bytesToMB(statsData.io_write ?? 0),
  })
  if (historyData.value.length > maxDataPoints)
    historyData.value.shift()
}

// Chart configs (same pattern as overview-chart)
const memoryChartConfig = {
  memory: { label: t('docker.containers.stats.memoryUsage'), color: 'var(--chart-1)' },
} satisfies ChartConfig

const cpuChartConfig = {
  cpu: { label: t('docker.containers.stats.cpuUsage'), color: 'var(--chart-1)' },
} satisfies ChartConfig

const networkChartConfig = {
  networkRx: { label: t('docker.containers.stats.rxOnEth0'), color: 'var(--chart-1)' },
  networkTx: { label: t('docker.containers.stats.txOnEth0'), color: 'var(--chart-2)' },
} satisfies ChartConfig

const ioChartConfig = {
  ioRead: { label: t('docker.containers.stats.readAggregate'), color: 'var(--chart-2)' },
  ioWrite: { label: t('docker.containers.stats.writeAggregate'), color: 'var(--chart-1)' },
} satisfies ChartConfig

const memorySvgDefs = `
  <linearGradient id="fillMemory" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stop-color="var(--color-memory)" stop-opacity="0.8" />
    <stop offset="95%" stop-color="var(--color-memory)" stop-opacity="0.1" />
  </linearGradient>
`
const cpuSvgDefs = `
  <linearGradient id="fillCpu" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stop-color="var(--color-cpu)" stop-opacity="0.8" />
    <stop offset="95%" stop-color="var(--color-cpu)" stop-opacity="0.1" />
  </linearGradient>
`
const networkSvgDefs = `
  <linearGradient id="fillNetworkRx" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stop-color="var(--color-networkRx)" stop-opacity="0.8" />
    <stop offset="95%" stop-color="var(--color-networkRx)" stop-opacity="0.1" />
  </linearGradient>
  <linearGradient id="fillNetworkTx" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stop-color="var(--color-networkTx)" stop-opacity="0.8" />
    <stop offset="95%" stop-color="var(--color-networkTx)" stop-opacity="0.1" />
  </linearGradient>
`
const ioSvgDefs = `
  <linearGradient id="fillIoRead" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stop-color="var(--color-ioRead)" stop-opacity="0.8" />
    <stop offset="95%" stop-color="var(--color-ioRead)" stop-opacity="0.1" />
  </linearGradient>
  <linearGradient id="fillIoWrite" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stop-color="var(--color-ioWrite)" stop-opacity="0.8" />
    <stop offset="95%" stop-color="var(--color-ioWrite)" stop-opacity="0.1" />
  </linearGradient>
`

// Y 轴完全按当前数据动态范围：无数据时用默认，有数据时取实际最大值 + 约 15% 留白，避免大片空白
const memoryYDomain = computed(() => {
  const data = historyData.value
  if (!data.length)
    return [0, 100]
  const max = Math.max(0, ...data.map(d => d.memory))
  const top = max <= 0 ? 1 : Math.ceil(max * 1.15)
  return [0, top]
})
const cpuYDomain = computed(() => {
  const data = historyData.value
  if (!data.length)
    return [0, 100]
  const max = Math.max(0, ...data.map(d => d.cpu))
  const top = max <= 0 ? 1 : Math.min(100, Math.ceil(max * 1.15))
  return [0, top]
})
const networkYDomain = computed(() => {
  const data = historyData.value
  if (!data.length)
    return [0, 10]
  const values = data.flatMap(d => [d.networkRx, d.networkTx])
  const max = values.length ? Math.max(0, ...values) : 0
  const top = max <= 0 ? 0.1 : Math.max(0.1, Number((max * 1.15).toFixed(2)))
  return [0, top]
})
const ioYDomain = computed(() => {
  const data = historyData.value
  if (!data.length)
    return [0, 10]
  const values = data.flatMap(d => [d.ioRead, d.ioWrite])
  const max = values.length ? Math.max(0, ...values) : 0
  const top = max <= 0 ? 0.1 : Math.max(0.1, Number((max * 1.15).toFixed(2)))
  return [0, top]
})

function disconnectWebSocket() {
  isManualDisconnect.value = true
  if (reconnectTimer.value !== null) {
    clearTimeout(reconnectTimer.value)
    reconnectTimer.value = null
  }
  if (ws.value) {
    try {
      if (ws.value.readyState === WebSocket.OPEN) {
        try {
          ws.value.send(JSON.stringify({ action: 'stop' }))
          setTimeout(() => {
            ws.value?.close(1000, 'Dialog closed')
          }, 100)
        }
        catch {
          ws.value.close(1000, 'Dialog closed')
        }
      }
      else {
        ws.value.close(1000, 'Dialog closed')
      }
    }
    catch (e) {
      console.error('[WebSocket] disconnect error', e)
    }
    ws.value = null
  }
  connected.value = false
  stats.value = null
  reconnectAttempts.value = 0
  connectionError.value = null
}

function connectWebSocket() {
  if (!props.containerId)
    return
  if (reconnectAttempts.value >= maxReconnectAttempts) {
    connectionError.value = t('docker.containers.stats.connectionFailed', { max: maxReconnectAttempts })
    return
  }
  if (ws.value && (ws.value.readyState === WebSocket.CONNECTING || ws.value.readyState === WebSocket.OPEN)) {
    disconnectWebSocket()
    setTimeout(() => {
      isManualDisconnect.value = false
      connectionError.value = null
      connectWebSocket()
    }, 300)
    return
  }
  isManualDisconnect.value = false
  connectionError.value = null

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/api/v1/docker/containers/${props.containerId}/stats`

  try {
    ws.value = new WebSocket(wsUrl)
    ws.value.addEventListener('open', () => {
      connected.value = true
      reconnectAttempts.value = 0
      connectionError.value = null
      try {
        ws.value?.send(JSON.stringify({ action: 'start' }))
      }
      catch (e) {
        console.error('[WebSocket] start send error', e)
      }
    })
    ws.value.addEventListener('message', (event: MessageEvent) => {
      try {
        const wsMessage = JSON.parse(event.data)
        switch (wsMessage.type) {
          case 'control':
            break
          case 'error':
            connectionError.value = t('docker.containers.stats.serverError', { message: wsMessage.message })
            console.error('WebSocket error:', wsMessage.message)
            break
          case 'stats':
            stats.value = wsMessage.data
            addDataPoint(wsMessage.data)
            break
        }
      }
      catch (e) {
        console.error('Parse WebSocket message failed', e)
      }
    })
    ws.value.addEventListener('close', () => {
      connected.value = false
      if (!isManualDisconnect.value && reconnectTimer.value === null && reconnectAttempts.value < maxReconnectAttempts) {
        reconnectAttempts.value += 1
        connectionError.value = t('docker.containers.stats.connectionDisconnected', { current: reconnectAttempts.value, max: maxReconnectAttempts })
        reconnectTimer.value = window.setTimeout(() => {
          reconnectTimer.value = null
          connectWebSocket()
        }, 3000)
      }
      else if (reconnectAttempts.value >= maxReconnectAttempts) {
        connectionError.value = t('docker.containers.stats.connectionFailed', { max: maxReconnectAttempts })
      }
    })
    ws.value.addEventListener('error', () => {
      connectionError.value = t('docker.containers.stats.connectionFailed', { max: maxReconnectAttempts })
    })
  }
  catch (e) {
    console.error('[WebSocket] create failed', e)
    connectionError.value = t('docker.containers.stats.connectionFailed', { max: maxReconnectAttempts })
  }
}

watch(
  () => [props.open, props.containerId] as const,
  ([newOpen, newId], oldPair) => {
    const [, oldId] = oldPair ?? [undefined, undefined]
    if (!newOpen) {
      disconnectWebSocket()
      historyData.value = []
      return
    }
    if (!newId)
      return
    const containerChanged = oldId != null && oldId !== newId
    if (containerChanged) {
      historyData.value = []
      disconnectWebSocket()
      setTimeout(() => {
        if (props.open && props.containerId)
          connectWebSocket()
      }, 300)
    }
    else {
      historyData.value = []
      nextTick(() => connectWebSocket())
    }
  },
  { immediate: true },
)

onBeforeUnmount(disconnectWebSocket)
onUnmounted(disconnectWebSocket)
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="max-w-[calc(100%-2rem)] sm:max-w-6xl max-h-[85vh] flex flex-col gap-4 p-6"
      :show-close-button="true"
    >
      <DialogHeader class="gap-1.5 text-left">
        <DialogTitle>{{ t('docker.containers.modals.statsTitle') }}</DialogTitle>
        <p class="text-muted-foreground text-sm">
          {{ t('docker.containers.stats.aboutStatistics') }} · {{ t('docker.containers.stats.realTimeUpdate') }}
        </p>
      </DialogHeader>

      <div class="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
        <!-- Connection status -->
        <section class="flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div class="flex items-center gap-2 text-sm">
            <span v-if="connectionError" class="text-destructive">{{ connectionError }}</span>
            <span v-else-if="connected" class="flex items-center gap-1.5 text-green-600 dark:text-green-500">
              <span class="size-2 rounded-full bg-current" />
              {{ t('docker.containers.stats.realTimeUpdate') }}
            </span>
            <span v-else class="text-muted-foreground">{{ t('docker.containers.stats.connecting') }}</span>
          </div>
          <div class="flex items-center gap-1.5 text-muted-foreground text-sm">
            <span>{{ t('docker.containers.stats.refreshRate') }}</span>
            <span class="tabular-nums">5s</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <span class="inline-flex text-muted-foreground"><HelpCircle class="size-4" /></span>
                </TooltipTrigger>
                <TooltipContent>
                  {{ t('docker.containers.stats.aboutStatistics') }}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </section>

        <!-- Charts grid: ChartContainer + Unovis (same as Projects Overview) -->
        <div v-if="connected" class="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto sm:grid-cols-2">
          <Card class="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <CardContent class="flex min-h-0 flex-1 flex-col p-2 sm:p-4">
              <ChartContainer :config="memoryChartConfig" class="min-h-0 w-full flex-1" :cursor="false">
                <VisXYContainer
                  :data="historyData"
                  :svg-defs="memorySvgDefs"
                  :margin="{ left: 0 }"
                  :y-domain="memoryYDomain"
                >
                  <VisArea
                    :x="(d: DataPoint) => d.date"
                    :y="[(d: DataPoint) => d.memory]"
                    :color="() => ['url(#fillMemory)']"
                    :opacity="0.6"
                  />
                  <VisLine
                    :x="(d: DataPoint) => d.date"
                    :y="[(d: DataPoint) => d.memory]"
                    :color="() => [memoryChartConfig.memory.color]"
                    :line-width="1"
                  />
                  <VisAxis
                    type="x"
                    :x="(d: DataPoint) => d.date"
                    :tick-line="false"
                    :domain-line="false"
                    :grid-line="false"
                    :num-ticks="6"
                    :tick-format="(d: number) => timeLabelFormatter(d)"
                  />
                  <VisAxis type="y" :num-ticks="5" :tick-line="true" :domain-line="true" />
                  <ChartTooltip />
                  <ChartCrosshair
                    :template="componentToString(memoryChartConfig, ChartTooltipContent, { labelFormatter: timeLabelFormatter })"
                    :color="() => [memoryChartConfig.memory.color]"
                  />
                </VisXYContainer>
                <ChartLegendContent />
              </ChartContainer>
            </CardContent>
          </Card>

          <Card class="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <CardContent class="flex min-h-0 flex-1 flex-col p-2 sm:p-4">
              <ChartContainer :config="cpuChartConfig" class="min-h-0 w-full flex-1" :cursor="false">
                <VisXYContainer
                  :data="historyData"
                  :svg-defs="cpuSvgDefs"
                  :margin="{ left: 0 }"
                  :y-domain="cpuYDomain"
                >
                  <VisArea
                    :x="(d: DataPoint) => d.date"
                    :y="[(d: DataPoint) => d.cpu]"
                    :color="() => ['url(#fillCpu)']"
                    :opacity="0.6"
                  />
                  <VisLine
                    :x="(d: DataPoint) => d.date"
                    :y="[(d: DataPoint) => d.cpu]"
                    :color="() => [cpuChartConfig.cpu.color]"
                    :line-width="1"
                  />
                  <VisAxis
                    type="x"
                    :x="(d: DataPoint) => d.date"
                    :tick-line="false"
                    :domain-line="false"
                    :grid-line="false"
                    :num-ticks="6"
                    :tick-format="(d: number) => timeLabelFormatter(d)"
                  />
                  <VisAxis type="y" :num-ticks="5" :tick-line="true" :domain-line="true" />
                  <ChartTooltip />
                  <ChartCrosshair
                    :template="componentToString(cpuChartConfig, ChartTooltipContent, { labelFormatter: timeLabelFormatter })"
                    :color="() => [cpuChartConfig.cpu.color]"
                  />
                </VisXYContainer>
                <ChartLegendContent />
              </ChartContainer>
            </CardContent>
          </Card>

          <Card class="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <CardContent class="flex min-h-0 flex-1 flex-col p-2 sm:p-4">
              <ChartContainer :config="networkChartConfig" class="min-h-0 w-full flex-1" :cursor="false">
                <VisXYContainer
                  :data="historyData"
                  :svg-defs="networkSvgDefs"
                  :margin="{ left: 0 }"
                  :y-domain="networkYDomain"
                >
                  <VisArea
                    :x="(d: DataPoint) => d.date"
                    :y="[(d: DataPoint) => d.networkRx, (d: DataPoint) => d.networkTx]"
                    :color="(_d: DataPoint, i: number) => ['url(#fillNetworkRx)', 'url(#fillNetworkTx)'][i]"
                    :opacity="0.6"
                  />
                  <VisLine
                    :x="(d: DataPoint) => d.date"
                    :y="[(d: DataPoint) => d.networkRx, (d: DataPoint) => d.networkRx + d.networkTx]"
                    :color="(_d: DataPoint, i: number) => [networkChartConfig.networkRx.color, networkChartConfig.networkTx.color][i]"
                    :line-width="1"
                  />
                  <VisAxis
                    type="x"
                    :x="(d: DataPoint) => d.date"
                    :tick-line="false"
                    :domain-line="false"
                    :grid-line="false"
                    :num-ticks="6"
                    :tick-format="(d: number) => timeLabelFormatter(d)"
                  />
                  <VisAxis type="y" :num-ticks="5" :tick-line="true" :domain-line="true" />
                  <ChartTooltip />
                  <ChartCrosshair
                    :template="componentToString(networkChartConfig, ChartTooltipContent, { labelFormatter: timeLabelFormatter })"
                    :color="(_d: DataPoint, i: number) => [networkChartConfig.networkRx.color, networkChartConfig.networkTx.color][i % 2]"
                  />
                </VisXYContainer>
                <ChartLegendContent />
              </ChartContainer>
            </CardContent>
          </Card>

          <Card class="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <CardContent class="flex min-h-0 flex-1 flex-col p-2 sm:p-4">
              <ChartContainer :config="ioChartConfig" class="min-h-0 w-full flex-1" :cursor="false">
                <VisXYContainer
                  :data="historyData"
                  :svg-defs="ioSvgDefs"
                  :margin="{ left: 0 }"
                  :y-domain="ioYDomain"
                >
                  <VisArea
                    :x="(d: DataPoint) => d.date"
                    :y="[(d: DataPoint) => d.ioRead, (d: DataPoint) => d.ioWrite]"
                    :color="(_d: DataPoint, i: number) => ['url(#fillIoRead)', 'url(#fillIoWrite)'][i]"
                    :opacity="0.6"
                  />
                  <VisLine
                    :x="(d: DataPoint) => d.date"
                    :y="[(d: DataPoint) => d.ioRead, (d: DataPoint) => d.ioRead + d.ioWrite]"
                    :color="(_d: DataPoint, i: number) => [ioChartConfig.ioRead.color, ioChartConfig.ioWrite.color][i]"
                    :line-width="1"
                  />
                  <VisAxis
                    type="x"
                    :x="(d: DataPoint) => d.date"
                    :tick-line="false"
                    :domain-line="false"
                    :grid-line="false"
                    :num-ticks="6"
                    :tick-format="(d: number) => timeLabelFormatter(d)"
                  />
                  <VisAxis type="y" :num-ticks="5" :tick-line="true" :domain-line="true" />
                  <ChartTooltip />
                  <ChartCrosshair
                    :template="componentToString(ioChartConfig, ChartTooltipContent, { labelFormatter: timeLabelFormatter })"
                    :color="(_d: DataPoint, i: number) => [ioChartConfig.ioRead.color, ioChartConfig.ioWrite.color][i % 2]"
                  />
                </VisXYContainer>
                <ChartLegendContent />
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
