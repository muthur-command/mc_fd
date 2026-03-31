<script setup lang="ts">
import type { ColumnDef, RowSelectionState } from '@tanstack/vue-table'

import {
  FlexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useVueTable,
} from '@tanstack/vue-table'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Mail,
  MoreHorizontal,
  Tag,
  Trash2,
} from 'lucide-vue-next'
import { h } from 'vue'
import { toast } from 'vue-sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { valueUpdater } from '@/lib/utils'

interface Payment {
  id: string
  status: 'success' | 'processing' | 'failed'
  email: string
  firstName: string
  lastName: string
  amount: number
}

const data = ref<Payment[]>([
  { id: '1', status: 'success', email: 'ken99@yahoo.com', firstName: 'Kenneth', lastName: 'Thompson', amount: 316.0 },
  { id: '2', status: 'success', email: 'abe45@gmail.com', firstName: 'Abraham', lastName: 'Lincoln', amount: 242.0 },
  { id: '3', status: 'processing', email: 'monserrat44@gmail.com', firstName: 'Monserrat', lastName: 'Rodriguez', amount: 837.0 },
  { id: '4', status: 'success', email: 'silas22@gmail.com', firstName: 'Silas', lastName: 'Johnson', amount: 874.0 },
  { id: '5', status: 'failed', email: 'carmella@hotmail.com', firstName: 'Carmella', lastName: 'DeVito', amount: 721.0 },
  { id: '6', status: 'success', email: 'maria@gmail.com', firstName: 'Maria', lastName: 'Garcia', amount: 529.0 },
  { id: '7', status: 'processing', email: 'james34@outlook.com', firstName: 'James', lastName: 'Wilson', amount: 438.0 },
  { id: '8', status: 'success', email: 'sarah.j@yahoo.com', firstName: 'Sarah', lastName: 'Jones', amount: 692.0 },
  { id: '9', status: 'failed', email: 'robert55@gmail.com', firstName: 'Robert', lastName: 'Brown', amount: 512.0 },
  { id: '10', status: 'success', email: 'emily.p@hotmail.com', firstName: 'Emily', lastName: 'Parker', amount: 375.0 },
  { id: '11', status: 'success', email: 'david87@gmail.com', firstName: 'David', lastName: 'Miller', amount: 623.0 },
  { id: '12', status: 'processing', email: 'jennifer@yahoo.com', firstName: 'Jennifer', lastName: 'Davis', amount: 459.0 },
  { id: '13', status: 'failed', email: 'michael.s@hotmail.com', firstName: 'Michael', lastName: 'Smith', amount: 782.0 },
  { id: '14', status: 'success', email: 'lisa.w@gmail.com', firstName: 'Lisa', lastName: 'Wilson', amount: 347.0 },
  { id: '15', status: 'success', email: 'john.doe@outlook.com', firstName: 'John', lastName: 'Doe', amount: 594.0 },
  { id: '16', status: 'processing', email: 'emma.j@gmail.com', firstName: 'Emma', lastName: 'Johnson', amount: 428.0 },
])

const rowSelection = ref<RowSelectionState>({})
const globalFilter = ref('')

const statusMap: Record<Payment['status'], 'default' | 'destructive' | 'outline' | 'secondary'> = {
  success: 'secondary',
  processing: 'outline',
  failed: 'destructive',
}

const columns: ColumnDef<Payment>[] = [
  {
    id: 'select',
    header: ({ table }) => h(Checkbox, {
      'modelValue': table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
      'onUpdate:modelValue': (v: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!v),
      'ariaLabel': 'Select all',
    }),
    cell: ({ row }) => h(Checkbox, {
      'modelValue': row.getIsSelected(),
      'onUpdate:modelValue': (v: boolean | 'indeterminate') => row.toggleSelected(!!v),
      'ariaLabel': 'Select row',
    }),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: 'Customer',
    cell: ({ row }) => h('div', {}, `${row.original.firstName} ${row.original.lastName}`),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => h('div', {}, row.original.email),
  },
  {
    accessorKey: 'amount',
    header: () => h('div', { class: 'text-right' }, 'Amount'),
    cell: ({ row }) => h('div', { class: 'text-right font-medium' }, `$${Number(row.original.amount).toFixed(2)}`),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status
      const variant = statusMap[status] ?? 'default'
      return h(Badge, { variant, class: 'capitalize' }, () => status)
    },
  },
  {
    id: 'actions',
    cell: () => h('div', { class: 'text-end' }, [
      h(DropdownMenu, {}, () => [
        h(DropdownMenuTrigger, { asChild: true }, () => [
          h(Button, { variant: 'ghost', class: 'size-8 p-0' }, () => [
            h(MoreHorizontal, { class: 'h-4 w-4' }),
            h('span', { class: 'sr-only' }, 'Open menu'),
          ]),
        ]),
        h(DropdownMenuContent, { align: 'end' }, () => [
          h(DropdownMenuItem, {}, () => 'View details'),
          h(DropdownMenuItem, {}, () => 'Download receipt'),
          h(DropdownMenuItem, {}, () => 'Contact customer'),
        ]),
      ]),
    ]),
  },
]

