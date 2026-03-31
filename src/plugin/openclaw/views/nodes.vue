<script setup lang="ts">
/**
 * Nodes 页：与 openclaw Control UI nodes 完全一致（Exec approvals + Nodes 卡片）
 */
import { RefreshCw } from 'lucide-vue-next'
import { computed, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { RPC } from '@/plugin/openclaw/lib/rpc-methods'

const { t } = useI18n()
const gateway = inject<
  ReturnType<typeof import('@/plugin/openclaw/composables/use-openclaw-gateway').default>
>('openclaw-gateway')!

interface ExecApprovalsDefaults {
  security?: string
  ask?: string
  askFallback?: string
  autoAllowSkills?: boolean
}
interface ExecApprovalsFile {
  version?: number
  defaults?: ExecApprovalsDefaults
  agents?: Record<string, unknown>
}
interface ExecApprovalsSnapshot {
  path: string
  exists: boolean
  hash: string
  file: ExecApprovalsFile
}

type NodeRow = Record<string, unknown>

const nodes = ref<NodeRow[]>([])
const nodesLoading = ref(false)
const nodesError = ref<string | null>(null)

const execSnapshot = ref<ExecApprovalsSnapshot | null>(null)
const execForm = ref<ExecApprovalsFile | null>(null)
const execHash = ref<string>('')
const execLoading = ref(false)
const execSaving = ref(false)
const execDirty = ref(false)
const execError = ref<string | null>(null)
const execTarget = ref<'gateway' | 'node'>('gateway')
const execTargetNodeId = ref<string>('')

/** 支持 exec approvals 的节点（commands 含 system.execApprovals.get） */
const targetNodes = computed(() => {
  const list = nodes.value
  const out: Array<{ id: string, label: string }> = []
  for (const node of list) {
    const commands = Array.isArray(node.commands) ? node.commands : []
    const has
      = commands.some(c => String(c) === 'system.execApprovals.get')
        || commands.some(c => String(c) === 'system.execApprovals.set')
    if (!has)
      continue
    const nodeId = typeof node.nodeId === 'string' ? node.nodeId.trim() : ''
    if (!nodeId)
      continue
    const displayName
      = typeof node.displayName === 'string' && node.displayName.trim()
        ? node.displayName.trim()
        : nodeId
    out.push({
      id: nodeId,
      label: displayName === nodeId ? nodeId : `${displayName} · ${nodeId}`,
    })
  }
  out.sort((a, b) => a.label.localeCompare(b.label))
  return out
})

const execReady = computed(() => Boolean(execForm.value))
const execTargetReady = computed(
  () => execTarget.value !== 'node' || Boolean(execTargetNodeId.value?.trim()),
)

async function loadNodes() {
  if (!gateway?.connected)
    return
  nodesLoading.value = true
  nodesError.value = null
  try {
    const res = await gateway.request<{ nodes?: NodeRow[] }>(RPC.nodeList, {})
    nodes.value = Array.isArray(res?.nodes) ? res.nodes : []
  }
  catch (e) {
    nodesError.value = e instanceof Error ? e.message : String(e)
    nodes.value = []
  }
  finally {
    nodesLoading.value = false
  }
}

function getExecRpc():
  | { get: string, set: string, paramsGet: Record<string, unknown>, paramsSet: (p: Record<string, unknown>) => Record<string, unknown> }
  | null {
  if (execTarget.value === 'gateway') {
    return {
      get: RPC.execApprovalsGet,
      set: RPC.execApprovalsSet,
      paramsGet: {},
      paramsSet: p => p,
    }
  }
  const nodeId = (execTargetNodeId.value ?? '').trim()
  if (!nodeId)
    return null
  return {
    get: RPC.execApprovalsNodeGet,
    set: RPC.execApprovalsNodeSet,
    paramsGet: { nodeId },
    paramsSet: (p: Record<string, unknown>) => ({ ...p, nodeId }),
  }
}

async function loadExecApprovals() {
  if (!gateway?.connected || !execTargetReady.value)
    return
  const rpc = getExecRpc()
  if (!rpc)
    return
  execLoading.value = true
  execError.value = null
  try {
    const res = await gateway.request<ExecApprovalsSnapshot>(rpc.get, rpc.paramsGet)
    execSnapshot.value = res
    execHash.value = res?.hash ?? ''
    execForm.value = res?.file ? JSON.parse(JSON.stringify(res.file)) : null
    execDirty.value = false
  }
  catch (e) {
    execError.value = e instanceof Error ? e.message : String(e)
    execSnapshot.value = null
    execForm.value = null
  }
  finally {
    execLoading.value = false
  }
}

async function saveExecApprovals() {
  if (!gateway?.connected || !execDirty.value || !execForm.value)
    return
  const rpc = getExecRpc()
  if (!rpc)
    return
  execSaving.value = true
  execError.value = null
  try {
    await gateway.request(rpc.set, rpc.paramsSet({ file: execForm.value, baseHash: execHash.value } as Record<string, unknown>))
    await loadExecApprovals()
  }
  catch (e) {
    execError.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    execSaving.value = false
  }
}

function execPatch(path: (string | number)[], value: unknown) {
  let cur: Record<string, unknown> = execForm.value ?? {}
  if (!execForm.value) {
    execForm.value = { defaults: {} }
    cur = execForm.value
  }
  for (let i = 0; i < path.length - 1; i++) {
    const key = String(path[i])
    const next = (cur[key] as Record<string, unknown>) ?? {}
    cur[key] = next
    cur = next as Record<string, unknown>
  }
  cur[String(path[path.length - 1])] = value
  execDirty.value = true
}

const execDefaults = computed(() => execForm.value?.defaults ?? {})
const execSecurity = computed({
  get: () => (execDefaults.value.security as string) || 'deny',
  set: (v: string) => execPatch(['defaults', 'security'], v),
})
const execAsk = computed({
  get: () => (execDefaults.value.ask as string) || 'on-miss',
  set: (v: string) => execPatch(['defaults', 'ask'], v),
})
const execAskFallback = computed({
  get: () => (execDefaults.value.askFallback as string) || 'deny',
  set: (v: string) => execPatch(['defaults', 'askFallback'], v),
})
const execAutoAllowSkills = computed({
  get: () => Boolean(execDefaults.value.autoAllowSkills),
  set: (v: boolean) => execPatch(['defaults', 'autoAllowSkills'], v),
})

watch(
  () => gateway?.connected,
  (c) => {
    if (c)
      void loadNodes()
  },
  { immediate: true },
)
</script>

<template>
  <div class="min-h-0 flex-1 overflow-visible pt-1 pl-1 pr-1 pb-1">
    <!-- Exec approvals 卡片（与 openclaw 一致） -->
    <section class="nodes-exec-card card rounded-xl border border-border bg-card p-4 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div class="card-title text-base font-semibold">
            {{ t('openclaw.nodesExecApprovalsTitle') }}
          </div>
          <div class="card-sub text-muted-foreground mt-1 text-sm">
            {{ t('openclaw.nodesExecApprovalsSubtitle') }}
          </div>
        </div>
        <UiButton
          variant="outline"
          size="sm"
          :disabled="!execDirty || execSaving || !execTargetReady"
          @click="saveExecApprovals()"
        >
          {{ execSaving ? t('openclaw.nodesSaving') : t('openclaw.nodesSave') }}
        </UiButton>
      </div>

      <!-- Target row -->
      <div class="mt-4 rounded-lg border border-border">
        <div class="flex flex-wrap items-start justify-between gap-4 px-3 py-3">
          <div>
            <div class="font-medium text-sm">
              {{ t('openclaw.nodesTargetTitle') }}
            </div>
            <div class="text-muted-foreground mt-0.5 text-xs">
              {{ t('openclaw.nodesTargetSubtitle') }}
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-muted-foreground text-xs">{{ t('openclaw.nodesHostLabel') }}</label>
              <UiSelect v-model="execTarget" :disabled="execLoading || execSaving">
                <UiSelectTrigger class="h-8 w-[120px]">
                  <UiSelectValue />
                </UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem value="gateway">
                    {{ t('openclaw.nodesHostGateway') }}
                  </UiSelectItem>
                  <UiSelectItem value="node">
                    {{ t('openclaw.nodesHostNode') }}
                  </UiSelectItem>
                </UiSelectContent>
              </UiSelect>
            </div>
            <div v-if="execTarget === 'node'" class="flex flex-col gap-1">
              <label class="text-muted-foreground text-xs">{{ t('openclaw.nodeId') }}</label>
              <UiSelect
                v-model="execTargetNodeId"
                :disabled="execLoading || execSaving || targetNodes.length === 0"
              >
                <UiSelectTrigger class="h-8 min-w-[160px]">
                  <UiSelectValue :placeholder="t('openclaw.nodesSelectNode')" />
                </UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem
                    v-for="n in targetNodes"
                    :key="n.id"
                    :value="n.id"
                  >
                    {{ n.label }}
                  </UiSelectItem>
                </UiSelectContent>
              </UiSelect>
            </div>
          </div>
        </div>
        <p
          v-if="execTarget === 'node' && targetNodes.length === 0"
          class="text-muted-foreground px-3 pb-2 text-xs"
        >
          {{ t('openclaw.nodesNoNodesApprovals') }}
        </p>
      </div>

      <UiAlert v-if="execError" variant="destructive" class="mt-3 text-sm">
        {{ execError }}
      </UiAlert>

      <template v-if="!execReady">
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <p class="text-muted-foreground text-sm">
            {{ t('openclaw.nodesLoadExecApprovalsHint') }}
          </p>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="execLoading || !execTargetReady"
            @click="loadExecApprovals()"
          >
            {{ execLoading ? t('common.loading') : t('openclaw.nodesLoadApprovals') }}
          </UiButton>
        </div>
      </template>
      <template v-else>
        <!-- Defaults policy -->
        <div class="mt-4 space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-muted-foreground text-xs">{{ t('openclaw.nodesScopeLabel') }}</span>
            <UiBadge variant="secondary">
              {{ t('openclaw.nodesScopeDefaults') }}
            </UiBadge>
          </div>
          <div class="flex flex-wrap gap-4 rounded-lg border border-border p-3">
            <div class="flex flex-col gap-1">
              <label class="text-muted-foreground text-xs">{{ t('openclaw.nodesSecurityLabel') }}</label>
              <UiSelect v-model="execSecurity" :disabled="execSaving">
                <UiSelectTrigger class="h-8 w-[140px]">
                  <UiSelectValue />
                </UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem value="deny">
                    Deny
                  </UiSelectItem>
                  <UiSelectItem value="allowlist">
                    Allowlist
                  </UiSelectItem>
                  <UiSelectItem value="full">
                    Full
                  </UiSelectItem>
                </UiSelectContent>
              </UiSelect>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-muted-foreground text-xs">{{ t('openclaw.nodesAskLabel') }}</label>
              <UiSelect v-model="execAsk" :disabled="execSaving">
                <UiSelectTrigger class="h-8 w-[140px]">
                  <UiSelectValue />
                </UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem value="off">
                    Off
                  </UiSelectItem>
                  <UiSelectItem value="on-miss">
                    On miss
                  </UiSelectItem>
                  <UiSelectItem value="always">
                    Always
                  </UiSelectItem>
                </UiSelectContent>
              </UiSelect>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-muted-foreground text-xs">{{ t('openclaw.nodesAskFallbackLabel') }}</label>
              <UiSelect v-model="execAskFallback" :disabled="execSaving">
                <UiSelectTrigger class="h-8 w-[140px]">
                  <UiSelectValue />
                </UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem value="deny">
                    Deny
                  </UiSelectItem>
                  <UiSelectItem value="allowlist">
                    Allowlist
                  </UiSelectItem>
                  <UiSelectItem value="full">
                    Full
                  </UiSelectItem>
                </UiSelectContent>
              </UiSelect>
            </div>
            <div class="flex flex-col items-start gap-1">
              <label class="text-muted-foreground text-xs">{{ t('openclaw.nodesAutoAllowSkillsLabel') }}</label>
              <UiCheckbox
                :checked="execAutoAllowSkills"
                :disabled="execSaving"
                @update:checked="(v: boolean | 'indeterminate') => execAutoAllowSkills = !!v"
              />
            </div>
          </div>
        </div>
      </template>
    </section>

    <!-- Nodes 卡片 -->
    <section class="nodes-list-card card mt-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div class="card-title text-base font-semibold">
            {{ t('openclaw.nodesTitle') }}
          </div>
          <div class="card-sub text-muted-foreground mt-1 text-sm">
            {{ t('openclaw.nodesSubtitle') }}
          </div>
        </div>
        <UiButton
          variant="outline"
          size="sm"
          :disabled="nodesLoading || !gateway?.connected"
          @click="loadNodes()"
        >
          <RefreshCw class="mr-1 size-3.5" :class="{ 'animate-spin': nodesLoading }" />
          {{ nodesLoading ? t('common.loading') : t('openclaw.nodesRefresh') }}
        </UiButton>
      </div>

      <UiAlert v-if="nodesError" variant="destructive" class="mt-3 text-sm">
        {{ nodesError }}
      </UiAlert>

      <p v-else-if="nodes.length === 0" class="text-muted-foreground mt-4 text-sm">
        {{ t('openclaw.nodesNoNodes') }}
      </p>
      <div v-else class="nodes-list mt-4 divide-y divide-border rounded-lg border border-border">
        <div
          v-for="(node, i) in nodes"
          :key="(node.nodeId as string) ?? i"
          class="flex flex-wrap items-start justify-between gap-4 px-3 py-3"
        >
          <div class="min-w-0 flex-1">
            <div class="font-medium text-sm">
              {{ (node.displayName as string)?.trim() || (node.nodeId as string) || '—' }}
            </div>
            <div class="text-muted-foreground mono mt-0.5 text-xs">
              {{ node.nodeId ?? '' }}
              {{ node.remoteIp ? ` · ${node.remoteIp}` : '' }}
              {{ node.version ? ` · ${node.version}` : '' }}
            </div>
            <div class="mt-1.5 flex flex-wrap gap-1.5">
              <UiBadge variant="secondary" class="text-xs">
                {{ node.paired ? t('openclaw.nodesPaired') : t('openclaw.nodesUnpaired') }}
              </UiBadge>
              <UiBadge :variant="node.connected ? 'default' : 'outline'" class="text-xs">
                {{ node.connected ? t('openclaw.nodesConnected') : t('openclaw.nodesOffline') }}
              </UiBadge>
              <UiBadge
                v-for="cap in (Array.isArray(node.caps) ? node.caps : []).slice(0, 8)"
                :key="String(cap)"
                variant="outline"
                class="text-xs"
              >
                {{ cap }}
              </UiBadge>
              <UiBadge
                v-for="cmd in (Array.isArray(node.commands) ? node.commands : []).slice(0, 6)"
                :key="String(cmd)"
                variant="outline"
                class="text-xs"
              >
                {{ cmd }}
              </UiBadge>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
