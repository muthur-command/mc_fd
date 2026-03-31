<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import type { RegistrySourceResponse } from '@/plugin/docker/api'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { pullImageApi } from '@/plugin/docker/api'

const props = defineProps<{
  registries: RegistrySourceResponse[]
  loading?: boolean
}>()

const emit = defineEmits<{ pulled: [] }>()

const { t } = useI18n()
const selectedRegistryId = ref('')
const imageInput = ref('')
const pullLoading = ref(false)

const registryOptions = computed(() =>
  props.registries.map(r => ({ value: r.id, label: r.name })),
)

const currentRegistryUrl = computed(() => {
  const r = props.registries.find(x => x.id === selectedRegistryId.value)
  return r?.url ?? 'docker.io'
})

watch(
  () => props.registries,
  (regs) => {
    if (regs.length && !selectedRegistryId.value) {
      const defaultOne = regs.find(r => r.is_default) ?? regs[0]
      if (defaultOne)
        selectedRegistryId.value = defaultOne.id
    }
  },
  { immediate: true },
)

async function pull() {
  const raw = imageInput.value.trim()
  if (!raw) {
    toast.warning(t('docker.images.messages.imageNameRequired'))
    return
  }
  const parts = raw.split(':')
  const image = parts[0]
  const tag = parts[1] ?? t('docker.images.common.defaultTag')
  pullLoading.value = true
  try {
    await pullImageApi({ image, tag })
    toast.success(t('docker.images.messages.pullSuccess'))
    imageInput.value = ''
    emit('pulled')
  }
  catch (e: any) {
    const msg
      = e?.response?.data?.msg ?? e?.message ?? t('docker.images.messages.pullFailed')
    toast.error(msg)
  }
  finally {
    pullLoading.value = false
  }
}
</script>

<template>
  <Card class="flex h-[280px] max-h-[280px] flex-col overflow-hidden gap-y-0 pt-0 pb-6">
    <CardHeader class="flex-shrink-0 py-4">
      <CardTitle class="text-base">
        {{ t('docker.images.pullImage.title') }}
      </CardTitle>
    </CardHeader>
    <CardContent class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <div class="space-y-2">
        <Label>{{ t('docker.images.pullImage.registry') }}</Label>
        <Select v-model="selectedRegistryId" :disabled="loading">
          <SelectTrigger class="w-full min-w-[200px]">
            <SelectValue :placeholder="t('docker.images.pullImage.registry')" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="opt in registryOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="space-y-2">
        <Label>
          {{ t('docker.images.pullImage.image') }}
          <span class="text-destructive">*</span>
        </Label>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-muted-foreground text-sm">{{ currentRegistryUrl }}/</span>
          <Input
            v-model="imageInput"
            :placeholder="t('docker.images.pullImage.imagePlaceholder')"
            class="min-w-[180px] flex-1"
            @keydown.enter="pull"
          />
          <InspiraUiRainbowButton
            class="!h-9 gap-1.5 !rounded-md !px-2.5 text-sm"
            :disabled="!imageInput.trim() || pullLoading"
            @click="pull"
          >
            {{ t('docker.images.pullImage.pullButton') }}
          </InspiraUiRainbowButton>
        </div>
        <p v-if="!imageInput.trim()" class="text-muted-foreground text-xs">
          {{ t('docker.images.pullImage.imageRequired') }}
        </p>
      </div>
      <Alert class="mt-2">
        <AlertDescription>
          {{ t('docker.images.pullImage.anonymousAccountInfo') }}
        </AlertDescription>
      </Alert>
    </CardContent>
  </Card>
</template>
