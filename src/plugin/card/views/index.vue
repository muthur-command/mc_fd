<script lang="ts" setup>
import { CalendarClock, Globe, MoreVertical, Search, Tag } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

/**
 * 卡片管理 - 插件视图（Store > Card）
 * 前端插件位置：src/plugin/card；后端插件：backend/plugin/card
 * 界面完全参考 Plugin 页面（/plugin）的布局与卡片样式，含「展示远程」开关与本地/远程标签
 */
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { getUserPreferencesApi, saveUserPreferencesApi } from '@/services/api/core/user.api'
import { useAuthStore } from '@/stores/auth'

import type { CardItem } from '../api'

import { getCardListApi, installCardPackageApi } from '../api'

const { t } = useI18n()
const authStore = useAuthStore()
const loading = ref(false)
const list = ref<CardItem[]>([])
const searchKeyword = ref('')
const showRemoteList = ref(false)
const cardTab = ref<'local' | 'remote'>('local')
const installDialogOpen = ref(false)
const packageFile = ref<File | null>(null)
const submitting = ref(false)

// 仅在确认已登录后再请求，避免 store 未从 sessionStorage 恢复时发请求导致 401 并被 logout
watch(() => authStore.isLogin, (loggedIn) => {
  if (loggedIn)
    fetchList()
}, { immediate: true })

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++)
    h = Math.imul(31, h) + s.charCodeAt(i)
  return Math.abs(h)
}

function getCardBackgroundStyle(id: string): Record<string, string> {
  const seed = hashString(id)
  const h1 = seed % 360
  const h2 = (seed * 7 + 137) % 360
  const s1 = 50 + (seed % 36)
  const s2 = 48 + ((seed >> 4) % 32)
  const l1 = 52 + (seed % 16)
  const l2 = 48 + ((seed >> 8) % 17)
  return {
    background: [
      `radial-gradient(ellipse 90% 70% at 15% 20%, hsl(${h1}, ${s1}%, ${l1}%), transparent 65%)`,
      `radial-gradient(ellipse 80% 60% at 85% 80%, hsl(${h2}, ${s2}%, ${l2}%), transparent 55%)`,
    ].join(', '),
  }
}

const TEST_CARD_COUNT = 50
const REMOTE_TEST_CARD_COUNT = 50

function createMockLocalCard(i: number): CardItem {
  const n = i + 1
  return {
    id: -n,
    title: t('cardManagement.testCardTitle', { n }),
    summary: t('cardManagement.testCardDesc'),
    description: t('cardManagement.testCardDesc'),
    card_type: '测试',
    created_time: '',
    updated_time: '',
  }
}

function createMockRemoteCard(i: number): CardItem {
  const n = i + 1
  return {
    id: 8000 + i,
    title: t('cardManagement.remoteCardTitle', { n }),
    summary: t('cardManagement.testCardDesc'),
    description: t('cardManagement.testCardDesc'),
    card_type: '远程',
    created_time: '',
    updated_time: '',
  }
}

const displayListForLocal = computed(() => {
  const real = list.value
  if (real.length >= TEST_CARD_COUNT)
    return real
  const mocks: CardItem[] = []
  for (let i = real.length; i < TEST_CARD_COUNT; i++)
    mocks.push(createMockLocalCard(i))
  return [...real, ...mocks]
})

const remoteDisplayListWithMocks = computed(() => {
  const mocks: CardItem[] = []
  for (let i = 0; i < REMOTE_TEST_CARD_COUNT; i++)
    mocks.push(createMockRemoteCard(i))
  return mocks
})

function filterCardsByKeyword(items: CardItem[], q: string): CardItem[] {
  if (!q)
    return items
  const lower = q.trim().toLowerCase()
  return items.filter((item) => {
    const title = (item.title ?? '').toLowerCase()
    const summary = (item.summary ?? '').toLowerCase()
    const desc = (item.description ?? '').toLowerCase()
    const type = (item.card_type ?? '').toLowerCase()
    return title.includes(lower) || summary.includes(lower) || desc.includes(lower) || type.includes(lower)
  })
}

