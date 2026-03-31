<script setup lang="ts">
/**
 * Chat 页：与 mc_fd apps/ai 布局一致
 * 左侧会话列表（Today / Yesterday / 7 Days Ago）+ 主内容区（问候 + 输入 或 消息列表 + 输入）
 */
import {
  ArrowUpIcon,
  BookOpen,
  ChevronDownIcon,
  FileStack,
  Mic,
  Paperclip,
  Plus,
  SearchIcon,
  Sparkles,
  TrendingUp,
} from 'lucide-vue-next'
import { computed, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import { RPC } from '@/plugin/openclaw/lib/rpc-methods'

const { t } = useI18n()
const route = useRoute()
const gateway = inject<ReturnType<typeof import('@/plugin/openclaw/composables/use-openclaw-gateway').useOpenClawGateway>>('openclaw-gateway')!
const auth = inject<ReturnType<typeof import('@/plugin/openclaw/composables/use-openclaw-auth').useOpenClawAuth>>('openclaw-auth')!

interface SessionRow {
  key: string
  label?: string
  displayName?: string
  updatedAt?: number | null
  updatedAtMs?: number
}

const searchChats = ref('')
const sessionKey = ref(auth.sessionKey?.value ?? 'main')
const history = ref<unknown[]>([])
const inputText = ref('')
const loading = ref(false)
const sending = ref(false)
const sessionsLoading = ref(false)
const sessionsList = ref<SessionRow[]>([])
const responseMode = ref('summary')
const selectedModel = ref('Claude 3.5 Sonnet')

const responseModes = [
  { value: 'summary', labelKey: 'openclaw.chatResponseSummary', icon: FileStack },
  { value: 'code', labelKey: 'openclaw.chatResponseCode', icon: Sparkles },
  { value: 'design', labelKey: 'openclaw.chatResponseDesign', icon: BookOpen },
  { value: 'research', labelKey: 'openclaw.chatResponseResearch', icon: TrendingUp },
]
const models = ['Claude 3.5 Sonnet', 'GPT-4', 'Gemini Pro']

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12)
    return t('openclaw.chatGreetingMorning')
  if (hour < 18)
    return t('openclaw.chatGreetingAfternoon')
  return t('openclaw.chatGreetingEvening')
})

function getDayKey(ms: number): 'today' | 'yesterday' | 'weekAgo' {
  const oneDay = 24 * 60 * 60 * 1000
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const yesterdayStart = new Date(todayStart.getTime() - oneDay)
  if (ms >= todayStart.getTime())
    return 'today'
  if (ms >= yesterdayStart.getTime())
    return 'yesterday'
  return 'weekAgo'
}

const sessionsGrouped = computed(() => {
  const list = sessionsList.value
  const q = searchChats.value.trim().toLowerCase()
  const filtered = q
    ? list.filter(
        s =>
          (s.displayName ?? s.label ?? s.key).toLowerCase().includes(q),
      )
    : list
  const today: SessionRow[] = []
  const yesterday: SessionRow[] = []
  const weekAgo: SessionRow[] = []
  const ts = (s: SessionRow) => (s.updatedAt ?? s.updatedAtMs ?? 0)
  filtered.sort((a, b) => ts(b) - ts(a))
  for (const s of filtered) {
    const key = getDayKey(ts(s))
    if (key === 'today')
      today.push(s)
    else if (key === 'yesterday')
      yesterday.push(s)
    else weekAgo.push(s)
  }
  return { today, yesterday, weekAgo }
})

async function loadSessions() {
  if (!gateway?.connected)
    return
  sessionsLoading.value = true
  try {
    const res = await gateway.request<{ sessions?: SessionRow[] }>(
      RPC.sessionsList,
      { limit: 100, includeGlobal: true, includeUnknown: false },
    )
    sessionsList.value = Array.isArray(res?.sessions) ? res.sessions : []
  }
  finally {
    sessionsLoading.value = false
  }
}

async function loadHistory() {
  if (!gateway?.connected)
    return
  loading.value = true
  try {
    const res = await gateway.request<{ messages?: unknown[] }>(
      RPC.chatHistory,
      { sessionKey: sessionKey.value },
    )
    history.value = Array.isArray(res?.messages) ? res.messages : []
  }
  finally {
    loading.value = false
  }
}

async function send() {
  const text = inputText.value.trim()
  if (!text || !gateway?.connected || sending.value)
    return
  sending.value = true
  inputText.value = ''
  try {
    await gateway.request(RPC.chatSend, { sessionKey: sessionKey.value, text })
    await loadHistory()
    await loadSessions()
  }
  finally {
    sending.value = false
  }
}

function abort() {
  if (gateway?.connected) {
    gateway.request(RPC.chatAbort, { sessionKey: sessionKey.value })
  }
}

function selectSession(key: string) {
  sessionKey.value = key
  auth.setSessionKey(key)
  loadHistory()
}

