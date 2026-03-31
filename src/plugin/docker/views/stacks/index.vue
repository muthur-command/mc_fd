<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next'
import { computed, onMounted, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import type { DeployStackParam, StackListResponse } from '@/plugin/docker/api'

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
import { deployStackApi, getStackListApi, removeStackApi } from '@/plugin/docker/api'

import { createColumns } from './components/columns'
import DataTable from './components/data-table.vue'
import DeployStackDialog from './deploy-stack-dialog.vue'

const { t } = useI18n()

const loading = ref(false)
const list = ref<StackListResponse[]>([])
const columns = createColumns()
const deployDialogOpen = ref(false)
const batchRemoveDialogOpen = ref(false)
const batchDontAskAgain = ref(false)
const stacksToRemove = ref<StackListResponse[]>([])

async function fetchList() {
  loading.value = true
  try {
    const result = await getStackListApi()
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

provide('stackListFetch', fetchList)

function getRowId(row: StackListResponse) {
  return row.name
}

function openDeployDialog() {
  deployDialogOpen.value = true
}

function openBatchRemoveDialog(stacks: StackListResponse[]) {
  if (stacks.length === 0) {
    toast.warning(t('docker.stacks.messages.pleaseSelectStacks'))
    return
  }
  stacksToRemove.value = stacks
  batchRemoveDialogOpen.value = true
}

async function handleDeploy(payload: DeployStackParam) {
  try {
    await deployStackApi(payload)
    toast.success(t('docker.stacks.messages.deploySuccess'))
    deployDialogOpen.value = false
    await fetchList()
  }
  catch {
    toast.error(t('docker.stacks.messages.deployFailed'))
  }
}

async function confirmBatchRemove() {
  const stacks = stacksToRemove.value
  if (!stacks.length)
    return
  try {
    await Promise.all(
      stacks.map(s => removeStackApi({ project_name: s.name, volumes: false })),
    )
    toast.success(t('docker.stacks.messages.batchDeleteSuccess', { count: stacks.length }))
    batchRemoveDialogOpen.value = false
    stacksToRemove.value = []
    await fetchList()
  }
  catch {
    toast.error(t('docker.stacks.messages.batchDeleteFailed'))
  }
}

const batchRemoveNames = computed(() => stacksToRemove.value.map(s => s.name).join(', '))

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
        :on-deploy="openDeployDialog"
        :on-batch-remove="openBatchRemoveDialog"
      />
    </div>
  </main>

  <DeployStackDialog
    :open="deployDialogOpen"
    @update:open="deployDialogOpen = $event"
    @deployed="handleDeploy"
  />

  <AlertDialog v-model:open="batchRemoveDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader class="items-center text-center">
        <div class="mb-2 flex size-12 items-center justify-center rounded-full bg-red-500/15 dark:bg-red-500/20">
          <TriangleAlert class="size-6 text-red-600 dark:text-red-400" />
        </div>
        <AlertDialogTitle>{{ t('docker.stacks.modals.deleteConfirmTitle') }}</AlertDialogTitle>
        <AlertDialogDescription class="text-center">
          {{ t('docker.stacks.modals.deleteConfirmContent', {
            count: stacksToRemove.length,
            names: batchRemoveNames,
          }) }}
          <span class="mt-4 flex items-center justify-center gap-3">
            <Checkbox id="stack-batch-delete-dont-ask" :checked="batchDontAskAgain" @update:checked="(v) => batchDontAskAgain = v === true" />
            <Label for="stack-batch-delete-dont-ask">Don't ask next again</Label>
          </span>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('docker.stacks.modals.cancel') }}</AlertDialogCancel>
        <AlertDialogAction
          class="bg-primary text-primary-foreground hover:bg-primary/90"
          @click="confirmBatchRemove"
        >
          {{ t('docker.stacks.modals.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
