<script setup lang="ts">
/**
 * Gateway 连接弹窗：配置 wsUrl（可选覆盖）、token、password，连接/断开
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  open: boolean
  config: ReturnType<typeof import('@/plugin/openclaw/composables/use-openclaw-config').useOpenClawConfig>
  auth: ReturnType<typeof import('@/plugin/openclaw/composables/use-openclaw-auth').useOpenClawAuth>
  gateway: ReturnType<typeof import('@/plugin/openclaw/composables/use-openclaw-gateway').useOpenClawGateway>
}>()

const emit = defineEmits<{ 'update:open': [v: boolean] }>()

const { t } = useI18n()
const wsUrlOverride = ref('')
const tokenInput = ref('')
const passwordInput = ref('')
const connecting = ref(false)
const errorMessage = ref('')

const effectiveWsUrl = computed(() => wsUrlOverride.value.trim() || props.config.config.value?.wsUrl || '')

watch(
  () => props.open,
  (open) => {
    if (open) {
      wsUrlOverride.value = ''
      tokenInput.value = props.auth.token.value
      passwordInput.value = props.auth.password.value
      errorMessage.value = ''
    }
  },
)

watch(
  () => props.auth.token.value,
  (v) => { tokenInput.value = v },
)
watch(
  () => props.auth.password.value,
  (v) => { passwordInput.value = v },
)

async function doConnect() {
  errorMessage.value = ''
  if (!effectiveWsUrl.value) {
    errorMessage.value = t('openclaw.connectNeedUrl')
    return
  }
  props.auth.setToken(tokenInput.value)
  props.auth.setPassword(passwordInput.value)
  connecting.value = true
  try {
    props.config.setConfig({
      baseUrl: effectiveWsUrl.value.replace(/^ws/, 'http').replace(/^wss/, 'https'),
      wsUrl: effectiveWsUrl.value,
    })
    props.gateway.connect({ explicit: true })
    await new Promise<void>((resolve, reject) => {
      const check = setInterval(() => {
        if (props.gateway.connected) {
          clearInterval(check)
          resolve()
        }
        if (props.gateway.status === 'error' && props.gateway.lastError) {
          clearInterval(check)
          reject(new Error(props.gateway.lastError))
        }
      }, 100)
      setTimeout(() => {
        clearInterval(check)
        if (!props.gateway.connected)
          reject(new Error('Connection timeout'))
      }, 15000)
    })
    emit('update:open', false)
  }
  catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    connecting.value = false
  }
}

function doDisconnect() {
  props.gateway.disconnect({ stopAutoReconnect: true })
  emit('update:open', false)
}
</script>

<template>
  <UiDialog :open="props.open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="sm:max-w-md">
      <UiDialogHeader>
        <UiDialogTitle>{{ t('openclaw.connectTitle') }}</UiDialogTitle>
        <UiDialogDescription>
          {{ t('openclaw.connectDesc') }}
        </UiDialogDescription>
      </UiDialogHeader>
      <form class="flex flex-col gap-4" @submit.prevent="doConnect">
        <div class="space-y-2">
          <UiLabel for="openclaw-ws-url">
            {{ t('openclaw.wsUrl') }}
          </UiLabel>
          <UiInput
            id="openclaw-ws-url"
            v-model="wsUrlOverride"
            type="text"
            :placeholder="props.config.config.value?.wsUrl?.trim() || t('openclaw.connectWsUrlPlaceholder')"
            class="font-mono text-sm"
          />
        </div>
        <div class="space-y-2">
          <UiLabel for="openclaw-token">
            {{ t('openclaw.token') }}
          </UiLabel>
          <UiInput
            id="openclaw-token"
            v-model="tokenInput"
            type="password"
            autocomplete="off"
            :placeholder="t('openclaw.tokenPlaceholder')"
          />
        </div>
        <div class="space-y-2">
          <UiLabel for="openclaw-password">
            {{ t('openclaw.password') }}
          </UiLabel>
          <UiInput
            id="openclaw-password"
            v-model="passwordInput"
            type="password"
            autocomplete="off"
            :placeholder="t('openclaw.passwordPlaceholder')"
          />
        </div>
        <UiAlert v-if="errorMessage" variant="destructive">
          {{ errorMessage }}
        </UiAlert>
        <div class="flex justify-end gap-2">
          <UiButton type="button" variant="outline" @click="emit('update:open', false)">
            {{ t('common.cancel') }}
          </UiButton>
          <UiButton v-if="gateway.connected" type="button" variant="destructive" @click="doDisconnect">
            {{ t('openclaw.disconnect') }}
          </UiButton>
          <UiButton type="submit" :disabled="connecting">
            {{ connecting ? t('openclaw.connecting') : t('openclaw.connect') }}
          </UiButton>
        </div>
      </form>
    </UiDialogContent>
  </UiDialog>
</template>
