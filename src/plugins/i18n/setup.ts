import type { App } from 'vue'

import { createI18n } from 'vue-i18n'

import en from './en.json'
import zh from './zh.json'

/** 深度合并 target[key] = source[key]，仅合并纯对象 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
  for (const key of Object.keys(source)) {
    const src = source[key]
    if (src != null && typeof src === 'object' && !Array.isArray(src) && Object.getPrototypeOf(src) === Object.prototype) {
      const t = target[key]
      if (t != null && typeof t === 'object' && !Array.isArray(t) && Object.getPrototypeOf(t) === Object.prototype) {
        deepMerge(t as Record<string, unknown>, src as Record<string, unknown>)
      }
      else {
        (target as Record<string, unknown>)[key] = { ...(src as Record<string, unknown>) }
      }
    }
    else {
      (target as Record<string, unknown>)[key] = src
    }
  }
  return target
}

const pluginEnModules = import.meta.glob<{ default: Record<string, unknown> }>('../../plugin/*/i18n/en.json', { eager: true })
const pluginZhModules = import.meta.glob<{ default: Record<string, unknown> }>('../../plugin/*/i18n/zh.json', { eager: true })

for (const mod of Object.values(pluginEnModules)) {
  const data = mod?.default
  if (data && typeof data === 'object')
    deepMerge(en as Record<string, unknown>, data)
}
for (const mod of Object.values(pluginZhModules)) {
  const data = mod?.default
  if (data && typeof data === 'object')
    deepMerge(zh as Record<string, unknown>, data)
}

/** 导出的 i18n 实例，供 request 等模块读取当前语言以设置 Accept-Language */
export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    zh,
    en,
  },
})

export function setupI18n(app: App) {
  app.use(i18n)
}
