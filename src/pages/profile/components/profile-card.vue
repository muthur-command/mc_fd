<script setup lang="ts">
import { Calendar, Mail, Pencil, Phone, Shield } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import type { BadgeVariants } from '@/components/ui/badge'

/** 默认背景图 */
import profileBg from '@/assets/images/profile_bg.jpg'
import AvatarGenerated from '@/components/avatar-generated.vue'
import { badgeVariants } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  saveUserPreferencesApi,
  updateSysUserAvatarApi,
  updateSysUserNicknameApi,
} from '@/services/api/core/user.api'
import { useAuthStore } from '@/stores/auth'
import { getAvatarSeed, getAvatarUrl, isAvatarSeed } from '@/utils/avatar'

const { t } = useI18n()
const authStore = useAuthStore()
const { userInfo, userPreferences } = storeToRefs(authStore)

// 封面图：优先用偏好中的 profile_cover（后台路径），无则用默认
const coverImageUrl = computed(() => {
  const path = userPreferences.value?.profile_cover
  if (path && path.trim()) {
    const url = getAvatarUrl(path)
    if (url)
      return url
  }
  return profileBg
})

const roleVariantMap: Record<string, BadgeVariants['variant']> = {
  SuperAdmin: 'success',
  superadmin: 'success',
  Admin: 'info',
  admin: 'info',
  Development: 'warning',
  development: 'warning',
  User: 'info',
  user: 'info',
  Quality: 'inactive',
  quality: 'inactive',
}

const fallbackColorVariants: BadgeVariants['variant'][] = ['success', 'info', 'warning']

function getRoleBadgeVariant(roleName: string): BadgeVariants['variant'] {
  const raw = roleName?.trim() ?? ''
  if (!raw)
    return 'success'
  const exact = roleVariantMap[raw] ?? roleVariantMap[raw.toLowerCase()]
  if (exact)
    return exact
  const noSpace = raw.replace(/\s+/g, '')
  const noSpaceMatch = roleVariantMap[noSpace] ?? roleVariantMap[noSpace.toLowerCase()]
  if (noSpaceMatch)
    return noSpaceMatch
  let hash = 0
  for (let i = 0; i < raw.length; i++)
    hash = ((hash << 5) - hash) + raw.charCodeAt(i)
  const idx = Math.abs(hash) % fallbackColorVariants.length
  return fallbackColorVariants[idx]
}

const roles = computed(() => userInfo.value?.roles ?? [])
const avatarSrc = computed(() => getAvatarUrl(userInfo.value?.avatar))
const avatarSeed = computed(() => {
  const av = userInfo.value?.avatar
  if (isAvatarSeed(av))
    return getAvatarSeed(av) ?? 'default'
  return userInfo.value?.nickname || userInfo.value?.email || userInfo.value?.phone || 'user'
})

// 头像编辑（与 Edit User 相同布局与接口）
type AvatarMode = 'generated' | 'upload'
const avatarDialogOpen = ref(false)
const avatarMode = ref<AvatarMode>('generated')
const avatarUploadData = ref('')
const avatarFileInputRef = ref<HTMLInputElement | null>(null)
const avatarSaving = ref(false)
const avatarGeneratedRef = ref<InstanceType<typeof AvatarGenerated> | null>(null)
/** 生成头像 Tab 的 seed/name：与 Edit User 一致 */
const avatarInitialName = computed(() => {
  const av = userInfo.value?.avatar
  if (!av)
    return userInfo.value?.nickname || userInfo.value?.username || userInfo.value?.email || 'user'
  if (isAvatarSeed(av))
    return getAvatarSeed(av) ?? userInfo.value?.nickname ?? 'user'
  return ''
})
/** 预览放大弹窗 */
const avatarPreviewOpen = ref(false)
const avatarPreviewImageUrl = ref('')
const avatarPreviewIsSeed = ref(false)

