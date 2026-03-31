<script lang="ts" setup>
import { AlertTriangle, Download, Globe, Lock, MoreVertical, Plus, Search, Tag, Trash2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import type { PluginResult, RemotePluginItem } from '@/services/api/plugin.api'

import defaultAuthorAvatar from '@/assets/avatar.png'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
/**
 * 插件管理（路由 /plugin）- 安装/卸载/启用/打包、远程列表、设置
 * 原位于 pages/plugin/system/index.vue，已迁移至此
 */
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { useAppsSidebar } from '@/composables/use-apps-sidebar'
import { getUserPreferencesApi, saveUserPreferencesApi } from '@/services/api/core/user.api'
import {
  downloadPluginApi,
  getPluginChangedApi,
  getPluginListApi,
  getRemoteListUrlApi,
  getRemoteListUrlsApi,
  getRemotePluginListApi,
  installGitPluginApi,
  installZipPluginApi,
  setRemoteListUrlApi,
  setRemoteListUrlsApi,
  uninstallPluginApi,
  updatePluginStatus,
} from '@/services/api/plugin.api'
import { useAuthStore } from '@/stores/auth'

const { t, te } = useI18n()
const pluginAvatarMap: Record<string, string> = {}
const pluginAvatarModules = import.meta.glob<{ default: string }>('/src/plugin/*/assets/avatar.png', { eager: true, query: '?url' })
for (const [path, mod] of Object.entries(pluginAvatarModules)) {
  const match = path.match(/\/plugin\/([^/]+)\/assets\/avatar\.png$/)
  if (match)
    pluginAvatarMap[match[1]] = mod.default
}

const pluginBackgroundMap: Record<string, string> = {}
const pluginBackgroundModules = import.meta.glob<{ default: string }>('/src/plugin/*/assets/background.jpg', { eager: true, query: '?url' })
for (const [path, mod] of Object.entries(pluginBackgroundModules)) {
  const match = path.match(/\/plugin\/([^/]+)\/assets\/background\.jpg$/)
  if (match)
    pluginBackgroundMap[match[1]] = mod.default
}

function getAuthorAvatarUrl(pluginName: string): string {
  return pluginAvatarMap[pluginName] ?? defaultAuthorAvatar
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++)
    h = Math.imul(31, h) + s.charCodeAt(i)
  return Math.abs(h)
}

