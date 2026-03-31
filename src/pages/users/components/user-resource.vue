<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import type { SysUserResult } from '@/services/api/core/user.api'

import { useModal } from '@/composables/use-modal'
import { createSysUserApi, updateSysUserApi } from '@/services/api/core/user.api'
import { useAuthStore } from '@/stores/auth'

import UserFormSys from './user-form-sys.vue'

const props = defineProps<{ user?: SysUserResult | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()
const { t } = useI18n()
const authStore = useAuthStore()
const formRef = ref<InstanceType<typeof UserFormSys> | null>(null)
const loading = ref(false)

const isEdit = computed(() => !!props.user)
const title = computed(() => (isEdit.value ? t('user.modal.editUser') : t('user.modal.createUser')))
const description = computed(() => (isEdit.value ? t('user.modal.editUserDesc', { name: props.user?.username }) : t('user.modal.createUserDesc')))

async function onSubmit() {
  const form = formRef.value
  const data = form?.formData
  if (!data || !data.username?.trim()) {
    toast.error(t('user.toast.fillUsername'))
    return
  }
  if (!isEdit.value && !data.password?.trim()) {
    toast.error(t('user.toast.fillPassword'))
    return
  }
  if (!data.roles?.length) {
    toast.error(t('user.toast.selectRole'))
    return
  }
  const avatar = await form?.getAvatarForSubmit?.()
  loading.value = true
  try {
    if (isEdit.value && props.user) {
      await updateSysUserApi(props.user.id, {
        username: data.username,
        nickname: data.nickname ?? props.user.username,
        avatar,
        phone: data.phone,
        email: data.email,
        roles: data.roles,
      })
      toast.success(t('user.toast.saveSuccess'))
      if (authStore.userInfo?.id === props.user.id) {
        await authStore.fetchUserInfo()
      }
    }
    else {
      await createSysUserApi({
        username: data.username,
        password: data.password!,
        nickname: data.nickname || undefined,
        avatar,
        phone: data.phone,
        email: data.email,
        roles: data.roles,
      })
      toast.success(t('user.toast.createSuccess'))
    }
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
        {{ title }}
      </component>
      <component :is="Modal.Description">
        {{ description }}
      </component>
    </component>
    <UserFormSys ref="formRef" :user="user" />
    <component :is="Modal.Footer">
      <component :is="Modal.Close" as-child>
        <UiButton variant="outline">
          {{ $t('user.modal.cancel') }}
        </UiButton>
      </component>
      <UiButton :disabled="loading" @click="onSubmit">
        {{ loading ? $t('user.modal.submitting') : $t('user.modal.save') }}
      </UiButton>
    </component>
  </div>
</template>
