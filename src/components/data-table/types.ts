import type { ColumnDef, VisibilityState } from '@tanstack/vue-table'

export interface FacetedFilterOption {
  label: string
  value: string
  icon?: Component
}

export interface ServerPagination {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export interface DataTableProps<T> {
  loading?: boolean
  columns: ColumnDef<T, any>[]
  data: T[]
  serverPagination?: ServerPagination
  /** 行唯一 id，用于稳定勾选状态（如服务端分页） */
  getRowId?: (row: T) => string
  /** 初始列可见性，未列出的列默认显示 */
  initialColumnVisibility?: VisibilityState
}
