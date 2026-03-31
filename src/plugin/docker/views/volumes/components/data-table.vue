<script setup lang="ts">
import type { DataTableProps } from '@/components/data-table/types'
import type { VolumeListResponse } from '@/plugin/docker/api'

import DataTable from '@/components/data-table/data-table.vue'
import { generateVueTable } from '@/components/data-table/use-generate-vue-table'

import DataTableToolbar from './data-table-toolbar.vue'

const props = defineProps<DataTableProps<VolumeListResponse> & {
  onAddVolume?: () => void
  onBatchRemove?: (volumes: VolumeListResponse[]) => void
}>()

const table = generateVueTable<VolumeListResponse>(props)
</script>

<template>
  <DataTable
    :columns="props.columns"
    :data="props.data"
    :loading="props.loading"
    :table="table"
    :server-pagination="props.serverPagination"
  >
    <template #toolbar>
      <DataTableToolbar
        :table="table"
        :on-add-volume="props.onAddVolume"
        :on-batch-remove="props.onBatchRemove"
        class="w-full overflow-x-auto"
      />
    </template>
  </DataTable>
</template>
