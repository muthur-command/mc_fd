<script setup lang="ts">
import { Plus, Trash2, TriangleAlert } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import type { RegistrySourceResponse } from '@/plugin/docker/api'

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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  createRegistryApi,
  deleteRegistryApi,
} from '@/plugin/docker/api'

import AddRegistryDialog from './add-registry-dialog.vue'

const props = defineProps<{
  registries: RegistrySourceResponse[]
  onRefresh: () => void | Promise<void>
}>()

const { t } = useI18n()
const selectedIds = ref<Set<string>>(new Set())
const addDialogOpen = ref(false)
const batchRemoveDialogOpen = ref(false)
const batchDontAskAgain = ref(false)

const selectableRegistries = computed(() =>
  props.registries.filter(r => !r.is_default),
)
const headerChecked = computed(() => {
  if (selectableRegistries.value.length === 0)
    return false
  if (selectedIds.value.size >= selectableRegistries.value.length)
    return true
  if (selectedIds.value.size > 0)
    return 'indeterminate'
  return false
})
const hasRemovableSelection = computed(() => selectedIds.value.size > 0)

function toggleOne(id: string, isDefault: boolean) {
  if (isDefault)
    return
  const next = new Set(selectedIds.value)
  if (next.has(id))
    next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function toggleAll(checked: boolean) {
  if (checked) {
    selectedIds.value = new Set(selectableRegistries.value.map(r => r.id))
  }
  else {
    selectedIds.value = new Set()
  }
}

async function handleAddRegistry(data: { name: string, url: string }) {
  try {
    await createRegistryApi(data)
    toast.success(t('docker.images.messages.registryAddSuccess'))
    addDialogOpen.value = false
    await props.onRefresh()
  }
  catch {
    toast.error(t('docker.images.messages.registryAddFailed'))
  }
}

async function handleBatchRemove() {
  const ids = [...selectedIds.value]
  const toRemove = props.registries.filter(r => ids.includes(r.id) && !r.is_default)
  if (!toRemove.length) {
    toast.warning(t('docker.images.messages.pleaseSelectRegistries'))
    return
  }
  try {
    for (const r of toRemove) {
      await deleteRegistryApi(r.id)
    }
    toast.success(t('docker.images.messages.registryDeleteSuccess', { count: toRemove.length }))
    batchRemoveDialogOpen.value = false
    selectedIds.value = new Set()
    await props.onRefresh()
  }
  catch {
    toast.error(t('docker.images.messages.registryBatchDeleteFailed'))
  }
}

function requestBatchRemove() {
  const ids = [...selectedIds.value]
  const toRemove = props.registries.filter(r => ids.includes(r.id) && !r.is_default)
  if (!toRemove.length) {
    toast.warning(t('docker.images.messages.pleaseSelectRegistries'))
    return
  }
  batchRemoveDialogOpen.value = true
}
</script>

<template>
  <Card class="flex h-[280px] max-h-[280px] flex-col overflow-hidden gap-y-0 pt-0">
    <CardHeader class="flex-shrink-0 flex-row items-center justify-between space-y-0 py-4">
      <CardTitle class="text-base">
        {{ t('docker.images.registry.title') }}
      </CardTitle>
      <div class="flex items-center gap-2">
        <Button
          size="sm"
          class="from-destructive via-destructive/60 to-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 h-8 bg-gradient-to-r [background-size:200%_auto] text-white hover:bg-[99%_center]"
          :disabled="!hasRemovableSelection"
          @click="requestBatchRemove"
        >
          <Trash2 class="size-4" />
          {{ t('docker.images.actions.remove') }}
        </Button>
        <InspiraUiRainbowButton class="!h-9 gap-1.5 !rounded-md !px-2.5 text-sm" @click="addDialogOpen = true">
          <Plus class="size-4" />
          {{ t('docker.images.registry.actions.add') }}
        </InspiraUiRainbowButton>
      </div>
    </CardHeader>
    <CardContent class="min-h-0 flex-1 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-10">
              <Checkbox
                :checked="headerChecked === true || headerChecked === 'indeterminate' ? headerChecked : false"
                @update:checked="(v: boolean | 'indeterminate') => toggleAll(v === true)"
              />
            </TableHead>
            <TableHead>{{ t('docker.images.registry.columns.name') }}</TableHead>
            <TableHead>{{ t('docker.images.registry.columns.url') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="r in registries" :key="r.id">
            <TableCell>
              <Checkbox
                :checked="selectedIds.has(r.id)"
                :disabled="r.is_default"
                @update:checked="toggleOne(r.id, r.is_default)"
              />
            </TableCell>
            <TableCell>
              <span class="mr-1">{{ r.name }}</span>
              <StatusBadge v-if="r.is_default" color="gray" class="text-xs">
                {{ t('docker.images.registry.columns.default') }}
              </StatusBadge>
            </TableCell>
            <TableCell>
              <code class="text-muted-foreground text-xs">{{ r.url }}</code>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>

  <AddRegistryDialog
    :open="addDialogOpen"
    @update:open="addDialogOpen = $event"
    @confirm="handleAddRegistry"
  />

  <AlertDialog v-model:open="batchRemoveDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader class="items-center text-center">
        <div class="mb-2 flex size-12 items-center justify-center rounded-full bg-red-500/15 dark:bg-red-500/20">
          <TriangleAlert class="size-6 text-red-600 dark:text-red-400" />
        </div>
        <AlertDialogTitle>{{ t('docker.images.messages.deleteConfirmTitle') }}</AlertDialogTitle>
        <AlertDialogDescription class="text-center">
          {{ t('docker.images.messages.registryDeleteConfirmContent', { count: selectedIds.size }) }}
          <span class="mt-4 flex items-center justify-center gap-3">
            <Checkbox id="registry-batch-delete-dont-ask" :checked="batchDontAskAgain" @update:checked="(v: boolean | 'indeterminate') => batchDontAskAgain = v === true" />
            <Label for="registry-batch-delete-dont-ask">Don't ask next again</Label>
          </span>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('docker.images.modals.cancel') }}</AlertDialogCancel>
        <AlertDialogAction class="bg-primary text-primary-foreground hover:bg-primary/90" @click="handleBatchRemove">
          {{ t('docker.images.modals.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
