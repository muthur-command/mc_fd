<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next'
import { computed, onMounted, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import type { CreateNetworkParam, NetworkListResponse } from '@/plugin/docker/api'

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
import { createNetworkApi, getNetworkListApi, removeNetworkApi } from '@/plugin/docker/api'

import { createColumns } from './components/columns'
import DataTable from './components/data-table.vue'
import CreateNetworkModal from './create-network-modal.vue'

const { t } = useI18n()

/** 系统网络（不可删除） */
const SYSTEM_NETWORKS = ['bridge', 'host', 'none']
/** 受保护网络（不可删除） */
const PROTECTED_NETWORKS = ['mc_network']
/** 不可删除的网络名称列表，用于禁用勾选和删除 */
const NON_REMOVABLE_NAMES = [...SYSTEM_NETWORKS, ...PROTECTED_NETWORKS]

const loading = ref(false)
const list = ref<NetworkListResponse[]>([])
const columns = createColumns(NON_REMOVABLE_NAMES)
const createModalOpen = ref(false)
const batchRemoveDialogOpen = ref(false)
const networksToRemove = ref<NetworkListResponse[]>([])
const batchDontAskAgain = ref(false)

function isNonRemovable(name: string) {
  return NON_REMOVABLE_NAMES.includes(name)
}

async function fetchList() {
  loading.value = true
  try {
    const result = await getNetworkListApi()
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

provide('networkListFetch', fetchList)
provide('networkNonRemovableNames', NON_REMOVABLE_NAMES)

function getRowId(row: NetworkListResponse) {
  return row.id
}

function openCreateModal() {
  createModalOpen.value = true
}

function openBatchRemoveDialog(networks: NetworkListResponse[]) {
  if (networks.length === 0) {
    toast.warning(t('docker.networks.messages.pleaseSelectNetworks'))
    return
  }
  const removable = networks.filter(n => !isNonRemovable(n.name))
  const systemSelected = networks.filter(n => SYSTEM_NETWORKS.includes(n.name))
  const protectedSelected = networks.filter(n => PROTECTED_NETWORKS.includes(n.name))
  if (systemSelected.length > 0) {
    toast.warning(
      t('docker.networks.messages.systemCannotDelete', {
        names: systemSelected.map(n => n.name).join(', '),
      }),
    )
  }
  if (protectedSelected.length > 0) {
    toast.warning(
      t('docker.networks.messages.protectedCannotDelete', {
        names: protectedSelected.map(n => n.name).join(', '),
      }),
    )
  }
  if (removable.length === 0)
    return
  networksToRemove.value = removable
  batchRemoveDialogOpen.value = true
}

async function handleCreate(values: CreateNetworkParam) {
  try {
    await createNetworkApi(values)
    toast.success(t('docker.networks.messages.createSuccess'))
    createModalOpen.value = false
    await fetchList()
  }
  catch (e: any) {
    toast.error(e?.response?.data?.msg ?? t('docker.networks.messages.createFailed'))
    throw e
  }
}

async function confirmBatchRemove() {
  const networks = networksToRemove.value
  if (!networks.length)
    return
  try {
    await Promise.all(networks.map(n => removeNetworkApi(n.id)))
    toast.success(t('docker.networks.messages.batchDeleteSuccess', { count: networks.length }))
    batchRemoveDialogOpen.value = false
    networksToRemove.value = []
    await fetchList()
  }
  catch {
    toast.error(t('docker.networks.messages.batchDeleteFailed'))
  }
}

const batchRemoveNames = computed(() => networksToRemove.value.map(n => n.name).join(', '))

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
        :initial-column-visibility="{ ipv6_subnet: false, ipv6_gateway: false }"
        :on-add-network="openCreateModal"
        :on-batch-remove="openBatchRemoveDialog"
      />
    </div>
  </main>

  <CreateNetworkModal
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
        <AlertDialogTitle>{{ t('docker.networks.modals.deleteConfirmTitle') }}</AlertDialogTitle>
        <AlertDialogDescription class="text-center">
          {{ t('docker.networks.modals.deleteConfirmContent', {
            count: networksToRemove.length,
            names: batchRemoveNames,
          }) }}
          <span class="mt-4 flex items-center justify-center gap-3">
            <Checkbox id="network-batch-delete-dont-ask" :checked="batchDontAskAgain" @update:checked="(v: boolean | 'indeterminate') => batchDontAskAgain = v === true" />
            <Label for="network-batch-delete-dont-ask">Don't ask next again</Label>
          </span>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('docker.networks.modals.cancel') }}</AlertDialogCancel>
        <AlertDialogAction
          class="bg-primary text-primary-foreground hover:bg-primary/90"
          @click="confirmBatchRemove"
        >
          {{ t('docker.networks.modals.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
