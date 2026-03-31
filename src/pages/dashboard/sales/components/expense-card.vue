<script setup lang="ts">
import { ArrowDown } from 'lucide-vue-next'
</script>

<template>
  <UiCard>
    <UiCardHeader class="space-y-1">
      <UiCardDescription>Total Expense</UiCardDescription>
      <div class="font-display text-2xl lg:text-3xl">
        $15,010
      </div>
      <div class="flex items-center text-xs">
        <ArrowDown class="mr-1 size-3 text-red-500" />
        <span class="font-medium text-red-500">6.0%</span>
        <span class="ml-1 text-muted-foreground">Compare from last month</span>
      </div>
    </UiCardHeader>
  </UiCard>
</template>
