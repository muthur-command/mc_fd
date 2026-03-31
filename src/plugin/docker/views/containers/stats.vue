<script setup lang="ts">
import { Card, Select } from 'ant-design-vue'
import { Info } from 'lucide-vue-next'
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'

import type { ContainerStatsResponse } from '@/plugin/docker/api'

import EchartsUI from '@/plugin/docker/components/echarts-ui.vue'
import { useEcharts } from '@/plugin/docker/composables/use-echarts'

const props = defineProps<{
  containerId: string
}>()

const { t } = useI18n()

// WebSocket 相关
const stats = ref<ContainerStatsResponse | null>(null)
const ws = ref<null | WebSocket>(null)
const connected = ref(false)
const reconnectTimer = ref<null | number>(null)
const isManualDisconnect = ref(false)
const connectionError = ref<null | string>(null)
const reconnectAttempts = ref(0)
const maxReconnectAttempts = 5 // 最多重连 5 次

// 刷新率（保留用于 UI，实际由 WebSocket 实时推送控制）
const refreshRate = ref(5) // 默认 5 秒（仅显示，实际刷新由 WebSocket 控制）

// 历史数据存储（最多保存 60 个数据点）
interface StatsDataPoint {
  time: string
  cpu: number
  memory: number // MB
  networkRx: number // MB
  networkTx: number // MB
  ioRead: number // MB
  ioWrite: number // MB;
}

const maxDataPoints = 60
const historyData = ref<StatsDataPoint[]>([])

// 图表引用
const memoryChartRef = ref<InstanceType<typeof EchartsUI>>()
const cpuChartRef = ref<InstanceType<typeof EchartsUI>>()
const networkChartRef = ref<InstanceType<typeof EchartsUI>>()
const ioChartRef = ref<InstanceType<typeof EchartsUI>>()

const { renderEcharts: renderMemoryChartBase } = useEcharts(memoryChartRef)
const { renderEcharts: renderCpuChartBase } = useEcharts(cpuChartRef)
const { renderEcharts: renderNetworkChartBase } = useEcharts(networkChartRef)
const { renderEcharts: renderIoChartBase } = useEcharts(ioChartRef)

// 跟踪图表是否已初始化
const chartsInitialized = {
  memory: false,
  cpu: false,
  network: false,
  io: false,
}

// 包装渲染函数，首次渲染时清空，后续更新时不清空
function renderMemoryChart(options: any) {
  const clear = !chartsInitialized.memory
  chartsInitialized.memory = true
  return renderMemoryChartBase(options, clear)
}

function renderCpuChart(options: any) {
  const clear = !chartsInitialized.cpu
  chartsInitialized.cpu = true
  return renderCpuChartBase(options, clear)
}

function renderNetworkChart(options: any) {
  const clear = !chartsInitialized.network
  chartsInitialized.network = true
  return renderNetworkChartBase(options, clear)
}

function renderIoChart(options: any) {
  const clear = !chartsInitialized.io
  chartsInitialized.io = true
  return renderIoChartBase(options, clear)
}

// 格式化字节为 MB
function bytesToMB(bytes: number) {
  return bytes / (1024 * 1024)
}

// 格式化时间为 HH:mm:ss
function formatTime(date: Date) {
  return date.toLocaleTimeString('zh-CN', { hour12: false })
}

// 添加数据点到历史记录
function addDataPoint(statsData: ContainerStatsResponse) {
  const now = new Date()
  const time = formatTime(now)

  const dataPoint: StatsDataPoint = {
    time,
    cpu: statsData.cpu_percent || 0,
    memory: bytesToMB(statsData.memory_usage || 0),
    networkRx: bytesToMB(statsData.network_rx || 0),
    networkTx: bytesToMB(statsData.network_tx || 0),
    ioRead: bytesToMB(statsData.io_read || 0),
    ioWrite: bytesToMB(statsData.io_write || 0),
  }

  historyData.value.push(dataPoint)

  // 限制数据点数量
  if (historyData.value.length > maxDataPoints) {
    historyData.value.shift()
  }
}

