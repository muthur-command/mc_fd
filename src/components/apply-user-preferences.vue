<script setup lang="ts">
import { storeToRefs } from 'pinia'

import type { UserPreference } from '@/services/api/core/user.api'

import { useSidebar } from '@/components/ui/sidebar'
import { applyUserPreferences } from '@/composables/use-user-preferences'
import { DEFAULT_USER_PREFERENCE } from '@/services/api/core/user.api'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const { userPreferences, preferencesApplied } = storeToRefs(authStore)
const { setOpen } = useSidebar()

function apply(prefs: UserPreference) {
  applyUserPreferences(prefs, setOpen)
  preferencesApplied.value = true
}

watch(
  userPreferences,
  (newVal, oldVal) => {
    // 偏好变化（含登录后从 null 变为后端数据）时需重新应用
    if (newVal !== oldVal)
      preferencesApplied.value = false
    if (!preferencesApplied.value) {
      // 推迟到下一事件循环应用，确保在 theme store 的 persist 恢复之后再覆盖；未登录时用默认偏好（不传 theme，保持当前 light/dark）
      setTimeout(() => {
        if (!preferencesApplied.value) {
          const prefs = userPreferences.value
            ?? (() => {
              const { theme: _t, ...rest } = DEFAULT_USER_PREFERENCE
              return rest as UserPreference
            })()
          apply(prefs)
        }
      }, 0)
    }
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="false" />
</template>
