<script lang="ts" setup>
/**
 * 顶部通知入口：展示 Apprise 发送历史最近 8 条；「查看全部」跳转插件 History（logs）页。
 */
import { Bell, Clock } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import type { AppriseLogItem } from '@/plugin/apprise_notify/api'

import { listAppriseLogsApi } from '@/plugin/apprise_notify/api'
import AppriseLogDetailDialog from '@/plugin/apprise_notify/components/AppriseLogDetailDialog.vue'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const authStore = useAuthStore()

const HEADER_LOG_LIMIT = 8

const menuOpen = ref(false)
const loading = ref(false)
const items = ref<AppriseLogItem[]>([])

const logDetailOpen = ref(false)
const logDetailLog = ref<AppriseLogItem | null>(null)

function openLogDetailFromHeader(log: AppriseLogItem) {
  logDetailLog.value = log
  logDetailOpen.value = true
  menuOpen.value = false
}

function onLogDetailOpenChange(open: boolean) {
  if (!open)
    logDetailLog.value = null
}

const hasRecentFailure = computed(() => items.value.some(l => l.status === 'failed'))

async function fetchRecentLogs() {
  if (!authStore.isLogin) {
    items.value = []
    return
  }
  loading.value = true
  try {
    const data = await listAppriseLogsApi(1, HEADER_LOG_LIMIT, { skipGlobalErrorToast: true })
    items.value = data.items ?? []
  }
  catch {
    items.value = []
  }
  finally {
    loading.value = false
  }
}

watch(menuOpen, (open) => {
  if (open)
    void fetchRecentLogs()
})

watch(
  () => authStore.isLogin,
  (ok) => {
    if (!ok)
      items.value = []
    else if (menuOpen.value)
      void fetchRecentLogs()
  },
)

function formatTime(ms: number) {
  if (!ms)
    return '—'
  return new Date(ms).toLocaleString()
}

function linePreview(text: string, max = 120) {
  const s = text?.replace(/\s+/g, ' ').trim() ?? ''
  return s.length > max ? `${s.slice(0, max)}…` : s
}

function rowTitle(log: AppriseLogItem) {
  return log.title?.trim() || t('appriseNotify.header.noTitle')
}

function rowDescription(log: AppriseLogItem) {
  if (log.status === 'failed' && log.errorMessage)
    return linePreview(log.errorMessage, 160)
  return linePreview(log.body, 160)
}
</script>

<template>
  <UiDropdownMenu v-model:open="menuOpen">
    <UiDropdownMenuTrigger as-child>
      <UiButton variant="outline" size="icon" class="relative" :aria-label="t('appriseNotify.header.title')">
        <Bell class="size-4" />
        <span
          v-if="hasRecentFailure"
          class="bg-destructive absolute end-0 top-0 block size-2 shrink-0 rounded-full"
          aria-hidden="true"
        />
      </UiButton>
    </UiDropdownMenuTrigger>
    <UiDropdownMenuContent align="end" class="ms-4 w-80 p-0">
      <UiDropdownMenuLabel class="bg-background sticky top-0 z-10 border-b px-4 py-3 dark:bg-muted">
        <div class="flex items-center justify-between gap-2">
          <span class="font-medium">{{ t('appriseNotify.header.title') }}</span>
          <UiButton variant="link" class="h-auto p-0 text-xs" size="sm" as-child>
            <RouterLink :to="{ path: '/plugin/apprise-notify', query: { tab: 'logs' } }">
              {{ t('appriseNotify.header.viewAll') }}
            </RouterLink>
          </UiButton>
        </div>
      </UiDropdownMenuLabel>
      <UiScrollArea class="max-h-[320px]">
        <div v-if="loading" class="text-muted-foreground px-4 py-6 text-center text-sm">
          {{ t('appriseNotify.header.loading') }}
        </div>
        <ul v-else-if="!items.length" class="p-0">
          <li class="text-muted-foreground px-4 py-6 text-center text-sm">
            {{ t('appriseNotify.header.empty') }}
          </li>
        </ul>
        <ul v-else class="p-0">
          <li
            v-for="log in items"
            :key="log.id"
            role="button"
            tabindex="0"
            class="group flex cursor-pointer items-start gap-3 border-b px-4 py-3 transition-colors hover:bg-accent"
            :title="t('appriseNotify.logs.clickToView')"
            @click="openLogDetailFromHeader(log)"
            @keydown.enter.prevent="openLogDetailFromHeader(log)"
          >
            <div
              class="mt-1 size-2 shrink-0 rounded-full"
              :class="log.status === 'success' ? 'bg-green-500' : 'bg-destructive'"
              :title="log.status === 'success' ? t('appriseNotify.header.success') : t('appriseNotify.header.failed')"
            />
            <div class="min-w-0 flex-1 space-y-1">
              <div class="truncate text-sm font-medium">
                {{ rowTitle(log) }}
              </div>
              <div v-if="log.channelName" class="text-muted-foreground text-xs">
                {{ log.channelName }}
              </div>
              <div class="text-muted-foreground line-clamp-2 text-xs">
                {{ rowDescription(log) }}
              </div>
              <div class="text-muted-foreground flex items-center gap-1 text-xs">
                <Clock class="size-3 shrink-0" />
                {{ formatTime(log.createdTime) }}
              </div>
            </div>
          </li>
        </ul>
      </UiScrollArea>
    </UiDropdownMenuContent>
  </UiDropdownMenu>

  <AppriseLogDetailDialog
    v-model:open="logDetailOpen"
    :log="logDetailLog"
    @update:open="onLogDetailOpenChange"
  />
</template>