// 渲染内存使用图表
function updateMemoryChart() {
  if (!memoryChartRef.value || historyData.value.length === 0)
    return

  const times = historyData.value.map(d => d.time)
  const memoryData = historyData.value.map(d => d.memory)

  const maxMemory = Math.max(...memoryData, 100) // 至少 100 MB

  renderMemoryChart({
    title: {
      text: t('docker.containers.stats.memoryUsage'),
      left: 'left',
      textStyle: {
        fontSize: 14,
        fontWeight: 'normal',
      },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const param = params[0]
        return `${param.name}<br/>Memory: ${param.value.toFixed(1)} MB`
      },
    },
    grid: {
      left: '50px',
      right: '4%',
      bottom: '40px',
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: times,
      axisLabel: {
        show: true,
        rotate: 0,
      },
    },
    yAxis: {
      type: 'value',
      name: 'MB',
      nameLocation: 'end',
      nameGap: 15,
      min: 0,
      max: maxMemory,
    },
    series: [
      {
        name: t('docker.containers.stats.memoryUsage'),
        type: 'line',
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
              { offset: 1, color: 'rgba(64, 158, 255, 0.1)' },
            ],
          },
        },
        lineStyle: {
          color: '#409EFF',
        },
        data: memoryData,
        smooth: true,
      },
    ],
  })
}

// 渲染 CPU 使用图表
function updateCpuChart() {
  if (!cpuChartRef.value || historyData.value.length === 0)
    return

  const times = historyData.value.map(d => d.time)
  const cpuData = historyData.value.map(d => d.cpu)

  renderCpuChart({
    title: {
      text: t('docker.containers.stats.cpuUsage'),
      left: 'left',
      textStyle: {
        fontSize: 14,
        fontWeight: 'normal',
      },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const param = params[0]
        return `${param.name}<br/>CPU: ${param.value.toFixed(1)}%`
      },
    },
    grid: {
      left: '50px',
      right: '4%',
      bottom: '40px',
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: times,
      axisLabel: {
        show: true,
        rotate: 0,
      },
    },
    yAxis: {
      type: 'value',
      name: '%',
      nameLocation: 'end',
      nameGap: 15,
      min: 0,
    },
    series: [
      {
        name: t('docker.containers.stats.cpuUsage'),
        type: 'line',
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
              { offset: 1, color: 'rgba(64, 158, 255, 0.1)' },
            ],
          },
        },
        lineStyle: {
          color: '#409EFF',
        },
        data: cpuData,
        smooth: true,
      },
    ],
  })
}

// 渲染网络使用图表
function updateNetworkChart() {
  if (!networkChartRef.value || historyData.value.length === 0)
    return

  const times = historyData.value.map(d => d.time)
  const rxData = historyData.value.map(d => d.networkRx)
  const txData = historyData.value.map(d => d.networkTx)

  const maxNetwork = Math.max(...rxData, ...txData, 10) // 至少 10 MB

  renderNetworkChart({
    title: {
      text: t('docker.containers.stats.networkUsage'),
      left: 'left',
      textStyle: {
        fontSize: 14,
        fontWeight: 'normal',
      },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        if (Array.isArray(params)) {
          let result = `${params[0].name}<br/>`
          params.forEach((param: any) => {
            result += `${param.seriesName}: ${param.value.toFixed(1)} MB<br/>`
          })
          return result
        }
        return ''
      },
    },
    legend: {
      data: [
        t('docker.containers.stats.rxOnEth0'),
        t('docker.containers.stats.txOnEth0'),
      ],
      bottom: 0,
    },
    grid: {
      left: '50px',
      right: '4%',
      bottom: '15%',
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: times,
    },
    yAxis: {
      type: 'value',
      name: 'MB',
      nameLocation: 'end',
      nameGap: 15,
      min: 0,
      max: maxNetwork,
    },
    series: [
      {
        name: t('docker.containers.stats.rxOnEth0'),
        type: 'line',
        lineStyle: {
          color: '#409EFF',
        },
        data: rxData,
        smooth: true,
      },
      {
        name: t('docker.containers.stats.txOnEth0'),
        type: 'line',
        lineStyle: {
          color: '#F56C6C',
        },
        data: txData,
        smooth: true,
      },
    ],
  })
}