function openAvatarDialog() {
  const av = userInfo.value?.avatar
  if (av && !isAvatarSeed(av)) {
    avatarMode.value = 'upload'
    avatarUploadData.value = av
  }
  else {
    avatarMode.value = 'generated'
    avatarUploadData.value = ''
  }
  avatarDialogOpen.value = true
}

function onAvatarFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !file.type.startsWith('image/'))
    return
  const reader = new FileReader()
  reader.onload = () => {
    avatarUploadData.value = reader.result as string
  }
  reader.readAsDataURL(file)
  input.value = ''
}

function triggerAvatarFileSelect() {
  avatarFileInputRef.value?.click()
}

/** 将 SVG 转为 PNG data URL（与 user-form-sys 一致） */
function svgToPngDataUrl(svgDataUrl: string, size = 360): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas 2d not available'))
          return
        }
        ctx.drawImage(img, 0, 0, size, size)
        resolve(canvas.toDataURL('image/png'))
      }
      catch (e) {
        reject(e)
      }
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = svgDataUrl
  })
}

/** 与 Edit User 的 getAvatarForSubmit 一致：上传 Tab 用当前数据，生成 Tab 用 SVG 转 PNG */
async function getAvatarForSubmit(): Promise<string | undefined> {
  if (avatarMode.value === 'upload') {
    return avatarUploadData.value || undefined
  }
  await nextTick()
  const comp = avatarGeneratedRef.value
  const svg = comp?.getSvgElement?.() ?? (comp?.$el as HTMLElement)?.querySelector?.('svg')
  if (!svg)
    return undefined
  const str = new XMLSerializer().serializeToString(svg)
  const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(str)))}`
  return svgToPngDataUrl(svgDataUrl)
}

function getGeneratedAvatarDataUrl(): string {
  const comp = avatarGeneratedRef.value
  const svg = comp?.getSvgElement?.()
  if (!svg)
    return ''
  const str = new XMLSerializer().serializeToString(svg)
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(str)))}`
}

function openGeneratedAvatarPreview() {
  const url = getGeneratedAvatarDataUrl()
  if (!url)
    return
  avatarPreviewIsSeed.value = false
  avatarPreviewImageUrl.value = url
  avatarPreviewOpen.value = true
}

function openUploadAvatarPreview() {
  if (!avatarUploadData.value)
    return
  if (isAvatarSeed(avatarUploadData.value)) {
    avatarPreviewIsSeed.value = true
    avatarPreviewImageUrl.value = getAvatarSeed(avatarUploadData.value) ?? userInfo.value?.nickname ?? 'user'
  }
  else {
    avatarPreviewIsSeed.value = false
    avatarPreviewImageUrl.value = getAvatarUrl(avatarUploadData.value) ?? avatarUploadData.value
  }
  avatarPreviewOpen.value = true
}

async function submitAvatar() {
  const value = await getAvatarForSubmit()
  if (!value)
    return
  avatarSaving.value = true
  try {
    const res = await updateSysUserAvatarApi({ avatar: value })
    if (res?.avatar != null && userInfo.value) {
      userInfo.value = { ...userInfo.value, avatar: res.avatar }
    }
    await authStore.fetchUserInfo()
    toast.success(t('profile.saveSuccess'))
    avatarDialogOpen.value = false
  }
  catch {
    toast.error(t('profile.saveFailed'))
  }
  finally {
    avatarSaving.value = false
  }
}

// 昵称编辑
const nicknameEditing = ref(false)
const nicknameDraft = ref('')

function startEditNickname() {
  nicknameEditing.value = true
  nicknameDraft.value = userInfo.value?.nickname ?? ''
  nextTick(() => {
    const input = document.querySelector<HTMLInputElement>('.profile-nickname-input')
    input?.focus()
  })
}

function cancelEditNickname() {
  nicknameEditing.value = false
  nicknameDraft.value = ''
}

