/**
 * 与 openclaw Control UI agents-utils + app-render onModelChange / onModelFallbacks 一致
 */

export interface AgentConfigEntry {
  id: string
  name?: string
  workspace?: string
  model?: unknown
  skills?: string[]
}

export function resolveAgentConfig(config: Record<string, unknown> | null, agentId: string) {
  const list = (config?.agents as { list?: AgentConfigEntry[] } | undefined)?.list ?? []
  const entry = list.find(a => a?.id === agentId)
  return {
    entry,
    defaults: (config?.agents as { defaults?: { workspace?: string, model?: unknown, models?: Record<string, { alias?: string }> } })
      ?.defaults,
  }
}

export function resolveModelLabel(model?: unknown): string {
  if (!model)
    return '-'
  if (typeof model === 'string')
    return model.trim() || '-'
  if (typeof model === 'object' && model) {
    const r = model as { primary?: string, fallbacks?: string[] }
    const p = r.primary?.trim()
    if (p) {
      const n = Array.isArray(r.fallbacks) ? r.fallbacks.length : 0
      return n > 0 ? `${p} (+${n} fallback)` : p
    }
  }
  return '-'
}

export function resolveModelPrimary(model?: unknown): string | null {
  if (!model)
    return null
  if (typeof model === 'string') {
    const t = model.trim()
    return t || null
  }
  if (typeof model === 'object' && model) {
    const r = model as Record<string, unknown>
    for (const k of ['primary', 'model', 'id', 'value'] as const) {
      const v = r[k]
      if (typeof v === 'string' && v.trim())
        return v.trim()
    }
  }
  return null
}

export function resolveModelFallbacks(model?: unknown): string[] | null {
  if (!model || typeof model === 'string')
    return null
  if (typeof model === 'object' && model) {
    const r = model as Record<string, unknown>
    const f = Array.isArray(r.fallbacks) ? r.fallbacks : Array.isArray(r.fallback) ? r.fallback : null
    return f ? f.filter((x): x is string => typeof x === 'string') : null
  }
  return null
}

export function resolveEffectiveModelFallbacks(entryModel?: unknown, defaultModel?: unknown): string[] | null {
  return resolveModelFallbacks(entryModel) ?? resolveModelFallbacks(defaultModel)
}

export function parseFallbackList(value: string): string[] {
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

export function resolveConfiguredModels(config: Record<string, unknown> | null): { value: string, label: string }[] {
  const models = (config?.agents as { defaults?: { models?: Record<string, { alias?: string }> } })?.defaults?.models
  if (!models || typeof models !== 'object')
    return []
  const out: { value: string, label: string }[] = []
  for (const [modelId, modelRaw] of Object.entries(models)) {
    const trimmed = modelId.trim()
    if (!trimmed)
      continue
    const alias
      = modelRaw && typeof modelRaw === 'object' && typeof (modelRaw as { alias?: string }).alias === 'string'
        ? (modelRaw as { alias: string }).alias.trim()
        : undefined
    const label = alias && alias !== trimmed ? `${alias} (${trimmed})` : trimmed
    out.push({ value: trimmed, label })
  }
  return out.sort((a, b) => a.value.localeCompare(b.value))
}

export function buildModelSelectOptions(
  config: Record<string, unknown> | null,
  current?: string | null,
): { value: string, label: string }[] {
  const options = resolveConfiguredModels(config)
  const has = current ? options.some(o => o.value === current) : false
  if (current && !has) {
    options.unshift({ value: current, label: `Current (${current})` })
  }
  return options
}

export function findAgentConfigEntryIndex(config: Record<string, unknown> | null, agentId: string): number {
  const id = agentId.trim()
  if (!id)
    return -1
  const list = (config?.agents as { list?: unknown[] })?.list
  if (!Array.isArray(list))
    return -1
  return list.findIndex(
    e => e && typeof e === 'object' && (e as { id?: string }).id === id,
  )
}

export function ensureAgentConfigEntryMut(cfg: Record<string, unknown>, agentId: string): number {
  const id = agentId.trim()
  if (!id)
    return -1
  const existing = findAgentConfigEntryIndex(cfg, id)
  if (existing >= 0)
    return existing
  if (!cfg.agents || typeof cfg.agents !== 'object')
    cfg.agents = {}
  const agents = cfg.agents as { list?: unknown[] }
  if (!Array.isArray(agents.list))
    agents.list = []
  agents.list.push({ id })
  return agents.list.length - 1
}

function getListEntry(cfg: Record<string, unknown>, index: number): AgentConfigEntry {
  const list = (cfg.agents as { list: AgentConfigEntry[] }).list
  return list[index] as AgentConfigEntry
}

/** 对齐 app-render onModelChange */
export function applyAgentModelChange(cfg: Record<string, unknown>, agentId: string, modelId: string | null): void {
  if (!modelId) {
    const index = findAgentConfigEntryIndex(cfg, agentId)
    if (index < 0)
      return
    const entry = getListEntry(cfg, index)
    delete entry.model
    return
  }
  const index = ensureAgentConfigEntryMut(cfg, agentId)
  const entry = getListEntry(cfg, index)
  const existing = entry.model
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    const fallbacks = (existing as { fallbacks?: unknown }).fallbacks
    entry.model = {
      primary: modelId,
      ...(Array.isArray(fallbacks) ? { fallbacks: fallbacks.filter((x): x is string => typeof x === 'string') } : {}),
    }
  }
  else {
    entry.model = modelId
  }
}

