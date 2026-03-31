<script setup lang="ts">
/**
 * 执行审批弹窗：当 Gateway 推送 exec.approval.requested 时展示，用户可批准/拒绝
 */
import { useI18n } from 'vue-i18n'

defineProps<{
  open: boolean
  request?: { runId?: string, policy?: string, [key: string]: unknown }
}>()

const emit = defineEmits<{ 'update:open': [v: boolean], 'resolve': [approved: boolean] }>()
const { t } = useI18n()

function approve() {
  emit('resolve', true)
  emit('update:open', false)
}

function reject() {
  emit('resolve', false)
  emit('update:open', false)
}
</script>

<template>
  <UiDialog v-bind="$attrs" @update:open="emit('update:open', $event)">
    <UiDialogContent>
      <UiDialogHeader>
        <UiDialogTitle>{{ t('openclaw.execApprovalTitle', '执行审批') }}</UiDialogTitle>
        <UiDialogDescription>
          {{ request?.policy ?? 'Approve or reject this execution request.' }}
        </UiDialogDescription>
      </UiDialogHeader>
      <div class="flex justify-end gap-2">
        <UiButton variant="outline" @click="reject">
          {{ t('openclaw.reject', '拒绝') }}
        </UiButton>
        <UiButton @click="approve">
          {{ t('openclaw.approve', '批准') }}
        </UiButton>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
