<script setup lang="ts">
import type { Table } from '@tanstack/vue-table'

import { watchDebounced } from '@vueuse/core'
import { PlusCircle } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

import type { SysUserResult } from '@/services/api/core/user.api'
import type { SysRoleResult } from '@/services/api/role.api'

import DataTableViewOptions from '@/components/data-table/view-options.vue'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { getAllSysRoleApi } from '@/services/api/role.api'

interface DataTableToolbarProps {
  table: Table<SysUserResult>
}

defineProps<DataTableToolbarProps>()

const serverFilters = inject<Ref<{ username?: string, email?: string, status?: number }>>('userListFilters')
const fetchList = inject<() => Promise<void>>('userListFetch', () => Promise.resolve())

const username = ref(serverFilters?.value?.username ?? '')
const email = ref(serverFilters?.value?.email ?? '')
const statusChecked = ref<number[]>(
  serverFilters?.value?.status === undefined ? [] : [serverFilters.value.status],
)
const roleIdsChecked = ref<number[]>([])

const roleOptions = ref<SysRoleResult[]>([])
onMounted(async () => {
  try {
    roleOptions.value = await getAllSysRoleApi()
  }
  catch {}
})

const { t } = useI18n()
const statuses = computed(() => [
  { value: 1, label: t('user.statusActive') },
  { value: 0, label: t('user.statusDisabled') },
])

function toggleStatus(v: number) {
  const idx = statusChecked.value.indexOf(v)
  if (idx >= 0)
    statusChecked.value = statusChecked.value.filter(x => x !== v)
  else
    statusChecked.value = [...statusChecked.value, v]
  onSearch()
}

function toggleRole(id: number) {
  const idx = roleIdsChecked.value.indexOf(id)
  if (idx >= 0)
    roleIdsChecked.value = roleIdsChecked.value.filter(x => x !== id)
  else
    roleIdsChecked.value = [...roleIdsChecked.value, id]
  onSearch()
}

function onSearch() {
  if (serverFilters?.value) {
    serverFilters.value.username = username.value || undefined
    serverFilters.value.email = email.value || undefined
    serverFilters.value.status = statusChecked.value.length === 1
      ? statusChecked.value[0]
      : statusChecked.value.length === 0
        ? undefined
        : statusChecked.value[0]
  }
  fetchList()
}

watchDebounced([username, email], onSearch, { debounce: 300 })
</script>

<template>
  <div class="flex w-full flex-wrap items-center gap-4 py-4">
    <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <Input
        v-model="username"
        :placeholder="$t('user.searchUsername')"
        class="h-8 min-w-[7rem] shrink-0 sm:ml-2 sm:w-[180px]"
      />
      <Input
        v-model="email"
        :placeholder="$t('user.searchEmail')"
        class="h-8 min-w-[7rem] shrink-0 sm:w-[180px]"
      />
      <Popover>
        <PopoverTrigger as-child>
          <UiButton variant="outline" size="sm" class="h-8">
            <PlusCircle class="size-4 mr-1" />
            {{ $t('user.status') }}
          </UiButton>
        </PopoverTrigger>
        <PopoverContent class="w-52 p-0" align="start">
          <Command>
            <CommandInput :placeholder="$t('user.status')" class="h-9" />
            <CommandList>
              <CommandEmpty>{{ $t('user.notFound') }}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  v-for="s in statuses"
                  :key="s.value"
                  :value="s.label"
                  @select.prevent="toggleStatus(s.value)"
                >
                  <div class="flex items-center gap-3 py-1">
                    <UiCheckbox
                      :id="`status-${s.value}`"
                      :model-value="statusChecked.includes(s.value)"
                      @update:model-value="toggleStatus(s.value)"
                    />
                    <label :for="`status-${s.value}`" class="cursor-pointer leading-none">
                      {{ s.label }}
                    </label>
                  </div>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger as-child>
          <UiButton variant="outline" size="sm" class="h-8">
            <PlusCircle class="size-4 mr-1" />
            {{ $t('user.role') }}
          </UiButton>
        </PopoverTrigger>
        <PopoverContent class="w-52 p-0" align="start">
          <Command>
            <CommandInput :placeholder="$t('user.role')" class="h-9" />
            <CommandList>
              <CommandEmpty>{{ $t('user.notFound') }}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  v-for="r in roleOptions"
                  :key="r.id"
                  :value="r.name"
                  @select.prevent="toggleRole(r.id)"
                >
                  <div class="flex items-center gap-3 py-1">
                    <UiCheckbox
                      :id="`role-${r.id}`"
                      :model-value="roleIdsChecked.includes(r.id)"
                      @update:model-value="toggleRole(r.id)"
                    />
                    <label :for="`role-${r.id}`" class="cursor-pointer leading-none">
                      {{ r.name }}
                    </label>
                  </div>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
    <div class="shrink-0 basis-full sm:basis-auto sm:ml-auto">
      <DataTableViewOptions :table="table" />
    </div>
  </div>
</template>
