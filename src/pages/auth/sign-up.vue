<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import AuthTitle from './components/auth-title.vue'
import GitHubButton from './components/github-button.vue'
import GoogleButton from './components/google-button.vue'
import PrivacyPolicyButton from './components/privacy-policy-button.vue'
import TermsOfServiceButton from './components/terms-of-service-button.vue'

const { t } = useI18n()
</script>

<template>
  <div class="flex min-h-screen min-w-screen items-center justify-center p-4">
    <main class="flex w-full max-w-md flex-col gap-4">
      <AuthTitle />
      <UiCard class="w-full">
        <UiCardHeader>
          <UiCardTitle class="text-xl">
            {{ t('auth.signUpPage.title') }}
          </UiCardTitle>
          <UiCardDescription>
            {{ t('auth.signUpPage.description') }}
            <UiButton variant="link" class="px-0 text-muted-foreground" @click="$router.push('/auth/sign-in')">
              {{ t('auth.title') }}
            </UiButton>
          </UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <div class="grid gap-4">
            <div class="grid gap-2">
              <UiLabel for="name">
                {{ t('auth.signUpPage.name') }}
              </UiLabel>
              <UiInput id="name" :placeholder="t('auth.signUpPage.namePlaceholder')" required />
            </div>
            <div class="grid gap-2">
              <UiLabel for="email">
                {{ t('auth.signUpPage.email') }}
              </UiLabel>
              <UiInput id="email" type="email" :placeholder="t('auth.signUpPage.emailPlaceholder')" required />
            </div>
            <div class="grid gap-2">
              <UiLabel for="password">
                {{ t('auth.signUpPage.password') }}
              </UiLabel>
              <UiInput id="password" type="password" :placeholder="t('auth.signUpPage.passwordPlaceholder')" />
            </div>
            <div class="grid gap-2">
              <UiLabel for="confirm-password">
                {{ t('auth.signUpPage.confirmPassword') }}
              </UiLabel>
              <UiInput id="confirm-password" type="password" :placeholder="t('auth.signUpPage.passwordPlaceholder')" />
            </div>
            <UiButton type="submit" class="w-full">
              {{ t('auth.signUpPage.createAccount') }}
            </UiButton>

            <UiSeparator :label="t('auth.signUpPage.thirdPartySeparator')" />

            <div class="flex flex-col items-center justify-between gap-4">
              <GitHubButton />
              <GoogleButton />
            </div>

            <UiCardDescription>
              {{ t('auth.signUpPage.termsPrefix') }}
              <TermsOfServiceButton />
              {{ t('auth.termsAnd') }}
              <PrivacyPolicyButton />
            </UiCardDescription>
          </div>
        </UiCardContent>
      </UiCard>
    </main>
  </div>
</template>
