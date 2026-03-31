<script setup lang="ts">
import AnsiToHtml from 'ansi-to-html'
import { Copy, Download, HelpCircle, X } from 'lucide-vue-next'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
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

const logs = ref('')
const originalLogs = ref('')
const tail = ref(100)
const autoRefresh = ref(true)
const wrapLines = ref(true)
const fetchType = ref<'all' | 'last'>('all')
const searchFilter = ref('')
const loading = ref(false)
const logContainerRef = ref<HTMLElement | null>(null)
const selectedText = ref('')

const ansiConverter = new AnsiToHtml({
  fg: '#CCC',
  bg: '#000',
  newline: true,
  escapeXML: true,
  stream: false,
})

const ws = ref<WebSocket | null>(null)
const connected = ref(false)
const connectionError = ref<string | null>(null)
const isManualDisconnect = ref(false)
const reconnectAttempts = ref(0)
const maxReconnectAttempts = 5
const reconnectTimer = ref<number | null>(null)

const filteredLogs = computed(() => {
  if (!searchFilter.value)
    return logs.value
  const filter = searchFilter.value.toLowerCase()
  const lines = originalLogs.value.split('\n')
  return lines.filter(line => line.toLowerCase().includes(filter)).join('\n')
})

const formattedLogs = computed(() => ansiConverter.toHtml(filteredLogs.value))

const logContainerStyle = computed(() => ({
  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", "Courier New", monospace',
  whiteSpace: wrapLines.value ? ('pre-wrap' as const) : ('pre' as const),
  wordWrap: wrapLines.value ? ('break-word' as const) : ('normal' as const),
}))

const hasSelectedText = computed(() => selectedText.value.trim().length > 0)

function updateSelectedText() {
  const selection = window.getSelection()
  selectedText.value = selection?.toString() || ''
}

function scrollToBottom() {
  if (logContainerRef.value) {
    const container = logContainerRef.value
    requestAnimationFrame(() => {
      if (container)
        container.scrollTop = container.scrollHeight
    })
  }
}

function disconnectWebSocket() {
  isManualDisconnect.value = true
  if (reconnectTimer.value !== null) {
    clearTimeout(reconnectTimer.value)
    reconnectTimer.value = null
  }
  if (ws.value) {
    const oldWs = ws.value
    ws.value = null
    connected.value = false
    try {
      if (oldWs.readyState === WebSocket.OPEN) {
        try {
          oldWs.send(JSON.stringify({ action: 'stop' }))
          setTimeout(() => {
            try {
              oldWs.close(1000, 'Dialog closed')
            }
            catch {
              /* ignore */
            }
          }, 100)
        }
        catch {
          try {
            oldWs.close(1000, 'Dialog closed')
          }
          catch {
            /* ignore */
          }
        }
      }
      else if (oldWs.readyState === WebSocket.CONNECTING) {
        try {
          oldWs.close(1000, 'Connection cancelled')
        }
        catch {
          /* ignore */
        }
      }
      else {
        try {
          oldWs.close(1000, 'Dialog closed')
        }
        catch {
          /* ignore */
        }
      }
    }
    catch (error) {
      console.error('[WebSocket] disconnect error', error)
    }
  }
  reconnectAttempts.value = 0
  connectionError.value = null
}

function connectWebSocket() {
  if (reconnectAttempts.value >= maxReconnectAttempts) {
    connectionError.value = t('docker.containers.logs.connectionFailed', { max: maxReconnectAttempts })
    return
  }
  if (ws.value && (ws.value.readyState === WebSocket.CONNECTING || ws.value.readyState === WebSocket.OPEN)) {
    disconnectWebSocket()
    setTimeout(() => {
      isManualDisconnect.value = false
      connectionError.value = null
      connectWebSocketInternal()
    }, 300)
    return
  }
  isManualDisconnect.value = false
  connectionError.value = null
  connectWebSocketInternal()
}

