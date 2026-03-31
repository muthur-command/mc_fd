<script setup lang="ts">
import {
  ChevronDown,
  ChevronUp,
  Pencil,
} from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import type { StatusBadgeColor } from '@/components/ui/status-badge'
import type { ContainerDetailResponse } from '@/plugin/docker/api'

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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  connectContainerToNetworkApi,
  disconnectContainerFromNetworkApi,
  getContainerDetailApi,
  getNetworkListApi,
  renameContainerApi,
  updateContainerRestartPolicyApi,
} from '@/plugin/docker/api'

const props = defineProps<{
  open: boolean
  containerId: string | undefined
}>()

const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const { t } = useI18n()
const router = useRouter()

const container = ref<ContainerDetailResponse | null>(null)
const loading = ref(false)
const selectedNetwork = ref<string>('')
const networkOptions = ref<Array<{ label: string, value: string }>>([])
const editingName = ref(false)
const editingNameValue = ref('')
const networkLoading = ref(false)
const detailsOpen = ref(false)
const leaveNetworkTarget = ref<string | null>(null)
const leaveNetworkConfirmOpen = ref(false)

const restartPolicyOptions = [
  { label: 'No', value: 'no' },
  { label: 'Always', value: 'always' },
  { label: 'On Failure', value: 'on-failure' },
  { label: 'Unless Stopped', value: 'unless-stopped' },
]

const selectedRestartPolicy = ref<string>('no')

async function loadDetail() {
  if (!props.containerId)
    return
  container.value = null
  loading.value = true
  try {
    container.value = await getContainerDetailApi(props.containerId)
    selectedRestartPolicy.value = container.value?.restart_policy || 'no'
    await loadNetworkList()
  }
  catch (error) {
    console.error(t('docker.containers.detail.loadDetailFailed'), error)
    toast.error(t('docker.containers.detail.loadDetailFailed'))
  }
  finally {
    loading.value = false
  }
}

async function loadNetworkList() {
  if (!container.value)
    return
  networkLoading.value = true
  try {
    const networks = await getNetworkListApi()
    const connected = container.value.networks?.map(n => n.network) || []
    networkOptions.value = networks
      .filter(n => !connected.includes(n.name))
      .map(n => ({ label: n.name, value: n.name }))
  }
  catch (error) {
    console.error(t('docker.containers.detail.loadNetworkListFailed'), error)
    toast.error(t('docker.containers.detail.loadNetworkListFailed'))
  }
  finally {
    networkLoading.value = false
  }
}

