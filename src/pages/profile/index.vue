<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

import { BasicPage } from '@/components/global-layout'

import ProfileCard from './components/profile-card.vue'
import ProfileSettingsCard from './components/profile-settings-card.vue'

const { t } = useI18n()
</script>

<template>
  <BasicPage
    :title="t('profile.pageTitle')"
    :description="t('profile.pageDescription')"
  >
    <div class="space-y-4">
      <div class="grid gap-4 xl:grid-cols-3">
        <div class="space-y-4 xl:col-span-1">
          <ProfileCard />
        </div>
        <div class="xl:col-span-2">
          <ProfileSettingsCard />
        </div>
      </div>
    </div>
  </BasicPage>
</template>
