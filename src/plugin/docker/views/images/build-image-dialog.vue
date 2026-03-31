<script setup lang="ts">
import { Upload } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { buildImageFromUploadApi } from '@/plugin/docker/api'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void, (e: 'built'): void }>()

const { t } = useI18n()
const tag = ref('')
const file = ref<File | null>(null)
const fileName = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const loading = ref(false)

const acceptExtensions = '.tar,.tar.gz,.tgz'

const canBuild = computed(() => tag.value.trim() !== '' && file.value != null)

watch(() => props.open, (open) => {
  if (!open) {
    tag.value = ''
    file.value = null
    fileName.value = ''
  }
})

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const f = input.files?.[0]
  if (!f)
    return
  const name = f.name.toLowerCase()
  if (
    !name.endsWith('.tar')
    && !name.endsWith('.tar.gz')
    && !name.endsWith('.tgz')
  ) {
    toast.error(t('docker.images.messages.invalidBuildFileType'))
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

async function build() {
  if (!canBuild.value || !file.value)
    return
  loading.value = true
  try {
    await buildImageFromUploadApi(file.value, tag.value.trim(), 'Dockerfile')
    toast.success(t('docker.images.messages.buildSuccess'))
    emit('built')
    emit('update:open', false)
    tag.value = ''
    file.value = null
    fileName.value = ''
  }
  catch (e: any) {
    const msg
      = e?.response?.data?.msg ?? e?.message ?? t('docker.images.messages.buildFailed')
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
        <DialogTitle>{{ t('docker.images.modals.buildTitle') }}</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <Alert>
          <AlertDescription>{{ t('docker.images.build.description') }}</AlertDescription>
        </Alert>
        <div class="grid gap-2">
          <Label>{{ t('docker.images.build.fileLabel') }}</Label>
          <input
            ref="fileInputRef"
            type="file"
            :accept="acceptExtensions"
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
              {{ t('docker.images.build.selectFile') }}
            </span>
            <span v-else class="font-medium text-foreground">{{ fileName }}</span>
          </button>
          <p class="text-muted-foreground text-xs">
            {{ t('docker.images.build.fileHint') }}
          </p>
        </div>
        <div class="grid gap-2">
          <Label for="build-tag">{{ t('docker.images.form.imageTag') }} *</Label>
          <Input
            id="build-tag"
            v-model="tag"
            :placeholder="t('docker.images.form.imageTagPlaceholder')"
          />
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="emit('update:open', false)">
            {{ t('docker.images.modals.cancel') }}
          </Button>
          <Button :disabled="!canBuild || loading" @click="build">
            {{ t('docker.images.build.buildButton') }}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
