/**
 * Apprise 通知插件 API（后端：/v1/apprise-notify）
 */
import { del, get, post, put } from '@/services/request'

export interface AppriseChannel {
  id: number
  name: string
  enabled: boolean
  description?: string | null
  appriseUrlMasked: string
  /** 仅详情/创建/更新接口返回 */
  appriseUrl?: string
}

export interface AppriseLogItem {
  id: number
  channelId: number | null
  channelName: string
  title: string
  body: string
  status: string
  errorMessage?: string | null
  /** 后端：test=通道测试 notify=通知接口；旧数据可能为空 */
  triggerSource?: string
  createdTime: number
}

export interface NotifyResultItem {
  channelId: number
  success: boolean
  error?: string | null
}

export async function listAppriseChannelsApi(): Promise<AppriseChannel[]> {
  return get('/v1/apprise-notify/channels')
}

export async function getAppriseChannelApi(id: number): Promise<AppriseChannel> {
  return get(`/v1/apprise-notify/channels/${id}`)
}

export async function createAppriseChannelApi(payload: {
  name: string
  appriseUrl: string
  enabled?: boolean
  description?: string | null
}): Promise<AppriseChannel> {
  return post('/v1/apprise-notify/channels', payload)
}

export async function updateAppriseChannelApi(
  id: number,
  payload: Partial<{ name: string, appriseUrl: string, enabled: boolean, description: string | null }>,
): Promise<AppriseChannel> {
  return put(`/v1/apprise-notify/channels/${id}`, payload)
}

export async function deleteAppriseChannelApi(id: number): Promise<{ success: boolean }> {
  return del(`/v1/apprise-notify/channels/${id}`)
}

export async function testAppriseChannelApi(
  id: number,
  payload?: { title?: string, body?: string },
): Promise<{ success: boolean }> {
  return post(`/v1/apprise-notify/channels/${id}/test`, payload ?? {})
}

export async function notifyAppriseChannelsApi(payload: {
  channelIds: number[]
  title: string
  body: string
}): Promise<{ results: NotifyResultItem[], allSuccess: boolean }> {
  return post('/v1/apprise-notify/notify', payload)
}

export interface AppriseLogsPage {
  items: AppriseLogItem[]
  total: number
  page: number
  size: number
  totalPages: number
}

export async function listAppriseLogsApi(
  page = 1,
  size = 20,
  config?: { skipGlobalErrorToast?: boolean },
): Promise<AppriseLogsPage> {
  return get('/v1/apprise-notify/logs', { params: { page, size }, ...config })
}
