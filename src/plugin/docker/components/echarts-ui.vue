<script setup lang="ts">
defineProps<{
  height?: string
}>()

const chartRef = ref<HTMLElement | null>(null)
defineExpose({ chartRef })
</script>

<template>
  <div ref="chartRef" :style="{ height: height ?? '200px', width: '100%' }" />
</template>
