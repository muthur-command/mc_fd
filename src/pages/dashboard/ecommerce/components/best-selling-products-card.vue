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
import { ArrowUpDown, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-vue-next'
import { h } from 'vue'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { valueUpdater } from '@/lib/utils'

export interface Product {
  id: number
  image: string
  name: string
  price: number
  sold: number
  sales: number
}

const data: Product[] = [
  { id: 1, image: 'https://bundui-images.netlify.app/products/01.jpeg', name: 'Sports Shoes', price: 316, sold: 316, sales: 10 },
  { id: 2, image: 'https://bundui-images.netlify.app/products/02.jpeg', name: 'Black T-Shirt', price: 274, sold: 274, sales: 20 },
  { id: 3, image: 'https://bundui-images.netlify.app/products/03.jpeg', name: 'Jeans', price: 195, sold: 195, sales: 15 },
  { id: 4, image: 'https://bundui-images.netlify.app/products/04.jpeg', name: 'Red Sneakers', price: 402, sold: 402, sales: 40 },
  { id: 5, image: 'https://bundui-images.netlify.app/products/05.jpeg', name: 'Red Scarf', price: 280, sold: 280, sales: 37 },
  { id: 6, image: 'https://bundui-images.netlify.app/products/06.jpeg', name: 'Kitchen Accessory', price: 150, sold: 150, sales: 18 },
  { id: 7, image: 'https://bundui-images.netlify.app/products/07.jpeg', name: 'Bicycle', price: 316, sold: 316, sales: 25 },
  { id: 8, image: 'https://bundui-images.netlify.app/products/01.jpeg', name: 'Sports Shoes', price: 290, sold: 290, sales: 12 },
]

const sorting = ref([])
const columnFilters = ref([])
const nameFilter = ref('')

const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'name',
    header: 'Product',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-4' }, [
      h('img', { src: row.original.image, class: 'size-8 rounded object-cover', alt: '' }),
      h('div', { class: 'capitalize' }, row.getValue('name') as string),
    ]),
    filterFn: (row, _id, filterValue: string) => row.original.name.toLowerCase().includes((filterValue ?? '').toLowerCase()),
  },
  {
    accessorKey: 'sold',
    header: () => h(Button, { variant: 'ghost', class: 'p-0! hover:bg-transparent!' }, () => ['Sold', h(ArrowUpDown, { class: 'size-3' })]),
    cell: ({ row }) => h('div', { class: 'font-medium' }, new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.original.sold)),
  },
  {
    accessorKey: 'sales',
    header: () => h(Button, { variant: 'ghost', class: 'p-0! hover:bg-transparent!' }, () => ['Sales', h(ArrowUpDown, { class: 'size-3' })]),
    cell: ({ row }) => h('div', {}, row.getValue('sales') as number),
  },
  {
    id: 'actions',
    cell: () => h('div', { class: 'text-end' }, [
      h(DropdownMenu, {}, () => [
        h(DropdownMenuTrigger, { asChild: true }, () => h(Button, { variant: 'ghost', class: 'h-8 w-8 p-0' }, () => [h(MoreHorizontal, { class: 'h-4 w-4' }), h('span', { class: 'sr-only' }, 'Open menu')])),
        h(DropdownMenuContent, { align: 'end' }, () => [
          h(DropdownMenuItem, {}, () => 'Copy product ID'),
          h(DropdownMenuItem, {}, () => 'View customer'),
          h(DropdownMenuItem, {}, () => 'View payment details'),
        ]),
      ]),
    ]),
  },
]

const table = useVueTable({
  get data() { return data },
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

watch(nameFilter, (v) => {
  table.getColumn('name')?.setFilterValue(v)
})
</script>

<template>
  <UiCard class="lg:col-span-5">
    <UiCardHeader>
      <UiCardTitle>Best Selling Products</UiCardTitle>
    </UiCardHeader>
    <UiCardContent class="space-y-4">
      <UiInput v-model="nameFilter" placeholder="Filter products..." class="max-w-xs" />
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
      <div class="flex items-center justify-end space-x-2">
        <div class="flex-1 text-sm text-muted-foreground">
          {{ table.getFilteredRowModel().rows.length }} row(s)
        </div>
        <div class="space-x-2">
          <UiButton variant="outline" size="icon" :disabled="!table.getCanPreviousPage()" @click="table.previousPage()">
            <ChevronLeft />
          </UiButton>
          <UiButton variant="outline" size="icon" :disabled="!table.getCanNextPage()" @click="table.nextPage()">
            <ChevronRight />
          </UiButton>
        </div>
      </div>
    </UiCardContent>
  </UiCard>
</template>
