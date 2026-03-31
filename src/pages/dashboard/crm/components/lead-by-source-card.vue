<script setup lang="ts">
import { VisDonut, VisSingleContainer } from '@unovis/vue'
import { computed } from 'vue'

import type { ChartConfig } from '@/components/ui/chart'

import { ChartContainer } from '@/components/ui/chart'

const chartData = [
  { source: 'social', leads: 275, fill: 'var(--chart-1)' },
  { source: 'email', leads: 200, fill: 'var(--chart-2)' },
  { source: 'call', leads: 287, fill: 'var(--chart-3)' },
  { source: 'others', leads: 173, fill: 'var(--chart-4)' },
]

const chartConfig: ChartConfig = {
  social: { label: 'Social', color: 'var(--chart-1)' },
  email: { label: 'Email', color: 'var(--chart-2)' },
  call: { label: 'Call', color: 'var(--chart-3)' },
  others: { label: 'Others', color: 'var(--chart-4)' },
}

const totalVisitors = computed(() => chartData.reduce((acc, curr) => acc + curr.leads, 0))
</script>

<template>
  <UiCard class="flex flex-col">
    <UiCardHeader class="flex flex-row justify-between">
      <UiCardTitle>Leads by Source</UiCardTitle>
      <UiCardAction class="relative">
        <UiButton variant="outline" size="sm" class="absolute end-0 top-0">
          Export
        </UiButton>
      </UiCardAction>
    </UiCardHeader>
    <UiCardContent class="flex-1">
      <ChartContainer :config="chartConfig" class="mx-auto aspect-square max-h-[250px]">
        <VisSingleContainer :data="chartData">
          <VisDonut
            :value="(d: { leads: number }) => d.leads"
            :color="(d: { fill: string }) => d.fill"
            :central-label="String(totalVisitors)"
            central-sub-label="Leads"
          />
        </VisSingleContainer>
      </ChartContainer>
      <div class="flex justify-around">
        <div v-for="item in chartData" :key="item.source" class="flex flex-col">
          <div class="mb-1 flex items-center gap-2">
            <span
              class="block size-2 rounded-full"
              :style="{ backgroundColor: (chartConfig as Record<string, { color?: string }>)[item.source]?.color }"
            />
            <div class="text-xs uppercase tracking-wide">
              {{ (chartConfig as Record<string, { label?: string }>)[item.source]?.label }}
            </div>
          </div>
          <div class="ms-3.5 text-lg font-semibold">
            {{ item.leads }}
          </div>
        </div>
      </div>
    </UiCardContent>
  </UiCard>
</template>
