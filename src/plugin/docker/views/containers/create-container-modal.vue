<script setup lang="ts">
import { ChevronDown, ChevronUp, HelpCircle, Plus, Trash2 } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import type {
  CreateContainerParam,
  ImageListResponse,
} from '@/plugin/docker/api'

import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  getImageListApi,
  getNetworkListApi,
} from '@/plugin/docker/api'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'confirm': [values: CreateContainerParam]
  'update:open': [value: boolean]
}>()

const { t } = useI18n()

const basicOpen = ref(true)
const portOpen = ref(true)
const autoRemoveOpen = ref(true)
const advancedOpen = ref(false)

const formData = ref<
  {
    autoRemove: boolean
    commandMode: 'default' | 'override'
    commandOverride: string
    consoleType: 'interactive' | 'interactive-tty'
    entrypointMode: 'default' | 'override'
    entrypointOverride: string
    envVars: Array<{ id: number, key: string, value: string }>
    labels: Array<{ id: number, key: string, value: string }>
    networkMode: string
    portMappings: Array<{
      containerPort: string
      hostIp: string
      hostPort: string
      id: number
    }>
    publishAllPorts: boolean
    restartPolicy: string
    user: string
    volumeMappings: Array<{
      containerPath: string
      hostPath: string
      id: number
      readOnly: boolean
    }>
    workingDir: string
  } & CreateContainerParam
>({
  image: '',
  name: '',
  publishAllPorts: false,
  portMappings: [],
  autoRemove: false,
  commandMode: 'default',
  entrypointMode: 'default',
  commandOverride: '',
  entrypointOverride: '',
  workingDir: '',
  consoleType: 'interactive-tty',
  user: '',
  volumeMappings: [],
  networkMode: 'bridge',
  envVars: [],
  labels: [],
  restartPolicy: 'no',
  tty: true,
  stdin_open: true,
})

const networkList = ref<Array<{ driver: string, name: string }>>([])
const imageList = ref<ImageListResponse[]>([])
const imageLoading = ref(false)

async function loadNetworks() {
  try {
    const result = await getNetworkListApi()
    networkList.value = result || []
  }
  catch (error) {
    console.error('Load networks failed:', error)
  }
}

async function loadImages() {
  imageLoading.value = true
  try {
    const result = await getImageListApi(false)
    imageList.value = result || []
  }
  catch (error) {
    console.error('Load images failed:', error)
    toast.error(t('docker.containers.create.loadImagesFailed'))
  }
  finally {
    imageLoading.value = false
  }
}

const imageOptions = computed(() => {
  const options: Array<{ label: string, value: string }> = []
  imageList.value.forEach((image) => {
    if (image.tags?.length) {
      image.tags.forEach((tag) => {
        if (tag && !tag.includes('<none>')) {
          options.push({ label: tag, value: tag })
        }
      })
    }
    else {
      options.push({ label: `${image.id} (no tag)`, value: image.id })
    }
  })
  return [...new Map(options.map(opt => [opt.value, opt])).values()].sort(
    (a, b) => a.label.localeCompare(b.label),
  )
})

let portMappingIdCounter = 0
let volumeMappingIdCounter = 0
let envVarIdCounter = 0
let labelIdCounter = 0

function addPortMapping() {
  formData.value.portMappings.push({
    id: portMappingIdCounter++,
    containerPort: '',
    hostPort: '',
    hostIp: '0.0.0.0',
  })
}

function removePortMapping(id: number) {
  const index = formData.value.portMappings.findIndex(p => p.id === id)
  if (index !== -1)
    formData.value.portMappings.splice(index, 1)
}

function addVolumeMapping() {
  formData.value.volumeMappings.push({
    id: volumeMappingIdCounter++,
    hostPath: '',
    containerPath: '',
    readOnly: false,
  })
}

function removeVolumeMapping(id: number) {
  const index = formData.value.volumeMappings.findIndex(v => v.id === id)
  if (index !== -1)
    formData.value.volumeMappings.splice(index, 1)
}

function addEnvVar() {
  formData.value.envVars.push({ id: envVarIdCounter++, key: '', value: '' })
}

function removeEnvVar(id: number) {
  const index = formData.value.envVars.findIndex(e => e.id === id)
  if (index !== -1)
    formData.value.envVars.splice(index, 1)
}

function addLabel() {
  formData.value.labels.push({ id: labelIdCounter++, key: '', value: '' })
}

function removeLabel(id: number) {
  const index = formData.value.labels.findIndex(l => l.id === id)
  if (index !== -1)
    formData.value.labels.splice(index, 1)
}

