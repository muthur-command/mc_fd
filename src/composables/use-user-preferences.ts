import { useColorMode } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

import type { ChartPreset, Radius, Scale, ThemeFont } from '@/constants/themes'
import type { UserPreference } from '@/services/api/core/user.api'

import { SIDEBAR_COOKIE_MAX_AGE, SIDEBAR_COOKIE_NAME } from '@/components/ui/sidebar/utils'
import { useThemeStore } from '@/stores/theme'

/**
 * 将后端返回的偏好应用到当前界面（语言、主题、侧边栏、颜色/圆角/缩放/内容布局）。
 * 需在组件内调用，以便 useI18n 可用；侧边栏需在 UiSidebarProvider 内传入 setOpen 才能立即生效。
 */
export function applyUserPreferences(
  prefs: UserPreference,
  setSidebarOpen?: (open: boolean) => void,
) {
  const { locale, theme, theme_color, radius, scale, content_layout, sidebar_collapsed } = prefs
  try {
    const { locale: localeRef } = useI18n()
    if (locale && localeRef)
      localeRef.value = locale
  }
  catch {
    // 非组件上下文忽略
  }
  const mode = useColorMode({ attribute: 'class' })
  // 仅当明确传入 theme 时才覆盖，避免登出后应用默认偏好时把当前 light/dark 冲掉
  if (theme === 'light' || theme === 'dark' || theme === 'auto')
    mode.value = theme
  const themeStore = useThemeStore()
  if (theme_color != null && theme_color !== '')
    themeStore.setTheme('default')
  if (radius && ['none', 'sm', 'md', 'lg', 'xl'].includes(radius))
    themeStore.setRadius(radius as Radius)
  if (scale && ['none', 'sm', 'lg'].includes(scale))
    themeStore.setScale(scale as Scale)
  if (content_layout && (content_layout === 'full' || content_layout === 'centered'))
    themeStore.setContentLayout(content_layout)
  const fontOptions = ['default', 'inter', 'roboto', 'poppins', 'montserrat', 'pt-sans', 'overpass-mono'] as const
  if (prefs.font !== undefined && fontOptions.includes(prefs.font as ThemeFont))
    themeStore.setFont(prefs.font as ThemeFont)
  const chartPresetOptions = ['default', 'cyan', 'amber', 'green', 'indigo', 'fuchsia'] as const
  if (prefs.chart_preset !== undefined && chartPresetOptions.includes(prefs.chart_preset as ChartPreset))
    themeStore.setChartPreset(prefs.chart_preset as ChartPreset)
  const open = !sidebar_collapsed
  if (typeof document !== 'undefined') {
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${open}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
  }
  if (setSidebarOpen)
    setSidebarOpen(open)
}