async function saveNickname() {
  const val = nicknameDraft.value?.trim()
  if (val === (userInfo.value?.nickname ?? '')) {
    cancelEditNickname()
    return
  }
  if (!val) {
    cancelEditNickname()
    return
  }
  try {
    await updateSysUserNicknameApi({ nickname: val })
    await authStore.fetchUserInfo()
    toast.success(t('profile.saveSuccess'))
    nicknameEditing.value = false
    nicknameDraft.value = ''
  }
  catch {
    toast.error(t('profile.saveFailed'))
  }
}

// 封面编辑（存后台 sys_user_preference.profile_cover，与头像类似）
const coverDialogOpen = ref(false)
const coverUploadData = ref('')
const coverFileInputRef = ref<HTMLInputElement | null>(null)
const coverSaving = ref(false)

function openCoverDialog() {
  coverDialogOpen.value = true
  coverUploadData.value = ''
}

function onCoverFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !file.type.startsWith('image/'))
    return
  const reader = new FileReader()
  reader.onload = () => {
    coverUploadData.value = reader.result as string
  }
  reader.readAsDataURL(file)
  input.value = ''
}

function triggerCoverFileSelect() {
  coverFileInputRef.value?.click()
}

async function submitCover() {
  const value = coverUploadData.value?.trim()
  if (!value)
    return
  coverSaving.value = true
  try {
    await saveUserPreferencesApi({ profile_cover: value })
    await authStore.fetchPreferences()
    toast.success(t('profile.saveSuccess'))
    coverDialogOpen.value = false
  }
  catch {
    toast.error(t('profile.saveFailed'))
  }
  finally {
    coverSaving.value = false
  }
}

async function resetCoverToDefault() {
  coverSaving.value = true
  try {
    await saveUserPreferencesApi({ profile_cover: null })
    await authStore.fetchPreferences()
    toast.success(t('profile.saveSuccess'))
    coverDialogOpen.value = false
  }
  catch {
    toast.error(t('profile.saveFailed'))
  }
  finally {
    coverSaving.value = false
  }
}
</script>

