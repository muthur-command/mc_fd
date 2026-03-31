<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { Command as CommandIcon, SearchIcon } from 'lucide-vue-next'

import CommandChangeTheme from './command-change-theme.vue'
import CommandToPage from './command-to-page.vue'

const open = ref(false)

useEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    handleOpenChange()
  }
})

function handleOpenChange() {
  open.value = !open.value
}

const firstKey = computed(() => navigator?.userAgent?.includes('Mac OS') ? '⌘' : 'Ctrl')
</script>

<template>
  <div class="lg:flex-1">
    <div class="relative hidden max-w-sm flex-1 lg:block">
      <SearchIcon class="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
      <input
        readonly
        type="search"
        placeholder="Search..."
        class="h-9 w-full cursor-pointer rounded-md border border-border bg-background pr-4 pl-10 text-sm text-foreground shadow-xs placeholder:text-muted-foreground"
        @click="open = true"
      >
      <div class="absolute top-1/2 right-2 hidden -translate-y-1/2 items-center gap-0.5 rounded-sm bg-zinc-200 p-1 font-mono text-xs font-medium sm:flex dark:bg-neutral-700">
        <CommandIcon class="size-3" />
        <span>{{ firstKey }}</span>
        <span>k</span>
      </div>
    </div>
    <div class="block lg:hidden">
      <UiButton size="icon" variant="ghost" @click="handleOpenChange">
        <SearchIcon />
      </UiButton>
    </div>
    <UiCommandDialog v-model:open="open">
      <UiCommandInput placeholder="Type a command or search..." />
      <UiCommandList>
        <UiCommandEmpty>No results found.</UiCommandEmpty>
        <CommandToPage @click="handleOpenChange" />
        <UiCommandSeparator />
        <CommandChangeTheme @click="handleOpenChange" />
      </UiCommandList>
    </UiCommandDialog>
  </div>
</template>
