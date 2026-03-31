<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import type { ContainerListResponse, CreateContainerParam } from '@/plugin/docker/api'

import { createContainerApi, getContainerListApi } from '@/plugin/docker/api'

import { createColumns } from './components/columns'
import DataTable from './components/data-table.vue'
import ContainerDetailDialog from './container-detail-dialog.vue'
import ContainerStatsDialog from './container-stats-dialog.vue'
import CreateContainerModal from './create-container-modal.vue'
import ContainerLogs from './logs.vue'

const { t } = useI18n()

const loading = ref(false)
const list = ref<ContainerListResponse[]>([])
const selectedContainer = ref<ContainerListResponse | null>(null)
const detailModalVisible = ref(false)
const logsModalVisible = ref(false)
const statsModalVisible = ref(false)
const createModalVisible = ref(false)

async function fetchList() {
  loading.value = true
  try {
    const result = await getContainerListApi(true)
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

const columnsContext = {
  onViewDetail(row: ContainerListResponse) {
    selectedContainer.value = row
    detailModalVisible.value = true
  },
  onLogs(row: ContainerListResponse) {
    selectedContainer.value = row
    logsModalVisible.value = true
  },
  onStats(row: ContainerListResponse) {
    selectedContainer.value = row
    statsModalVisible.value = true
  },
}

const columns = createColumns(columnsContext)

provide('containerListFetch', fetchList)
provide('containerOnViewDetail', columnsContext.onViewDetail)
provide('containerOnLogs', columnsContext.onLogs)
provide('containerOnStats', columnsContext.onStats)

function getRowId(row: ContainerListResponse) {
  return row.id
}

async function handleCreate(values: CreateContainerParam) {
  try {
    await createContainerApi(values)
    createModalVisible.value = false
    toast.success(t('docker.containers.messages.createSuccess'))
    await fetchList()
  }
  catch (error: any) {
    console.error(error)
    toast.error(error?.response?.data?.msg ?? t('docker.containers.messages.createFailed'))
    throw error
  }
}

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
        :initial-column-visibility="{ ip_address: false, ports: false }"
        :on-add-container="() => (createModalVisible = true)"
      />
    </div>
  </main>

  <CreateContainerModal
    :open="createModalVisible"
    @update:open="(val) => (createModalVisible = val)"
    @confirm="handleCreate"
  />

  <ContainerDetailDialog
    :open="detailModalVisible"
    :container-id="selectedContainer?.id"
    @update:open="(val) => (detailModalVisible = val)"
  />

  <ContainerLogs
    :open="logsModalVisible"
    :container-id="selectedContainer?.id"
    @update:open="(val) => { logsModalVisible = val; if (!val) selectedContainer = null; }"
  />

  <ContainerStatsDialog
    :open="statsModalVisible"
    :container-id="selectedContainer?.id"
    @update:open="(val) => { statsModalVisible = val; if (!val) selectedContainer = null; }"
  />
</template>
