<script setup lang="ts">
import { VisAxis, VisLine, VisXYContainer } from '@unovis/vue'

import type { ChartConfig } from '@/components/ui/chart'

import { ChartContainer } from '@/components/ui/chart'

const chartConfig: ChartConfig = {
  desktop: { label: 'Desktop', color: 'var(--chart-3)' },
  mobile: { label: 'Mobile', color: 'var(--chart-4)' },
}

const chartData = [
  { month: 'January', desktop: 100, mobile: 80 },
  { month: 'February', desktop: 150, mobile: 200 },
  { month: 'March', desktop: 300, mobile: 120 },
  { month: 'April', desktop: 120, mobile: 190 },
  { month: 'May', desktop: 80, mobile: 130 },
  { month: 'June', desktop: 150, mobile: 140 },
]
</script>

<template>
  <UiCard class="md:col-span-6 xl:col-span-3">
    <UiCardHeader class="flex flex-row items-center justify-between">
      <UiCardTitle>Sales</UiCardTitle>
      <UiCardDescription class="text-xs">
        <span class="text-red-500">-1.7%</span> from last month
      </UiCardDescription>
    </UiCardHeader>
    <UiCardContent>
      <div class="font-display text-3xl">
        20K
      </div>
      <div class="pt-4">
        <ChartContainer :config="chartConfig" class="h-[60px] w-full">
          <VisXYContainer :data="chartData" :margin="{ left: 12, right: 12, top: 6 }">
            <VisLine
              :x="(_d: typeof chartData[0], i: number) => i"
              :y="(d: typeof chartData[0]) => d.desktop"
              :color="chartConfig.desktop?.color ?? 'var(--chart-3)'"
            />
            <VisAxis type="x" :tick-line="false" :grid-line="false" :num-ticks="0" />
            <VisAxis type="y" :num-ticks="2" :tick-line="false" :grid-line="false" />
          </VisXYContainer>
        </ChartContainer>
      </div>
    </UiCardContent>
  </UiCard>
</template>
