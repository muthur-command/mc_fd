<script setup lang="ts">
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeft,
  ChevronsRight,
  Container,
  Cpu,
  Globe,
  HardDrive,
  Images,
  Layers,
  MemoryStick,
  Plus,
  Search,
  Server,
  Smile,
  Trash2,
  TriangleAlert,
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

/**
 * Docker Dashboard - 参考 Card Management 页面设计
 * 使用 shadcn-vue Card 网格与渐变卡片样式
 */
import type {
  DiskUsageResponse,
  SystemInfoResponse,
} from '@/plugin/docker/api'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/ui/status-badge'
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '@/constants/pagination'
import {
  getDiskUsageApi,
  getNetworkListApi,
  getStackListApi,
  getSystemInfoApi,
  getVolumeListApi,
} from '@/plugin/docker/api'
import { useDockerActiveEnvironment } from '@/plugin/docker/composables/use-docker-active-environment'

const CUSTOM_ENVS_LS_KEY = 'mc-docker-dashboard-custom-envs'
const DISMISSED_ENV_IDS_LS_KEY = 'mc-docker-dashboard-dismissed-env-ids'

interface CustomDashboardEnv {
  id: string
  name: string
  type: string
  endpoint: string
  version: string
  cpus: number
  memTotal: number
}

const { t } = useI18n()
const { activeEnvironment, setActiveEnvironment, resetToLocal } = useDockerActiveEnvironment()
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref<number>(DEFAULT_PAGE_SIZE)

const systemInfo = ref<null | SystemInfoResponse>(null)
const diskUsage = ref<DiskUsageResponse | null>(null)
const stacksCount = ref<number | null>(null)
const volumesCount = ref<number | null>(null)
const networksCount = ref<number | null>(null)
const loading = ref(false)
const isConnected = ref(false)
const dismissedEnvIds = ref<Set<string>>(new Set())
const customEnvironments = ref<CustomDashboardEnv[]>([])
const selectedEnvIds = ref<Set<string>>(new Set())
const addDialogOpen = ref(false)
const removeDialogOpen = ref(false)
const newEnvName = ref('')
const newEnvEndpoint = ref('')
const newEnvType = ref('Remote')
let refreshInterval: null | number = null

function loadJsonArray<T>(key: string, guard: (x: unknown) => x is T): T[] {
  if (typeof localStorage === 'undefined')
    return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw)
      return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed))
      return []
    return parsed.filter(guard)
  }
  catch {
    return []
  }
}

function loadDismissedIds(): Set<string> {
  const arr = loadJsonArray(DISMISSED_ENV_IDS_LS_KEY, (x): x is string => typeof x === 'string')
  return new Set(arr)
}

function persistDismissedIds() {
  if (typeof localStorage === 'undefined')
    return
  localStorage.setItem(
    DISMISSED_ENV_IDS_LS_KEY,
    JSON.stringify([...dismissedEnvIds.value]),
  )
}

function persistCustomEnvironments() {
  if (typeof localStorage === 'undefined')
    return
  localStorage.setItem(CUSTOM_ENVS_LS_KEY, JSON.stringify(customEnvironments.value))
}

function isCustomEnvPayload(x: unknown): x is CustomDashboardEnv {
  if (!x || typeof x !== 'object')
    return false
  const o = x as Record<string, unknown>
  return (
    typeof o.id === 'string'
    && typeof o.name === 'string'
    && typeof o.type === 'string'
    && typeof o.endpoint === 'string'
    && typeof o.version === 'string'
    && typeof o.cpus === 'number'
    && typeof o.memTotal === 'number'
  )
}

const activeEnvironmentDisplayName = computed(() => {
  const a = activeEnvironment.value
  if (a.id === 'local' && !a.name)
    return t('docker.dashboard.local')
  return a.name || a.id
})

function isActiveDockerEnv(id: string) {
  return activeEnvironment.value.id === id
}

function selectActiveDockerEnv(env: { id: string, name: string }) {
  setActiveEnvironment({ id: env.id, name: env.name })
}

