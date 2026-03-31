/**
 * OpenClaw Gateway WebSocket 协议类型（与 openclaw-cn protocol 对齐）
 */

export const PROTOCOL_VERSION = 3
export const GATEWAY_CLIENT_ID = 'openclaw-control-ui'
export const GATEWAY_CLIENT_MODE = 'webchat'

export interface ConnectAuth {
  token?: string
  password?: string
}

export interface ConnectClient {
  id: string
  version?: string
  platform?: string
  mode?: string
  instanceId?: string
}

export interface ConnectParams {
  minProtocol?: number
  maxProtocol?: number
  client: ConnectClient
  role?: string
  scopes?: string[]
  device?: {
    id: string
    publicKey: string
    signature: string
    signedAt: number
    nonce?: string
  }
  caps?: unknown[]
  auth?: ConnectAuth
  userAgent?: string
  locale?: string
}

export interface RequestFrame {
  type: 'req'
  id: string
  method: string
  params?: Record<string, unknown>
}

export interface ResponseFrame {
  type: 'res'
  id: string
  ok: boolean
  payload?: unknown
  error?: { code: string, message: string, details?: unknown }
}

export interface EventFrame {
  type: 'event'
  event: string
  payload?: unknown
  seq?: number
  stateVersion?: { presence?: number, health?: number }
}

export interface HelloOk {
  type: 'hello-ok'
  protocol: number
  features?: { methods?: string[], events?: string[] }
  snapshot?: unknown
  auth?: {
    deviceToken?: string
    role?: string
    scopes?: string[]
    issuedAtMs?: number
  }
  policy?: { tickIntervalMs?: number }
}

export type GatewayFrame = RequestFrame | ResponseFrame | EventFrame | HelloOk

export function parseGatewayFrame(raw: string): GatewayFrame | null {
  try {
    return JSON.parse(raw) as GatewayFrame
  }
  catch {
    return null
  }
}

export function buildConnectParams(opts: {
  token?: string
  password?: string
  clientId?: string
  clientVersion?: string
  instanceId?: string
}): ConnectParams {
  return {
    minProtocol: PROTOCOL_VERSION,
    maxProtocol: PROTOCOL_VERSION,
    client: {
      id: opts.clientId ?? GATEWAY_CLIENT_ID,
      version: opts.clientVersion ?? 'mc-fd',
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'web',
      mode: GATEWAY_CLIENT_MODE,
      instanceId: opts.instanceId,
    },
    role: 'operator',
    scopes: ['operator.admin', 'operator.approvals', 'operator.pairing'],
    caps: [],
    auth:
      opts.token || opts.password
        ? { token: opts.token, password: opts.password }
        : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    locale: typeof navigator !== 'undefined' ? navigator.language : 'en',
  }
}

export function buildRequestFrame(id: string, method: string, params?: Record<string, unknown>): RequestFrame {
  return { type: 'req', id, method, params }
}