const networkOptions = computed(() => [
  { label: 'bridge', value: 'bridge' },
  { label: 'host', value: 'host' },
  { label: 'none', value: 'none' },
  ...networkList.value.map(n => ({ label: n.name, value: n.name })),
])

const restartPolicyOptions = [
  { label: 'No', value: 'no' },
  { label: 'Always', value: 'always' },
  { label: 'On Failure', value: 'on-failure' },
  { label: 'Unless Stopped', value: 'unless-stopped' },
]

function buildParams(): CreateContainerParam {
  const params: CreateContainerParam = {
    image: formData.value.image.trim(),
    name: formData.value.name?.trim() || undefined,
    auto_remove: formData.value.autoRemove,
    tty: formData.value.consoleType === 'interactive-tty',
    stdin_open:
      formData.value.consoleType === 'interactive'
      || formData.value.consoleType === 'interactive-tty',
    restart_policy: formData.value.restartPolicy,
  }

  if (
    formData.value.commandMode === 'override'
    && formData.value.commandOverride?.trim()
  ) {
    params.command = formData.value.commandOverride
      .trim()
      .split(/\s+/)
      .filter(Boolean)
  }
  if (
    formData.value.entrypointMode === 'override'
    && formData.value.entrypointOverride?.trim()
  ) {
    params.entrypoint = formData.value.entrypointOverride
      .trim()
      .split(/\s+/)
      .filter(Boolean)
  }
  if (formData.value.workingDir?.trim()) {
    params.working_dir = formData.value.workingDir.trim()
  }
  if (formData.value.user?.trim()) {
    params.user = formData.value.user.trim()
  }
  if (formData.value.publishAllPorts) {
    params.publish_all_ports = true
  }
  else if (formData.value.portMappings.length > 0) {
    const ports: Record<string, [number, number]> = {}
    for (const mapping of formData.value.portMappings) {
      if (mapping.containerPort && mapping.hostPort) {
        const cp = Number.parseInt(mapping.containerPort)
        const hp = Number.parseInt(mapping.hostPort)
        if (!Number.isNaN(cp) && !Number.isNaN(hp)) {
          ports[String(cp)] = [hp, hp]
        }
      }
    }
    if (Object.keys(ports).length > 0)
      params.ports = ports
  }
  if (formData.value.volumeMappings.length > 0) {
    const volumes: Record<string, Record<string, string>> = {}
    for (const mapping of formData.value.volumeMappings) {
      if (mapping.hostPath && mapping.containerPath) {
        volumes[mapping.hostPath] = {
          bind: mapping.containerPath,
          mode: mapping.readOnly ? 'ro' : 'rw',
        }
      }
    }
    if (Object.keys(volumes).length > 0)
      params.volumes = volumes
  }
  if (formData.value.networkMode && formData.value.networkMode !== 'bridge') {
    params.networks = [formData.value.networkMode]
  }
  if (formData.value.envVars.length > 0) {
    const env: Record<string, string> = {}
    for (const envVar of formData.value.envVars) {
      if (envVar.key?.trim()) {
        env[envVar.key.trim()] = envVar.value?.trim() || ''
      }
    }
    if (Object.keys(env).length > 0)
      params.env = env
  }
  if (formData.value.labels.length > 0) {
    const labels: Record<string, string> = {}
    for (const label of formData.value.labels) {
      if (label.key?.trim()) {
        labels[label.key.trim()] = label.value?.trim() || ''
      }
    }
    if (Object.keys(labels).length > 0)
      params.labels = labels
  }
  return params
}

function resetForm() {
  formData.value = {
    image: '',
    name: '',
    publishAllPorts: false,
    portMappings: [],
    autoRemove: false,
    commandMode: 'default',
    entrypointMode: 'default',
    commandOverride: '',
    entrypointOverride: '',
    workingDir: '',
    consoleType: 'interactive-tty',
    user: '',
    volumeMappings: [],
    networkMode: 'bridge',
    envVars: [],
    labels: [],
    restartPolicy: 'no',
    tty: true,
    stdin_open: true,
  }
  portMappingIdCounter = 0
  volumeMappingIdCounter = 0
  envVarIdCounter = 0
  labelIdCounter = 0
}

const canDeploy = computed(() => !!formData.value.image?.trim())

const submitting = ref(false)

async function handleSubmit() {
  if (!formData.value.image?.trim()) {
    toast.warning(t('docker.containers.create.imageRequired'))
    return
  }
  submitting.value = true
  try {
    const params = buildParams()
    emit('confirm', params)
    // Parent closes modal on success after createContainerApi resolves
  }
  catch (error) {
    console.error('Submit failed:', error)
  }
  finally {
    submitting.value = false
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      loadNetworks()
      loadImages()
    }
    else {
      resetForm()
    }
  },
)

