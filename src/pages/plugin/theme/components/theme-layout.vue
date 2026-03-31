<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { BasicPage } from '@/components/global-layout'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
  }>(),
  { title: '', description: '' },
)

const { t } = useI18n()
const pageTitle = computed(() => props.title || t('pluginTheme.title'))
const pageDesc = computed(() => props.description ?? t('pluginTheme.description'))
</script>

<template>
  <BasicPage
    :title="pageTitle"
    :description="pageDesc"
  >
    <template #actions>
      <slot name="actions" />
    </template>

    <slot />
  </BasicPage>
</template>
