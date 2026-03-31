import type { ColumnDef } from '@tanstack/vue-table'

import { h } from 'vue'
import { useI18n } from 'vue-i18n'

import type { NetworkListResponse } from '@/plugin/docker/api'

import DataTableColumnHeader from '@/components/data-table/column-header.vue'
import Checkbox from '@/components/ui/checkbox/Checkbox.vue'
import { StatusBadge } from '@/components/ui/status-badge'

/** Names that cannot be selected or deleted (system + protected) */
export function createColumns(nonRemovableNames: string[]): ColumnDef<NetworkListResponse>[] {
  const { t } = useI18n()
  const nonRemovableSet = new Set(nonRemovableNames)

  const selectColumn: ColumnDef<NetworkListResponse> = {
    id: 'select',
    size: 48,
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => {
      const rows = table.getRowModel().rows
      const selectableRows = rows.filter(r => !nonRemovableSet.has(r.original.name))
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
      const disabled = nonRemovableSet.has(row.original.name)
      return h(Checkbox, {
        'modelValue': row.getIsSelected(),
        'onUpdate:modelValue': (v: boolean | 'indeterminate') => {
          if (!disabled)
            row.toggleSelected(!!v)
        },
        disabled,
        'ariaLabel': 'Select row',
      })
    },
  }

  return [
    selectColumn,
    {
      accessorKey: 'name',
      header: ({ column }) =>
        h(DataTableColumnHeader<NetworkListResponse>, {
          column,
          title: t('docker.networks.columns.name'),
        }),
      cell: ({ row }) => {
        const name = row.original.name ?? '—'
        const isSystem = nonRemovableSet.has(name) && ['bridge', 'host', 'none'].includes(name)
        const isProtected = nonRemovableSet.has(name) && !isSystem
        return h('div', { class: 'flex flex-wrap items-center gap-1.5' }, [
          h('span', { class: 'font-medium' }, name),
          isProtected
          && h(StatusBadge, { color: 'gray', class: 'text-xs' }, () => 'mc'),
          isProtected
          && h(StatusBadge, { color: 'violet', class: 'text-xs' }, () => t('docker.volumes.columns.undeletable')),
          isSystem
          && h(StatusBadge, { color: 'gray', class: 'text-xs' }, () => t('docker.networks.columns.system')),
        ].filter(Boolean))
      },
      filterFn: (row, _columnId, filterValue) => {
        const name = row.original.name ?? ''
        const v = (filterValue as string || '').toLowerCase()
        return !v || name.toLowerCase().includes(v)
      },
      enableSorting: true,
      enableResizing: true,
      size: 180,
    },
    {
      accessorKey: 'driver',
      header: ({ column }) =>
        h(DataTableColumnHeader<NetworkListResponse>, {
          column,
          title: t('docker.networks.columns.driver'),
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
        h(DataTableColumnHeader<NetworkListResponse>, {
          column,
          title: t('docker.networks.columns.stack'),
        }),
      cell: ({ row }) =>
        h('div', { class: 'text-muted-foreground text-sm' }, row.original.stack ?? '—'),
      enableSorting: false,
      enableResizing: true,
      size: 110,
    },
    {
      accessorKey: 'scope',
      header: ({ column }) =>
        h(DataTableColumnHeader<NetworkListResponse>, {
          column,
          title: t('docker.networks.columns.scope'),
        }),
      cell: ({ row }) =>
        h('div', { class: 'text-muted-foreground text-sm' }, row.original.scope ?? '—'),
      enableSorting: false,
      enableResizing: true,
      size: 90,
    },
    {
      accessorKey: 'attachable',
      header: ({ column }) =>
        h(DataTableColumnHeader<NetworkListResponse>, {
          column,
          title: t('docker.networks.columns.attachable'),
        }),
      cell: ({ row }) =>
        h('span', { class: 'text-muted-foreground text-sm' }, row.original.attachable ? 'true' : 'false'),
      enableSorting: false,
      enableResizing: true,
      size: 90,
    },
    {
      accessorKey: 'ipv4_subnet',
      header: ({ column }) =>
        h(DataTableColumnHeader<NetworkListResponse>, {
          column,
          title: t('docker.networks.columns.ipv4Subnet'),
        }),
      cell: ({ row }) => {
        const s = row.original.ipv4_subnet
        if (!s)
          return h('span', { class: 'text-muted-foreground' }, '—')
        return h('code', { class: 'text-muted-foreground text-xs' }, s)
      },
      enableSorting: false,
      enableResizing: true,
      size: 140,
    },
    {
      accessorKey: 'ipv4_gateway',
      header: ({ column }) =>
        h(DataTableColumnHeader<NetworkListResponse>, {
          column,
          title: t('docker.networks.columns.ipv4Gateway'),
        }),
      cell: ({ row }) => {
        const g = row.original.ipv4_gateway
        if (!g)
          return h('span', { class: 'text-muted-foreground' }, '—')
        return h('code', { class: 'text-muted-foreground text-xs' }, g)
      },
      enableSorting: false,
      enableResizing: true,
      size: 130,
    },
    {
      id: 'ipv6_subnet',
      accessorKey: 'ipv6_subnet',
      header: ({ column }) =>
        h(DataTableColumnHeader<NetworkListResponse>, {
          column,
          title: t('docker.networks.columns.ipv6Subnet'),
        }),
      cell: ({ row }) => {
        const s = row.original.ipv6_subnet
        if (!s)
          return h('span', { class: 'text-muted-foreground' }, '—')
        return h('code', { class: 'text-muted-foreground text-xs' }, s)
      },
      enableSorting: false,
      enableResizing: true,
      size: 140,
    },
    {
      id: 'ipv6_gateway',
      accessorKey: 'ipv6_gateway',
      header: ({ column }) =>
        h(DataTableColumnHeader<NetworkListResponse>, {
          column,
          title: t('docker.networks.columns.ipv6Gateway'),
        }),
      cell: ({ row }) => {
        const g = row.original.ipv6_gateway
        if (!g)
          return h('span', { class: 'text-muted-foreground' }, '—')
        return h('code', { class: 'text-muted-foreground text-xs' }, g)
      },
      enableSorting: false,
      enableResizing: true,
      size: 130,
    },
    {
      accessorKey: 'containers',
      header: ({ column }) =>
        h(DataTableColumnHeader<NetworkListResponse>, {
          column,
          title: t('docker.networks.columns.containers'),
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
      size: 180,
    },
  ]
}
