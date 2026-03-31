import { get, post } from '@/services/request'

export interface CaptchaResult {
  is_enabled: boolean
  expire_seconds: number
  uuid: string
  image: string
}

export interface LoginParams {
  username: string
  password: string
  uuid: string
  captcha: string
}

export interface LoginResult {
  access_token: string
  session_uuid: string
}

export type RefreshTokenResult = LoginResult

export function getCaptchaApi() {
  return get<CaptchaResult>('/v1/auth/captcha')
}

export function loginApi(data: LoginParams) {
  return post<LoginResult>('/v1/auth/login', data)
}

export function refreshTokenApi() {
  return post<RefreshTokenResult>('/v1/auth/refresh', undefined, { withCredentials: true })
}

export function logoutApi() {
  return post('/v1/auth/logout')
}

export function getAccessCodesApi() {
  return get<string[]>('/v1/auth/codes')
}
