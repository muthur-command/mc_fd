/**
 * 与 openclaw Control UI agents-panels-tools-skills + tool-policy 行为对齐（profile / alsoAllow / deny）
 */
import { ensureAgentConfigEntryMut, findAgentConfigEntryIndex } from '@/plugin/openclaw/lib/agents-overview-config'

export interface ToolCatalogProfile { id: string, label: string }

export interface ToolCatalogTool {
  id: string
  label: string
  description?: string
  source?: string
  pluginId?: string
  optional?: boolean
  defaultProfiles?: string[]
}

export interface ToolCatalogSection {
  id: string
  label: string
  source?: string
  pluginId?: string
  tools: ToolCatalogTool[]
}

export type ToolsCatalogInput = {
  groups?: ToolCatalogSection[]
  profiles?: ToolCatalogProfile[]
} | null

interface ToolsBlock {
  profile?: string
  allow?: string[]
  alsoAllow?: string[]
  deny?: string[]
}

const TOOL_NAME_ALIASES: Record<string, string> = {
  'bash': 'exec',
  'apply-patch': 'apply_patch',
}

/** 与 openclaw CORE_TOOL_GROUPS 一致（tsx 导出） */
const TOOL_GROUPS: Record<string, string[]> = {
  'group:openclaw': [
    'web_search',
    'web_fetch',
    'memory_search',
    'memory_get',
    'sessions_list',
    'sessions_history',
    'sessions_send',
    'sessions_spawn',
    'sessions_yield',
    'subagents',
    'session_status',
    'browser',
    'canvas',
    'message',
    'cron',
    'gateway',
    'nodes',
    'agents_list',
    'image',
    'tts',
  ],
  'group:fs': ['read', 'write', 'edit', 'apply_patch'],
  'group:runtime': ['exec', 'process'],
  'group:web': ['web_search', 'web_fetch'],
  'group:memory': ['memory_search', 'memory_get'],
  'group:sessions': [
    'sessions_list',
    'sessions_history',
    'sessions_send',
    'sessions_spawn',
    'sessions_yield',
    'subagents',
    'session_status',
  ],
  'group:ui': ['browser', 'canvas'],
  'group:messaging': ['message'],
  'group:automation': ['cron', 'gateway'],
  'group:nodes': ['nodes'],
  'group:agents': ['agents_list'],
  'group:media': ['image', 'tts'],
}

const PROFILE_POLICIES: Record<string, { allow?: string[], deny?: string[] }> = {
  minimal: { allow: ['session_status'] },
  coding: {
    allow: [
      'read',
      'write',
      'edit',
      'apply_patch',
      'exec',
      'process',
      'web_search',
      'web_fetch',
      'memory_search',
      'memory_get',
      'sessions_list',
      'sessions_history',
      'sessions_send',
      'sessions_spawn',
      'sessions_yield',
      'subagents',
      'session_status',
      'cron',
      'image',
    ],
  },
  messaging: {
    allow: ['sessions_list', 'sessions_history', 'sessions_send', 'session_status', 'message'],
  },
}

export const DEFAULT_PROFILE_OPTIONS: ToolCatalogProfile[] = [
  { id: 'minimal', label: 'Minimal' },
  { id: 'coding', label: 'Coding' },
  { id: 'messaging', label: 'Messaging' },
  { id: 'full', label: 'Full' },
]

const FALLBACK_SECTIONS: ToolCatalogSection[] = [
  {
    id: 'fs',
    label: 'Files',
    tools: [
      { id: 'read', label: 'read', description: 'Read file contents' },
      { id: 'write', label: 'write', description: 'Create or overwrite files' },
      { id: 'edit', label: 'edit', description: 'Make precise edits' },
      { id: 'apply_patch', label: 'apply_patch', description: 'Patch files (OpenAI)' },
    ],
  },
  {
    id: 'runtime',
    label: 'Runtime',
    tools: [
      { id: 'exec', label: 'exec', description: 'Run shell commands' },
      { id: 'process', label: 'process', description: 'Manage background processes' },
    ],
  },
]

