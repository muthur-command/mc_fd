<script setup lang="ts">
import type { DataTableProps } from '@/components/data-table/types'
import type { ContainerListResponse } from '@/plugin/docker/api'

import DataTable from '@/components/data-table/data-table.vue'
import { generateVueTable } from '@/components/data-table/use-generate-vue-table'

import DataTableToolbar from './data-table-toolbar.vue'

const props = defineProps<DataTableProps<ContainerListResponse> & {
  onAddContainer?: () => void
}>()

const table = generateVueTable<ContainerListResponse>(props)
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
        :on-add-container="props.onAddContainer"
        class="w-full overflow-x-auto"
      />
    </template>
  </DataTable>
</template>
