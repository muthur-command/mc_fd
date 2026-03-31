import type { LucideProps } from 'lucide-vue-next'

import * as lucideLab from '@lucide/lab'
import {
  Bell,
  Box,
  FileText,
  Gauge,
  Icon,
  LayoutGrid,
  icons as lucideIcons,
  MessageSquare,
  Palette,
  Puzzle,
  Server,
  Users,
} from 'lucide-vue-next'
/**
 * 侧栏分组数据：各分组静态项 + 插件动态项，统一由此 composable 产出（与 Apps 一致）
 */
import { h } from 'vue'

import type { NavItem } from '@/components/app-sidebar/types'
import type { PluginResult } from '@/services/api/plugin.api'

import { getPluginListApi } from '@/services/api/plugin.api'

/** 将 kebab-case / 小写 转为 Lucide 导出名 PascalCase（如 ship -> Ship, arrow-down -> ArrowDown） */
function toLucidePascal(name: string): string {
  return name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')
}

/** 转为 @lucide/lab 的 camelCase 导出名（如 whale -> whale, whale-narwhal -> whaleNarwhal） */
function toLabCamel(name: string): string {
  const pascal = toLucidePascal(name)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

/** 用 Lucide Icon + iconNode 包装 Lab 图标，得到可当侧栏 icon 组件用的函数组件（传 name 以满足类型，渲染以 iconNode 为准） */
function createLabIconComponent(iconNode: typeof lucideLab.whale) {
  return (props: LucideProps) =>
    h(Icon, {
      name: 'lab',
      iconNode,
      size: props.size ?? 24,
      strokeWidth: props.strokeWidth,
      color: props.color,
      class: props.class,
      style: props.style,
    })
}

/** 后端配置：目标分组名，如 'Apps'、'Settings'，与侧栏分组 title 一致 */
const INSTALL_SIDEBAR_GROUP_KEY = 'install_sidebar_group'
/** 兼容旧配置：为 true 时等价于 sidebar_group: 'Apps' */
const SHOW_IN_SIDEBAR__KEY = 'show_in_sidebar'

/** 插件侧栏菜单名称的 i18n key：与各插件 i18n 中 pluginManage.plugins.${name}.sidebarMenuName 对应 */
const SIDEBAR_MENU_NAME_KEY = (name: string) => `pluginManage.plugins.${name.toLowerCase()}.sidebarMenuName`

/** 后端配置：侧栏图标，值为 Lucide 图标名（如 Box、Server、whale、arrow-down） */
const SIDEBAR_ICON_KEY = 'sidebar_icon'

/** 插件名 -> 侧栏 url、icon（标题来自插件 i18n 的 sidebarMenuName） */
const APP_SIDEBAR_REGISTRY: Record<string, { url: string, icon: typeof Box }> = {
  docker: { url: '/plugins/docker', icon: Box },
  openclaw: { url: '/plugins/openclaw', icon: MessageSquare },
  card: { url: '/plugin/card', icon: Box },
  bento_layout: { url: '/plugin/bento-layout', icon: LayoutGrid },
  apprise_notify: { url: '/plugin/apprise-notify', icon: Bell },
  system_monitor: { url: '/plugin/system-monitor', icon: Server },
}

/** 侧栏分组名白名单（与 NavGroup.title 一致） */
const SIDEBAR_GROUP_NAMES = ['Dashboards', 'Scene', 'Apps', 'Store', 'Settings'] as const

/** 各分组静态项（与 Apps 一样，每个组都有默认项 + 后续会追加插件项） */
const STATIC_ITEMS_BY_GROUP: Record<string, NavItem[]> = {
  Dashboards: [
    { title: 'Default', url: '/dashboard', icon: Gauge },
  ],
  Scene: [
    // { title: 'Automation', url: '/scene/automation', icon: Workflow },
  ],
  Apps: [
    { title: 'sidebarApps.docker', url: '/plugins/docker', icon: Box },
  ],
  Store: [
    { title: 'Plugin', url: '/plugin', icon: Puzzle },
    { title: 'pluginTheme.menuTitle', url: '/plugin/theme', icon: Palette },
  ],
  Settings: [
    // { title: 'System', url: '/settings/system', icon: Settings },
    { title: 'user.menuTitle', url: '/users/', icon: Users },
    // { title: 'Notifications', url: '/settings/notifications', icon: Bell },
    {
      title: 'logs.menuTitle',
      icon: FileText,
      items: [
        { title: 'logs.loginLog', url: '/logs/login' },
        { title: 'logs.operaLog', url: '/logs/opera' },
      ],
    },
    // { title: 'Backup & Restore', url: '/settings/backup-restore', icon: ArchiveRestore },
    // { title: 'System Upgrade', url: '/settings/upgrade', icon: Download },
  ],
}

function isPluginEnabled(pluginResult: PluginResult): boolean {
  const enable = pluginResult.plugin?.enable as string | boolean | number | undefined
  return enable === '1' || enable === true || enable === 1
}

/**
 * 读取插件应注入的侧栏分组：优先 sidebar_group，兼容 show_in_sidebar_apps: true => 'Apps'
 * @returns 分组名（与 NavGroup.title 一致）或 null 表示不注入侧栏
 */
function getSidebarGroup(pluginResult: PluginResult): string | null {
  const plugin = pluginResult.plugin
  if (!plugin)
    return null
  const pluginAny = plugin as unknown as Record<string, unknown>
  const config = plugin.config

  const groupFromPlugin = pluginAny[INSTALL_SIDEBAR_GROUP_KEY]
  if (typeof groupFromPlugin === 'string' && groupFromPlugin.trim())
    return SIDEBAR_GROUP_NAMES.includes(groupFromPlugin as typeof SIDEBAR_GROUP_NAMES[number]) ? groupFromPlugin : null

  const groupFromConfig = config != null && typeof config === 'object' ? (config as Record<string, unknown>)[INSTALL_SIDEBAR_GROUP_KEY] : undefined
  if (typeof groupFromConfig === 'string' && groupFromConfig.trim())
    return SIDEBAR_GROUP_NAMES.includes(groupFromConfig as typeof SIDEBAR_GROUP_NAMES[number]) ? groupFromConfig : null

  if (pluginAny[SHOW_IN_SIDEBAR__KEY] === true)
    return 'Apps'
  if (config != null && typeof config === 'object' && (config as Record<string, unknown>)[SHOW_IN_SIDEBAR__KEY] === true)
    return 'Apps'

  return null
}

/**
 * 解析插件侧栏图标：支持 config.sidebar_icon、plugin.sidebar_icon 或 plugin.icon（Lucide 图标名）
 * 查找顺序：lucide-vue-next 全量图标（支持 PascalCase、小写、kebab-case）-> @lucide/lab -> APP_SIDEBAR_REGISTRY 或默认 Box
 */
function getPluginIcon(row: PluginResult, pluginKey: string): Pick<NavItem, 'icon'> {
  const plugin = row.plugin as unknown as Record<string, unknown> | undefined
  const config = plugin?.config as Record<string, unknown> | undefined
  const rawIcon = (
    (config && typeof config[SIDEBAR_ICON_KEY] === 'string'
      ? (config[SIDEBAR_ICON_KEY] as string).trim()
      : '')
    || (plugin && typeof plugin[SIDEBAR_ICON_KEY] === 'string' ? (plugin[SIDEBAR_ICON_KEY] as string).trim() : '')
    || (plugin?.icon != null ? String(plugin.icon).trim() : '')
  ) || ''
  const iconMap = lucideIcons as Record<string, typeof Box>
  const byExact = rawIcon && iconMap[rawIcon]
  if (byExact && typeof byExact === 'function')
    return { icon: byExact }
  const pascal = toLucidePascal(rawIcon)
  const byPascal = pascal && iconMap[pascal]
  if (byPascal && typeof byPascal === 'function')
    return { icon: byPascal }
  // 回退到 lucide-lab（Lab 图标为 iconNode，需用 Icon + iconNode 包装）
  const labCamel = rawIcon && toLabCamel(rawIcon)
  const labNode = labCamel && (lucideLab as Record<string, unknown>)[labCamel]
  if (labNode && Array.isArray(labNode))
    return { icon: createLabIconComponent(labNode as typeof lucideLab.whale) }
  const registryIcon = APP_SIDEBAR_REGISTRY[pluginKey]?.icon ?? Box
  return { icon: registryIcon }
}

/** 收集静态项中已有链接，避免与插件注入重复（如同为 /plugins/docker） */
function collectStaticUrls(items: NavItem[]): Set<string> {
  const urls = new Set<string>()
  for (const item of items) {
    if (item.url)
      urls.add(item.url)
    if (item.items) {
      for (const sub of item.items) {
        if (sub.url)
          urls.add(sub.url)
      }
    }
  }
  return urls
}

/** 构建各分组完整列表：静态项 + 该分组下的插件项（与 Apps 一致，每组都支持动态追加） */
function buildItemsByGroup(list: PluginResult[]): Record<string, NavItem[]> {
  const byGroup: Record<string, NavItem[]> = {}
  const seenByGroup = new Map<string, Set<string>>()

  for (const g of SIDEBAR_GROUP_NAMES) {
    const staticItems = STATIC_ITEMS_BY_GROUP[g] ?? []
    byGroup[g] = [...staticItems]
    seenByGroup.set(g, collectStaticUrls(staticItems))
  }

  if (!list?.length)
    return byGroup

  for (const row of list) {
    const name = row.plugin?.name
    if (!name || !isPluginEnabled(row))
      continue
    const group = getSidebarGroup(row)
    if (!group)
      continue
    const key = name.toLowerCase()
    const url = APP_SIDEBAR_REGISTRY[key]?.url ?? `/plugin/${name}`
    if (seenByGroup.get(group)!.has(url)) {
      // 静态菜单已占用同一 URL（如 Apps 里的 Docker）时不再追加条目，但应用 plugin.toml 的 sidebar_icon
      const items = byGroup[group]!
      const existing = items.find(it => it.url === url)
      if (existing)
        existing.icon = getPluginIcon(row, key).icon
      continue
    }
    seenByGroup.get(group)!.add(url)
    const title = SIDEBAR_MENU_NAME_KEY(name)
    const item: NavItem = { title, url, ...getPluginIcon(row, key) }
    if (!byGroup[group])
      byGroup[group] = []
    byGroup[group].push(item)
  }
  return byGroup
}

let loadPromise: Promise<void> | null = null

/** 单例：所有调用 useAppsSidebar 的组件共享同一份侧栏数据，避免导航后重新执行 composable 导致插件项消失 */
const itemsByGroup = ref<Record<string, NavItem[]>>(buildItemsByGroup([]))

function loadSidebarFromPlugins() {
  if (loadPromise)
    return loadPromise
  loadPromise = (async () => {
    try {
      const list = await getPluginListApi()
      itemsByGroup.value = buildItemsByGroup(list ?? [])
    }
    catch {
      // 请求失败时保留当前已加载的数据，不重置为仅静态项
    }
  })()
  return loadPromise
}

/** 强制重新拉取插件列表并刷新侧栏（用于插件管理页启用/禁用后同步侧栏显示） */
function refreshSidebarFromPlugins() {
  loadPromise = null
  return loadSidebarFromPlugins()
}

export function useAppsSidebar() {
  const appsItems = computed(() => itemsByGroup.value.Apps ?? STATIC_ITEMS_BY_GROUP.Apps)

  loadSidebarFromPlugins()

  return {
    /** 各分组完整项（静态 + 插件，key 与 NavGroup.title 一致） */
    itemsByGroup,
    /** Apps 分组下的项（兼容原有用法） */
    appsItems,
    loadAppsFromPlugins: loadSidebarFromPlugins,
    /** 强制刷新侧栏插件项（仅在插件被启用时显示、禁用时隐藏） */
    refreshAppsFromPlugins: refreshSidebarFromPlugins,
  }
}
