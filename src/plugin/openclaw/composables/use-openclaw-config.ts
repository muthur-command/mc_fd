import { ref } from 'vue'

import { get } from '@/services/request'

export interface OpenClawConfig {
  baseUrl: string
  wsUrl: string
}

const STORAGE_KEY = 'openclaw_plugin_config_cache'

// 单例：切换 tab 导致 layout 重建时仍为同一 ref，避免状态丢失
const configRef = ref<OpenClawConfig | null>(null)
const loadingRef = ref(false)
const errorRef = ref<string | null>(null)

export function useOpenClawConfig() {
  const config = configRef
  const loading = loadingRef
  const error = errorRef

  async function fetchConfig() {
    loading.value = true
    error.value = null
    try {
      const data = await get<OpenClawConfig>('/v1/openclaw/config', { skipGlobalErrorToast: true })
      config.value = data ?? null
      if (data) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        }
        catch {
          // ignore
        }
      }
      return data ?? null
    }
    catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      error.value = msg
      const cached = localStorage.getItem(STORAGE_KEY)
      if (cached) {
        try {
          config.value = JSON.parse(cached) as OpenClawConfig
        }
        catch {
          config.value = null
        }
      }
      else {
        config.value = null
      }
      return config.value
    }
    finally {
      loading.value = false
    }
  }

  function loadCached() {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached) {
      try {
        config.value = JSON.parse(cached) as OpenClawConfig
      }
      catch {
        config.value = null
      }
    }
    else {
      config.value = null
    }
  }

  function setConfig(next: OpenClawConfig | null) {
    config.value = next
    try {
      if (next)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      else localStorage.removeItem(STORAGE_KEY)
    }
    catch {
      // ignore
    }
  }

  return { config, loading, error, fetchConfig, loadCached, setConfig }
}
