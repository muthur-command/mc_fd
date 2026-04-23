<script setup lang="ts">
/**
 * Skills 页：与 openclaw Control UI skills 完全一致（card、Filters、分组、Enable/Disable、API key、Install）
 */
import { ExternalLink, RefreshCw } from 'lucide-vue-next'
import { computed, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { clampText } from '@/plugin/openclaw/lib/format'
import { RPC } from '@/plugin/openclaw/lib/rpc-methods'

const { t } = useI18n()
const gateway = inject<
  ReturnType<typeof import('@/plugin/openclaw/composables/use-openclaw-gateway').useOpenClawGateway>
>('openclaw-gateway')!

/** 与 openclaw SkillStatusEntry 兼容（网关 skills.status 返回） */
interface SkillStatusEntry {
  name: string
  description?: string
  source?: string
  skillKey: string
  disabled?: boolean
  emoji?: string
  bundled?: boolean
  primaryEnv?: string
  eligible?: boolean
  blockedByAllowlist?: boolean
  install?: Array<{ id: string, label?: string }>
  missing?: { bins?: string[], env?: string[], config?: string[], os?: string[] }
  requirements?: { bins?: string[], env?: string[], config?: string[], os?: string[] }
}
interface SkillStatusReport {
  workspaceDir?: string
  managedSkillsDir?: string
  skills: SkillStatusEntry[]
}

const SOURCE_GROUPS: Array<{ id: string, label: string, sources: string[] }> = [
  { id: 'workspace', label: 'Workspace Skills', sources: ['openclaw-workspace'] },
  { id: 'built-in', label: 'Built-in Skills', sources: ['openclaw-bundled'] },
  { id: 'installed', label: 'Installed Skills', sources: ['openclaw-managed'] },
  { id: 'extra', label: 'Extra Skills', sources: ['openclaw-extra'] },
]

function groupSkills(skills: SkillStatusEntry[]): Array<{ id: string, label: string, skills: SkillStatusEntry[] }> {
  const map = new Map<string, SkillStatusEntry[]>()
  for (const g of SOURCE_GROUPS) {
    map.set(g.id, [])
  }
  const builtIn = SOURCE_GROUPS.find(g => g.id === 'built-in')!
  const other: SkillStatusEntry[] = []
  for (const skill of skills) {
    const match = skill.bundled
      ? builtIn
      : SOURCE_GROUPS.find(g => g.sources.includes(skill.source ?? ''))
    if (match) {
      map.get(match.id)!.push(skill)
    }
    else {
      other.push(skill)
    }
  }
  const out: Array<{ id: string, label: string, skills: SkillStatusEntry[] }> = []
  for (const g of SOURCE_GROUPS) {
    const list = map.get(g.id)!
    if (list.length > 0)
      out.push({ id: g.id, label: g.label, skills: list })
  }
  if (other.length > 0)
    out.push({ id: 'other', label: 'Other Skills', skills: other })
  return out
}

function getMissing(skill: SkillStatusEntry): string[] {
  const m = skill.missing ?? {}
  return [
    ...(m.bins ?? []).map(b => `bin:${b}`),
    ...(m.env ?? []).map(e => `env:${e}`),
    ...(m.config ?? []).map(c => `config:${c}`),
    ...(m.os ?? []).map(o => `os:${o}`),
  ]
}

function getReasons(skill: SkillStatusEntry): string[] {
  const r: string[] = []
  if (skill.disabled)
    r.push('disabled')
  if (skill.blockedByAllowlist)
    r.push('blocked by allowlist')
  return r
}

const report = ref<SkillStatusReport | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const filter = ref('')
const busyKey = ref<string | null>(null)
const skillEdits = ref<Record<string, string>>({})
const skillMessages = ref<Record<string, { kind: 'success' | 'error', message: string }>>({})

const skillsList = computed(() => report.value?.skills ?? [])

const filtered = computed(() => {
  const list = skillsList.value
  const q = filter.value.trim().toLowerCase()
  if (!q)
    return list
  return list.filter(s =>
    [s.name, s.description ?? '', s.source ?? ''].join(' ').toLowerCase().includes(q),
  )
})

const groups = computed(() => groupSkills(filtered.value))

async function load() {
  if (!gateway?.connected)
    return
  loading.value = true
  error.value = null
  try {
    const res = await gateway.request<SkillStatusReport | undefined>(RPC.skillsStatus, {})
    report.value = res ?? null
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    report.value = null
  }
  finally {
    loading.value = false
  }
}

function setMessage(key: string, msg: { kind: 'success' | 'error', message: string } | null) {
  const next = { ...skillMessages.value }
  if (msg)
    next[key] = msg
  else delete next[key]
  skillMessages.value = next
}

async function onToggle(skill: SkillStatusEntry) {
  if (!gateway?.connected)
    return
  busyKey.value = skill.skillKey
  error.value = null
  try {
    await gateway.request(RPC.skillsUpdate, { skillKey: skill.skillKey, enabled: !skill.disabled })
    await load()
    setMessage(skill.skillKey, {
      kind: 'success',
      message: skill.disabled ? t('openclaw.skillsSkillEnabled') : t('openclaw.skillsSkillDisabled'),
    })
  }
  catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    error.value = msg
    setMessage(skill.skillKey, { kind: 'error', message: msg })
  }
  finally {
    busyKey.value = null
  }
}

