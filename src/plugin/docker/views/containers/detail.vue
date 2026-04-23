<script setup lang="ts">
import {
  Button,
  Card,
  Descriptions,
  Input,
  message,
  Modal,
  Select,
} from 'ant-design-vue'
import { CheckCircle, ChevronDown, ChevronUp, Pencil } from 'lucide-vue-next'
import { computed, h, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import type { ContainerDetailResponse } from '@/plugin/docker/api'

import { useTanStackTable } from '@/adapter/tanstack-table'
import {
  connectContainerToNetworkApi,
  disconnectContainerFromNetworkApi,
  getContainerDetailApi,
  getNetworkListApi,
  renameContainerApi,
  updateContainerRestartPolicyApi,
} from '@/plugin/docker/api'

const props = defineProps<{
  containerId: string
}>()

const { t } = useI18n()
const router = useRouter()

const container = ref<ContainerDetailResponse | null>(null)
const loading = ref(false)
const selectedNetwork = ref<string | undefined>(undefined)
const networkOptions = ref<Array<{ label: string, value: string }>>([])
const editingName = ref(false)
const editingNameValue = ref('')
const networkLoading = ref(false)
const containerDetailsCollapsed = ref(true)
const selectedRestartPolicy = ref<string>('no')

async function loadDetail() {
  container.value = null
  loading.value = true
  try {
    container.value = await getContainerDetailApi(props.containerId)
    selectedRestartPolicy.value = container.value?.restart_policy || 'no'
    await loadNetworkList()
  }
  catch (error) {
    console.error(t('docker.containers.detail.loadDetailFailed'), error)
  }
  finally {
    loading.value = false
  }
}

// 监听 containerId 变化，当切换容器时重新加载数据
watch(
  () => props.containerId,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      loadDetail()
    }
  },
  { immediate: false },
)

onMounted(() => {
  loadDetail()
})

// 加载网络列表
async function loadNetworkList() {
  networkLoading.value = true
  try {
    const networks = await getNetworkListApi()
    // 过滤掉容器已连接的网络
    const connectedNetworks
      = container.value?.networks?.map(n => n.network) || []
    networkOptions.value = networks
      .filter(n => !connectedNetworks.includes(n.name))
      .map(n => ({
        label: n.name,
        value: n.name,
      }))
  }
  catch (error) {
    console.error(t('docker.containers.detail.loadNetworkListFailed'), error)
    message.error(t('docker.containers.detail.loadNetworkListFailed'))
  }
  finally {
    networkLoading.value = false
  }
}

// 格式化时间戳
function formatDateTime(dateStr: null | string) {
  if (!dateStr)
    return '-'
  const date = new Date(dateStr)
  return date
    .toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    .replaceAll('/', '-')
}

// 判断状态是否为运行中
const isRunning = computed(() => {
  return container.value?.status?.toLowerCase().includes('running') || false
})

// 重启策略选项
const restartPolicyOptions = [
  { label: 'No', value: 'no' },
  { label: 'Always', value: 'always' },
  { label: 'On Failure', value: 'on-failure' },
  { label: 'Unless Stopped', value: 'unless-stopped' },
]

// 更新重启策略
async function handleUpdateRestartPolicy() {
  try {
    await updateContainerRestartPolicyApi(
      props.containerId,
      selectedRestartPolicy.value,
    )
    message.success(t('docker.containers.detail.restartPolicyUpdateSuccess'))
    // 重新加载容器详情
    await loadDetail()
  }
  catch (error: any) {
    console.error(
      t('docker.containers.detail.restartPolicyUpdateFailed'),
      error,
    )
    message.error(
      error?.response?.data?.msg
      || t('docker.containers.detail.restartPolicyUpdateFailed'),
    )
  }
}

// 开始编辑名称
function startEditName() {
  if (container.value) {
    editingName.value = true
    editingNameValue.value = container.value.name
  }
}

// 取消编辑名称
function cancelEditName() {
  editingName.value = false
  editingNameValue.value = ''
}

