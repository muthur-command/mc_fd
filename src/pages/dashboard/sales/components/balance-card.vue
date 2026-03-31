<script setup lang="ts">
import { ArrowUp } from 'lucide-vue-next'
</script>

<template>
  <UiCard>
    <UiCardHeader class="space-y-1">
      <UiCardDescription>Total Balance</UiCardDescription>
      <div class="font-display text-2xl lg:text-3xl">
        $103,045
      </div>
      <div class="flex items-center text-xs">
        <ArrowUp class="mr-1 size-3 text-green-500" />
        <span class="font-medium text-green-500">3.6%</span>
        <span class="ml-1 text-muted-foreground">Compare from last month</span>
      </div>
    </UiCardHeader>
  </UiCard>
</template>
