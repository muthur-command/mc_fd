<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'

const countries = [
  { code: 'US', name: 'United states', change: '+27.4%', positive: true, amount: '+$1,999.00' },
  { code: 'BR', name: 'Brazil', change: '+20.1%', positive: true, amount: '+$39.00' },
  { code: 'IN', name: 'India', change: '-5%', positive: false, amount: '+$299.00' },
  { code: 'AU', name: 'Australia', change: '+10.9%', positive: true, amount: '+$99.00' },
  { code: 'FR', name: 'France', change: '+2.1%', positive: true, amount: '+$39.00' },
  { code: 'GR', name: 'Greece', change: '-0.1%', positive: false, amount: '+$30.00' },
]
</script>

<template>
  <UiCard class="h-full">
    <UiCardHeader>
      <UiCardTitle>Sales by Countries</UiCardTitle>
      <UiCardDescription>Last 28 days</UiCardDescription>
      <UiCardAction class="relative">
        <UiButton variant="outline" size="sm" class="absolute end-0 top-0">
          View All <ChevronRight class="size-4" />
        </UiButton>
      </UiCardAction>
    </UiCardHeader>
    <UiCardContent>
      <div class="space-y-5">
        <div v-for="c in countries" :key="c.code" class="flex items-center">
          <div class="flex size-10 items-center justify-center rounded-full border bg-muted text-xs font-medium">
            {{ c.code }}
          </div>
          <div class="ml-4 space-y-1">
            <p class="text-sm font-medium leading-none">
              {{ c.name }}
            </p>
            <p class="text-sm text-muted-foreground">
              <span :class="c.positive ? 'text-green-600' : 'text-red-600'">{{ c.change }}</span> from last month
            </p>
          </div>
          <div class="ms-auto font-medium">
            {{ c.amount }}
          </div>
        </div>
      </div>
    </UiCardContent>
  </UiCard>
</template>