function newChat() {
  sessionKey.value = 'main'
  auth.setSessionKey('main')
  history.value = []
  loadHistory()
  loadSessions()
}

function sessionTitle(s: SessionRow): string {
  const name = (s.displayName ?? s.label ?? (s.key ?? '')).trim()
  if (name.length > 36)
    return `${name.slice(0, 33)}...`
  return name || s.key
}

const showEmptyState = computed(
  () => !loading.value && history.value.length === 0,
)

watch(
  () => gateway?.connected,
  (c) => {
    if (c) {
      loadHistory()
      loadSessions()
    }
  },
  { immediate: true },
)
watch(
  () => route.query.session,
  (s) => {
    if (typeof s === 'string' && s.length > 0) {
      sessionKey.value = s
      if (gateway?.connected)
        loadHistory()
    }
  },
  { immediate: true },
)
watch(
  () => auth.sessionKey?.value,
  (v) => {
    const qs = route.query.session
    if (typeof qs === 'string' && qs.length > 0)
      return
    if (v && v !== sessionKey.value)
      sessionKey.value = v
  },
  { immediate: true },
)
</script>

<template>
  <!-- 根节点带边框与左上圆角，避免内层圆角被裁切 -->
  <div class="flex h-full min-h-0 min-h-[380px] overflow-hidden rounded-lg border border-border bg-background md:rounded-tl-xl">
    <!-- 整体：左侧边栏 + 主内容区 -->
    <div class="flex min-h-0 flex-1 overflow-hidden">
      <!-- 左侧：会话列表边栏（与容器同圆角） -->
      <aside class="flex w-56 shrink-0 flex-col overflow-hidden rounded-tl-lg border-r border-border bg-muted/30">
        <UiScrollArea class="flex-1 px-2">
          <div class="space-y-4 py-2">
            <div v-if="sessionsGrouped.today.length" class="space-y-1">
              <p class="px-2 text-xs font-semibold text-muted-foreground">
                {{ t('openclaw.chatToday') }}
              </p>
              <button
                v-for="s in sessionsGrouped.today"
                :key="s.key"
                type="button"
                class="block w-full rounded-md px-2 py-1.5 text-left text-sm truncate hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                :class="{ 'bg-sidebar-accent': sessionKey === s.key }"
                @click="selectSession(s.key)"
              >
                {{ sessionTitle(s) }}
              </button>
            </div>
            <div v-if="sessionsGrouped.yesterday.length" class="space-y-1">
              <p class="px-2 text-xs font-semibold text-muted-foreground">
                {{ t('openclaw.chatYesterday') }}
              </p>
              <button
                v-for="s in sessionsGrouped.yesterday"
                :key="s.key"
                type="button"
                class="block w-full rounded-md px-2 py-1.5 text-left text-sm truncate hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                :class="{ 'bg-sidebar-accent': sessionKey === s.key }"
                @click="selectSession(s.key)"
              >
                {{ sessionTitle(s) }}
              </button>
            </div>
            <div v-if="sessionsGrouped.weekAgo.length" class="space-y-1">
              <p class="px-2 text-xs font-semibold text-muted-foreground">
                {{ t('openclaw.chat7DaysAgo') }}
              </p>
              <button
                v-for="s in sessionsGrouped.weekAgo"
                :key="s.key"
                type="button"
                class="block w-full rounded-md px-2 py-1.5 text-left text-sm truncate hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                :class="{ 'bg-sidebar-accent': sessionKey === s.key }"
                @click="selectSession(s.key)"
              >
                {{ sessionTitle(s) }}
              </button>
            </div>
            <div
              v-if="
                !sessionsLoading
                  && !sessionsGrouped.today.length
                  && !sessionsGrouped.yesterday.length
                  && !sessionsGrouped.weekAgo.length
              "
              class="px-2 py-4 text-center text-muted-foreground text-xs"
            >
              {{ t('openclaw.sessionsNone') }}
            </div>
          </div>
        </UiScrollArea>
        <div class="p-2">
          <div class="relative">
            <SearchIcon class="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              v-model="searchChats"
              type="search"
              :placeholder="t('openclaw.chatSearchPlaceholder')"
              class="h-9 w-full rounded-md border border-border bg-background pr-3 pl-10 text-sm text-foreground shadow-xs placeholder:text-muted-foreground"
            >
          </div>
        </div>
        <div class="p-2 space-y-1 border-t">
          <UiButton
            class="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            size="sm"
            @click="newChat"
          >
            <Plus class="size-4" />
            {{ t('openclaw.chatNewChat') }}
          </UiButton>
        </div>
      </aside>

      <!-- 主内容区 -->
      <main class="flex flex-1 flex-col min-w-0 bg-background">
        <UiCard v-if="!gateway?.connected" class="m-4">
          <UiCardContent class="py-8 text-center text-muted-foreground text-sm">
            {{ t('openclaw.connectFirst') }}
          </UiCardContent>
        </UiCard>

        <template v-else>
          <!-- 空状态：完全对齐参考页 DOM（mx-auto max-w-4xl space-y-4 lg:p-4） -->
          <div
            v-if="showEmptyState"
            class="flex flex-1 flex-col items-center justify-center overflow-auto"
          >
            <div class="mx-auto flex h-full w-full max-w-4xl flex-col items-center justify-center space-y-4 lg:p-4">
              <!-- 中央装饰图形：光晕闪烁 -->
              <div
                class="size-64 rounded-full bg-gradient-to-br from-violet-400/55 via-fuchsia-400/45 to-amber-400/50 blur-2xl opacity-95 dark:opacity-90 animate-glow-pulse"
                aria-hidden="true"
              />
              <div class="flex flex-col items-center gap-1 text-center">
                <h1 class="text-2xl font-semibold tracking-tight">
                  {{ greeting }}, <span class="text-foreground">User</span>
                </h1>
                <p class="text-muted-foreground">
                  {{ t('openclaw.chatAssistPrefix') }}
                  <span class="font-medium text-violet-600 dark:text-violet-400">{{ t('openclaw.chatAssistHighlight') }}</span>
                  {{ t('openclaw.chatAssistSuffix') }}
                </p>
              </div>
              <!-- 输入区域（与参考页一致：Paperclip / textarea / 模型下拉 / Mic / Send，无 Abort） -->
              <div class="w-full max-w-2xl space-y-3">
                <div class="flex items-center gap-2 rounded-xl border bg-background p-2 shadow-sm">
                  <UiButton variant="ghost" size="icon" class="shrink-0 rounded-full">
                    <Paperclip class="size-4" />
                    <span class="sr-only">Add attachment</span>
                  </UiButton>
                  <textarea
                    v-model="inputText"
                    :placeholder="t('openclaw.chatAskPlaceholder')"
                    class="min-h-10 flex-1 resize-none rounded-md border-0 bg-transparent px-2 py-2 text-sm outline-none focus:ring-0"
                    rows="1"
                    @keydown.enter.exact.prevent="send()"
                  />
                  <UiDropdownMenu>
                    <UiDropdownMenuTrigger as-child>
                      <UiButton variant="ghost" size="sm" class="shrink-0 gap-1">
                        {{ selectedModel }}
                        <ChevronDownIcon class="size-4" />
                      </UiButton>
                    </UiDropdownMenuTrigger>
                    <UiDropdownMenuContent align="end" class="w-48">
                      <UiDropdownMenuItem
                        v-for="m in models"
                        :key="m"
                        @click="selectedModel = m"
                      >
                        {{ m }}
                      </UiDropdownMenuItem>
                    </UiDropdownMenuContent>
                  </UiDropdownMenu>
                  <UiButton variant="ghost" size="icon" class="shrink-0 rounded-full">
                    <Mic class="size-4" />
                    <span class="sr-only">Voice input</span>
                  </UiButton>
                  <UiButton
                    variant="default"
                    size="icon"
                    class="shrink-0 rounded-full"
                    :disabled="sending || !inputText.trim()"
                    @click="send()"
                  >
                    <ArrowUpIcon class="size-4" />
                    <span class="sr-only">{{ t('openclaw.send') }}</span>
                  </UiButton>
                </div>
                <div class="flex flex-wrap justify-center gap-1">
                  <UiButton
                    v-for="mode in responseModes"
                    :key="mode.value"
                    :variant="responseMode === mode.value ? 'secondary' : 'outline'"
                    size="sm"
                    class="gap-1.5"
                    @click="responseMode = mode.value"
                  >
                    <component :is="mode.icon" class="size-4 shrink-0" />
                    {{ t(mode.labelKey) }}
                  </UiButton>
                </div>
              </div>
            </div>
          </div>

          <!-- 有消息时：消息列表 + 底部输入 -->
          <template v-else>
            <UiScrollArea class="flex-1 p-4">
              <div v-if="loading" class="text-muted-foreground text-sm py-4">
                {{ t('common.loading') }}
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="(msg, i) in history"
                  :key="i"
                  class="rounded-md bg-muted/50 p-2 text-sm"
                >
                  <pre class="whitespace-pre-wrap break-words">{{
                  typeof msg === 'object' ? JSON.stringify(msg) : msg
                  }}</pre>
                </div>
              </div>
            </UiScrollArea>
            <div class="flex gap-2 border-t p-2">
              <UiInput
                v-model="inputText"
                class="flex-1"
                :placeholder="t('openclaw.chatPlaceholder')"
                @keydown.enter.prevent="send()"
              />
              <UiButton variant="outline" size="sm" @click="abort">
                {{ t('openclaw.abort') }}
              </UiButton>
              <UiButton size="sm" :disabled="sending" @click="send()">
                {{ t('openclaw.send') }}
              </UiButton>
            </div>
          </template>
        </template>
      </main>
    </div>
  </div>
</template>