function getCardBackgroundStyle(pluginName: string): Record<string, string> {
  const imageUrl = pluginBackgroundMap[pluginName]
  if (imageUrl) {
    return {
      backgroundImage: `url(${imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  const seed = hashString(pluginName)
  const h1 = (seed % 360)
  const h2 = (seed * 7 + 137) % 360
  const h3 = (seed * 13 + 241) % 360
  const s1 = 50 + (seed % 36)
  const s2 = 48 + ((seed >> 4) % 32)
  const s3 = 45 + ((seed >> 8) % 30)
  const l1 = 52 + (seed % 16)
  const l2 = 48 + ((seed >> 8) % 17)
  const l3 = 55 + ((seed >> 12) % 14)
  return {
    background: [
      `radial-gradient(ellipse 90% 70% at 15% 20%, hsl(${h1}, ${s1}%, ${l1}%), transparent 65%)`,
      `radial-gradient(ellipse 80% 60% at 85% 80%, hsl(${h2}, ${s2}%, ${l2}%), transparent 60%)`,
      `radial-gradient(ellipse 70% 80% at 50% 50%, hsl(${h3}, ${s3}%, ${l3}%), transparent 55%)`,
    ].join(', '),
  }
}

function getPluginText(pluginName: string, field: 'summary' | 'description', fallback: string): string {
  const pluginMatch = pluginName.match(/^__test__plugin__(\d+)$/)
  const remoteMatch = pluginName.match(/^__test__remote__(\d+)$/)
  const match = pluginMatch ?? remoteMatch
  if (match) {
    const n = Number.parseInt(match[1], 10) + 1
    return field === 'summary'
      ? t('pluginSystem.testPluginTitle', { n })
      : t('pluginSystem.testPluginDesc')
  }
  const key = `pluginManage.plugins.${pluginName}.${field}`
  return te(key) ? t(key) : fallback
}
const list = ref<PluginResult[]>([])
const pluginChanged = ref(false)
const loading = ref(false)
const installOpen = ref(false)
const installType = ref<'zip' | 'git'>('zip')
const zipFile = ref<File | null>(null)
const repoUrl = ref('')
const submitting = ref(false)
const authStore = useAuthStore()
const { refreshAppsFromPlugins } = useAppsSidebar()

const confirmOpen = ref(false)
const confirmType = ref<'uninstall' | 'download' | null>(null)
const confirmName = ref('')

async function fetchList() {
  loading.value = true
  try {
    list.value = await getPluginListApi()
  }
  catch (e) {
    console.error(e)
  }
  finally {
    loading.value = false
  }
}

async function fetchChanged() {
  try {
    pluginChanged.value = await getPluginChangedApi()
  }
  catch {
    pluginChanged.value = false
  }
}

function openInstall() {
  installType.value = 'zip'
  zipFile.value = null
  repoUrl.value = ''
  installOpen.value = true
}

function onZipChange(e: Event) {
  const target = e.target as HTMLInputElement
  zipFile.value = target.files?.[0] ?? null
}

async function submitInstall() {
  if (installType.value === 'zip') {
    if (!zipFile.value) {
      toast.error(t('pluginSystem.toast.selectZip'))
      return
    }
    submitting.value = true
    try {
      await installZipPluginApi(zipFile.value)
      toast.success(t('pluginSystem.toast.installSuccess'))
      installOpen.value = false
      await fetchList()
      await fetchChanged()
    }
    catch (e) {
      console.error(e)
      const msg = (e as { message?: string })?.message
      const backendKey = msg?.startsWith('error.') ? msg.replace('error.', '') : null
      toast.error(backendKey ? t(`pluginSystem.errorBackend.${backendKey}`) : msg ?? t('pluginSystem.toast.installFailed'))
    }
    finally {
      submitting.value = false
    }
  }
  else {
    const url = repoUrl.value.trim()
    if (!url) {
      toast.error(t('pluginSystem.toast.enterGitUrl'))
      return
    }
    submitting.value = true
    try {
      await installGitPluginApi(url)
      toast.success(t('pluginSystem.toast.installSuccess'))
      installOpen.value = false
      await fetchList()
      await fetchChanged()
    }
    catch (e) {
      console.error(e)
      const msg = (e as { message?: string })?.message
      const backendKey = msg?.startsWith('error.') ? msg.replace('error.', '') : null
      toast.error(backendKey ? t(`pluginSystem.errorBackend.${backendKey}`) : msg ?? t('pluginSystem.toast.installFailed'))
    }
    finally {
      submitting.value = false
    }
  }
}

function translateBackendError(msg: string | undefined, fallback: string) {
  if (!msg)
    return fallback
  const backendKey = msg.startsWith('error.') ? msg.replace('error.', '') : null
  return backendKey ? t(`pluginSystem.errorBackend.${backendKey}`) : msg
}

async function setPluginEnable(pluginName: string, checked: boolean) {
  const item = list.value.find(i => i.plugin.name === pluginName)
  if (!item)
    return
  const previous = item.plugin.enable
  const next = checked ? '1' : '0'
  item.plugin.enable = next
  try {
    await updatePluginStatus(pluginName)
    toast.success(t('pluginSystem.toast.operationSuccess'))
    await fetchChanged()
    // 同步侧栏：仅当插件被启用时在侧栏显示，禁用时隐藏
    await refreshAppsFromPlugins()
  }
  catch (e) {
    console.error(e)
    item.plugin.enable = previous
    toast.error(t('pluginSystem.toast.enableDisableFailed'))
  }
}

function askUninstall(name: string) {
  confirmName.value = name
  confirmType.value = 'uninstall'
  confirmOpen.value = true
}

function askDownload(name: string) {
  confirmName.value = name
  confirmType.value = 'download'
  confirmOpen.value = true
}

async function runConfirm() {
  if (!confirmType.value || !confirmName.value)
    return
  const name = confirmName.value
  const type = confirmType.value
  confirmOpen.value = false
  confirmType.value = null
  confirmName.value = ''

  if (type === 'uninstall') {
    try {
      await uninstallPluginApi(name)
      pluginChanged.value = false
      toast.success(t('pluginSystem.toast.uninstallSuccess'))
      await fetchList()
    }
    catch (e) {
      console.error(e)
      const msg = (e as { message?: string })?.message
      toast.error(translateBackendError(msg, t('pluginSystem.toast.uninstallFailed')))
    }
  }
  else if (type === 'download') {
    try {
      const blob = await downloadPluginApi(name)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${name}.zip`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 200)
      toast.success(t('pluginSystem.toast.downloadStarted'))
    }
    catch (e) {
      console.error(e)
      const msg = (e as { message?: string })?.message
      toast.error(translateBackendError(msg, t('pluginSystem.toast.downloadFailed')))
    }
  }
}