async function onSaveKey(skill: SkillStatusEntry) {
  if (!gateway?.connected)
    return
  const apiKey = skillEdits.value[skill.skillKey] ?? ''
  busyKey.value = skill.skillKey
  error.value = null
  try {
    await gateway.request(RPC.skillsUpdate, { skillKey: skill.skillKey, apiKey })
    await load()
    setMessage(skill.skillKey, { kind: 'success', message: t('openclaw.skillsApiKeySaved') })
  }
  catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    error.value = msg
    setMessage(skill.skillKey, { kind: 'error', message: msg })
  }
  finally {
    busyKey.value = null
  }
}

async function onInstall(skill: SkillStatusEntry) {
  if (!gateway?.connected || !skill.install?.length)
    return
  const opt = skill.install[0]
  busyKey.value = skill.skillKey
  error.value = null
  try {
    await gateway.request<{ message?: string }>(RPC.skillsInstall, {
      name: skill.name,
      installId: opt.id,
      timeoutMs: 120000,
    })
    await load()
    setMessage(skill.skillKey, {
      kind: 'success',
      message: opt.label ?? t('openclaw.skillsInstalled'),
    })
  }
  catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    error.value = msg
    setMessage(skill.skillKey, { kind: 'error', message: msg })
  }
  finally {
    busyKey.value = null
  }
}

watch(
  () => gateway?.connected,
  (c) => {
    if (c)
      void load()
  },
  { immediate: true },
)
</script>

