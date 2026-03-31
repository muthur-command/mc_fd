import { defineStore } from 'pinia'

import type { ChartPreset, ContentLayout, Radius, Scale, Theme, ThemeFont } from '@/constants/themes'

function migrateRadius(val: unknown): Radius {
  if (typeof val === 'string' && ['none', 'sm', 'md', 'lg', 'xl'].includes(val))
    return val as Radius
  if (typeof val === 'number') {
    if (val <= 0)
      return 'none'
    if (val <= 0.3)
      return 'sm'
    if (val <= 0.5)
      return 'md'
    if (val <= 0.75)
      return 'lg'
    return 'xl'
  }
  return 'md'
}

export interface ShadowConfig {
  color: string
  opacity: number
  blur: number
  spread: number
  offsetX: number
  offsetY: number
}

export interface HslConfig {
  hueShift: number
  saturationScale: number
  lightnessScale: number
}

export interface CustomColorsConfig {
  primary?: string
  background?: string
  foreground?: string
}

const defaultShadow: ShadowConfig = {
  color: 'oklch(0 0 0)',
  opacity: 0.1,
  blur: 3,
  spread: 0,
  offsetX: 0,
  offsetY: 1,
}

const defaultHsl: HslConfig = {
  hueShift: 0,
  saturationScale: 1,
  lightnessScale: 1,
}

export const useThemeStore = defineStore('system-config', () => {
  const radius = ref<Radius>('md')
  function setRadius(newRadius: Radius) {
    radius.value = newRadius
  }

  const radiusRem = ref<number | null>(null)
  function setRadiusRem(v: number | null) {
    radiusRem.value = v
  }

  const letterSpacing = ref<number>(0)
  function setLetterSpacing(v: number) {
    letterSpacing.value = v
  }

  const spacingRem = ref<number>(0.25)
  function setSpacingRem(v: number) {
    spacingRem.value = v
  }

  const shadow = ref<ShadowConfig>({ ...defaultShadow })
  function setShadow(s: Partial<ShadowConfig>) {
    shadow.value = { ...shadow.value, ...s }
  }

  const hsl = ref<HslConfig>({ ...defaultHsl })
  function setHsl(h: Partial<HslConfig>) {
    hsl.value = { ...hsl.value, ...h }
  }

  const customColors = ref<CustomColorsConfig>({})
  function setCustomColors(c: CustomColorsConfig) {
    customColors.value = { ...c }
  }

  const theme = ref<Theme>('default')
  function setTheme(newTheme: Theme) {
    theme.value = newTheme
  }

  const scale = ref<Scale>('none')
  function setScale(newScale: Scale) {
    scale.value = newScale
  }

  const contentLayout = ref<ContentLayout>('centered')
  function setContentLayout(newContentLayout: ContentLayout) {
    contentLayout.value = newContentLayout
  }

  const font = ref<ThemeFont>('default')
  function setFont(newFont: ThemeFont) {
    font.value = newFont
  }

  const chartPreset = ref<ChartPreset>('default')
  function setChartPreset(newPreset: ChartPreset) {
    chartPreset.value = newPreset
  }

  return {
    radius,
    setRadius,
    radiusRem,
    setRadiusRem,
    letterSpacing,
    setLetterSpacing,
    spacingRem,
    setSpacingRem,
    shadow,
    setShadow,
    hsl,
    setHsl,
    customColors,
    setCustomColors,
    theme,
    setTheme,
    scale,
    setScale,
    contentLayout,
    setContentLayout,
    font,
    setFont,
    chartPreset,
    setChartPreset,
  }
}, {
  persist: {
    // @ts-expect-error afterRestore exists in pinia-plugin-persistedstate at runtime
    afterRestore(ctx: { store: { $state: { radius?: unknown, theme?: unknown } } }) {
      if (ctx.store.$state.radius != null && typeof ctx.store.$state.radius !== 'string')
        (ctx.store.$state as { radius: Radius }).radius = migrateRadius(ctx.store.$state.radius)
      // 旧版持久化中的配色预设已移除，一律回到 default
      if ((ctx.store.$state as { theme?: Theme }).theme !== 'default')
        (ctx.store.$state as { theme: Theme }).theme = 'default'
    },
  },
})
