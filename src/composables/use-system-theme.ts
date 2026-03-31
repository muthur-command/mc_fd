import { storeToRefs } from 'pinia'
import { watch } from 'vue'

import { THEMES } from '@/constants/themes'
import { useThemeStore } from '@/stores/theme'

/** 外观令牌固定为 Claude-MC.css；不再向 document 写入 data-theme-* 或覆盖 CSS 变量。 */
export function useSystemTheme() {
  const themeStore = useThemeStore()
  const { setTheme, setRadius, setScale, setFont, setChartPreset } = themeStore
  const { theme, radius, scale, font, chartPreset } = storeToRefs(themeStore)

  if (typeof document !== 'undefined') {
    watch(theme, (themeValue) => {
      document.documentElement.classList.remove(...THEMES.map(t => `theme-${t}`))
      if (themeValue !== 'default')
        document.documentElement.classList.add(`theme-${themeValue}`)
    }, { immediate: true })
  }

  return {
    theme,
    radius,
    scale,
    font,
    chartPreset,
    setTheme,
    setRadius,
    setScale,
    setFont,
    setChartPreset,
  }
}