const TEST_CARD_COUNT = 100

const displayList = computed(() => {
  const real = list.value
  if (real.length >= TEST_CARD_COUNT)
    return real
  const mocks: PluginResult[] = []
  for (let i = real.length; i < TEST_CARD_COUNT; i++) {
    mocks.push({
      plugin: {
        name: `__test__plugin__${i}`,
        summary: '',
        author: 'test',
        description: '',
        version: '0.0.0',
        enable: '1',
      },
    })
  }
  return [...real, ...mocks]
})

const searchKeyword = ref('')

const showRemoteList = ref(false)
const pluginTab = ref<'installed' | 'remote' | 'settings'>('installed')
const remoteList = ref<RemotePluginItem[]>([])
const remoteListLoading = ref(false)

function normalizeRemoteItem(item: RemotePluginItem): PluginResult {
  if (item.plugin)
    return item as PluginResult
  return {
    plugin: {
      name: (item.name as string) ?? '',
      summary: (item.summary as string) ?? '',
      author: item.author as string | undefined,
      description: item.description as string | undefined,
      version: (item.version as string) ?? '',
      enable: '0',
    },
  }
}

async function fetchRemoteList() {
  remoteListLoading.value = true
  try {
    remoteList.value = await getRemotePluginListApi()
  }
  catch (e) {
    console.error(e)
    remoteList.value = []
    toast.error(t('pluginSystem.toast.remoteFetchFailed'))
  }
  finally {
    remoteListLoading.value = false
  }
}

const remoteDisplayList = computed(() =>
  remoteList.value.map(normalizeRemoteItem),
)

const REMOTE_TEST_CARD_COUNT = 50

const remoteDisplayListWithMocks = computed(() => {
  const real = remoteDisplayList.value
  if (real.length >= REMOTE_TEST_CARD_COUNT)
    return real
  const mocks: PluginResult[] = []
  for (let i = real.length; i < REMOTE_TEST_CARD_COUNT; i++) {
    mocks.push({
      plugin: {
        name: `__test__remote__${i}`,
        summary: '',
        author: 'test',
        description: '',
        version: '0.0.0',
        enable: '0',
      },
    })
  }
  return [...real, ...mocks]
})

function isMockRemotePlugin(name: string) {
  return name.startsWith('__test__remote__')
}

function getRemoteRepoUrl(pluginName: string): string | undefined {
  const item = remoteList.value.find((r) => {
    const n = r.plugin?.name ?? (r.name as string)
    return n === pluginName
  })
  return item && typeof item.repo_url === 'string' ? item.repo_url : undefined
}

const installingRemote = ref(false)

async function installRemotePlugin(info: PluginResult) {
  const name = info.plugin.name
  if (isMockRemotePlugin(name))
    return
  const repoUrlVal = getRemoteRepoUrl(name)
  if (repoUrlVal) {
    installingRemote.value = true
    try {
      await installGitPluginApi(repoUrlVal)
      toast.success(t('pluginSystem.toast.installSuccess'))
      await fetchList()
      await fetchChanged()
    }
    catch (e) {
      console.error(e)
      const msg = (e as { message?: string })?.message
      const backendKey = msg?.startsWith('error.') ? msg.replace('error.', '') : null
      toast.error(backendKey ? t(`pluginSystem.errorBackend.${backendKey}`) : msg ?? t('pluginSystem.toast.installFailed'))
    }
    finally {
      installingRemote.value = false
    }
  }
  else {
    installOpen.value = true
    installType.value = 'git'
    repoUrl.value = ''
  }
}

