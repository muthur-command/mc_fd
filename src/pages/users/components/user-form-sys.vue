<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import type { SysUserResult } from '@/services/api/core/user.api'
import type { SysRoleResult } from '@/services/api/role.api'

import AvatarGenerated from '@/components/avatar-generated.vue'
import { createSysRoleApi, deleteSysRoleApi, getAllSysRoleApi } from '@/services/api/role.api'
import { getAvatarSeed, getAvatarUrl, isAvatarSeed } from '@/utils/avatar'

const props = defineProps<{ user?: SysUserResult | null }>()

const isEdit = computed(() => !!props.user)

const username = ref(props.user?.username ?? '')
const nickname = ref(props.user?.nickname ?? '')
const phone = ref(props.user?.phone ?? '')
const email = ref(props.user?.email ?? '')
const password = ref('')
const selectedRoleId = ref<string | undefined>(
  props.user?.roles?.[0] != null ? String(props.user.roles[0].id) : undefined,
)

type AvatarMode = 'generated' | 'upload'
/** seed:xxx 视为「生成头像」不切到上传；仅实际图片 URL 时显示上传 Tab */
const avatarMode = ref<AvatarMode>(
  props.user?.avatar && !isAvatarSeed(props.user.avatar) ? 'upload' : 'generated',
)
/** 生成头像 Tab 的 seed：无头像用用户名；seed 用种子；图片 URL 时在 upload Tab 不传 */
const avatarInitialName = computed(() => {
  if (!props.user)
    return 'default'
  const av = props.user.avatar
  if (!av)
    return props.user.username ?? props.user.nickname ?? 'user'
  if (isAvatarSeed(av))
    return getAvatarSeed(av) ?? props.user.username ?? 'user'
  return ''
})
const avatarUploadData = ref<string>(
  props.user?.avatar && !isAvatarSeed(props.user.avatar) ? props.user.avatar : '',
)
const fileInputRef = ref<HTMLInputElement | null>(null)
const avatarGeneratedRef = ref<InstanceType<typeof AvatarGenerated> | null>(null)

/** 预览放大弹窗：当前要显示的大图 URL（data URL 或后端 URL），或 seed 时的种子字符串 */
const avatarPreviewOpen = ref(false)
const avatarPreviewImageUrl = ref('')
/** 为 true 时预览弹窗用 AvatarGenerated 按 seed 显示（如 superadmin 的 seed:xxx） */
const avatarPreviewIsSeed = ref(false)

const roleOptions = ref<SysRoleResult[]>([])
const loadingRoles = ref(true)

const addRoleOpen = ref(false)
const newRoleName = ref('')
const newRoleRemark = ref('')
const creatingRole = ref(false)
const deletingRole = ref(false)
const { t } = useI18n()

async function fetchRoles() {
  try {
    loadingRoles.value = true
    roleOptions.value = await getAllSysRoleApi()
  }
  finally {
    loadingRoles.value = false
  }
}

onMounted(() => {
  fetchRoles()
})

async function openAddRole() {
  newRoleName.value = ''
  newRoleRemark.value = ''
  addRoleOpen.value = true
}

async function submitAddRole() {
  const name = newRoleName.value?.trim()
  if (!name) {
    toast.error(t('user.toast.fillRoleName'))
    return
  }
  creatingRole.value = true
  try {
    await createSysRoleApi({ name, status: 1, remark: newRoleRemark.value?.trim() || undefined })
    toast.success(t('user.toast.roleCreated'))
    addRoleOpen.value = false
    await fetchRoles()
    const added = roleOptions.value.find(r => r.name === name)
    if (added)
      selectedRoleId.value = String(added.id)
  }
  catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to create role')
  }
  finally {
    creatingRole.value = false
  }
}

async function removeSelectedRole() {
  const id = selectedRoleId.value
  if (!id)
    return
  deletingRole.value = true
  try {
    await deleteSysRoleApi([Number(id)])
    toast.success(t('user.toast.roleDeleted'))
    selectedRoleId.value = undefined
    await fetchRoles()
  }
  catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to delete role')
  }
  finally {
    deletingRole.value = false
  }
}