function isEnvSelected(id: string) {
  return selectedEnvIds.value.has(id)
}

function toggleEnvSelected(id: string, checked: boolean) {
  if (id === 'local')
    return
  const next = new Set(selectedEnvIds.value)
  if (checked)
    next.add(id)
  else next.delete(id)
  selectedEnvIds.value = next
}

const hasEnvSelection = computed(() => selectedEnvIds.value.size > 0)

function openRemoveDialog() {
  if (!hasEnvSelection.value) {
    toast.warning(t('docker.dashboard.selectEnvironmentsFirst'))
    return
  }
  removeDialogOpen.value = true
}

function confirmRemoveEnvironments() {
  const ids = [...selectedEnvIds.value].filter(id => id !== 'local')
  const removedIds = new Set(ids)
  const nextCustom = customEnvironments.value.filter(c => !ids.includes(c.id))
  const nextDismissed = new Set(dismissedEnvIds.value)
  for (const id of ids) {
    if (id.startsWith('custom-'))
      continue
    nextDismissed.add(id)
  }
  customEnvironments.value = nextCustom
  dismissedEnvIds.value = nextDismissed
  selectedEnvIds.value = new Set()
  if (removedIds.has(activeEnvironment.value.id))
    resetToLocal()
  persistCustomEnvironments()
  persistDismissedIds()
  removeDialogOpen.value = false
  toast.success(t('docker.dashboard.removeSuccess'))
}

function resetAddEnvForm() {
  newEnvName.value = ''
  newEnvEndpoint.value = ''
  newEnvType.value = 'Remote'
}

function openAddEnvironmentDialog() {
  resetAddEnvForm()
  addDialogOpen.value = true
}

function saveNewEnvironment() {
  const name = newEnvName.value.trim()
  const endpoint = newEnvEndpoint.value.trim()
  if (!name || !endpoint) {
    toast.warning(t('docker.dashboard.envFieldsRequired'))
    return
  }
  const id = `custom-${Date.now()}`
  customEnvironments.value = [
    ...customEnvironments.value,
    {
      id,
      name,
      type: newEnvType.value.trim() || 'Remote',
      endpoint,
      version: '—',
      cpus: 4,
      memTotal: 8 * 1024 * 1024 * 1024,
    },
  ]
  persistCustomEnvironments()
  addDialogOpen.value = false
  resetAddEnvForm()
  toast.success(t('docker.dashboard.addEnvironmentSuccess'))
}

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

