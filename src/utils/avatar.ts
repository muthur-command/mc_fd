/**
 * 头像 URL 处理：后端返回 /static/upload/avatar/xxx 或 seed:xxx（仅存种子，前端按种子生成）
 */
import env from '@/utils/env'

/** 存在 avatar 字段中的种子值前缀，如 "seed:uuid" 表示用该 seed 生成头像 */
export const AVATAR_SEED_PREFIX = 'seed:'

export function isAvatarSeed(avatar: string | undefined | null): boolean {
  return !!avatar?.trim().startsWith(AVATAR_SEED_PREFIX)
}

/** 若 avatar 为 seed 则返回种子字符串，否则返回 undefined */
export function getAvatarSeed(avatar: string | undefined | null): string | undefined {
  if (!isAvatarSeed(avatar))
    return undefined
  return avatar!.trim().slice(AVATAR_SEED_PREFIX.length) || undefined
}

/**
 * 获取可访问的头像完整 URL（仅当 avatar 为图片路径时有效）
 * - seed:xxx 不当作 URL，返回 undefined，由前端用 AvatarGenerated 按 seed 生成
 * - 已是 http(s) 的 URL 原样返回
 * - 相对路径：若配置了 VITE_SERVER_API_URL 则拼接后端地址；否则拼接当前 origin，便于同源代理或后端直连
 */
export function getAvatarUrl(avatar: string | undefined | null): string | undefined {
  if (!avatar || !avatar.trim())
    return undefined
  const trimmed = avatar.trim()
  if (trimmed.startsWith(AVATAR_SEED_PREFIX))
    return undefined
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://'))
    return trimmed
  if (!trimmed.startsWith('/'))
    return trimmed
  if (env.VITE_SERVER_API_URL)
    return `${env.VITE_SERVER_API_URL.replace(/\/$/, '')}${trimmed}`
  if (typeof window !== 'undefined' && window.location?.origin)
    return `${window.location.origin}${trimmed}`
  return trimmed
}
