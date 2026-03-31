/**
 * 主题包管理器（移植自 web-antd theme/manager，适配 shadcn-vue-admin）
 * 使用 localStorage 持久化，通过 document 根样式与 data-theme-* 应用主题
 */

import type {
  InstalledThemePackage,
  ThemePackageColors,
  ThemePackageConfig,
  ThemePackageFiles,
  ThemePackageLoadOptions,
  ThemePackageMetadata,
} from './types'

const THEME_PACKAGE_STORAGE_KEY = 'theme-packages'
const CURRENT_THEME_PACKAGE_KEY = 'current-theme-package'
const STORAGE_PREFIX = 'theme-'

function getStorage(): Storage {
  return typeof window !== 'undefined' ? window.localStorage : ({} as Storage)
}

function getItem<T>(key: string): T | null {
  try {
    const raw = getStorage().getItem(`${STORAGE_PREFIX}${key}`)
    if (!raw)
      return null
    return JSON.parse(raw) as T
  }
  catch {
    return null
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    getStorage().setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value))
  }
  catch {}
}

function removeItem(key: string): void {
  getStorage().removeItem(`${STORAGE_PREFIX}${key}`)
}

function applyColorsToRoot(colors: ThemePackageColors): void {
  const root = document.documentElement
  root.style.setProperty('--primary', colors.primary)
  if (colors.success)
    root.style.setProperty('--success', colors.success)
  if (colors.warning)
    root.style.setProperty('--warning', colors.warning)
  if (colors.destructive)
    root.style.setProperty('--destructive', colors.destructive)
  if (colors.info)
    root.style.setProperty('--info', colors.info)
}

function clearAppliedThemeFromRoot(): void {
  const root = document.documentElement
  const keys = ['--primary', '--success', '--warning', '--destructive', '--info']
  keys.forEach(k => root.style.removeProperty(k))
  const customStyle = document.getElementById('theme-custom-css')
  if (customStyle)
    customStyle.remove()
}

function applyCustomCSS(css: string): void {
  const old = document.getElementById('theme-custom-css')
  if (old)
    old.remove()
  const style = document.createElement('style')
  style.id = 'theme-custom-css'
  style.textContent = css
  document.head.appendChild(style)
}

class ThemePackageManager {
  private installedPackages = new Map<string, InstalledThemePackage>()
  private currentThemeId: string | null = null

  constructor() {
    this.loadInstalledPackages()
  }

  getInstalledPackages(): InstalledThemePackage[] {
    return [...this.installedPackages.values()].map(pkg => ({
      ...pkg,
      isActive: pkg.id === this.currentThemeId,
      isCurrent: pkg.id === this.currentThemeId,
    }))
  }

  getCurrentThemePackage(): InstalledThemePackage | null {
    if (!this.currentThemeId)
      return null
    return this.installedPackages.get(this.currentThemeId) ?? null
  }

  async applyTheme(packageId: string): Promise<void> {
    const themePackage = this.installedPackages.get(packageId)
    if (!themePackage)
      throw new Error(`主题包 ${packageId} 不存在`)

    const { colors, darkColors, customCSS } = themePackage.config
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    const currentColors = (isDark && darkColors) ? darkColors : colors

    applyColorsToRoot(currentColors)
    if (customCSS)
      applyCustomCSS(customCSS)

    this.currentThemeId = packageId
    setItem(CURRENT_THEME_PACKAGE_KEY, packageId)
    this.updatePackageStatus(packageId)
  }

  resetToDefault(): void {
    clearAppliedThemeFromRoot()
    this.currentThemeId = null
    removeItem(CURRENT_THEME_PACKAGE_KEY)
    this.updatePackageStatus(null)
  }

  removeTheme(packageId: string): void {
    if (!this.installedPackages.get(packageId))
      throw new Error(`主题包 ${packageId} 不存在`)
    if (this.currentThemeId === packageId)
      this.resetToDefault()
    this.installedPackages.delete(packageId)
    this.saveInstalledPackages()
  }

