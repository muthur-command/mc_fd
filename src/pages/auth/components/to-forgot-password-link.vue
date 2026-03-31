<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <UiButton
    type="button"
    variant="link"
    class="text-muted-foreground px-0"
    @click="$router.push('/auth/forgot-password')"
  >
    {{ t('auth.forgotPassword') }}
  </UiButton>
</template>