<template>
  <div
    data-slot="card"
    class="bg-card text-card-foreground flex flex-col gap-0 rounded-xl border shadow-sm overflow-hidden relative"
  >
    <!-- 顶部横幅 + 编辑按钮 -->
    <div
      class="relative h-24 sm:h-28 rounded-t-xl overflow-hidden bg-muted"
    >
      <img
        :src="coverImageUrl"
        alt=""
        class="absolute inset-0 size-full object-cover"
      >
      <UiButton
        variant="secondary"
        size="icon"
        class="absolute top-3 right-3 z-10 size-8 rounded-full border border-border/80 bg-background/90 text-foreground shadow-sm hover:bg-background"
        :aria-label="t('profile.editCover')"
        @click="openCoverDialog"
      >
        <Pencil class="size-4" />
      </UiButton>
    </div>

    <!-- 头像 + 姓名 + 信息行（白底） -->
    <div class="flex flex-col items-center px-6 pb-6 pt-0">
      <UiButton
        variant="ghost"
        size="icon"
        class="-mt-12 size-20 shrink-0 rounded-full p-0 ring-2 ring-card hover:opacity-90"
        :aria-label="t('profile.editAvatar')"
        @click="openAvatarDialog"
      >
        <UiAvatar class="!size-20 shrink-0">
          <UiAvatarImage v-if="avatarSrc" :src="avatarSrc" :alt="userInfo?.nickname" class="object-cover" />
          <UiAvatarFallback v-else class="flex size-full items-center justify-center p-0">
            <AvatarGenerated :name="avatarSeed" :size="80" class="size-full max-w-full max-h-full" />
          </UiAvatarFallback>
        </UiAvatar>
      </UiButton>
      <div class="mt-3 flex min-h-[28px] items-center justify-center">
        <template v-if="nicknameEditing">
          <UiInput
            v-model="nicknameDraft"
            class="profile-nickname-input w-40 text-center text-xl font-semibold"
            :placeholder="t('profile.nicknamePlaceholder')"
            @keydown.enter="saveNickname"
            @keydown.escape="cancelEditNickname"
            @blur="saveNickname"
          />
        </template>
        <h5
          v-else
          class="cursor-pointer text-xl font-semibold text-foreground underline-offset-2 hover:underline"
          @click="startEditNickname"
        >
          {{ userInfo?.nickname || t('profile.defaultUser') }}
        </h5>
      </div>
      <div class="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <!-- 角色 -->
        <span v-if="roles.length" class="flex items-center gap-1.5">
          <Shield class="size-3.5 shrink-0" />
          <span class="flex flex-wrap gap-1">
            <span
              v-for="name in roles"
              :key="name"
              :class="cn(badgeVariants({ variant: getRoleBadgeVariant(name) }), 'text-xs')"
            >
              {{ name }}
            </span>
          </span>
        </span>
        <span v-else class="flex items-center gap-1.5">
          <Shield class="size-3.5 shrink-0" />
          —
        </span>
        <!-- 邮箱/手机 -->
        <span v-if="userInfo?.email" class="flex items-center gap-1.5">
          <Mail class="size-3.5 shrink-0" />
          <span>{{ userInfo.email }}</span>
        </span>
        <span v-else-if="userInfo?.phone" class="flex items-center gap-1.5">
          <Phone class="size-3.5 shrink-0" />
          {{ userInfo.phone }}
        </span>
        <!-- 上次登录 -->
        <span v-if="userInfo?.last_login_time" class="flex items-center gap-1.5">
          <Calendar class="size-3.5 shrink-0" />
          {{ userInfo.last_login_time }}
        </span>
      </div>
    </div>

    <!-- 更换头像弹窗（与 Edit User 相同布局与接口） -->
    <UiDialog v-model:open="avatarDialogOpen">
      <UiDialogContent class="sm:max-w-md">
        <UiDialogHeader>
          <UiDialogTitle>{{ t('profile.avatarDialogTitle') }}</UiDialogTitle>
        </UiDialogHeader>
        <div class="grid gap-2 py-2">
          <label class="text-sm font-medium">{{ t('user.form.avatar') }}</label>
          <UiTabs v-model="avatarMode" class="w-full">
            <UiTabsList class="grid w-full grid-cols-2">
              <UiTabsTrigger value="generated" class="text-xs sm:text-sm">
                {{ t('user.form.avatarGenerate') }}
              </UiTabsTrigger>
              <UiTabsTrigger value="upload" class="text-xs sm:text-sm">
                {{ t('user.form.avatarUpload') }}
              </UiTabsTrigger>
            </UiTabsList>
            <UiTabsContent value="generated" class="space-y-3 pt-2">
              <UiButton type="button" variant="outline" size="sm" class="w-full" @click="avatarGeneratedRef?.randomize?.()">
                {{ t('user.form.avatarRandom') }}
              </UiButton>
              <button
                type="button"
                class="flex items-center gap-2 text-left rounded-md hover:bg-muted/60 transition-colors p-1 -m-1"
                :disabled="!avatarGeneratedRef?.getSvgElement?.()"
                @click="openGeneratedAvatarPreview"
              >
                <span class="text-xs text-muted-foreground">{{ t('user.form.preview') }}</span>
                <div class="size-12 rounded-full overflow-hidden border shrink-0 min-h-12 flex items-center justify-center bg-muted/50">
                  <AvatarGenerated
                    ref="avatarGeneratedRef"
                    :name="avatarInitialName"
                    :size="48"
                    :use-true-random="true"
                  />
                </div>
              </button>
            </UiTabsContent>
            <UiTabsContent value="upload" class="space-y-3 pt-2">
              <input
                ref="avatarFileInputRef"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onAvatarFileChange"
              >
              <UiButton type="button" variant="outline" size="sm" class="w-full" @click="triggerAvatarFileSelect">
                {{ t('user.form.avatarUpload') }}
              </UiButton>
              <button
                v-if="avatarUploadData"
                type="button"
                class="flex items-center gap-2 text-left rounded-md hover:bg-muted/60 transition-colors p-1 -m-1"
                @click="openUploadAvatarPreview"
              >
                <span class="text-xs text-muted-foreground">{{ t('user.form.preview') }}</span>
                <div v-if="isAvatarSeed(avatarUploadData)" class="size-12 rounded-full overflow-hidden border shrink-0 flex items-center justify-center bg-muted/50">
                  <AvatarGenerated
                    :name="getAvatarSeed(avatarUploadData) ?? userInfo?.nickname ?? 'user'"
                    :size="48"
                  />
                </div>
                <img
                  v-else
                  :src="getAvatarUrl(avatarUploadData) ?? avatarUploadData"
                  alt=""
                  class="size-12 rounded-full object-cover border shrink-0"
                >
              </button>
            </UiTabsContent>
          </UiTabs>
        </div>
        <UiDialogFooter>
          <UiButton variant="outline" @click="avatarDialogOpen = false">
            {{ t('user.modal.cancel') }}
          </UiButton>
          <UiButton :disabled="avatarSaving" @click="submitAvatar">
            {{ avatarSaving ? t('user.modal.submitting') : t('user.modal.save') }}
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>

    <!-- 头像放大预览（与 Edit User 一致） -->
    <UiDialog v-model:open="avatarPreviewOpen">
      <UiDialogContent class="sm:max-w-[380px] p-6 flex flex-col items-center gap-4">
        <UiDialogHeader class="w-full text-center">
          <UiDialogTitle class="text-base">
            {{ t('user.form.preview') }}
          </UiDialogTitle>
        </UiDialogHeader>
        <div class="rounded-full overflow-hidden border-2 bg-muted/30 flex items-center justify-center w-64 h-64 min-w-64 min-h-64">
          <AvatarGenerated
            v-if="avatarPreviewIsSeed && avatarPreviewImageUrl"
            :name="avatarPreviewImageUrl"
            :size="256"
          />
          <img
            v-else-if="avatarPreviewImageUrl"
            :src="avatarPreviewImageUrl"
            alt=""
            class="w-full h-full object-cover"
          >
        </div>
        <UiButton type="button" variant="outline" size="sm" @click="avatarPreviewOpen = false">
          {{ t('user.modal.close') }}
        </UiButton>
      </UiDialogContent>
    </UiDialog>

    <!-- 更换封面弹窗 -->
    <UiDialog v-model:open="coverDialogOpen">
      <UiDialogContent class="sm:max-w-md">
        <UiDialogHeader>
          <UiDialogTitle>{{ t('profile.coverDialogTitle') }}</UiDialogTitle>
        </UiDialogHeader>
        <div class="space-y-4 py-4">
          <input
            ref="coverFileInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="onCoverFileChange"
          >
          <UiButton type="button" variant="outline" class="w-full" @click="triggerCoverFileSelect">
            {{ t('profile.uploadImage') }}
          </UiButton>
          <div v-if="coverUploadData" class="flex justify-center">
            <img
              :src="coverUploadData"
              alt=""
              class="max-h-32 w-full rounded-md object-cover object-center ring-2 ring-border"
            >
          </div>
        </div>
        <UiDialogFooter>
          <UiButton variant="outline" :disabled="coverSaving" @click="resetCoverToDefault">
            {{ t('profile.resetCover') }}
          </UiButton>
          <UiButton variant="outline" :disabled="coverSaving" @click="coverDialogOpen = false">
            {{ t('user.modal.cancel') }}
          </UiButton>
          <UiButton :disabled="coverSaving || !coverUploadData?.trim()" @click="submitCover">
            {{ coverSaving ? t('user.modal.submitting') : t('user.modal.save') }}
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>
