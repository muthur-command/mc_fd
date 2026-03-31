import { useColorMode } from '@vueuse/core'
import { defineStore } from 'pinia'

import type { CaptchaResult, LoginParams } from '@/services/api/core/auth.api'
import type { MyUserInfo, UserPreference } from '@/services/api/core/user.api'

import {
  getAccessCodesApi,
  getCaptchaApi,
  loginApi,
  logoutApi,
} from '@/services/api/core/auth.api'
import { getUserInfoApi, getUserPreferencesApi, saveUserPreferencesApi, updateSysUserAvatarApi } from '@/services/api/core/user.api'
import { AVATAR_SEED_PREFIX } from '@/utils/avatar'

const DEFAULT_HOME = '/dashboard'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const sessionUuid = ref<string | null>(null)
  const captchaUuid = ref<string>('')
  const userInfo = ref<MyUserInfo | null>(null)
  const userPreferences = ref<UserPreference | null>(null)
  /** 本次登录是否已应用过偏好（避免重复应用） */
  const preferencesApplied = ref(false)
  const accessCodes = ref<string[]>([])
  const loginLoading = ref(false)

  const isLogin = computed(() => !!accessToken.value)

  /** 获取登录验证码 */
  async function captcha(): Promise<CaptchaResult> {
    const res = await getCaptchaApi()
    captchaUuid.value = res.uuid
    return res
  }

  /** 登录：只负责状态与接口，跳转由调用方或 getLoginRedirect() 处理 */
  async function authLogin(
    params: { username: string, password: string, captcha?: string, uuid?: string },
    onSuccess?: () => Promise<void> | void,
  ) {
    let info: MyUserInfo | null = null
    try {
      loginLoading.value = true
      const payload: LoginParams = {
        username: params.username,
        password: params.password,
        uuid: params.uuid ?? captchaUuid.value ?? '',
        captcha: params.captcha ?? '',
      }
      const { access_token, session_uuid } = await loginApi(payload)
      if (!access_token)
        return { userInfo: null }

      accessToken.value = access_token
      sessionUuid.value = session_uuid

      const [fetched, codes, prefs] = await Promise.all([
        fetchUserInfo(),
        getAccessCodesApi(),
        fetchPreferences(),
      ])
      info = fetched
      accessCodes.value = codes ?? []
      userPreferences.value = prefs
      preferencesApplied.value = false

      // 登录页配置的主题同步到后端并写入 store，登录后保持同一主题且数据库一致
      const mode = useColorMode({ attribute: 'class' })
      const currentTheme = mode.value
      if (currentTheme === 'light' || currentTheme === 'dark' || currentTheme === 'auto') {
        try {
          await saveUserPreferencesApi({ theme: currentTheme })
          if (userPreferences.value)
            userPreferences.value = { ...userPreferences.value, theme: currentTheme }
        }
        catch {
          // 忽略保存失败，本地主题已一致
        }
      }

      if (info && !info.avatar?.trim()) {
        const seed = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
        try {
          await updateSysUserAvatarApi({ avatar: `${AVATAR_SEED_PREFIX}${seed}` })
          info = await fetchUserInfo()
        }
        catch {
          // 忽略保存失败，用户仍可正常使用
        }
      }

      if (onSuccess)
        await onSuccess()
      return { userInfo: info }
    }
    finally {
      loginLoading.value = false
    }
  }

  /** 登录成功后应跳转的目标路径（供调用方使用） */
  function getLoginRedirect(currentPath: string): string {
    const redirect = currentPath?.replace(/^\//, '') || ''
    if (redirect && redirect !== 'auth/sign-in' && !redirect.startsWith('//'))
      return `/${redirect}`
    return DEFAULT_HOME
  }

  /** OAuth2 回调：从 URL 解析 token 并登录 */
  async function oauth2Login(): Promise<boolean> {
    const params = new URLSearchParams(window.location.search)
    const access_token = params.get('access_token')
    const session_uuid = params.get('session_uuid')
    if (access_token && session_uuid) {
      accessToken.value = access_token
      sessionUuid.value = session_uuid
      const [fetched] = await Promise.all([fetchUserInfo(), fetchPreferences()])
      if (fetched && !fetched.avatar?.trim()) {
        const seed = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
        try {
          await updateSysUserAvatarApi({ avatar: `${AVATAR_SEED_PREFIX}${seed}` })
          await fetchUserInfo()
        }
        catch {
          // ignore
        }
      }
      return true
    }
    return false
  }

  /** 退出登录：仅清空状态与调用接口，不负责跳转（由 useAuth().logout() 做跳转） */
  async function logout() {
    try {
      await logoutApi()
    }
    catch {
      // ignore
    }
    accessToken.value = null
    sessionUuid.value = null
    captchaUuid.value = ''
    userInfo.value = null
    userPreferences.value = null
    preferencesApplied.value = false
    accessCodes.value = []
  }

  /** 拉取用户信息 */
  async function fetchUserInfo(): Promise<MyUserInfo | null> {
    const info = await getUserInfoApi()
    userInfo.value = info
    return info
  }

  /** 拉取用户偏好并存入 store */
  async function fetchPreferences(): Promise<UserPreference | null> {
    try {
      const prefs = await getUserPreferencesApi()
      userPreferences.value = prefs
      preferencesApplied.value = false
      return prefs
    }
    catch {
      userPreferences.value = null
      return null
    }
  }

  /** 仅更新 Access Token 与 session_uuid（供 401 刷新成功后由 request 层调用，不清理用户信息） */
  function setToken(access_token: string | null, session_uuid: string | null) {
    accessToken.value = access_token
    sessionUuid.value = session_uuid
  }

  return {
    accessToken,
    sessionUuid,
    captchaUuid,
    userInfo,
    userPreferences,
    preferencesApplied,
    accessCodes,
    loginLoading,
    isLogin,
    captcha,
    authLogin,
    getLoginRedirect,
    oauth2Login,
    logout,
    fetchUserInfo,
    fetchPreferences,
    setToken,
  }
}, {
  // 持久化登录态，避免刷新或直接打开插件页时 token 丢失导致被要求重新登录
  persist: {
    key: 'auth',
    pick: ['accessToken', 'sessionUuid'],
  },
})
