<script setup lang="ts">
/**
 * Channels 页：对齐 openclaw Control UI channels.ts / channels.whatsapp 等布局与字段
 */
import { computed, inject, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { formatAgo, formatDurationMs } from '@/plugin/openclaw/lib/format'
import { RPC } from '@/plugin/openclaw/lib/rpc-methods'
import ChannelStatusList from '@/plugin/openclaw/views/channels/ChannelStatusList.vue'

const { t } = useI18n()
const gateway = inject<ReturnType<typeof import('@/plugin/openclaw/composables/use-openclaw-gateway').useOpenClawGateway>>('openclaw-gateway')!

const DEFAULT_ORDER = [
  'whatsapp',
  'telegram',
  'discord',
  'googlechat',
  'slack',
  'signal',
  'imessage',
  'nostr',
] as const

type ChannelAccount = Record<string, unknown>

interface ChannelsSnapshot {
  ts?: number
  channelOrder?: string[]
  channelLabels?: Record<string, string>
  channelDetailLabels?: Record<string, string>
  channelMeta?: Array<{ id: string, label?: string, detailLabel?: string }>
  channels?: Record<string, Record<string, unknown>>
  channelAccounts?: Record<string, ChannelAccount[]>
}

const snapshot = ref<ChannelsSnapshot | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
const lastSuccessAt = ref<number | null>(null)

const whatsappBusy = ref(false)
const whatsappQr = ref<string | null>(null)
const whatsappMessage = ref<string | null>(null)
const whatsappConnectedHint = ref<boolean | null>(null)

/** 与 Control UI channels.config：每通道 JSON 草稿 + Save(config.patch) / Reload(config.get) */
const configSnapshot = ref<{ hash?: string | null, config?: Record<string, unknown> } | null>(null)
const channelDrafts = reactive<Record<string, string>>({})
const channelDirty = reactive<Record<string, boolean>>({})
const configSaving = ref(false)
const channelConfigErr = ref<string | null>(null)

async function loadGatewayConfig() {
  if (!gateway?.connected)
    return
  try {
    const res = await gateway.request<{ hash?: string | null, config?: Record<string, unknown> }>(
      RPC.configGet,
      {},
    )
    configSnapshot.value = res
    const channels = (res?.config?.channels ?? {}) as Record<string, unknown>
    const keys = new Set<string>([...DEFAULT_ORDER, ...Object.keys(channels)])
    for (const k of keys) {
      channelDrafts[k] = JSON.stringify(channels[k] ?? {}, null, 2)
      channelDirty[k] = false
    }
    channelConfigErr.value = null
  }
  catch (e) {
    channelConfigErr.value = e instanceof Error ? e.message : String(e)
  }
}

async function channelConfigSave(k: string) {
  channelConfigErr.value = null
  const hash = configSnapshot.value?.hash
  if (!hash) {
    channelConfigErr.value = t('openclaw.channelConfigHashMissing')
    return
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(channelDrafts[k] || '{}')
  }
  catch {
    channelConfigErr.value = t('openclaw.channelConfigInvalidJson')
    return
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    channelConfigErr.value = t('openclaw.channelConfigInvalidJson')
    return
  }
  configSaving.value = true
  try {
    const raw = JSON.stringify({ channels: { [k]: parsed } })
    await gateway.request(RPC.configPatch, { raw, baseHash: hash })
    await loadGatewayConfig()
    await load(true)
  }
  catch (e) {
    channelConfigErr.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    configSaving.value = false
  }
}

async function channelConfigReload(k: string) {
  channelConfigErr.value = null
  if (!gateway?.connected || configSaving.value)
    return
  try {
    const res = await gateway.request<{ hash?: string | null, config?: Record<string, unknown> }>(
      RPC.configGet,
      {},
    )
    configSnapshot.value = res
    const channels = (res?.config?.channels ?? {}) as Record<string, unknown>
    channelDrafts[k] = JSON.stringify(channels[k] ?? {}, null, 2)
    channelDirty[k] = false
    await load(false)
  }
  catch (e) {
    channelConfigErr.value = e instanceof Error ? e.message : String(e)
  }
}

function onChannelDraftInput(k: string, v: string) {
  channelDrafts[k] = v
  channelDirty[k] = true
}

function channelEnabled(key: string): boolean {
  const ch = snapshot.value?.channels?.[key]
  if (!ch || typeof ch !== 'object')
    return false
  const acc = snapshot.value?.channelAccounts?.[key] ?? []
  const configured = ch.configured === true
  const running = ch.running === true
  const connected = ch.connected === true
  const accountActive = acc.some(
    a => a?.configured === true || a?.running === true || a?.connected === true,
  )
  return configured || running || connected || accountActive
}

const orderedKeys = computed(() => {
  const s = snapshot.value
  let order: string[] = []
  if (s?.channelMeta?.length) {
    order = s.channelMeta.map(e => e.id)
  }
  else if (s?.channelOrder?.length) {
    order = [...s.channelOrder]
  }
  else {
    order = [...DEFAULT_ORDER]
  }
  const seen = new Set<string>()
  const keys: string[] = []
  for (const k of order) {
    if (!seen.has(k)) {
      seen.add(k)
      keys.push(k)
    }
  }
  for (const k of DEFAULT_ORDER) {
    if (!seen.has(k))
      keys.push(k)
  }
  return keys
    .map(key => ({ key, enabled: channelEnabled(key) }))
    .sort((a, b) => {
      if (a.enabled !== b.enabled)
        return a.enabled ? -1 : 1
      return 0
    })
    .map(x => x.key)
})

const whatsapp = computed(() => snapshot.value?.channels?.whatsapp as Record<string, unknown> | undefined)

const whatsappStatusItems = computed(() => {
  const w = whatsapp.value
  return [
    {
      label: t('openclaw.channelConfigured'),
      value: w?.configured === true ? t('openclaw.channelYes') : t('openclaw.channelNo'),
    },
    {
      label: t('openclaw.channelLinked'),
      value: w?.linked === true ? t('openclaw.channelYes') : t('openclaw.channelNo'),
    },
    {
      label: t('openclaw.channelRunning'),
      value: w?.running === true ? t('openclaw.channelYes') : t('openclaw.channelNo'),
    },
    {
      label: t('openclaw.channelConnected'),
      value: w?.connected === true ? t('openclaw.channelYes') : t('openclaw.channelNo'),
    },
    { label: t('openclaw.channelLastConnect'), value: fmtTs(w?.lastConnectedAt) },
    { label: t('openclaw.channelLastMessage'), value: fmtTs(w?.lastMessageAt) },
    {
      label: t('openclaw.channelAuthAge'),
      value:
        w?.authAgeMs != null && typeof w.authAgeMs === 'number'
          ? formatDurationMs(w.authAgeMs)
          : t('openclaw.channelNa'),
    },
  ]
})

function telegramAccountRows(acc: ChannelAccount): Array<{ label: string, value: string }> {
  return [
    {
      label: t('openclaw.channelRunning'),
      value: acc.running === true ? t('openclaw.channelYes') : t('openclaw.channelNo'),
    },
    {
      label: t('openclaw.channelConfigured'),
      value: acc.configured === true ? t('openclaw.channelYes') : t('openclaw.channelNo'),
    },
    { label: t('openclaw.channelLastInbound'), value: fmtTs(acc.lastInboundAt) },
  ]
}

function channelTitle(key: string): string {
  const s = snapshot.value
  const meta = s?.channelMeta?.find(e => e.id === key)
  if (meta?.label)
    return meta.label
  if (s?.channelLabels?.[key])
    return s.channelLabels[key]!
  return key.charAt(0).toUpperCase() + key.slice(1)
}

function channelSubtitle(key: string): string {
  const meta = snapshot.value?.channelMeta?.find(e => e.id === key)
  if (meta?.detailLabel)
    return meta.detailLabel
  const d = snapshot.value?.channelDetailLabels?.[key]
  if (d)
    return d
  const map: Record<string, string> = {
    whatsapp: 'openclaw.channelSubWhatsApp',
    telegram: 'openclaw.channelSubTelegram',
    discord: 'openclaw.channelSubDiscord',
    googlechat: 'openclaw.channelSubGoogleChat',
    slack: 'openclaw.channelSubSlack',
    signal: 'openclaw.channelSubSignal',
    imessage: 'openclaw.channelSubIMessage',
    nostr: 'openclaw.channelSubNostr',
  }
  const i18nKey = map[key]
  return i18nKey ? t(i18nKey) : t('openclaw.channelSubGeneric')
}

function fmtTs(ms: unknown): string {
  return typeof ms === 'number' ? formatAgo(ms) : t('openclaw.channelNa')
}

function boolYesNo(v: unknown): string {
  return v === true ? t('openclaw.channelYes') : t('openclaw.channelNo')
}

async function load(probe = false) {
  if (!gateway?.connected)
    return
  loading.value = true
  loadError.value = null
  try {
    const res = await gateway.request<ChannelsSnapshot | null>(RPC.channelsStatus, {
      probe,
      timeoutMs: 8000,
    })
    snapshot.value = res && typeof res === 'object' ? res : null
    lastSuccessAt.value = Date.now()
  }
  catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    loading.value = false
  }
}

