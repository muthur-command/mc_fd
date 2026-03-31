<script setup lang="ts">
import { AppWindow, Boxes, Container, Globe, HardDrive, Layers } from 'lucide-vue-next'
/**
 * Docker 插件布局：顶部 Tab 导航 + 子路由内容
 * Tab：Dashboard、Stack、Containers、Images、Volumes、Networks，默认 Dashboard
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { useDockerActiveEnvironment } from '@/plugin/docker/composables/use-docker-active-environment'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { activeEnvironment } = useDockerActiveEnvironment()

const activeEngineDisplayName = computed(() => {
  const a = activeEnvironment.value
  if (a.id === 'local' && !a.name)
    return t('docker.dashboard.local')
  return a.name || a.id
})

const TAB_VALUE = {
  dashboard: 'dashboard',
  stacks: 'stacks',
  containers: 'containers',
  images: 'images',
  volumes: 'volumes',
  networks: 'networks',
} as const

const tabs = [
  { value: TAB_VALUE.dashboard, labelKey: 'docker.sidebar.dashboard', icon: AppWindow },
  { value: TAB_VALUE.stacks, labelKey: 'docker.sidebar.stacks', icon: Layers },
  { value: TAB_VALUE.containers, labelKey: 'docker.sidebar.containers', icon: Container },
  { value: TAB_VALUE.images, labelKey: 'docker.sidebar.images', icon: Boxes },
  { value: TAB_VALUE.volumes, labelKey: 'docker.sidebar.volumes', icon: HardDrive },
  { value: TAB_VALUE.networks, labelKey: 'docker.sidebar.networks', icon: Globe },
]

const currentTab = computed(() => {
  const path = route.path
  if (path === '/plugins/docker' || path === '/plugins/docker/')
    return TAB_VALUE.dashboard
  const segment = path.replace(/^\/plugins\/docker\/?/, '') || 'dashboard'
  return segment as keyof typeof TAB_VALUE
})

function onTabChange(value: string) {
  if (value === currentTab.value)
    return
  router.push(`/plugins/docker/${value}`)
}
</script>

<template>
  <div class="flex min-w-0 flex-col gap-4">
    <UiTabs
      :model-value="currentTab"
      class="w-full min-w-0"
      @update:model-value="onTabChange"
    >
      <!-- 小屏/平板：横向滚动（隐藏滚动条）；大屏：左对齐不换行 -->
      <div class="docker-tabs-scroll w-full min-w-0 overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch]">
        <UiTabsList class="bg-muted/50 text-muted-foreground inline-flex h-auto w-fit flex-nowrap justify-start gap-0.5 rounded-full p-0.5">
          <UiTabsTrigger
            v-for="tab in tabs"
            :key="tab.value"
            :value="tab.value"
            class="shrink-0 rounded-full px-3 py-1.5 text-sm sm:px-4 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <span class="inline-flex items-center gap-1.5">
              <component :is="tab.icon" class="size-3.5 shrink-0" aria-hidden="true" />
              {{ t(tab.labelKey) }}
            </span>
          </UiTabsTrigger>
        </UiTabsList>
      </div>
    </UiTabs>
    <div class="text-muted-foreground flex flex-col gap-1 text-sm">
      <p>{{ t('docker.pageDescription') }}</p>
      <p v-if="currentTab !== 'dashboard'" class="text-foreground/90 font-medium">
        {{ t('docker.layout.activeEngine', { name: activeEngineDisplayName }) }}
      </p>
    </div>
    <div class="min-h-0 flex-1">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.docker-tabs-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.docker-tabs-scroll::-webkit-scrollbar {
  display: none;
}
</style>
