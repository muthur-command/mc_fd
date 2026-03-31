<script setup lang="ts">
/**
 * 状态徽标：半透明背景 + 彩色圆点 + 文字，支持多颜色，供各页面/组件复用。
 * 风格参考：border-none、bg-{color}-600/10、text-{color}-600、左侧圆点、dark 模式适配。
 */
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type StatusBadgeColor =
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'blue'
  | 'gray'
  | 'violet'

const colorClasses: Record<
  StatusBadgeColor,
  { badge: string; dot: string }
> = {
  green: {
    badge:
      'border-none bg-green-600/10 text-green-600 focus-visible:outline-none focus-visible:ring-green-600/20 dark:bg-green-400/10 dark:text-green-400 dark:focus-visible:ring-green-400/40 [a&]:hover:bg-green-600/5 dark:[a&]:hover:bg-green-400/5',
    dot: 'bg-green-600 dark:bg-green-400',
  },
  yellow: {
    badge:
      'border-none bg-yellow-600/10 text-yellow-600 focus-visible:outline-none focus-visible:ring-yellow-600/20 dark:bg-yellow-400/10 dark:text-yellow-400 dark:focus-visible:ring-yellow-400/40 [a&]:hover:bg-yellow-600/5 dark:[a&]:hover:bg-yellow-400/5',
    dot: 'bg-yellow-600 dark:bg-yellow-400',
  },
  orange: {
    badge:
      'border-none bg-orange-600/10 text-orange-600 focus-visible:outline-none focus-visible:ring-orange-600/20 dark:bg-orange-400/10 dark:text-orange-400 dark:focus-visible:ring-orange-400/40 [a&]:hover:bg-orange-600/5 dark:[a&]:hover:bg-orange-400/5',
    dot: 'bg-orange-600 dark:bg-orange-400',
  },
  red: {
    badge:
      'border-none bg-red-600/10 text-red-600 focus-visible:outline-none focus-visible:ring-red-600/20 dark:bg-red-400/10 dark:text-red-400 dark:focus-visible:ring-red-400/40 [a&]:hover:bg-red-600/5 dark:[a&]:hover:bg-red-400/5',
    dot: 'bg-red-600 dark:bg-red-400',
  },
  blue: {
    badge:
      'border-none bg-blue-600/10 text-blue-600 focus-visible:outline-none focus-visible:ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-400 dark:focus-visible:ring-blue-400/40 [a&]:hover:bg-blue-600/5 dark:[a&]:hover:bg-blue-400/5',
    dot: 'bg-blue-600 dark:bg-blue-400',
  },
  gray: {
    badge:
      'border-none bg-gray-600/10 text-gray-600 focus-visible:outline-none focus-visible:ring-gray-600/20 dark:bg-gray-400/10 dark:text-gray-400 dark:focus-visible:ring-gray-400/40 [a&]:hover:bg-gray-600/5 dark:[a&]:hover:bg-gray-400/5',
    dot: 'bg-gray-600 dark:bg-gray-400',
  },
  violet: {
    badge:
      'border-none bg-violet-600/10 text-violet-600 focus-visible:outline-none focus-visible:ring-violet-600/20 dark:bg-violet-400/10 dark:text-violet-400 dark:focus-visible:ring-violet-400/40 [a&]:hover:bg-violet-600/5 dark:[a&]:hover:bg-violet-400/5',
    dot: 'bg-violet-600 dark:bg-violet-400',
  },
}

const props = withDefaults(
  defineProps<{
    /** 徽标颜色 */
    color?: StatusBadgeColor
    /** 是否显示左侧圆点 */
    showDot?: boolean
    /** 额外 class */
    class?: string
  }>(),
  {
    color: 'green',
    showDot: true,
  },
)
</script>

<template>
  <Badge
    :class="
      cn(
        colorClasses[props.color].badge,
        props.class,
      )
    "
  >
    <slot name="leading" />
    <span
      v-if="showDot"
      class="size-1.5 shrink-0 rounded-full"
      :class="colorClasses[props.color].dot"
      aria-hidden="true"
    />
    <slot />
  </Badge>
</template>
