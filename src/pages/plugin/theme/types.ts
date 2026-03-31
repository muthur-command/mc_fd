/**
 * 主题包类型定义（移植自 web-antd theme，适配 shadcn-vue-admin）
 */

export interface ThemePackageMetadata {
  id: string
  name: string
  description?: string
  version: string
  author?: string
  preview?: string
  icon?: string
  createdAt?: string
  updatedAt?: string
  tags?: string[]
  type: 'builtin' | 'custom'
}

export interface ThemePackageColors {
  primary: string
  success?: string
  warning?: string
  destructive?: string
  info?: string
}

export interface ThemePackageFont {
  family: string
  source: 'system' | 'web'
  url?: string
  format?: 'otf' | 'ttf' | 'woff2' | 'woff'
  fontFile?: string
  weight?: number | string
  style?: 'italic' | 'normal'
}

export interface ThemePackageConfig {
  metadata: ThemePackageMetadata
  colors: ThemePackageColors
  radius?: string
  supportDarkMode?: boolean
  darkColors?: ThemePackageColors
  customCSS?: string
  customCSSFile?: string
  customIcons?: Record<string, string>
  font?: ThemePackageFont
  fontFile?: string
}

export interface ThemePackageFiles {
  config: ThemePackageConfig
  css?: string
  icons?: Record<string, string>
  font?: string
}

export interface InstalledThemePackage extends ThemePackageMetadata {
  config: ThemePackageConfig
  path?: string
  isActive?: boolean
  isCurrent?: boolean
}

export interface ThemePackageLoadOptions {
  autoApply?: boolean
  saveToStorage?: boolean
  overwrite?: boolean
}

export interface ThemePackageExportOptions {
  includePreview?: boolean
  includeIcons?: boolean
  format?: 'json' | 'zip'
}