export function normalizeToolName(name: string): string {
  const normalized = name.trim().toLowerCase()
  return TOOL_NAME_ALIASES[normalized] ?? normalized
}

function normalizeToolList(list?: string[]): string[] {
  if (!list)
    return []
  return list.map(normalizeToolName).filter(Boolean)
}

function expandToolGroups(list?: string[]): string[] {
  const normalized = normalizeToolList(list)
  const expanded: string[] = []
  for (const value of normalized) {
    const group = TOOL_GROUPS[value]
    if (group) {
      expanded.push(...group)
      continue
    }
    expanded.push(value)
  }
  return Array.from(new Set(expanded))
}

interface ToolPolicy { allow?: string[], deny?: string[] }

type CompiledPattern
  = | { kind: 'all' }
    | { kind: 'exact', value: string }
    | { kind: 'regex', value: RegExp }

function compilePattern(pattern: string): CompiledPattern {
  const normalized = normalizeToolName(pattern)
  if (!normalized)
    return { kind: 'exact', value: '' }
  if (normalized === '*')
    return { kind: 'all' }
  if (!normalized.includes('*'))
    return { kind: 'exact', value: normalized }
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return { kind: 'regex', value: new RegExp(`^${escaped.replaceAll('\\*', '.*')}$`) }
}

function compilePatterns(patterns?: string[]): CompiledPattern[] {
  if (!Array.isArray(patterns))
    return []
  return expandToolGroups(patterns)
    .map(compilePattern)
    .filter(p => p.kind !== 'exact' || p.value.length > 0)
}

function matchesAny(name: string, patterns: CompiledPattern[]): boolean {
  for (const pattern of patterns) {
    if (pattern.kind === 'all')
      return true
    if (pattern.kind === 'exact' && name === pattern.value)
      return true
    if (pattern.kind === 'regex' && pattern.value.test(name))
      return true
  }
  return false
}

export function isAllowedByPolicy(name: string, policy?: ToolPolicy): boolean {
  if (!policy)
    return true
  const normalized = normalizeToolName(name)
  const deny = compilePatterns(policy.deny)
  if (matchesAny(normalized, deny))
    return false
  const allow = compilePatterns(policy.allow)
  if (allow.length === 0)
    return true
  if (matchesAny(normalized, allow))
    return true
  if (normalized === 'apply_patch' && matchesAny('exec', allow))
    return true
  return false
}

export function matchesList(name: string, list?: string[]): boolean {
  if (!Array.isArray(list) || list.length === 0)
    return false
  const normalized = normalizeToolName(name)
  const patterns = compilePatterns(list)
  if (matchesAny(normalized, patterns))
    return true
  if (normalized === 'apply_patch' && matchesAny('exec', patterns))
    return true
  return false
}

export function resolveToolProfilePolicy(profile?: string): ToolPolicy | undefined {
  if (!profile || profile === 'full')
    return undefined
  const p = PROFILE_POLICIES[profile]
  if (!p?.allow?.length && !p?.deny?.length)
    return undefined
  return {
    allow: p.allow ? [...p.allow] : undefined,
    deny: p.deny ? [...p.deny] : undefined,
  }
}

export function resolveToolSections(catalog: ToolsCatalogInput): ToolCatalogSection[] {
  const g = catalog?.groups
  if (g?.length) {
    return g.map(group => ({
      id: group.id,
      label: group.label,
      source: group.source,
      pluginId: group.pluginId,
      tools: (group.tools ?? []).map(tool => ({
        id: tool.id,
        label: tool.label,
        description: tool.description,
        source: tool.source,
        pluginId: tool.pluginId,
        optional: tool.optional,
        defaultProfiles: tool.defaultProfiles ? [...tool.defaultProfiles] : undefined,
      })),
    }))
  }
  return FALLBACK_SECTIONS
}

export function resolveToolProfileOptions(catalog: ToolsCatalogInput): ToolCatalogProfile[] {
  const p = catalog?.profiles
  if (p?.length)
    return p.map(x => ({ id: x.id, label: x.label }))
  return [...DEFAULT_PROFILE_OPTIONS]
}

