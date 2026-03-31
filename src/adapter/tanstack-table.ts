import type { ComputedRef, VNode } from 'vue'

import { Table as AntTable, Button, Dropdown } from 'ant-design-vue'
/**
 * Adapter for Docker plugin: provides useTanStackTable compatible with vben-style API.
 * Renders Ant Design Vue Table + toolbar slot. Used by plugin/docker list pages.
 */
import { computed, h } from 'vue'

export interface TableOptions<T = any> {
  columns: any[]
  data: T[]
  rowKey: string
  onActionClick?: (params: { code: string, row: T }) => void
  scrollY?: string
}

export interface UseTanStackTableOptions<T = any> {
  tableTitle?: () => string
  tableOptions: ComputedRef<TableOptions<T>>
  queryFn: () => Promise<{ items?: T[] }>
  slots?: Record<string, () => VNode | VNode[]>
}

export interface TableApi {
  refresh: () => Promise<void>
  query?: () => Promise<void>
}

function transformColumns<T>(cols: any[], onActionClick?: (p: { code: string, row: T }) => void): any[] {
  if (!cols?.length)
    return []
  return cols.map((col: any) => {
    const antCol: any = {
      dataIndex: col.field,
      key: col.field ?? col.title,
      title: col.title,
      align: col.align,
      width: col.width,
      fixed: col.fixed,
    }
    if (col.formatter) {
      antCol.customRender = ({ text, record }: { text: any, record: T }) => col.formatter(text, record)
    }
    if (col.cellRender?.name === 'CellOperation' && col.cellRender.options?.length && onActionClick) {
      const options = col.cellRender.options
      antCol.customRender = ({ record }: { record: T }) =>
        h(
          Dropdown,
          {
            trigger: ['click'],
            overlay: () =>
              h(
                'div',
                { class: 'flex flex-col rounded border bg-background p-1 shadow' },
                options.map((opt: { code: string, text: string }) =>
                  h(
                    Button,
                    {
                      type: 'text',
                      size: 'small',
                      class: 'w-full text-left',
                      onClick: () => onActionClick({ code: opt.code, row: record }),
                    },
                    () => opt.text,
                  ),
                ),
              ),
          },
          {
            default: () =>
              h(Button, { size: 'small', type: 'link' }, () => '...'),
          },
        )
    }
    if (col.filter) {
      if (col.filter.filters)
        antCol.filters = col.filter.filters
      if (col.filter.onFilter)
        antCol.onFilter = col.filter.onFilter
      if (col.filter.filterDropdown)
        antCol.filterDropdown = col.filter.filterDropdown
      if (col.filter.filterIcon)
        antCol.filterIcon = col.filter.filterIcon
      if (col.filter.onFilterDropdownOpenChange)
        antCol.filterDropdownOpenChange = col.filter.onFilterDropdownOpenChange
      if (col.filter.filterMultiple !== undefined)
        antCol.filterMultiple = col.filter.filterMultiple
    }
    if (col.sorter)
      antCol.sorter = col.sorter
    return antCol
  })
}

export function useTanStackTable<T = any>(options: UseTanStackTableOptions<T>): {
  Table: () => VNode
  tableApi: TableApi
} {
  const { tableOptions, queryFn, slots } = options

  const antColumns = computed(() =>
    transformColumns(tableOptions.value.columns, tableOptions.value.onActionClick),
  )

  const dataSource = computed(() => tableOptions.value.data ?? [])

  const tableApi: TableApi = {
    refresh: async () => {
      try {
        await queryFn()
      }
      catch (e) {
        console.error('Table refresh error:', e)
      }
    },
  }
  tableApi.query = tableApi.refresh

  const Table = () => {
    const opts = tableOptions.value
    const scroll = opts.scrollY ? { y: opts.scrollY } : undefined
    return h('div', { class: 'tanstack-table-wrapper flex flex-1 flex-col overflow-hidden rounded-md border bg-card' }, [
      slots?.['toolbar-tools']?.() ? h('div', { class: 'border-b p-2' }, slots['toolbar-tools']()) : null,
      h(AntTable, {
        columns: antColumns.value,
        dataSource: dataSource.value,
        rowKey: opts.rowKey,
        scroll,
        pagination: false,
        size: 'small',
        class: 'flex-1',
      }),
    ])
  }

  return { Table, tableApi }
}
