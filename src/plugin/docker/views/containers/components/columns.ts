import type { ColumnDef } from '@tanstack/vue-table'

import { h } from 'vue'
import { useI18n } from 'vue-i18n'

import type { StatusBadgeColor } from '@/components/ui/status-badge'
import type { ContainerListResponse } from '@/plugin/docker/api'

import DataTableColumnHeader from '@/components/data-table/column-header.vue'
import { SelectColumn } from '@/components/data-table/table-columns'
import { StatusBadge } from '@/components/ui/status-badge'

import DataTableRowActions from './data-table-row-actions.vue'

export interface ContainerColumnsContext {
  onViewDetail: (row: ContainerListResponse) => void
  onLogs: (row: ContainerListResponse) => void
  onStats: (row: ContainerListResponse) => void
}

function getStateBadgeColor(status: string): StatusBadgeColor {
  const s = (status || '').toLowerCase()
  if (s.includes('running') || s.includes('up'))
    return 'green'
  if (s.includes('exited') || s.includes('stopped') || s.includes('down'))
    return 'red'
  if (s.includes('paused'))
    return 'yellow'
  if (s.includes('restarting'))
    return 'yellow'
  return 'gray'
}

function getStatusText(status: string, t: (key: string) => string): string {
  const s = (status || '').toLowerCase()
  if (s.includes('running') || s.includes('up'))
    return t('docker.containers.status.running')
  if (s.includes('exited'))
    return t('docker.containers.status.exited')
  if (s.includes('paused'))
    return t('docker.containers.status.paused')
  return status || '—'
}

function formatCreated(created: null | string): string {
  if (!created)
    return '—'
  const date = new Date(created)
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

export function createColumns(ctx: ContainerColumnsContext): ColumnDef<ContainerListResponse>[] {
  const { t } = useI18n()
  return [
    { ...(SelectColumn as ColumnDef<ContainerListResponse>), size: 48 },
    {
      accessorKey: 'name',
      header: ({ column }) =>
        h(DataTableColumnHeader<ContainerListResponse>, {
          column,
          title: t('docker.containers.columns.name'),
        }),
      cell: ({ row }) => {
        const name = row.original.name ?? '—'
        return h(
          'button',
          {
            class: 'font-medium text-primary hover:underline text-left',
            onClick: (e: Event) => {
              e.stopPropagation()
              ctx.onViewDetail(row.original)
            },
          },
          name,
        )
      },
      filterFn: (row, _columnId, filterValue) => {
        const name = row.original.name ?? ''
        const v = (filterValue as string || '').toLowerCase()
        return !v || name.toLowerCase().includes(v)
      },
      enableSorting: false,
      enableResizing: true,
      size: 200,
    },
    {
      accessorKey: 'status',
      header: ({ column }) =>
        h(DataTableColumnHeader<ContainerListResponse>, {
          column,
          title: t('docker.containers.columns.state'),
        }),
      cell: ({ row }) => {
        const status = row.original.status
        const text = getStatusText(status, t)
        const color = getStateBadgeColor(status)
        return h(StatusBadge, { color }, () => text)
      },
      enableSorting: false,
      enableResizing: true,
      size: 120,
    },
    {
      accessorKey: 'stack',
      header: ({ column }) =>
        h(DataTableColumnHeader<ContainerListResponse>, {
          column,
          title: t('docker.containers.columns.stack'),
        }),
      cell: ({ row }) =>
        h('div', { class: 'text-muted-foreground' }, row.original.stack ?? '—'),
      enableSorting: false,
      enableResizing: true,
      size: 100,
    },
    {
      accessorKey: 'image',
      header: ({ column }) =>
        h(DataTableColumnHeader<ContainerListResponse>, {
          column,
          title: t('docker.containers.columns.image'),
        }),
      cell: ({ row }) => {
        const img = row.original.image
        if (!img)
          return h('span', { class: 'text-muted-foreground' }, '—')
        let display = img
        if (img.includes('sha256:')) {
          const hashPart = img.split('sha256:')[1]
          if (hashPart)
            display = hashPart.slice(0, 12)
        }
        else if (img.length > 50) {
          display = `${img.slice(0, 50)}...`
        }
        return h(StatusBadge, { color: 'blue', class: 'font-mono text-sm' }, () => display)
      },
      enableSorting: false,
      enableResizing: true,
      size: 220,
    },
    {
      accessorKey: 'created',
      header: ({ column }) =>
        h(DataTableColumnHeader<ContainerListResponse>, {
          column,
          title: t('docker.containers.columns.created'),
        }),
      cell: ({ row }) =>
        h('div', { class: 'text-muted-foreground text-sm tabular-nums' }, formatCreated(row.original.created)),
      enableSorting: true,
      enableResizing: true,
      size: 180,
    },
    {
      accessorKey: 'ip_address',
      header: ({ column }) =>
        h(DataTableColumnHeader<ContainerListResponse>, {
          column,
          title: t('docker.containers.columns.ipAddress'),
        }),
      cell: ({ row }) =>
        h('div', { class: 'text-muted-foreground text-sm' }, row.original.ip_address ?? '—'),
      enableSorting: false,
      enableResizing: true,
      size: 140,
    },
    {
      accessorKey: 'ports',
      header: ({ column }) =>
        h(DataTableColumnHeader<ContainerListResponse>, {
          column,
          title: t('docker.containers.columns.publishedPorts'),
        }),
      cell: ({ row }) => {
        const ports = row.original.ports
        if (!ports?.length)
          return h('span', { class: 'text-muted-foreground' }, '—')
        return h(
          'div',
          { class: 'flex flex-wrap gap-1 text-sm' },
          ports.map((p: string) => h('span', { key: p, class: 'rounded bg-muted px-1.5 py-0.5 font-mono' }, p)),
        )
      },
      enableSorting: false,
      enableResizing: true,
      size: 180,
    },
    {
      id: 'actions',
      cell: ({ row }) => h(DataTableRowActions, { row }),
      size: 120,
      enableSorting: false,
      enableHiding: false,
    },
  ]
}