function readGlobalTools(cfg: Record<string, unknown>): ToolsBlock {
  const t = cfg.tools
  return t && typeof t === 'object' ? (t as ToolsBlock) : {}
}

function readAgentTools(cfg: Record<string, unknown>, agentId: string): ToolsBlock {
  const list = (cfg.agents as { list?: { id?: string, tools?: ToolsBlock }[] })?.list ?? []
  const entry = list.find(a => a?.id === agentId)
  return entry?.tools ?? {}
}

function getListEntry(cfg: Record<string, unknown>, index: number): { id?: string, tools?: ToolsBlock } {
  const list = (cfg.agents as { list: { id?: string, tools?: ToolsBlock }[] }).list
  return list[index]
}

function pruneAgentTools(entry: { tools?: ToolsBlock }): void {
  const t = entry.tools
  if (!t || typeof t !== 'object')
    return
  const hasProfile = typeof t.profile === 'string' && t.profile.trim().length > 0
  const hasAllow = Array.isArray(t.allow) && t.allow.length > 0
  const hasAlso = Array.isArray(t.alsoAllow) && t.alsoAllow.length > 0
  const hasDeny = Array.isArray(t.deny) && t.deny.length > 0
  if (!hasProfile && !hasAllow && !hasAlso && !hasDeny)
    delete entry.tools
}

export function applyToolProfileChange(
  cfg: Record<string, unknown>,
  agentId: string,
  profile: string | null,
  clearAllow: boolean,
): void {
  const idx
    = profile || clearAllow ? ensureAgentConfigEntryMut(cfg, agentId) : findAgentConfigEntryIndex(cfg, agentId)
  if (idx < 0)
    return
  const entry = getListEntry(cfg, idx)
  if (!entry.tools)
    entry.tools = {}
  if (profile)
    entry.tools.profile = profile
  else delete entry.tools.profile
  if (clearAllow)
    delete entry.tools.allow
  pruneAgentTools(entry)
}

export function applyToolOverrides(
  cfg: Record<string, unknown>,
  agentId: string,
  alsoAllow: string[],
  deny: string[],
): void {
  const need = alsoAllow.length > 0 || deny.length > 0
  const idx = need ? ensureAgentConfigEntryMut(cfg, agentId) : findAgentConfigEntryIndex(cfg, agentId)
  if (idx < 0)
    return
  const entry = getListEntry(cfg, idx)
  if (!entry.tools)
    entry.tools = {}
  if (alsoAllow.length > 0)
    entry.tools.alsoAllow = alsoAllow
  else delete entry.tools.alsoAllow
  if (deny.length > 0)
    entry.tools.deny = deny
  else delete entry.tools.deny
  pruneAgentTools(entry)
}

export interface ToolAccessContext {
  profile: string
  profileSource: string
  hasAgentAllow: boolean
  hasGlobalAllow: boolean
  editable: boolean
  alsoAllow: string[]
  deny: string[]
  basePolicy: ToolPolicy | undefined
  toolIds: string[]
  sections: ToolCatalogSection[]
  profileOptions: ToolCatalogProfile[]
  enabledCount: number
  resolveAllowed: (toolId: string) => { allowed: boolean, baseAllowed: boolean }
}

