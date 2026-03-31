<script setup lang="ts">
import Loading from '@/components/loading.vue'
import { Toaster } from '@/components/ui/sonner'
import { useSystemTheme } from '@/composables/use-system-theme'
import { applyUserPreferences } from '@/composables/use-user-preferences'
import { DEFAULT_USER_PREFERENCE } from '@/services/api/core/user.api'
import { useAuthStore } from '@/stores/auth'

useSystemTheme()

// 登录页等使用 layout: false，不会挂载 ApplyUserPreferences，故在根组件未登录时应用默认偏好（语言等）。
// 不传 theme，保持用户当前的 light/dark（含退出登录后进入登录页时）。
const authStore = useAuthStore()
onMounted(() => {
  if (!authStore.isLogin) {
    setTimeout(() => {
      if (!authStore.isLogin) {
        const { theme: _t, ...rest } = DEFAULT_USER_PREFERENCE
        applyUserPreferences({ ...rest } as typeof DEFAULT_USER_PREFERENCE)
      }
    }, 0)
  }
})
</script>

<template>
  <Toaster />

  <Suspense>
    <router-view v-slot="{ Component, route }">
      <component :is="Component" :key="route?.fullPath ?? route?.path" />
    </router-view>

    <template #fallback>
      <Loading />
    </template>
  </Suspense>
</template>
