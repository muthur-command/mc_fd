<script setup lang="ts">
import { VisArea, VisAxis, VisXYContainer } from '@unovis/vue'
import { TrendingDown } from 'lucide-vue-next'

import { ChartContainer } from '@/components/ui/chart'

const chartData = [{ month: 'Jan', mobile: 80 }, { month: 'Feb', mobile: 200 }, { month: 'Mar', mobile: 120 }, { month: 'Apr', mobile: 190 }, { month: 'May', mobile: 130 }, { month: 'Jun', mobile: 240 }]
const chartConfig = { mobile: { label: 'Mobile', color: 'var(--chart-2)' } }
</script>

<template>
  <UiCard class="h-full overflow-hidden pb-0">
    <UiCardHeader>
      <UiCardDescription>Average Daily Sales</UiCardDescription>
      <div class="font-display mb-4 text-2xl lg:text-3xl">
        $28,450
      </div>
      <UiCardAction><TrendingDown class="size-4 text-red-600" /></UiCardAction>
    </UiCardHeader>
    <ChartContainer :config="chartConfig" class="aspect-auto h-[100px] w-full">
      <VisXYContainer :data="chartData" :margin="{ top: 5, left: 0, right: 0 }">
        <VisArea :x="(_d: any, i: number) => i" :y="(d: any) => d.mobile" color="var(--chart-2)" />
        <VisAxis type="x" :tick-line="false" :grid-line="false" :num-ticks="6" />
        <VisAxis type="y" :num-ticks="3" :tick-line="false" :grid-line="false" />
      </VisXYContainer>
    </ChartContainer>
  </UiCard>
</template>
