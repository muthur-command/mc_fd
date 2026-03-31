<script setup lang="ts">
import { VisAxis, VisLine, VisXYContainer } from '@unovis/vue'

import type { ChartConfig } from '@/components/ui/chart'

import { ChartContainer } from '@/components/ui/chart'

const chartData = [
  { average: 400, today: 240 },
  { average: 300, today: 139 },
  { average: 200, today: 400 },
  { average: 278, today: 390 },
  { average: 189, today: 480 },
  { average: 239, today: 380 },
  { average: 349, today: 400 },
]

const chartConfig: ChartConfig = {
  desktop: { label: 'Desktop', color: 'var(--chart-1)' },
  mobile: { label: 'Mobile', color: 'var(--chart-2)' },
}
</script>

<template>
  <UiCard class="h-full">
    <UiCardHeader class="flex items-start justify-between">
      <div class="space-y-1.5">
        <UiCardTitle>Exercise Minutes</UiCardTitle>
        <UiCardDescription>
          Your exercise minutes are ahead of where you normally are.
        </UiCardDescription>
      </div>
    </UiCardHeader>
    <UiCardContent>
      <ChartContainer :config="chartConfig" class="h-32 w-full lg:h-[250px]">
        <VisXYContainer :data="chartData" :margin="{ top: 5, right: 10, left: 10 }">
          <VisLine
            :x="(_d: { average: number; today: number }, i: number) => i"
            :y="[(d: { average: number; today: number }) => d.average, (d: { average: number; today: number }) => d.today]"
            :color="(_d: unknown, i: number) => (i === 0 ? 'var(--chart-1)' : 'var(--chart-2)')"
          />
          <VisAxis type="x" :tick-line="false" :grid-line="false" />
          <VisAxis type="y" :num-ticks="3" :tick-line="false" :grid-line="false" />
        </VisXYContainer>
      </ChartContainer>
    </UiCardContent>
  </UiCard>
</template>
