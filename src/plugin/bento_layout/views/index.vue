<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

import type { CardItem } from '@/plugin/card/api'

import { BasicPage } from '@/components/global-layout'
import { getCardListApi } from '@/plugin/card/api'
import { useAuthStore } from '@/stores/auth'

/**
 * Bento 布局：网格来自 bento_layout 插件，卡片数据来自 card 插件 API。
 */
import type { BentoLayoutItem } from '../components'

import { BentoLayout } from '../components'

const { t } = useI18n()
const authStore = useAuthStore()

const layout = ref<BentoLayoutItem[]>([])
const cardCatalog = ref<CardItem[]>([])

async function loadCards() {
  if (!authStore.accessToken) {
    cardCatalog.value = []
    return
  }
  try {
    cardCatalog.value = await getCardListApi()
  }
  catch {
    cardCatalog.value = []
  }
}

watch(
  () => authStore.isLogin,
  (loggedIn) => {
    if (loggedIn)
      void loadCards()
  },
  { immediate: true },
)
</script>

<template>
  <BasicPage
    :title="t('bentoLayout.pageTitle')"
    :description="t('bentoLayout.pageDescription')"
  >
    <div class="bento-layout-page flex min-h-0 min-w-0 w-full flex-1 flex-col">
      <BentoLayout
        v-model="layout"
        page-id="mc-bento-default"
        :editable="true"
        :cols="12"
        :row-height="100"
        :gap="16"
        :auto-load="true"
        :card-catalog="cardCatalog"
      />
    </div>
  </BasicPage>
</template>
