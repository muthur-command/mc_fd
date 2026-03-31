<script setup lang="ts">
import type { Table } from '@tanstack/vue-table'

import {
  Pause,
  Play,
  Plus,
  RefreshCw,
  Square,
  Trash2,
  TriangleAlert,
  XCircle,
} from 'lucide-vue-next'
import { computed, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import type { ContainerListResponse } from '@/plugin/docker/api'

import DataTableViewOptions from '@/components/data-table/view-options.vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  table: Table<ContainerListResponse>
  onAddContainer?: () => void
}

const props = defineProps<Props>()

const { t } = useI18n()
const nameFilter = ref('')
const batchRemoveDialogOpen = ref(false)
const batchDontAskAgain = ref(false)

const refresh = inject<() => Promise<void>>('containerListFetch', () => Promise.resolve())

watch(nameFilter, (v) => {
  props.table.getColumn('name')?.setFilterValue(v || undefined)
}, { immediate: true })

const selectedRows = computed(() => props.table.getSelectedRowModel().rows)
const selectedContainers = computed(() => selectedRows.value.map(r => r.original))

const hasStopped = computed(() =>
  selectedContainers.value.some(
    c => !(c.status || '').toLowerCase().includes('running') && !(c.status || '').toLowerCase().includes('up'),
  ))
const hasRunning = computed(() =>
  selectedContainers.value.some(
    c => (c.status || '').toLowerCase().includes('running') || (c.status || '').toLowerCase().includes('up'),
  ))
const hasPaused = computed(() =>
  selectedContainers.value.some(c => (c.status || '').toLowerCase().includes('paused')))
const hasSelection = computed(() => selectedContainers.value.length > 0)

async function batchStart() {
  const list = selectedContainers.value.filter(
    c => !(c.status || '').toLowerCase().includes('running') && !(c.status || '').toLowerCase().includes('up'),
  )
  if (!list.length) {
    toast.error(t('docker.containers.messages.noContainersToStart'))
    return
  }
  try {
    await Promise.all(list.map(c => startContainerApi(c.id)))
    toast.success(t('docker.containers.messages.batchStartSuccess', { count: list.length }))
    props.table.toggleAllPageRowsSelected(false)
    await refresh()
  }
  catch {
    toast.error(t('docker.containers.messages.batchStartFailed'))
  }
}

async function batchStop() {
  const list = selectedContainers.value.filter(
    c => (c.status || '').toLowerCase().includes('running') || (c.status || '').toLowerCase().includes('up'),
  )
  if (!list.length) {
    toast.error(t('docker.containers.messages.noContainersToStop'))
    return
  }
  try {
    await Promise.all(list.map(c => stopContainerApi(c.id)))
    toast.success(t('docker.containers.messages.batchStopSuccess', { count: list.length }))
    props.table.toggleAllPageRowsSelected(false)
    await refresh()
  }
  catch {
    toast.error(t('docker.containers.messages.batchStopFailed'))
  }
}

async function batchKill() {
  const list = selectedContainers.value.filter(
    c => (c.status || '').toLowerCase().includes('running') || (c.status || '').toLowerCase().includes('up'),
  )
  if (!list.length) {
    toast.error(t('docker.containers.messages.noContainersToKill'))
    return
  }
  try {
    await Promise.all(list.map(c => killContainerApi(c.id)))
    toast.success(t('docker.containers.messages.batchKillSuccess', { count: list.length }))
    props.table.toggleAllPageRowsSelected(false)
    await refresh()
  }
  catch {
    toast.error(t('docker.containers.messages.batchKillFailed'))
  }
}

async function batchRestart() {
  const list = selectedContainers.value.filter(
    c => (c.status || '').toLowerCase().includes('running') || (c.status || '').toLowerCase().includes('up'),
  )
  if (!list.length) {
    toast.error(t('docker.containers.messages.noContainersToRestart'))
    return
  }
  try {
    await Promise.all(list.map(c => restartContainerApi(c.id)))
    toast.success(t('docker.containers.messages.batchRestartSuccess', { count: list.length }))
    props.table.toggleAllPageRowsSelected(false)
    await refresh()
  }
  catch {
    toast.error(t('docker.containers.messages.batchRestartFailed'))
  }
}

async function batchPause() {
  const list = selectedContainers.value.filter(
    c => (c.status || '').toLowerCase().includes('running') || (c.status || '').toLowerCase().includes('up'),
  )
  if (!list.length) {
    toast.error(t('docker.containers.messages.noContainersToPause'))
    return
  }
  try {
    await Promise.all(list.map(c => pauseContainerApi(c.id)))
    toast.success(t('docker.containers.messages.batchPauseSuccess', { count: list.length }))
    props.table.toggleAllPageRowsSelected(false)
    await refresh()
  }
  catch {
    toast.error(t('docker.containers.messages.batchPauseFailed'))
  }
}