function formatDateTime(dateStr: null | string) {
  if (!dateStr)
    return '—'
  const date = new Date(dateStr)
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US'
  const isZh = locale.startsWith('zh')
  return date
    .toLocaleString(isZh ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    .replace(/\//g, '-')
    .replace(/,/g, '')
}

const statusBadgeColor = computed((): StatusBadgeColor => {
  const s = (container.value?.status ?? '').toLowerCase()
  if (s.includes('running') || s.includes('up'))
    return 'green'
  if (s.includes('exited') || s.includes('stopped') || s.includes('down'))
    return 'red'
  if (s.includes('paused') || s.includes('restarting'))
    return 'yellow'
  return 'gray'
})

function startEditName() {
  if (container.value) {
    editingName.value = true
    editingNameValue.value = container.value.name
  }
}

function cancelEditName() {
  editingName.value = false
  editingNameValue.value = ''
}

async function saveName() {
  if (!editingNameValue.value.trim() || !props.containerId) {
    toast.error(t('docker.containers.detail.containerNameRequired'))
    return
  }
  try {
    await renameContainerApi(props.containerId, editingNameValue.value.trim())
    toast.success(t('docker.containers.detail.containerNameUpdateSuccess'))
    editingName.value = false
    await loadDetail()
  }
  catch (error: any) {
    toast.error(
      error?.response?.data?.msg ?? t('docker.containers.detail.containerNameUpdateFailed'),
    )
  }
}

async function handleUpdateRestartPolicy() {
  if (!props.containerId)
    return
  try {
    await updateContainerRestartPolicyApi(props.containerId, selectedRestartPolicy.value)
    toast.success(t('docker.containers.detail.restartPolicyUpdateSuccess'))
    await loadDetail()
  }
  catch (error: any) {
    toast.error(
      error?.response?.data?.msg ?? t('docker.containers.detail.restartPolicyUpdateFailed'),
    )
  }
}

function openLeaveConfirm(networkName: string) {
  leaveNetworkTarget.value = networkName
  leaveNetworkConfirmOpen.value = true
}

async function confirmLeaveNetwork() {
  if (!leaveNetworkTarget.value || !props.containerId)
    return
  const network = leaveNetworkTarget.value
  leaveNetworkConfirmOpen.value = false
  leaveNetworkTarget.value = null
  try {
    await disconnectContainerFromNetworkApi(props.containerId, network)
    toast.success(t('docker.containers.detail.leftNetworkSuccess', { network }))
    await loadDetail()
  }
  catch (error: any) {
    toast.error(
      error?.response?.data?.msg ?? t('docker.containers.detail.leftNetworkFailed'),
    )
  }
}

async function handleJoinNetwork() {
  if (!selectedNetwork.value || !props.containerId) {
    toast.error(t('docker.containers.detail.selectNetwork'))
    return
  }
  try {
    await connectContainerToNetworkApi(props.containerId, selectedNetwork.value)
    toast.success(t('docker.containers.detail.joinNetworkSuccess', {
      network: selectedNetwork.value,
    }))
    selectedNetwork.value = ''
    await loadDetail()
  }
  catch (error: any) {
    toast.error(
      error?.response?.data?.msg ?? t('docker.containers.detail.joinNetworkFailed'),
    )
  }
}

function extractVolumeName(hostVolume: string): string {
  if (!hostVolume)
    return ''
  const match = hostVolume.match(/\/var\/lib\/docker\/volumes\/([^/]+)\//)
  return match?.[1] ?? hostVolume
}

function navigateToVolumes() {
  router.push('/plugins/docker/volumes')
}

function navigateToNetworks() {
  router.push('/plugins/docker/networks')
}

watch(
  () => [props.open, props.containerId] as const,
  ([open, id]) => {
    if (open && id)
      loadDetail()
  },
)

watch(
  () => props.open,
  (open) => {
    if (!open) {
      container.value = null
      editingName.value = false
      selectedNetwork.value = ''
      leaveNetworkConfirmOpen.value = false
    }
  },
)

onMounted(() => {
  if (props.open && props.containerId)
    loadDetail()
})
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent
      class="max-w-2xl sm:!max-w-2xl max-h-[85vh] flex flex-col gap-4 p-6"
      :show-close-button="true"
    >
      <DialogHeader class="gap-1.5 text-left">
        <DialogTitle>{{ t('docker.containers.modals.detailTitle') }}</DialogTitle>
        <p class="text-muted-foreground text-sm">
          {{ t('docker.containers.detail.containerStatus') }} · {{ t('docker.containers.detail.containerDetails') }}
        </p>
      </DialogHeader>

      <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden gap-6">
        <div v-if="loading && !container" class="py-8 text-center text-muted-foreground text-sm">
          {{ t('docker.containers.detail.loadDetailFailed') }}
        </div>

        <template v-else-if="container">
          <!-- Section: Container status -->
          <section class="space-y-3">
            <h3 class="text-muted-foreground text-sm font-medium">
              {{ t('docker.containers.detail.containerStatus') }}
            </h3>
            <dl class="grid grid-cols-1 gap-y-2.5 text-sm sm:grid-cols-[6.5rem_1fr] sm:gap-x-4">
              <dt class="text-muted-foreground shrink-0">
                {{ t('docker.containers.detail.id') }}
              </dt>
              <dd class="min-w-0">
                <span
                  class="block overflow-x-auto whitespace-nowrap rounded bg-muted/50 px-2 py-1 font-mono text-xs"
                  :title="container.id"
                >
                  {{ container.id }}
                </span>
              </dd>

              <dt class="text-muted-foreground shrink-0">
                {{ t('docker.containers.detail.name') }}
              </dt>
              <dd class="min-w-0">
                <div v-if="!editingName" class="flex items-center gap-2">
                  <span>{{ container.name }}</span>
                  <Button variant="ghost" size="icon" class="h-7 w-7 shrink-0" @click="startEditName">
                    <Pencil class="size-3.5" />
                  </Button>
                </div>
                <div v-else class="flex flex-wrap items-center gap-2">
                  <Input
                    v-model="editingNameValue"
                    :placeholder="t('docker.containers.detail.enterContainerName')"
                    class="h-8 max-w-[200px]"
                    @keydown.enter="saveName"
                  />
                  <Button size="sm" @click="saveName">
                    {{ t('docker.containers.detail.save') }}
                  </Button>
                  <Button size="sm" variant="outline" @click="cancelEditName">
                    {{ t('docker.containers.detail.cancel') }}
                  </Button>
                </div>
              </dd>

              <dt class="text-muted-foreground shrink-0">
                {{ t('docker.containers.detail.ipAddress') }}
              </dt>
              <dd>{{ container.ip_address || '—' }}</dd>

              <dt class="text-muted-foreground shrink-0">
                {{ t('docker.containers.detail.status') }}
              </dt>
              <dd>
                <StatusBadge :color="statusBadgeColor">
                  {{ container.status }}
                </StatusBadge>
              </dd>

              <dt class="text-muted-foreground shrink-0">
                {{ t('docker.containers.detail.created') }}
              </dt>
              <dd class="tabular-nums">
                {{ formatDateTime(container.created) }}
              </dd>

              <dt class="text-muted-foreground shrink-0">
                {{ t('docker.containers.detail.startTime') }}
              </dt>
              <dd class="tabular-nums">
                {{ formatDateTime(container.started_at) }}
              </dd>
            </dl>
          </section>

          <!-- Section: Container details (collapsible) -->
          <section class="space-y-3">
            <Collapsible v-model:open="detailsOpen">
              <div class="flex items-center justify-between">
                <h3 class="text-muted-foreground text-sm font-medium">
                  {{ t('docker.containers.detail.containerDetails') }}
                </h3>
                <CollapsibleTrigger as-child>
                  <Button variant="ghost" size="sm" class="h-7 gap-1 -mr-2">
                    <ChevronDown v-if="!detailsOpen" class="size-4" />
                    <ChevronUp v-else class="size-4" />
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent class="space-y-3 pt-2">
                <dl class="grid grid-cols-1 gap-y-2.5 text-sm sm:grid-cols-[6.5rem_1fr] sm:gap-x-4">
                  <dt class="text-muted-foreground shrink-0">
                    {{ t('docker.containers.detail.image') }}
                  </dt>
                  <dd class="min-w-0 font-mono text-xs break-all">
                    {{ container.image || '—' }}
                  </dd>

                  <template v-if="container.port_configuration?.length">
                    <dt class="text-muted-foreground shrink-0">
                      {{ t('docker.containers.detail.portConfiguration') }}
                    </dt>
                    <dd class="min-w-0">
                      <ul class="list-inside list-disc font-mono text-xs">
                        <li v-for="(port, i) in container.port_configuration" :key="i">
                          {{ port }}
                        </li>
                      </ul>
                    </dd>
                  </template>

                  <dt class="text-muted-foreground shrink-0">
                    {{ t('docker.containers.detail.cmd') }}
                  </dt>
                  <dd class="min-w-0 font-mono text-xs">
                    {{ container.command?.length ? container.command.join(' ') : '—' }}
                  </dd>

                  <dt class="text-muted-foreground shrink-0">
                    {{ t('docker.containers.detail.entrypoint') }}
                  </dt>
                  <dd class="min-w-0 font-mono text-xs">
                    {{ container.entrypoint?.length ? container.entrypoint.join(' ') : '—' }}
                  </dd>

                  <div v-if="container.env?.length" class="contents">
                    <dt class="text-muted-foreground shrink-0">
                      {{ t('docker.containers.detail.env') }}
                    </dt>
                    <dd class="min-w-0 max-h-32 overflow-y-auto rounded border bg-muted/30 p-2 font-mono text-xs">
                      <div v-for="(env, i) in container.env" :key="i">
                        {{ env }}
                      </div>
                    </dd>
                  </div>

                  <div v-if="container.labels && Object.keys(container.labels).length" class="contents">
                    <dt class="text-muted-foreground shrink-0">
                      {{ t('docker.containers.detail.labels') }}
                    </dt>
                    <dd class="min-w-0 max-h-32 overflow-y-auto rounded border bg-muted/30 p-2 text-xs">
                      <div v-for="(value, key) in container.labels" :key="key">
                        <span class="font-medium">{{ key }}:</span> {{ value }}
                      </div>
                    </dd>
                  </div>

                  <dt class="text-muted-foreground shrink-0">
                    {{ t('docker.containers.detail.restartPolicies') }}
                  </dt>
                  <dd class="min-w-0 flex flex-wrap items-center gap-2">
                    <Select v-model="selectedRestartPolicy">
                      <SelectTrigger class="h-8 w-[10rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="opt in restartPolicyOptions" :key="opt.value" :value="opt.value">
                          {{ opt.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" @click="handleUpdateRestartPolicy">
                      {{ t('docker.containers.detail.update') }}
                    </Button>
                  </dd>
                </dl>
              </CollapsibleContent>
            </Collapsible>
          </section>

          <!-- Section: Volumes -->
          <section class="space-y-3">
            <h3 class="text-muted-foreground text-sm font-medium">
              {{ t('docker.containers.detail.volumes') }}
            </h3>
            <div v-if="container.volumes?.length" class="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{{ t('docker.containers.detail.hostVolume') }}</TableHead>
                    <TableHead>{{ t('docker.containers.detail.pathInContainer') }}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="(vol, i) in container.volumes" :key="i">
                    <TableCell>
                      <button type="button" class="text-primary hover:underline font-mono text-xs" @click="navigateToVolumes">
                        {{ extractVolumeName(vol.host_volume) }}
                      </button>
                    </TableCell>
                    <TableCell class="font-mono text-xs">
                      {{ vol.container_path }}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <p v-else class="text-muted-foreground text-sm">
              —
            </p>
          </section>

          <!-- Section: Connected networks -->
          <section class="space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="text-muted-foreground text-sm font-medium">
                {{ t('docker.containers.detail.connectedNetworks') }}
              </h3>
              <div class="flex flex-wrap items-center gap-2">
                <Select v-model="selectedNetwork" :disabled="networkLoading">
                  <SelectTrigger class="h-8 w-[10rem]">
                    <SelectValue :placeholder="t('docker.containers.detail.selectNetwork')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="opt in networkOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" :disabled="!selectedNetwork" @click="handleJoinNetwork">
                  {{ t('docker.containers.detail.joinNetwork') }}
                </Button>
              </div>
            </div>
            <div v-if="container.networks?.length" class="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{{ t('docker.containers.detail.network') }}</TableHead>
                    <TableHead>{{ t('docker.containers.detail.ipAddress') }}</TableHead>
                    <TableHead>{{ t('docker.containers.detail.gateway') }}</TableHead>
                    <TableHead class="w-[6rem]">
                      {{ t('docker.containers.detail.actions') }}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="net in container.networks" :key="net.network">
                    <TableCell>
                      <button type="button" class="text-primary hover:underline font-mono text-xs" @click="navigateToNetworks">
                        {{ net.network }}
                      </button>
                    </TableCell>
                    <TableCell class="font-mono text-xs">
                      {{ net.ip_address }}
                    </TableCell>
                    <TableCell class="font-mono text-xs">
                      {{ net.gateway }}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="destructive" class="h-7" @click="openLeaveConfirm(net.network)">
                        {{ t('docker.containers.detail.leaveNetwork') }}
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <p v-else class="text-muted-foreground text-sm">
              —
            </p>
          </section>
        </template>
      </div>
    </DialogContent>
  </Dialog>

  <!-- Leave network confirmation -->
  <AlertDialog v-model:open="leaveNetworkConfirmOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('docker.containers.detail.confirmLeaveNetwork') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ t('docker.containers.detail.confirmLeaveNetworkContent', { network: leaveNetworkTarget || '' }) }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('docker.containers.detail.cancel') }}</AlertDialogCancel>
        <AlertDialogAction class="bg-destructive text-destructive-foreground" @click="confirmLeaveNetwork">
          {{ t('docker.containers.detail.leaveNetwork') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
