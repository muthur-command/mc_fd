<script setup lang="ts">
import { useCookies } from '@vueuse/integrations/useCookies'
import { storeToRefs } from 'pinia'

import AppSidebar from '@/components/app-sidebar/index.vue'
import ApplyUserPreferences from '@/components/apply-user-preferences.vue'
import CommandMenuPanel from '@/components/command-menu-panel/index.vue'
import HeaderNotifications from '@/components/header-notifications/index.vue'
import LanguageChange from '@/components/language-change.vue'
import ToggleTheme from '@/components/toggle-theme.vue'
import { SIDEBAR_COOKIE_NAME } from '@/components/ui/sidebar/utils'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const defaultOpen = useCookies([SIDEBAR_COOKIE_NAME])
const themeStore = useThemeStore()
const { contentLayout } = storeToRefs(themeStore)

const authStore = useAuthStore()
const { isLogin, userInfo, userPreferences } = storeToRefs(authStore)

onMounted(async () => {
  if (!unref(isLogin))
    return
  // 已有缓存则跳过，避免每次 layout 挂载都重复请求（布局在路由切换时会重新挂载）
  const promises: Promise<unknown>[] = []
  if (!unref(userInfo))
    promises.push(authStore.fetchUserInfo())
  if (!unref(userPreferences))
    promises.push(authStore.fetchPreferences())
  await Promise.all(promises)
})
</script>

<template>
  <UiSidebarProvider
    :default-open="defaultOpen.get(SIDEBAR_COOKIE_NAME)"
    class="group/layout"
    :data-theme-content-layout="contentLayout"
    :style="{
      '--header-height': '3.5rem',
    }"
  >
    <ApplyUserPreferences />
    <AppSidebar />
    <UiSidebarInset class="min-h-0 w-full max-w-full peer-data-[state=collapsed]:w-[calc(100%-var(--sidebar-width-icon)-1rem)] peer-data-[state=expanded]:w-[calc(100%-var(--sidebar-width))]">
      <header
        class="bg-background/40 sticky top-0 z-50 flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b backdrop-blur-md transition-[width,height] ease-linear md:rounded-tl-xl md:rounded-tr-xl"
      >
        <div class="flex w-full items-center gap-1 px-4 lg:gap-2">
          <UiSidebarTrigger class="-ml-1" />
          <UiSeparator orientation="vertical" class="mx-2 h-4" />
          <CommandMenuPanel />
          <div class="ml-auto flex items-center gap-2">
            <HeaderNotifications />
            <LanguageChange />
            <ToggleTheme />
          </div>
        </div>
      </header>
      <div class="flex min-h-0 flex-1 flex-col">
        <div
          :class="cn(
            'bg-theme-blocks-dots flex min-h-0 min-w-0 flex-1 flex-col grow p-4',
            contentLayout === 'centered' ? 'container mx-auto xl:max-w-7xl' : '',
          )"
        >
          <div class="flex min-h-0 min-w-0 flex-1 flex-col">
            <router-view />
          </div>
        </div>
      </div>
    </UiSidebarInset>
  </UiSidebarProvider>
</template>