function formatBytes(bytes: number) {
  if (bytes === 0)
    return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`
}

async function loadData() {
  loading.value = true
  try {
    // 先只请求系统信息和磁盘用量，尽快展示首屏（容器数、镜像数、磁盘等）
    const [info, usage] = await Promise.all([
      getSystemInfoApi(),
      getDiskUsageApi(),
    ])
    systemInfo.value = info
    diskUsage.value = usage
    isConnected.value = true
    loading.value = false

    const [stacks, networks, volumes] = await Promise.all([
      getStackListApi().catch(() => []),
      getNetworkListApi().catch(() => []),
      getVolumeListApi().catch(() => []),
    ])
    stacksCount.value = Array.isArray(stacks) ? stacks.length : 0
    networksCount.value = Array.isArray(networks) ? networks.length : 0
    volumesCount.value = Array.isArray(volumes) ? volumes.length : 0
  }
  catch (error) {
    console.error(t('docker.dashboard.loadDataError'), error)
    isConnected.value = false
    loading.value = false
  }
}

const localEnvironmentStats = computed(() => ({
  stacks: stacksCount.value ?? 0,
  containers: systemInfo.value?.containers ?? 0,
  containersRunning: systemInfo.value?.containers_running ?? 0,
  containersStopped: systemInfo.value?.containers_stopped ?? 0,
  images: systemInfo.value?.images ?? 0,
  imagesSizeBytes: diskUsage.value?.images_size ?? 0,
  volumes: volumesCount.value ?? 0,
  networks: networksCount.value ?? 0,
}))

const builtInEnvironments = computed(() => [
  {
    id: 'local',
    name: t('docker.dashboard.local'),
    status: isConnected.value ? t('docker.dashboard.up') : t('docker.dashboard.disconnected'),
    type: t('docker.dashboard.localType'),
    version: systemInfo.value?.docker_version || '—',
    endpoint: '/var/run/docker.sock',
    cpus: systemInfo.value?.cpus ?? 0,
    memTotal: systemInfo.value?.mem_total ?? 0,
    stats: localEnvironmentStats.value,
  },
  {
    id: 'dev-test-1',
    name: 'Dev-Lab-A',
    status: t('docker.dashboard.up'),
    type: 'Remote',
    version: '28.0.2',
    endpoint: 'tcp://10.20.1.15:2375',
    cpus: 8,
    memTotal: 16 * 1024 * 1024 * 1024,
    stats: null,
  },
  {
    id: 'dev-test-2',
    name: 'QA-Staging',
    status: t('docker.dashboard.disconnected'),
    type: 'Remote',
    version: '27.4.0',
    endpoint: 'tcp://10.20.2.30:2375',
    cpus: 4,
    memTotal: 8 * 1024 * 1024 * 1024,
    stats: null,
  },
  {
    id: 'dev-test-3',
    name: 'CI-Runner',
    status: t('docker.dashboard.up'),
    type: 'Remote',
    version: '29.0.0',
    endpoint: 'ssh://docker@ci-runner',
    cpus: 16,
    memTotal: 32 * 1024 * 1024 * 1024,
    stats: null,
  },
  {
    id: 'dev-test-4',
    name: 'Edge-Node',
    status: t('docker.dashboard.up'),
    type: 'Edge',
    version: '26.1.4',
    endpoint: 'tcp://edge-01.local:2375',
    cpus: 2,
    memTotal: 4 * 1024 * 1024 * 1024,
    stats: null,
  },
])

const environments = computed(() => {
  const dismissed = dismissedEnvIds.value
  const visibleBuiltIn = builtInEnvironments.value.filter(
    e => e.id === 'local' || !dismissed.has(e.id),
  )
  const builtInRows = visibleBuiltIn.map(e => ({
    ...e,
    removable: e.id !== 'local',
  }))
  const customRows = customEnvironments.value.map(c => ({
    id: c.id,
    name: c.name,
    status: t('docker.dashboard.disconnected'),
    type: c.type,
    version: c.version,
    endpoint: c.endpoint,
    cpus: c.cpus,
    memTotal: c.memTotal,
    stats: null,
    removable: true,
  }))
  return [...builtInRows, ...customRows]
})

const filteredEnvironments = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword)
    return environments.value
  return environments.value.filter(env => env.name.toLowerCase().includes(keyword))
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredEnvironments.value.length / pageSize.value)))

const paginatedEnvironments = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredEnvironments.value.slice(start, start + pageSize.value)
})

const paginatedRemovableIds = computed(() =>
  paginatedEnvironments.value.filter(e => e.removable).map(e => e.id),
)

const pageSelectCheckboxModel = computed<boolean | 'indeterminate'>(() => {
  const ids = paginatedRemovableIds.value
  if (ids.length === 0)
    return false
  const sel = selectedEnvIds.value
  const all = ids.every(id => sel.has(id))
  const some = ids.some(id => sel.has(id))
  if (all)
    return true
  if (some)
    return 'indeterminate'
  return false
})

function onPageSelectAll(value: boolean | 'indeterminate') {
  const ids = paginatedRemovableIds.value
  if (ids.length === 0)
    return
  const next = new Set(selectedEnvIds.value)
  const turnOn = value === true
  if (turnOn) {
    for (const id of ids) next.add(id)
  }
  else {
    for (const id of ids) next.delete(id)
  }
  selectedEnvIds.value = next
}

function previousPage() {
  if (currentPage.value > 1)
    currentPage.value -= 1
}

function nextPage() {
  if (currentPage.value < totalPages.value)
    currentPage.value += 1
}
function firstPage() {
  currentPage.value = 1
}
function lastPage() {
  currentPage.value = totalPages.value
}
const canPreviousPage = computed(() => currentPage.value > 1)
const canNextPage = computed(() => currentPage.value < totalPages.value)
function handlePageSizeChange(value: unknown) {
  if (value == null || value === '')
    return
  pageSize.value = Number(value)
  currentPage.value = 1
}

function resetPageIfNeeded() {
  if (currentPage.value > totalPages.value)
    currentPage.value = totalPages.value
  if (currentPage.value < 1)
    currentPage.value = 1
}

onMounted(() => {
  dismissedEnvIds.value = loadDismissedIds()
  customEnvironments.value = loadJsonArray(CUSTOM_ENVS_LS_KEY, isCustomEnvPayload)
  loadData()
  refreshInterval = window.setInterval(loadData, 30_000)
})

watch(searchKeyword, () => {
  currentPage.value = 1
})

watch(totalPages, () => {
  resetPageIfNeeded()
})

watch(
  environments,
  (list) => {
    const ids = new Set(list.map(e => e.id))
    if (!ids.has(activeEnvironment.value.id))
      resetToLocal()
  },
  { deep: true },
)

onUnmounted(() => {
  if (refreshInterval)
    clearInterval(refreshInterval)
})
</script>

<template>
  <main class="pb-4">
    <div class="overflow-x-auto">
      <div class="space-y-4">
        <div class="flex w-full flex-wrap items-center gap-4 py-4 w-full overflow-x-auto">
          <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <!-- 与 Stacks data-table-toolbar 搜索框同宽：Stacks 为 w-full+max-w-xs 在宽 flex 下约 20rem；此处用 w-80 固定，避免 w-fit 父级把输入压窄 -->
            <div class="relative shrink-0">
              <Search class="text-muted-foreground pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2" />
              <Input
                v-model="searchKeyword"
                :placeholder="t('docker.dashboard.searchPlaceholder')"
                class="ml-1 h-8 w-80 min-w-[10rem] max-w-xs shrink-0 pl-9"
              />
            </div>
            <Button
              size="sm"
              class="from-destructive via-destructive/60 to-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 h-8 gap-1.5 bg-gradient-to-r [background-size:200%_auto] text-white hover:bg-[99%_center]"
              :disabled="!hasEnvSelection"
              @click="openRemoveDialog"
            >
              <Trash2 class="size-4" />
              {{ t('docker.dashboard.remove') }}
            </Button>
            <InspiraUiRainbowButton
              class="!h-9 gap-1.5 !rounded-md !px-2.5 text-sm"
              @click="openAddEnvironmentDialog"
            >
              <Plus class="size-4" />
              {{ t('docker.dashboard.addEnvironment') }}
            </InspiraUiRainbowButton>
          </div>
        </div>
        <div class="rounded-md border">
          <template v-if="filteredEnvironments.length === 0">
            <div class="p-4">
              <p
                class="text-muted-foreground rounded-md border border-dashed px-4 py-8 text-center text-sm"
              >
                {{ t('docker.dashboard.noEnvironmentResults') }}
              </p>
            </div>
          </template>
          <template v-else>
            <!-- 表头与列表共用同一水平内边距，复选框列左缘与容器内容区左缘对齐（与 Stacks 表格一致） -->
            <div class="px-4 pt-4 pb-4">
              <div class="flex min-w-0 border-b">
                <div
                  class="text-muted-foreground flex h-10 w-12 shrink-0 items-center justify-center border-r border-border/60 px-2 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]"
                >
                  <Checkbox
                    v-if="paginatedRemovableIds.length > 0"
                    :model-value="pageSelectCheckboxModel"
                    :aria-label="t('docker.dashboard.selectAllOnPage')"
                    @update:model-value="onPageSelectAll"
                  />
                </div>
                <div
                  class="text-muted-foreground flex h-10 min-w-0 flex-1 items-center justify-between gap-2 p-2 text-left text-xs font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0"
                >
                  <span class="min-w-0 truncate">{{ t('docker.dashboard.environments') }}</span>
                  <div class="flex min-w-0 max-w-[min(100%,22rem)] shrink items-center gap-2">
                    <span class="text-muted-foreground truncate font-normal">
                      {{ t('docker.dashboard.activeEnvironmentCaption') }}
                    </span>
                    <StatusBadge
                      color="yellow"
                      class="max-w-[min(50%,14rem)] shrink-0 min-w-0 truncate font-normal"
                      :title="activeEnvironmentDisplayName"
                    >
                      <span class="min-w-0 truncate">{{ activeEnvironmentDisplayName }}</span>
                    </StatusBadge>
                  </div>
                </div>
              </div>
              <div class="flex flex-col gap-4 pt-4">
                <div
                  v-for="env in paginatedEnvironments"
                  :key="env.id"
                  class="flex min-w-0 items-stretch gap-0"
                >
                  <div
                    class="flex w-12 shrink-0 items-center justify-center border-r border-border/60 bg-transparent p-2 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]"
                  >
                    <Checkbox
                      v-if="env.removable"
                      :model-value="isEnvSelected(env.id)"
                      class="border-border"
                      :aria-label="t('docker.dashboard.selectEnvironmentRow', { name: env.name })"
                      @update:model-value="(v) => toggleEnvSelected(env.id, !!v)"
                    />
                  </div>
                  <div
                    class="min-w-0 flex-1 rounded-xl p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    role="button"
                    tabindex="0"
                    :aria-pressed="isActiveDockerEnv(env.id)"
                    :aria-label="t('docker.dashboard.selectEnvironmentCard', { name: env.name })"
                    @click="selectActiveDockerEnv(env)"
                    @keydown.enter.prevent="selectActiveDockerEnv(env)"
                    @keydown.space.prevent="selectActiveDockerEnv(env)"
                  >
                    <Card
                      class="relative flex h-full cursor-pointer flex-col overflow-hidden p-0 transition-shadow hover:shadow-md"
                      :class="[
                        isActiveDockerEnv(env.id)
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                          : '',
                      ]"
                    >
                      <div
                        class="absolute inset-0 z-0 rounded-xl"
                        :style="getCardBackgroundStyle(env.id)"
                      />
                      <div class="absolute inset-0 z-[1] rounded-xl bg-card/90" />
                      <div class="relative z-10 flex min-h-0 flex-1 flex-col gap-4 px-6 py-6 w-full">
                        <div class="flex flex-wrap items-start gap-4 sm:gap-6">
                          <div class="flex shrink-0 flex-col items-center gap-2">
                            <div class="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <Server class="size-7" />
                            </div>
                            <span class="text-base font-semibold">{{ env.name }}</span>
                          </div>
                          <div class="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-start">
                            <div class="flex min-w-0 flex-1 flex-col gap-3 lg:max-w-[40%]">
                              <div class="flex flex-wrap items-center gap-2">
                                <StatusBadge :color="env.status === t('docker.dashboard.disconnected') ? 'gray' : 'green'">
                                  <template #leading>
                                    <Smile class="size-3.5 shrink-0" />
                                  </template>
                                  {{ env.status }}
                                </StatusBadge>
                                <span class="text-muted-foreground text-sm">
                                  Standalone {{ env.version }}
                                </span>
                                <code class="text-muted-foreground rounded bg-muted px-1.5 py-0.5 text-xs">
                                  {{ env.endpoint }}
                                </code>
                              </div>
                              <div class="flex flex-wrap items-center gap-2">
                                <span class="text-muted-foreground text-sm">{{ t('docker.dashboard.type') }}:</span>
                                <StatusBadge color="gray">
                                  {{ env.type }}
                                </StatusBadge>
                              </div>
                              <div class="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                                <span class="inline-flex items-center gap-1.5">
                                  <Cpu class="text-muted-foreground size-4" />
                                  {{ env.cpus }} {{ t('docker.dashboard.cpu') }}
                                </span>
                                <span class="inline-flex items-center gap-1.5">
                                  <MemoryStick class="text-muted-foreground size-4" />
                                  {{ env.memTotal > 0 ? formatBytes(env.memTotal) : '—' }}
                                  {{ t('docker.dashboard.ram') }}
                                </span>
                              </div>
                            </div>
                            <div class="min-w-0 flex-1">
                              <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                                <div class="bg-muted/30 flex flex-col gap-1 rounded-lg border p-3">
                                  <div class="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                                    <Layers class="size-3.5 shrink-0" aria-hidden="true" />
                                    {{ t('docker.dashboard.stackTitle') }}
                                  </div>
                                  <div class="text-sm font-semibold">
                                    <template v-if="env.stats">
                                      {{ env.stats.stacks }} {{ t('docker.dashboard.stacks') }}
                                    </template>
                                    <template v-else>
                                      —
                                    </template>
                                  </div>
                                </div>
                                <div class="bg-muted/30 flex flex-col gap-1 rounded-lg border p-3">
                                  <div class="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                                    <Container class="size-3.5 shrink-0" aria-hidden="true" />
                                    {{ t('docker.dashboard.containersTitle') }}
                                  </div>
                                  <div class="text-sm font-semibold">
                                    <template v-if="env.stats">
                                      {{ env.stats.containers }} {{ t('docker.dashboard.containers') }}
                                    </template>
                                    <template v-else>
                                      —
                                    </template>
                                  </div>
                                  <div v-if="env.stats" class="text-muted-foreground text-xs">
                                    {{ env.stats.containersRunning }} {{ t('docker.dashboard.running') }}
                                    ·
                                    {{ env.stats.containersStopped }} {{ t('docker.dashboard.stopped') }}
                                  </div>
                                </div>
                                <div class="bg-muted/30 flex flex-col gap-1 rounded-lg border p-3">
                                  <div class="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                                    <Images class="size-3.5 shrink-0" aria-hidden="true" />
                                    {{ t('docker.dashboard.imagesTitle') }}
                                  </div>
                                  <div class="text-sm font-semibold">
                                    <template v-if="env.stats">
                                      {{ env.stats.images }} {{ t('docker.dashboard.images') }}
                                    </template>
                                    <template v-else>
                                      —
                                    </template>
                                  </div>
                                  <div v-if="env.stats" class="text-muted-foreground text-xs">
                                    {{ formatBytes(env.stats.imagesSizeBytes) }}
                                  </div>
                                </div>
                                <div class="bg-muted/30 flex flex-col gap-1 rounded-lg border p-3">
                                  <div class="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                                    <HardDrive class="size-3.5 shrink-0" aria-hidden="true" />
                                    {{ t('docker.dashboard.volumesTitle') }}
                                  </div>
                                  <div class="text-sm font-semibold">
                                    <template v-if="env.stats">
                                      {{ env.stats.volumes }} {{ t('docker.dashboard.volumes') }}
                                    </template>
                                    <template v-else>
                                      —
                                    </template>
                                  </div>
                                </div>
                                <div class="bg-muted/30 flex flex-col gap-1 rounded-lg border p-3">
                                  <div class="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                                    <Globe class="size-3.5 shrink-0" aria-hidden="true" />
                                    {{ t('docker.dashboard.networksTitle') }}
                                  </div>
                                  <div class="text-sm font-semibold">
                                    <template v-if="env.stats">
                                      {{ env.stats.networks }} {{ t('docker.dashboard.networks') }}
                                    </template>
                                    <template v-else>
                                      —
                                    </template>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </template>
          <div
            v-if="filteredEnvironments.length > 0"
            class="flex items-center justify-between bg-background px-2 py-2"
          >
            <div class="flex-1" />
            <div class="flex items-center space-x-6 lg:space-x-8">
              <div class="flex items-center space-x-2">
                <p class="hidden line-clamp-1 text-sm font-medium md:block">
                  Rows per page
                </p>
                <UiSelect
                  :model-value="`${pageSize}`"
                  @update:model-value="handlePageSizeChange"
                >
                  <UiSelectTrigger class="h-8 w-[70px]">
                    <UiSelectValue :placeholder="`${pageSize}`" />
                  </UiSelectTrigger>
                  <UiSelectContent side="top">
                    <UiSelectItem v-for="size in PAGE_SIZES" :key="size" :value="`${size}`">
                      {{ size }}
                    </UiSelectItem>
                  </UiSelectContent>
                </UiSelect>
              </div>
              <div class="flex w-[100px] items-center justify-center text-sm font-medium">
                Page {{ currentPage }} of {{ totalPages }}
              </div>
              <div class="flex items-center space-x-2">
                <Button
                  variant="outline"
                  class="hidden size-8 p-0 lg:flex"
                  :disabled="!canPreviousPage"
                  @click="firstPage"
                >
                  <span class="sr-only">Go to first page</span>
                  <ChevronsLeft class="size-4" />
                </Button>
                <Button
                  variant="outline"
                  class="size-8 p-0"
                  :disabled="!canPreviousPage"
                  @click="previousPage"
                >
                  <span class="sr-only">Go to previous page</span>
                  <ChevronLeftIcon class="size-4" />
                </Button>
                <Button
                  variant="outline"
                  class="size-8 p-0"
                  :disabled="!canNextPage"
                  @click="nextPage"
                >
                  <span class="sr-only">Go to next page</span>
                  <ChevronRightIcon class="size-4" />
                </Button>
                <Button
                  variant="outline"
                  class="hidden size-8 p-0 lg:flex"
                  :disabled="!canNextPage"
                  @click="lastPage"
                >
                  <span class="sr-only">Go to last page</span>
                  <ChevronsRight class="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Dialog :open="addDialogOpen" @update:open="(v) => (addDialogOpen = v)">
      <DialogContent class="sm:max-w-md" :show-close-button="true">
        <DialogHeader class="text-left">
          <DialogTitle>{{ t('docker.dashboard.addEnvironmentTitle') }}</DialogTitle>
          <DialogDescription>{{ t('docker.dashboard.addEnvironmentDescription') }}</DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-2">
          <div class="space-y-2">
            <Label for="dash-new-env-name">{{ t('docker.dashboard.envNameLabel') }}</Label>
            <Input
              id="dash-new-env-name"
              v-model="newEnvName"
              autocomplete="off"
            />
          </div>
          <div class="space-y-2">
            <Label for="dash-new-env-endpoint">{{ t('docker.dashboard.envEndpointLabel') }}</Label>
            <Input
              id="dash-new-env-endpoint"
              v-model="newEnvEndpoint"
              class="font-mono text-sm"
              autocomplete="off"
              placeholder="tcp://host:2375"
            />
          </div>
          <div class="space-y-2">
            <Label for="dash-new-env-type">{{ t('docker.dashboard.envTypeLabel') }}</Label>
            <Input
              id="dash-new-env-type"
              v-model="newEnvType"
              autocomplete="off"
            />
          </div>
        </div>
        <DialogFooter class="gap-2 sm:gap-0">
          <Button type="button" variant="outline" @click="addDialogOpen = false">
            {{ t('docker.dashboard.addEnvironmentCancel') }}
          </Button>
          <Button type="button" @click="saveNewEnvironment">
            {{ t('docker.dashboard.addEnvironmentSave') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog v-model:open="removeDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader class="items-center text-center">
          <div class="mb-2 flex size-12 items-center justify-center rounded-full bg-red-500/15 dark:bg-red-500/20">
            <TriangleAlert class="size-6 text-red-600 dark:text-red-400" />
          </div>
          <AlertDialogTitle>{{ t('docker.dashboard.removeConfirmTitle') }}</AlertDialogTitle>
          <AlertDialogDescription class="text-center">
            {{ t('docker.dashboard.removeConfirmDescription') }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ t('docker.dashboard.removeConfirmCancel') }}</AlertDialogCancel>
          <AlertDialogAction
            class="bg-primary text-primary-foreground hover:bg-primary/90"
            @click="confirmRemoveEnvironments"
          >
            {{ t('docker.dashboard.removeConfirmAction') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </main>
</template>
