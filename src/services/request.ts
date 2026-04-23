/**
 * Request client for MC backend API.
 * Backend returns { code: 200, data } - interceptor unwraps to data.
 */
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

import axios from 'axios'
import { toast } from 'vue-sonner'

import { i18n } from '@/plugins/i18n/setup'
import pinia from '@/plugins/pinia/setup'
import { useAuthStore } from '@/stores/auth'
import env from '@/utils/env'

// 开发时 VITE_SERVER_API_URL 留空则用相对路径，由 vite proxy 转发到后端，避免 CORS
const BASE_URL = env.VITE_SERVER_API_URL
  ? `${env.VITE_SERVER_API_URL}${env.VITE_SERVER_API_PREFIX}`
  : env.VITE_SERVER_API_PREFIX

export const requestClient = axios.create({
  baseURL: BASE_URL,
  timeout: env.VITE_SERVER_API_TIMEOUT,
  withCredentials: true,
})

/** Backend response shape */
interface BackendResponse<T = unknown> {
  code: number
  data: T
  msg?: string
  message?: string
}

const SUCCESS_CODE = 200

/** 请求配置扩展：不弹出全局错误 toast（由调用方自行处理） */
export interface RequestConfigExtension { skipGlobalErrorToast?: boolean }

/** 单独调刷新接口，不经过 requestClient，避免 401 拦截与循环依赖 */
function callRefreshApi(): Promise<{ access_token: string, session_uuid: string }> {
  return axios
    .post<BackendResponse<{ access_token: string, session_uuid: string }>>(
      `${BASE_URL}/v1/auth/refresh`,
      undefined,
      { withCredentials: true, timeout: env.VITE_SERVER_API_TIMEOUT },
    )
    .then((res) => {
      const data = res.data
      if (data.code !== SUCCESS_CODE || !data.data) {
        throw new Error(data.msg ?? data.message ?? 'Refresh failed')
      }
      return data.data
    })
}

// 刷新中时，将 401 的请求入队，刷新成功后统一重试
let isRefreshing = false
const refreshSubscribers: Array<{
  config: InternalAxiosRequestConfig
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}> = []

function isRefreshRequest(url: string | undefined): boolean {
  return typeof url === 'string' && url.includes('/auth/refresh')
}

function isCardListRequest(url: string | undefined): boolean {
  return typeof url === 'string' && url.includes('/v1/cards')
}

function isLoginRequest(url: string | undefined): boolean {
  return typeof url === 'string' && /\/auth\/login$/i.test(url.replace(/\?.*/, ''))
}

requestClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const authStore = useAuthStore(pinia)
  const token = authStore.accessToken
  if (token)
    config.headers.Authorization = `Bearer ${token}`
  // 与前端当前语言一致，后端据此返回 title_display 等国际化内容（如操作日志列表）
  const loc = i18n.global?.locale
  const locale = typeof loc === 'string' ? loc : (loc && 'value' in loc ? (loc as { value: string }).value : 'en')
  config.headers['Accept-Language'] = locale || 'en'
  return config
}, (error) => {
  return Promise.reject(error)
})

