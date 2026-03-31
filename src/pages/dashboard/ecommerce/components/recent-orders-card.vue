<script setup lang="ts">
import type { ColumnDef } from '@tanstack/vue-table'

import {
  FlexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table'
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-vue-next'
import { h } from 'vue'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { valueUpdater } from '@/lib/utils'

export interface Order {
  id: number
  customer: { name: string, image: string }
  product: { name: string }
  amount: number
  status: 'processing' | 'paid' | 'success' | 'failed'
}

const orders: Order[] = [
  { id: 1023, customer: { name: 'Theodore Bell', image: 'https://bundui-images.netlify.app/avatars/01.png' }, product: { name: 'Tire Doodad' }, amount: 300, status: 'processing' },
  { id: 2045, customer: { name: 'Amelia Grant', image: 'https://bundui-images.netlify.app/avatars/02.png' }, product: { name: 'Engine Kit' }, amount: 450, status: 'paid' },
  { id: 3067, customer: { name: 'Eleanor Ward', image: 'https://bundui-images.netlify.app/avatars/03.png' }, product: { name: 'Brake Pad' }, amount: 200, status: 'success' },
  { id: 4089, customer: { name: 'Henry Carter', image: 'https://bundui-images.netlify.app/avatars/04.png' }, product: { name: 'Fuel Pump' }, amount: 500, status: 'processing' },
  { id: 5102, customer: { name: 'Olivia Harris', image: 'https://bundui-images.netlify.app/avatars/05.png' }, product: { name: 'Steering Wheel' }, amount: 350, status: 'failed' },
  { id: 6123, customer: { name: 'James Robinson', image: 'https://bundui-images.netlify.app/avatars/06.png' }, product: { name: 'Air Filter' }, amount: 180, status: 'paid' },
  { id: 7145, customer: { name: 'Sophia Martinez', image: 'https://bundui-images.netlify.app/avatars/07.png' }, product: { name: 'Oil Filter' }, amount: 220, status: 'success' },
  { id: 8167, customer: { name: 'Liam Thompson', image: 'https://bundui-images.netlify.app/avatars/08.png' }, product: { name: 'Radiator Cap' }, amount: 290, status: 'processing' },
  { id: 9189, customer: { name: 'Emma Wilson', image: 'https://bundui-images.netlify.app/avatars/09.png' }, product: { name: 'Spark Plug' }, amount: 150, status: 'success' },
  { id: 10211, customer: { name: 'Noah Davis', image: 'https://bundui-images.netlify.app/avatars/10.png' }, product: { name: 'Transmission Fluid' }, amount: 120, status: 'paid' },
]

const statusMap: Record<Order['status'], 'default' | 'destructive' | 'outline' | 'secondary'> = {
  success: 'secondary',
  processing: 'outline',
  paid: 'outline',
  failed: 'destructive',
}

const sorting = ref([])
const columnFilters = ref([])
const customerFilter = ref('')

const columns: ColumnDef<Order>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => h(Button, { variant: 'link', class: 'h-auto p-0 text-muted-foreground hover:text-primary' }, () => `#${row.getValue('id')}`),
  },
  {
    accessorKey: 'customer',
    header: 'Customer',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-4' }, [
      h('img', { src: row.original.customer.image, class: 'size-9 rounded-full object-cover', alt: '' }),
      h('div', { class: 'capitalize' }, row.original.customer.name),
    ]),
    filterFn: (row, _columnId, filterValue: string) =>
      row.original.customer.name.toLowerCase().includes((filterValue ?? '').toLowerCase()),
  },
  {
    accessorKey: 'product',
    header: 'Product',
    cell: ({ row }) => h('div', { class: 'capitalize' }, row.original.product.name),
  },
  {
    accessorKey: 'amount',
    header: () => h(Button, { variant: 'ghost', class: 'p-0! hover:bg-transparent!', onClick: () => {} }, () => ['Amount', h(ArrowUpDown, { class: 'size-3' })]),
    cell: ({ row }) => h('div', { class: 'font-medium' }, new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.original.amount)),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => h(Badge, { variant: statusMap[row.original.status] ?? 'default', class: 'capitalize' }, () => row.original.status),
  },
  {
    id: 'actions',
    cell: () => h('div', { class: 'text-end' }, [
      h(DropdownMenu, {}, () => [
        h(DropdownMenuTrigger, { asChild: true }, () => h(Button, { variant: 'ghost', class: 'h-8 w-8 p-0' }, () => [h(MoreHorizontal, { class: 'h-4 w-4' }), h('span', { class: 'sr-only' }, 'Open menu')])),
        h(DropdownMenuContent, { align: 'end' }, () => [
          h(DropdownMenuItem, {}, () => 'Copy order ID'),
          h(DropdownMenuItem, {}, () => 'View customer'),
          h(DropdownMenuItem, {}, () => 'View payment details'),
        ]),
      ]),
    ]),
  },
]

const table = useVueTable({
  get data() { return orders },
  columns,
  state: {
    get sorting() { return sorting.value },
    get columnFilters() { return columnFilters.value },
  },
  onSortingChange: updater => valueUpdater(updater, sorting),
  onColumnFiltersChange: updater => valueUpdater(updater, columnFilters),
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  initialState: { pagination: { pageSize: 8 } },
})

watch(customerFilter, (v) => {
  table.getColumn('customer')?.setFilterValue(v)
})
</script>

<template>
  <UiCard class="lg:col-span-7">
    <UiCardHeader>
      <UiCardTitle>Recent Orders</UiCardTitle>
    </UiCardHeader>
    <UiCardContent class="space-y-4">
      <UiInput
        v-model="customerFilter"
        placeholder="Filter orders..."
        class="max-w-xs"
      />
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
              <UiTableRow v-for="row in table.getRowModel().rows" :key="row.id">
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
          Showing {{ table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1 }} to
          {{ Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, orders.length) }} of {{ orders.length }} entries
        </p>
        <div class="space-x-2">
          <UiButton variant="outline" size="sm" :disabled="!table.getCanPreviousPage()" @click="table.previousPage()">
            <ChevronLeft class="h-4 w-4" />
          </UiButton>
          <UiButton variant="outline" size="sm" :disabled="!table.getCanNextPage()" @click="table.nextPage()">
            <ChevronRight class="h-4 w-4" />
          </UiButton>
        </div>
      </div>
    </UiCardContent>
  </UiCard>
</template>
