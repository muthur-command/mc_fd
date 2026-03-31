<script setup lang="ts">
/**
 * 与 openclaw Control UI .status-list 一致：纵向列表，每行 label | value
 */
defineProps<{
  rows: Array<{ label: string, value: string }>
}>()
</script>

<template>
  <ul
    class="divide-border m-0 list-none divide-y rounded-lg border border-border p-0 text-sm"
    role="list"
  >
    <li
      v-for="row in rows"
      :key="row.label"
      class="flex items-start justify-between gap-4 px-3 py-2.5"
    >
      <span class="text-muted-foreground shrink-0">{{ row.label }}</span>
      <span class="max-w-[58%] break-words text-end font-medium tabular-nums">{{ row.value }}</span>
    </li>
  </ul>
</template>
