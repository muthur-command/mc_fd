<script setup lang="ts">
import { Briefcase } from 'lucide-vue-next'
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <UiCardDescription>Total Deals</UiCardDescription>
      <div class="flex flex-col gap-2">
        <h4 class="font-display text-2xl lg:text-3xl">
          1,02,890
        </h4>
        <div class="text-sm text-muted-foreground">
          <span class="text-red-600">-0.8%</span> from last month
        </div>
      </div>
      <UiCardAction>
        <div class="flex gap-4">
          <div class="flex size-12 items-center justify-center rounded-full border bg-muted">
            <Briefcase class="size-5" />
          </div>
        </div>
      </UiCardAction>
    </UiCardHeader>
  </UiCard>
</template>
