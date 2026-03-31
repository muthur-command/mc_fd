<script setup lang="ts">
import { Bot, MessageSquare, PanelsTopLeft, RefreshCw, Settings, Wifi, WifiOff } from 'lucide-vue-next'
/**
 * OpenClaw 插件布局：与 Control UI 一致的分组 Tab（对话|控制|代理|设置）+ 子 Tab + 连接状态
 */
import { computed, onMounted, provide, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { StatusBadge } from '@/components/ui/status-badge'
import OpenclawGatewayConnectDialog from '@/plugin/openclaw/components/gateway-connect-dialog.vue'
import { useOpenClawAuth } from '@/plugin/openclaw/composables/use-openclaw-auth'
import { useOpenClawConfig } from '@/plugin/openclaw/composables/use-openclaw-config'
import { useOpenClawGateway } from '@/plugin/openclaw/composables/use-openclaw-gateway'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const config = useOpenClawConfig()
const wsUrlRef = computed(() => config.config.value?.wsUrl ?? '')
const auth = useOpenClawAuth(wsUrlRef)
const gateway = useOpenClawGateway(wsUrlRef, auth)

provide('openclaw-config', config)
provide('openclaw-auth', auth)
provide('openclaw-gateway', gateway)

const showConnectDialog = ref(false)

// 与 Control UI navigation.ts TAB_GROUPS 一致：对话 | 控制 | 代理 | 设置（带图标，参考 icon+label 垂直 Tab）
const GROUP_TABS = [
  { group: 'chat' as const, path: 'chat', labelKey: 'openclaw.groupChat', icon: MessageSquare },
  { group: 'control' as const, path: 'overview', labelKey: 'openclaw.groupControl', icon: PanelsTopLeft, subTabs: [
    { path: 'overview', labelKey: 'openclaw.tabs.overview' },
    { path: 'channels', labelKey: 'openclaw.tabs.channels' },
    { path: 'instances', labelKey: 'openclaw.tabs.instances' },
    { path: 'sessions', labelKey: 'openclaw.tabs.sessions' },
    { path: 'usage', labelKey: 'openclaw.tabs.usage' },
    { path: 'cron', labelKey: 'openclaw.tabs.cron' },
  ] },
  { group: 'agents' as const, path: 'agents', labelKey: 'openclaw.groupAgents', icon: Bot, subTabs: [
    { path: 'agents', labelKey: 'openclaw.tabs.agents' },
    { path: 'skills', labelKey: 'openclaw.tabs.skills' },
    { path: 'nodes', labelKey: 'openclaw.tabs.nodes' },
  ] },
  { group: 'settings' as const, path: 'config', labelKey: 'openclaw.groupSettings', icon: Settings, subTabs: [
    { path: 'config', labelKey: 'openclaw.tabs.config' },
    { path: 'communications', labelKey: 'openclaw.tabs.communications' },
    { path: 'appearance', labelKey: 'openclaw.tabs.appearance' },
    { path: 'automation', labelKey: 'openclaw.tabs.automation' },
    { path: 'infrastructure', labelKey: 'openclaw.tabs.infrastructure' },
    { path: 'ai-agents', labelKey: 'openclaw.tabs.aiAgents' },
    { path: 'debug', labelKey: 'openclaw.tabs.debug' },
    { path: 'logs', labelKey: 'openclaw.tabs.logs' },
  ] },
]

const currentSegment = computed(() => {
  const path = route.path
  const segment = path.replace(/^\/plugins\/openclaw\/?/, '') || 'overview'
  return segment
})

const currentGroup = computed(() => {
  const seg = currentSegment.value
  for (const g of GROUP_TABS) {
    if (g.group === 'chat' && seg === 'chat')
      return g
    if (g.subTabs?.some(s => s.path === seg))
      return g
  }
  return GROUP_TABS[1] // 控制
})

const currentSubTab = computed(() => currentSegment.value)

function goGroup(group: (typeof GROUP_TABS)[number]) {
  router.push(`/plugins/openclaw/${group.path}`)
}

function goSubTab(payload: string | number) {
  router.push(`/plugins/openclaw/${String(payload)}`)
}

onMounted(() => {
  config.loadCached()
  if (!config.config.value?.wsUrl) {
    config.fetchConfig().catch(() => {})
  }
})

// 有 wsUrl 且状态为 idle 时自动发起一次连接（刷新后恢复；closed/error 由 composable 的 scheduleReconnect 处理）
watch(
  [wsUrlRef, () => gateway.status],
  ([url, st]) => {
    if (!url || st !== 'idle')
      return
    gateway.connect()
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex min-h-0 min-w-0 flex-1 flex-col gap-0">
    <!-- 顶栏整体：Tab + 连接状态 同一容器 -->
    <div class="flex shrink-0 items-start justify-between gap-2 px-0 py-1">
      <!-- 一级分组在上、二级子 Tab 始终在其下方（宽屏也不并排，避免与右侧状态区抢宽） -->
      <div class="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden">
        <!-- 一级分组：图标在左 + 文字，激活为浅色圆角药丸，非激活透明 -->
        <UiTabs :model-value="currentGroup?.group" class="w-full min-w-0 gap-2">
          <div class="openclaw-tabs-scroll w-full min-w-0 overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch]">
            <UiTabsList class="inline-flex h-auto w-fit flex-nowrap gap-0.5 rounded-lg bg-muted/50 p-1 text-muted-foreground">
              <UiTabsTrigger
                v-for="g in GROUP_TABS"
                :key="g.group"
                :value="g.group"
                class="group inline-flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-xs font-medium text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                @click="goGroup(g)"
              >
                <component
                  :is="g.icon"
                  aria-hidden="true"
                  class="size-4 shrink-0 opacity-60 group-data-[state=active]:opacity-100"
                />
                {{ t(g.labelKey) }}
              </UiTabsTrigger>
            </UiTabsList>
          </div>
        </UiTabs>
        <!-- 二级子 Tab（控制/代理/设置时有） -->
        <UiTabs
          v-if="currentGroup?.subTabs?.length"
          :model-value="currentSubTab"
          class="w-full min-w-0"
          @update:model-value="goSubTab"
        >
          <div class="openclaw-tabs-scroll w-full min-w-0 overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch]">
            <UiTabsList class="bg-muted/30 text-muted-foreground inline-flex h-auto w-fit flex-nowrap justify-start gap-0.5 rounded-full p-0.5">
              <UiTabsTrigger
                v-for="sub in currentGroup.subTabs"
                :key="sub.path"
                :value="sub.path"
                class="shrink-0 rounded-full px-2 py-1.5 text-xs sm:px-3 sm:text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                {{ t(sub.labelKey) }}
              </UiTabsTrigger>
            </UiTabsList>
          </div>
        </UiTabs>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <StatusBadge
          v-if="gateway.connected"
          color="green"
          class="gap-1 text-xs"
        >
          <template #leading>
            <Wifi class="h-3 w-3" />
          </template>
          {{ t('openclaw.connected') }}
        </StatusBadge>
        <StatusBadge
          v-else
          color="red"
          class="gap-1 text-xs"
        >
          <template #leading>
            <WifiOff class="h-3 w-3" />
          </template>
          {{ t('openclaw.disconnected') }}
        </StatusBadge>
        <UiButton size="sm" variant="outline" class="gap-1.5" @click="showConnectDialog = true">
          <RefreshCw v-if="gateway.connected" class="size-4 shrink-0" />
          <Wifi v-else class="size-4 shrink-0" />
          {{ gateway.connected ? t('openclaw.reconnect') : t('openclaw.connect') }}
        </UiButton>
      </div>
    </div>
    <div class="min-h-0 flex-1 overflow-visible pt-1 pl-1 pr-1 pb-1">
      <router-view />
    </div>
    <OpenclawGatewayConnectDialog
      v-model:open="showConnectDialog"
      :config="config"
      :auth="auth"
      :gateway="gateway"
    />
  </div>
</template>

<style scoped>
.openclaw-tabs-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.openclaw-tabs-scroll::-webkit-scrollbar {
  display: none;
}
</style>
