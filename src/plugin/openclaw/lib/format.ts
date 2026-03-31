/**
 * 与 openclaw-cn Control UI format/presenter 一致的展示格式化
 */

export function formatMs(ms?: number | null): string {
  if (ms == null && ms !== 0)
    return 'n/a'
  return new Date(ms).toLocaleString()
}

export function formatAgo(ms?: number | null): string {
  if (ms == null && ms !== 0)
    return 'n/a'
  const diff = Date.now() - ms
  if (diff < 0)
    return 'just now'
  const sec = Math.round(diff / 1000)
  if (sec <= 5)
    return 'just now'
  if (sec < 60)
    return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60)
    return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 48)
    return `${hr}h ago`
  const day = Math.round(hr / 24)
  return `${day}d ago`
}

export function formatDurationMs(ms?: number | null): string {
  if (ms == null && ms !== 0)
    return 'n/a'
  if (ms < 1000)
    return `${ms}ms`
  const sec = Math.round(ms / 1000)
  if (sec < 60)
    return `${sec}s`
  const min = Math.round(sec / 60)
  if (min < 60)
    return `${min}m`
  const hr = Math.round(min / 60)
  if (hr < 48)
    return `${hr}h`
  const day = Math.round(hr / 24)
  return `${day}d`
}

export function formatNextRun(ms?: number | null): string {
  if (ms == null)
    return 'n/a'
  return `${formatMs(ms)} (${formatAgo(ms)})`
}

/** Format token count for display (Control UI usage style). */
export function formatTokens(n?: number | null): string {
  if (n == null && n !== 0)
    return '0'
  const v = Number(n)
  if (v >= 1_000_000)
    return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)
    return `${(v / 1_000).toFixed(1)}K`
  return String(Math.round(v))
}

/** Format cost for display (Control UI usage style). */
/** 与 openclaw agents-utils formatBytes 一致 */
export function formatBytes(bytes?: number | null): string {
  if (bytes == null || !Number.isFinite(bytes))
    return '-'
  if (bytes < 1024)
    return `${Math.round(bytes)} B`
  const units = ['KB', 'MB', 'GB', 'TB'] as const
  let size = bytes / 1024
  let i = 0
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i += 1
  }
  return `${size.toFixed(size < 10 && i > 0 ? 1 : 0)} ${units[i]}`
}

export function formatCost(n?: number | null, decimals = 2): string {
  if (n == null && n !== 0)
    return '0'
  const v = Number(n)
  if (v === 0)
    return '0'
  if (v < 0.01 && v > 0)
    return v.toFixed(4)
  return v.toFixed(decimals)
}

export interface PresenceEntry {
  host?: string | null
  ip?: string | null
  mode?: string | null
  version?: string | null
  ts?: number | null
  lastInputSeconds?: number | null
  reason?: string | null
  roles?: string[]
  scopes?: string[]
  platform?: string | null
  deviceFamily?: string | null
  modelIdentifier?: string | null
}

export function formatPresenceSummary(entry: PresenceEntry): string {
  const host = entry.host ?? 'unknown'
  const ip = entry.ip ? `(${entry.ip})` : ''
  const mode = entry.mode ?? ''
  const version = entry.version ?? ''
  return `${host} ${ip} ${mode} ${version}`.trim()
}

export function formatPresenceAge(entry: PresenceEntry): string {
  return entry.ts != null ? formatAgo(entry.ts) : 'n/a'
}

/** Clamp text for display (e.g. skill description). */
export function clampText(value: string, max = 140): string {
  if (value.length <= max)
    return value
  return `${value.slice(0, Math.max(0, max - 1))}…`
}
