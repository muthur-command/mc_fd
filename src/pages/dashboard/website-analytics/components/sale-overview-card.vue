<script setup lang="ts">
import { TrendingUp } from 'lucide-vue-next'
</script>

<template>
  <UiCard class="h-full">
    <UiCardHeader>
      <UiCardDescription>Sales Overview</UiCardDescription>
      <div class="font-display mb-6 text-2xl lg:text-3xl">
        $42.5K
      </div>
      <UiCardAction>
        <TrendingUp class="size-4 text-green-600" />
      </UiCardAction>
    </UiCardHeader>
    <UiCardContent>
      <div class="grid grid-cols-2 gap-4 divide-x">
        <div class="flex items-center gap-3 text-sm">
          <UiBadge variant="secondary" class="w-12 border border-border">
            62.2%
          </UiBadge>
          <span>Orders</span>
        </div>
        <div class="flex items-center justify-end gap-3 text-sm">
          <UiBadge variant="secondary" class="w-12 border border-border">
            25.5%
          </UiBadge>
          <span>Visits</span>
        </div>
      </div>
      <div class="mt-4 flex overflow-hidden rounded-md">
        <span class="h-4 bg-orange-600" style="width: 70%" />
        <span class="h-4 bg-green-600" style="width: 30%" />
      </div>
    </UiCardContent>
  </UiCard>
</template>
