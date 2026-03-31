import { del, get, post, put } from '@/services/request'

export interface SysMenuResult {
  id: number
  title: string
  name: string
  path: string
  sort: number
  icon?: string
  type: number
  component?: string
  perms?: string
  status: number
  display: number
  cache: number
  remark?: string
  parent_id?: number
  created_time: string
}

export interface SysMenuTreeResult extends SysMenuResult {
  children?: SysMenuTreeResult[]
}

export interface SysMenuParams {
  title: string
  name: string
  path?: string
  parent_id?: number
  sort?: number
  icon?: string
  type?: number
  component?: string
  perms?: string
  status?: number
  display?: number
  cache?: number
  link?: string
  remark?: string
}

export interface SysMenuTreeParams {
  title?: string
  status: number
}

export function getAllMenusApi() {
  return get<any[]>('/v1/sys/menus/sidebar')
}

export function getSysMenuTreeApi(params: SysMenuTreeParams) {
  return get<SysMenuTreeResult[]>('/v1/sys/menus', { params })
}

export function createSysMenuApi(data: SysMenuParams) {
  return post('/v1/sys/menus', data)
}

export function updateSysMenuApi(pk: number, data: SysMenuParams) {
  return put(`/v1/sys/menus/${pk}`, data)
}

export function deleteSysMenuApi(pk: number) {
  return del(`/v1/sys/menus/${pk}`)
}