function connectWebSocketInternal() {
  if (!props.containerId)
    return
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/api/v1/docker/containers/${props.containerId}/logs`

  if (ws.value && (ws.value.readyState === WebSocket.CONNECTING || ws.value.readyState === WebSocket.OPEN)) {
    return
  }

  try {
    loading.value = true
    ws.value = new WebSocket(wsUrl)

    ws.value.addEventListener('open', () => {
      connected.value = true
      reconnectAttempts.value = 0
      connectionError.value = null
      loading.value = false
      try {
        const tailLines = fetchType.value === 'all' ? 10_000 : tail.value
        ws.value?.send(JSON.stringify({ action: 'start', tail: tailLines }))
      }
      catch (error) {
        console.error('[WebSocket] start send error', error)
      }
    })

    const handleMessage = (event: MessageEvent) => {
      try {
        const wsMessage = JSON.parse(event.data)
        switch (wsMessage.type) {
          case 'control':
            break
          case 'error':
            connectionError.value = t('docker.containers.logs.serverError', { message: wsMessage.message })
            console.error('WebSocket error:', wsMessage.message)
            toast.error(t('docker.containers.logs.logsError', { message: wsMessage.message }))
            break
          case 'logs': {
            const newLogs = wsMessage.data || ''
            if (newLogs.trim()) {
              if (wsMessage.is_initial) {
                logs.value = newLogs
                originalLogs.value = newLogs
              }
              else {
                logs.value += (logs.value.endsWith('\n') ? '' : '\n') + newLogs
                originalLogs.value = logs.value
              }
              nextTick(() => scrollToBottom())
            }
            break
          }
        }
      }
      catch (error) {
        console.error('Parse WebSocket message failed', error)
      }
    }
    ws.value.addEventListener('message', handleMessage)

    ws.value.addEventListener('close', () => {
      connected.value = false
      loading.value = false
      if (
        !isManualDisconnect.value
        && reconnectTimer.value === null
        && reconnectAttempts.value < maxReconnectAttempts
      ) {
        reconnectAttempts.value += 1
        connectionError.value = t('docker.containers.logs.connectionDisconnected', {
          current: reconnectAttempts.value,
          max: maxReconnectAttempts,
        })
        reconnectTimer.value = window.setTimeout(() => {
          reconnectTimer.value = null
          connectWebSocket()
        }, 3000)
      }
      else if (reconnectAttempts.value >= maxReconnectAttempts) {
        connectionError.value = t('docker.containers.logs.connectionFailed', { max: maxReconnectAttempts })
      }
    })

    ws.value.addEventListener('error', () => {
      connectionError.value = t('docker.containers.logs.connectionFailed', { max: maxReconnectAttempts })
      loading.value = false
    })
  }
  catch (error) {
    console.error('[WebSocket] create failed', error)
    connectionError.value = t('docker.containers.logs.connectionFailed', { max: maxReconnectAttempts })
    loading.value = false
  }
}

function handleDownload() {
  const blob = new Blob([logs.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `container-${props.containerId}-logs-${Date.now()}.txt`
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  toast.success(t('docker.containers.logs.logsDownloaded'))
}

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(logs.value)
    toast.success(t('docker.containers.logs.logsCopied'))
  }
  catch (error) {
    console.error(t('docker.containers.logs.copyFailed'), error)
    toast.error(t('docker.containers.logs.copyFailed'))
  }
}

async function handleCopySelected() {
  const selection = window.getSelection()
  if (!selection || selection.toString().trim() === '') {
    toast.warning(t('docker.containers.logs.pleaseSelectText'))
    return
  }
  try {
    await navigator.clipboard.writeText(selection.toString())
    toast.success(t('docker.containers.logs.selectedTextCopied'))
  }
  catch (error) {
    console.error(t('docker.containers.logs.copyFailed'), error)
    toast.error(t('docker.containers.logs.copyFailed'))
  }
}

function handleUnselect() {
  window.getSelection()?.removeAllRanges()
  selectedText.value = ''
}

// 单一 watch：避免 open 与 containerId 同时变化时重复连接（先连再被 disconnect 导致“重连中”）
watch(
  () => [props.open, props.containerId] as const,
  ([newOpen, newId], oldPair) => {
    const [, oldId] = oldPair ?? [undefined, undefined]
    if (!newOpen) {
      disconnectWebSocket()
      logs.value = ''
      originalLogs.value = ''
      searchFilter.value = ''
      selectedText.value = ''
      return
    }
    if (!newId)
      return

    const containerChanged = oldId != null && oldId !== newId
    if (containerChanged) {
      logs.value = ''
      originalLogs.value = ''
      searchFilter.value = ''
      selectedText.value = ''
      disconnectWebSocket()
      setTimeout(() => {
        if (props.open && props.containerId && autoRefresh.value)
          connectWebSocket()
      }, 300)
    }
    else {
      // 对话框刚打开或首次有 containerId：只连接一次
      logs.value = ''
      originalLogs.value = ''
      searchFilter.value = ''
      selectedText.value = ''
      nextTick(() => connectWebSocket())
    }
  },
  { immediate: true },
)

watch(() => autoRefresh.value, (newAutoRefresh) => {
  if (newAutoRefresh) {
    if (!connected.value && !ws.value && props.containerId) {
      connectWebSocket()
    }
    else if (connected.value && ws.value?.readyState === WebSocket.OPEN) {
      try {
        const tailLines = fetchType.value === 'all' ? 10_000 : tail.value
        ws.value.send(JSON.stringify({ action: 'start', tail: tailLines }))
      }
      catch (error) {
        console.error('[WebSocket] start request error', error)
      }
    }
  }
  else {
    if (ws.value?.readyState === WebSocket.OPEN) {
      try {
        ws.value.send(JSON.stringify({ action: 'stop' }))
      }
      catch {
        /* ignore */
      }
    }
  }
})

watch([() => fetchType.value, () => tail.value], () => {
  if (connected.value && autoRefresh.value && ws.value?.readyState === WebSocket.OPEN) {
    try {
      ws.value.send(JSON.stringify({ action: 'stop' }))
      setTimeout(() => {
        if (ws.value?.readyState === WebSocket.OPEN) {
          const tailLines = fetchType.value === 'all' ? 10_000 : tail.value
          ws.value.send(JSON.stringify({ action: 'start', tail: tailLines }))
        }
      }, 200)
    }
    catch (error) {
      console.error('[WebSocket] control error', error)
    }
  }
})

watch(() => logs.value, () => {
  nextTick(() => {
    setTimeout(() => {
      scrollToBottom()
    }, 50)
  })
})

onMounted(() => {
  document.addEventListener('selectionchange', updateSelectedText)
})

onUnmounted(() => {
  disconnectWebSocket()
  document.removeEventListener('selectionchange', updateSelectedText)
})
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="max-w-[calc(100%-2rem)] sm:max-w-6xl max-h-[85vh] flex flex-col gap-4 p-6"
      :show-close-button="true"
    >
      <DialogHeader class="gap-1.5 text-left">
        <DialogTitle>{{ t('docker.containers.modals.logsTitle') }}</DialogTitle>
        <p class="text-muted-foreground text-sm">
          {{ t('docker.containers.logs.logViewerSettings') }} · {{ t('docker.containers.logs.autoRefreshLogs') }}
        </p>
      </DialogHeader>

      <div class="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
        <!-- Log viewer settings -->
        <section class="space-y-3 shrink-0">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-muted-foreground text-sm font-medium">
              {{ t('docker.containers.logs.logViewerSettings') }}
            </h3>
            <div class="flex items-center gap-2 text-sm">
              <span v-if="!connected && connectionError" class="text-destructive">
                {{ connectionError }}
              </span>
              <span v-else-if="connected" class="flex items-center gap-1.5 text-green-600 dark:text-green-500">
                <span class="size-2 rounded-full bg-current" />
                {{ t('docker.containers.logs.connected') }}
              </span>
              <span v-else class="text-muted-foreground">
                {{ t('docker.containers.logs.connecting') }}
              </span>
            </div>
          </div>
          <div class="flex flex-col gap-4">
            <div class="flex flex-wrap items-center gap-6">
              <div class="flex items-center gap-2">
                <Switch v-model:checked="autoRefresh" />
                <span class="text-sm">{{ t('docker.containers.logs.autoRefreshLogs') }}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <span class="inline-flex text-muted-foreground"><HelpCircle class="size-4" /></span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {{ t('docker.containers.logs.autoRefreshLogsTooltip') }}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div class="flex items-center gap-2">
                <Switch v-model:checked="wrapLines" />
                <span class="text-sm">{{ t('docker.containers.logs.wrapLines') }}</span>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-4">
              <div class="flex items-center gap-2">
                <Label class="shrink-0 text-sm">{{ t('docker.containers.logs.fetch') }}</Label>
                <Select v-model="fetchType">
                  <SelectTrigger class="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {{ t('docker.containers.logs.allLogs') }}
                    </SelectItem>
                    <SelectItem value="last">
                      {{ t('docker.containers.logs.lastNLines') }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="flex items-center gap-2">
                <Label class="shrink-0 text-sm">{{ t('docker.containers.logs.search') }}</Label>
                <Input
                  v-model="searchFilter"
                  :placeholder="t('docker.containers.logs.filter')"
                  class="w-[200px]"
                />
              </div>
              <div v-if="fetchType === 'last'" class="flex items-center gap-2">
                <Label class="shrink-0 text-sm">{{ t('docker.containers.logs.lines') }}</Label>
                <Input
                  v-model.number="tail"
                  type="number"
                  :min="10"
                  :max="10000"
                  class="w-24"
                />
              </div>
              <div class="ml-auto flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" class="gap-1.5" @click="handleDownload">
                  <Download class="size-4" />
                  {{ t('docker.containers.logs.downloadLogs') }}
                </Button>
                <Button variant="outline" size="sm" class="gap-1.5" @click="handleCopy">
                  <Copy class="size-4" />
                  {{ t('docker.containers.logs.copy') }}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  class="gap-1.5"
                  :disabled="!hasSelectedText"
                  @click="handleCopySelected"
                >
                  <Copy class="size-4" />
                  {{ t('docker.containers.logs.copySelectedLines') }}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  class="gap-1.5"
                  :disabled="!hasSelectedText"
                  @click="handleUnselect"
                >
                  <X class="size-4" />
                  {{ t('docker.containers.logs.unselect') }}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <!-- Log content -->
        <div
          ref="logContainerRef"
          class="log-container min-h-0 flex-1 overflow-auto rounded-md bg-black p-2 font-mono text-sm text-green-400"
          :style="logContainerStyle"
        >
          <pre
            v-if="formattedLogs"
            class="m-0"
            :class="{ 'whitespace-pre-wrap': wrapLines, 'whitespace-pre': !wrapLines }"
            v-html="formattedLogs"
          />
          <div v-else class="text-muted-foreground">
            {{ t('docker.containers.logs.noLogs') }}
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.log-container pre {
  margin: 0;
  font-feature-settings: normal;
  font-variant: normal;
  color: inherit;
}
</style>
