<script lang="ts" setup>
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import { getOAuth2Github, getOAuth2Google } from '@/services/api/plugin/oauth2.api'
import { useAuthStore } from '@/stores/auth'

import OAuth2ThirdParty from './oauth2-third-party.vue'
import PrivacyPolicyButton from './privacy-policy-button.vue'
import TermsOfServiceButton from './terms-of-service-button.vue'
import ToForgotPasswordLink from './to-forgot-password-link.vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { loginLoading, captchaUuid } = storeToRefs(authStore)

const username = ref('')
const password = ref('')
const captchaCode = ref('')

const captchaEnabled = ref(false)
const captchaImageSrc = ref('')
const captchaExpireSeconds = ref(0)
let refreshTimer: ReturnType<typeof setTimeout> | null = null

const captchaLoadFailed = ref(false)

/** 登录成功后正在跳转至目标页，显示进度条 */
const navigatingAfterLogin = ref(false)
const navigatingProgress = ref(0)
let navigatingProgressTimer: ReturnType<typeof setInterval> | null = null

async function refreshCaptcha() {
  try {
    captchaLoadFailed.value = false
    const res = await authStore.captcha()
    captchaEnabled.value = res.is_enabled
    captchaExpireSeconds.value = res.expire_seconds
    captchaImageSrc.value = res.image ? `data:image/png;base64,${res.image}` : ''

    if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }
    if (res.is_enabled && res.expire_seconds > 0) {
      const delay = Math.max((res.expire_seconds - 3) * 1000, 1000)
      refreshTimer = setTimeout(refreshCaptcha, delay)
    }
  }
  catch {
    captchaEnabled.value = false
    captchaLoadFailed.value = true
  }
}

onMounted(() => {
  refreshCaptcha()
})

onUnmounted(() => {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
  if (navigatingProgressTimer) {
    clearInterval(navigatingProgressTimer)
    navigatingProgressTimer = null
  }
})

async function handleSubmit() {
  if (!username.value.trim()) {
    toast.error(t('auth.toast.fillUsername'))
    return
  }
  if (!password.value) {
    toast.error(t('auth.toast.fillPassword'))
    return
  }
  if (captchaEnabled.value && !captchaCode.value.trim()) {
    toast.error(t('auth.toast.fillCaptcha'))
    return
  }

  try {
    const { userInfo } = await authStore.authLogin({
      username: username.value.trim(),
      password: password.value,
      captcha: captchaCode.value.trim(),
      uuid: captchaUuid.value ?? '',
    })
    if (userInfo?.nickname) {
      toast.success(t('auth.toast.loginSuccess', { name: userInfo.nickname }))
    }
    refreshCaptcha()
    captchaCode.value = ''
    const redirect = route.query.redirect as string
    const target = redirect && !redirect.startsWith('//') ? redirect : '/dashboard'

    // 显示“正在跳转”进度条，直到路由切换完成
    navigatingAfterLogin.value = true
    navigatingProgress.value = 0
    navigatingProgressTimer = setInterval(() => {
      navigatingProgress.value = Math.min(navigatingProgress.value + 8, 90)
    }, 120)
    try {
      await router.push(target)
    }
    finally {
      if (navigatingProgressTimer) {
        clearInterval(navigatingProgressTimer)
        navigatingProgressTimer = null
      }
      navigatingProgress.value = 100
      navigatingAfterLogin.value = false
    }
  }
  catch {
    refreshCaptcha()
    captchaCode.value = ''
    // const msg = err instanceof Error ? err.message : (err as any)?.response?.data?.msg ?? t('auth.toast.loginFailed')
    // toast.error(msg)
  }
}

async function oauth2Github() {
  try {
    const url = await getOAuth2Github()
    window.location.href = url
  }
  catch (e) {
    console.error(e)
  }
}

async function oauth2Google() {
  try {
    const url = await getOAuth2Google()
    window.location.href = url
  }
  catch (e) {
    console.error(e)
  }
}
</script>

