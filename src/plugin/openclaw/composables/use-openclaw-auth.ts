import type { Ref } from 'vue'

import { ref, watch } from 'vue'

/** 与 Control UI 一致：token 按 gateway URL 存在 sessionStorage，password 不持久化 */
const TOKEN_SESSION_KEY_PREFIX = 'openclaw_plugin_token:'
const STORAGE_KEY_SESSION_KEY = 'openclaw_plugin_session_key'

function normalizeGatewayTokenScope(gatewayUrl: string): string {
  const trimmed = gatewayUrl.trim()
  if (!trimmed)
    return 'default'
  try {
    const base
      = typeof location !== 'undefined'
        ? `${location.protocol}//${location.host}${location.pathname || '/'}`
        : undefined
    const parsed = base ? new URL(trimmed, base) : new URL(trimmed)
    const pathname
      = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '') || parsed.pathname
    return `${parsed.protocol}//${parsed.host}${pathname}`
  }
  catch {
    return trimmed
  }
}

function tokenSessionKeyForGateway(gatewayUrl: string): string {
  return `${TOKEN_SESSION_KEY_PREFIX}${normalizeGatewayTokenScope(gatewayUrl)}`
}

function getSessionStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.sessionStorage)
    return window.sessionStorage
  if (typeof sessionStorage !== 'undefined')
    return sessionStorage
  return null
}

function loadSessionToken(gatewayUrl: string): string {
  try {
    const storage = getSessionStorage()
    if (!storage)
      return ''
    return storage.getItem(tokenSessionKeyForGateway(gatewayUrl)) ?? ''
  }
  catch {
    return ''
  }
}

function persistSessionToken(gatewayUrl: string, token: string) {
  try {
    const storage = getSessionStorage()
    if (!storage)
      return
    const key = tokenSessionKeyForGateway(gatewayUrl)
    const normalized = token.trim()
    if (normalized)
      storage.setItem(key, normalized)
    else storage.removeItem(key)
  }
  catch {
    // best-effort
  }
}

// 单例：与 config/gateway 一致，切换 tab 后仍为同一状态
const tokenRef = ref('')
const passwordRef = ref('') // 仅内存，不持久化（与 Control UI 一致）
const sessionKeyRef = ref('')

function loadSessionKeyOnce() {
  try {
    sessionKeyRef.value = localStorage.getItem(STORAGE_KEY_SESSION_KEY) ?? ''
  }
  catch {
    sessionKeyRef.value = ''
  }
}
loadSessionKeyOnce()

/**
 * 与 OpenClaw Control UI 业务逻辑一致：
 * - token：sessionStorage，按 gateway URL 分 key，不写 localStorage
 * - password：不持久化，仅内存
 * - sessionKey：localStorage
 */
export function useOpenClawAuth(wsUrlRef?: Ref<string>) {
  const token = tokenRef
  const password = passwordRef
  const sessionKey = sessionKeyRef

  function loadTokenForUrl(url: string) {
    token.value = loadSessionToken(url)
  }

  function loadStored() {
    const url = wsUrlRef?.value?.trim() ?? ''
    if (url)
      loadTokenForUrl(url)
    loadSessionKeyOnce()
  }

  if (wsUrlRef) {
    watch(
      wsUrlRef,
      (url) => {
        if (url?.trim())
          loadTokenForUrl(url)
      },
      { immediate: true },
    )
  }
  else {
    loadStored()
  }

  function setToken(value: string | number) {
    token.value = String(value)
    const url = wsUrlRef?.value?.trim() ?? ''
    if (url)
      persistSessionToken(url, String(value))
  }

  function setPassword(value: string | number) {
    password.value = String(value)
    // 不写入任何存储（Control UI: "Password (not stored)"）
  }

  function setSessionKey(value: string | number) {
    const s = String(value)
    sessionKey.value = s
    try {
      if (s)
        localStorage.setItem(STORAGE_KEY_SESSION_KEY, s)
      else
        localStorage.removeItem(STORAGE_KEY_SESSION_KEY)
    }
    catch {
      // ignore
    }
  }

  function clear() {
    token.value = ''
    password.value = ''
    sessionKey.value = ''
    try {
      localStorage.removeItem(STORAGE_KEY_SESSION_KEY)
    }
    catch {
      // ignore
    }
    // sessionStorage 的 token 按 URL 存，不在这里批量清
  }

  return {
    token,
    password,
    sessionKey,
    setToken,
    setPassword,
    setSessionKey,
    clear,
    loadStored,
  }
}
