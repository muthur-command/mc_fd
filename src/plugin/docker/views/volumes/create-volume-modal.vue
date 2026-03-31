<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { CreateVolumeParam } from '@/plugin/docker/api'

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
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'confirm', values: CreateVolumeParam): void
}>()

const { t } = useI18n()
const name = ref('')
const driver = ref('local')

const canSubmit = computed(() => name.value.trim() !== '')

watch(() => props.open, (open) => {
  if (!open) {
    name.value = ''
    driver.value = 'local'
  }
})

function submit() {
  const n = name.value.trim()
  if (!n)
    return
  emit('confirm', {
    name: n,
    driver: driver.value.trim() || undefined,
  })
  emit('update:open', false)
  name.value = ''
  driver.value = 'local'
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('docker.volumes.modals.createTitle') }}</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <Label for="volume-name">{{ t('docker.volumes.form.name') }} *</Label>
          <Input
            id="volume-name"
            v-model="name"
            :placeholder="t('docker.volumes.form.namePlaceholder')"
          />
        </div>
        <div class="grid gap-2">
          <Label for="volume-driver">{{ t('docker.volumes.form.driver') }}</Label>
          <Input
            id="volume-driver"
            v-model="driver"
            :placeholder="t('docker.volumes.form.driverPlaceholder')"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">
          {{ t('docker.volumes.modals.cancel') }}
        </Button>
        <Button :disabled="!canSubmit" @click="submit">
          {{ t('docker.volumes.modals.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
