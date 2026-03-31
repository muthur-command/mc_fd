import type { SysRoleResult } from '@/services/api/role.api'

import { del, get, post, put } from '@/services/request'

export interface MyUserInfo {
  id: number
  username: string
  nickname: string
  avatar?: string
  email?: string
  phone?: string
  last_login_time: string
  /** 当前用户角色名称列表（/me 接口返回） */
  roles?: string[]
}

export interface SysUserResult {
  id: number
  uuid: string
  username: string
  nickname: string
  email?: string
  phone?: string
  avatar?: string
  status: number
  is_superuser: boolean
  is_staff: boolean
  is_multi_login: boolean
  join_time: string
  last_login_time: string
  roles: SysRoleResult[]
}

export interface PageData<T> {
  items: T[]
  total: number
  page: number
}

export interface SysUserParams {
  username?: string
  email?: string
  status?: number
  page?: number
  size?: number
}

export interface SysUpdateUserParams {
  username: string
  nickname: string
  avatar?: string
  email?: string
  phone?: string
  roles: number[]
}

export interface SysAddUserParams extends SysUpdateUserParams {
  password: string
}

export interface SysUpdatePasswordParams {
  old_password: string
  new_password: string
  confirm_password: string
}

export interface SysUpdateUserPhoneParams {
  phone: string
  captcha: string
}

export interface SysUpdateUserEmailParams {
  email: string
  captcha: string
}

export interface SysUpdateUserNicknameParams {
  nickname: string
}

export interface SysUpdateUserAvatarParams {
  avatar: string
}

export interface SysResetPasswordParams {
  password: string
}

/** 用户偏好（与后端 UserPreferenceSchema 一致） */
export interface UserPreference {
  locale: string
  theme: string
  theme_color?: string
  radius?: string
  scale?: string
  content_layout?: string
  font?: string
  chart_preset?: string
  sidebar_collapsed: boolean
  plugin_system_show_remote?: boolean
  /** 卡片插件是否展示远程标签（与插件管理「展示远程列表」一致） */
  plugin_card_show_remote?: boolean
  /** 个人资料页背景图路径，同头像 /static/upload/cover/xxx */
  profile_cover?: string | null
}

/** 未登录或后端无偏好时的默认偏好（与后端默认值及 Profile 设置表单一致，用于登录页等） */
export const DEFAULT_USER_PREFERENCE: UserPreference = {
  locale: 'en',
  theme: 'auto',
  sidebar_collapsed: false,
  plugin_system_show_remote: false,
  plugin_card_show_remote: false,
  theme_color: 'default',
  radius: 'xl',
  scale: 'sm',
  content_layout: 'full',
  font: '',
  chart_preset: '',
  profile_cover: '',
}

/** 更新用户偏好参数（全部可选） */
export interface UpdateUserPreferenceParams {
  locale?: string
  theme?: string
  theme_color?: string
  radius?: string
  scale?: string
  content_layout?: string
  font?: string
  chart_preset?: string
  sidebar_collapsed?: boolean
  plugin_system_show_remote?: boolean
  plugin_card_show_remote?: boolean
  profile_cover?: string | null
}

export function getUserInfoApi() {
  return get<MyUserInfo>('/v1/sys/users/me')
}

export function getUserPreferencesApi() {
  return get<UserPreference>('/v1/sys/users/me/preferences')
}

export function saveUserPreferencesApi(data: UpdateUserPreferenceParams) {
  return put<UserPreference>('/v1/sys/users/me/preferences', data)
}

export function getSysUserListApi(params: SysUserParams) {
  return get<PageData<SysUserResult>>('/v1/sys/users', { params })
}

export function createSysUserApi(data: SysAddUserParams) {
  return post('/v1/sys/users', data)
}

export function updateSysUserApi(pk: number, data: SysUpdateUserParams) {
  return put(`/v1/sys/users/${pk}`, data)
}

export function updateSysUserPermissionApi(pk: number, type: string) {
  return put(`/v1/sys/users/${pk}/permissions`, undefined, { params: { type } })
}

/** 更新头像接口成功时返回的新头像 URL（便于前端立即刷新） */
export interface UpdateAvatarResult {
  avatar?: string
}

export function updateSysUserAvatarApi(data: SysUpdateUserAvatarParams) {
  return put<UpdateAvatarResult>('/v1/sys/users/me/avatar', data)
}

export function updateSysUserNicknameApi(data: SysUpdateUserNicknameParams) {
  return put('/v1/sys/users/me/nickname', data)
}

export function updateSysUserPhoneApi(data: SysUpdateUserPhoneParams) {
  return put('/v1/sys/users/me/phone', data)
}

export function updateSysUserEmailApi(data: SysUpdateUserEmailParams) {
  return put('/v1/sys/users/me/email', data)
}

export function updateSysUserPasswordApi(data: SysUpdatePasswordParams) {
  return put('/v1/sys/users/me/password', data)
}

export function resetSysUserPasswordApi(pk: number, data: SysResetPasswordParams) {
  return put(`/v1/sys/users/${pk}/password`, data)
}

export function deleteSysUserApi(pk: number) {
  return del(`/v1/sys/users/${pk}`)
}
