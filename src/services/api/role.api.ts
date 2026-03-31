import { del, get, post, put } from '@/services/request'

export interface SysRoleParams {
  name?: string
  status?: number
  page?: number
  size?: number
}

export interface SysRoleResult {
  id: number
  name: string
  status: number
  is_filter_scopes: boolean
  remark?: string
  created_time: string
  updated_time: string
}

export interface CreateSysRoleParams {
  name: string
  status: number
  remark?: string
}

export function getSysRoleListApi(params?: SysRoleParams) {
  return get<SysRoleResult[]>('/v1/sys/roles', { params: params ?? {} })
}

export function getAllSysRoleApi() {
  return get<SysRoleResult[]>('/v1/sys/roles/all')
}

export function getSysRoleMenuApi(pk: number) {
  return get<any[]>(`/v1/sys/roles/${pk}/menus`)
}

export function getSysRoleDataScopesApi(pk: number) {
  return get<number[]>(`/v1/sys/roles/${pk}/scopes`)
}

export function createSysRoleApi(data: CreateSysRoleParams) {
  return post('/v1/sys/roles', data)
}

export function updateSysRoleApi(pk: number, data: CreateSysRoleParams) {
  return put(`/v1/sys/roles/${pk}`, data)
}

export function updateSysRoleMenuApi(pk: number, menus: number[]) {
  return put(`/v1/sys/roles/${pk}/menus`, { menus })
}

export function updateSysRoleDataScopesApi(pk: number, scopes: number[]) {
  return put(`/v1/sys/roles/${pk}/scopes`, { scopes })
}

export function deleteSysRoleApi(pks: number[]) {
  return del('/v1/sys/roles', { data: { pks } })
}