// 保存名称
async function saveName() {
  if (!editingNameValue.value.trim()) {
    message.warning(t('docker.containers.detail.containerNameRequired'))
    return
  }
  try {
    await renameContainerApi(props.containerId, editingNameValue.value.trim())
    message.success(t('docker.containers.detail.containerNameUpdateSuccess'))
    editingName.value = false
    // 重新加载容器详情
    await loadDetail()
  }
  catch (error: any) {
    console.error(
      t('docker.containers.detail.containerNameUpdateFailed'),
      error,
    )
    message.error(
      error?.response?.data?.msg
      || t('docker.containers.detail.containerNameUpdateFailed'),
    )
  }
}

// 离开网络
async function handleLeaveNetwork(networkName: string) {
  Modal.confirm({
    title: t('docker.containers.detail.confirmLeaveNetwork'),
    content: t('docker.containers.detail.confirmLeaveNetworkContent', {
      network: networkName,
    }),
    centered: true,
    onOk: async () => {
      try {
        await disconnectContainerFromNetworkApi(props.containerId, networkName)
        message.success(
          t('docker.containers.detail.leftNetworkSuccess', {
            network: networkName,
          }),
        )
        await loadDetail()
      }
      catch (error: any) {
        console.error(t('docker.containers.detail.leftNetworkFailed'), error)
        message.error(
          error?.response?.data?.msg
          || t('docker.containers.detail.leftNetworkFailed'),
        )
      }
    },
  })
}

// 加入网络
async function handleJoinNetwork() {
  if (!selectedNetwork.value) {
    message.warning(t('docker.containers.detail.selectNetwork'))
    return
  }
  try {
    await connectContainerToNetworkApi(
      props.containerId,
      selectedNetwork.value,
    )
    message.success(
      t('docker.containers.detail.joinNetworkSuccess', {
        network: selectedNetwork.value,
      }),
    )
    selectedNetwork.value = undefined
    await loadDetail()
  }
  catch (error: any) {
    console.error(t('docker.containers.detail.joinNetworkFailed'), error)
    message.error(
      error?.response?.data?.msg
      || t('docker.containers.detail.joinNetworkFailed'),
    )
  }
}

