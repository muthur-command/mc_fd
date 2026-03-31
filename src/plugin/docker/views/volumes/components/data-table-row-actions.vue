<script setup lang="ts">
import type { Row } from '@tanstack/vue-table'

import { Ellipsis, Trash2, TriangleAlert } from 'lucide-vue-next'
import { computed, inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import type { VolumeListResponse } from '@/plugin/docker/api'

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
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { removeVolumeApi } from '@/plugin/docker/api'

interface Props {
  row: Row<VolumeListResponse>
}

const props = defineProps<Props>()
const volume = computed(() => props.row.original)
const { t } = useI18n()
const refresh = inject<() => Promise<void>>('volumeListFetch', () => Promise.resolve())
const protectedVolumeNames = inject<string[]>('volumeProtectedNames', [])

const isProtected = computed(() => protectedVolumeNames.includes(volume.value.name))

const removeDialogOpen = ref(false)
const dontAskAgain = ref(false)

function onRemoveMenuSelect(e: Event) {
  if (isProtected.value)
    return
  e.preventDefault()
  removeDialogOpen.value = true
}

async function handleRemove() {
  if (isProtected.value)
    return
  try {
    await removeVolumeApi(volume.value.name)
    toast.success(t('docker.volumes.messages.deleteSuccess'))
    removeDialogOpen.value = false
    await refresh()
  }
  catch {
    toast.error(t('docker.volumes.messages.deleteFailed'))
  }
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        class="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
      >
        <Ellipsis class="size-4" />
        <span class="sr-only">Open menu</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-[160px]">
      <DropdownMenuItem
        variant="destructive"
        :disabled="isProtected"
        @select="onRemoveMenuSelect"
      >
        <Trash2 class="mr-2 size-4" />
        {{ t('docker.volumes.actions.remove') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>

  <AlertDialog v-model:open="removeDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader class="items-center text-center">
        <div class="mb-2 flex size-12 items-center justify-center rounded-full bg-red-500/15 dark:bg-red-500/20">
          <TriangleAlert class="size-6 text-red-600 dark:text-red-400" />
        </div>
        <AlertDialogTitle>{{ t('docker.volumes.modals.deleteConfirmTitle') }}</AlertDialogTitle>
        <AlertDialogDescription class="text-center">
          {{ t('docker.volumes.modals.deleteConfirmContent', { count: 1, names: volume.name }) }}
          <span class="mt-4 flex items-center justify-center gap-3">
            <Checkbox id="volume-delete-dont-ask" :checked="dontAskAgain" @update:checked="(v) => dontAskAgain = v === true" />
            <Label for="volume-delete-dont-ask">Don't ask next again</Label>
          </span>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('docker.volumes.modals.cancel') }}</AlertDialogCancel>
        <AlertDialogAction class="bg-primary text-primary-foreground hover:bg-primary/90" @click="handleRemove">
          {{ t('docker.volumes.modals.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
