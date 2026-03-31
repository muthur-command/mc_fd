<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

import ComingSoonContent from '@/components/coming-soon-content.vue'
import { BasicPage } from '@/components/global-layout'

const { t } = useI18n()
</script>

<template>
  <BasicPage
    :title="t('help.pageTitle')"
    :description="t('help.pageDescription')"
  >
    <ComingSoonContent />
  </BasicPage>
</template>
