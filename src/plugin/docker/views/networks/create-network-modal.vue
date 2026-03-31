<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { CreateNetworkParam } from '@/plugin/docker/api'

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
  (e: 'confirm', values: CreateNetworkParam): void
}>()

const { t } = useI18n()
const name = ref('')
const driver = ref('bridge')
const subnet = ref('')
const gateway = ref('')

const canSubmit = computed(() => name.value.trim() !== '')

watch(() => props.open, (open) => {
  if (!open) {
    name.value = ''
    driver.value = 'bridge'
    subnet.value = ''
    gateway.value = ''
  }
})

function submit() {
  const n = name.value.trim()
  if (!n)
    return
  emit('confirm', {
    name: n,
    driver: driver.value.trim() || undefined,
    subnet: subnet.value.trim() || undefined,
    gateway: gateway.value.trim() || undefined,
  })
  emit('update:open', false)
  name.value = ''
  driver.value = 'bridge'
  subnet.value = ''
  gateway.value = ''
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('docker.networks.modals.createTitle') }}</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <Label for="network-name">{{ t('docker.networks.form.name') }} *</Label>
          <Input
            id="network-name"
            v-model="name"
            :placeholder="t('docker.networks.form.namePlaceholder')"
          />
        </div>
        <div class="grid gap-2">
          <Label for="network-driver">{{ t('docker.networks.form.driver') }}</Label>
          <Input
            id="network-driver"
            v-model="driver"
            :placeholder="t('docker.networks.form.driverPlaceholder')"
          />
        </div>
        <div class="grid gap-2">
          <Label for="network-subnet">{{ t('docker.networks.form.subnet') }}</Label>
          <Input
            id="network-subnet"
            v-model="subnet"
            :placeholder="t('docker.networks.form.subnetPlaceholder')"
          />
        </div>
        <div class="grid gap-2">
          <Label for="network-gateway">{{ t('docker.networks.form.gateway') }}</Label>
          <Input
            id="network-gateway"
            v-model="gateway"
            :placeholder="t('docker.networks.form.gatewayPlaceholder')"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">
          {{ t('docker.networks.modals.cancel') }}
        </Button>
        <Button :disabled="!canSubmit" @click="submit">
          {{ t('docker.networks.modals.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
