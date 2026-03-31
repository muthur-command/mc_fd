<script setup lang="ts">
/**
 * 基于 wave-charts/avatar-gen 的本地头像生成组件（图层 SVG 组合，支持 seed 确定性）
 * 资源来自 public/avatar-gen/resource/
 */
import { createAvatar } from '@/lib/avatar-gen/createAvatar'

const props = withDefaults(
  defineProps<{
    name?: string
    size?: number
    /** 为 true 时使用 Math.random() 真随机（如 Add/Edit User 对话框），每次点击随机得到不同头像；提交时以图片保存 */
    useTrueRandom?: boolean
    /** @deprecated avatar-gen 无 variant，保留仅为兼容 */
    variant?: string
    /** @deprecated avatar-gen 使用配置色板，保留仅为兼容 */
    colors?: string[]
  }>(),
  {
    name: 'default',
    size: 40,
    useTrueRandom: false,
  },
)

const svgContent = ref('')
const loading = ref(true)
const error = ref(false)
const rootRef = ref<HTMLDivElement | null>(null)

/** 内部 seed，用于可复现模式；真随机模式下仅 getSeed 可能用到（表单不存 seed 则忽略） */
const seed = ref(props.name ?? 'default')
/** 真随机模式下每次点击随机自增，触发重新生成 */
const refreshKey = ref(0)
watch(
  () => props.name,
  (name) => {
    seed.value = name ?? 'default'
  },
  { immediate: true },
)

function generate() {
  error.value = false
  svgContent.value = ''
  try {
    const svg = createAvatar({
      seed: seed.value,
      size: props.size ?? 40,
      useTrueRandom: props.useTrueRandom,
    })
    svgContent.value = svg
  }
  catch (e) {
    error.value = true
    console.warn('[AvatarGenerated] createAvatar failed:', e)
  }
  finally {
    loading.value = false
  }
}

watch(
  () => [props.size, props.useTrueRandom ? refreshKey.value : seed.value] as const,
  () => {
    loading.value = true
    generate()
  },
  { immediate: true },
)

/** 随机换一个头像：真随机模式只重新生成；可复现模式换 seed 再生成 */
function randomize() {
  if (props.useTrueRandom) {
    refreshKey.value++
  }
  else {
    seed.value = `${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
  }
}

/** 当前内部 seed（可复现模式保存到后端用；真随机模式提交用图片，可不关心） */
function getSeed(): string {
  return seed.value
}

/** 供表单提交时序列化 SVG 为 base64 使用 */
function getSvgElement(): SVGElement | null {
  return rootRef.value?.querySelector('svg') ?? null
}

defineExpose({ getSvgElement, randomize, getSeed })
</script>

<template>
  <div
    ref="rootRef"
    class="block shrink-0 rounded-full overflow-hidden bg-muted flex items-center justify-center"
    :style="{ width: `${size}px`, height: `${size}px`, minWidth: `${size}px`, minHeight: `${size}px` }"
  >
    <template v-if="loading">
      <span class="text-muted-foreground text-xs" aria-hidden="true">…</span>
    </template>
    <template v-else-if="error">
      <span class="text-muted-foreground text-xs" aria-hidden="true">?</span>
    </template>
    <div v-else-if="svgContent" class="size-full flex items-center justify-center [&>svg]:size-full [&>svg]:block [&>svg]:shrink-0" v-html="svgContent" />
  </div>
</template>
