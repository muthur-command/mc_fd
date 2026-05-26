<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  open: boolean
  alignEnd?: boolean
  ariaLabel?: string
  listId: string
}>()

const emit = defineEmits<{
  toggle: []
  close: []
}>()

const wrapClass = computed(() => ({
  'lang-select-wrap': true,
  'lang-select-wrap--end': props.alignEnd,
}))
</script>

<template>
  <div :class="wrapClass" @click.stop>
    <button
      type="button"
      class="lang-select"
      :aria-label="ariaLabel"
      aria-haspopup="listbox"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="listId"
      @click="emit('toggle')"
    >
      <span>{{ label }}</span>
    </button>
    <div
      :id="listId"
      class="lang-dropdown"
      :class="{ 'is-open': open }"
      role="listbox"
    >
      <slot />
    </div>
  </div>
</template>
