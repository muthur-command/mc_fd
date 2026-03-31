import { Circle, MoveHorizontal, UnfoldHorizontal, ZoomIn, ZoomOut } from 'lucide-vue-next'

/** 整站配色仅默认（index.css :root），无其他 theme-xxx 预设 */
export const THEME_PRESETS = [{ name: 'Default', value: 'default' }] as const

export type Theme = typeof THEME_PRESETS[number]['value']
export const THEMES = THEME_PRESETS.map(p => p.value)

/** 兼容旧代码：已无多主题主色列表 */
export const THEME_PRIMARY_COLORS = [] as const

export type Radius = typeof RADIUS_OPTIONS[number]['value']
export const RADIUS_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Small', value: 'sm' },
  { label: 'Medium', value: 'md' },
  { label: 'Large', value: 'lg' },
  { label: 'Extra Large', value: 'xl' },
] as const
export const RADIUS = RADIUS_OPTIONS.map(r => r.value)

export type Scale = typeof SCALE_OPTIONS[number]['value']
export const SCALE_OPTIONS = [
  { label: 'None', value: 'none', icon: Circle },
  { label: 'Small', value: 'sm', icon: ZoomOut },
  { label: 'Large', value: 'lg', icon: ZoomIn },
] as const

export type ContentLayout = 'full' | 'centered'
export const CONTENT_LAYOUTS = [
  { label: 'Full', value: 'full', icon: UnfoldHorizontal },
  { label: 'Centered', value: 'centered', icon: MoveHorizontal },
] as const

/** 字体选择（偏好存盘；当前样式固定为 Claude-MC + 离线 Inter） */
export type ThemeFont = typeof FONT_OPTIONS[number]['value']
export const FONT_OPTIONS = [
  { label: 'Default', value: 'default' },
  { label: 'Inter', value: 'inter' },
  { label: 'Roboto', value: 'roboto' },
  { label: 'Poppins', value: 'poppins' },
  { label: 'Montserrat', value: 'montserrat' },
  { label: 'PT Sans', value: 'pt-sans' },
  { label: 'Overpass Mono', value: 'overpass-mono' },
] as const

/** 图表配色预设（偏好存盘；当前未挂接至全局 CSS） */
export type ChartPreset = typeof CHART_PRESET_OPTIONS[number]['value']
export const CHART_PRESET_OPTIONS = [
  { label: 'Default', value: 'default' },
  { label: 'Cyan', value: 'cyan' },
  { label: 'Amber', value: 'amber' },
  { label: 'Green', value: 'green' },
  { label: 'Indigo', value: 'indigo' },
  { label: 'Fuchsia', value: 'fuchsia' },
] as const
