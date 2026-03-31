import type { ColumnDef } from '@tanstack/vue-table'

import { h } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import type { BadgeVariants } from '@/components/ui/badge'
import type { SysUserResult } from '@/services/api/core/user.api'

import AvatarGenerated from '@/components/avatar-generated.vue'
import DataTableColumnHeader from '@/components/data-table/column-header.vue'
import { Copy } from '@/components/sva-ui/copy'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { updateSysUserPermissionApi } from '@/services/api/core/user.api'
import { getAvatarSeed, getAvatarUrl, isAvatarSeed } from '@/utils/avatar'

import DataTableRowActions from './data-table-row-actions.vue'

/** Roles 列：按角色名选择 Badge variant，不同内容不同颜色 */
const roleVariantMap: Record<string, BadgeVariants['variant']> = {
  SuperAdmin: 'success',
  superadmin: 'success',
  Admin: 'info',
  admin: 'info',
  Development: 'warning',
  development: 'warning',
  User: 'info',
  user: 'info',
  Quality: 'inactive',
  quality: 'inactive',
}

const fallbackColorVariants: BadgeVariants['variant'][] = ['success', 'info', 'warning']

function getRoleBadgeVariant(roleName: string): BadgeVariants['variant'] {
  const raw = roleName?.trim() ?? ''
  if (!raw)
    return 'success'
  const exact = roleVariantMap[raw] ?? roleVariantMap[raw.toLowerCase()]
  if (exact)
    return exact
  const noSpace = raw.replace(/\s+/g, '')
  const noSpaceMatch = roleVariantMap[noSpace] ?? roleVariantMap[noSpace.toLowerCase()]
  if (noSpaceMatch)
    return noSpaceMatch
  // 未映射的角色：按名称哈希分配不同颜色，保持同一角色颜色一致
  let hash = 0
  for (let i = 0; i < raw.length; i++)
    hash = ((hash << 5) - hash) + raw.charCodeAt(i)
  const idx = Math.abs(hash) % fallbackColorVariants.length
  return fallbackColorVariants[idx]
}

