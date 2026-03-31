<script lang="ts" setup>
import { ChevronRight } from 'lucide-vue-next'

import { useSidebar } from '@/components/ui/sidebar'

import type { NavGroup, NavItem } from './types'

const { navMain } = defineProps<{
  navMain: NavGroup[]
}>()

const route = useRoute()

const { state, isMobile } = useSidebar()

function isExternalUrl(url: string | undefined): boolean {
  return !!url && (url.startsWith('http://') || url.startsWith('https://'))
}

function isCollapsed(menu: NavItem): boolean {
  return !!menu.items?.some(item => item.url === route.path)
}

function isActive(menu: NavItem): boolean {
  const pathname = route.path
  if (menu.url && !isExternalUrl(menu.url)) {
    return pathname === menu.url
  }
  return !!menu.items?.some(item => item.url === pathname)
}

function getLink(menu: { url?: string, newTab?: boolean }) {
  const url = menu.url || '/'
  const external = isExternalUrl(url) || !!menu.newTab
  return { url, external }
}
</script>

<template>
  <UiSidebarGroup v-for="group in navMain" :key="group.title">
    <UiSidebarGroupLabel>{{ $t(group.title) }}</UiSidebarGroupLabel>
    <UiSidebarMenu>
      <template v-for="menu in group.items" :key="menu.title">
        <UiSidebarMenuItem v-if="!menu.items">
          <UiSidebarMenuButton as-child :is-active="isActive(menu)" :tooltip="$t(menu.title)">
            <component
              :is="getLink(menu).external ? 'a' : 'router-link'"
              :href="getLink(menu).external ? getLink(menu).url : undefined"
              :to="getLink(menu).external ? undefined : getLink(menu).url"
              :target="getLink(menu).external ? '_blank' : undefined"
              :rel="getLink(menu).external ? 'noopener noreferrer' : undefined"
            >
              <component :is="menu.icon" v-if="menu.icon" />
              <span>{{ $t(menu.title) }}</span>
            </component>
          </UiSidebarMenuButton>
          <UiSidebarMenuBadge v-if="menu.isComing" class="opacity-50">
            Coming
          </UiSidebarMenuBadge>
          <UiSidebarMenuBadge v-else-if="menu.isNew" class="border border-green-400 text-green-600">
            New
          </UiSidebarMenuBadge>
          <UiSidebarMenuBadge v-else-if="menu.isDataBadge">
            {{ menu.isDataBadge }}
          </UiSidebarMenuBadge>
        </UiSidebarMenuItem>

        <UiSidebarMenuItem v-else>
          <!-- sidebar expanded -->
          <UiCollapsible
            v-if="state !== 'collapsed' || isMobile"
            as-child
            :default-open="isCollapsed(menu)"
            class="group/collapsible"
          >
            <UiSidebarMenuItem>
              <UiCollapsibleTrigger as-child>
                <UiSidebarMenuButton :tooltip="$t(menu.title)">
                  <component :is="menu.icon" v-if="menu.icon" />
                  <span>{{ $t(menu.title) }}</span>
                  <ChevronRight
                    class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                  />
                </UiSidebarMenuButton>
              </UiCollapsibleTrigger>
            </UiSidebarMenuItem>
            <UiCollapsibleContent>
              <UiSidebarMenuSub>
                <UiSidebarMenuSubItem v-for="subItem in menu.items" :key="subItem.title">
                  <UiSidebarMenuSubButton as-child :is-active="isActive(subItem as NavItem)">
                    <a
                      v-if="(subItem as { newTab?: boolean }).newTab || isExternalUrl(subItem?.url)"
                      :href="subItem?.url || '#'"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="flex w-full items-center justify-between gap-2"
                    >
                      <span>{{ $t(subItem.title) }}</span>
                      <span v-if="(subItem as { isComing?: boolean }).isComing" class="shrink-0 text-xs opacity-50">Coming</span>
                    </a>
                    <router-link v-else :to="subItem?.url || '/'" class="flex w-full items-center justify-between gap-2">
                      <span>{{ $t(subItem.title) }}</span>
                      <span v-if="(subItem as { isComing?: boolean }).isComing" class="shrink-0 text-xs opacity-50">Coming</span>
                    </router-link>
                  </UiSidebarMenuSubButton>
                </UiSidebarMenuSubItem>
              </UiSidebarMenuSub>
            </UiCollapsibleContent>
          </UiCollapsible>

          <!-- sidebar collapsed -->
          <UiDropdownMenu v-else>
            <UiDropdownMenuTrigger as-child>
              <UiSidebarMenuButton :tooltip="$t(menu.title)">
                <component :is="menu.icon" v-if="menu.icon" />
                <span>{{ $t(menu.title) }}</span>
              </UiSidebarMenuButton>
            </UiDropdownMenuTrigger>
            <UiDropdownMenuContent align="start" side="right">
              <UiDropdownMenuLabel>{{ $t(menu.title) }}</UiDropdownMenuLabel>
              <UiDropdownMenuSeparator />
              <UiDropdownMenuItem v-for="subItem in menu.items" :key="subItem.title" as-child>
                <a
                  v-if="(subItem as { newTab?: boolean }).newTab || isExternalUrl(subItem?.url)"
                  :href="subItem?.url || '#'"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex w-full items-center justify-between gap-2"
                >
                  <span>{{ $t(subItem.title) }}</span>
                  <span v-if="(subItem as { isComing?: boolean }).isComing" class="shrink-0 text-xs opacity-50">Coming</span>
                </a>
                <router-link v-else :to="subItem?.url || '/'" class="flex w-full items-center justify-between gap-2">
                  <span>{{ $t(subItem.title) }}</span>
                  <span v-if="(subItem as { isComing?: boolean }).isComing" class="shrink-0 text-xs opacity-50">Coming</span>
                </router-link>
              </UiDropdownMenuItem>
            </UiDropdownMenuContent>
          </UiDropdownMenu>
          <UiSidebarMenuBadge v-if="menu.isComing" class="opacity-50">
            Coming
          </UiSidebarMenuBadge>
          <UiSidebarMenuBadge v-else-if="menu.isNew" class="border border-green-400 text-green-600">
            New
          </UiSidebarMenuBadge>
          <UiSidebarMenuBadge v-else-if="menu.isDataBadge">
            {{ menu.isDataBadge }}
          </UiSidebarMenuBadge>
        </UiSidebarMenuItem>
      </template>
    </UiSidebarMenu>
  </UiSidebarGroup>
</template>
