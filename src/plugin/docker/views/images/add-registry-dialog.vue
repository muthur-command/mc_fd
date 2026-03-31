<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { CreateRegistrySourceParam } from '@/plugin/docker/api'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void, (e: 'confirm', data: CreateRegistrySourceParam): void }>()

const { t } = useI18n()
const name = ref('')
const url = ref('')

watch(() => props.open, (open) => {
  if (!open) {
    name.value = ''
    url.value = ''
  }
})

function submit() {
  const n = name.value.trim()
  const u = url.value.trim()
  if (!n || !u)
    return
  emit('confirm', { name: n, url: u })
  emit('update:open', false)
  name.value = ''
  url.value = ''
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('docker.images.modals.addRegistryTitle') }}</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <Label for="registry-name">{{ t('docker.images.form.registryName') }}</Label>
          <Input
            id="registry-name"
            v-model="name"
            :placeholder="t('docker.images.form.registryNamePlaceholder')"
          />
        </div>
        <div class="grid gap-2">
          <Label for="registry-url">{{ t('docker.images.form.url') }}</Label>
          <Input
            id="registry-url"
            v-model="url"
            :placeholder="t('docker.images.form.urlPlaceholder')"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">
          {{ t('docker.images.modals.cancel') }}
        </Button>
        <Button :disabled="!name.trim() || !url.trim()" @click="submit">
          {{ t('docker.images.modals.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
