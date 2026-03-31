import type { ColumnDef } from '@tanstack/vue-table'

import { h } from 'vue'
import { useI18n } from 'vue-i18n'

import type { StatusBadgeColor } from '@/components/ui/status-badge'
import type { StackListResponse } from '@/plugin/docker/api'

import DataTableColumnHeader from '@/components/data-table/column-header.vue'
import { SelectColumn } from '@/components/data-table/table-columns'
import { StatusBadge } from '@/components/ui/status-badge'

function getStatusBadgeColor(status: string): StatusBadgeColor {
  const s = (status || '').toLowerCase()
  if (s.includes('running') || s.includes('up'))
    return 'green'
  if (s.includes('stopped') || s.includes('down'))
    return 'red'
  if (s.includes('restarting'))
    return 'yellow'
  return 'gray'
}

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

function getFileName(filePath: string): string {
  const parts = filePath.split(/[/\\]/)
  return parts[parts.length - 1] || filePath
}

export function createColumns(): ColumnDef<StackListResponse>[] {
  const { t } = useI18n()
  return [
    { ...SelectColumn, size: 48 },
    {
      accessorKey: 'name',
      header: ({ column }) =>
        h(DataTableColumnHeader<StackListResponse>, {
          column,
          title: t('docker.stacks.columns.name'),
        }),
      cell: ({ row }) =>
        h('span', { class: 'font-medium' }, row.original.name ?? '—'),
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
      accessorKey: 'status',
      header: ({ column }) =>
        h(DataTableColumnHeader<StackListResponse>, {
          column,
          title: t('docker.stacks.columns.status'),
        }),
      cell: ({ row }) => {
        const status = row.original.status
        if (!status)
          return h('span', { class: 'text-muted-foreground' }, '—')
        const display = status.replace(/\([^)]*\)$/, '')
        const color = getStatusBadgeColor(status)
        return h(StatusBadge, { color }, () => display)
      },
      enableSorting: false,
      enableResizing: true,
      size: 120,
    },
    {
      accessorKey: 'config_files',
      header: ({ column }) =>
        h(DataTableColumnHeader<StackListResponse>, {
          column,
          title: t('docker.stacks.columns.configFiles'),
        }),
      cell: ({ row }) => {
        const files = row.original.config_files
        if (!files?.length)
          return h('span', { class: 'text-muted-foreground' }, '—')
        return h(
          'div',
          { class: 'flex flex-wrap gap-1' },
          files.map(file =>
            h(StatusBadge, {
              key: file,
              color: 'gray',
              class: 'font-mono text-xs',
              title: file,
            }, () => getFileName(file)),
          ),
        )
      },
      enableSorting: false,
      enableResizing: true,
      size: 260,
    },
    {
      accessorKey: 'containers',
      header: ({ column }) =>
        h(DataTableColumnHeader<StackListResponse>, {
          column,
          title: t('docker.stacks.columns.containers'),
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
      size: 220,
    },
    {
      accessorKey: 'created',
      header: ({ column }) =>
        h(DataTableColumnHeader<StackListResponse>, {
          column,
          title: t('docker.stacks.columns.created'),
        }),
      cell: ({ row }) =>
        h('div', { class: 'text-muted-foreground text-sm tabular-nums' }, formatDateTime(row.original.created)),
      enableSorting: true,
      enableResizing: true,
      size: 170,
    },
    {
      accessorKey: 'updated',
      header: ({ column }) =>
        h(DataTableColumnHeader<StackListResponse>, {
          column,
          title: t('docker.stacks.columns.updated'),
        }),
      cell: ({ row }) =>
        h('div', { class: 'text-muted-foreground text-sm tabular-nums' }, formatDateTime(row.original.updated)),
      enableSorting: true,
      enableResizing: true,
      size: 170,
    },
  ]
}
