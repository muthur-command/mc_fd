import type { Ref } from 'vue'

import { onMounted, onUnmounted, ref, watch } from 'vue'

import type { LandingLocale, ThemePreference } from '@/constants'

import {
  detectThemePreference,
  HTML_LANG,

  LOCALE_STORAGE_KEY,
  resolveColorTheme,
  THEME_STORAGE_KEY,

} from '@/constants'
import { i18n } from '@/i18n'

export function useThemePreference() {
  const themePref = ref<ThemePreference>(detectThemePreference())
  const themeMenuOpen = ref(false)

  function applyResolvedTheme() {
    document.documentElement.setAttribute('data-theme', resolveColorTheme(themePref.value))
  }

  function setThemePref(pref: ThemePreference) {
    themePref.value = pref
    try {
      localStorage.setItem(THEME_STORAGE_KEY, pref)
    }
    catch {}
    applyResolvedTheme()
    themeMenuOpen.value = false
  }

  function themeLabel(pref: ThemePreference) {
    const key = pref === 'light' ? 'themeLight' : pref === 'dark' ? 'themeDark' : 'themeSystem'
    return i18n.global.t(key)
  }

  onMounted(() => {
    applyResolvedTheme()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (themePref.value === 'system')
        applyResolvedTheme()
    }
    mq.addEventListener('change', onChange)
    onUnmounted(() => mq.removeEventListener('change', onChange))
  })

  return { themePref, themeMenuOpen, setThemePref, themeLabel }
}

export function useLocalePreference(themeMenuOpen: Ref<boolean>) {
  const { locale, t } = i18n.global
  const langMenuOpen = ref(false)

  function applyDocumentLocale(code: LandingLocale) {
    document.documentElement.lang = HTML_LANG[code]
    document.title = t('docTitle')
  }

  function setLocale(code: LandingLocale) {
    locale.value = code
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, code)
    }
    catch {}
    applyDocumentLocale(code)
    langMenuOpen.value = false
  }

  onMounted(() => {
    applyDocumentLocale(locale.value as LandingLocale)
  })

  watch(locale, (code) => {
    applyDocumentLocale(code as LandingLocale)
  })

  function toggleLangMenu() {
    themeMenuOpen.value = false
    langMenuOpen.value = !langMenuOpen.value
  }

  function closeLangMenu() {
    langMenuOpen.value = false
  }

  return { locale, langMenuOpen, setLocale, toggleLangMenu, closeLangMenu }
}

export function useOutsideClick(closeMenus: () => void, ignoreRef?: Ref<HTMLElement | null>) {
  function onDocumentClick(event: MouseEvent) {
    const target = event.target as Node
    if (ignoreRef?.value?.contains(target))
      return
    closeMenus()
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape')
      closeMenus()
  }

  onMounted(() => {
    document.addEventListener('click', onDocumentClick)
    document.addEventListener('keydown', onKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('click', onDocumentClick)
    document.removeEventListener('keydown', onKeydown)
  })
}