async function whatsAppStart(force: boolean) {
  if (!gateway?.connected || whatsappBusy.value)
    return
  whatsappBusy.value = true
  whatsappMessage.value = null
  whatsappConnectedHint.value = null
  try {
    const res = await gateway.request<{ message?: string, qrDataUrl?: string }>(RPC.webLoginStart, {
      force,
      timeoutMs: 30_000,
    })
    whatsappMessage.value = res?.message ?? null
    whatsappQr.value = res?.qrDataUrl ?? null
  }
  catch (e) {
    whatsappMessage.value = e instanceof Error ? e.message : String(e)
    whatsappQr.value = null
  }
  finally {
    whatsappBusy.value = false
  }
}

async function whatsAppWait() {
  if (!gateway?.connected || whatsappBusy.value)
    return
  whatsappBusy.value = true
  try {
    const res = await gateway.request<{ message?: string, connected?: boolean }>(RPC.webLoginWait, {
      timeoutMs: 120_000,
    })
    whatsappMessage.value = res?.message ?? null
    whatsappConnectedHint.value = res?.connected ?? null
    if (res?.connected)
      whatsappQr.value = null
  }
  catch (e) {
    whatsappMessage.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    whatsappBusy.value = false
  }
}

async function whatsAppLogout() {
  if (!gateway?.connected || whatsappBusy.value)
    return
  whatsappBusy.value = true
  try {
    await gateway.request(RPC.channelsLogout, { channel: 'whatsapp' })
    whatsappMessage.value = t('openclaw.channelLoggedOut')
    whatsappQr.value = null
    whatsappConnectedHint.value = null
    await load(false)
  }
  catch (e) {
    whatsappMessage.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    whatsappBusy.value = false
  }
}

