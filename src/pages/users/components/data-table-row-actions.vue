<script setup lang="ts">
import type { Row } from '@tanstack/vue-table'
import type { Component } from 'vue'

import { Ellipsis } from 'lucide-vue-next'

import type { SysUserResult } from '@/services/api/core/user.api'

import { useModal } from '@/composables/use-modal'

interface DataTableRowActionsProps {
  row: Row<SysUserResult>
}

const props = defineProps<DataTableRowActionsProps>()
const user = computed(() => props.row.original)
const isOpen = ref(false)

const fetchList = inject<() => Promise<void>>('userListFetch', () => Promise.resolve())

const showComponent = shallowRef<Component | null>(null)
type TCommand = 'edit' | 'delete' | 'reset_password'
function handleSelect(command: TCommand) {
  switch (command) {
    case 'edit':
      showComponent.value = defineAsyncComponent(() => import('./user-resource.vue'))
      break
    case 'delete':
      showComponent.value = defineAsyncComponent(() => import('./user-delete.vue'))
      break
    case 'reset_password':
      showComponent.value = defineAsyncComponent(() => import('./user-reset-password.vue'))
      break
  }
}

function onClose() {
  isOpen.value = false
  fetchList()
}

const { contentClass, Modal } = useModal()
</script>

<template>
  <component :is="Modal.Root" v-model:open="isOpen">
    <UiDropdownMenu>
      <UiDropdownMenuTrigger as-child>
        <UiButton
          variant="ghost"
          class="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <Ellipsis class="size-4" />
          <span class="sr-only">Open menu</span>
        </UiButton>
      </UiDropdownMenuTrigger>
      <UiDropdownMenuContent align="end" class="w-[160px]">
        <component :is="Modal.Trigger" as-child>
          <UiDropdownMenuItem @click.stop="handleSelect('edit')">
            {{ $t('user.actions.edit') }}
          </UiDropdownMenuItem>
        </component>
        <component :is="Modal.Trigger" as-child>
          <UiDropdownMenuItem @click.stop="handleSelect('reset_password')">
            {{ $t('user.actions.resetPassword') }}
          </UiDropdownMenuItem>
        </component>
        <component :is="Modal.Trigger" as-child>
          <UiDropdownMenuItem
            :disabled="user.username === 'admin'"
            @click.stop="handleSelect('delete')"
          >
            {{ $t('user.actions.delete') }}
          </UiDropdownMenuItem>
        </component>
      </UiDropdownMenuContent>
    </UiDropdownMenu>

    <component :is="Modal.Content" :class="contentClass">
      <component :is="showComponent" :user="user" @close="onClose" />
    </component>
  </component>
</template>
