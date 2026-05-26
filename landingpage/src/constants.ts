export type LandingLocale = 'zh' | 'en' | 'it' | 'ru'

export const LOCALE_ORDER: LandingLocale[] = ['zh', 'en', 'it', 'ru']

export const LOCALE_LABELS: Record<LandingLocale, string> = {
  zh: '简体中文',
  en: 'English',
  it: 'Italiano',
  ru: 'Русский',
}

export const HTML_LANG: Record<LandingLocale, string> = {
  zh: 'zh-CN',
  en: 'en',
  it: 'it',
  ru: 'ru',
}

export type ThemePreference = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'muthur-landing-color-theme'
export const LOCALE_STORAGE_KEY = 'muthur-landing-locale'

export function detectLocale(): LandingLocale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored && LOCALE_ORDER.includes(stored as LandingLocale))
      return stored as LandingLocale
  }
  catch {}

  const nav = (navigator.language || '').toLowerCase()
  if (nav.startsWith('zh'))
    return 'zh'
  if (nav.startsWith('it'))
    return 'it'
  if (nav.startsWith('ru'))
    return 'ru'
  return 'en'
}

export function detectThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system')
      return stored
  }
  catch {}
  return 'system'
}

export function resolveColorTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'light')
    return 'light'
  if (pref === 'dark')
    return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
