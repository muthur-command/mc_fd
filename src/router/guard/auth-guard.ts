import type { Router } from 'vue-router'

import { storeToRefs } from 'pinia'

import pinia from '@/plugins/pinia/setup'
import { useAuthStore } from '@/stores/auth'

/** 无需登录即可访问的路径（白名单） */
const PUBLIC_PATHS = [
  '/',
  '/auth',
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/forgot-password',
  '/auth/code-login',
  '/auth/otp',
  '/auth/oauth2-callback',
  '/auth/sign-in-2',
]

function isPublicPath(path: string): boolean {
  if (PUBLIC_PATHS.some(p => path === p || (p !== '/' && path.startsWith(`${p}/`))))
    return true
  if (path.startsWith('/errors'))
    return true
  if (path.startsWith('/marketing'))
    return true
  return false
}

export function authGuard(router: Router) {
  router.beforeEach(async (to, _from) => {
    const authStore = useAuthStore(pinia)
    const { isLogin } = storeToRefs(authStore)

    // 白名单内的路径不校验登录
    if (isPublicPath(to.path))
      return

    // 已登录直接放行
    if (unref(isLogin))
      return

    // 等待一帧，让 pinia 持久化有机会从 sessionStorage 恢复后再判断，避免进插件页被误判为未登录
    await new Promise(resolve => setTimeout(resolve, 0))
    if (authStore.accessToken)
      return

    return {
      path: '/auth/sign-in',
      query: { redirect: to.fullPath },
    }
  })
}
