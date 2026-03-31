<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <h1 class="flex items-center gap-2 text-xl font-bold">
    <span class="text-2xl" aria-hidden="true">🐣</span>
    <span>{{ t('auth.appName') }}</span>
  </h1>
</template>
