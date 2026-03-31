<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import type { SysUserResult } from '@/services/api/core/user.api'

import { useModal } from '@/composables/use-modal'
import { resetSysUserPasswordApi } from '@/services/api/core/user.api'

const props = defineProps<{ user: SysUserResult }>()
const emit = defineEmits<{ (e: 'close'): void }>()
const { t } = useI18n()
const password = ref('')
const loading = ref(false)

async function onSubmit() {
  if (!password.value || password.value.length < 6) {
    toast.error(t('user.toast.passwordMinLength'))
    return
  }
  loading.value = true
  try {
    await resetSysUserPasswordApi(props.user.id, { password: password.value })
    toast.success(t('user.toast.resetSuccess'))
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
        {{ $t('user.modal.resetPassword') }}
      </component>
      <component :is="Modal.Description">
        {{ $t('user.modal.resetPasswordDesc', { name: user.username }) }}
      </component>
    </component>
    <div class="grid gap-4 py-4">
      <div class="grid gap-2">
        <label class="text-sm font-medium">{{ $t('user.modal.newPassword') }}</label>
        <UiInput
          v-model="password"
          type="password"
          :placeholder="$t('user.modal.passwordPlaceholder')"
          autocomplete="new-password"
        />
      </div>
    </div>
    <component :is="Modal.Footer">
      <component :is="Modal.Close" as-child>
        <UiButton variant="outline">
          {{ $t('user.modal.cancel') }}
        </UiButton>
      </component>
      <UiButton :disabled="loading" @click="onSubmit">
        {{ loading ? $t('user.modal.submitting') : $t('user.modal.confirm') }}
      </UiButton>
    </component>
  </div>
</template>
