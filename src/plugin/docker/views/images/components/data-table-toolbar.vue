<script setup lang="ts">
import type { Table } from '@tanstack/vue-table'

import { Download, Trash2, Upload, Wrench } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { ImageListResponse } from '@/plugin/docker/api'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  table: Table<ImageListResponse>
  onBatchRemove?: (images: ImageListResponse[]) => void
  onImport?: () => void
  onExport?: (images: ImageListResponse[]) => void
  onBuild?: () => void
}

const props = defineProps<Props>()
const { t } = useI18n()
const idFilter = ref('')

watch(idFilter, (v: string) => {
  props.table.getColumn('id')?.setFilterValue(v || undefined)
}, { immediate: true })

const selectedRows = computed(() => props.table.getSelectedRowModel().rows)
const hasSelection = computed(() => selectedRows.value.length > 0)

function handleBatchRemove() {
  const images = selectedRows.value.map(r => r.original)
  props.onBatchRemove?.(images)
}

function handleExport() {
  const images = selectedRows.value.map(r => r.original)
  props.onExport?.(images)
}
</script>

<template>
  <div class="flex w-full flex-wrap items-center gap-4 py-4">
    <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <Input
        v-model="idFilter"
        :placeholder="t('docker.images.search.imageIdOrTags')"
        class="ml-1 h-8 min-w-[10rem] max-w-xs shrink-0"
      />
      <Button
        size="sm"
        class="from-destructive via-destructive/60 to-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 h-8 bg-gradient-to-r [background-size:200%_auto] text-white hover:bg-[99%_center]"
        :disabled="!hasSelection"
        @click="handleBatchRemove"
      >
        <Trash2 class="size-4" />
        {{ t('docker.images.actions.remove') }}
      </Button>
      <Button
        variant="outline"
        size="sm"
        class="h-8"
        @click="props.onImport"
      >
        <Upload class="size-4" />
        {{ t('docker.images.actions.import') }}
      </Button>
      <Button
        variant="outline"
        size="sm"
        class="h-8"
        :disabled="!hasSelection"
        @click="handleExport"
      >
        <Download class="size-4" />
        {{ t('docker.images.actions.export') }}
      </Button>
      <InspiraUiRainbowButton
        class="!h-9 gap-1.5 !rounded-md !px-2.5 text-sm"
        @click="props.onBuild"
      >
        <Wrench class="size-4" />
        {{ t('docker.images.actions.buildNewImage') }}
      </InspiraUiRainbowButton>
    </div>
  </div>
</template>