<template>
  <UiCard class="w-full max-w-lg">
    <UiCardHeader>
      <UiCardTitle class="text-2xl">
        {{ t('auth.title') }}
      </UiCardTitle>
      <UiCardDescription>
        {{ t('auth.description') }}
        <UiButton
          type="button"
          variant="link"
          class="px-0 text-muted-foreground"
          @click="$router.push('/auth/sign-up')"
        >
          {{ t('auth.register') }}
        </UiButton>
      </UiCardDescription>
    </UiCardHeader>
    <UiCardContent class="grid gap-4">
      <!-- 登录成功后跳转中：显示进度条 -->
      <div
        v-if="navigatingAfterLogin"
        class="flex flex-col items-center justify-center gap-4 py-6"
      >
        <UiProgress
          :model-value="navigatingProgress"
          class="h-2 w-full [&_[data-slot=progress-indicator]]:bg-primary"
        />
        <p class="text-muted-foreground text-sm">
          {{ t('auth.toast.redirecting') }}
        </p>
      </div>
      <form
        v-else
        class="grid gap-4"
        @submit.prevent="handleSubmit"
      >
        <div class="grid gap-2">
          <UiLabel for="username">
            {{ t('auth.username') }}
          </UiLabel>
          <UiInput
            id="username"
            v-model="username"
            type="text"
            :placeholder="t('auth.usernamePlaceholder')"
            required
            autocomplete="username"
          />
        </div>
        <div class="grid gap-2">
          <div class="flex items-center justify-between">
            <UiLabel for="password">
              {{ t('auth.password') }}
            </UiLabel>
            <div class="flex items-center gap-2">
              <ToForgotPasswordLink />
              <UiButton
                type="button"
                variant="link"
                class="text-muted-foreground px-0 text-xs"
                @click="$router.push('/auth/code-login')"
              >
                {{ t('auth.codeLogin') }}
              </UiButton>
            </div>
          </div>
          <UiInput
            id="password"
            v-model="password"
            type="password"
            :placeholder="t('auth.passwordPlaceholder')"
            required
            autocomplete="current-password"
          />
        </div>

        <p v-if="captchaLoadFailed" class="text-muted-foreground text-xs">
          {{ t('auth.captchaUnavailable') }}
        </p>
        <div v-if="captchaEnabled" class="grid gap-2">
          <UiLabel>{{ t('auth.captcha') }}</UiLabel>
          <div class="flex items-center gap-2">
            <UiInput
              v-model="captchaCode"
              type="text"
              :placeholder="t('auth.captchaPlaceholder')"
              class="flex-1"
              autocomplete="off"
            />
            <button
              type="button"
              class="border-input flex h-10 shrink-0 items-center justify-center rounded-md border bg-background px-3"
              :title="t('auth.refreshCaptcha')"
              @click="refreshCaptcha"
            >
              <img
                v-if="captchaImageSrc"
                :src="captchaImageSrc"
                :alt="t('auth.captcha')"
                class="h-8 w-[120px] object-contain"
              >
              <span v-else class="text-muted-foreground text-xs">{{ t('auth.loading') }}</span>
            </button>
          </div>
        </div>

        <UiButton
          type="submit"
          class="w-full"
          :disabled="loginLoading"
        >
          <UiSpinner v-if="loginLoading" class="mr-2 size-4" />
          {{ loginLoading ? t('auth.submitting') : t('auth.submit') }}
        </UiButton>
      </form>

      <OAuth2ThirdParty
        @github="oauth2Github"
        @google="oauth2Google"
      />

      <UiCardDescription>
        {{ t('auth.termsPrefix') }}
        <TermsOfServiceButton />
        {{ t('auth.termsAnd') }}
        <PrivacyPolicyButton />
      </UiCardDescription>
    </UiCardContent>
  </UiCard>
</template>
