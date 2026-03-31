<script setup lang="ts">
import type { ColumnDef, ColumnFiltersState, SortingState, VisibilityState } from '@tanstack/vue-table'

import {
  FlexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table'
import { ArrowDown, ArrowUp, ChevronDown } from 'lucide-vue-next'
import { h, ref, watch } from 'vue'

import { Badge } from '@/components/ui/badge'
import { valueUpdater } from '@/lib/utils'

type OrderStatus = 'new-order' | 'in-progress' | 'completed' | 'return' | 'on-hold'

interface Order {
  id: string
  customerName: string
  items: number
  amount: number
  paymentMethod: string
  status: OrderStatus
}

const data: Order[] = [
  { id: '1083', customerName: 'Marvin Dekidis', items: 2, amount: 34.5, paymentMethod: 'E-Wallet', status: 'new-order' },
  { id: '1082', customerName: 'Carter Lipshitz', items: 6, amount: 60.5, paymentMethod: 'Bank Transfer', status: 'in-progress' },
  { id: '1081', customerName: 'Addison Philips', items: 3, amount: 47.5, paymentMethod: 'E-Wallet', status: 'new-order' },
  { id: '1079', customerName: 'Craig Siphron', items: 15, amount: 89.8, paymentMethod: 'Bank Transfer', status: 'on-hold' },
  { id: '1078', customerName: 'Emma Johnson', items: 4, amount: 120.75, paymentMethod: 'Credit Card', status: 'completed' },
  { id: '1077', customerName: 'Michael Smith', items: 8, amount: 210.5, paymentMethod: 'PayPal', status: 'completed' },
  { id: '1076', customerName: 'Sarah Williams', items: 1, amount: 25.99, paymentMethod: 'E-Wallet', status: 'in-progress' },
  { id: '1075', customerName: 'James Brown', items: 3, amount: 78.45, paymentMethod: 'Bank Transfer', status: 'return' },
  { id: '1074', customerName: 'David Miller', items: 5, amount: 145.2, paymentMethod: 'Credit Card', status: 'new-order' },
  { id: '1073', customerName: 'Jennifer Davis', items: 2, amount: 67.8, paymentMethod: 'PayPal', status: 'in-progress' },
  { id: '1072', customerName: 'Robert Wilson', items: 7, amount: 198.35, paymentMethod: 'Bank Transfer', status: 'completed' },
  { id: '1071', customerName: 'Lisa Anderson', items: 4, amount: 112.9, paymentMethod: 'E-Wallet', status: 'on-hold' },
  { id: '1070', customerName: 'Thomas Taylor', items: 9, amount: 245.75, paymentMethod: 'Credit Card', status: 'new-order' },
  { id: '1069', customerName: 'Patricia Moore', items: 3, amount: 87.6, paymentMethod: 'Bank Transfer', status: 'return' },
  { id: '1068', customerName: 'Christopher White', items: 6, amount: 156.4, paymentMethod: 'PayPal', status: 'completed' },
  { id: '1067', customerName: 'Elizabeth Harris', items: 2, amount: 54.25, paymentMethod: 'E-Wallet', status: 'in-progress' },
]

const statusMap: Record<OrderStatus, 'default' | 'destructive' | 'outline' | 'secondary'> = {
  'completed': 'secondary',
  'new-order': 'outline',
  'in-progress': 'outline',
  'on-hold': 'outline',
  'return': 'destructive',
}

const columns: ColumnDef<Order>[] = [
  { accessorKey: 'id', header: 'ID', size: 80 },
  { accessorKey: 'customerName', header: 'Customer Name' },
  { accessorKey: 'items', header: 'Qty Items', cell: ({ row }) => `${row.getValue('items')} Items` },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => `$${row.getValue('amount')}` },
  { accessorKey: 'paymentMethod', header: 'Payment Method' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status
      const variant = statusMap[status] ?? 'default'
      return h(Badge, { variant, class: 'capitalize' }, () => status.replace('-', ' '))
    },
  },
]

const sorting = ref<SortingState>([])
const columnFilters = ref<ColumnFiltersState>([])
const columnVisibility = ref<VisibilityState>({})
const rowSelection = ref({})
const customerNameFilter = ref('')

const table = useVueTable({
  data: ref(data),
  columns,
  onSortingChange: updater => valueUpdater(updater, sorting),
  onColumnFiltersChange: updater => valueUpdater(updater, columnFilters),
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  onColumnVisibilityChange: updater => valueUpdater(updater, columnVisibility),
  onRowSelectionChange: updater => valueUpdater(updater, rowSelection),
  state: {
    get sorting() { return sorting.value },
    get columnFilters() { return columnFilters.value },
    get columnVisibility() { return columnVisibility.value },
    get rowSelection() { return rowSelection.value },
  },
  initialState: { pagination: { pageSize: 6 } },
})

