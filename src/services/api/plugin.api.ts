/**
 * System plugin management API (install/uninstall plugins)
 */
import { del, download, get, post, put, upload } from '@/services/request'

export interface PluginInfo {
  name: string
  summary: string
  author?: string
  description?: string
  version?: string
  enable?: string
  icon?: string
  tags?: string[]
  database?: string[]
  /** 插件配置（后端可选返回），如 install_sidebar_group、sidebar_icon（Lucide 图标名）等 */
  config?: Record<string, unknown>
}

export interface PluginResult {
  plugin: PluginInfo
  [key: string]: unknown
}

export function getPluginListApi() {
  return get<PluginResult[]>('/v1/sys/plugins')
}

export function getPluginChangedApi() {
  return get<boolean>('/v1/sys/plugins/changed')
}

export function installZipPluginApi(file: File) {
  return upload('/v1/sys/plugins', { file }, { params: { type: 'zip' }, timeout: 60_000 })
}

export function installGitPluginApi(repo_url: string) {
  return post('/v1/sys/plugins', undefined, { params: { type: 'git', repo_url } })
}

export function updatePluginStatus(plugin: string) {
  return put(`/v1/sys/plugins/${plugin}/status`)
}

export function downloadPluginApi(plugin: string) {
  return download(`/v1/sys/plugins/${plugin}`)
}

export function uninstallPluginApi(plugin: string) {
  return del(`/v1/sys/plugins/${plugin}`)
}

export function getRemoteListUrlApi() {
  return get<string | null>('/v1/sys/plugins/remote/url')
}

export function setRemoteListUrlApi(url: string) {
  return put('/v1/sys/plugins/remote/url', { url })
}

export function getRemoteListUrlsApi() {
  return get<string[]>('/v1/sys/plugins/remote/urls')
}

export function setRemoteListUrlsApi(urls: string[]) {
  return put('/v1/sys/plugins/remote/urls', { urls })
}

/** 远程列表项可能是 { plugin: PluginInfo } 或直接的 PluginInfo 或 { name, summary, ... } */
export interface RemotePluginItem {
  plugin?: PluginInfo
  name?: string
  summary?: string
  author?: string
  description?: string
  version?: string
  [key: string]: unknown
}

export function getRemotePluginListApi() {
  return get<RemotePluginItem[]>('/v1/sys/plugins/remote')
}
