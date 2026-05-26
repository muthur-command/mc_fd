<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { LandingLocale, ThemePreference } from '@/constants'

import DropdownMenu from '@/components/DropdownMenu.vue'
import { useLocalePreference, useOutsideClick, useThemePreference } from '@/composables/usePreferences'
import { LOCALE_LABELS, LOCALE_ORDER } from '@/constants'

const { t } = useI18n()
const { themePref, themeMenuOpen, setThemePref, themeLabel } = useThemePreference()
const { locale, langMenuOpen, setLocale, toggleLangMenu, closeLangMenu } = useLocalePreference(themeMenuOpen)

const topbarRef = ref<HTMLElement | null>(null)
const themeOptions: ThemePreference[] = ['light', 'dark', 'system']

function closeThemeMenu() {
  themeMenuOpen.value = false
}

function toggleThemeMenu() {
  closeLangMenu()
  themeMenuOpen.value = !themeMenuOpen.value
}

function closeMenus() {
  closeLangMenu()
  closeThemeMenu()
}

useOutsideClick(closeMenus, topbarRef)
</script>

<template>
  <header ref="topbarRef" class="topbar">
    <div>
      <DropdownMenu
        list-id="langSelectList"
        :label="t('langName')"
        :open="langMenuOpen"
        :aria-label="t('langToggleAria')"
        @toggle="toggleLangMenu"
      >
        <button
          v-for="code in LOCALE_ORDER"
          :key="code"
          type="button"
          class="lang-option"
          role="option"
          :aria-selected="locale === code ? 'true' : 'false'"
          @click="setLocale(code as LandingLocale)"
        >
          {{ LOCALE_LABELS[code] }}
        </button>
      </DropdownMenu>
    </div>

    <div>
      <DropdownMenu
        list-id="themeSelectList"
        :label="themeLabel(themePref)"
        :open="themeMenuOpen"
        align-end
        @toggle="toggleThemeMenu"
      >
        <button
          v-for="pref in themeOptions"
          :key="pref"
          type="button"
          class="lang-option"
          role="option"
          :aria-selected="themePref === pref ? 'true' : 'false'"
          @click="setThemePref(pref)"
        >
          {{ themeLabel(pref) }}
        </button>
      </DropdownMenu>
    </div>
  </header>
</template>
