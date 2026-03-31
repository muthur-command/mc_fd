import { storeToRefs } from 'pinia'

import { useAuthStore } from '@/stores/auth'

export function useAuth() {
  const router = useRouter()
  const authStore = useAuthStore()
  const { isLogin, loginLoading } = storeToRefs(authStore)

  async function logout() {
    await authStore.logout()
    const current = router.currentRoute.value.fullPath
    await router.replace({
      path: '/auth/sign-in',
      query: current && current !== '/auth/sign-in' ? { redirect: current } : {},
    })
  }

  function toHome() {
    router.push({ path: '/dashboard' })
  }

  async function login(params: { username: string, password: string, captcha?: string, uuid?: string }) {
    return authStore.authLogin(params)
  }

  return {
    isLogin,
    loading: loginLoading,
    logout,
    toHome,
    login,
  }
}
