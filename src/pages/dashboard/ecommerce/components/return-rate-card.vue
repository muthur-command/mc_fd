<script setup lang="ts">
import { VisAxis, VisLine, VisXYContainer } from '@unovis/vue'

import type { ChartConfig } from '@/components/ui/chart'

import { ChartContainer } from '@/components/ui/chart'

const chartConfig: ChartConfig = {
  desktop: { label: 'Desktop', color: 'var(--chart-1)' },
  mobile: { label: 'Mobile', color: 'var(--chart-2)' },
}

const chartData = [
  { month: 'Jan', desktop: 186, mobile: 80 },
  { month: 'Feb', desktop: 305, mobile: 200 },
  { month: 'Mar', desktop: 237, mobile: 120 },
  { month: 'Apr', desktop: 473, mobile: 190 },
  { month: 'May', desktop: 409, mobile: 130 },
  { month: 'Jun', desktop: 514, mobile: 140 },
  { month: 'Jul', desktop: 237, mobile: 120 },
  { month: 'Aug', desktop: 473, mobile: 190 },
  { month: 'Sep', desktop: 409, mobile: 130 },
  { month: 'Oct', desktop: 514, mobile: 300 },
  { month: 'Nov', desktop: 390, mobile: 240 },
  { month: 'Dec', desktop: 700, mobile: 460 },
]
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <UiCardDescription class="relative">
        Returning Rate
      </UiCardDescription>
      <div class="flex items-center gap-2">
        <div class="font-display text-2xl">
          $42,379
        </div>
        <UiBadge variant="outline" class="text-green-600">
          +2.5%
        </UiBadge>
      </div>
    </UiCardHeader>
    <UiCardContent>
      <ChartContainer :config="chartConfig" class="mt-0 w-full md:mt-6" :style="{ aspectRatio: '21/9' }">
        <VisXYContainer :data="chartData" :margin="{ left: 12, right: 12 }">
          <VisLine
            :x="(_d: typeof chartData[0], i: number) => i"
            :y="[(d: typeof chartData[0]) => d.desktop, (d: typeof chartData[0]) => d.mobile]"
            :color="(_: unknown, i: number) => (i === 0 ? 'var(--chart-1)' : 'var(--chart-2)')"
          />
          <VisAxis type="x" :tick-line="false" :grid-line="false" :num-ticks="12" />
          <VisAxis type="y" :num-ticks="3" :tick-line="false" :grid-line="false" />
        </VisXYContainer>
      </ChartContainer>
    </UiCardContent>
  </UiCard>
</template>