// 从 host_volume 路径中提取卷名
// 例如: /var/lib/docker/volumes/mc_redis/_data -> mc_redis
function extractVolumeName(hostVolume: string): string {
  if (!hostVolume)
    return ''
  // 匹配 /var/lib/docker/volumes/{volume_name}/_data 格式
  const match = hostVolume.match(/\/var\/lib\/docker\/volumes\/([^/]+)\//)
  if (match && match[1]) {
    return match[1]
  }
  // 如果不是标准路径，返回原值
  return hostVolume
}

// 跳转到 Volumes 页面
function navigateToVolumes() {
  router.push('/plugins/docker/volumes')
}

// 跳转到 Networks 页面
function navigateToNetworks() {
  router.push('/plugins/docker/networks')
}

// Volumes表格列定义
const volumeColumns = computed(() => [
  {
    field: 'host_volume',
    title: t('docker.containers.detail.hostVolume'),
    align: 'left' as const,
    width: 180,
    formatter: (_value: any, row: any) => {
      if (!row?.host_volume)
        return '-'
      return h(
        'a',
        {
          class:
            'text-blue-500 hover:text-blue-700 hover:underline cursor-pointer',
          onClick: (e: Event) => {
            e.stopPropagation()
            navigateToVolumes()
          },
        },
        extractVolumeName(row.host_volume),
      )
    },
  },
  {
    field: 'container_path',
    title: t('docker.containers.detail.pathInContainer'),
    align: 'left' as const,
    width: 180,
    formatter: (_value: any, row: any) => row?.container_path || '-',
  },
])

// Networks表格列定义
const networkColumns = computed(() => [
  {
    field: 'network',
    title: t('docker.containers.detail.network'),
    align: 'left' as const,
    width: 180,
    formatter: (_value: any, row: any) => {
      if (!row?.network)
        return '-'
      return h(
        'a',
        {
          class:
            'text-blue-500 hover:text-blue-700 hover:underline cursor-pointer',
          onClick: (e: Event) => {
            e.stopPropagation()
            navigateToNetworks()
          },
        },
        row.network,
      )
    },
  },
  {
    field: 'ip_address',
    title: t('docker.containers.detail.ipAddress'),
    align: 'left' as const,
    width: 150,
    formatter: (_value: any, row: any) => row?.ip_address || '-',
  },
  {
    field: 'gateway',
    title: t('docker.containers.detail.gateway'),
    align: 'left' as const,
    width: 150,
    formatter: (_value: any, row: any) => row?.gateway || '-',
  },
  {
    field: 'actions',
    title: t('docker.containers.detail.actions'),
    align: 'left' as const,
    width: 100,
    formatter: (_value: any, row: any) => {
      if (!row?.network)
        return '-'
      return h(
        Button,
        {
          type: 'primary',
          danger: true,
          size: 'small',
          onClick: () => handleLeaveNetwork(row.network),
          style: { borderRadius: 'var(--radius)' },
        },
        () => t('docker.containers.detail.leaveNetwork'),
      )
    },
  },
])

// Volumes表格实例
const { Table: VolumesTable, tableApi: volumesTableApi }
  = useTanStackTable<any>({
    tableOptions: computed(() => ({
      columns: volumeColumns.value,
      data: [],
      rowKey: (record: any) => `${record.host_volume}-${record.container_path}`,
      pagination: false,
      scrollY: undefined,
    })) as any,
    queryFn: async () => ({ items: container.value?.volumes || [] }),
  })

watch(
  () => container.value?.volumes,
  () => {
    volumesTableApi?.refresh()
  },
  { deep: true },
)

// Networks表格实例
const { Table: NetworksTable, tableApi: networksTableApi }
  = useTanStackTable<any>({
    tableOptions: computed(() => ({
      columns: networkColumns.value,
      data: [],
      rowKey: (record: any) => record.network,
      pagination: false,
      scrollY: undefined,
    })) as any,
    queryFn: async () => ({ items: container.value?.networks || [] }),
  })

watch(
  () => container.value?.networks,
  () => {
    networksTableApi?.refresh()
  },
  { deep: true },
)
</script>

<template>
  <div v-if="container" class="container-detail-content">
    <!-- Container status 卡片 -->
    <Card
      :loading="loading"
      class="container-details-card mb-2"
      style="overflow: hidden; border-radius: var(--radius)"
    >
      <template #title>
        <div class="flex items-center gap-2">
          <span>{{ t('docker.containers.detail.containerStatus') }}</span>
        </div>
      </template>
      <Descriptions :column="1" bordered>
        <Descriptions.Item :label="t('docker.containers.detail.id')">
          <code class="text-xs">{{ container.id }}</code>
        </Descriptions.Item>
        <Descriptions.Item :label="t('docker.containers.detail.name')">
          <div v-if="!editingName" class="flex items-center gap-2">
            <span>{{ container.name }}</span>
            <Pencil
              class="cursor-pointer size-3.5 text-gray-400 hover:text-gray-600"
              @click="startEditName"
            />
          </div>
          <div v-else class="flex items-center gap-2">
            <Input
              v-model:value="editingNameValue"
              :placeholder="t('docker.containers.detail.enterContainerName')"
              style="width: 200px; border-radius: var(--radius)"
              @press-enter="saveName"
            />
            <Button
              type="primary"
              size="small"
              style="border-radius: var(--radius)"
              @click="saveName"
            >
              {{ t('docker.containers.detail.save') }}
            </Button>
            <Button
              size="small"
              style="border-radius: var(--radius)"
              @click="cancelEditName"
            >
              {{ t('docker.containers.detail.cancel') }}
            </Button>
          </div>
        </Descriptions.Item>
        <Descriptions.Item :label="t('docker.containers.detail.ipAddress')">
          {{ container.ip_address || '-' }}
        </Descriptions.Item>
        <Descriptions.Item :label="t('docker.containers.detail.status')">
          <div class="flex items-center gap-2">
            <CheckCircle
              v-if="isRunning"
              class="size-4 text-green-500"
            />
            <span>{{ container.status }}</span>
          </div>
        </Descriptions.Item>
        <Descriptions.Item :label="t('docker.containers.detail.created')">
          {{ formatDateTime(container.created) }}
        </Descriptions.Item>
        <Descriptions.Item :label="t('docker.containers.detail.startTime')">
          {{ formatDateTime(container.started_at) }}
        </Descriptions.Item>
      </Descriptions>
    </Card>

    <!-- Container details 卡片 -->
    <Card
      :loading="loading"
      class="collapsible-card mb-2"
      :class="{ 'collapsed-card': containerDetailsCollapsed }"
      style="overflow: hidden; border-radius: var(--radius)"
    >
      <template #title>
        <div class="flex items-center justify-between">
          <span>{{ t('docker.containers.detail.containerDetails') }}</span>
          <component
            :is="containerDetailsCollapsed ? ChevronDown : ChevronUp"
            class="cursor-pointer size-4 text-gray-400 hover:text-gray-600"
            @click="containerDetailsCollapsed = !containerDetailsCollapsed"
          />
        </div>
      </template>
      <div v-if="!containerDetailsCollapsed">
        <Descriptions :column="1" bordered>
          <Descriptions.Item :label="t('docker.containers.detail.image')">
            <code class="break-all text-sm">{{ container.image || '-' }}</code>
          </Descriptions.Item>

          <Descriptions.Item
            :label="t('docker.containers.detail.portConfiguration')"
          >
            <div v-if="container.port_configuration?.length" class="space-y-1">
              <div
                v-for="(port, index) in container.port_configuration"
                :key="index"
                class="font-mono text-sm"
              >
                {{ port }}
              </div>
            </div>
            <span v-else>-</span>
          </Descriptions.Item>

          <Descriptions.Item :label="t('docker.containers.detail.cmd')">
            <code v-if="container.command?.length" class="text-sm">
              {{ container.command.join(' ') }}
            </code>
            <span v-else>-</span>
          </Descriptions.Item>

          <Descriptions.Item :label="t('docker.containers.detail.entrypoint')">
            <code v-if="container.entrypoint?.length" class="text-sm">
              {{ container.entrypoint.join(' ') }}
            </code>
            <span v-else>-</span>
          </Descriptions.Item>

          <Descriptions.Item :label="t('docker.containers.detail.env')">
            <div
              v-if="container.env?.length"
              class="max-h-60 space-y-1 overflow-y-auto"
            >
              <div
                v-for="(env, index) in container.env"
                :key="index"
                class="font-mono text-sm"
              >
                {{ env }}
              </div>
            </div>
            <span v-else>-</span>
          </Descriptions.Item>

          <Descriptions.Item :label="t('docker.containers.detail.labels')">
            <div
              v-if="
                container.labels && Object.keys(container.labels).length > 0
              "
              class="max-h-60 space-y-1 overflow-y-auto"
            >
              <div
                v-for="(value, key) in container.labels"
                :key="key"
                class="text-sm"
              >
                <span class="font-semibold">{{ key }}:</span> {{ value }}
              </div>
            </div>
            <span v-else>-</span>
          </Descriptions.Item>

          <Descriptions.Item
            :label="t('docker.containers.detail.restartPolicies')"
          >
            <div class="flex items-center gap-2">
              <Select
                v-model:value="selectedRestartPolicy"
                :options="restartPolicyOptions"
                style="width: 200px; border-radius: var(--radius)"
              />
              <Button type="primary" @click="handleUpdateRestartPolicy">
                {{ t('docker.containers.detail.update') }}
              </Button>
            </div>
          </Descriptions.Item>
        </Descriptions>
      </div>
    </Card>

    <!-- Volumes 卡片 -->
    <Card
      :loading="loading"
      class="container-details-card mb-2"
      style="overflow: hidden; border-radius: var(--radius)"
    >
      <template #title>
        <div class="flex items-center gap-2">
          <span>{{ t('docker.containers.detail.volumes') }}</span>
        </div>
      </template>
      <div
        v-if="container.volumes?.length"
        class="volumes-table-container flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <VolumesTable />
      </div>
      <div v-else class="py-4 text-center text-gray-400">
        -
      </div>
    </Card>

    <!-- Connected Networks 卡片 -->
    <Card
      :loading="loading"
      class="container-details-card mb-2"
      style="overflow: hidden; border-radius: var(--radius)"
    >
      <template #title>
        <div class="flex items-center gap-2">
          <span>{{ t('docker.containers.detail.connectedNetworks') }}</span>
        </div>
      </template>
      <template #extra>
        <div class="flex items-center gap-2">
          <Select
            v-model:value="selectedNetwork"
            :placeholder="t('docker.containers.detail.selectNetwork')"
            style="width: 200px; border-radius: var(--radius)"
            :options="networkOptions"
            :loading="networkLoading"
            :disabled="networkLoading"
          />
          <Button
            type="primary"
            style="border-radius: var(--radius)"
            @click="handleJoinNetwork"
          >
            {{ t('docker.containers.detail.joinNetwork') }}
          </Button>
        </div>
      </template>
      <div
        v-if="container.networks?.length"
        class="networks-table-container flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <NetworksTable />
      </div>
      <div v-else class="py-4 text-center text-gray-400">
        -
      </div>
    </Card>
  </div>
</template>

<style scoped>
.space-y-1 > * + * {
  margin-top: 0.25rem;
}

/* 可折叠卡片：当折叠时隐藏 body 元素 */
:deep(.collapsible-card.collapsed-card .ant-card-body) {
  display: none !important;
}

:deep(.collapsible-card.collapsed-card .ant-card-head) {
  border-bottom: none !important;
}

/* 移除所有圆角 */
:deep(.ant-table),
:deep(.ant-table-container),
:deep(.ant-table-content),
:deep(.ant-table-thead > tr > th),
:deep(.ant-table-tbody > tr > td) {
  border-radius: 0 !important;
}

/* Descriptions 组件样式 */
:deep(.ant-descriptions),
:deep(.ant-descriptions-bordered),
:deep(.ant-descriptions-view),
:deep(.ant-descriptions-view-table),
:deep(.ant-descriptions-table) {
  width: 100% !important;
  margin: 0 !important;
  overflow: hidden !important;
  border-radius: 0 !important;
}

:deep(.ant-descriptions-table > tbody > tr > th),
:deep(.ant-descriptions-table > tbody > tr > td),
:deep(.ant-descriptions-table > tbody > tr .ant-descriptions-item-label),
:deep(.ant-descriptions-table > tbody > tr .ant-descriptions-item-content) {
  border-radius: 0 !important;
}

/* 表格容器通用样式 */
:deep(.ant-card-body) {
  padding: 0 !important;
}

:deep(.ant-card-body > .ant-descriptions),
:deep(.ant-card-body > .ant-table-wrapper),
:deep(.ant-card-body > .ant-table) {
  width: 100% !important;
  margin: 0 !important;
  overflow: hidden !important;
}

/* Volumes 和 Networks 表格容器通用样式 */
.volumes-table-container,
.networks-table-container {
  :deep(.bg-card) {
    padding: 0 !important;
    border-radius: 0 !important;
  }

  :deep(.bg-card),
  :deep(.tanstack-table-scroll-container),
  :deep(.ant-table-container),
  :deep(.ant-table-content),
  :deep(.tanstack-table-wrapper .ant-table-body) {
    scrollbar-color: transparent transparent !important;
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }

  :deep(.bg-card)::-webkit-scrollbar,
  :deep(.tanstack-table-scroll-container)::-webkit-scrollbar,
  :deep(.ant-table-container)::-webkit-scrollbar,
  :deep(.ant-table-content)::-webkit-scrollbar,
  :deep(.tanstack-table-wrapper .ant-table-body)::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }

  :deep(.ant-table),
  :deep(.ant-table-container),
  :deep(.ant-table-content) {
    width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    border-radius: 0 !important;
  }

  /* :deep(.ant-table-header table th:first-child),
  :deep(.ant-table-header thead th:first-child),
  :deep(.ant-table-container .ant-table-header table th:first-child),
  :deep(.ant-table-content .ant-table-header table th:first-child),
  :deep(.tanstack-table-wrapper .ant-table-header table th:first-child) {
    border-top-left-radius: 0 !important;
  }

  :deep(.ant-table-header table th:last-child),
  :deep(.ant-table-header thead th:last-child),
  :deep(.ant-table-container .ant-table-header table th:last-child),
  :deep(.ant-table-content .ant-table-header table th:last-child),
  :deep(.tanstack-table-wrapper .ant-table-header table th:last-child) {
    border-top-right-radius: 0 !important;
  } */

  :deep(.ant-table-header table),
  :deep(.ant-table-header thead),
  :deep(.ant-table-container),
  :deep(.ant-table-content) {
    border-top-left-radius: 0 !important;
    border-top-right-radius: 0 !important;
  }
}

/* Container Details 内容容器滚动样式 */
.container-detail-content {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  scrollbar-color: transparent transparent;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.container-detail-content::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
</style>
