<script setup lang="ts">
import type { SysUserParams, SysUserResult } from '@/services/api/core/user.api'

import { BasicPage } from '@/components/global-layout'
import {
  getSysUserListApi,

} from '@/services/api/core/user.api'

import { createColumns } from './components/columns'
import DataTable from './components/data-table.vue'
import UserCreate from './components/user-create.vue'

const loading = ref(false)
const list = ref<SysUserResult[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filters = ref<Pick<SysUserParams, 'username' | 'email' | 'status'>>({
  username: undefined,
  email: undefined,
  status: undefined,
})

/** 将接口返回的每条用户数据规范为表格所需结构（兼容顶层或 item.user 下的 status、is_superuser 等） */
function normalizeUserItem(item: Record<string, unknown>): SysUserResult {
  const src = (item.user as Record<string, unknown> | undefined) ?? item
  const statusRaw = src.status ?? item.status
  const status = statusRaw != null ? Number(statusRaw) : 0
  return {
    ...item,
    ...src,
    status,
    is_superuser: Boolean(src.is_superuser ?? item.is_superuser),
    is_staff: Boolean(src.is_staff ?? item.is_staff),
    is_multi_login: Boolean(src.is_multi_login ?? item.is_multi_login),
  } as SysUserResult
}

async function fetchList() {
  loading.value = true
  try {
    const res = await getSysUserListApi({
      page: page.value,
      size: pageSize.value,
      ...filters.value,
    })
    const rawItems = res.items ?? []
    list.value = rawItems.map((item: Record<string, unknown>) => normalizeUserItem(item))
    total.value = res.total ?? 0
  }
  finally {
    loading.value = false
  }
}

function onPageChange(p: number) {
  page.value = p
  fetchList()
}

function onPageSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  fetchList()
}

const serverPagination = computed(() => ({
  page: page.value,
  pageSize: pageSize.value,
  total: total.value,
  onPageChange,
  onPageSizeChange,
}))

const columns = createColumns(fetchList)

provide('userListFilters', filters)
provide('userListFetch', fetchList)

onMounted(fetchList)
</script>

<template>
  <BasicPage
    :title="$t('user.title')"
    :description="$t('user.description')"
    sticky
  >
    <template #actions>
      <UserCreate @created="fetchList" />
    </template>
    <div class="overflow-x-auto">
      <DataTable
        :loading="loading"
        :data="list"
        :columns="columns"
        :server-pagination="serverPagination"
        :initial-column-visibility="{ id: false, phone: false, join_time: false }"
      />
    </div>
  </BasicPage>
</template>
