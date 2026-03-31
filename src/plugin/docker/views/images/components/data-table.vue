<script setup lang="ts">
import type { DataTableProps } from '@/components/data-table/types'
import type { ImageListResponse } from '@/plugin/docker/api'

import DataTable from '@/components/data-table/data-table.vue'
import { generateVueTable } from '@/components/data-table/use-generate-vue-table'

import DataTableToolbar from './data-table-toolbar.vue'

const props = defineProps<DataTableProps<ImageListResponse> & {
  onBatchRemove?: (images: ImageListResponse[]) => void
  onImport?: () => void
  onExport?: (images: ImageListResponse[]) => void
  onBuild?: () => void
}>()

const table = generateVueTable<ImageListResponse>(props)
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
        :on-batch-remove="props.onBatchRemove"
        :on-import="props.onImport"
        :on-export="props.onExport"
        :on-build="props.onBuild"
        class="w-full overflow-x-auto"
      />
    </template>
  </DataTable>
</template>