// Sync filter from table to our ref for v-model
watch(
  () => table.getColumn('customerName')?.getFilterValue(),
  (v) => { customerNameFilter.value = (v as string) ?? '' },
  { immediate: true },
)
watch(customerNameFilter, v => table.getColumn('customerName')?.setFilterValue(v))
</script>

<template>
  <UiCard class="h-full">
    <UiCardHeader>
      <UiCardTitle>Track Order Status</UiCardTitle>
      <UiCardDescription>Analyze growth and changes in visitor patterns</UiCardDescription>
      <UiCardAction>
        <UiButton variant="outline" size="sm" @click="() => {}">
          Export
        </UiButton>
      </UiCardAction>
    </UiCardHeader>
    <UiCardContent>
      <div class="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div class="space-y-2">
          <div class="font-display text-2xl lg:text-3xl">
            43
          </div>
          <div class="flex gap-2">
            <div class="text-sm text-muted-foreground">
              New Order
            </div>
            <div class="flex items-center gap-0.5 text-xs text-green-500">
              <ArrowUp class="size-3" />
              0.5%
            </div>
          </div>
          <UiProgress :model-value="43" class="h-2 bg-blue-100 dark:bg-blue-950 [&_[data-slot=progress-indicator]]:bg-blue-400" />
        </div>
        <div class="space-y-2">
          <div class="font-display text-2xl lg:text-3xl">
            12
          </div>
          <div class="flex gap-2">
            <div class="text-sm text-muted-foreground">
              On Progress
            </div>
            <div class="flex items-center gap-0.5 text-xs text-red-500">
              <ArrowDown class="size-3" />
              0.3%
            </div>
          </div>
          <UiProgress :model-value="25" class="h-2 bg-teal-100 dark:bg-teal-950 [&_[data-slot=progress-indicator]]:bg-teal-400" />
        </div>
        <div class="space-y-2">
          <div class="font-display text-2xl lg:text-3xl">
            40
          </div>
          <div class="flex gap-2">
            <div class="text-sm text-muted-foreground">
              Completed
            </div>
            <div class="flex items-center gap-0.5 text-xs text-green-500">
              <ArrowUp class="size-3" />
              0.5%
            </div>
          </div>
          <UiProgress :model-value="40" class="h-2 bg-green-100 dark:bg-green-950 [&_[data-slot=progress-indicator]]:bg-green-400" />
        </div>
        <div class="space-y-2">
          <div class="font-display text-2xl lg:text-3xl">
            2
          </div>
          <div class="flex gap-2">
            <div class="text-sm text-muted-foreground">
              Return
            </div>
            <div class="flex items-center gap-0.5 text-xs text-red-500">
              <ArrowDown class="size-3" />
              0.5%
            </div>
          </div>
          <UiProgress :model-value="48" class="h-2 bg-orange-100 dark:bg-orange-950 [&_[data-slot=progress-indicator]]:bg-orange-400" />
        </div>
      </div>

      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <UiInput
            v-model="customerNameFilter"
            placeholder="Filter orders..."
            class="max-w-sm"
          />
          <UiDropdownMenu>
            <UiDropdownMenuTrigger as-child>
              <UiButton variant="outline" class="ml-auto">
                Columns
                <ChevronDown class="ml-2 h-4 w-4" />
              </UiButton>
            </UiDropdownMenuTrigger>
            <UiDropdownMenuContent align="end">
              <UiDropdownMenuCheckboxItem
                v-for="column in table.getAllColumns().filter(col => col.getCanHide())"
                :key="column.id"
                class="capitalize"
                :checked="column.getIsVisible()"
                @update:checked="column.toggleVisibility(!!$event)"
              >
                {{ column.id }}
              </UiDropdownMenuCheckboxItem>
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
        <div class="flex items-center justify-end space-x-2">
          <div class="flex-1 text-sm text-muted-foreground">
            {{ table.getFilteredSelectedRowModel().rows.length }} of {{ table.getFilteredRowModel().rows.length }} row(s) selected.
          </div>
          <div class="space-x-2">
            <UiButton
              variant="outline"
              size="sm"
              :disabled="!table.getCanPreviousPage()"
              @click="table.previousPage()"
            >
              Previous
            </UiButton>
            <UiButton
              variant="outline"
              size="sm"
              :disabled="!table.getCanNextPage()"
              @click="table.nextPage()"
            >
              Next
            </UiButton>
          </div>
        </div>
      </div>
    </UiCardContent>
  </UiCard>
</template>