export function createColumns(refresh: () => void): ColumnDef<SysUserResult>[] {
  const { t } = useI18n()
  return [
    {
      accessorKey: 'avatar',
      header: ({ column }) => h(DataTableColumnHeader<SysUserResult>, { column, title: t('user.columns.avatar') }),
      cell: ({ row }) => {
        const av = row.original.avatar
        const avatarSrc = getAvatarUrl(av)
        const name = isAvatarSeed(av) ? (getAvatarSeed(av) ?? row.original.username) : (row.original.username ?? String(row.original.id))
        return h('div', { class: 'flex items-center' }, [
          avatarSrc
            ? h('img', { src: avatarSrc, alt: '', class: 'size-8 rounded-full object-cover' })
            : h(AvatarGenerated, { name, size: 32 }),
        ])
      },
      enableSorting: false,
      enableResizing: true,
      size: 80,
    },
    {
      accessorKey: 'id',
      header: ({ column }) => h(DataTableColumnHeader<SysUserResult>, { column, title: t('user.columns.id') }),
      cell: ({ row }) => h('div', { class: 'tabular-nums' }, row.getValue('id')),
      enableSorting: false,
      enableHiding: false,
      enableResizing: true,
      size: 60,
    },
    {
      accessorKey: 'username',
      header: ({ column }) => h(DataTableColumnHeader<SysUserResult>, { column, title: t('user.columns.username') }),
      cell: ({ row }) => h('div', { class: 'font-medium' }, row.getValue('username')),
      enableSorting: false,
      enableResizing: true,
    },
    {
      accessorKey: 'nickname',
      header: ({ column }) => h(DataTableColumnHeader<SysUserResult>, { column, title: t('user.columns.nickname') }),
      cell: ({ row }) => h('div', {}, row.getValue('nickname') ?? '—'),
      enableSorting: false,
      enableResizing: true,
    },
    {
      accessorKey: 'roles',
      header: ({ column }) => h(DataTableColumnHeader<SysUserResult>, {
        column,
        title: t('user.columns.roles'),
        class: 'text-muted-foreground',
      }),
      cell: ({ row }) => {
        const roles = row.original.roles ?? []
        if (roles.length === 0)
          return h('span', { class: 'text-muted-foreground' }, t('user.columns.unbound'))
        return h('div', { class: 'flex flex-wrap gap-1' }, roles.map((r: { name?: string, role_name?: string } | string) => {
          const name = typeof r === 'string'
            ? r
            : (r && typeof r === 'object'
                ? (r.name ?? (r as { role_name?: string }).role_name ?? '')
                : '')
          const variant = getRoleBadgeVariant(name)
          return h(Badge, { key: `${row.original.id}-${name}`, variant }, () => name)
        }))
      },
      enableSorting: false,
      enableResizing: true,
    },
    {
      accessorKey: 'phone',
      header: ({ column }) => h(DataTableColumnHeader<SysUserResult>, { column, title: t('user.columns.phone') }),
      cell: ({ row }) => h('div', {}, [
        h('span', {}, row.original.phone ?? '—'),
        row.original.phone ? h(Copy, { class: 'ml-1 inline', size: 'sm', content: row.original.phone }) : null,
      ]),
      enableSorting: false,
      enableResizing: true,
    },
    {
      accessorKey: 'email',
      header: ({ column }) => h(DataTableColumnHeader<SysUserResult>, { column, title: t('user.columns.email') }),
      cell: ({ row }) => h('div', {}, row.original.email ?? '—'),
      enableSorting: false,
      enableResizing: true,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => h(DataTableColumnHeader<SysUserResult>, { column, title: t('user.columns.status') }),
      cell: ({ row }) => {
        const raw = row.original as Record<string, unknown>
        const v = raw.status != null ? Number(raw.status) : 0
        const checked = v === 1
        return h(Switch, {
          'modelValue': checked,
          'onUpdate:modelValue': async () => {
            try {
              await updateSysUserPermissionApi(row.original.id, 'status')
              toast.success(t('user.toast.operationSuccess'))
              refresh()
            }
            catch {}
          },
        })
      },
      enableSorting: false,
      enableResizing: true,
      size: 80,
    },
    {
      accessorKey: 'is_superuser',
      header: ({ column }) => h(DataTableColumnHeader<SysUserResult>, { column, title: t('user.columns.superuser') }),
      cell: ({ row }) => {
        const raw = row.original as Record<string, unknown>
        const checked = Boolean(raw?.is_superuser)
        return h(Switch, {
          'modelValue': checked,
          'onUpdate:modelValue': async () => {
            try {
              await updateSysUserPermissionApi(row.original.id, 'superuser')
              toast.success(t('user.toast.operationSuccess'))
              refresh()
            }
            catch {}
          },
        })
      },
      enableSorting: false,
      size: 100,
    },
    {
      accessorKey: 'is_staff',
      header: ({ column }) => h(DataTableColumnHeader<SysUserResult>, { column, title: t('user.columns.staffLogin') }),
      cell: ({ row }) => {
        const raw = row.original as Record<string, unknown>
        const checked = Boolean(raw?.is_staff)
        return h(Switch, {
          'modelValue': checked,
          'onUpdate:modelValue': async () => {
            try {
              await updateSysUserPermissionApi(row.original.id, 'staff')
              toast.success(t('user.toast.operationSuccess'))
              refresh()
            }
            catch {}
          },
        })
      },
      enableSorting: false,
      size: 100,
    },
    {
      accessorKey: 'is_multi_login',
      header: ({ column }) => h(DataTableColumnHeader<SysUserResult>, { column, title: t('user.columns.multiLogin') }),
      cell: ({ row }) => {
        const raw = row.original as Record<string, unknown>
        const checked = Boolean(raw?.is_multi_login)
        return h(Switch, {
          'modelValue': checked,
          'onUpdate:modelValue': async () => {
            try {
              await updateSysUserPermissionApi(row.original.id, 'multi_login')
              toast.success(t('user.toast.operationSuccess'))
              refresh()
            }
            catch {}
          },
        })
      },
      enableSorting: false,
      size: 100,
    },
    {
      accessorKey: 'join_time',
      header: ({ column }) => h(DataTableColumnHeader<SysUserResult>, { column, title: t('user.columns.joinTime') }),
      cell: ({ row }) => h('div', { class: 'text-muted-foreground text-sm' }, row.original.join_time ?? '—'),
      enableSorting: false,
      enableResizing: true,
    },
    {
      accessorKey: 'last_login_time',
      header: ({ column }) => h(DataTableColumnHeader<SysUserResult>, { column, title: t('user.columns.lastLogin') }),
      cell: ({ row }) => h('div', { class: 'text-muted-foreground text-sm' }, row.original.last_login_time ?? '—'),
      enableSorting: false,
      enableResizing: true,
    },
    {
      id: 'actions',
      cell: ({ row }) => h(DataTableRowActions, { row }),
      size: 120,
    },
  ]
}
