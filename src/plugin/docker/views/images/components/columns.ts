import type { ColumnDef } from '@tanstack/vue-table'

import { h } from 'vue'
import { useI18n } from 'vue-i18n'

import type { ImageListResponse } from '@/plugin/docker/api'

import DataTableColumnHeader from '@/components/data-table/column-header.vue'
import { SelectColumn } from '@/components/data-table/table-columns'
import { StatusBadge } from '@/components/ui/status-badge'

function formatBytes(bytes: number, t: (key: string) => string): string {
  if (bytes === 0)
    return t('docker.images.units.zeroBytes')
  const k = 1024
  const sizes = [
    t('docker.images.units.bytes'),
    t('docker.images.units.kilobytes'),
    t('docker.images.units.megabytes'),
    t('docker.images.units.gigabytes'),
    t('docker.images.units.terabytes'),
  ]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`
}

function formatCreated(dateStr: null | string): string {
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

function formatId(id: string): string {
  if (!id)
    return '—'
  if (id.startsWith('sha256:'))
    return id.slice(7, 19)
  return id.length > 12 ? `${id.slice(0, 12)}` : id
}

export function createColumns(): ColumnDef<ImageListResponse>[] {
  const { t } = useI18n()
  return [
    { ...(SelectColumn as ColumnDef<ImageListResponse>), size: 48 },
    {
      accessorKey: 'id',
      header: ({ column }) =>
        h(DataTableColumnHeader<ImageListResponse>, {
          column,
          title: t('docker.images.columns.id'),
        }),
      cell: ({ row }) => {
        const id = row.original.id
        return h('code', { class: 'text-muted-foreground font-mono text-xs', title: id }, formatId(id))
      },
      filterFn: (row, _columnId, filterValue) => {
        const v = (filterValue as string || '').toLowerCase()
        if (!v)
          return true
        const id = row.original.id ?? ''
        const tags = row.original.tags ?? []
        return id.toLowerCase().includes(v) || tags.some(tag => tag.toLowerCase().includes(v))
      },
      enableSorting: false,
      enableResizing: true,
      size: 180,
    },
    {
      accessorKey: 'tags',
      header: ({ column }) =>
        h(DataTableColumnHeader<ImageListResponse>, {
          column,
          title: t('docker.images.columns.tags'),
        }),
      cell: ({ row }) => {
        const tags = row.original.tags
        if (!tags?.length) {
          return h('span', { class: 'text-muted-foreground text-sm' }, t('docker.images.tags.none'))
        }
        return h(
          'div',
          { class: 'flex flex-wrap gap-1' },
          tags.map(tag =>
            h(StatusBadge, { key: tag, color: 'blue', class: 'font-mono text-xs' }, () => tag),
          ),
        )
      },
      enableSorting: false,
      enableResizing: true,
      size: 260,
    },
    {
      accessorKey: 'size',
      header: ({ column }) =>
        h(DataTableColumnHeader<ImageListResponse>, {
          column,
          title: t('docker.images.columns.size'),
        }),
      cell: ({ row }) =>
        h('div', { class: 'text-muted-foreground tabular-nums text-sm' }, formatBytes(row.original.size ?? 0, t)),
      enableSorting: true,
      enableResizing: true,
      size: 120,
    },
    {
      accessorKey: 'created',
      header: ({ column }) =>
        h(DataTableColumnHeader<ImageListResponse>, {
          column,
          title: t('docker.images.columns.created'),
        }),
      cell: ({ row }) =>
        h('div', { class: 'text-muted-foreground text-sm tabular-nums' }, formatCreated(row.original.created)),
      enableSorting: true,
      enableResizing: true,
      size: 170,
    },
  ]
}