async function batchResume() {
  const list = selectedContainers.value.filter(c => (c.status || '').toLowerCase().includes('paused'))
  if (!list.length) {
    toast.error(t('docker.containers.messages.noContainersToResume'))
    return
  }
  try {
    await Promise.all(list.map(c => unpauseContainerApi(c.id)))
    toast.success(t('docker.containers.messages.batchResumeSuccess', { count: list.length }))
    props.table.toggleAllPageRowsSelected(false)
    await refresh()
  }
  catch {
    toast.error(t('docker.containers.messages.batchResumeFailed'))
  }
}

function batchRemove() {
  if (!selectedContainers.value.length) {
    toast.error(t('docker.containers.messages.pleaseSelectContainers'))
    return
  }
  batchRemoveDialogOpen.value = true
}

async function confirmBatchRemove() {
  try {
    await Promise.all(selectedContainers.value.map(c => removeContainerApi(c.id, false)))
    toast.success(t('docker.containers.messages.batchDeleteSuccess', { count: selectedContainers.value.length }))
    batchRemoveDialogOpen.value = false
    props.table.toggleAllPageRowsSelected(false)
    await refresh()
  }
  catch {
    toast.error(t('docker.containers.messages.batchDeleteFailed'))
  }
}
</script>

<template>
  <div class="flex w-full flex-wrap items-center gap-4 py-4">
    <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <Input
        v-model="nameFilter"
        :placeholder="t('docker.containers.form.searchName')"
        class="ml-1 h-8 min-w-[10rem] max-w-xs shrink-0"
      />
      <Button
        variant="outline"
        size="sm"
        class="h-8"
        :disabled="!hasStopped || !hasSelection"
        @click="batchStart"
      >
        <Play class="mr-1 size-4" />
        {{ t('docker.containers.actions.start') }}
      </Button>
      <Button
        variant="outline"
        size="sm"
        class="h-8"
        :disabled="!hasRunning || !hasSelection"
        @click="batchStop"
      >
        <Square class="mr-1 size-4" />
        {{ t('docker.containers.actions.stop') }}
      </Button>
      <Button
        variant="outline"
        size="sm"
        class="h-8"
        :disabled="!hasRunning || !hasSelection"
        @click="batchKill"
      >
        <XCircle class="mr-1 size-4" />
        {{ t('docker.containers.actions.kill') }}
      </Button>
      <Button
        variant="outline"
        size="sm"
        class="h-8"
        :disabled="!hasRunning || !hasSelection"
        @click="batchRestart"
      >
        <RefreshCw class="mr-1 size-4" />
        {{ t('docker.containers.actions.restart') }}
      </Button>
      <Button
        variant="outline"
        size="sm"
        class="h-8"
        :disabled="!hasRunning || !hasSelection"
        @click="batchPause"
      >
        <Pause class="mr-1 size-4" />
        {{ t('docker.containers.actions.pause') }}
      </Button>
      <Button
        variant="outline"
        size="sm"
        class="h-8"
        :disabled="!hasPaused || !hasSelection"
        @click="batchResume"
      >
        <Play class="mr-1 size-4" />
        {{ t('docker.containers.actions.resume') }}
      </Button>
      <Button
        size="sm"
        class="from-destructive via-destructive/60 to-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 h-8 bg-gradient-to-r [background-size:200%_auto] text-white hover:bg-[99%_center]"
        :disabled="!hasSelection"
        @click="batchRemove"
      >
        <Trash2 class="mr-1 size-4" />
        {{ t('docker.containers.actions.remove') }}
      </Button>
      <InspiraUiRainbowButton
        v-if="props.onAddContainer"
        class="!h-9 shrink-0 gap-1.5 !rounded-md !px-2.5 text-sm"
        @click="props.onAddContainer()"
      >
        <Plus class="size-4" />
        {{ t('docker.containers.actions.addContainer') }}
      </InspiraUiRainbowButton>
    </div>
    <div class="shrink-0 basis-full sm:basis-auto sm:ml-auto">
      <DataTableViewOptions :table="table" />
    </div>
  </div>

  <AlertDialog v-model:open="batchRemoveDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader class="items-center text-center">
        <div class="mb-2 flex size-12 items-center justify-center rounded-full bg-red-500/15 dark:bg-red-500/20">
          <TriangleAlert class="size-6 text-red-600 dark:text-red-400" />
        </div>
        <AlertDialogTitle>{{ t('docker.containers.modals.deleteConfirmTitle') }}</AlertDialogTitle>
        <AlertDialogDescription class="text-center">
          {{ t('docker.containers.modals.deleteConfirmContent', { count: selectedContainers.length, names: selectedContainers.map(c => c.name).join(', ') }) }}
          <span class="mt-4 flex items-center justify-center gap-3">
            <Checkbox id="container-batch-delete-dont-ask" :checked="batchDontAskAgain" @update:checked="(v) => batchDontAskAgain = v === true" />
            <Label for="container-batch-delete-dont-ask">Don't ask next again</Label>
          </span>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('docker.containers.modals.cancel') }}</AlertDialogCancel>
        <AlertDialogAction class="bg-primary text-primary-foreground hover:bg-primary/90" @click="confirmBatchRemove">
          {{ t('docker.containers.modals.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
