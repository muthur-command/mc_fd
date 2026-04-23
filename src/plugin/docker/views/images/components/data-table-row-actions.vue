<script setup lang="ts">
import type { Row } from '@tanstack/vue-table'

import { Ellipsis, Trash2, TriangleAlert } from 'lucide-vue-next'
import { inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import type { ImageListResponse } from '@/plugin/docker/api'

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
import { removeImageApi } from '@/plugin/docker/api'

interface Props {
  row: Row<ImageListResponse>
}

const props = defineProps<Props>()
const image = computed(() => props.row.original)
const { t } = useI18n()
const refresh = inject<() => Promise<void>>('imageListFetch', () => Promise.resolve())

const removeDialogOpen = ref(false)
const dontAskAgain = ref(false)

function onRemoveMenuSelect(e: Event) {
  e.preventDefault()
  removeDialogOpen.value = true
}

async function handleRemove() {
  try {
    await removeImageApi(image.value.id, false)
    toast.success(t('docker.images.messages.deleteSuccess', { count: 1 }))
    removeDialogOpen.value = false
    await refresh()
  }
  catch {
    toast.error(t('docker.images.messages.deleteFailed'))
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
      <DropdownMenuItem variant="destructive" @select="onRemoveMenuSelect">
        <Trash2 class="mr-2 size-4" />
        {{ t('docker.images.actions.remove') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>

  <AlertDialog v-model:open="removeDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader class="items-center text-center">
        <div class="mb-2 flex size-12 items-center justify-center rounded-full bg-red-500/15 dark:bg-red-500/20">
          <TriangleAlert class="size-6 text-red-600 dark:text-red-400" />
        </div>
        <AlertDialogTitle>{{ t('docker.images.messages.deleteConfirmTitle') }}</AlertDialogTitle>
        <AlertDialogDescription class="text-center">
          {{ t('docker.images.messages.deleteConfirmContent', { count: 1 }) }}
          <span class="mt-4 flex items-center justify-center gap-3">
            <Checkbox id="image-delete-dont-ask" :checked="dontAskAgain" @update:checked="(v: boolean | 'indeterminate') => dontAskAgain = v === true" />
            <Label for="image-delete-dont-ask">Don't ask next again</Label>
          </span>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('docker.images.modals.cancel') }}</AlertDialogCancel>
        <AlertDialogAction class="bg-primary text-primary-foreground hover:bg-primary/90" @click="handleRemove">
          {{ t('docker.images.modals.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