const filteredDisplayList = computed(() =>
  filterCardsByKeyword(displayListForLocal.value, searchKeyword.value),
)

const filteredRemoteDisplayList = computed(() =>
  filterCardsByKeyword(remoteDisplayListWithMocks.value, searchKeyword.value),
)

async function fetchList() {
  if (!authStore.accessToken) {
    list.value = []
    return
  }
  loading.value = true
  try {
    list.value = await getCardListApi()
  }
  catch {
    list.value = []
  }
  finally {
    loading.value = false
  }
}

function formatTime(item: CardItem): string {
  return item.updated_time || item.created_time || t('cardManagement.noDescription')
}

async function loadShowRemotePreference() {
  try {
    const prefs = authStore.userPreferences ?? await getUserPreferencesApi()
    showRemoteList.value = prefs?.plugin_card_show_remote ?? false
  }
  catch {
    showRemoteList.value = false
  }
}

async function saveShowRemotePreference(value: boolean) {
  try {
    await saveUserPreferencesApi({ plugin_card_show_remote: value })
    if (authStore.userPreferences)
      authStore.userPreferences.plugin_card_show_remote = value
  }
  catch (e) {
    console.error(e)
    toast.error((e as { message?: string })?.message ?? '保存失败')
  }
}

function openInstallDialog() {
  packageFile.value = null
  installDialogOpen.value = true
}

function onPackageFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  packageFile.value = target.files?.[0] ?? null
}