onMounted(() => {
  if (props.open) {
    loadNetworks()
    loadImages()
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="max-w-2xl max-h-[85vh] flex flex-col gap-4 p-6"
      :show-close-button="true"
    >
      <DialogHeader class="gap-1.5 text-left">
        <DialogTitle>{{ t('docker.containers.create.title') }}</DialogTitle>
        <DialogDescription>
          {{ t('docker.containers.create.basicConfig') }} · {{ t('docker.containers.create.portConfig') }}
        </DialogDescription>
      </DialogHeader>

      <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden gap-6">
        <!-- Basic -->
        <Collapsible v-model:open="basicOpen" class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-muted-foreground text-sm font-medium">
              {{ t('docker.containers.create.basicConfig') }}
            </h3>
            <CollapsibleTrigger as-child>
              <Button variant="ghost" size="sm" class="h-7 gap-1 -mr-2">
                <ChevronDown v-if="!basicOpen" class="size-4" />
                <ChevronUp v-else class="size-4" />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent class="space-y-4">
            <div class="space-y-2">
              <Label for="create-name">{{ t('docker.containers.create.name') }}</Label>
              <Input
                id="create-name"
                v-model="formData.name"
                :placeholder="t('docker.containers.create.namePlaceholder')"
                class="w-full"
              />
            </div>
            <div class="space-y-2">
              <Label for="create-image">{{ t('docker.containers.create.image') }} *</Label>
              <Select v-model="formData.image" :disabled="imageLoading">
                <SelectTrigger id="create-image" class="w-full">
                  <SelectValue :placeholder="t('docker.containers.create.imagePlaceholder')" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="opt in imageOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p v-if="!formData.image" class="text-muted-foreground text-xs">
                {{ t('docker.containers.create.imageRequired') }}
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <!-- Port -->
        <Collapsible v-model:open="portOpen" class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-muted-foreground text-sm font-medium">
              {{ t('docker.containers.create.portConfig') }}
            </h3>
            <CollapsibleTrigger as-child>
              <Button variant="ghost" size="sm" class="h-7 gap-1 -mr-2">
                <ChevronDown v-if="!portOpen" class="size-4" />
                <ChevronUp v-else class="size-4" />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent class="space-y-4">
            <div class="flex items-center gap-2">
              <Switch v-model:checked="formData.publishAllPorts" />
              <span class="text-sm">{{ t('docker.containers.create.publishAllPorts') }}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <span class="inline-flex text-muted-foreground"><HelpCircle class="size-4" /></span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {{ t('docker.containers.create.publishAllPortsTooltip') }}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <template v-if="!formData.publishAllPorts">
              <div
                v-for="mapping in formData.portMappings"
                :key="mapping.id"
                class="flex flex-wrap items-center gap-2"
              >
                <Input
                  v-model="mapping.containerPort"
                  :placeholder="t('docker.containers.create.containerPort')"
                  class="w-24"
                />
                <span class="text-muted-foreground">:</span>
                <Input
                  v-model="mapping.hostPort"
                  :placeholder="t('docker.containers.create.hostPort')"
                  class="w-24"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                  @click="removePortMapping(mapping.id)"
                >
                  <Trash2 class="size-4" />
                </Button>
              </div>
              <Button type="button" variant="outline" size="sm" class="gap-1" @click="addPortMapping">
                <Plus class="size-4" />
                {{ t('docker.containers.create.mapAdditionalPort') }}
              </Button>
            </template>
          </CollapsibleContent>
        </Collapsible>

        <!-- Auto remove -->
        <Collapsible v-model:open="autoRemoveOpen" class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-muted-foreground text-sm font-medium">
              {{ t('docker.containers.create.autoRemove') }}
            </h3>
            <CollapsibleTrigger as-child>
              <Button variant="ghost" size="sm" class="h-7 gap-1 -mr-2">
                <ChevronDown v-if="!autoRemoveOpen" class="size-4" />
                <ChevronUp v-else class="size-4" />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent class="space-y-4">
            <div class="flex items-center gap-2">
              <Switch v-model:checked="formData.autoRemove" />
              <span class="text-sm">{{ t('docker.containers.create.autoRemoveLabel') }}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <span class="inline-flex text-muted-foreground"><HelpCircle class="size-4" /></span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {{ t('docker.containers.create.autoRemoveTooltip') }}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <!-- Advanced -->
        <Collapsible v-model:open="advancedOpen" class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-muted-foreground text-sm font-medium">
              {{ t('docker.containers.create.advancedSettings') }}
            </h3>
            <CollapsibleTrigger as-child>
              <Button variant="ghost" size="sm" class="h-7 gap-1 -mr-2">
                <ChevronDown v-if="!advancedOpen" class="size-4" />
                <ChevronUp v-else class="size-4" />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <Tabs default-value="commands" class="w-full">
              <TabsList class="flex h-auto min-h-9 w-full flex-wrap items-center gap-1.5 rounded-lg p-1.5">
                <TabsTrigger value="commands" class="basis-auto grow-0 shrink-0 whitespace-nowrap px-2 py-1.5">
                  {{ t('docker.containers.create.commandsLogging') }}
                </TabsTrigger>
                <TabsTrigger value="volumes" class="basis-auto grow-0 shrink-0 whitespace-nowrap px-2 py-1.5">
                  {{ t('docker.containers.create.volumes') }}
                </TabsTrigger>
                <TabsTrigger value="network" class="basis-auto grow-0 shrink-0 whitespace-nowrap px-2 py-1.5">
                  {{ t('docker.containers.create.network') }}
                </TabsTrigger>
                <TabsTrigger value="env" class="basis-auto grow-0 shrink-0 whitespace-nowrap px-2 py-1.5">
                  {{ t('docker.containers.create.env') }}
                </TabsTrigger>
                <TabsTrigger value="labels" class="basis-auto grow-0 shrink-0 whitespace-nowrap px-2 py-1.5">
                  {{ t('docker.containers.create.labels') }}
                </TabsTrigger>
                <TabsTrigger value="restart" class="basis-auto grow-0 shrink-0 whitespace-nowrap px-2 py-1.5">
                  {{ t('docker.containers.create.restartPolicy') }}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="commands" class="space-y-4 pt-3">
                <div class="space-y-2">
                  <Label>{{ t('docker.containers.create.command') }}</Label>
                  <RadioGroup v-model="formData.commandMode" class="flex gap-4">
                    <div class="flex items-center gap-2">
                      <RadioGroupItem id="cmd-default" value="default" />
                      <Label for="cmd-default" class="font-normal">{{ t('docker.containers.create.default') }}</Label>
                    </div>
                    <div class="flex items-center gap-2">
                      <RadioGroupItem id="cmd-override" value="override" />
                      <Label for="cmd-override" class="font-normal">{{ t('docker.containers.create.override') }}</Label>
                    </div>
                  </RadioGroup>
                  <Input
                    v-if="formData.commandMode === 'override'"
                    v-model="formData.commandOverride"
                    :placeholder="t('docker.containers.create.commandPlaceholder')"
                    class="w-full"
                  />
                </div>
                <div class="space-y-2">
                  <Label>{{ t('docker.containers.create.entrypoint') }}</Label>
                  <RadioGroup v-model="formData.entrypointMode" class="flex gap-4">
                    <div class="flex items-center gap-2">
                      <RadioGroupItem id="ep-default" value="default" />
                      <Label for="ep-default" class="font-normal">{{ t('docker.containers.create.default') }}</Label>
                    </div>
                    <div class="flex items-center gap-2">
                      <RadioGroupItem id="ep-override" value="override" />
                      <Label for="ep-override" class="font-normal">{{ t('docker.containers.create.override') }}</Label>
                    </div>
                  </RadioGroup>
                  <Input
                    v-if="formData.entrypointMode === 'override'"
                    v-model="formData.entrypointOverride"
                    :placeholder="t('docker.containers.create.entrypointPlaceholder')"
                    class="w-full"
                  />
                </div>
                <div class="space-y-2">
                  <Label for="create-workingDir">{{ t('docker.containers.create.workingDir') }}</Label>
                  <Input
                    id="create-workingDir"
                    v-model="formData.workingDir"
                    :placeholder="t('docker.containers.create.workingDirPlaceholder')"
                    class="w-full"
                  />
                </div>
                <div class="space-y-2">
                  <Label>{{ t('docker.containers.create.console') }}</Label>
                  <RadioGroup v-model="formData.consoleType" class="flex gap-4">
                    <div class="flex items-center gap-2">
                      <RadioGroupItem id="con-tty" value="interactive-tty" />
                      <Label for="con-tty" class="font-normal">{{ t('docker.containers.create.interactiveTty') }}</Label>
                    </div>
                    <div class="flex items-center gap-2">
                      <RadioGroupItem id="con-i" value="interactive" />
                      <Label for="con-i" class="font-normal">{{ t('docker.containers.create.interactive') }}</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div class="space-y-2">
                  <Label for="create-user">{{ t('docker.containers.create.user') }}</Label>
                  <Input
                    id="create-user"
                    v-model="formData.user"
                    :placeholder="t('docker.containers.create.userPlaceholder')"
                    class="w-full"
                  />
                </div>
              </TabsContent>
              <TabsContent value="volumes" class="space-y-4 pt-3">
                <div
                  v-for="mapping in formData.volumeMappings"
                  :key="mapping.id"
                  class="flex flex-wrap items-center gap-2"
                >
                  <Input
                    v-model="mapping.hostPath"
                    :placeholder="t('docker.containers.create.hostPath')"
                    class="min-w-0 flex-1"
                  />
                  <span class="text-muted-foreground">:</span>
                  <Input
                    v-model="mapping.containerPath"
                    :placeholder="t('docker.containers.create.containerPath')"
                    class="min-w-0 flex-1"
                  />
                  <div class="flex items-center gap-2 shrink-0">
                    <Switch v-model:checked="mapping.readOnly" />
                    <span class="text-muted-foreground text-xs">{{ t('docker.containers.create.readOnly') }}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8 text-destructive hover:text-destructive"
                    @click="removeVolumeMapping(mapping.id)"
                  >
                    <Trash2 class="size-4" />
                  </Button>
                </div>
                <Button type="button" variant="outline" size="sm" class="gap-1" @click="addVolumeMapping">
                  <Plus class="size-4" />
                  {{ t('docker.containers.create.addVolume') }}
                </Button>
              </TabsContent>
              <TabsContent value="network" class="space-y-4 pt-3">
                <div class="space-y-2">
                  <Label for="create-network">{{ t('docker.containers.create.networkMode') }}</Label>
                  <Select v-model="formData.networkMode">
                    <SelectTrigger id="create-network" class="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="opt in networkOptions"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
              <TabsContent value="env" class="space-y-4 pt-3">
                <div
                  v-for="envVar in formData.envVars"
                  :key="envVar.id"
                  class="flex flex-wrap items-center gap-2"
                >
                  <Input
                    v-model="envVar.key"
                    :placeholder="t('docker.containers.create.envKey')"
                    class="w-40"
                  />
                  <span class="text-muted-foreground">=</span>
                  <Input
                    v-model="envVar.value"
                    :placeholder="t('docker.containers.create.envValue')"
                    class="min-w-0 flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8 text-destructive hover:text-destructive"
                    @click="removeEnvVar(envVar.id)"
                  >
                    <Trash2 class="size-4" />
                  </Button>
                </div>
                <Button type="button" variant="outline" size="sm" class="gap-1" @click="addEnvVar">
                  <Plus class="size-4" />
                  {{ t('docker.containers.create.addEnvVar') }}
                </Button>
              </TabsContent>
              <TabsContent value="labels" class="space-y-4 pt-3">
                <div
                  v-for="label in formData.labels"
                  :key="label.id"
                  class="flex flex-wrap items-center gap-2"
                >
                  <Input
                    v-model="label.key"
                    :placeholder="t('docker.containers.create.labelKey')"
                    class="w-40"
                  />
                  <span class="text-muted-foreground">=</span>
                  <Input
                    v-model="label.value"
                    :placeholder="t('docker.containers.create.labelValue')"
                    class="min-w-0 flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8 text-destructive hover:text-destructive"
                    @click="removeLabel(label.id)"
                  >
                    <Trash2 class="size-4" />
                  </Button>
                </div>
                <Button type="button" variant="outline" size="sm" class="gap-1" @click="addLabel">
                  <Plus class="size-4" />
                  {{ t('docker.containers.create.addLabel') }}
                </Button>
              </TabsContent>
              <TabsContent value="restart" class="space-y-4 pt-3">
                <div class="space-y-2">
                  <Label for="create-restart">{{ t('docker.containers.create.restartPolicy') }}</Label>
                  <Select v-model="formData.restartPolicy">
                    <SelectTrigger id="create-restart" class="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="opt in restartPolicyOptions"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <DialogFooter class="flex shrink-0 flex-row items-center justify-end gap-2 py-0 sm:justify-end">
        <DialogClose as-child>
          <Button variant="outline">
            {{ t('user.modal.cancel') }}
          </Button>
        </DialogClose>
        <Button :disabled="!canDeploy || submitting" @click="handleSubmit">
          {{ submitting ? t('user.modal.submitting') : t('docker.containers.create.deploy') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
