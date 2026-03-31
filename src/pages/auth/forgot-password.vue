<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import AuthTitle from './components/auth-title.vue'

const { t } = useI18n()
const email = ref('')
const loading = ref(false)

function handleSubmit() {
  if (!email.value.trim()) {
    toast.error(t('auth.forgotPasswordPage.toast.fillEmail'))
    return
  }
  loading.value = true
  // 可对接后端找回密码接口
  setTimeout(() => {
    loading.value = false
    toast.info(t('auth.forgotPasswordPage.toast.afterBackend'))
  }, 500)
}
</script>

<template>
  <div class="flex min-h-screen min-w-screen items-center justify-center p-4">
    <main class="flex w-full max-w-md flex-col gap-4">
      <AuthTitle />
      <UiCard class="w-full">
        <UiCardHeader>
          <UiCardTitle class="text-2xl">
            {{ t('auth.forgotPasswordPage.title') }}
          </UiCardTitle>
          <UiCardDescription>
            {{ t('auth.forgotPasswordPage.description') }}
          </UiCardDescription>
        </UiCardHeader>
        <UiCardContent class="grid gap-4">
          <div class="grid gap-2">
            <UiLabel for="email">
              {{ t('auth.forgotPasswordPage.email') }}
            </UiLabel>
            <UiInput
              id="email"
              v-model="email"
              type="email"
              :placeholder="t('auth.forgotPasswordPage.emailPlaceholder')"
              required
            />
          </div>
          <UiButton class="w-full" :disabled="loading" @click="handleSubmit">
            <UiSpinner v-if="loading" class="mr-2 size-4" />
            {{ t('auth.forgotPasswordPage.sendResetLink') }}
          </UiButton>
        </UiCardContent>
        <UiCardFooter class="flex flex-col gap-2">
          <UiButton variant="link" class="text-muted-foreground px-0" @click="$router.push('/auth/sign-in')">
            {{ t('auth.forgotPasswordPage.backToLogin') }}
          </UiButton>
          <span class="text-muted-foreground text-sm">
            {{ t('auth.forgotPasswordPage.noAccount') }}
            <UiButton variant="link" class="px-0 text-muted-foreground" @click="$router.push('/auth/sign-up')">
              {{ t('auth.register') }}
            </UiButton>
          </span>
        </UiCardFooter>
      </UiCard>
    </main>
  </div>
</template>