// 渲染 I/O 使用图表
function updateIoChart() {
  if (!ioChartRef.value || historyData.value.length === 0)
    return

  const times = historyData.value.map(d => d.time)
  const readData = historyData.value.map(d => d.ioRead)
  const writeData = historyData.value.map(d => d.ioWrite)

  const maxIo = Math.max(...readData, ...writeData, 120) // 至少 120 MB

  renderIoChart({
    title: {
      text: t('docker.containers.stats.ioUsage'),
      left: 'left',
      textStyle: {
        fontSize: 14,
        fontWeight: 'normal',
      },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        if (Array.isArray(params)) {
          let result = `${params[0].name}<br/>`
          params.forEach((param: any) => {
            result += `${param.seriesName}: ${param.value.toFixed(1)} MB<br/>`
          })
          return result
        }
        return ''
      },
    },
    legend: {
      data: [
        t('docker.containers.stats.readAggregate'),
        t('docker.containers.stats.writeAggregate'),
      ],
      bottom: 0,
    },
    grid: {
      left: '50px',
      right: '4%',
      bottom: '15%',
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: times,
    },
    yAxis: {
      type: 'value',
      name: 'MB',
      nameLocation: 'end',
      nameGap: 15,
      min: 0,
      max: maxIo,
    },
    series: [
      {
        name: t('docker.containers.stats.readAggregate'),
        type: 'line',
        stack: 'Total',
        areaStyle: {
          color: 'rgba(144, 147, 153, 0.3)',
        },
        lineStyle: {
          color: '#909399',
        },
        data: readData,
        smooth: true,
      },
      {
        name: t('docker.containers.stats.writeAggregate'),
        type: 'line',
        stack: 'Total',
        areaStyle: {
          color: 'rgba(245, 108, 108, 0.3)',
        },
        lineStyle: {
          color: '#F56C6C',
        },
        data: writeData,
        smooth: true,
      },
    ],
  })
}

// 更新所有图表
async function updateAllCharts() {
  await nextTick()
  updateMemoryChart()
  updateCpuChart()
  updateNetworkChart()
  updateIoChart()
}

function disconnectWebSocket() {
  isManualDisconnect.value = true
  if (reconnectTimer.value !== null) {
    clearTimeout(reconnectTimer.value)
    reconnectTimer.value = null
  }
  if (ws.value) {
    try {
      // 先发送停止推送请求
      if (ws.value.readyState === WebSocket.OPEN) {
        try {
          ws.value.send(JSON.stringify({ action: 'stop' }))
          // 等待一小段时间，确保消息发送成功
          setTimeout(() => {
            ws.value?.close(1000, 'Component unmounted')
          }, 100)
        }
        catch (error) {
          console.error('[WebSocket] 发送停止推送请求失败:', error)
          ws.value.close(1000, 'Component unmounted')
        }
      }
      else {
        // 如果连接未打开，直接关闭
        ws.value.close(1000, 'Component unmounted')
      }
    }
    catch (error) {
      console.error('[WebSocket] 关闭连接时出错:', error)
    }
    ws.value = null
  }
  connected.value = false
  stats.value = null
  reconnectAttempts.value = 0 // 重置重连次数
  connectionError.value = null // 清空错误信息
}

