<script setup lang="ts">
import { useSidebar } from '@/composables/use-sidebar'

import type { NavGroup, NavItem } from '../app-sidebar/types'

import CommandItemHasIcon from './command-item-has-icon.vue'

const emit = defineEmits<{
  (e: 'click'): void
}>()

const { navData } = useSidebar()

function getFlatNavItems(navData: NavGroup[]): NavItem[] {
  const flatItems: NavItem[] = []
  navData.forEach((group) => {
    group.items.forEach((item) => {
      if (item.items) {
        flatItems.push(...getFlatNavItems([item as unknown as NavGroup]))
      }
      else if (item.url && item.url !== '#') {
        flatItems.push(item)
      }
    })
  })
  return flatItems
}

const commands = computed(() => getFlatNavItems(navData.value ?? []))

const router = useRouter()
const route = useRoute()
function commandItemClick(item: NavItem & { url: string }) {
  emit('click')
  const url = item.url
  if (url.startsWith('http://') || url.startsWith('https://')) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  if (route.fullPath !== url) {
    router.push(url)
  }
}
</script>

<template>
  <UiCommandGroup heading="Pages">
    <UiCommandItem
      v-for="command in commands"
      :key="command.title"
      :value="command.title"
      @click="commandItemClick(command as NavItem & { url: string })"
    >
      <CommandItemHasIcon :name="command.title" :icon="command.icon" />
    </UiCommandItem>
  </UiCommandGroup>
</template>