const table = useVueTable({
  get data() { return data.value },
  columns,
  state: {
    get rowSelection() { return rowSelection.value },
    get globalFilter() { return globalFilter.value },
  },
  onRowSelectionChange: updater => valueUpdater(updater, rowSelection),
  onGlobalFilterChange: updater => valueUpdater(updater, globalFilter),
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  enableRowSelection: true,
  initialState: { pagination: { pageSize: 8 } },
})

const selectedRowsCount = computed(() => Object.keys(rowSelection.value).length)

function handleBulkAction(action: string) {
  const rows = table.getSelectedRowModel().rows
  if (action === 'delete')
    toast.info(`Deleting ${rows.length} payments`)
  else if (action === 'export')
    toast.info(`Exporting ${rows.length} payments`)
  else if (action === 'email')
    toast.info(`Sending email to ${rows.length} customers`)
  else if (action === 'tag')
    toast.info(`Tagging ${rows.length} payments`)
}
</script>

<template>
  <UiCard class="h-full">
    <UiCardHeader>
      <UiCardTitle>Latest Payments</UiCardTitle>
    </UiCardHeader>
    <UiCardContent class="space-y-4">
      <div class="flex gap-2">
        <UiInput
          v-model="globalFilter"
          placeholder="Filter payments..."
          class="max-w-sm"
        />
        <UiDropdownMenu v-if="selectedRowsCount > 0">
          <UiDropdownMenuTrigger as-child>
            <UiButton variant="outline">
              Actions
              <UiBadge variant="outline">
                {{ selectedRowsCount }} selected
              </UiBadge>
              <ChevronDown class="h-4 w-4" />
            </UiButton>
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent align="end">
            <UiDropdownMenuItem @click="handleBulkAction('delete')">
              <Trash2 />
              Delete selected
            </UiDropdownMenuItem>
            <UiDropdownMenuItem @click="handleBulkAction('export')">
              <Download />
              Export selected
            </UiDropdownMenuItem>
            <UiDropdownMenuItem @click="handleBulkAction('email')">
              <Mail />
              Email customers
            </UiDropdownMenuItem>
            <UiDropdownMenuItem @click="handleBulkAction('tag')">
              <Tag />
              Tag payments
            </UiDropdownMenuItem>
          </UiDropdownMenuContent>
        </UiDropdownMenu>
      </div>

      <div class="rounded-md border">
        <UiTable>
          <UiTableHeader>
            <UiTableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
              <UiTableHead v-for="header in headerGroup.headers" :key="header.id">
                <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header" :props="header.getContext()" />
              </UiTableHead>
            </UiTableRow>
          </UiTableHeader>
          <UiTableBody>
            <template v-if="table.getRowModel().rows?.length">
              <UiTableRow
                v-for="row in table.getRowModel().rows"
                :key="row.id"
                :data-state="row.getIsSelected() && 'selected'"
              >
                <UiTableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                  <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                </UiTableCell>
              </UiTableRow>
            </template>
            <UiTableRow v-else>
              <UiTableCell :colspan="columns.length" class="h-24 text-center">
                No results.
              </UiTableCell>
            </UiTableRow>
          </UiTableBody>
        </UiTable>
      </div>

      <div class="flex items-center justify-between">
        <p class="text-sm text-muted-foreground">
          {{ selectedRowsCount }} of {{ data.length }} row(s) selected.
        </p>
        <div class="space-x-2">
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!table.getCanPreviousPage()"
            @click="table.previousPage()"
          >
            <ChevronLeft class="h-4 w-4" />
          </UiButton>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!table.getCanNextPage()"
            @click="table.nextPage()"
          >
            <ChevronRight class="h-4 w-4" />
          </UiButton>
        </div>
      </div>
    </UiCardContent>
  </UiCard>
</template>
