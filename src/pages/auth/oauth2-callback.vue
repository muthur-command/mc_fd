<script lang="ts" setup>
import { onMounted, ref } from 'vue'
/**
 * OAuth2 第三方登录回调：后端重定向到此页并带上 access_token、session_uuid
 */
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const status = ref<'loading' | 'ok' | 'fail'>('loading')
const message = ref('')

onMounted(async () => {
  try {
    const ok = await authStore.oauth2Login()
    status.value = ok ? 'ok' : 'fail'
    message.value = ok ? t('auth.oauth2Callback.loginSuccess') : t('auth.oauth2Callback.missingToken')
    if (ok) {
      const redirect = (route.query.redirect as string) || '/dashboard'
      await router.push(redirect)
    }
  }
  catch (e) {
    status.value = 'fail'
    message.value = e instanceof Error ? e.message : t('auth.oauth2Callback.loginFailed')
  }
})

function goLogin() {
  router.push('/auth/sign-in')
}
</script>

<template>
  <div class="flex min-h-screen min-w-screen items-center justify-center p-4">
    <div class="text-center">
      <UiSpinner v-if="status === 'loading'" class="mx-auto size-8" />
      <template v-else>
        <p class="mb-2 text-muted-foreground">
          {{ message }}
        </p>
        <UiButton v-if="status === 'fail'" @click="goLogin">
          {{ t('auth.oauth2Callback.backToLogin') }}
        </UiButton>
      </template>
    </div>
  </div>
</template>
