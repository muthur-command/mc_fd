<script lang="ts" setup>
import { ref } from 'vue'
/**
 * 手机验证码登录（后端短信接口未对接时仅展示 UI）
 */
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import AuthTitle from './components/auth-title.vue'

const { t } = useI18n()
const phone = ref('')
const code = ref('')
const loading = ref(false)
const sendLoading = ref(false)
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

async function sendCode() {
  if (!/^\d{11}$/.test(phone.value)) {
    toast.error(t('auth.codeLoginPage.toast.invalidPhone'))
    return
  }
  sendLoading.value = true
  // 后端短信验证码接口未对接，仅提示
  toast.info(t('auth.codeLoginPage.toast.needBackend'))
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0 && countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
  sendLoading.value = false
}

function handleSubmit() {
  if (!phone.value.trim()) {
    toast.error(t('auth.codeLoginPage.toast.fillPhone'))
    return
  }
  if (code.value.length !== 6) {
    toast.error(t('auth.codeLoginPage.toast.fillCode'))
    return
  }
  loading.value = true
  // 此处可对接后端手机号+验证码登录接口
  setTimeout(() => {
    loading.value = false
    toast.info(t('auth.codeLoginPage.toast.needBackend'))
  }, 500)
}

onUnmounted(() => {
  if (countdownTimer)
    clearInterval(countdownTimer)
})
</script>

<template>
  <div class="flex min-h-screen min-w-screen items-center justify-center p-4">
    <main class="flex w-full max-w-md flex-col gap-4">
      <AuthTitle />
      <UiCard class="w-full">
        <UiCardHeader>
          <UiCardTitle class="text-2xl">
            {{ t('auth.codeLoginPage.title') }}
          </UiCardTitle>
          <UiCardDescription>
            {{ t('auth.codeLoginPage.description') }}
          </UiCardDescription>
        </UiCardHeader>
        <UiCardContent class="grid gap-4">
          <div class="grid gap-2">
            <UiLabel for="phone">
              {{ t('auth.codeLoginPage.phone') }}
            </UiLabel>
            <UiInput
              id="phone" v-model="phone" type="tel" :placeholder="t('auth.codeLoginPage.phonePlaceholder')"
              maxlength="11"
            />
          </div>
          <div class="grid gap-2">
            <UiLabel for="code">
              {{ t('auth.codeLoginPage.code') }}
            </UiLabel>
            <div class="flex gap-2">
              <UiInput
                id="code" v-model="code" type="text" :placeholder="t('auth.codeLoginPage.codePlaceholder')"
                maxlength="6" class="flex-1"
              />
              <UiButton type="button" variant="outline" :disabled="sendLoading || countdown > 0" @click="sendCode">
                {{ countdown > 0 ? t('auth.codeLoginPage.resendAfter', { n: countdown }) : (sendLoading
                  ? t('auth.codeLoginPage.sending') : t('auth.codeLoginPage.getCode')) }}
              </UiButton>
            </div>
          </div>
          <UiButton class="w-full" :disabled="loading" @click="handleSubmit">
            <UiSpinner v-if="loading" class="mr-2 size-4" />
            {{ t('auth.submit') }}
          </UiButton>
        </UiCardContent>
        <UiCardFooter>
          <UiButton variant="link" class="text-muted-foreground px-0" @click="$router.push('/auth/sign-in')">
            {{ t('auth.codeLoginPage.passwordLogin') }}
          </UiButton>
        </UiCardFooter>
      </UiCard>
    </main>
  </div>
</template>
