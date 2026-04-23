<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next'
import { computed, onMounted, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import type { CreateVolumeParam, VolumeListResponse } from '@/plugin/docker/api'

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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { createVolumeApi, getVolumeListApi, removeVolumeApi } from '@/plugin/docker/api'

import { createColumns } from './components/columns'
import DataTable from './components/data-table.vue'
import CreateVolumeModal from './create-volume-modal.vue'

const { t } = useI18n()

/** 受保护的卷名称（不可删除、不可勾选） */
const PROTECTED_VOLUMES = ['mc_mysql', 'mc_rabbitmq', 'mc_redis']

const loading = ref(false)
const list = ref<VolumeListResponse[]>([])
const columns = createColumns(PROTECTED_VOLUMES)
const createModalOpen = ref(false)
const batchRemoveDialogOpen = ref(false)
const volumesToRemove = ref<VolumeListResponse[]>([])
const batchDontAskAgain = ref(false)

function isProtected(name: string) {
  return PROTECTED_VOLUMES.includes(name)
}

async function fetchList() {
  loading.value = true
  try {
    const result = await getVolumeListApi()
    list.value = Array.isArray(result) ? result : []
  }
  catch (e) {
    console.error(e)
    list.value = []
  }
  finally {
    loading.value = false
  }
}

provide('volumeListFetch', fetchList)
provide('volumeProtectedNames', PROTECTED_VOLUMES)

function getRowId(row: VolumeListResponse) {
  return row.name
}

function openCreateModal() {
  createModalOpen.value = true
}

function openBatchRemoveDialog(volumes: VolumeListResponse[]) {
  if (volumes.length === 0) {
    toast.warning(t('docker.volumes.messages.pleaseSelectVolumes'))
    return
  }
  const removable = volumes.filter(v => !isProtected(v.name))
  const protectedSelected = volumes.filter(v => isProtected(v.name))
  if (protectedSelected.length > 0) {
    toast.warning(
      t('docker.volumes.messages.protectedCannotDelete', {
        names: protectedSelected.map(v => v.name).join(', '),
      }),
    )
  }
  if (removable.length === 0) {
    return
  }
  volumesToRemove.value = removable
  batchRemoveDialogOpen.value = true
}

async function handleCreate(values: CreateVolumeParam) {
  try {
    await createVolumeApi(values)
    toast.success(t('docker.volumes.messages.createSuccess'))
    createModalOpen.value = false
    await fetchList()
  }
  catch (e: any) {
    toast.error(e?.response?.data?.msg ?? t('docker.volumes.messages.createFailed'))
    throw e
  }
}

async function confirmBatchRemove() {
  const volumes = volumesToRemove.value
  if (!volumes.length)
    return
  try {
    await Promise.all(volumes.map(v => removeVolumeApi(v.name)))
    toast.success(t('docker.volumes.messages.batchDeleteSuccess', { count: volumes.length }))
    batchRemoveDialogOpen.value = false
    volumesToRemove.value = []
    await fetchList()
  }
  catch {
    toast.error(t('docker.volumes.messages.batchDeleteFailed'))
  }
}

const batchRemoveNames = computed(() => volumesToRemove.value.map(v => v.name).join(', '))

onMounted(fetchList)
</script>

<template>
  <main class="pb-4">
    <div class="overflow-x-auto">
      <DataTable
        :loading="loading"
        :data="list"
        :columns="columns"
        :get-row-id="getRowId"
        :initial-column-visibility="{ options: false }"
        :on-add-volume="openCreateModal"
        :on-batch-remove="openBatchRemoveDialog"
      />
    </div>
  </main>

  <CreateVolumeModal
    :open="createModalOpen"
    @update:open="createModalOpen = $event"
    @confirm="handleCreate"
  />

  <AlertDialog v-model:open="batchRemoveDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader class="items-center text-center">
        <div class="mb-2 flex size-12 items-center justify-center rounded-full bg-red-500/15 dark:bg-red-500/20">
          <TriangleAlert class="size-6 text-red-600 dark:text-red-400" />
        </div>
        <AlertDialogTitle>{{ t('docker.volumes.modals.deleteConfirmTitle') }}</AlertDialogTitle>
        <AlertDialogDescription class="text-center">
          {{ t('docker.volumes.modals.deleteConfirmContent', {
            count: volumesToRemove.length,
            names: batchRemoveNames,
          }) }}
          <span class="mt-4 flex items-center justify-center gap-3">
            <Checkbox id="volume-batch-delete-dont-ask" :checked="batchDontAskAgain" @update:checked="(v: boolean | 'indeterminate') => batchDontAskAgain = v === true" />
            <Label for="volume-batch-delete-dont-ask">Don't ask next again</Label>
          </span>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('docker.volumes.modals.cancel') }}</AlertDialogCancel>
        <AlertDialogAction
          class="bg-primary text-primary-foreground hover:bg-primary/90"
          @click="confirmBatchRemove"
        >
          {{ t('docker.volumes.modals.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
