<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next'
import { computed, onMounted, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import type { ImageListResponse, RegistrySourceResponse } from '@/plugin/docker/api'

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
import {
  exportImageApi,
  getImageListApi,
  getRegistryListApi,
  removeImageApi,
} from '@/plugin/docker/api'

import BuildImageDialog from './build-image-dialog.vue'
import { createColumns } from './components/columns'
import DataTable from './components/data-table.vue'
import ImportImageDialog from './import-image-dialog.vue'
import PullImageCard from './pull-image-card.vue'
import RegistryCard from './registry-card.vue'

const { t } = useI18n()

const loading = ref(false)
const list = ref<ImageListResponse[]>([])
const columns = createColumns()
const batchRemoveDialogOpen = ref(false)
const imagesToRemove = ref<ImageListResponse[]>([])
const batchDontAskAgain = ref(false)

const registryList = ref<RegistrySourceResponse[]>([])
const registryLoading = ref(false)
const buildDialogOpen = ref(false)
const importDialogOpen = ref(false)

async function loadRegistries() {
  registryLoading.value = true
  try {
    const result = await getRegistryListApi()
    registryList.value = result ?? []
    if (registryList.value.length === 0) {
      registryList.value = [{
        id: 'docker-hub-anonymous',
        name: t('docker.images.registry.defaultName'),
        url: 'docker.io',
        is_default: true,
      }]
    }
  }
  catch (e) {
    console.error(e)
    registryList.value = [{
      id: 'docker-hub-anonymous',
      name: t('docker.images.registry.defaultName'),
      url: 'docker.io',
      is_default: true,
    }]
  }
  finally {
    registryLoading.value = false
  }
}

async function fetchList() {
  loading.value = true
  try {
    const result = await getImageListApi(false)
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

provide('imageListFetch', fetchList)

function getRowId(row: ImageListResponse) {
  return row.id
}

function openBatchRemoveDialog(images: ImageListResponse[]) {
  if (images.length === 0) {
    toast.warning(t('docker.images.messages.pleaseSelectImages'))
    return
  }
  imagesToRemove.value = images
  batchRemoveDialogOpen.value = true
}

async function confirmBatchRemove() {
  const images = imagesToRemove.value
  if (!images.length)
    return
  try {
    const results = await Promise.allSettled(
      images.map(img => removeImageApi(img.id, false)),
    )
    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    if (succeeded > 0) {
      toast.success(t('docker.images.messages.deleteSuccess', { count: succeeded }))
      batchRemoveDialogOpen.value = false
      imagesToRemove.value = []
      await fetchList()
    }
    if (failed > 0) {
      toast.error(t('docker.images.messages.batchDeleteFailed'))
    }
  }
  catch {
    toast.error(t('docker.images.messages.batchDeleteFailed'))
  }
}

const batchRemoveSummary = computed(() => {
  const images = imagesToRemove.value
  if (!images.length)
    return ''
  const ids = images.map(img => img.id.slice(0, 12)).join(', ')
  return images.length > 3 ? `${ids}...` : ids
})

async function handleExport(images: ImageListResponse[]) {
  if (!images.length) {
    toast.warning(t('docker.images.messages.pleaseSelectImages'))
    return
  }
  if (images.length === 1) {
    const img = images[0]
    try {
      const blob = await exportImageApi(img.id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const filename = `${(img.tags?.[0] ?? img.id.slice(0, 12)).replaceAll(/[^a-z0-9]/gi, '_')}.tar`
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success(t('docker.images.messages.exportSuccess', { count: 1 }))
    }
    catch {
      toast.error(t('docker.images.messages.exportFailed'))
    }
    return
  }
  for (const img of images) {
    try {
      const blob = await exportImageApi(img.id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const filename = `${(img.tags?.[0] ?? img.id.slice(0, 12)).replaceAll(/[^a-z0-9]/gi, '_')}.tar`
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      await new Promise(r => setTimeout(r, 100))
    }
    catch {
      // skip failed
    }
  }
  toast.success(t('docker.images.messages.exportSuccess', { count: images.length }))
}

function onPullSuccess() {
  fetchList()
}

function onBuildSuccess() {
  fetchList()
}

function onImportSuccess() {
  fetchList()
}

onMounted(() => {
  fetchList()
  loadRegistries()
})
</script>

<template>
  <main class="py-4">
    <div class="mb-6 flex flex-shrink-0 gap-4">
      <div class="min-h-0 flex-1">
        <RegistryCard
          :registries="registryList"
          :on-refresh="loadRegistries"
        />
      </div>
      <div class="min-h-0 flex-1">
        <PullImageCard
          :registries="registryList"
          :loading="registryLoading"
          @pulled="onPullSuccess"
        />
      </div>
    </div>

    <div class="overflow-x-auto">
      <DataTable
        :loading="loading"
        :data="list"
        :columns="columns"
        :get-row-id="getRowId"
        :on-batch-remove="openBatchRemoveDialog"
        :on-import="() => (importDialogOpen = true)"
        :on-export="handleExport"
        :on-build="() => (buildDialogOpen = true)"
      />
    </div>
  </main>

  <AlertDialog v-model:open="batchRemoveDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader class="items-center text-center">
        <div class="mb-2 flex size-12 items-center justify-center rounded-full bg-red-500/15 dark:bg-red-500/20">
          <TriangleAlert class="size-6 text-red-600 dark:text-red-400" />
        </div>
        <AlertDialogTitle>{{ t('docker.images.messages.deleteConfirmTitle') }}</AlertDialogTitle>
        <AlertDialogDescription class="text-center">
          {{ t('docker.images.messages.deleteConfirmContent', { count: imagesToRemove.length }) }}
          <span v-if="batchRemoveSummary" class="mt-2 block font-mono text-xs">{{ batchRemoveSummary }}</span>
          <span class="mt-4 flex items-center justify-center gap-3">
            <Checkbox id="image-batch-delete-dont-ask" :checked="batchDontAskAgain" @update:checked="(v: boolean | 'indeterminate') => batchDontAskAgain = v === true" />
            <Label for="image-batch-delete-dont-ask">Don't ask next again</Label>
          </span>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('docker.images.modals.cancel') }}</AlertDialogCancel>
        <AlertDialogAction
          class="bg-primary text-primary-foreground hover:bg-primary/90"
          @click="confirmBatchRemove"
        >
          {{ t('docker.images.modals.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <BuildImageDialog
    :open="buildDialogOpen"
    @update:open="buildDialogOpen = $event"
    @built="onBuildSuccess"
  />

  <ImportImageDialog
    :open="importDialogOpen"
    @update:open="importDialogOpen = $event"
    @imported="onImportSuccess"
  />
</template>
