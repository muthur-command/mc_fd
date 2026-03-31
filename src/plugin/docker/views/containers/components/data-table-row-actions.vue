<script setup lang="ts">
import type { Row } from '@tanstack/vue-table'

import {
  BarChart3,
  Ellipsis,
  Eye,
  Pause,
  Play,
  RefreshCw,
  ScrollText,
  Square,
  Trash2,
  XCircle,
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import type { ContainerListResponse } from '@/plugin/docker/api'

import { Button } from '@/components/ui/button'
import {
  killContainerApi,
  pauseContainerApi,
  removeContainerApi,
  restartContainerApi,
  startContainerApi,
  stopContainerApi,
  unpauseContainerApi,
} from '@/plugin/docker/api'

interface Props {
  row: Row<ContainerListResponse>
}

const props = defineProps<Props>()
const container = computed(() => props.row.original)
const { t } = useI18n()

const onViewDetail = inject<(row: ContainerListResponse) => void>('containerOnViewDetail', () => {})
const onLogs = inject<(row: ContainerListResponse) => void>('containerOnLogs', () => {})
const onStats = inject<(row: ContainerListResponse) => void>('containerOnStats', () => {})
const refresh = inject<() => Promise<void>>('containerListFetch', () => Promise.resolve())

const isRunning = computed(() => {
  const s = (container.value.status || '').toLowerCase()
  return s.includes('running') || s.includes('up')
})
const isPaused = computed(() => {
  const s = (container.value.status || '').toLowerCase()
  return s.includes('paused')
})

async function doAction(
  fn: () => Promise<unknown>,
  successKey: string,
  errorKey: string,
) {
  try {
    await fn()
    toast.success(t(successKey))
    await refresh()
  }
  catch {
    toast.error(t(errorKey))
  }
}

function handleStart() {
  doAction(
    () => startContainerApi(container.value.id),
    'docker.containers.messages.startSuccess',
    'docker.containers.messages.startFailed',
  )
}
function handleStop() {
  doAction(
    () => stopContainerApi(container.value.id),
    'docker.containers.messages.stopSuccess',
    'docker.containers.messages.stopFailed',
  )
}
function handleRestart() {
  doAction(
    () => restartContainerApi(container.value.id),
    'docker.containers.messages.restartSuccess',
    'docker.containers.messages.restartFailed',
  )
}
function handlePause() {
  doAction(
    () => pauseContainerApi(container.value.id),
    'docker.containers.messages.pauseSuccess',
    'docker.containers.messages.pauseFailed',
  )
}
function handleResume() {
  doAction(
    () => unpauseContainerApi(container.value.id),
    'docker.containers.messages.resumeSuccess',
    'docker.containers.messages.resumeFailed',
  )
}
function handleKill() {
  doAction(
    () => killContainerApi(container.value.id),
    'docker.containers.messages.killSuccess',
    'docker.containers.messages.killFailed',
  )
}
async function handleRemove() {
  try {
    await removeContainerApi(container.value.id, false)
    toast.success(t('docker.containers.messages.deleteSuccess'))
    await refresh()
  }
  catch {
    toast.error(t('docker.containers.messages.deleteFailed'))
  }
}
</script>

<template>
  <UiDropdownMenu>
    <UiDropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        class="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
      >
        <Ellipsis class="size-4" />
        <span class="sr-only">Open menu</span>
      </Button>
    </UiDropdownMenuTrigger>
    <UiDropdownMenuContent align="end" class="w-[180px]">
      <UiDropdownMenuItem @click="onViewDetail(container)">
        <Eye class="mr-2 size-4" />
        {{ t('docker.containers.actions.view') }}
      </UiDropdownMenuItem>
      <UiDropdownMenuItem @click="onLogs(container)">
        <ScrollText class="mr-2 size-4" />
        {{ t('docker.containers.actions.logs') }}
      </UiDropdownMenuItem>
      <UiDropdownMenuItem @click="onStats(container)">
        <BarChart3 class="mr-2 size-4" />
        {{ t('docker.containers.actions.stats') }}
      </UiDropdownMenuItem>
      <UiDropdownMenuSeparator />
      <UiDropdownMenuItem :disabled="isRunning" @click="handleStart">
        <Play class="mr-2 size-4" />
        {{ t('docker.containers.actions.start') }}
      </UiDropdownMenuItem>
      <UiDropdownMenuItem :disabled="!isRunning" @click="handleStop">
        <Square class="mr-2 size-4" />
        {{ t('docker.containers.actions.stop') }}
      </UiDropdownMenuItem>
      <UiDropdownMenuItem :disabled="!isRunning" @click="handleRestart">
        <RefreshCw class="mr-2 size-4" />
        {{ t('docker.containers.actions.restart') }}
      </UiDropdownMenuItem>
      <UiDropdownMenuItem :disabled="!isRunning" @click="handlePause">
        <Pause class="mr-2 size-4" />
        {{ t('docker.containers.actions.pause') }}
      </UiDropdownMenuItem>
      <UiDropdownMenuItem :disabled="!isPaused" @click="handleResume">
        <Play class="mr-2 size-4" />
        {{ t('docker.containers.actions.resume') }}
      </UiDropdownMenuItem>
      <UiDropdownMenuItem :disabled="!isRunning" @click="handleKill">
        <XCircle class="mr-2 size-4" />
        {{ t('docker.containers.actions.kill') }}
      </UiDropdownMenuItem>
      <UiDropdownMenuSeparator />
      <UiDropdownMenuItem
        class="text-destructive focus:text-destructive"
        @click="handleRemove"
      >
        <Trash2 class="mr-2 size-4" />
        {{ t('docker.containers.actions.remove') }}
      </UiDropdownMenuItem>
    </UiDropdownMenuContent>
  </UiDropdownMenu>
</template>
