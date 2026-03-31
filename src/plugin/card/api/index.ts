/**
 * 卡片管理插件 API
 */
import { get, post } from '@/services/request'

export interface CardItem {
  id: number
  title: string
  summary?: string
  description?: string
  card_type?: string
  sort_order?: number
  created_time?: string
  updated_time?: string
}

export function getCardListApi() {
  return get<CardItem[]>('/v1/cards')
}

/** 安装本地卡片包（上传 .zip 文件，后端需提供 POST /v1/cards/install） */
export function installCardPackageApi(file: File) {
  const form = new FormData()
  form.append('file', file)
  return post<{ message?: string }>('/v1/cards/install', form)
}
