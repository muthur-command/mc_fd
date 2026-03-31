<script setup lang="ts">
import { useColorMode } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

import type { UpdateUserPreferenceParams, UserPreference } from '@/services/api/core/user.api'

import { useSidebar } from '@/components/ui/sidebar'
import { getUserPreferencesApi, saveUserPreferencesApi } from '@/services/api/core/user.api'
import { useAuthStore } from '@/stores/auth'

const { t, locale } = useI18n()
const mode = useColorMode({ attribute: 'class' })
const { setOpen } = useSidebar()
const authStore = useAuthStore()

const loading = ref(false)
const saving = ref(false)

/** 表单类型：与 UserPreference 一致，可选项用空串表示未设置 */
interface PreferenceForm {
  locale: string
  theme: string
  sidebar_collapsed: boolean
  plugin_system_show_remote: boolean
  theme_color: string
  radius: string
  scale: string
  content_layout: string
  font: string
  chart_preset: string
  profile_cover: string
}

const form = reactive<PreferenceForm>({
  locale: 'en',
  theme: 'auto',
  sidebar_collapsed: false,
  plugin_system_show_remote: false,
  theme_color: 'default',
  radius: 'xl',
  scale: 'sm',
  content_layout: 'full',
  font: '',
  chart_preset: '',
  profile_cover: '',
})

const localeOptions = computed(() => [
  { value: 'zh', label: t('profileSettings.localeZh') },
  { value: 'en', label: t('profileSettings.localeEn') },
])

const themeOptions = computed(() => [
  { value: 'light', label: t('profileSettings.themeLight') },
  { value: 'dark', label: t('profileSettings.themeDark') },
  { value: 'auto', label: t('profileSettings.themeSystem') },
])

function assignPrefs(p: UserPreference) {
  form.locale = p.locale
  form.theme = p.theme
  form.sidebar_collapsed = p.sidebar_collapsed
  form.plugin_system_show_remote = p.plugin_system_show_remote ?? false
}

onMounted(async () => {
  loading.value = true
  try {
    const prefs = authStore.userPreferences ?? await getUserPreferencesApi()
    assignPrefs(prefs)
  }
  finally {
    loading.value = false
  }
})

async function savePreferences() {
  saving.value = true
  try {
    const payload: UpdateUserPreferenceParams = {
      locale: form.locale as string,
      theme: form.theme as string,
      sidebar_collapsed: form.sidebar_collapsed as boolean,
      plugin_system_show_remote: form.plugin_system_show_remote as boolean,
    }
    await saveUserPreferencesApi(payload)
    await authStore.fetchPreferences()
  }
  finally {
    saving.value = false
  }
}

watch(() => form.locale, (v) => {
  locale.value = v
})
watch(() => form.theme, (v) => {
  if (v === 'light' || v === 'dark' || v === 'auto')
    mode.value = v
})
watch(() => form.sidebar_collapsed, v => setOpen(!v))
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <UiCardTitle>{{ t('profileSettings.title') }}</UiCardTitle>
    </UiCardHeader>
    <div class="flex flex-col">
      <UiCardContent>
        <div class="grid gap-6 sm:grid-cols-[1fr_auto]">
          <!-- 语言 -->
          <div class="space-y-1">
            <label class="text-sm font-medium leading-none">{{ t('profileSettings.language') }}</label>
          </div>
          <div class="flex items-center">
            <UiSelect v-model="form.locale" :disabled="loading">
              <UiSelectTrigger class="w-full min-w-[200px] sm:w-[240px]">
                <UiSelectValue />
              </UiSelectTrigger>
              <UiSelectContent>
                <UiSelectItem v-for="opt in localeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </UiSelectItem>
              </UiSelectContent>
            </UiSelect>
          </div>

          <!-- 主题 -->
          <div class="space-y-1">
            <label class="text-sm font-medium leading-none">{{ t('profileSettings.theme') }}</label>
          </div>
          <div class="flex items-center">
            <UiSelect v-model="form.theme" :disabled="loading">
              <UiSelectTrigger class="w-full min-w-[200px] sm:w-[240px]">
                <UiSelectValue />
              </UiSelectTrigger>
              <UiSelectContent>
                <UiSelectItem v-for="opt in themeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </UiSelectItem>
              </UiSelectContent>
            </UiSelect>
          </div>

          <!-- 折叠侧边栏 -->
          <div class="space-y-1">
            <label class="text-sm font-medium leading-none">{{ t('profileSettings.sidebarCollapse') }}</label>
            <p class="text-xs text-muted-foreground">
              {{ t('profileSettings.sidebarCollapseDesc') }}
            </p>
          </div>
          <div class="flex items-center">
            <UiSwitch v-model="form.sidebar_collapsed" :disabled="loading" />
          </div>

          <!-- 是否显示远程插件列表 -->
          <div class="space-y-1">
            <label class="text-sm font-medium leading-none">{{ t('profileSettings.pluginSystemShowRemote') }}</label>
            <p class="text-xs text-muted-foreground">
              {{ t('profileSettings.pluginSystemShowRemoteDesc') }}
            </p>
          </div>
          <div class="flex items-center">
            <UiSwitch v-model="form.plugin_system_show_remote" :disabled="loading" />
          </div>
        </div>
      </UiCardContent>
      <UiCardFooter class="flex justify-end pt-4">
        <UiButton :disabled="loading || saving" @click="savePreferences">
          {{ saving ? t('user.modal.submitting') : t('user.modal.save') }}
        </UiButton>
      </UiCardFooter>
    </div>
  </UiCard>
</template>