watch(() => props.user, (user) => {
  selectedRoleId.value = user?.roles?.[0] != null ? String(user.roles[0].id) : undefined
  if (user?.avatar && !isAvatarSeed(user.avatar)) {
    avatarUploadData.value = user.avatar
    avatarMode.value = 'upload'
  }
  else {
    avatarUploadData.value = ''
    avatarMode.value = 'generated'
  }
}, { immediate: true })

const formData = computed(() => ({
  username: username.value,
  nickname: nickname.value,
  phone: phone.value || undefined,
  email: email.value || undefined,
  ...(isEdit.value ? {} : { password: password.value }),
  roles: selectedRoleId.value ? [Number(selectedRoleId.value)] : [],
}))

/** 将 SVG data URL 转为 PNG data URL，供后端接受（后端只接受 jpg/png/gif/webp） */
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
    img.onerror = () => reject(new Error('SVG image load failed'))
    img.src = svgDataUrl
  })
}

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

/** 将当前生成的头像 SVG 转为 data URL，用于放大预览 */
function getGeneratedAvatarDataUrl(): string {
  const comp = avatarGeneratedRef.value
  const svg = comp?.getSvgElement?.()
  if (!svg)
    return ''
  const str = new XMLSerializer().serializeToString(svg)
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(str)))}`
}

/** 打开生成头像的放大预览 */
function openGeneratedAvatarPreview() {
  const url = getGeneratedAvatarDataUrl()
  if (!url)
    return
  avatarPreviewIsSeed.value = false
  avatarPreviewImageUrl.value = url
  avatarPreviewOpen.value = true
}

/** 打开上传头像的放大预览（支持图片 URL 或 seed:xxx） */
function openUploadAvatarPreview() {
  if (!avatarUploadData.value)
    return
  if (isAvatarSeed(avatarUploadData.value)) {
    avatarPreviewIsSeed.value = true
    avatarPreviewImageUrl.value = getAvatarSeed(avatarUploadData.value) ?? props.user?.username ?? 'user'
  }
  else {
    avatarPreviewIsSeed.value = false
    avatarPreviewImageUrl.value = getAvatarUrl(avatarUploadData.value) ?? avatarUploadData.value
  }
  avatarPreviewOpen.value = true
}

function onFileChange(e: Event) {
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

function triggerFileSelect() {
  fileInputRef.value?.click()
}

defineExpose({ formData, getAvatarForSubmit })
</script>

<template>
  <div class="max-h-[500px] overflow-y-auto">
    <div class="grid gap-4 py-2 px-2">
      <div class="grid gap-2">
        <label class="text-sm font-medium">{{ $t('user.form.username') }}</label>
        <UiInput v-model="username" :placeholder="$t('user.form.username')" :disabled="isEdit" />
      </div>
      <div class="grid gap-2">
        <label class="text-sm font-medium">{{ $t('user.form.nickname') }}</label>
        <UiInput v-model="nickname" :placeholder="$t('user.form.nickname')" />
      </div>
      <div v-if="!isEdit" class="grid gap-2">
        <label class="text-sm font-medium">{{ $t('user.form.password') }}</label>
        <UiInput v-model="password" type="password" :placeholder="$t('user.form.password')" autocomplete="new-password" />
      </div>
      <div class="grid gap-2">
        <label class="text-sm font-medium">{{ $t('user.form.avatar') }}</label>
        <UiTabs v-model="avatarMode" class="w-full">
          <UiTabsList class="grid w-full grid-cols-2">
            <UiTabsTrigger value="generated" class="text-xs sm:text-sm">
              {{ $t('user.form.avatarGenerate') }}
            </UiTabsTrigger>
            <UiTabsTrigger value="upload" class="text-xs sm:text-sm">
              {{ $t('user.form.avatarUpload') }}
            </UiTabsTrigger>
          </UiTabsList>
          <UiTabsContent value="generated" class="space-y-3 pt-2">
            <UiButton type="button" variant="outline" size="sm" class="w-full" @click="avatarGeneratedRef?.randomize?.()">
              {{ $t('user.form.avatarRandom') }}
            </UiButton>
            <button
              type="button"
              class="flex items-center gap-2 text-left rounded-md hover:bg-muted/60 transition-colors p-1 -m-1"
              :disabled="!avatarGeneratedRef?.getSvgElement?.()"
              @click="openGeneratedAvatarPreview"
            >
              <span class="text-xs text-muted-foreground">{{ $t('user.form.preview') }}</span>
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
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onFileChange"
            >
            <UiButton type="button" variant="outline" size="sm" class="w-full" @click="triggerFileSelect">
              {{ $t('user.form.avatarUpload') }}
            </UiButton>
            <button
              v-if="avatarUploadData"
              type="button"
              class="flex items-center gap-2 text-left rounded-md hover:bg-muted/60 transition-colors p-1 -m-1"
              @click="openUploadAvatarPreview"
            >
              <span class="text-xs text-muted-foreground">{{ $t('user.form.preview') }}</span>
              <!-- seed:xxx 用组件生成；图片 URL 用 img -->
              <div v-if="isAvatarSeed(avatarUploadData)" class="size-12 rounded-full overflow-hidden border shrink-0 flex items-center justify-center bg-muted/50">
                <AvatarGenerated
                  :name="getAvatarSeed(avatarUploadData) ?? props.user?.username ?? 'user'"
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
      <div class="grid gap-2">
        <label class="text-sm font-medium">{{ $t('user.form.phone') }}</label>
        <UiInput v-model="phone" :placeholder="$t('user.form.optional')" />
      </div>
      <div class="grid gap-2">
        <label class="text-sm font-medium">{{ $t('user.form.email') }}</label>
        <UiInput v-model="email" :placeholder="$t('user.form.optional')" />
      </div>
      <div class="grid gap-2">
        <label class="text-sm font-medium">{{ $t('user.form.role') }}</label>
        <div v-if="loadingRoles" class="text-sm text-muted-foreground">
          {{ $t('user.form.loading') }}
        </div>
        <div v-else class="flex gap-2">
          <UiSelect v-model="selectedRoleId" class="min-w-0 flex-1">
            <UiSelectTrigger :aria-label="$t('user.form.role')">
              <UiSelectValue :placeholder="$t('user.form.role')" />
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectItem
                v-for="r in roleOptions"
                :key="r.id"
                :value="String(r.id)"
              >
                {{ r.name }}
              </UiSelectItem>
            </UiSelectContent>
          </UiSelect>
          <UiButton type="button" variant="outline" size="default" class="shrink-0" @click="openAddRole">
            {{ $t('user.form.addRole') }}
          </UiButton>
          <UiButton
            type="button"
            variant="outline"
            size="default"
            class="shrink-0"
            :disabled="!selectedRoleId || deletingRole"
            @click="removeSelectedRole"
          >
            {{ deletingRole ? '…' : $t('user.form.removeRole') }}
          </UiButton>
        </div>
      </div>

      <UiDialog v-model:open="avatarPreviewOpen">
        <UiDialogContent class="sm:max-w-[380px] p-6 flex flex-col items-center gap-4">
          <UiDialogHeader class="w-full text-center">
            <UiDialogTitle class="text-base">
              {{ $t('user.form.preview') }}
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
            {{ $t('user.modal.close') }}
          </UiButton>
        </UiDialogContent>
      </UiDialog>
      <UiDialog v-model:open="addRoleOpen">
        <UiDialogContent class="sm:max-w-[360px]">
          <UiDialogHeader>
            <UiDialogTitle>{{ $t('user.form.addRole') }}</UiDialogTitle>
          </UiDialogHeader>
          <form class="grid gap-4 py-2" @submit.prevent="submitAddRole">
            <div class="grid gap-2">
              <label class="text-sm font-medium">{{ $t('user.form.newRoleName') }}</label>
              <UiInput
                v-model="newRoleName"
                :placeholder="$t('user.form.newRolePlaceholder')"
                autofocus
              />
            </div>
            <div class="grid gap-2">
              <label class="text-sm font-medium">{{ $t('user.form.roleRemark') }}</label>
              <UiInput
                v-model="newRoleRemark"
                :placeholder="$t('user.form.optional')"
              />
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <UiButton type="button" variant="outline" @click="addRoleOpen = false">
                {{ $t('user.modal.cancel') }}
              </UiButton>
              <UiButton type="submit" :disabled="creatingRole">
                {{ creatingRole ? '…' : $t('user.form.createRole') }}
              </UiButton>
            </div>
          </form>
        </UiDialogContent>
      </UiDialog>
    </div>
  </div>
</template>