async function submitInstall() {
  if (!packageFile.value) {
    toast.error(t('cardManagement.toastSelectPackage'))
    return
  }
  submitting.value = true
  try {
    await installCardPackageApi(packageFile.value)
    toast.success(t('cardManagement.toastInstallSuccess'))
    installDialogOpen.value = false
    await fetchList()
  }
  catch (e) {
    console.error(e)
    const msg = (e as { message?: string })?.message
    toast.error(msg ?? t('cardManagement.toastInstallFailed'))
  }
  finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadShowRemotePreference()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 与 Plugin 页一致：左侧标题 + 展示远程开关，右侧搜索 + 主按钮 -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold tracking-tight lg:text-2xl">
          {{ t('cardManagement.title') }}
        </h1>
        <div class="flex h-9 items-center gap-2">
          <Globe class="text-muted-foreground size-4 shrink-0" />
          <span class="text-muted-foreground leading-none whitespace-nowrap text-sm">{{ t('cardManagement.showRemoteList') }}</span>
          <Switch
            v-model:model-value="showRemoteList"
            class="shrink-0"
            @update:model-value="saveShowRemotePreference"
          />
        </div>
      </div>
      <div class="flex flex-1 items-center gap-2 sm:max-w-xs">
        <div class="relative flex-1">
          <Search class="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            v-model="searchKeyword"
            type="search"
            :placeholder="t('cardManagement.searchPlaceholder')"
            class="h-9 pl-9"
          />
        </div>
        <Button class="shrink-0" @click="openInstallDialog">
          {{ t('cardManagement.addCard') }}
        </Button>
      </div>
    </div>
    <p class="text-muted-foreground text-sm">
      {{ t('cardManagement.description') }}
    </p>

    <!-- 展示远程开启时：标签栏 + 本地/远程内容（与 Plugin 页一致） -->
    <template v-if="showRemoteList">
      <div class="w-full">
        <div class="bg-muted/50 inline-flex h-auto w-fit gap-0.5 rounded-lg p-0.5">
          <button
            type="button"
            class="rounded-md px-4 py-2 text-sm transition-colors" :class="[
              cardTab === 'local'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ]"
            @click="cardTab = 'local'"
          >
            {{ t('cardManagement.tabLocal') }}
          </button>
          <button
            type="button"
            class="rounded-md px-4 py-2 text-sm transition-colors" :class="[
              cardTab === 'remote'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ]"
            @click="cardTab = 'remote'"
          >
            {{ t('cardManagement.tabRemote') }}
          </button>
        </div>
        <div v-if="cardTab === 'local'" class="mt-4">
          <div v-if="loading" class="text-muted-foreground py-8 text-center">
            {{ t('cardManagement.loading') }}
          </div>
          <div
            v-else
            class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <Card
              v-for="item in filteredDisplayList"
              :key="item.id"
              class="relative flex h-full flex-col overflow-hidden pb-0"
            >
              <div
                class="absolute inset-0 z-0 rounded-xl"
                :style="getCardBackgroundStyle(String(item.id))"
              />
              <div class="absolute inset-0 z-[1] rounded-xl bg-card/90" />
              <div class="relative z-10 flex min-h-0 flex-1 flex-col gap-6">
                <CardHeader class="flex flex-row items-start justify-between gap-2 space-y-0">
                  <CardTitle class="text-[20px] leading-tight">
                    {{ item.title }}
                    <span
                      v-if="item.card_type"
                      class="ml-1 inline-flex items-center gap-1 text-muted-foreground text-xs font-normal"
                    >
                      <Tag class="size-3 shrink-0" />
                      {{ item.card_type }}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent class="flex-1">
                  <p class="text-muted-foreground line-clamp-3 text-sm">
                    {{ item.summary || item.description || t('cardManagement.noDescription') }}
                  </p>
                </CardContent>
                <CardFooter class="mt-auto flex items-center justify-between border-t py-2 !pt-2">
                  <span class="inline-flex items-center gap-1 text-muted-foreground text-sm font-normal">
                    <CalendarClock class="size-4 shrink-0" />
                    {{ formatTime(item) }}
                  </span>
                  <div class="flex items-center gap-2">
                    <UiDropdownMenu>
                      <UiDropdownMenuTrigger as-child>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          class="size-8 rounded-full"
                        >
                          <MoreVertical class="size-4" />
                          <span class="sr-only">{{ t('cardManagement.moreOptions') }}</span>
                        </Button>
                      </UiDropdownMenuTrigger>
                      <UiDropdownMenuContent align="end">
                        <UiDropdownMenuItem disabled>
                          {{ t('cardManagement.edit') }}
                        </UiDropdownMenuItem>
                        <UiDropdownMenuItem disabled>
                          {{ t('cardManagement.delete') }}
                        </UiDropdownMenuItem>
                      </UiDropdownMenuContent>
                    </UiDropdownMenu>
                  </div>
                </CardFooter>
              </div>
            </Card>
          </div>
        </div>
        <div v-else-if="cardTab === 'remote'" class="mt-4">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Card
              v-for="item in filteredRemoteDisplayList"
              :key="item.id"
              class="relative flex h-full flex-col overflow-hidden pb-0"
            >
              <div
                class="absolute inset-0 z-0 rounded-xl"
                :style="getCardBackgroundStyle(String(item.id))"
              />
              <div class="absolute inset-0 z-[1] rounded-xl bg-card/90" />
              <div class="relative z-10 flex min-h-0 flex-1 flex-col gap-6">
                <CardHeader class="flex flex-row items-start justify-between gap-2 space-y-0">
                  <CardTitle class="text-[20px] leading-tight">
                    {{ item.title }}
                    <span
                      v-if="item.card_type"
                      class="ml-1 inline-flex items-center gap-1 text-muted-foreground text-xs font-normal"
                    >
                      <Tag class="size-3 shrink-0" />
                      {{ item.card_type }}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent class="flex-1">
                  <p class="text-muted-foreground line-clamp-3 text-sm">
                    {{ item.summary || item.description || t('cardManagement.noDescription') }}
                  </p>
                </CardContent>
                <CardFooter class="mt-auto flex items-center justify-between border-t py-2 !pt-2">
                  <span class="inline-flex items-center gap-1 text-muted-foreground text-sm font-normal">
                    <CalendarClock class="size-4 shrink-0" />
                    {{ formatTime(item) }}
                  </span>
                  <div class="flex items-center gap-2">
                    <UiDropdownMenu>
                      <UiDropdownMenuTrigger as-child>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          class="size-8 rounded-full"
                        >
                          <MoreVertical class="size-4" />
                          <span class="sr-only">{{ t('cardManagement.moreOptions') }}</span>
                        </Button>
                      </UiDropdownMenuTrigger>
                      <UiDropdownMenuContent align="end">
                        <UiDropdownMenuItem disabled>
                          {{ t('cardManagement.edit') }}
                        </UiDropdownMenuItem>
                        <UiDropdownMenuItem disabled>
                          {{ t('cardManagement.delete') }}
                        </UiDropdownMenuItem>
                      </UiDropdownMenuContent>
                    </UiDropdownMenu>
                  </div>
                </CardFooter>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </template>

    <!-- 展示远程关闭时：仅本地列表（与 Plugin 页一致，含 50 张测试卡片） -->
    <template v-else>
      <div v-if="loading" class="text-muted-foreground py-8 text-center">
        {{ t('cardManagement.loading') }}
      </div>
      <div
        v-else
        class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <Card
          v-for="item in filteredDisplayList"
          :key="item.id"
          class="relative flex h-full flex-col overflow-hidden pb-0"
        >
          <div
            class="absolute inset-0 z-0 rounded-xl"
            :style="getCardBackgroundStyle(String(item.id))"
          />
          <div class="absolute inset-0 z-[1] rounded-xl bg-card/90" />
          <div class="relative z-10 flex min-h-0 flex-1 flex-col gap-6">
            <CardHeader class="flex flex-row items-start justify-between gap-2 space-y-0">
              <CardTitle class="text-[20px] leading-tight">
                {{ item.title }}
                <span
                  v-if="item.card_type"
                  class="ml-1 inline-flex items-center gap-1 text-muted-foreground text-xs font-normal"
                >
                  <Tag class="size-3 shrink-0" />
                  {{ item.card_type }}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent class="flex-1">
              <p class="text-muted-foreground line-clamp-3 text-sm">
                {{ item.summary || item.description || t('cardManagement.noDescription') }}
              </p>
            </CardContent>
            <CardFooter class="mt-auto flex items-center justify-between border-t py-2 !pt-2">
              <span class="inline-flex items-center gap-1 text-muted-foreground text-sm font-normal">
                <CalendarClock class="size-4 shrink-0" />
                {{ formatTime(item) }}
              </span>
              <div class="flex items-center gap-2">
                <UiDropdownMenu>
                  <UiDropdownMenuTrigger as-child>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      class="size-8 rounded-full"
                    >
                      <MoreVertical class="size-4" />
                      <span class="sr-only">{{ t('cardManagement.moreOptions') }}</span>
                    </Button>
                  </UiDropdownMenuTrigger>
                  <UiDropdownMenuContent align="end">
                    <UiDropdownMenuItem disabled>
                      {{ t('cardManagement.edit') }}
                    </UiDropdownMenuItem>
                    <UiDropdownMenuItem disabled>
                      {{ t('cardManagement.delete') }}
                    </UiDropdownMenuItem>
                  </UiDropdownMenuContent>
                </UiDropdownMenu>
              </div>
            </CardFooter>
          </div>
        </Card>
      </div>
    </template>

    <Dialog v-model:open="installDialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('cardManagement.installDialogTitle') }}</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid gap-2">
            <Label for="card-package-file">{{ t('cardManagement.packageFileLabel') }}</Label>
            <Input
              id="card-package-file"
              type="file"
              accept=".zip"
              @change="onPackageFileChange"
            />
            <p class="text-muted-foreground text-xs">
              {{ t('cardManagement.packageFileHint') }}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="installDialogOpen = false">
            {{ t('cardManagement.cancel') }}
          </Button>
          <Button :disabled="submitting" @click="submitInstall">
            {{ submitting ? t('cardManagement.installing') : t('cardManagement.install') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
