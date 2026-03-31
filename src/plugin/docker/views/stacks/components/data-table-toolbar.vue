<script setup lang="ts">
import type { Table } from '@tanstack/vue-table'

import { Rocket, Trash2 } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { StackListResponse } from '@/plugin/docker/api'

import DataTableViewOptions from '@/components/data-table/view-options.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  table: Table<StackListResponse>
  onDeploy: () => void
  onBatchRemove: (stacks: StackListResponse[]) => void
}

const props = defineProps<Props>()
const { t } = useI18n()
const nameFilter = ref('')

watch(nameFilter, (v) => {
  props.table.getColumn('name')?.setFilterValue(v || undefined)
}, { immediate: true })

const selectedRows = computed(() => props.table.getSelectedRowModel().rows)
const hasSelection = computed(() => selectedRows.value.length > 0)

function handleBatchRemove() {
  const stacks = selectedRows.value.map(r => r.original)
  props.onBatchRemove(stacks)
}
</script>

<template>
  <div class="flex w-full flex-wrap items-center gap-4 py-4">
    <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <Input
        v-model="nameFilter"
        :placeholder="t('docker.stacks.search.placeholder')"
        class="ml-1 h-8 min-w-[10rem] max-w-xs shrink-0"
      />
      <Button
        size="sm"
        class="from-destructive via-destructive/60 to-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 h-8 gap-1.5 bg-gradient-to-r [background-size:200%_auto] text-white hover:bg-[99%_center]"
        :disabled="!hasSelection"
        @click="handleBatchRemove"
      >
        <Trash2 class="size-4" />
        {{ t('docker.stacks.actions.remove') }}
      </Button>
      <InspiraUiRainbowButton
        class="!h-9 gap-1.5 !rounded-md !px-2.5 text-sm"
        @click="props.onDeploy"
      >
        <Rocket class="size-4" />
        {{ t('docker.stacks.actions.deploy') }}
      </InspiraUiRainbowButton>
    </div>
    <div class="shrink-0 basis-full sm:basis-auto sm:ml-auto">
      <DataTableViewOptions :table="props.table" />
    </div>
  </div>
</template>
