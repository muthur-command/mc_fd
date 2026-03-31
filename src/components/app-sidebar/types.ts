import type { LucideProps } from 'lucide-vue-next'
import type { FunctionalComponent } from 'vue'

type NavIcon = FunctionalComponent<LucideProps, Record<any, any>, any, Record<any, any>>

interface BaseNavItem {
  title: string
  icon?: NavIcon
  /** 外部链接时为新标签打开 */
  newTab?: boolean
  /** 显示 "Coming" 角标 */
  isComing?: boolean
  /** 显示 "New" 角标 */
  isNew?: boolean
  /** 显示数字/文本角标 */
  isDataBadge?: string
}

export type NavItem
  = | BaseNavItem & {
    items: (BaseNavItem & { url?: string, newTab?: boolean })[]
    url?: string
    isActive?: boolean
  } | BaseNavItem & {
    url: string
    items?: never
  }

export interface NavGroup {
  title: string
  items: NavItem[]
}

export interface User {
  name: string
  avatar: string
  email: string
}

export interface Team {
  name: string
  logo: NavIcon
  /** 可选：logo 图片地址（优先于 logo / logoEmoji） */
  logoUrl?: string
  /** 可选：logo 为 emoji 时使用（无 logoUrl 时优先于 logo 组件） */
  logoEmoji?: string
  plan: string
}

export interface SidebarData {
  user: User
  teams: Team[]
  navMain: NavGroup[]
}
