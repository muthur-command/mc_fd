<script setup lang="ts">
import { inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { RPC } from '@/plugin/openclaw/lib/rpc-methods'

const { t } = useI18n()
const gateway = inject<ReturnType<typeof import('@/plugin/openclaw/composables/use-openclaw-gateway').useOpenClawGateway>>('openclaw-gateway')!
const logLines = ref<string[]>([])
const loading = ref(false)

async function load() {
  if (!gateway?.connected)
    return
  loading.value = true
  try {
    const res = await gateway.request<{ lines?: string[], log?: string }>(RPC.logsTail, { limit: 200 })
    if (Array.isArray(res?.lines))
      logLines.value = res.lines
    else if (typeof res?.log === 'string')
      logLines.value = res.log.split('\n')
    else logLines.value = []
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
    <UiCard v-else>
      <UiCardHeader>
        <UiCardTitle>{{ t('openclaw.logsTitle') }}</UiCardTitle>
      </UiCardHeader>
      <UiCardContent>
        <div v-if="loading" class="text-muted-foreground text-sm">
          {{ t('common.loading') }}
        </div>
        <UiScrollArea v-else class="h-[400px] rounded-md border">
          <pre class="p-3 font-mono text-xs">{{ logLines.join('\n') || t('openclaw.noData') }}</pre>
        </UiScrollArea>
      </UiCardContent>
    </UiCard>
  </div>
</template>
