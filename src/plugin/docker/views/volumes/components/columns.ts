import type { ColumnDef } from '@tanstack/vue-table'

import { h } from 'vue'
import { useI18n } from 'vue-i18n'

import type { VolumeListResponse } from '@/plugin/docker/api'

import DataTableColumnHeader from '@/components/data-table/column-header.vue'
import Checkbox from '@/components/ui/checkbox/Checkbox.vue'
import { StatusBadge } from '@/components/ui/status-badge'

function formatDateTime(dateStr: null | string): string {
  if (!dateStr)
    return '—'
  const date = new Date(dateStr)
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US'
  const isZh = locale.startsWith('zh')
  return date
    .toLocaleString(isZh ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    .replace(/\//g, '-')
    .replace(/,/g, '')
}

function formatOptions(options: Record<string, string> | undefined): string {
  if (!options || Object.keys(options).length === 0)
    return '—'
  return Object.entries(options)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')
}

export function createColumns(protectedVolumeNames: string[]): ColumnDef<VolumeListResponse>[] {
  const { t } = useI18n()
  const protectedSet = new Set(protectedVolumeNames)

  const selectColumn: ColumnDef<VolumeListResponse> = {
    id: 'select',
    size: 48,
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => {
      const rows = table.getRowModel().rows
      const selectableRows = rows.filter(r => !protectedSet.has(r.original.name))
      const allSelected
        = selectableRows.length > 0 && selectableRows.every(r => r.getIsSelected())
      const someSelected = selectableRows.some(r => r.getIsSelected())
      return h(Checkbox, {
        'modelValue': allSelected ? true : (someSelected ? 'indeterminate' : false),
        'onUpdate:modelValue': () => {
          const nextSelect = !allSelected
          selectableRows.forEach(r => r.toggleSelected(nextSelect))
        },
        'ariaLabel': 'Select all',
      })
    },
    cell: ({ row }) => {
      const isProtected = protectedSet.has(row.original.name)
      return h(Checkbox, {
        'modelValue': row.getIsSelected(),
        'onUpdate:modelValue': (v: boolean | 'indeterminate') => {
          if (!isProtected)
            row.toggleSelected(!!v)
        },
        'disabled': isProtected,
        'ariaLabel': 'Select row',
      })
    },
  }

  return [
    selectColumn,
    {
      accessorKey: 'name',
      header: ({ column }) =>
        h(DataTableColumnHeader<VolumeListResponse>, {
          column,
          title: t('docker.volumes.columns.name'),
        }),
      cell: ({ row }) => {
        const name = row.original.name ?? '—'
        const isProtected = protectedSet.has(row.original.name)
        const isUnused
          = !row.original.containers?.length
        return h('div', { class: 'flex flex-wrap items-center gap-1.5' }, [
          h('span', { class: 'font-medium' }, name),
          isProtected
          && h(StatusBadge, { color: 'gray', class: 'text-xs' }, () => 'mc'),
          isProtected
          && h(StatusBadge, { color: 'violet', class: 'text-xs' }, () => t('docker.volumes.columns.undeletable')),
          isUnused
          && !isProtected
          && h(StatusBadge, { color: 'yellow', class: 'text-xs' }, () => t('docker.volumes.columns.unused')),
        ].filter(Boolean))
      },
      filterFn: (row, _columnId, filterValue) => {
        const name = row.original.name ?? ''
        const v = (filterValue as string || '').toLowerCase()
        return !v || name.toLowerCase().includes(v)
      },
      enableSorting: true,
      enableResizing: true,
      size: 200,
    },
    {
      accessorKey: 'driver',
      header: ({ column }) =>
        h(DataTableColumnHeader<VolumeListResponse>, {
          column,
          title: t('docker.volumes.columns.driver'),
        }),
      cell: ({ row }) => {
        const driver = row.original.driver
        if (!driver)
          return h('span', { class: 'text-muted-foreground' }, '—')
        return h(StatusBadge, { color: 'blue', class: 'font-mono text-xs' }, () => driver)
      },
      enableSorting: false,
      enableResizing: true,
      size: 100,
    },
    {
      accessorKey: 'stack',
      header: ({ column }) =>
        h(DataTableColumnHeader<VolumeListResponse>, {
          column,
          title: t('docker.volumes.columns.stack'),
        }),
      cell: ({ row }) =>
        h('div', { class: 'text-muted-foreground text-sm' }, row.original.stack ?? '—'),
      enableSorting: false,
      enableResizing: true,
      size: 120,
    },
    {
      accessorKey: 'mountpoint',
      header: ({ column }) =>
        h(DataTableColumnHeader<VolumeListResponse>, {
          column,
          title: t('docker.volumes.columns.mountpoint'),
        }),
      cell: ({ row }) => {
        const mp = row.original.mountpoint
        if (!mp)
          return h('span', { class: 'text-muted-foreground' }, '—')
        return h('code', { class: 'text-muted-foreground text-xs break-all' }, mp)
      },
      enableSorting: false,
      enableResizing: true,
      size: 240,
    },
    {
      id: 'options',
      accessorKey: 'options',
      header: ({ column }) =>
        h(DataTableColumnHeader<VolumeListResponse>, {
          column,
          title: t('docker.volumes.columns.options'),
        }),
      cell: ({ row }) => {
        const opts = row.original.options
        const str = formatOptions(opts)
        if (str === '—')
          return h('span', { class: 'text-muted-foreground' }, '—')
        return h('code', { class: 'text-muted-foreground text-xs break-all' }, str)
      },
      enableSorting: false,
      enableResizing: true,
      size: 200,
    },
    {
      accessorKey: 'containers',
      header: ({ column }) =>
        h(DataTableColumnHeader<VolumeListResponse>, {
          column,
          title: t('docker.volumes.columns.usedBy'),
        }),
      cell: ({ row }) => {
        const containers = row.original.containers
        if (!containers?.length)
          return h('span', { class: 'text-muted-foreground' }, '—')
        return h(
          'div',
          { class: 'flex flex-wrap gap-1' },
          containers.map((name: string) =>
            h(StatusBadge, { key: name, color: 'blue', class: 'font-mono text-xs' }, () => name),
          ),
        )
      },
      enableSorting: false,
      enableResizing: true,
      size: 200,
    },
    {
      accessorKey: 'created',
      header: ({ column }) =>
        h(DataTableColumnHeader<VolumeListResponse>, {
          column,
          title: t('docker.volumes.columns.created'),
        }),
      cell: ({ row }) =>
        h('div', { class: 'text-muted-foreground text-sm tabular-nums' }, formatDateTime(row.original.created)),
      enableSorting: true,
      enableResizing: true,
      size: 170,
    },
  ]
}
