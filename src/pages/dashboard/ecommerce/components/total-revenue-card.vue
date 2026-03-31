<script setup lang="ts">
import { VisAxis, VisLine, VisXYContainer } from '@unovis/vue'

import type { ChartConfig } from '@/components/ui/chart'

import { ChartContainer } from '@/components/ui/chart'

const chartConfig: ChartConfig = {
  desktop: { label: 'Desktop', color: 'var(--chart-1)' },
  mobile: { label: 'Mobile', color: 'var(--chart-2)' },
}

const chartData = [
  { month: 'January', desktop: 190, mobile: 180 },
  { month: 'February', desktop: 250, mobile: 200 },
  { month: 'March', desktop: 240, mobile: 120 },
  { month: 'April', desktop: 120, mobile: 190 },
  { month: 'May', desktop: 110, mobile: 130 },
  { month: 'June', desktop: 250, mobile: 140 },
]
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <UiCardTitle>Total Revenue</UiCardTitle>
          <UiCardDescription>Income in the last 28 days</UiCardDescription>
        </div>
        <div class="flex gap-8 rounded-lg border p-4">
          <div class="flex flex-1 flex-col justify-center gap-2 text-left">
            <span class="text-xs text-muted-foreground">Desktop</span>
            <span class="font-display text-lg leading-none sm:text-2xl">24,828</span>
          </div>
          <div class="flex flex-1 flex-col justify-center gap-2 text-left">
            <span class="text-xs text-muted-foreground">Mobile</span>
            <span class="font-display text-lg leading-none sm:text-2xl">25,010</span>
          </div>
        </div>
      </div>
    </UiCardHeader>
    <UiCardContent>
      <div class="lg:mt-10">
        <ChartContainer :config="chartConfig" class="!aspect-21/9 w-full">
          <VisXYContainer :data="chartData" :margin="{ left: -6, right: -6 }">
            <VisLine
              :x="(_d: typeof chartData[0], i: number) => i"
              :y="[(d: typeof chartData[0]) => d.desktop, (d: typeof chartData[0]) => d.mobile]"
              :color="(_: unknown, i: number) => (i === 0 ? 'var(--chart-1)' : 'var(--chart-2)')"
            />
            <VisAxis type="x" :tick-line="false" :grid-line="false" :num-ticks="6" />
            <VisAxis type="y" :num-ticks="3" :tick-line="false" :grid-line="false" />
          </VisXYContainer>
        </ChartContainer>
      </div>
    </UiCardContent>
  </UiCard>
</template>
