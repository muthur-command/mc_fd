<script setup lang="ts">
import { Upload } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { importImageApi } from '@/plugin/docker/api'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void, (e: 'imported'): void }>()

const { t } = useI18n()
const file = ref<File | null>(null)
const fileName = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const loading = ref(false)

watch(() => props.open, (open) => {
  if (!open) {
    file.value = null
    fileName.value = ''
  }
})

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const f = input.files?.[0]
  if (!f)
    return
  if (!f.name.endsWith('.tar')) {
    toast.error(t('docker.images.messages.invalidFileType'))
    input.value = ''
    return
  }
  file.value = f
  fileName.value = f.name
  input.value = ''
}

function openFilePicker() {
  fileInputRef.value?.click()
}

async function doImport() {
  if (!file.value)
    return
  loading.value = true
  try {
    await importImageApi(file.value)
    toast.success(t('docker.images.messages.importSuccess'))
    emit('imported')
    emit('update:open', false)
    file.value = null
    fileName.value = ''
  }
  catch (e: any) {
    const msg
      = e?.response?.data?.msg ?? e?.message ?? t('docker.images.messages.importFailed')
    toast.error(msg)
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ t('docker.images.modals.importTitle') }}</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <Alert>
          <AlertDescription>{{ t('docker.images.import.description') }}</AlertDescription>
        </Alert>
        <div class="grid gap-2">
          <Label>{{ t('docker.images.import.fileLabel') }}</Label>
          <input
            ref="fileInputRef"
            type="file"
            accept=".tar"
            class="hidden"
            @change="onFileChange"
          >
          <button
            type="button"
            class="border-input bg-background hover:bg-muted/50 flex min-h-[80px] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed p-4 text-sm transition-colors"
            @click="openFilePicker"
          >
            <Upload class="size-8 text-muted-foreground" />
            <span v-if="!fileName" class="text-muted-foreground">
              {{ t('docker.images.import.selectFile') }}
            </span>
            <span v-else class="font-medium text-foreground">{{ fileName }}</span>
          </button>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="emit('update:open', false)">
            {{ t('docker.images.modals.cancel') }}
          </Button>
          <Button :disabled="!file || loading" @click="doImport">
            {{ t('docker.images.modals.confirm') }}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
