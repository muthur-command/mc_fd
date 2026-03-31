<script setup lang="ts">
import { inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { RPC } from '@/plugin/openclaw/lib/rpc-methods'

const { t } = useI18n()
const gateway = inject<ReturnType<import('@/plugin/openclaw/composables/use-openclaw-gateway').default>>('openclaw-gateway')!
const status = ref<unknown>(null)
const health = ref<unknown>(null)
const models = ref<unknown[]>([])
const loading = ref(false)

async function load() {
  if (!gateway?.connected)
    return
  loading.value = true
  try {
    const [st, he, ml] = await Promise.all([
      gateway.request(RPC.status),
      gateway.request(RPC.health).catch(() => null),
      gateway.request<{ models?: unknown[] }>(RPC.modelsList).then(r => r?.models ?? []).catch(() => []),
    ])
    status.value = st
    health.value = he
    models.value = Array.isArray(ml) ? ml : []
  }
  finally {
    loading.value = false
  }
}

watch(() => gateway?.connected, (c) => {
  if (c)
    load()
}, { immediate: true })
</script>

<template>
  <div class="space-y-4">
    <UiCard v-if="!gateway?.connected">
      <UiCardContent class="py-8 text-center text-muted-foreground text-sm">
        {{ t('openclaw.connectFirst') }}
      </UiCardContent>
    </UiCard>
    <template v-else>
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>{{ t('openclaw.debugStatus') }}</UiCardTitle>
        </UiCardHeader>
        <UiCardContent>
          <div v-if="loading" class="text-muted-foreground text-sm">
            {{ t('common.loading') }}
          </div>
          <pre v-else class="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">{{ JSON.stringify(status, null, 2) }}</pre>
        </UiCardContent>
      </UiCard>
      <UiCard v-if="health">
        <UiCardHeader>
          <UiCardTitle>{{ t('openclaw.debugHealth') }}</UiCardTitle>
        </UiCardHeader>
        <UiCardContent>
          <pre class="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">{{ JSON.stringify(health, null, 2) }}</pre>
        </UiCardContent>
      </UiCard>
      <UiCard v-if="models.length">
        <UiCardHeader>
          <UiCardTitle>{{ t('openclaw.debugModels') }}</UiCardTitle>
        </UiCardHeader>
        <UiCardContent>
          <pre class="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">{{ JSON.stringify(models, null, 2) }}</pre>
        </UiCardContent>
      </UiCard>
    </template>
  </div>
</template>
