<script setup lang="ts">
import { VisAxis, VisLine, VisXYContainer } from '@unovis/vue'

import type { ChartConfig } from '@/components/ui/chart'

import { ChartContainer } from '@/components/ui/chart'

const chartData = [
  { browser: 'chrome', visitors: 100 },
  { browser: 'safari', visitors: 200 },
  { browser: 'firefox', visitors: 150 },
  { browser: 'edge', visitors: 250 },
  { browser: 'other', visitors: 110 },
]

const chartConfig: ChartConfig = {
  visitors: { label: 'Revenue', color: 'var(--chart-1)' },
}
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <UiCardTitle>Total Revenue</UiCardTitle>
    </UiCardHeader>
    <UiCardContent>
      <div class="font-display text-3xl leading-6">
        $15,231.89
      </div>
      <p class="mt-1.5 text-xs text-muted-foreground">
        <span class="text-green-600">+20.1%</span> from last month
      </p>
      <ChartContainer :config="chartConfig" class="mt-4 h-[100px] w-full">
        <VisXYContainer :data="chartData" :margin="{ top: 8, right: 8, left: 8 }">
          <VisLine
            :x="(_d: { browser: string; visitors: number }, i: number) => i"
            :y="(d: { browser: string; visitors: number }) => d.visitors"
            :color="chartConfig.visitors?.color ?? 'var(--chart-1)'"
          />
          <VisAxis type="x" :tick-line="false" :grid-line="false" :num-ticks="5" />
          <VisAxis type="y" :num-ticks="3" :tick-line="false" :grid-line="false" />
        </VisXYContainer>
      </ChartContainer>
    </UiCardContent>
  </UiCard>
</template>
