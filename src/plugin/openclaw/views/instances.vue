<script setup lang="ts">
import { Eye, EyeOff, Monitor, RefreshCw, Users } from 'lucide-vue-next'
/**
 * Instances：对齐 openclaw-app instances.ts（列表项 + 芯片 + 元信息）
 * 页头与双列摘要卡参考 Overview。
 */
import { computed, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { PresenceEntry } from '@/plugin/openclaw/lib/format'

import { formatAgo, formatPresenceAge } from '@/plugin/openclaw/lib/format'
import { RPC } from '@/plugin/openclaw/lib/rpc-methods'

const { t } = useI18n()
const gateway = inject<ReturnType<typeof import('@/plugin/openclaw/composables/use-openclaw-gateway').useOpenClawGateway>>('openclaw-gateway')!

const entries = ref<PresenceEntry[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const statusMessage = ref<string | null>(null)
const lastLoadedAt = ref<number | null>(null)
/** 与 Control UI 一致：默认隐藏主机与 IP */
const hostsRevealed = ref(false)

const count = computed(() => entries.value.length)

function hostLine(entry: PresenceEntry): string {
  const raw = entry.host ?? t('openclaw.instancesUnknownHost')
  return hostsRevealed.value ? raw : '••••••••'
}

function ipLine(entry: PresenceEntry): string | null {
  if (!entry.ip)
    return null
  return hostsRevealed.value ? entry.ip : '••••'
}

function subLine(entry: PresenceEntry): string {
  const ip = ipLine(entry)
  const mode = entry.mode ?? 'unknown'
  const ver = entry.version ?? ''
  const prefix = ip ? `${ip} ` : ''
  return `${prefix}${mode} ${ver}`.trim()
}

function scopesChip(entry: PresenceEntry): string | null {
  const scopes = Array.isArray(entry.scopes) ? entry.scopes.filter(Boolean) : []
  if (scopes.length === 0)
    return null
  if (scopes.length > 3)
    return t('openclaw.instancesScopesMany', { n: scopes.length })
  return t('openclaw.instancesScopesList', { list: scopes.join(', ') })
}

function lastInputLabel(entry: PresenceEntry): string {
  if (entry.lastInputSeconds == null)
    return t('openclaw.overviewNone')
  return t('openclaw.instancesLastInputAgo', { n: entry.lastInputSeconds })
}

function entryKey(entry: PresenceEntry, i: number): string {
  return `${entry.ts ?? 0}-${entry.host ?? ''}-${entry.ip ?? ''}-${i}`
}

async function load() {
  if (!gateway?.connected)
    return
  loading.value = true
  error.value = null
  statusMessage.value = null
  try {
    /** 网关 `system-presence` 的 payload 即为条目数组（与 Control UI presence.ts 一致），非 `{ entries }` */
    const res = await gateway.request<unknown>(RPC.systemPresence)
    entries.value = Array.isArray(res)
      ? (res as PresenceEntry[])
      : res != null
        && typeof res === 'object'
        && Array.isArray((res as { entries?: unknown }).entries)
        ? ((res as { entries: PresenceEntry[] }).entries)
        : []
    lastLoadedAt.value = Date.now()
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    loading.value = false
  }
}

watch(() => gateway?.connected, (c) => {
  if (c)
    load()
}, { immediate: true })
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ t('openclaw.tabs.instances') }}
      </h1>
      <p class="text-muted-foreground mt-1 text-sm">
        {{ t('openclaw.instancesPageDesc') }}
      </p>
    </div>

    <UiCard v-if="!gateway?.connected">
      <UiCardContent class="flex flex-col items-center justify-center gap-2 py-8">
        <p class="text-muted-foreground text-sm">
          {{ t('openclaw.connectFirst') }}
        </p>
      </UiCardContent>
    </UiCard>

    <template v-else>
      <div class="grid gap-4 md:grid-cols-2">
        <UiCard class="shadow-sm">
          <UiCardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <UiCardTitle class="text-sm font-medium">
              {{ t('openclaw.instancesSummaryTitle') }}
            </UiCardTitle>
            <Users class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </UiCardHeader>
          <UiCardContent class="space-y-1">
            <div class="font-display text-3xl font-bold tabular-nums">
              {{ count }}
            </div>
            <p class="text-muted-foreground text-xs">
              {{ t('openclaw.instancesHint') }}
            </p>
            <p
              v-if="lastLoadedAt != null"
              class="text-muted-foreground flex items-center gap-1 pt-2 text-xs"
            >
              <Monitor class="size-3.5 shrink-0" aria-hidden="true" />
              {{ t('openclaw.instancesLastFetched') }} {{ formatAgo(lastLoadedAt) }}
            </p>
          </UiCardContent>
        </UiCard>

        <UiCard class="shadow-sm">
          <UiCardHeader>
            <UiCardTitle class="text-sm font-medium">
              {{ t('openclaw.instancesActionsTitle') }}
            </UiCardTitle>
            <UiCardDescription>{{ t('openclaw.instancesActionsDesc') }}</UiCardDescription>
          </UiCardHeader>
          <UiCardContent class="flex flex-wrap items-center gap-2">
            <UiButton
              type="button"
              variant="outline"
              size="icon"
              class="size-9 shrink-0"
              :aria-pressed="hostsRevealed"
              :title="hostsRevealed ? t('openclaw.instancesHideHosts') : t('openclaw.instancesShowHosts')"
              @click="hostsRevealed = !hostsRevealed"
            >
              <Eye v-if="hostsRevealed" class="size-4" />
              <EyeOff v-else class="size-4" />
            </UiButton>
            <UiButton size="sm" :disabled="loading" class="gap-1.5" @click="load">
              <RefreshCw
                class="size-3.5 shrink-0"
                :class="{ 'animate-spin': loading }"
                aria-hidden="true"
              />
              {{ loading ? t('common.loading') : t('openclaw.overviewRefresh') }}
            </UiButton>
          </UiCardContent>
        </UiCard>
      </div>

      <UiCard class="shadow-sm overflow-hidden">
        <UiCardHeader>
          <UiCardTitle>{{ t('openclaw.instancesTitle') }}</UiCardTitle>
          <UiCardDescription>{{ t('openclaw.instancesDesc') }}</UiCardDescription>
        </UiCardHeader>
        <UiCardContent class="px-0 pb-0 pt-0">
          <UiAlert v-if="error" variant="destructive" class="mx-6 mb-4">
            {{ error }}
          </UiAlert>
          <UiAlert v-else-if="statusMessage" variant="default" class="mx-6 mb-4">
            {{ statusMessage }}
          </UiAlert>

          <div
            v-if="entries.length === 0 && !loading"
            class="text-muted-foreground px-6 py-10 text-center text-sm"
          >
            {{ t('openclaw.instancesNone') }}
          </div>
          <div v-else-if="loading && entries.length === 0" class="text-muted-foreground px-6 py-10 text-center text-sm">
            {{ t('common.loading') }}
          </div>
          <ul v-else class="divide-y border-t" role="list">
            <li
              v-for="(entry, i) in entries"
              :key="entryKey(entry, i)"
              class="hover:bg-muted/30 flex flex-col gap-3 px-6 py-4 transition-colors sm:flex-row sm:items-start sm:justify-between"
            >
              <div class="min-w-0 flex-1 space-y-2">
                <div class="text-base font-semibold tracking-tight">
                  {{ hostLine(entry) }}
                </div>
                <div class="text-muted-foreground font-mono text-sm break-all">
                  {{ subLine(entry) }}
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <UiBadge v-if="entry.mode" variant="secondary" class="text-xs font-normal">
                    {{ entry.mode }}
                  </UiBadge>
                  <UiBadge
                    v-for="role in (entry.roles ?? []).filter(Boolean)"
                    :key="role"
                    variant="outline"
                    class="text-xs font-normal"
                  >
                    {{ role }}
                  </UiBadge>
                  <UiBadge v-if="scopesChip(entry)" variant="outline" class="text-xs font-normal">
                    {{ scopesChip(entry) }}
                  </UiBadge>
                  <UiBadge v-if="entry.platform" variant="outline" class="text-xs font-normal">
                    {{ entry.platform }}
                  </UiBadge>
                  <UiBadge v-if="entry.deviceFamily" variant="outline" class="text-xs font-normal">
                    {{ entry.deviceFamily }}
                  </UiBadge>
                  <UiBadge v-if="entry.modelIdentifier" variant="outline" class="text-xs font-normal">
                    {{ entry.modelIdentifier }}
                  </UiBadge>
                  <UiBadge v-if="entry.version" variant="outline" class="text-xs font-normal">
                    {{ entry.version }}
                  </UiBadge>
                </div>
              </div>
              <div class="text-muted-foreground shrink-0 space-y-1 text-right text-xs sm:min-w-[140px]">
                <div class="text-foreground font-medium">
                  {{ formatPresenceAge(entry) }}
                </div>
                <div>
                  {{ t('openclaw.instancesLastInput') }} {{ lastInputLabel(entry) }}
                </div>
                <div v-if="entry.reason != null && entry.reason !== ''">
                  {{ t('openclaw.instancesReason') }} {{ entry.reason }}
                </div>
              </div>
            </li>
          </ul>
        </UiCardContent>
      </UiCard>
    </template>
  </div>
</template>
