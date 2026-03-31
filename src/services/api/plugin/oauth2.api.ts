import { del, get } from '@/services/request'

export interface OAuth2BindingParams {
  source: 'Github' | 'Google'
}

export function getOAuth2Github() {
  return get<string>('/v1/oauth2/github')
}

export function getOAuth2Google() {
  return get<string>('/v1/oauth2/google')
}

export function getOAuth2Bindings() {
  return get<string[]>('/v1/oauth2/me/bindings')
}

export function getOAuth2BindingAuthUrl(params: OAuth2BindingParams) {
  return get<string>('/v1/oauth2/me/binding', { params })
}

export function deleteOAuth2Binding(params: OAuth2BindingParams) {
  return del('/v1/oauth2/me/unbinding', { params })
}