function telegramAccounts(): ChannelAccount[] {
  const list = snapshot.value?.channelAccounts?.telegram
  return Array.isArray(list) ? list : []
}

function genericRows(_key: string, st: Record<string, unknown> | undefined): Array<{ label: string, value: string }> {
  if (!st)
    return []
  const rows: Array<{ label: string, value: string }> = []
  const addBool = (field: string, labelKey: string) => {
    if (field in st && typeof st[field] === 'boolean') {
      rows.push({ label: t(labelKey), value: boolYesNo(st[field]) })
    }
  }
  addBool('configured', 'openclaw.channelConfigured')
  addBool('linked', 'openclaw.channelLinked')
  addBool('running', 'openclaw.channelRunning')
  addBool('connected', 'openclaw.channelConnected')
  if (typeof st.mode === 'string') {
    rows.push({ label: t('openclaw.channelMode'), value: st.mode })
  }
  const tsFields: Array<[string, string]> = [
    ['lastConnectedAt', 'openclaw.channelLastConnect'],
    ['lastMessageAt', 'openclaw.channelLastMessage'],
    ['lastStartAt', 'openclaw.channelLastStart'],
    ['lastProbeAt', 'openclaw.channelLastProbe'],
  ]
  for (const [field, labelKey] of tsFields) {
    if (typeof st[field] === 'number') {
      rows.push({ label: t(labelKey), value: fmtTs(st[field]) })
    }
  }
  if (st.authAgeMs != null && typeof st.authAgeMs === 'number') {
    rows.push({ label: t('openclaw.channelAuthAge'), value: formatDurationMs(st.authAgeMs) })
  }
  return rows
}

