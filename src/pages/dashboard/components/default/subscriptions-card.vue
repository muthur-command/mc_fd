<script setup lang="ts">
import { VisAxis, VisLine, VisXYContainer } from '@unovis/vue'

import type { ChartConfig } from '@/components/ui/chart'

import { ChartContainer } from '@/components/ui/chart'

const chartData = [
  { revenue: 10400, subscription: 240 },
  { revenue: 14405, subscription: 300 },
  { revenue: 9400, subscription: 200 },
  { revenue: 8200, subscription: 278 },
  { revenue: 7000, subscription: 189 },
  { revenue: 9600, subscription: 239 },
  { revenue: 11244, subscription: 278 },
  { revenue: 26475, subscription: 189 },
]

const chartConfig: ChartConfig = {
  desktop: { label: 'Subscription', color: 'var(--primary)' },
}
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <UiCardTitle>Subscriptions</UiCardTitle>
    </UiCardHeader>
    <UiCardContent>
      <div class="font-display text-3xl leading-6">
        +4850
      </div>
      <p class="mt-1.5 text-xs text-muted-foreground">
        <span class="text-green-500">+180.1%</span> from last month
      </p>
      <ChartContainer :config="chartConfig" class="mt-6 h-[100px] w-full">
        <VisXYContainer :data="chartData" :margin="{ top: 22, right: 0, left: 0 }">
          <VisLine
            :x="(_d: { revenue: number; subscription: number }, i: number) => i"
            :y="(d: { revenue: number; subscription: number }) => d.subscription"
            :color="chartConfig.desktop?.color ?? 'var(--primary)'"
          />
          <VisAxis type="x" :tick-line="false" :grid-line="false" :num-ticks="0" />
          <VisAxis type="y" :num-ticks="3" :tick-line="false" :grid-line="false" />
        </VisXYContainer>
      </ChartContainer>
    </UiCardContent>
  </UiCard>
</template>
