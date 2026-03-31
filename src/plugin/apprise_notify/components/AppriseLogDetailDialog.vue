<script lang="ts" setup>
/**
 * Apprise 发送历史单条「投递详情」弹窗（历史页与头部通知共用）
 */
import { useI18n } from 'vue-i18n'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

import type { AppriseLogItem } from '../api'

defineProps<{
  log: AppriseLogItem | null
}>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()

function formatTime(ms: number) {
  if (!ms)
    return '—'
  return new Date(ms).toLocaleString()
}

function logStatusLine(log: AppriseLogItem) {
  const raw = log.status?.trim() || '—'
  if (log.status === 'success')
    return `${t('appriseNotify.status.success')} (${raw})`
  if (log.status === 'failed')
    return `${t('appriseNotify.status.failed')} (${raw})`
  return raw
}

function logTriggerLabel(src: string | undefined) {
  const s = (src ?? '').trim()
  if (s === 'test')
    return t('appriseNotify.logs.sourceTest')
  if (s === 'notify')
    return t('appriseNotify.logs.sourceNotify')
  return t('appriseNotify.logs.sourceUnknown')
}

function logSentToPrimary(log: AppriseLogItem) {
  const name = log.channelName?.trim()
  if (name)
    return name
  if (log.channelId != null)
    return t('appriseNotify.logs.sentToUnnamedChannel', { id: log.channelId })
  return '—'
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{{ t('appriseNotify.logs.detailDialogTitle') }}</DialogTitle>
      </DialogHeader>
      <ScrollArea v-if="log" class="max-h-[min(70vh,32rem)] pr-3">
        <div class="space-y-4 pr-1 text-sm">
          <div class="space-y-1">
            <div class="text-muted-foreground text-xs font-medium">
              {{ t('appriseNotify.logs.status') }}
            </div>
            <div
              :class="log.status === 'success' ? 'text-green-600' : 'text-destructive'"
            >
              {{ logStatusLine(log) }}
            </div>
          </div>
          <div class="space-y-1">
            <div class="text-muted-foreground text-xs font-medium">
              {{ t('appriseNotify.logs.source') }}
            </div>
            <div class="whitespace-pre-wrap break-words">
              {{ logTriggerLabel(log.triggerSource) }}
            </div>
          </div>
          <div class="space-y-1">
            <div class="text-muted-foreground text-xs font-medium">
              {{ t('appriseNotify.logs.channel') }}
            </div>
            <div class="whitespace-pre-wrap break-words">
              {{ log.channelName?.trim() || '—' }}
            </div>
            <p
              v-if="log.channelId != null"
              class="text-muted-foreground text-xs"
            >
              {{ t('appriseNotify.logs.channelIdLine', { id: log.channelId }) }}
            </p>
          </div>
          <div class="space-y-1">
            <div class="text-muted-foreground text-xs font-medium">
              {{ t('appriseNotify.logs.sentTo') }}
            </div>
            <div class="whitespace-pre-wrap break-words">
              {{ logSentToPrimary(log) }}
            </div>
            <p class="text-muted-foreground text-xs">
              {{ t('appriseNotify.logs.sentToHint') }}
            </p>
          </div>
          <div class="space-y-1">
            <div class="text-muted-foreground text-xs font-medium">
              {{ t('appriseNotify.logs.title') }}
            </div>
            <div class="whitespace-pre-wrap break-words">
              {{ log.title?.trim() || '—' }}
            </div>
          </div>
          <div class="space-y-1">
            <div class="text-muted-foreground text-xs font-medium">
              {{ t('appriseNotify.logs.body') }}
            </div>
            <div class="whitespace-pre-wrap break-words font-sans">
              {{ log.body?.trim() ? log.body : '—' }}
            </div>
          </div>
          <div class="space-y-1">
            <div class="text-muted-foreground text-xs font-medium">
              {{ t('appriseNotify.logs.error') }}
            </div>
            <div class="whitespace-pre-wrap break-words text-destructive">
              {{ log.errorMessage?.trim() || '—' }}
            </div>
          </div>
          <div class="space-y-1">
            <div class="text-muted-foreground text-xs font-medium">
              {{ t('appriseNotify.logs.time') }}
            </div>
            <div class="whitespace-pre-wrap break-words">
              {{ formatTime(log.createdTime) }}
            </div>
            <p class="text-muted-foreground text-xs">
              {{ t('appriseNotify.logs.detailTimestampMs', { ms: log.createdTime }) }}
            </p>
          </div>
        </div>
      </ScrollArea>
      <p v-if="log" class="text-muted-foreground text-xs">
        {{ t('appriseNotify.logs.detailLogId', { id: log.id }) }}
      </p>
      <DialogFooter>
        <Button variant="outline" @click="open = false">
          {{ t('appriseNotify.cancel') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