  async loadFromFile(file: File, options: ThemePackageLoadOptions = {}): Promise<InstalledThemePackage> {
    const { autoApply = false, saveToStorage = true, overwrite = false } = options
    let themePackage: ThemePackageFiles

    if (file.name.endsWith('.json')) {
      themePackage = await this.loadFromJson(file)
    }
    else if (file.name.endsWith('.zip')) {
      themePackage = await this.loadFromZip(file)
    }
    else {
      throw new Error('仅支持 .json 或 .zip 文件')
    }

    this.validateThemePackage(themePackage.config)
    const existing = this.installedPackages.get(themePackage.config.metadata.id)
    if (existing && !overwrite)
      throw new Error(`主题包 ${themePackage.config.metadata.id} 已存在`)

    if (themePackage.css)
      themePackage.config.customCSS = themePackage.css

    const installed: InstalledThemePackage = {
      ...themePackage.config.metadata,
      config: themePackage.config,
      type: 'custom',
    }
    this.installedPackages.set(installed.id, installed)
    if (saveToStorage)
      this.saveInstalledPackages()
    if (autoApply)
      await this.applyTheme(installed.id)
    return installed
  }

  async exportTheme(packageId: string, _options: { includePreview?: boolean } = {}): Promise<Blob> {
    const themePackage = this.installedPackages.get(packageId)
    if (!themePackage)
      throw new Error(`主题包 ${packageId} 不存在`)
    const str = JSON.stringify(themePackage.config, null, 2)
    return new Blob([str], { type: 'application/json' })
  }

  private loadInstalledPackages(): void {
    const stored = getItem<InstalledThemePackage[]>(THEME_PACKAGE_STORAGE_KEY)
    if (stored?.length) {
      stored.forEach(pkg => this.installedPackages.set(pkg.id, pkg))
    }
    const currentId = getItem<string>(CURRENT_THEME_PACKAGE_KEY)
    if (currentId && this.installedPackages.has(currentId)) {
      this.currentThemeId = currentId
      this.applyTheme(currentId).catch(() => {})
    }
  }

  private saveInstalledPackages(): void {
    setItem(THEME_PACKAGE_STORAGE_KEY, [...this.installedPackages.values()])
  }

  private updatePackageStatus(currentId: string | null): void {
    this.installedPackages.forEach((pkg, id) => {
      pkg.isActive = id === currentId
      pkg.isCurrent = id === currentId
    })
  }

  private async loadFromJson(file: File): Promise<ThemePackageFiles> {
    const content = await file.text()
    const config = JSON.parse(content) as ThemePackageConfig
    return { config }
  }

  private async loadFromZip(file: File): Promise<ThemePackageFiles> {
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(file)
    const configStr = await zip.file('theme.json')?.async('string')
    if (!configStr)
      throw new Error('主题包中缺少 theme.json')
    const config = JSON.parse(configStr) as ThemePackageConfig
    const files: ThemePackageFiles = { config }
    if (config.customCSSFile) {
      const css = await zip.file(config.customCSSFile)?.async('string')
      if (css)
        files.css = css
    }
    return files
  }

  private validateThemePackage(config: ThemePackageConfig): void {
    const { metadata, colors } = config
    if (!metadata?.id)
      throw new Error('主题包缺少 metadata.id')
    if (!metadata?.name)
      throw new Error('主题包缺少 metadata.name')
    if (!metadata?.version)
      throw new Error('主题包缺少 metadata.version')
    if (!colors?.primary)
      throw new Error('主题包缺少 colors.primary')
  }
}

export const themePackageManager = new ThemePackageManager()

export const themePackageUtils = {
  createThemePackage(
    metadata: Partial<ThemePackageMetadata>,
    colors: Partial<ThemePackageColors>,
  ): ThemePackageConfig {
    return {
      metadata: {
        id: `custom-${Date.now()}`,
        version: '1.0.0',
        type: 'custom',
        ...metadata,
      } as ThemePackageMetadata,
      colors: { primary: '#0d9488', ...colors } as ThemePackageColors,
    }
  },

  generatePreview(colors: ThemePackageColors): string {
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 120
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = colors.primary
      ctx.fillRect(0, 0, 200, 120)
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.beginPath()
      ctx.arc(100, 60, 40, 0, Math.PI * 2)
      ctx.fill()
    }
    return canvas.toDataURL('image/png')
  },
}
