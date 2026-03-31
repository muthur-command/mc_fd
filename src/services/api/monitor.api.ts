import { del, get } from '@/services/request'

export interface ServerMonitorResult {
  cpu: Record<string, unknown>
  mem: Record<string, unknown>
  sys: Record<string, unknown>
  disk: Record<string, unknown>[]
  service: Record<string, unknown>
}

export interface RedisMonitorResult {
  info: Record<string, unknown>
  stats: Record<string, unknown>[]
}

export interface OnlineMonitorResult {
  id: number
  session_uuid: string
  username: string
  nickname: string
  ip: string
  os: string
  browser: string
  device: string
  status: number
  last_login_time: string
  expires_time: number
}

export interface MonitorOnlineParams {
  username?: string
}

export interface KickOutOnlineParams {
  session_uuid: string
}

export function getServerMonitorApi() {
  return get<ServerMonitorResult>('/v1/monitors/server')
}

export function getRedisMonitorApi() {
  return get<RedisMonitorResult>('/v1/monitors/redis')
}

export function getOnlineMonitorApi(params?: MonitorOnlineParams) {
  return get<OnlineMonitorResult[]>('/v1/monitors/sessions', { params: params ?? {} })
}

export function kickOutOnlineApi(pk: number, params: KickOutOnlineParams) {
  return del(`/v1/monitors/sessions/${pk}`, { params })
}