function connectWebSocket() {
  // 如果达到最大重连次数，不再重连
  if (reconnectAttempts.value >= maxReconnectAttempts) {
    connectionError.value = t('docker.containers.stats.connectionFailed', {
      max: maxReconnectAttempts,
    })
    return
  }

  disconnectWebSocket()
  isManualDisconnect.value = false
  connectionError.value = null

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/api/v1/docker/containers/${props.containerId}/stats`

  try {
    ws.value = new WebSocket(wsUrl)

    ws.value.addEventListener('open', () => {
      connected.value = true
      reconnectAttempts.value = 0 // 连接成功，重置重连次数
      connectionError.value = null

      // 连接成功后，立即发送启动推送请求
      try {
        ws.value?.send(JSON.stringify({ action: 'start' }))
      }
      catch (error) {
        console.error('[WebSocket] 发送启动推送请求失败:', error)
      }
    })

    const handleMessage = (event: MessageEvent) => {
      try {
        const wsMessage = JSON.parse(event.data)
        switch (wsMessage.type) {
          case 'control': {
            // 控制消息（启动/停止推送的确认）
            break
          }
          case 'error': {
            connectionError.value = t('docker.containers.stats.serverError', {
              message: wsMessage.message,
            })
            console.error('WebSocket错误:', wsMessage.message)

            break
          }
          case 'stats': {
            stats.value = wsMessage.data
            // 添加数据点
            addDataPoint(wsMessage.data)
            // 延迟更新图表，确保 DOM 已渲染
            nextTick(() => {
              updateAllCharts()
            })

            break
          }
          // No default
        }
      }
      catch (error) {
        console.error('解析WebSocket消息失败:', error)
      }
    }
    ws.value.addEventListener('message', handleMessage)

    ws.value.addEventListener('close', (_event) => {
      connected.value = false

      // 只有在非手动断开且未达到最大重连次数时才重连
      if (
        !isManualDisconnect.value
        && reconnectTimer.value === null
        && reconnectAttempts.value < maxReconnectAttempts
      ) {
        reconnectAttempts.value++
        connectionError.value = t(
          'docker.containers.stats.connectionDisconnected',
          {
            current: reconnectAttempts.value,
            max: maxReconnectAttempts,
          },
        )
        reconnectTimer.value = window.setTimeout(() => {
          reconnectTimer.value = null
          connectWebSocket()
        }, 3000)
      }
      else if (reconnectAttempts.value >= maxReconnectAttempts) {
        connectionError.value = t('docker.containers.stats.connectionFailed', {
          max: maxReconnectAttempts,
        })
      }
    })

    ws.value.addEventListener('error', (error) => {
      connected.value = false
      // 不在这里设置错误信息，让 onclose 事件处理
      // 这样可以避免重复的错误信息
      console.error('WebSocket错误:', error)
    })
  }
  catch (error) {
    console.error('创建WebSocket连接失败:', error)
    connectionError.value = t('docker.containers.stats.connectionFailed', {
      max: maxReconnectAttempts,
    })
  }
}

// 监听 containerId 变化
watch(
  () => props.containerId,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      historyData.value = [] // 清空历史数据
      // 重置图表初始化状态
      chartsInitialized.memory = false
      chartsInitialized.cpu = false
      chartsInitialized.network = false
      chartsInitialized.io = false
      // 如果已经连接，先断开再重新连接
      if (connected.value) {
        disconnectWebSocket()
      }
      connectWebSocket()
    }
  },
  { immediate: false },
)

// 注意：不在 onMounted 时自动连接，而是由父组件通过 props 或事件控制
// 当组件被挂载时，如果 containerId 存在，则连接
onMounted(() => {
  // 延迟连接，确保父组件已经设置好状态
  if (props.containerId) {
    nextTick(() => {
      connectWebSocket()
    })
  }
})

onBeforeUnmount(() => {
  disconnectWebSocket()
})

onUnmounted(() => {
  disconnectWebSocket()
})
</script>

<template>
  <div class="p-0">
    <div v-if="!connected" class="mb-4 text-center">
      <div v-if="connectionError" class="mb-2 text-red-500">
        {{ connectionError }}
      </div>
      <div v-else class="text-gray-500">
        {{ t('docker.containers.stats.connecting') }}
      </div>
    </div>
    <div v-else>
      <!-- About statistics 说明 -->
      <div class="mb-4 flex items-center gap-2">
        <Info
          class="size-[18px] text-blue-500"
        />
        <span class="text-sm text-gray-600">
          {{ t('docker.containers.stats.aboutStatistics') }}
        </span>
      </div>

      <!-- Refresh rate 选择 -->
      <div class="mb-4 flex items-center gap-2">
        <span class="text-sm">{{
          t('docker.containers.stats.refreshRate')
        }}</span>
        <Select v-model:value="refreshRate" style="width: 100px" disabled>
          <Select.Option :value="5">
            5s
          </Select.Option>
        </Select>
        <span class="ml-2 text-xs text-gray-500">{{
          t('docker.containers.stats.realTimeUpdate')
        }}</span>
      </div>

      <!-- 图表区域 2x2 网格 -->
      <div class="grid grid-cols-2 gap-4">
        <!-- Memory usage -->
        <Card>
          <EchartsUI ref="memoryChartRef" height="300px" />
        </Card>

        <!-- CPU usage -->
        <Card>
          <EchartsUI ref="cpuChartRef" height="300px" />
        </Card>

        <!-- Network usage -->
        <Card>
          <EchartsUI ref="networkChartRef" height="300px" />
        </Card>

        <!-- I/O usage -->
        <Card>
          <EchartsUI ref="ioChartRef" height="300px" />
        </Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
}

.grid-cols-2 {
  grid-template-columns: repeat(2, 1fr);
}

.gap-4 {
  gap: 1rem;
}

/* 减少卡片的内边距，缩小画布和卡片之间的间距 */
:deep(.ant-card-body) {
  padding: 8px !important;
}
</style>