const filteredDisplayList = computed(() => {
  const q = searchKeyword.value.trim().toLowerCase()
  if (!q)
    return displayList.value
  return displayList.value.filter((info) => {
    const name = info.plugin.name.toLowerCase()
    const summary = getPluginText(info.plugin.name, 'summary', info.plugin.summary).toLowerCase()
    const desc = getPluginText(info.plugin.name, 'description', info.plugin.description ?? '').toLowerCase()
    const author = (info.plugin.author ?? '').toLowerCase()
    return name.includes(q) || summary.includes(q) || desc.includes(q) || author.includes(q)
  })
})

function isMockPlugin(name: string) {
  return name.startsWith('__test__')
}

/** 插件标签中是否包含 internal（不区分大小写） */
function hasInternalTag(plugin: { tags?: string[] }): boolean {
  const tags = plugin?.tags ?? []
  return tags.some(t => t?.toLowerCase() === 'internal')
}

const remoteUrlsSettings = ref<string[]>([''])
const settingsUrlsLoading = ref(false)
const settingsUrlsSaving = ref(false)

async function fetchRemoteUrlsSettings() {
  settingsUrlsLoading.value = true
  try {
    const urls = await getRemoteListUrlsApi()
    remoteUrlsSettings.value = urls.length > 0 ? [...urls] : ['']
  }
  catch {
    try {
      const single = await getRemoteListUrlApi()
      remoteUrlsSettings.value = single ? [single] : ['']
    }
    catch {
      remoteUrlsSettings.value = ['']
    }
  }
  finally {
    settingsUrlsLoading.value = false
  }
}

function addRemoteUrlRow() {
  remoteUrlsSettings.value = [...remoteUrlsSettings.value, '']
}

function removeRemoteUrlRow(index: number) {
  remoteUrlsSettings.value = remoteUrlsSettings.value.filter((_, i) => i !== index)
  if (remoteUrlsSettings.value.length === 0)
    remoteUrlsSettings.value = ['']
}

async function saveRemoteUrlsSettings() {
  const urls = remoteUrlsSettings.value.map(u => u.trim()).filter(Boolean)
  settingsUrlsSaving.value = true
  try {
    await setRemoteListUrlsApi(urls)
    toast.success(t('pluginSystem.toast.settingsSaved'))
  }
  catch (e) {
    if (urls.length === 1) {
      try {
        await setRemoteListUrlApi(urls[0])
        toast.success(t('pluginSystem.toast.settingsSaved'))
      }
      catch (e2) {
        console.error(e2)
        toast.error((e2 as { message?: string })?.message ?? t('pluginSystem.toast.settingsSaveFailed'))
      }
    }
    else {
      console.error(e)
      toast.error((e as { message?: string })?.message ?? t('pluginSystem.toast.settingsSaveFailed'))
    }
  }
  finally {
    settingsUrlsSaving.value = false
  }
}

watch(pluginTab, (tab) => {
  if (tab === 'remote' && remoteList.value.length === 0 && !remoteListLoading.value)
    fetchRemoteList()
  if (tab === 'settings' && !settingsUrlsLoading.value)
    fetchRemoteUrlsSettings()
})

async function loadShowRemotePreference() {
  try {
    const prefs = authStore.userPreferences ?? await getUserPreferencesApi()
    showRemoteList.value = prefs?.plugin_system_show_remote ?? false
  }
  catch {
    showRemoteList.value = false
  }
}

async function saveShowRemotePreference(value: boolean) {
  try {
    await saveUserPreferencesApi({ plugin_system_show_remote: value })
    if (authStore.userPreferences)
      authStore.userPreferences.plugin_system_show_remote = value
  }
  catch (e) {
    console.error(e)
    toast.error((e as { message?: string })?.message ?? '保存失败')
  }
}

