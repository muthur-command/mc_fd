<script setup lang="ts">
import type { Table } from '@tanstack/vue-table'

import { Plus, Trash2 } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { NetworkListResponse } from '@/plugin/docker/api'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  table: Table<NetworkListResponse>
  onAddNetwork?: () => void
  onBatchRemove?: (networks: NetworkListResponse[]) => void
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
  const networks = selectedRows.value.map(r => r.original)
  props.onBatchRemove?.(networks)
}
</script>

<template>
  <div class="flex w-full flex-wrap items-center gap-4 py-4">
    <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <Input
        v-model="nameFilter"
        :placeholder="t('docker.networks.search.placeholder')"
        class="ml-1 h-8 min-w-[10rem] max-w-xs shrink-0"
      />
      <Button
        size="sm"
        class="from-destructive via-destructive/60 to-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 h-8 bg-gradient-to-r [background-size:200%_auto] text-white hover:bg-[99%_center]"
        :disabled="!hasSelection"
        @click="handleBatchRemove"
      >
        <Trash2 class="size-4" />
        {{ t('docker.networks.actions.remove') }}
      </Button>
      <InspiraUiRainbowButton
        class="!h-9 shrink-0 gap-1.5 !rounded-md !px-2.5 text-sm"
        @click="props.onAddNetwork"
      >
        <Plus class="size-4" />
        {{ t('docker.networks.actions.addNetwork') }}
      </InspiraUiRainbowButton>
    </div>
  </div>
</template>
