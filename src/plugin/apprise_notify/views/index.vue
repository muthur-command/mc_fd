<script lang="ts" setup>
/**
 * Apprise 通知：通道配置与发送历史（后端插件 apprise_notify）
 */
import { Bell, Pencil, Plus, Send, Trash2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'

import { BasicPage } from '@/components/global-layout'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/stores/auth'

import type { AppriseChannel, AppriseLogItem } from '../api'

import {
  createAppriseChannelApi,
  deleteAppriseChannelApi,
  getAppriseChannelApi,
  listAppriseChannelsApi,
  listAppriseLogsApi,
  notifyAppriseChannelsApi,
  testAppriseChannelApi,
  updateAppriseChannelApi,
} from '../api'
import AppriseLogDetailDialog from '../components/AppriseLogDetailDialog.vue'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()

const tab = ref<'channels' | 'logs'>('channels')

function applyTabFromRouteQuery() {
  const q = route.query.tab
  if (q === 'logs' || q === 'history')
    tab.value = 'logs'
}

watch(
  () => route.query.tab,
  () => applyTabFromRouteQuery(),
  { immediate: true },
)
const channels = ref<AppriseChannel[]>([])
const logs = ref<AppriseLogItem[]>([])
const logPage = ref(1)
const logTotalPages = ref(0)
const logTotal = ref(0)
const pageSize = 20
const loadingChannels = ref(false)
const loadingLogs = ref(false)
const saving = ref(false)

const channelDialog = ref(false)
const editingId = ref<number | null>(null)
const formName = ref('')
const formUrl = ref('')
const formEnabled = ref(true)
const formDescription = ref('')

const notifyDialog = ref(false)
const notifyTitle = ref('')
const notifyBody = ref('')
const notifySelectedIds = ref<number[]>([])
const sending = ref(false)

watch(
  () => authStore.isLogin,
  (ok) => {
    if (ok) {
      void loadChannels()
      void loadLogs()
    }
    else {
      channels.value = []
      logs.value = []
    }
  },
  { immediate: true },
)

watch(tab, (v) => {
  if (v === 'logs' && authStore.isLogin)
    void loadLogs()
})

async function loadChannels() {
  if (!authStore.isLogin)
    return
  loadingChannels.value = true
  try {
    channels.value = await listAppriseChannelsApi()
  }
  catch {
    toast.error(t('appriseNotify.toast.loadChannelsError'))
  }
  finally {
    loadingChannels.value = false
  }
}

async function loadLogs() {
  if (!authStore.isLogin)
    return
  loadingLogs.value = true
  try {
    const data = await listAppriseLogsApi(logPage.value, pageSize)
    logs.value = data.items
    logTotal.value = data.total
    logTotalPages.value = Math.max(1, data.totalPages || 0)
  }
  catch {
    toast.error(t('appriseNotify.toast.loadLogsError'))
  }
  finally {
    loadingLogs.value = false
  }
}

function openCreate() {
  editingId.value = null
  formName.value = ''
  formUrl.value = ''
  formEnabled.value = true
  formDescription.value = ''
  channelDialog.value = true
}

async function openEdit(row: AppriseChannel) {
  editingId.value = row.id
  try {
    const full = await getAppriseChannelApi(row.id)
    formName.value = full.name
    formUrl.value = full.appriseUrl ?? ''
    formEnabled.value = full.enabled
    formDescription.value = full.description ?? ''
    channelDialog.value = true
  }
  catch {
    toast.error(t('appriseNotify.toast.loadChannelsError'))
  }
}

async function saveChannel() {
  if (!formName.value.trim() || !formUrl.value.trim()) {
    toast.error(t('appriseNotify.toast.fillRequired'))
    return
  }
  saving.value = true
  try {
    if (editingId.value == null) {
      await createAppriseChannelApi({
        name: formName.value.trim(),
        appriseUrl: formUrl.value.trim(),
        enabled: formEnabled.value,
        description: formDescription.value.trim() || null,
      })
    }
    else {
      await updateAppriseChannelApi(editingId.value, {
        name: formName.value.trim(),
        appriseUrl: formUrl.value.trim(),
        enabled: formEnabled.value,
        description: formDescription.value.trim() || null,
      })
    }
    toast.success(t('appriseNotify.toast.saved'))
    channelDialog.value = false
    await loadChannels()
  }
  catch {
    /* 全局 toast */
  }
  finally {
    saving.value = false
  }
}

async function removeChannel(row: AppriseChannel) {
  try {
    await deleteAppriseChannelApi(row.id)
    toast.success(t('appriseNotify.toast.deleted'))
    await loadChannels()
  }
  catch {
    /* global */
  }
}

async function testChannel(row: AppriseChannel) {
  try {
    await testAppriseChannelApi(row.id, {})
    toast.success(t('appriseNotify.toast.testOk'))
    await loadLogs()
  }
  catch {
    /* global */
  }
}

function openNotify() {
  const enabled = channels.value.filter(c => c.enabled)
  notifySelectedIds.value = enabled.map(c => c.id)
  notifyTitle.value = ''
  notifyBody.value = ''
  notifyDialog.value = true
}

function toggleNotifyId(id: number) {
  const i = notifySelectedIds.value.indexOf(id)
  if (i >= 0)
    notifySelectedIds.value.splice(i, 1)
  else
    notifySelectedIds.value.push(id)
}

async function submitNotify() {
  if (!notifySelectedIds.value.length) {
    toast.error(t('appriseNotify.channels.pickChannels'))
    return
  }
  sending.value = true
  try {
    const res = await notifyAppriseChannelsApi({
      channelIds: notifySelectedIds.value,
      title: notifyTitle.value,
      body: notifyBody.value,
    })
    if (res.allSuccess)
      toast.success(t('appriseNotify.toast.notifyOk'))
    else
      toast.warning(t('appriseNotify.toast.notifyPartial'))
    notifyDialog.value = false
    await loadLogs()
  }
  catch {
    /* global */
  }
  finally {
    sending.value = false
  }
}

function formatTime(ms: number) {
  if (!ms)
    return '—'
  return new Date(ms).toLocaleString()
}

function bodyPreview(text: string, max = 80) {
  const s = text?.replace(/\s+/g, ' ').trim() ?? ''
  return s.length > max ? `${s.slice(0, max)}…` : s
}

const logDetailOpen = ref(false)
const logDetailLog = ref<AppriseLogItem | null>(null)

function openLogDetail(log: AppriseLogItem) {
  logDetailLog.value = log
  logDetailOpen.value = true
}

function onLogDetailOpenChange(open: boolean) {
  if (!open)
    logDetailLog.value = null
}
</script>

<template>
  <BasicPage
    :title="t('appriseNotify.pageTitle')"
    :description="t('appriseNotify.pageDescription')"
  >
    <div class="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <Tabs v-model="tab" class="w-full">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="channels">
              {{ t('appriseNotify.tabs.channels') }}
            </TabsTrigger>
            <TabsTrigger value="logs">
              {{ t('appriseNotify.tabs.logs') }}
            </TabsTrigger>
          </TabsList>
          <div v-if="tab === 'channels'" class="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" :disabled="!channels.filter(c => c.enabled).length" @click="openNotify">
              <Send class="mr-1 size-4" />
              {{ t('appriseNotify.channels.send') }}
            </Button>
            <Button size="sm" @click="openCreate">
              <Plus class="mr-1 size-4" />
              {{ t('appriseNotify.channels.add') }}
            </Button>
          </div>
          <Button
            v-else
            variant="outline"
            size="sm"
            :disabled="loadingLogs"
            @click="loadLogs"
          >
            {{ t('appriseNotify.logs.refresh') }}
          </Button>
        </div>

        <TabsContent value="channels" class="mt-4">
          <Card>
            <CardHeader class="flex flex-row items-center gap-2 space-y-0">
              <Bell class="size-5 text-muted-foreground" />
              <div>
                <CardTitle>{{ t('appriseNotify.tabs.channels') }}</CardTitle>
                <CardDescription>{{ t('appriseNotify.channels.appriseUrlHint') }}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p v-if="!loadingChannels && !channels.length" class="text-muted-foreground text-sm">
                {{ t('appriseNotify.channels.empty') }}
              </p>
              <div v-else class="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{{ t('appriseNotify.channels.name') }}</TableHead>
                      <TableHead>{{ t('appriseNotify.channels.masked') }}</TableHead>
                      <TableHead>{{ t('appriseNotify.channels.enabled') }}</TableHead>
                      <TableHead class="text-right">
                        {{ t('appriseNotify.channels.actions') }}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="row in channels" :key="row.id">
                      <TableCell class="font-medium">
                        {{ row.name }}
                      </TableCell>
                      <TableCell class="max-w-[280px] truncate font-mono text-xs text-muted-foreground">
                        {{ row.appriseUrlMasked }}
                      </TableCell>
                      <TableCell>
                        {{ row.enabled ? t('appriseNotify.yes') : t('appriseNotify.no') }}
                      </TableCell>
                      <TableCell class="text-right">
                        <Button variant="ghost" size="icon" :title="t('appriseNotify.channels.test')" @click="testChannel(row)">
                          <Send class="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" :title="t('appriseNotify.channels.edit')" @click="openEdit(row)">
                          <Pencil class="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" :title="t('appriseNotify.channels.delete')" @click="removeChannel(row)">
                          <Trash2 class="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" class="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{{ t('appriseNotify.tabs.logs') }}</CardTitle>
              <CardDescription>
                {{ t('appriseNotify.logs.subtitle') }}
                <span class="mt-1 block">{{ t('appriseNotify.logs.clickHint') }}</span>
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{{ t('appriseNotify.logs.status') }}</TableHead>
                      <TableHead>{{ t('appriseNotify.logs.channel') }}</TableHead>
                      <TableHead>{{ t('appriseNotify.logs.title') }}</TableHead>
                      <TableHead>{{ t('appriseNotify.logs.body') }}</TableHead>
                      <TableHead>{{ t('appriseNotify.logs.error') }}</TableHead>
                      <TableHead>{{ t('appriseNotify.logs.time') }}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-if="!logs.length && !loadingLogs">
                      <TableCell colspan="6" class="text-center text-muted-foreground text-sm">
                        {{ t('appriseNotify.logs.empty') }}
                      </TableCell>
                    </TableRow>
                    <TableRow v-for="log in logs" :key="log.id">
                      <TableCell
                        class="cursor-pointer hover:bg-muted/60"
                        role="button"
                        tabindex="0"
                        :title="t('appriseNotify.logs.clickToView')"
                        @click="openLogDetail(log)"
                        @keydown.enter.prevent="openLogDetail(log)"
                      >
                        <span
                          :class="log.status === 'success' ? 'text-green-600' : 'text-destructive'"
                        >
                          {{ log.status === 'success' ? t('appriseNotify.status.success') : t('appriseNotify.status.failed') }}
                        </span>
                      </TableCell>
                      <TableCell
                        class="cursor-pointer hover:bg-muted/60"
                        role="button"
                        tabindex="0"
                        :title="t('appriseNotify.logs.clickToView')"
                        @click="openLogDetail(log)"
                        @keydown.enter.prevent="openLogDetail(log)"
                      >
                        {{ log.channelName || '—' }}
                      </TableCell>
                      <TableCell
                        class="max-w-[140px] cursor-pointer truncate text-sm hover:bg-muted/60"
                        role="button"
                        tabindex="0"
                        :title="t('appriseNotify.logs.clickToView')"
                        @click="openLogDetail(log)"
                        @keydown.enter.prevent="openLogDetail(log)"
                      >
                        {{ log.title || '—' }}
                      </TableCell>
                      <TableCell
                        class="max-w-[200px] cursor-pointer text-sm text-muted-foreground hover:bg-muted/60"
                        role="button"
                        tabindex="0"
                        :title="t('appriseNotify.logs.clickToView')"
                        @click="openLogDetail(log)"
                        @keydown.enter.prevent="openLogDetail(log)"
                      >
                        {{ bodyPreview(log.body) }}
                      </TableCell>
                      <TableCell
                        class="max-w-[160px] cursor-pointer truncate text-xs text-destructive hover:bg-muted/60"
                        role="button"
                        tabindex="0"
                        :title="t('appriseNotify.logs.clickToView')"
                        @click="openLogDetail(log)"
                        @keydown.enter.prevent="openLogDetail(log)"
                      >
                        {{ log.errorMessage || '—' }}
                      </TableCell>
                      <TableCell
                        class="cursor-pointer whitespace-nowrap text-xs text-muted-foreground hover:bg-muted/60"
                        role="button"
                        tabindex="0"
                        :title="t('appriseNotify.logs.clickToView')"
                        @click="openLogDetail(log)"
                        @keydown.enter.prevent="openLogDetail(log)"
                      >
                        {{ formatTime(log.createdTime) }}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div v-if="logTotal > 0" class="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>
                  {{ t('appriseNotify.logs.pageOf', { page: logPage, total: logTotalPages }) }}
                </span>
                <div class="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    :disabled="logPage <= 1 || loadingLogs"
                    @click="logPage--; loadLogs()"
                  >
                    {{ t('appriseNotify.logs.prev') }}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    :disabled="logPage >= logTotalPages || loadingLogs"
                    @click="logPage++; loadLogs()"
                  >
                    {{ t('appriseNotify.logs.next') }}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>

    <Dialog v-model:open="channelDialog">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {{ editingId == null ? t('appriseNotify.channels.add') : t('appriseNotify.channels.edit') }}
          </DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-2">
          <div class="grid gap-2">
            <Label>{{ t('appriseNotify.channels.name') }}</Label>
            <Input v-model="formName" autocomplete="off" />
          </div>
          <div class="grid gap-2">
            <Label>{{ t('appriseNotify.channels.appriseUrl') }}</Label>
            <Textarea v-model="formUrl" class="min-h-[100px] font-mono text-sm" autocomplete="off" />
          </div>
          <div class="flex items-center gap-2">
            <Switch v-model:checked="formEnabled" />
            <Label>{{ t('appriseNotify.channels.enabled') }}</Label>
          </div>
          <div class="grid gap-2">
            <Label>{{ t('appriseNotify.channels.description') }}</Label>
            <Input v-model="formDescription" autocomplete="off" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="channelDialog = false">
            {{ t('appriseNotify.cancel') }}
          </Button>
          <Button :disabled="saving" @click="saveChannel">
            {{ t('appriseNotify.save') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AppriseLogDetailDialog
      v-model:open="logDetailOpen"
      :log="logDetailLog"
      @update:open="onLogDetailOpenChange"
    />

    <Dialog v-model:open="notifyDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('appriseNotify.channels.sendTitle') }}</DialogTitle>
        </DialogHeader>
        <div class="grid gap-3 py-2">
          <div class="grid gap-2">
            <Label>{{ t('appriseNotify.channels.pickChannels') }}</Label>
            <div class="max-h-40 space-y-2 overflow-y-auto rounded-md border p-2">
              <label
                v-for="c in channels.filter(x => x.enabled)"
                :key="c.id"
                class="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  class="size-4 rounded border"
                  :checked="notifySelectedIds.includes(c.id)"
                  @change="toggleNotifyId(c.id)"
                >
                <span>{{ c.name }}</span>
              </label>
            </div>
          </div>
          <div class="grid gap-2">
            <Label>{{ t('appriseNotify.channels.notifyTitle') }}</Label>
            <Input v-model="notifyTitle" />
          </div>
          <div class="grid gap-2">
            <Label>{{ t('appriseNotify.channels.notifyBody') }}</Label>
            <Textarea v-model="notifyBody" class="min-h-[88px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="notifyDialog = false">
            {{ t('appriseNotify.cancel') }}
          </Button>
          <Button :disabled="sending" @click="submitNotify">
            {{ t('appriseNotify.channels.sendSubmit') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </BasicPage>
</template>
