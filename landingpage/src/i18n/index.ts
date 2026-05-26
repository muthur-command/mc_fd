import { createI18n } from 'vue-i18n'

import { detectLocale } from '@/constants'
import en from '@/i18n/en.json'
import it from '@/i18n/it.json'
import ru from '@/i18n/ru.json'
import zh from '@/i18n/zh.json'

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: { en, zh, it, ru },
})

export type LandingMessages = typeof en
