/**
 * Bento 布局 API（后端插件 bento_layout：/v1/bento-layout）
 */
import { del, get, post } from '@/services/request'

import type { BentoLayoutItem } from '../components/types'

export interface BentoLayoutPayload {
  layout: BentoLayoutItem[]
  pageId: string
  timestamp?: number
}

export async function saveBentoLayoutApi(data: BentoLayoutPayload): Promise<{ success: boolean, message?: string }> {
  return post('/v1/bento-layout/save', data)
}

export async function getBentoLayoutApi(
  pageId: string,
  config?: { skipGlobalErrorToast?: boolean },
): Promise<{ layout: BentoLayoutItem[], pageId: string, timestamp: number }> {
  return get(`/v1/bento-layout/get`, { params: { pageId }, ...config })
}

export async function deleteBentoLayoutApi(pageId: string): Promise<{ success: boolean, message?: string }> {
  return del('/v1/bento-layout/delete', { params: { pageId } })
}

export async function listBentoLayoutsApi(): Promise<Array<{ pageId: string, timestamp: number }>> {
  return get('/v1/bento-layout/list')
}
