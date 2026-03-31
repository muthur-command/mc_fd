<script lang="ts" setup>
import type { LayoutHeaderProps } from './types'

import BasicHeader from './basic-header.vue'

defineProps<LayoutHeaderProps>()
</script>

<template>
  <main class="flex min-h-0 min-w-0 flex-1 flex-col">
    <BasicHeader
      :title="title"
      :description="description"
      :sticky="sticky"
    >
      <template #actions>
        <slot name="actions" />
      </template>
    </BasicHeader>

    <main class="flex min-h-0 min-w-0 flex-1 flex-col py-4">
      <slot />
    </main>
  </main>
</template>