export function buildToolAccessContext(
  cfg: Record<string, unknown> | null,
  agentId: string,
  catalog: ToolsCatalogInput,
  opts: { configLoading: boolean, configSaving: boolean, catalogLoading: boolean, catalogError: string | null },
): ToolAccessContext | null {
  if (!cfg || !agentId.trim())
    return null
  const agentTools = readAgentTools(cfg, agentId)
  const globalTools = readGlobalTools(cfg)
  const profile = agentTools.profile ?? globalTools.profile ?? 'full'
  const profileSource = agentTools.profile
    ? 'agent'
    : globalTools.profile
      ? 'global'
      : 'default'
  const hasAgentAllow = Array.isArray(agentTools.allow) && agentTools.allow.length > 0
  const hasGlobalAllow = Array.isArray(globalTools.allow) && globalTools.allow.length > 0
  const sections = resolveToolSections(catalog)
  const toolIds = sections.flatMap(s => s.tools.map(t => t.id))
  const alsoAllow = hasAgentAllow
    ? []
    : Array.isArray(agentTools.alsoAllow)
      ? agentTools.alsoAllow
      : []
  const deny = hasAgentAllow ? [] : Array.isArray(agentTools.deny) ? agentTools.deny : []
  const basePolicy = hasAgentAllow
    ? { allow: agentTools.allow ?? [], deny: agentTools.deny ?? [] }
    : resolveToolProfilePolicy(profile)

  const editable
    = !opts.configLoading
      && !opts.configSaving
      && !hasAgentAllow
      && !(opts.catalogLoading && !catalog?.groups?.length && !opts.catalogError)

  const resolveAllowed = (toolId: string) => {
    const baseAllowed = isAllowedByPolicy(toolId, basePolicy)
    const extraAllowed = matchesList(toolId, alsoAllow)
    const denied = matchesList(toolId, deny)
    const allowed = (baseAllowed || extraAllowed) && !denied
    return { allowed, baseAllowed }
  }
  const enabledCount = toolIds.filter(id => resolveAllowed(id).allowed).length

  return {
    profile,
    profileSource,
    hasAgentAllow,
    hasGlobalAllow,
    editable,
    alsoAllow,
    deny,
    basePolicy,
    toolIds,
    sections,
    profileOptions: resolveToolProfileOptions(catalog),
    enabledCount,
    resolveAllowed,
  }
}

export function toggleToolAccess(
  cfg: Record<string, unknown>,
  agentId: string,
  toolId: string,
  nextEnabled: boolean,
  catalog: ToolsCatalogInput,
): void {
  const ctx = buildToolAccessContext(cfg, agentId, catalog, {
    configLoading: false,
    configSaving: false,
    catalogLoading: false,
    catalogError: null,
  })
  if (!ctx || ctx.hasAgentAllow)
    return
  const nextAllow = new Set(ctx.alsoAllow.map(normalizeToolName).filter(Boolean))
  const nextDeny = new Set(ctx.deny.map(normalizeToolName).filter(Boolean))
  const { baseAllowed } = ctx.resolveAllowed(toolId)
  const normalized = normalizeToolName(toolId)
  if (nextEnabled) {
    nextDeny.delete(normalized)
    if (!baseAllowed)
      nextAllow.add(normalized)
  }
  else {
    nextAllow.delete(normalized)
    nextDeny.add(normalized)
  }
  applyToolOverrides(cfg, agentId, [...nextAllow], [...nextDeny])
}

export function setAllToolAccess(
  cfg: Record<string, unknown>,
  agentId: string,
  nextEnabled: boolean,
  catalog: ToolsCatalogInput,
): void {
  const ctx = buildToolAccessContext(cfg, agentId, catalog, {
    configLoading: false,
    configSaving: false,
    catalogLoading: false,
    catalogError: null,
  })
  if (!ctx || ctx.hasAgentAllow)
    return
  const nextAllow = new Set(ctx.alsoAllow.map(normalizeToolName).filter(Boolean))
  const nextDeny = new Set(ctx.deny.map(normalizeToolName).filter(Boolean))
  for (const id of ctx.toolIds) {
    const { baseAllowed } = ctx.resolveAllowed(id)
    const normalized = normalizeToolName(id)
    if (nextEnabled) {
      nextDeny.delete(normalized)
      if (!baseAllowed)
        nextAllow.add(normalized)
    }
    else {
      nextAllow.delete(normalized)
      nextDeny.add(normalized)
    }
  }
  applyToolOverrides(cfg, agentId, [...nextAllow], [...nextDeny])
}

export function profileSourceLabel(source: string, t: (k: string) => string): string {
  if (source === 'agent')
    return t('openclaw.agentsToolProfileSourceAgent')
  if (source === 'global')
    return t('openclaw.agentsToolProfileSourceGlobal')
  return t('openclaw.agentsToolProfileSourceDefault')
}
