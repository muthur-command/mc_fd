<script setup lang="ts">
import { VisDonut, VisSingleContainer } from '@unovis/vue'

import type { ChartConfig } from '@/components/ui/chart'

import { ChartContainer } from '@/components/ui/chart'

const chartConfig: ChartConfig = {
  visitors: { label: 'Visitors' },
  done: { label: 'Done', color: 'var(--primary)' },
  rest: { label: 'Rest', color: 'var(--muted)' },
}

// 48% done, 52% rest for ring display
const chartData = [
  { name: 'done', value: 48, fill: 'var(--primary)' },
  { name: 'rest', value: 52, fill: 'var(--muted)' },
]
</script>

<template>
  <UiCard class="gap-2">
    <UiCardHeader>
      <UiCardTitle class="font-display text-xl">
        Your target is incomplete
      </UiCardTitle>
    </UiCardHeader>
    <UiCardContent>
      <div class="flex items-center gap-2">
        <div>
          <ChartContainer :config="chartConfig" class="mx-auto aspect-square h-[60px] w-[60px]">
            <VisSingleContainer :data="chartData">
              <VisDonut
                :value="(d: { value: number }) => d.value"
                :color="(d: { fill: string }) => d.fill"
                central-label="48%"
              />
            </VisSingleContainer>
          </ChartContainer>
        </div>
        <p class="text-sm text-muted-foreground">
          You have completed <span class="text-orange-500">48%</span> of the given target, you can also check your status
        </p>
      </div>
    </UiCardContent>
  </UiCard>
</template>
