<script lang="ts" setup>
import { UserRoundPlus } from 'lucide-vue-next'

import { useModal } from '@/composables/use-modal'

import UserResource from './user-resource.vue'

const emit = defineEmits<{ (e: 'created'): void }>()
const isOpen = ref(false)
const { Modal, contentClass } = useModal()

function onClose() {
  isOpen.value = false
  emit('created')
}
</script>

<template>
  <component :is="Modal.Root" v-model:open="isOpen">
    <component :is="Modal.Trigger" as-child>
      <InspiraUiRainbowButton
        class="w-[120px] min-w-[120px] shrink-0 !h-9 justify-center gap-1.5 !px-2 text-sm"
      >
        <UserRoundPlus class="size-3.5 shrink-0" aria-hidden="true" />
        <span class="min-w-0 truncate">{{ $t('user.addUser') }}</span>
      </InspiraUiRainbowButton>
    </component>
    <component :is="Modal.Content" :class="contentClass">
      <UserResource @close="onClose" />
    </component>
  </component>
</template>