function probeSummary(st: Record<string, unknown> | undefined): string | null {
  const p = st?.probe as Record<string, unknown> | undefined
  if (!p || typeof p !== 'object')
    return null
  const ok = p.ok === true ? 'ok' : 'failed'
  const status = p.status != null ? String(p.status) : ''
  const err = p.error != null ? String(p.error) : ''
  return `Probe ${ok}${status ? ` · ${status}` : ''}${err ? ` ${err}` : ''}`.trim()
}

watch(
  () => gateway?.connected,
  async (c) => {
    if (c) {
      await load(false)
      await loadGatewayConfig()
    }
    else {
      snapshot.value = null
      loadError.value = null
      configSnapshot.value = null
      Object.keys(channelDrafts).forEach((k) => {
        delete channelDrafts[k]
      })
      Object.keys(channelDirty).forEach((k) => {
        delete channelDirty[k]
      })
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ t('openclaw.channelsTitle') }}
      </h1>
      <p class="text-muted-foreground mt-1 text-sm">
        {{ t('openclaw.channelsPageDesc') }}
      </p>
    </div>

    <UiCard v-if="!gateway?.connected">
      <UiCardContent class="py-8 text-center text-muted-foreground text-sm">
        {{ t('openclaw.connectFirst') }}
      </UiCardContent>
    </UiCard>

    <template v-else>
      <UiAlert v-if="loadError" variant="destructive">
        {{ loadError }}
      </UiAlert>
      <UiAlert v-if="channelConfigErr" variant="destructive" class="text-sm">
        {{ channelConfigErr }}
      </UiAlert>

      <div v-if="loading && !snapshot" class="text-muted-foreground text-sm">
        {{ t('common.loading') }}
      </div>

      <div v-else class="grid gap-4 md:grid-cols-2">
        <template v-for="key in orderedKeys" :key="key">
          <!-- WhatsApp -->
          <UiCard v-if="key === 'whatsapp'" class="shadow-sm">
            <UiCardHeader>
              <UiCardTitle>{{ channelTitle('whatsapp') }}</UiCardTitle>
              <UiCardDescription>{{ channelSubtitle('whatsapp') }}</UiCardDescription>
              <UiCardDescription
                v-if="(snapshot?.channelAccounts?.whatsapp?.length ?? 0) > 1"
                class="text-foreground/80 font-medium"
              >
                {{
                  t('openclaw.channelAccountsCount', {
                    n: snapshot?.channelAccounts?.whatsapp?.length ?? 0,
                  })
                }}
              </UiCardDescription>
            </UiCardHeader>
            <UiCardContent class="space-y-4">
              <ChannelStatusList :rows="whatsappStatusItems" />

              <UiAlert
                v-if="typeof whatsapp?.lastError === 'string' && whatsapp.lastError"
                variant="destructive"
                class="text-sm"
              >
                {{ whatsapp.lastError }}
              </UiAlert>

              <UiAlert v-if="whatsappMessage" variant="default" class="text-sm">
                {{ whatsappMessage }}
                <template v-if="whatsappConnectedHint === true">
                  · {{ t('openclaw.channelConnectedOk') }}
                </template>
              </UiAlert>

              <div v-if="whatsappQr" class="flex justify-center rounded-lg border bg-muted/30 p-4">
                <img :src="whatsappQr" alt="WhatsApp QR" class="max-h-56 max-w-full object-contain">
              </div>

              <div class="flex flex-wrap gap-2">
                <UiButton size="sm" :disabled="whatsappBusy" @click="whatsAppStart(false)">
                  {{ whatsappBusy ? t('openclaw.channelWorking') : t('openclaw.channelShowQr') }}
                </UiButton>
                <UiButton size="sm" variant="secondary" :disabled="whatsappBusy" @click="whatsAppStart(true)">
                  {{ t('openclaw.channelRelink') }}
                </UiButton>
                <UiButton size="sm" variant="secondary" :disabled="whatsappBusy" @click="whatsAppWait">
                  {{ t('openclaw.channelWaitScan') }}
                </UiButton>
                <UiButton size="sm" variant="destructive" :disabled="whatsappBusy" @click="whatsAppLogout">
                  {{ t('openclaw.channelLogout') }}
                </UiButton>
                <UiButton size="sm" variant="outline" :disabled="loading" @click="load(true)">
                  {{ t('openclaw.channelRefresh') }}
                </UiButton>
              </div>

              <div class="mt-4 space-y-3 border-t pt-4">
                <div class="text-sm font-medium">
                  {{ t('openclaw.channelConfigSection') }}
                </div>
                <textarea
                  class="bg-background border-input focus-visible:ring-ring min-h-[140px] w-full rounded-md border px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2"
                  :value="channelDrafts[key] ?? '{}'"
                  spellcheck="false"
                  @input="onChannelDraftInput(key, ($event.target as HTMLTextAreaElement).value)"
                />
                <div class="flex flex-wrap gap-2">
                  <UiButton
                    size="sm"
                    :disabled="configSaving || !channelDirty[key]"
                    @click="channelConfigSave(key)"
                  >
                    {{ configSaving ? t('openclaw.channelSaving') : t('openclaw.channelSave') }}
                  </UiButton>
                  <UiButton
                    size="sm"
                    variant="outline"
                    :disabled="configSaving"
                    @click="channelConfigReload(key)"
                  >
                    {{ t('openclaw.channelReload') }}
                  </UiButton>
                </div>
              </div>
            </UiCardContent>
          </UiCard>

          <!-- Telegram（多账号时列表） -->
          <UiCard v-else-if="key === 'telegram'" class="shadow-sm">
            <UiCardHeader>
              <UiCardTitle>{{ channelTitle('telegram') }}</UiCardTitle>
              <UiCardDescription>{{ channelSubtitle('telegram') }}</UiCardDescription>
              <UiCardDescription
                v-if="telegramAccounts().length > 1"
                class="text-foreground/80 font-medium"
              >
                {{ t('openclaw.channelAccountsCount', { n: telegramAccounts().length }) }}
              </UiCardDescription>
            </UiCardHeader>
            <UiCardContent class="space-y-4">
              <template v-if="telegramAccounts().length > 1">
                <div
                  v-for="acc in telegramAccounts()"
                  :key="String(acc.accountId)"
                  class="space-y-2 rounded-lg border p-3"
                >
                  <div class="font-medium text-sm">
                    {{
                      (acc.probe as { bot?: { username?: string } } | undefined)?.bot?.username
                        ? `@${(acc.probe as { bot: { username: string } }).bot.username}`
                        : (acc.name as string) || String(acc.accountId)
                    }}
                  </div>
                  <div class="text-muted-foreground text-xs">
                    {{ acc.accountId }}
                  </div>
                  <ChannelStatusList :rows="telegramAccountRows(acc)" />
                  <UiAlert
                    v-if="typeof acc.lastError === 'string' && acc.lastError"
                    variant="destructive"
                    class="text-xs"
                  >
                    {{ acc.lastError }}
                  </UiAlert>
                </div>
              </template>
              <template v-else>
                <ChannelStatusList :rows="genericRows('telegram', snapshot?.channels?.telegram)" />
              </template>
              <UiAlert
                v-if="typeof snapshot?.channels?.telegram?.lastError === 'string' && snapshot.channels.telegram.lastError"
                variant="destructive"
                class="text-sm"
              >
                {{ snapshot.channels.telegram.lastError }}
              </UiAlert>
              <UiAlert
                v-if="probeSummary(snapshot?.channels?.telegram as Record<string, unknown>)"
                variant="default"
                class="text-sm"
              >
                {{ probeSummary(snapshot?.channels?.telegram as Record<string, unknown>) }}
              </UiAlert>
              <UiButton size="sm" variant="outline" :disabled="loading" @click="load(true)">
                {{ t('openclaw.channelProbe') }}
              </UiButton>

              <div class="mt-4 space-y-3 border-t pt-4">
                <div class="text-sm font-medium">
                  {{ t('openclaw.channelConfigSection') }}
                </div>
                <textarea
                  class="bg-background border-input focus-visible:ring-ring min-h-[140px] w-full rounded-md border px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2"
                  :value="channelDrafts[key] ?? '{}'"
                  spellcheck="false"
                  @input="onChannelDraftInput(key, ($event.target as HTMLTextAreaElement).value)"
                />
                <div class="flex flex-wrap gap-2">
                  <UiButton
                    size="sm"
                    :disabled="configSaving || !channelDirty[key]"
                    @click="channelConfigSave(key)"
                  >
                    {{ configSaving ? t('openclaw.channelSaving') : t('openclaw.channelSave') }}
                  </UiButton>
                  <UiButton
                    size="sm"
                    variant="outline"
                    :disabled="configSaving"
                    @click="channelConfigReload(key)"
                  >
                    {{ t('openclaw.channelReload') }}
                  </UiButton>
                </div>
              </div>
            </UiCardContent>
          </UiCard>

          <!-- 其余通道 -->
          <UiCard v-else class="shadow-sm">
            <UiCardHeader>
              <UiCardTitle>{{ channelTitle(key) }}</UiCardTitle>
              <UiCardDescription>{{ channelSubtitle(key) }}</UiCardDescription>
              <UiCardDescription
                v-if="(snapshot?.channelAccounts?.[key]?.length ?? 0) > 1"
                class="text-foreground/80 font-medium"
              >
                {{
                  t('openclaw.channelAccountsCount', {
                    n: snapshot?.channelAccounts?.[key]?.length ?? 0,
                  })
                }}
              </UiCardDescription>
            </UiCardHeader>
            <UiCardContent class="space-y-4">
              <ChannelStatusList :rows="genericRows(key, snapshot?.channels?.[key])" />
              <UiAlert
                v-if="
                  snapshot?.channels?.[key]
                    && typeof snapshot.channels[key].lastError === 'string'
                    && snapshot.channels[key].lastError
                "
                variant="destructive"
                class="text-sm"
              >
                {{ String(snapshot.channels[key].lastError) }}
              </UiAlert>
              <UiAlert
                v-if="probeSummary(snapshot?.channels?.[key])"
                variant="default"
                class="text-sm"
              >
                {{ probeSummary(snapshot?.channels?.[key]) }}
              </UiAlert>
              <UiButton size="sm" variant="outline" :disabled="loading" @click="load(true)">
                {{ t('openclaw.channelProbe') }}
              </UiButton>

              <div class="mt-4 space-y-3 border-t pt-4">
                <div class="text-sm font-medium">
                  {{ t('openclaw.channelConfigSection') }}
                </div>
                <textarea
                  class="bg-background border-input focus-visible:ring-ring min-h-[140px] w-full rounded-md border px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2"
                  :value="channelDrafts[key] ?? '{}'"
                  spellcheck="false"
                  @input="onChannelDraftInput(key, ($event.target as HTMLTextAreaElement).value)"
                />
                <div class="flex flex-wrap gap-2">
                  <UiButton
                    size="sm"
                    :disabled="configSaving || !channelDirty[key]"
                    @click="channelConfigSave(key)"
                  >
                    {{ configSaving ? t('openclaw.channelSaving') : t('openclaw.channelSave') }}
                  </UiButton>
                  <UiButton
                    size="sm"
                    variant="outline"
                    :disabled="configSaving"
                    @click="channelConfigReload(key)"
                  >
                    {{ t('openclaw.channelReload') }}
                  </UiButton>
                </div>
              </div>
            </UiCardContent>
          </UiCard>
        </template>
      </div>

      <!-- Channel health：与 Control UI 一致 -->
      <UiCard class="shadow-sm">
        <UiCardHeader class="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
          <div>
            <UiCardTitle>{{ t('openclaw.channelHealthTitle') }}</UiCardTitle>
            <UiCardDescription>{{ t('openclaw.channelHealthSub') }}</UiCardDescription>
          </div>
          <span class="text-muted-foreground shrink-0 text-sm tabular-nums">
            {{ lastSuccessAt != null ? formatAgo(lastSuccessAt) : t('openclaw.channelNa') }}
          </span>
        </UiCardHeader>
        <UiCardContent>
          <pre
            class="bg-muted/50 max-h-[min(420px,50vh)] overflow-auto rounded-lg border p-4 font-mono text-xs leading-relaxed"
          >{{ snapshot ? JSON.stringify(snapshot, null, 2) : t('openclaw.channelNoSnapshot') }}</pre>
        </UiCardContent>
      </UiCard>
    </template>
  </div>
</template>
