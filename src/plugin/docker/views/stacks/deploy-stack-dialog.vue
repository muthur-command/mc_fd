<script setup lang="ts">
import { Upload } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import type { DeployStackParam } from '@/plugin/docker/api'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{ (e: 'update:open', v: boolean): void, (e: 'deployed', payload: DeployStackParam): void }>()

const { t } = useI18n()

const projectName = ref('')
const composeFileContent = ref('')
const fileName = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

const canDeploy = computed(() =>
  projectName.value.trim() !== '' && composeFileContent.value.trim() !== '',
)

watch(() => props.open, (open) => {
  if (!open) {
    projectName.value = ''
    composeFileContent.value = ''
    fileName.value = ''
  }
})

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file)
    return
  fileName.value = file.name
  file.text().then((text) => {
    composeFileContent.value = text
  }).catch(() => {
    toast.error(t('docker.stacks.messages.fileReadFailed'))
  })
  input.value = ''
}

function openFilePicker() {
  fileInputRef.value?.click()
}

function resetForm() {
  projectName.value = ''
  composeFileContent.value = ''
  fileName.value = ''
  emit('update:open', false)
}

defineExpose({
  getPayload,
  resetForm,
})

function getPayload(): DeployStackParam {
  return {
    project_name: projectName.value.trim(),
    compose_file: composeFileContent.value.trim(),
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg" :show-close-button="true">
      <DialogHeader class="gap-1.5 text-left">
        <DialogTitle>{{ t('docker.stacks.modals.deployTitle') }}</DialogTitle>
        <p class="text-muted-foreground text-sm">
          {{ t('docker.stacks.form.composeFileLabel') }}
        </p>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <Label for="project-name">{{ t('docker.stacks.form.projectNameLabel') }}</Label>
          <Input
            id="project-name"
            v-model="projectName"
            type="text"
            :placeholder="t('docker.stacks.form.projectNamePlaceholder')"
          />
        </div>

        <div class="grid gap-2">
          <Label>{{ t('docker.stacks.form.composeFileLabel') }}</Label>
          <input
            ref="fileInputRef"
            type="file"
            accept=".yml,.yaml"
            class="hidden"
            @change="onFileChange"
          >
          <button
            type="button"
            class="border-input bg-background hover:bg-muted/50 flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed p-4 text-sm transition-colors"
            @click="openFilePicker"
          >
            <Upload class="size-10 text-muted-foreground" />
            <span v-if="!fileName" class="text-muted-foreground">
              {{ t('docker.stacks.upload.clickOrDrag') }}
            </span>
            <span v-else class="font-medium text-foreground">{{ fileName }}</span>
          </button>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="resetForm">
            {{ t('common.cancel') }}
          </Button>
          <Button :disabled="!canDeploy" @click="emit('deployed', getPayload())">
            {{ t('docker.stacks.actions.deploy') }}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
