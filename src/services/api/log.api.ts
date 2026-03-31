import type { PaginationResult } from '@/services/types/pagination'

import { del, get } from '@/services/request'

export interface LoginLogParams {
  username?: string
  status?: number
  ip?: string
  page?: number
  size?: number
}

export interface LoginLogResult {
  id: number
  username: string
  status: number
  ip: string
  country?: string
  region?: string
  os?: string
  browser?: string
  device?: string
  msg: string
  /** 消息（当前语言），由后端 i18n 填充，优先于 msg 展示 */
  msg_display?: string
  login_time: string
}

export type OperaLogParams = LoginLogParams

export interface OperaLogResult {
  id: number
  trace_id: string
  username?: string
  method: string
  title: string
  /** 操作标题（当前语言），由后端 i18n 填充，优先于 title 展示 */
  title_display?: string
  path: string
  ip: string
  country?: string
  region?: string
  city?: string
  user_agent: string
  os?: string
  browser?: string
  device?: string
  args?: Record<string, unknown>
  status: number
  code: string
  msg: string
  cost_time: number
  opera_time: string
}

export function getLoginLogListApi(params?: LoginLogParams) {
  return get<PaginationResult<LoginLogResult>>('/v1/logs/login', { params: params ?? {} })
}

export function deleteLoginLogApi(pks: number[]) {
  return del('/v1/logs/login', { data: { pks } })
}

export function getOperaLogListApi(params?: OperaLogParams) {
  return get<PaginationResult<OperaLogResult>>('/v1/logs/opera', { params: params ?? {} })
}

export function deleteOperaLogApi(pks: number[]) {
  return del('/v1/logs/opera', { data: { pks } })
}
