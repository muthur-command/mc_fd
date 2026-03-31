<script lang="ts" setup>
import type { LayoutHeaderProps } from './types'

import BasicHeader from './basic-header.vue'

defineProps<LayoutHeaderProps>()
</script>

<template>
  <main>
    <BasicHeader :title="title" :description="description" :sticky="sticky">
      <template #actions>
        <slot name="actions" />
      </template>
    </BasicHeader>
    <main class="py-4">
      <p class="text-muted-foreground">
        {{ description ?? '页面内容已从 shadcnuikit-AdminDashboard 移植占位，后续可替换为完整实现。' }}
      </p>
      <slot />
    </main>
  </main>
</template>
