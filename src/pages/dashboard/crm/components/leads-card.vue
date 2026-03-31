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
import { ChevronDown, ChevronsUpDown, Ellipsis } from 'lucide-vue-next'
import { h, ref, watch } from 'vue'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { valueUpdater } from '@/lib/utils'

interface Payment {
  id: string
  amount: number
  status: 'pending' | 'processing' | 'success' | 'failed'
  email: string
}

const data: Payment[] = [
  { id: 'm5gr84i9', amount: 316, status: 'success', email: 'ken99@yahoo.com' },
  { id: '3u1reuv4', amount: 242, status: 'success', email: 'Abe45@gmail.com' },
  { id: 'derv1ws0', amount: 837, status: 'processing', email: 'Monserrat44@gmail.com' },
  { id: '5kma53ae', amount: 874, status: 'success', email: 'Silas22@gmail.com' },
  { id: 'bhqecj4p', amount: 721, status: 'failed', email: 'carmella@hotmail.com' },
]

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
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => h('div', { class: 'capitalize' }, row.getValue('status') as string),
  },
  {
    accessorKey: 'email',
    header: ({ column }) =>
      h(Button, {
        variant: 'ghost',
        class: 'p-0!',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => ['Email', h(ChevronsUpDown, { class: 'size-3!' })]),
    cell: ({ row }) => h('div', { class: 'lowercase' }, row.getValue('email') as string),
  },
  {
    accessorKey: 'amount',
    header: () => h('div', { class: 'text-right' }, 'Amount'),
    cell: ({ row }) => {
      const amount = Number(row.getValue('amount'))
      const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
      return h('div', { class: 'text-right font-medium' }, formatted)
    },
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const payment = row.original
      return h('div', { class: 'text-end' }, [
        h(DropdownMenu, {}, () => [
          h(DropdownMenuTrigger, { asChild: true }, () => [
            h(Button, { variant: 'ghost' }, () => [
              h('span', { class: 'sr-only' }, 'Open menu'),
              h(Ellipsis),
            ]),
          ]),
          h(DropdownMenuContent, { align: 'end' }, () => [
            h(DropdownMenuLabel, {}, () => 'Actions'),
            h(DropdownMenuItem, { onClick: () => navigator.clipboard.writeText(payment.id) }, () => 'Copy payment ID'),
            h(DropdownMenuSeparator),
            h(DropdownMenuItem, {}, () => 'View customer'),
            h(DropdownMenuItem, {}, () => 'View payment details'),
          ]),
        ]),
      ])
    },
  },
]

const sorting = ref<SortingState>([])
const columnFilters = ref<ColumnFiltersState>([])
const columnVisibility = ref<VisibilityState>({})
const rowSelection = ref({})
const emailFilter = ref('')

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
})

watch(
  () => table.getColumn('email')?.getFilterValue(),
  (v) => { emailFilter.value = (v as string) ?? '' },
  { immediate: true },
)
watch(emailFilter, v => table.getColumn('email')?.setFilterValue(v))
</script>

<template>
  <UiCard class="col-span-2">
    <UiCardHeader class="flex flex-row justify-between">
      <UiCardTitle>Leads</UiCardTitle>
    </UiCardHeader>
    <UiCardContent>
      <div class="mb-4 flex items-center gap-2">
        <UiInput
          v-model="emailFilter"
          placeholder="Filter leads..."
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
              <UiTableHead v-for="header in headerGroup.headers" :key="header.id" class="[&:has([role=checkbox])]:pl-3">
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
                <UiTableCell v-for="cell in row.getVisibleCells()" :key="cell.id" class="[&:has([role=checkbox])]:pl-3">
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
      <div class="flex items-center justify-end space-x-2 pt-4">
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
    </UiCardContent>
  </UiCard>
</template>
