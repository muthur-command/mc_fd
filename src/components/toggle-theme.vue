<script setup lang="ts">
import { useColorMode } from '@vueuse/core'
import { Moon, Sun, SunMoon } from 'lucide-vue-next'

import { saveUserPreferencesApi } from '@/services/api/core/user.api'
import { useAuthStore } from '@/stores/auth'

const mode = useColorMode()
const authStore = useAuthStore()

async function setTheme(value: 'light' | 'dark' | 'auto') {
  mode.value = value
  if (authStore.isLogin) {
    try {
      await saveUserPreferencesApi({ theme: value })
      if (authStore.userPreferences)
        authStore.userPreferences = { ...authStore.userPreferences, theme: value }
    }
    catch {
      // 静默失败，本地已切换
    }
  }
}
</script>

<template>
  <UiDropdownMenu>
    <UiDropdownMenuTrigger as-child>
      <UiButton variant="outline" size="icon">
        <Moon class=" rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Sun class="absolute  rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span class="sr-only">Toggle theme</span>
      </UiButton>
    </UiDropdownMenuTrigger>
    <UiDropdownMenuContent align="end">
      <UiDropdownMenuItem @click="setTheme('light')">
        <Sun />
        Light
      </UiDropdownMenuItem>
      <UiDropdownMenuItem @click="setTheme('dark')">
        <Moon />
        Dark
      </UiDropdownMenuItem>
      <UiDropdownMenuItem @click="setTheme('auto')">
        <SunMoon />
        System
      </UiDropdownMenuItem>
    </UiDropdownMenuContent>
  </UiDropdownMenu>
</template>
