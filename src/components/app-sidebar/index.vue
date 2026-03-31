<script lang="ts" setup>
import { storeToRefs } from 'pinia'

import { useSidebar } from '@/composables/use-sidebar'
import { useAuthStore } from '@/stores/auth'

import type { User } from './types'

import { sidebarData } from './data/sidebar-data'
import NavFooter from './nav-footer.vue'
import NavTeam from './nav-team.vue'
import TeamSwitcher from './team-switcher.vue'

const { navData } = useSidebar()
const { userInfo } = storeToRefs(useAuthStore())

/** 当前登录用户信息，用于侧栏底部展示；根据登录状态动态展示 */
const sidebarUser = computed<User>(() => {
  const info = userInfo.value
  if (!info) {
    return {
      name: '未登录',
      email: '—',
      avatar: '',
    }
  }
  return {
    name: info.nickname || info.username || '用户',
    email: info.email || info.phone || info.username || '—',
    avatar: info.avatar ?? '',
  }
})
</script>

<template>
  <UiSidebar collapsible="icon" variant="inset" class="z-50">
    <UiSidebarHeader>
      <TeamSwitcher :teams="sidebarData.teams" />
    </UiSidebarHeader>

    <UiSidebarContent>
      <UiScrollArea class="h-full">
        <NavTeam :nav-main="navData" />
      </UiScrollArea>
    </UiSidebarContent>

    <UiSidebarFooter>
      <UiCard class="flex flex-col gap-4 overflow-hidden rounded-xl border py-4 group-data-[collapsible=icon]:hidden">
        <UiCardHeader class="px-3">
          <UiCardTitle>Download</UiCardTitle>
          <UiCardDescription>
            Unlock lifetime access to all dashboards, templates and components.
          </UiCardDescription>
        </UiCardHeader>
        <UiCardContent class="px-3">
          <UiButton as-child class="w-full">
            <a href="https://shadcnuikit.com/pricing" target="_blank" rel="noopener noreferrer">
              Get Shadcn UI Kit
            </a>
          </UiButton>
        </UiCardContent>
      </UiCard>
      <NavFooter :key="userInfo?.id ?? 'guest'" :user="sidebarUser" />
    </UiSidebarFooter>
  </UiSidebar>
</template>