onMounted(() => {
  fetchList()
  fetchChanged()
  loadShowRemotePreference()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold tracking-tight lg:text-2xl">
          {{ t('pluginSystem.title') }}
        </h1>
        <div class="flex h-9 items-center gap-2">
          <Globe class="text-muted-foreground size-4 shrink-0" />
          <span class="text-muted-foreground leading-none whitespace-nowrap text-sm">{{ t('pluginSystem.showRemoteList') }}</span>
          <Switch
            v-model:model-value="showRemoteList"
            class="shrink-0"
            @update:model-value="saveShowRemotePreference"
          />
        </div>
      </div>
      <div class="flex flex-1 items-center gap-2 sm:max-w-sm">
        <div class="relative flex-1">
          <Search class="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            v-model="searchKeyword"
            type="search"
            :placeholder="t('pluginSystem.searchPlaceholder')"
            class="h-9 pl-9"
          />
        </div>
        <InspiraUiRainbowButton
          class="w-[120px] min-w-[120px] shrink-0 !h-9 justify-center gap-1.5 !px-2 text-sm"
          @click="openInstall"
        >
          <Plus class="size-3.5 shrink-0" aria-hidden="true" />
          <span class="min-w-0 truncate">{{ t('pluginSystem.installPlugin') }}</span>
        </InspiraUiRainbowButton>
      </div>
    </div>
    <p class="text-muted-foreground text-sm">
      {{ t('pluginSystem.description') }}
    </p>

    <template v-if="showRemoteList">
      <div class="w-full">
        <div class="bg-muted/50 inline-flex h-auto w-fit gap-0.5 rounded-lg p-0.5">
          <button
            type="button"
            class="rounded-md px-4 py-2 text-sm transition-colors" :class="[
              pluginTab === 'installed'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ]"
            @click="pluginTab = 'installed'"
          >
            {{ t('pluginSystem.tabInstalled') }}
          </button>
          <button
            type="button"
            class="rounded-md px-4 py-2 text-sm transition-colors" :class="[
              pluginTab === 'remote'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ]"
            @click="pluginTab = 'remote'"
          >
            {{ t('pluginSystem.tabRemote') }}
          </button>
          <button
            type="button"
            class="rounded-md px-4 py-2 text-sm transition-colors" :class="[
              pluginTab === 'settings'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ]"
            @click="pluginTab = 'settings'"
          >
            {{ t('pluginSystem.tabSettings') }}
          </button>
        </div>
        <div v-if="pluginTab === 'installed'" class="mt-4">
          <div v-if="loading" class="text-muted-foreground py-8 text-center">
            {{ t('pluginSystem.loading') }}
          </div>
          <div
            v-else
            class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <Card
              v-for="info in filteredDisplayList"
              :key="info.plugin.name"
              class="relative flex h-full flex-col overflow-hidden pb-0"
            >
              <div
                class="absolute inset-0 z-0 rounded-xl"
                :style="getCardBackgroundStyle(info.plugin.name)"
              />
              <div class="absolute inset-0 z-[1] rounded-xl bg-card/90" />
              <div class="relative z-10 flex min-h-0 flex-1 flex-col gap-6">
                <CardHeader class="flex flex-row items-start justify-between gap-2 space-y-0">
                  <CardTitle class="text-[20px] leading-tight">
                    {{ getPluginText(info.plugin.name, 'summary', info.plugin.summary) }}
                    <span class="ml-1 inline-flex items-center gap-1 text-muted-foreground text-xs font-normal">
                      <Tag class="size-3 shrink-0" />
                      {{ info.plugin.version || t('pluginSystem.noVersion') }}
                    </span>
                    <span
                      v-if="hasInternalTag(info.plugin)"
                      class="ml-1 inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs font-medium"
                      :title="t('pluginSystem.internalTag')"
                    >
                      <Lock class="size-3 shrink-0" />
                      {{ t('pluginSystem.internalTag') }}
                    </span>
                  </CardTitle>
                  <Switch
                    :model-value="info.plugin.enable === '1'"
                    :disabled="isMockPlugin(info.plugin.name) || hasInternalTag(info.plugin)"
                    @update:model-value="(v) => !isMockPlugin(info.plugin.name) && !hasInternalTag(info.plugin) && setPluginEnable(info.plugin.name, !!v)"
                  />
                </CardHeader>
                <CardContent class="flex-1">
                  <p class="text-muted-foreground line-clamp-3 text-sm">
                    {{ getPluginText(info.plugin.name, 'description', info.plugin.description || '') || t('pluginSystem.noDescription') }}
                  </p>
                </CardContent>
                <CardFooter class="mt-auto flex items-center justify-between border-t py-2 !pt-2">
                  <span
                    v-if="info.plugin.author"
                    class="inline-flex items-center gap-1 text-muted-foreground text-sm font-normal"
                  >
                    <img
                      :src="getAuthorAvatarUrl(info.plugin.name)"
                      :alt="info.plugin.author"
                      class="size-5 shrink-0 rounded-full object-cover"
                    >
                    @{{ info.plugin.author }}
                  </span>
                  <div v-else class="flex-1" />
                  <div class="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      :disabled="isMockPlugin(info.plugin.name) || hasInternalTag(info.plugin)"
                      @click="askUninstall(info.plugin.name)"
                    >
                      {{ t('pluginSystem.uninstall') }}
                    </Button>
                    <UiDropdownMenu>
                      <UiDropdownMenuTrigger as-child>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          :disabled="isMockPlugin(info.plugin.name) || hasInternalTag(info.plugin)"
                          class="size-8 rounded-full"
                        >
                          <MoreVertical class="size-4" />
                          <span class="sr-only">{{ t('pluginSystem.moreOptions') }}</span>
                        </Button>
                      </UiDropdownMenuTrigger>
                      <UiDropdownMenuContent align="end">
                        <UiDropdownMenuItem
                          :disabled="isMockPlugin(info.plugin.name)"
                          @click="askDownload(info.plugin.name)"
                        >
                          <Download class="mr-2 size-4" />
                          {{ t('pluginSystem.pack') }}
                        </UiDropdownMenuItem>
                      </UiDropdownMenuContent>
                    </UiDropdownMenu>
                  </div>
                </CardFooter>
              </div>
            </Card>
          </div>
          <div
            v-if="!loading && list.length === 0"
            class="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm"
          >
            {{ t('pluginSystem.emptyHint') }}
          </div>
        </div>
        <div v-else-if="pluginTab === 'remote'" class="mt-4">
          <div v-if="remoteListLoading" class="text-muted-foreground py-8 text-center">
            {{ t('pluginSystem.loading') }}
          </div>
          <div
            v-else
            class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <Card
              v-for="info in remoteDisplayListWithMocks"
              :key="info.plugin.name"
              class="relative flex h-full flex-col overflow-hidden pb-0"
            >
              <div
                class="absolute inset-0 z-0 rounded-xl"
                :style="getCardBackgroundStyle(info.plugin.name)"
              />
              <div class="absolute inset-0 z-[1] rounded-xl bg-card/90" />
              <div class="relative z-10 flex min-h-0 flex-1 flex-col gap-6">
                <CardHeader class="flex flex-row items-start justify-between gap-2 space-y-0">
                  <CardTitle class="text-[20px] leading-tight">
                    {{ getPluginText(info.plugin.name, 'summary', info.plugin.summary) }}
                    <span class="ml-1 inline-flex items-center gap-1 text-muted-foreground text-xs font-normal">
                      <Tag class="size-3 shrink-0" />
                      {{ info.plugin.version || t('pluginSystem.noVersion') }}
                    </span>
                    <span
                      v-if="hasInternalTag(info.plugin)"
                      class="ml-1 inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs font-medium"
                      :title="t('pluginSystem.internalTag')"
                    >
                      <Lock class="size-3 shrink-0" />
                      {{ t('pluginSystem.internalTag') }}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent class="flex-1">
                  <p class="text-muted-foreground line-clamp-3 text-sm">
                    {{ getPluginText(info.plugin.name, 'description', info.plugin.description || '') || t('pluginSystem.noDescription') }}
                  </p>
                </CardContent>
                <CardFooter class="mt-auto flex items-center justify-between border-t py-2 !pt-2">
                  <span
                    v-if="info.plugin.author"
                    class="inline-flex items-center gap-1 text-muted-foreground text-sm font-normal"
                  >
                    <img
                      :src="getAuthorAvatarUrl(info.plugin.name)"
                      :alt="info.plugin.author"
                      class="size-5 shrink-0 rounded-full object-cover"
                    >
                    @{{ info.plugin.author }}
                  </span>
                  <div v-else class="flex-1" />
                  <Button
                    variant="default"
                    size="sm"
                    :disabled="isMockRemotePlugin(info.plugin.name) || installingRemote"
                    @click="installRemotePlugin(info)"
                  >
                    {{ t('pluginSystem.install') }}
                  </Button>
                </CardFooter>
              </div>
            </Card>
          </div>
          <div
            v-if="!remoteListLoading && remoteDisplayList.length === 0"
            class="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm"
          >
            {{ t('pluginSystem.remoteEmptyHint') }}
          </div>
        </div>
        <div v-else-if="pluginTab === 'settings'" class="mt-4">
          <Card class="max-w-2xl">
            <CardHeader>
              <CardTitle class="text-base">
                {{ t('pluginSystem.settingsRemoteUrlsTitle') }}
              </CardTitle>
              <p class="text-muted-foreground text-sm">
                {{ t('pluginSystem.settingsRemoteUrlsDesc') }}
              </p>
            </CardHeader>
            <CardContent class="space-y-3">
              <div v-if="settingsUrlsLoading" class="text-muted-foreground py-4 text-center text-sm">
                {{ t('pluginSystem.loading') }}
              </div>
              <template v-else>
                <div
                  v-for="(_, index) in remoteUrlsSettings"
                  :key="index"
                  class="flex gap-2"
                >
                  <Input
                    v-model="remoteUrlsSettings[index]"
                    type="url"
                    :placeholder="t('pluginSystem.settingsRemoteUrlPlaceholder')"
                    class="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    :disabled="remoteUrlsSettings.length <= 1"
                    class="shrink-0 text-muted-foreground hover:text-destructive"
                    @click="removeRemoteUrlRow(index)"
                  >
                    <Trash2 class="size-4" />
                    <span class="sr-only">{{ t('pluginSystem.remove') }}</span>
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  class="w-full sm:w-auto"
                  @click="addRemoteUrlRow"
                >
                  <Plus class="mr-2 size-4" />
                  {{ t('pluginSystem.settingsAddUrl') }}
                </Button>
              </template>
            </CardContent>
            <CardFooter>
              <Button
                :disabled="settingsUrlsSaving || settingsUrlsLoading"
                @click="saveRemoteUrlsSettings"
              >
                {{ settingsUrlsSaving ? t('pluginSystem.saving') : t('pluginSystem.save') }}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </template>

    <template v-else>
      <div v-if="loading" class="text-muted-foreground py-8 text-center">
        {{ t('pluginSystem.loading') }}
      </div>
      <div
        v-else
        class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <Card v-for="info in filteredDisplayList" :key="info.plugin.name" class="relative overflow-hidden flex h-full flex-col pb-0">
          <div
            class="absolute inset-0 z-0 rounded-xl"
            :style="getCardBackgroundStyle(info.plugin.name)"
          />
          <div class="absolute inset-0 z-[1] rounded-xl bg-card/90" />
          <div class="relative z-10 flex flex-1 flex-col min-h-0 gap-6">
            <CardHeader class="flex flex-row items-start justify-between gap-2 space-y-0">
              <CardTitle class="text-[20px] leading-tight">
                {{ getPluginText(info.plugin.name, 'summary', info.plugin.summary) }}
                <span class="ml-1 inline-flex items-center gap-1 text-muted-foreground text-xs font-normal">
                  <Tag class="size-3 shrink-0" />
                  {{ info.plugin.version || t('pluginSystem.noVersion') }}
                </span>
                <span
                  v-if="hasInternalTag(info.plugin)"
                  class="ml-1 inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs font-medium"
                  :title="t('pluginSystem.internalTag')"
                >
                  <Lock class="size-3 shrink-0" />
                  {{ t('pluginSystem.internalTag') }}
                </span>
              </CardTitle>
              <Switch
                :model-value="info.plugin.enable === '1'"
                :disabled="isMockPlugin(info.plugin.name) || hasInternalTag(info.plugin)"
                @update:model-value="(v) => !isMockPlugin(info.plugin.name) && !hasInternalTag(info.plugin) && setPluginEnable(info.plugin.name, !!v)"
              />
            </CardHeader>
            <CardContent class="flex-1">
              <p class="text-muted-foreground line-clamp-3 text-sm">
                {{ getPluginText(info.plugin.name, 'description', info.plugin.description || '') || t('pluginSystem.noDescription') }}
              </p>
            </CardContent>
            <CardFooter class="mt-auto flex items-center justify-between border-t py-2 !pt-2">
              <span
                v-if="info.plugin.author"
                class="inline-flex items-center gap-1 text-muted-foreground text-sm font-normal"
              >
                <img
                  :src="getAuthorAvatarUrl(info.plugin.name)"
                  :alt="info.plugin.author"
                  class="size-5 shrink-0 rounded-full object-cover"
                >
                @{{ info.plugin.author }}
              </span>
              <div v-else class="flex-1" />
              <div class="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  :disabled="isMockPlugin(info.plugin.name) || hasInternalTag(info.plugin)"
                  @click="askUninstall(info.plugin.name)"
                >
                  {{ t('pluginSystem.uninstall') }}
                </Button>
                <UiDropdownMenu>
                  <UiDropdownMenuTrigger as-child>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      :disabled="isMockPlugin(info.plugin.name) || hasInternalTag(info.plugin)"
                      class="size-8 rounded-full"
                    >
                      <MoreVertical class="size-4" />
                      <span class="sr-only">{{ t('pluginSystem.moreOptions') }}</span>
                    </Button>
                  </UiDropdownMenuTrigger>
                  <UiDropdownMenuContent align="end">
                    <UiDropdownMenuItem
                      :disabled="isMockPlugin(info.plugin.name)"
                      @click="askDownload(info.plugin.name)"
                    >
                      <Download class="mr-2 size-4" />
                      {{ t('pluginSystem.pack') }}
                    </UiDropdownMenuItem>
                  </UiDropdownMenuContent>
                </UiDropdownMenu>
              </div>
            </CardFooter>
          </div>
        </Card>
      </div>
      <div
        v-if="!loading && list.length === 0"
        class="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm"
      >
        {{ t('pluginSystem.emptyHint') }}
      </div>
    </template>

    <Alert
      v-show="pluginChanged"
      class="border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200"
    >
      <AlertTriangle class="size-4" />
      <AlertTitle>{{ t('pluginSystem.alertChangedTitle') }}</AlertTitle>
      <AlertDescription>
        {{ t('pluginSystem.alertChangedDesc') }}
      </AlertDescription>
    </Alert>

    <Dialog v-model:open="installOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('pluginSystem.installDialogTitle') }}</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid gap-3">
            <Label>{{ t('pluginSystem.installMethod') }}</Label>
            <RadioGroup v-model="installType" class="flex gap-4">
              <div class="flex items-center gap-2">
                <RadioGroupItem id="zip" value="zip" />
                <Label for="zip" class="font-normal cursor-pointer">{{ t('pluginSystem.installMethodZip') }}</Label>
              </div>
              <div class="flex items-center gap-2">
                <RadioGroupItem id="git" value="git" />
                <Label for="git" class="font-normal cursor-pointer">{{ t('pluginSystem.installMethodGit') }}</Label>
              </div>
            </RadioGroup>
          </div>
          <div v-if="installType === 'zip'" class="grid gap-2">
            <Label for="zip-file">{{ t('pluginSystem.zipFileLabel') }}</Label>
            <Input
              id="zip-file"
              type="file"
              accept=".zip"
              @change="onZipChange"
            />
            <p class="text-muted-foreground text-xs">
              {{ t('pluginSystem.zipFileHint') }}
            </p>
          </div>
          <div v-else class="grid gap-2">
            <Label for="repo-url">{{ t('pluginSystem.gitUrlLabel') }}</Label>
            <Input
              id="repo-url"
              v-model="repoUrl"
              type="url"
              :placeholder="t('pluginSystem.gitUrlPlaceholder')"
            />
            <p class="text-muted-foreground text-xs">
              {{ t('pluginSystem.gitUrlHint') }}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="installOpen = false">
            {{ t('pluginSystem.cancel') }}
          </Button>
          <Button :disabled="submitting" @click="submitInstall">
            {{ submitting ? t('pluginSystem.installing') : t('pluginSystem.install') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog v-model:open="confirmOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {{ confirmType === 'uninstall' ? t('pluginSystem.confirmUninstall') : t('pluginSystem.confirmPack') }}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {{ confirmType === 'uninstall'
              ? t('pluginSystem.confirmUninstallDesc', { name: confirmName })
              : t('pluginSystem.confirmPackDesc', { name: confirmName })
            }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ t('pluginSystem.cancel') }}</AlertDialogCancel>
          <Button
            type="button"
            @click="() => { confirmOpen = false; runConfirm() }"
          >
            {{ t('pluginSystem.confirm') }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
