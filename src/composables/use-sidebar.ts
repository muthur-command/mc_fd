import type { NavGroup } from '@/components/app-sidebar/types'

import { useAppsSidebar } from './use-apps-sidebar'

/** 侧栏分组顺序（与 use-apps-sidebar 中 SIDEBAR_GROUP_NAMES 一致） */
const SIDEBAR_GROUP_ORDER = ['Dashboards', 'Scene', 'Apps', 'Store', 'Settings'] as const

export function useSidebar() {
  const { itemsByGroup } = useAppsSidebar()

  const navData = computed<NavGroup[]>(() => {
    const byGroup = itemsByGroup.value
    return SIDEBAR_GROUP_ORDER.map(title => ({
      title,
      items: byGroup[title] ?? [],
    }))
  })

  return {
    navData,
  }
}
