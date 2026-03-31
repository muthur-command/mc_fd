<script setup lang="ts">
import { ArrowUp } from 'lucide-vue-next'
</script>

<template>
  <UiCard>
    <UiCardHeader class="space-y-1">
      <UiCardDescription>Total Sales Tax</UiCardDescription>
      <div class="font-display text-2xl lg:text-3xl">
        $9,090
      </div>
      <div class="flex items-center text-xs">
        <ArrowUp class="mr-1 size-3 text-green-500" />
        <span class="font-medium text-green-500">5.0%</span>
        <span class="ml-1 text-muted-foreground">Compare from last month</span>
      </div>
    </UiCardHeader>
  </UiCard>
</template>
