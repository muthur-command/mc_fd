<script setup lang="ts">
import {
  ChevronsUpDown,
  LogOut,
  Sparkles,
  UserRoundCog,
} from 'lucide-vue-next'

import AvatarGenerated from '@/components/avatar-generated.vue'
import { getAvatarSeed, getAvatarUrl, isAvatarSeed } from '@/utils/avatar'

import type { User } from './types'

const { user } = defineProps<
  { user: User }
>()

const avatarSrc = computed(() => getAvatarUrl(user.avatar))
const avatarSeed = computed(() =>
  isAvatarSeed(user.avatar)
    ? (getAvatarSeed(user.avatar) ?? (user.name || 'user'))
    : (user.name || user.email || 'user'),
)

const { logout } = useAuth()
</script>

<template>
  <UiSidebarMenu>
    <UiSidebarMenuItem>
      <UiDropdownMenu>
        <UiDropdownMenuTrigger as-child>
          <UiSidebarMenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div class="relative shrink-0">
              <UiAvatar class="size-8 rounded-lg">
                <UiAvatarImage v-if="avatarSrc" :src="avatarSrc" :alt="user.name" />
                <UiAvatarFallback v-else class="rounded-lg flex items-center justify-center p-0">
                  <AvatarGenerated :name="avatarSeed" :size="32" />
                </UiAvatarFallback>
              </UiAvatar>
            </div>
            <div class="grid flex-1 text-sm leading-tight text-left">
              <span class="font-semibold truncate">{{ user.name }}</span>
              <span class="text-xs truncate">{{ user.email }}</span>
            </div>
            <ChevronsUpDown class="ml-auto size-4" />
          </UiSidebarMenuButton>
        </UiDropdownMenuTrigger>
        <UiDropdownMenuContent
          class="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          side="right"
          align="end"
          :side-offset="4"
        >
          <UiDropdownMenuLabel class="p-0 font-normal">
            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <UiAvatar class="size-8 rounded-lg">
                <UiAvatarImage v-if="avatarSrc" :src="avatarSrc" :alt="user.name" />
                <UiAvatarFallback v-else class="rounded-lg flex items-center justify-center p-0">
                  <AvatarGenerated :name="avatarSeed" :size="32" />
                </UiAvatarFallback>
              </UiAvatar>
              <div class="grid flex-1 text-sm leading-tight text-left">
                <span class="font-semibold truncate">{{ user.name }}</span>
                <span class="text-xs truncate">{{ user.email }}</span>
              </div>
            </div>
          </UiDropdownMenuLabel>

          <UiDropdownMenuSeparator />
          <UiDropdownMenuGroup>
            <UiDropdownMenuItem @click="$router.push('/profile')">
              <UserRoundCog />
              Profile
            </UiDropdownMenuItem>
          </UiDropdownMenuGroup>
          <UiDropdownMenuSeparator />
          <UiDropdownMenuGroup>
            <UiDropdownMenuItem @click="$router.push('/dashboard/empty-states/coming-soon')">
              <Sparkles />
              Help
            </UiDropdownMenuItem>
          </UiDropdownMenuGroup>
          <UiDropdownMenuSeparator />
          <UiDropdownMenuItem @click="logout">
            <LogOut />
            Log out
          </UiDropdownMenuItem>
        </UiDropdownMenuContent>
      </UiDropdownMenu>
    </UiSidebarMenuItem>
  </UiSidebarMenu>
</template>