/** 对齐 app-render onModelFallbacksChange */
export function applyAgentModelFallbacks(cfg: Record<string, unknown>, agentId: string, fallbacks: string[]): void {
  const normalized = fallbacks.map(n => n.trim()).filter(Boolean)
  const resolved = resolveAgentConfig(cfg, agentId)
  const effectivePrimary
    = resolveModelPrimary(resolved.entry?.model) ?? resolveModelPrimary(resolved.defaults?.model)
  const effectiveFallbacks = resolveEffectiveModelFallbacks(resolved.entry?.model, resolved.defaults?.model)
  const index
    = normalized.length > 0
      ? effectivePrimary
        ? ensureAgentConfigEntryMut(cfg, agentId)
        : -1
      : (effectiveFallbacks?.length ?? 0) > 0 || findAgentConfigEntryIndex(cfg, agentId) >= 0
          ? ensureAgentConfigEntryMut(cfg, agentId)
          : -1
  if (index < 0)
    return
  const entry = getListEntry(cfg, index)
  const existing = entry.model
  const resolvePrimary = (): string | null => {
    if (typeof existing === 'string') {
      const t = existing.trim()
      return t || null
    }
    if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
      const p = (existing as { primary?: unknown }).primary
      if (typeof p === 'string' && p.trim())
        return p.trim()
    }
    return null
  }
  const primary = resolvePrimary() ?? effectivePrimary
  if (normalized.length === 0) {
    if (primary) {
      entry.model = primary
    }
    else {
      delete entry.model
    }
    return
  }
  if (!primary)
    return
  entry.model = { primary, fallbacks: normalized }
}

/** 设置当前 agent 的 skills allowlist：undefined = 全部启用，[] = 全部禁用，string[] = 仅允许列表中的 skill */
export function setAgentSkills(
  cfg: Record<string, unknown>,
  agentId: string,
  skills: string[] | undefined,
): void {
  const idx
    = skills === undefined
      ? findAgentConfigEntryIndex(cfg, agentId)
      : ensureAgentConfigEntryMut(cfg, agentId)
  if (idx < 0)
    return
  const entry = getListEntry(cfg, idx)
  if (skills === undefined) {
    delete entry.skills
    return
  }
  entry.skills = skills.map(s => s.trim()).filter(Boolean)
}