requestClient.interceptors.response.use(
  async (response) => {
    if (response.config.responseType === 'blob') {
      if (response.status >= 400) {
        try {
          const text = await (response.data as Blob).text()
          const json = JSON.parse(text) as { msg?: string, message?: string }
          const msg = json.msg ?? json.message ?? `请求失败 ${response.status}`
          toast.error(msg)
          return Promise.reject(new Error(msg))
        }
        catch {
          toast.error(`请求失败 ${response.status}`)
          return Promise.reject(new Error(String(response.status)))
        }
      }
      return response.data
    }
    const res = response.data as BackendResponse
    if (res.code !== SUCCESS_CODE) {
      const msg = res.msg ?? res.message ?? 'Request failed'
      const skipToast = (response.config as RequestConfigExtension).skipGlobalErrorToast
      if (!skipToast)
        toast.error(msg)
      return Promise.reject(new Error(msg))
    }
    return res.data
  },
  (error) => {
    const status = error.response?.status
    const msg = error.response?.data?.msg
      ?? error.response?.data?.message
      ?? error.message
      ?? 'Network error'
    const requestUrl = error.config?.url ?? ''

    if (status === 401) {
      if (isLoginRequest(requestUrl)) {
        toast.error(msg)
        return Promise.reject(error)
      }
      if (isCardListRequest(requestUrl)) {
        return Promise.reject(error)
      }
      if (isRefreshRequest(requestUrl)) {
        const authStore = useAuthStore(pinia)
        authStore.logout()
        toast.error('登录已过期，请重新登录')
        return Promise.reject(error)
      }
      if (!error.config) {
        const authStore = useAuthStore(pinia)
        authStore.logout()
        toast.error('登录已过期，请重新登录')
        return Promise.reject(error)
      }

      const authStore = useAuthStore(pinia)

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshSubscribers.push({ config: error.config, resolve, reject })
        })
      }

      isRefreshing = true
      return callRefreshApi()
        .then((data) => {
          authStore.setToken(data.access_token, data.session_uuid)
          isRefreshing = false
          const currentRetry = requestClient.request(error.config)
          refreshSubscribers.forEach(({ config, resolve, reject }) => {
            requestClient.request(config).then(resolve).catch(reject)
          })
          refreshSubscribers.length = 0
          return currentRetry
        })
        .catch((err) => {
          isRefreshing = false
          refreshSubscribers.forEach(({ reject }) => reject(err))
          refreshSubscribers.length = 0
          authStore.logout()
          toast.error('登录已过期，请重新登录')
          return Promise.reject(err)
        })
    }

    const skipToast = (error.config as RequestConfigExtension | undefined)?.skipGlobalErrorToast
    if (!skipToast) {
      const hasBackendMsg = error.response?.data?.msg ?? error.response?.data?.message
      const hint = status === 404 && !hasBackendMsg
        ? '接口 404，请确认 MC 后端已启动；若后端非 3000 端口，请在 .env 中设置 API_PROXY_TARGET'
        : msg
      toast.error(hint)
    }
    return Promise.reject(error)
  },
)

/** GET with query params; returns unwrapped data. config 可含 skipGlobalErrorToast 以禁止全局错误 toast */
export function get<T = unknown>(
  url: string,
  config?: { params?: Record<string, any> } & RequestConfigExtension,
) {
  return requestClient.get<any, T>(url, config)
}

/** POST; returns unwrapped data */
export function post<T = unknown>(url: string, data?: any, config?: any) {
  return requestClient.post<any, T>(url, data, config)
}

/** PUT; returns unwrapped data */
export function put<T = unknown>(url: string, data?: any, config?: any) {
  return requestClient.put<any, T>(url, data, config)
}

/** DELETE; returns unwrapped data */
export function del<T = unknown>(url: string, config?: { data?: any, params?: any }) {
  return requestClient.delete<any, T>(url, config)
}

/** Upload file (FormData); returns unwrapped data */
export function upload<T = unknown>(
  url: string,
  payload: { file: File },
  config?: { params?: Record<string, string>, timeout?: number },
) {
  const formData = new FormData()
  formData.append('file', payload.file)
  return requestClient.post<any, T>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...config,
  })
}

/** Download as blob (returns Blob directly) */
export function download(url: string, config?: { params?: Record<string, string>, timeout?: number }): Promise<Blob> {
  return requestClient.get(url, { ...config, responseType: 'blob' }) as Promise<Blob>
}

/** Axios instance with upload/download (attached below). */
export interface McRequestClient extends AxiosInstance {
  upload: typeof upload
  download: typeof download
}

// 供插件等使用：requestClient.upload / requestClient.download（与 axios 风格一致）
;(requestClient as McRequestClient).upload = upload
;(requestClient as McRequestClient).download = download