<template>
  <div class="min-h-0 flex-1 overflow-visible pt-1 pl-1 pr-1 pb-1">
    <section
      class="skills-card card rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <!-- Title row -->
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div class="card-title text-base font-semibold">
            {{ t('openclaw.skillsTitle') }}
          </div>
          <div class="card-sub text-muted-foreground mt-1 text-sm">
            {{ t('openclaw.skillsSubtitle') }}
          </div>
        </div>
        <UiButton
          variant="outline"
          size="sm"
          :disabled="loading || !gateway?.connected"
          @click="load()"
        >
          <RefreshCw class="mr-1 size-3.5" :class="{ 'animate-spin': loading }" />
          {{ loading ? t('openclaw.skillsLoading') : t('openclaw.skillsRefresh') }}
        </UiButton>
      </div>

      <!-- Filters row: Browse Skills Store, search input, N shown -->
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <a
          href="https://clawhub.com"
          target="_blank"
          rel="noreferrer"
          :title="t('openclaw.skillsBrowseStoreTitle')"
          class="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground has-[>svg]:px-2.5"
        >
          {{ t('openclaw.skillsBrowseStore') }}
          <ExternalLink class="size-3.5" />
        </a>
        <UiInput
          v-model="filter"
          type="text"
          :placeholder="t('openclaw.skillsSearchPlaceholder')"
          autocomplete="off"
          class="min-w-[180px] max-w-[280px]"
        />
        <span class="text-muted-foreground text-sm">{{ t('openclaw.skillsShown', { n: filtered.length }) }}</span>
      </div>

      <UiAlert v-if="error" variant="destructive" class="mt-3 text-sm">
        {{ error }}
      </UiAlert>

      <!-- Empty state -->
      <p
        v-else-if="filtered.length === 0"
        class="text-muted-foreground mt-4 text-sm"
      >
        {{ !gateway?.connected && !report ? t('openclaw.skillsNotConnected') : t('openclaw.skillsNoSkills') }}
      </p>

      <!-- Groups -->
      <div v-else class="skills-groups mt-4 space-y-3">
        <details
          v-for="group in groups"
          :key="group.id"
          class="skills-group rounded-lg border border-border"
          :open="group.id === 'built-in' || group.id === 'workspace'"
        >
          <summary class="skills-group-summary flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 font-medium focus-visible:outline-none">
            <span>{{ group.label }}</span>
            <span class="text-muted-foreground font-normal">{{ group.skills.length }}</span>
          </summary>
          <div class="skills-grid divide-border divide-y border-t border-border">
            <div
              v-for="skill in group.skills"
              :key="skill.skillKey"
              class="skills-list-item flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-3 py-3"
            >
              <div class="min-w-0 flex-1">
                <div class="font-medium text-sm">
                  {{ skill.emoji ? `${skill.emoji} ` : '' }}{{ skill.name }}
                </div>
                <div v-if="skill.description" class="text-muted-foreground mt-0.5 text-xs">
                  {{ clampText(skill.description, 140) }}
                </div>
                <div class="mt-1.5 flex flex-wrap gap-1.5">
                  <UiBadge v-if="skill.source" variant="secondary" class="text-xs">
                    {{ skill.source }}
                  </UiBadge>
                  <UiBadge :variant="skill.eligible !== false ? 'default' : 'secondary'" class="text-xs">
                    {{ skill.eligible !== false ? 'eligible' : 'blocked' }}
                  </UiBadge>
                  <UiBadge v-if="skill.disabled" variant="outline" class="text-xs">
                    disabled
                  </UiBadge>
                </div>
                <p v-if="getMissing(skill).length" class="text-muted-foreground mt-1 text-xs">
                  Missing: {{ getMissing(skill).join(', ') }}
                </p>
                <p v-if="getReasons(skill).length" class="text-muted-foreground mt-0.5 text-xs">
                  Reason: {{ getReasons(skill).join(', ') }}
                </p>
              </div>
              <div class="flex shrink-0 flex-col items-end gap-2">
                <div class="flex flex-wrap justify-end gap-2">
                  <UiButton
                    variant="outline"
                    size="sm"
                    :disabled="busyKey !== null"
                    @click="onToggle(skill)"
                  >
                    {{ skill.disabled ? t('openclaw.skillsEnable') : t('openclaw.skillsDisable') }}
                  </UiButton>
                  <UiButton
                    v-if="skill.install?.length && (skill.missing?.bins?.length ?? 0) > 0"
                    variant="outline"
                    size="sm"
                    :disabled="busyKey !== null"
                    @click="onInstall(skill)"
                  >
                    {{ busyKey === skill.skillKey ? t('openclaw.skillsInstalling') : (skill.install[0].label ?? t('openclaw.skillsInstall')) }}
                  </UiButton>
                </div>
                <p
                  v-if="skillMessages[skill.skillKey]"
                  class="text-right text-xs"
                  :class="skillMessages[skill.skillKey].kind === 'error' ? 'text-destructive' : 'text-green-600 dark:text-green-500'"
                >
                  {{ skillMessages[skill.skillKey].message }}
                </p>
                <template v-if="skill.primaryEnv">
                  <div class="flex w-full min-w-[200px] flex-col gap-1">
                    <label class="text-muted-foreground text-xs">{{ t('openclaw.skillsApiKeyLabel') }}</label>
                    <UiInput
                      v-model="skillEdits[skill.skillKey]"
                      type="password"
                      class="h-8 text-sm"
                      :placeholder="skill.primaryEnv"
                    />
                  </div>
                  <UiButton
                    size="sm"
                    class="mt-1"
                    :disabled="busyKey !== null"
                    @click="onSaveKey(skill)"
                  >
                    {{ t('openclaw.skillsSaveKey') }}
                  </UiButton>
                </template>
              </div>
            </div>
          </div>
        </details>
      </div>
    </section>
  </div>
</template>

<style scoped>
.skills-group-summary::-webkit-details-marker {
  display: none;
}
</style>
