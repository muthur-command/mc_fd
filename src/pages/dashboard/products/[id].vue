<script lang="ts" setup>
import { useRoute } from 'vue-router'

import { PlaceholderPage } from '@/components/global-layout'

const route = useRoute()
const id = computed(() => (route.params as { id?: string }).id ?? '')
</script>

<template>
  <PlaceholderPage :title="`Product #${id}`" description="产品详情" />
</template>
