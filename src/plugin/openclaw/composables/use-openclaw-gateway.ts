import { computed, reactive, ref, shallowRef, watch } from 'vue'

import type { EventFrame, HelloOk, ResponseFrame } from '../lib/protocol'

import { buildConnectParams, buildRequestFrame, parseGatewayFrame } from '../lib/protocol'

export type GatewayStatus = 'idle' | 'connecting' | 'connected' | 'closed' | 'error'

const DEFAULT_BACKOFF = 800
const MAX_BACKOFF = 15_000

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

let clientInstanceId: string
function getClientInstanceId(): string {
  if (!clientInstanceId)
    clientInstanceId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  return clientInstanceId
}

// 单例状态：切换 tab 导致 layout 重建时仍为同一连接与状态，避免显示“断开连接”
const statusRef = ref<GatewayStatus>('idle')
const helloRef = shallowRef<HelloOk | null>(null)
const lastErrorRef = ref<string | null>(null)
const pendingMap = new Map<string, { resolve: (v: unknown) => void, reject: (e: Error) => void }>()
const eventHandlersMap = new Map<string, Set<(payload: unknown) => void>>()
let wsInstance: WebSocket | null = null
let connectSent = false
let backoffMs = DEFAULT_BACKOFF
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
/** 用户主动断开时置 true，禁止 onclose 触发的自动重连 */
let stopAutoReconnect = false
/** 用户主动断开后为 true，禁止一切隐式 connect（含 scheduleReconnect），直至 connect({ explicit: true }) */
let blockImplicitConnect = false

// 当前使用的 url/auth 引用（由最近一次 useOpenClawGateway 调用传入，与 config/auth 单例一致）
let currentWsUrlRef: { value: string } = { value: '' }
let currentAuthRef: { token: { value: string }, password: { value: string } } = {
  token: { value: '' },
  password: { value: '' },
}

export function useOpenClawGateway(wsUrlRef: { value: string }, authRef: { token: { value: string }, password: { value: string } }) {
  currentWsUrlRef = wsUrlRef
  currentAuthRef = authRef

  const status = statusRef
  const hello = helloRef
  const lastError = lastErrorRef
  const pending = pendingMap
  const eventHandlers = eventHandlersMap

  function on(event: string, handler: (payload: unknown) => void) {
    if (!eventHandlers.has(event))
      eventHandlers.set(event, new Set())
    eventHandlers.get(event)!.add(handler)
    return () => eventHandlers.get(event)?.delete(handler)
  }

  function emit(event: string, payload: unknown) {
    eventHandlers.get(event)?.forEach(h => h(payload))
  }

  function flushPending(err: Error) {
    for (const [, { reject }] of pending) reject(err)
    pending.clear()
  }

  /**
   * 用户点击「连接」时传 explicit=true；
   * 主动断开后，隐式连接会被阻止，直到再次显式连接。
   */
  function connect(opts?: { explicit?: boolean }) {
    if (blockImplicitConnect && !opts?.explicit) {
      return
    }
    if (opts?.explicit) {
      blockImplicitConnect = false
    }
    stopAutoReconnect = false
    const url = currentWsUrlRef?.value?.trim()
    if (!url) {
      status.value = 'error'
      lastError.value = 'WebSocket URL 未配置'
      return
    }
    if (wsInstance?.readyState === WebSocket.OPEN)
      return
    status.value = 'connecting'
    lastError.value = null
    wsInstance = new WebSocket(url)
    wsInstance.onopen = () => {
      connectSent = false
      sendConnect()
    }
    wsInstance.onmessage = (ev) => {
      const frame = parseGatewayFrame(String(ev.data ?? ''))
      if (!frame)
        return
      // 服务端 connect 响应为 type 'res' + payload（hello 对象），不单独发 hello-ok 帧（与 Control UI 一致）
      if (frame.type === 'res') {
        const res = frame as ResponseFrame
        const p = pending.get(res.id)
        if (p) {
          pending.delete(res.id)
          if (res.ok)
            p.resolve(res.payload)
          else p.reject(new Error(res.error?.message ?? 'RPC error'))
        }
        return
      }
      if (frame.type === 'event') {
        const evt = frame as EventFrame
        emit(evt.event, evt.payload)
      }
    }
    wsInstance.onclose = (ev) => {
      wsInstance = null
      connectSent = false
      flushPending(new Error(`Gateway closed: ${ev.code} ${ev.reason}`))
      if (status.value === 'connecting') {
        status.value = 'error'
        lastError.value = ev.reason || `连接关闭 (${ev.code})`
      }
      else {
        status.value = 'closed'
      }
      scheduleReconnect()
    }
    wsInstance.onerror = () => {
      lastError.value = 'WebSocket 错误'
    }
  }

  function sendConnect() {
    if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN || connectSent)
      return
    connectSent = true
    const params = buildConnectParams({
      token: currentAuthRef?.token?.value?.trim() || undefined,
      password: currentAuthRef?.password?.value?.trim() || undefined,
      instanceId: getClientInstanceId(),
    })
    const id = generateId()
    pending.set(id, {
      resolve: (payload) => {
        if (payload && typeof payload === 'object') {
          hello.value = payload as HelloOk
          status.value = 'connected'
          backoffMs = DEFAULT_BACKOFF
        }
      },
      reject: (err) => {
        status.value = 'error'
        lastError.value = err.message
      },
    })
    wsInstance.send(JSON.stringify(buildRequestFrame(id, 'connect', params as unknown as Record<string, unknown>)))
  }

  function scheduleReconnect() {
    if (stopAutoReconnect)
      return
    if (status.value === 'connected' || status.value === 'connecting')
      return
    if (reconnectTimer)
      clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect(undefined)
      backoffMs = Math.min(backoffMs * 1.7, MAX_BACKOFF)
    }, backoffMs)
  }

  /**
   * stopAutoReconnect=true: 用户主动断开，禁止自动重连；
   * 否则允许 onclose 后按退避策略自动重连。
   */
  function disconnect(opts?: { stopAutoReconnect?: boolean }) {
    if (opts?.stopAutoReconnect === true) {
      stopAutoReconnect = true
      blockImplicitConnect = true
    }
    else {
      stopAutoReconnect = false
      blockImplicitConnect = false
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    backoffMs = DEFAULT_BACKOFF
    if (wsInstance) {
      const ws = wsInstance
      wsInstance = null
      const userClose = opts?.stopAutoReconnect === true
      if (userClose) {
        ws.onopen = null
        ws.onmessage = null
        ws.onerror = null
        ws.onclose = null
      }
      try {
        ws.close(1000, 'client disconnect')
      }
      catch {
        /* ignore */
      }
    }
    connectSent = false
    flushPending(new Error('Disconnected'))
    status.value = 'closed'
    hello.value = null
  }

  function request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) {
        reject(new Error('未连接'))
        return
      }
      const id = generateId()
      pending.set(id, {
        resolve: payload => resolve(payload as T),
        reject,
      })
      wsInstance.send(JSON.stringify(buildRequestFrame(id, method, params)))
    })
  }

  watch(
    () => currentWsUrlRef?.value,
    (url, oldUrl) => {
      if (url !== oldUrl && wsInstance) {
        disconnect()
      }
    },
  )

  const connected = computed(() => status.value === 'connected')

  // 必须用 reactive 包裹：模板里 gateway.connected / gateway.status 等才会解包，
  // 否则 ComputedRef 作为对象始终为 truthy，顶栏会永远显示 Connected
  return reactive({
    status,
    hello,
    lastError,
    connect,
    disconnect,
    request,
    on,
    connected,
  })
}
