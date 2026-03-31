<script lang="ts" setup>
import { Icon } from '@iconify/vue'

const links = [
  {
    name: 'bluesky',
    icon: 'simple-icons:bluesky',
    url: 'https://bsky.app/profile/bitmc.bsky.social',
  },
  {
    name: 'github',
    icon: 'simple-icons:github',
    url: 'https://www.github.com/whbbit1999/shadcn-vue-admin',
  },
  {
    name: 'bilibili',
    icon: 'simple-icons:bilibili',
    url: 'https://space.bilibili.com/104376935',
  },
]
</script>

<template>
  <footer class="min-h-18 flex items-center justify-between">
    <span class="text-2xl" aria-hidden="true">🐣</span>

    <div>© 2025 Whbbit1999</div>

    <div class="flex items-center gap-2">
      <UiButton
        v-for="link in links"
        :key="link.name"
        variant="outline"
        size="icon"
        as="a"
        :href="link.url"
        target="_blank"
      >
        <Icon :icon="link.icon" />
      </UiButton>
    </div>
  </footer>
</template>
