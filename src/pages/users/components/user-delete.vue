<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import type { SysUserResult } from '@/services/api/core/user.api'

import { useModal } from '@/composables/use-modal'
import { deleteSysUserApi } from '@/services/api/core/user.api'

const props = defineProps<{ user: SysUserResult }>()
const emit = defineEmits<{ (e: 'close'): void }>()
const { t } = useI18n()
const loading = ref(false)

async function handleRemove() {
  loading.value = true
  try {
    await deleteSysUserApi(props.user.id)
    toast.success(t('user.toast.deleteSuccess'))
    emit('close')
  }
  finally {
    loading.value = false
  }
}

const { Modal } = useModal()
</script>

<template>
  <div>
    <component :is="Modal.Header">
      <component :is="Modal.Title">
        {{ $t('user.modal.confirmDelete') }}
      </component>
      <component :is="Modal.Description">
        {{ $t('user.modal.confirmDeleteDesc', { name: user.username }) }}
      </component>
    </component>
    <component :is="Modal.Footer">
      <component :is="Modal.Close" as-child>
        <UiButton variant="outline">
          {{ $t('user.modal.cancel') }}
        </UiButton>
      </component>
      <UiButton variant="destructive" :disabled="loading" @click="handleRemove">
        {{ loading ? $t('user.modal.deleting') : $t('user.modal.delete') }}
      </UiButton>
    </component>
  </div>
</template>
