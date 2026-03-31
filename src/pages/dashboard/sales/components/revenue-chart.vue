<script setup lang="ts">
import { VisAxis, VisLine, VisXYContainer } from '@unovis/vue'
import { computed, ref } from 'vue'

import type { ChartConfig } from '@/components/ui/chart'

import { ChartContainer } from '@/components/ui/chart'

const chartConfig: ChartConfig = {
  views: { label: 'Page Views' },
  desktop: { label: 'Desktop', color: 'var(--chart-2)' },
  mobile: { label: 'Mobile', color: 'var(--chart-1)' },
}

type ChartKey = 'desktop' | 'mobile'
const activeChart = ref<ChartKey>('desktop')

const chartData = [
  { date: '2024-04-01', desktop: 222, mobile: 150 },
  { date: '2024-04-02', desktop: 97, mobile: 180 },
  { date: '2024-04-03', desktop: 167, mobile: 120 },
  { date: '2024-04-04', desktop: 242, mobile: 260 },
  { date: '2024-04-05', desktop: 373, mobile: 290 },
  { date: '2024-04-06', desktop: 301, mobile: 340 },
  { date: '2024-04-07', desktop: 245, mobile: 180 },
  { date: '2024-04-08', desktop: 409, mobile: 320 },
  { date: '2024-04-09', desktop: 59, mobile: 110 },
  { date: '2024-04-10', desktop: 261, mobile: 190 },
  { date: '2024-04-11', desktop: 327, mobile: 350 },
  { date: '2024-04-12', desktop: 292, mobile: 210 },
  { date: '2024-04-13', desktop: 342, mobile: 380 },
  { date: '2024-04-14', desktop: 137, mobile: 220 },
  { date: '2024-04-15', desktop: 120, mobile: 170 },
  { date: '2024-04-16', desktop: 138, mobile: 190 },
  { date: '2024-04-17', desktop: 446, mobile: 360 },
  { date: '2024-04-18', desktop: 364, mobile: 410 },
  { date: '2024-04-19', desktop: 243, mobile: 180 },
  { date: '2024-04-20', desktop: 89, mobile: 150 },
  { date: '2024-04-21', desktop: 137, mobile: 200 },
  { date: '2024-04-22', desktop: 224, mobile: 170 },
  { date: '2024-04-23', desktop: 138, mobile: 230 },
  { date: '2024-04-24', desktop: 387, mobile: 290 },
  { date: '2024-04-25', desktop: 215, mobile: 250 },
  { date: '2024-04-26', desktop: 75, mobile: 130 },
  { date: '2024-04-27', desktop: 383, mobile: 420 },
  { date: '2024-04-28', desktop: 122, mobile: 180 },
  { date: '2024-04-29', desktop: 315, mobile: 240 },
  { date: '2024-04-30', desktop: 454, mobile: 380 },
  { date: '2024-05-01', desktop: 165, mobile: 220 },
  { date: '2024-05-02', desktop: 293, mobile: 310 },
  { date: '2024-05-03', desktop: 247, mobile: 190 },
  { date: '2024-05-04', desktop: 385, mobile: 420 },
  { date: '2024-05-05', desktop: 481, mobile: 390 },
  { date: '2024-05-06', desktop: 498, mobile: 520 },
  { date: '2024-05-07', desktop: 388, mobile: 300 },
  { date: '2024-05-08', desktop: 149, mobile: 210 },
  { date: '2024-05-09', desktop: 227, mobile: 180 },
  { date: '2024-05-10', desktop: 293, mobile: 330 },
  { date: '2024-05-11', desktop: 335, mobile: 270 },
  { date: '2024-05-12', desktop: 197, mobile: 240 },
  { date: '2024-05-13', desktop: 197, mobile: 160 },
  { date: '2024-05-14', desktop: 448, mobile: 490 },
  { date: '2024-05-15', desktop: 473, mobile: 380 },
  { date: '2024-05-16', desktop: 338, mobile: 400 },
  { date: '2024-05-17', desktop: 499, mobile: 420 },
  { date: '2024-05-18', desktop: 315, mobile: 350 },
  { date: '2024-05-19', desktop: 235, mobile: 180 },
  { date: '2024-05-20', desktop: 177, mobile: 230 },
  { date: '2024-05-21', desktop: 82, mobile: 140 },
]

const total = computed(() => ({
  desktop: chartData.reduce((acc, curr) => acc + curr.desktop, 0),
  mobile: chartData.reduce((acc, curr) => acc + curr.mobile, 0),
}))
</script>

<template>
  <UiCard class="relative h-full overflow-hidden">
    <UiCardHeader>
      <UiCardTitle>Revenue Chart</UiCardTitle>
      <UiCardDescription>Last 28 days</UiCardDescription>
      <UiCardAction class="col-start-auto row-start-auto justify-self-start md:col-start-2 md:row-start-1 md:justify-self-end">
        <div class="end-0 top-0 flex divide-x rounded-md border border-e border-b border-t border-s md:absolute md:rounded-none md:rounded-bl-md md:border-e-transparent md:border-t-transparent">
          <button
            v-for="key in (['desktop', 'mobile'] as const)"
            :key="key"
            type="button"
            :data-active="activeChart === key"
            class="relative flex flex-1 flex-col justify-center gap-1 px-6 py-4 text-left data-[active=true]:bg-muted"
            @click="activeChart = key"
          >
            <span class="text-xs text-muted-foreground">{{ chartConfig[key].label }}</span>
            <span class="font-display text-lg leading-none sm:text-2xl">{{ total[key].toLocaleString() }}</span>
          </button>
        </div>
      </UiCardAction>
    </UiCardHeader>
    <UiCardContent>
      <ChartContainer :config="chartConfig" class="h-[186px] w-full">
        <VisXYContainer :data="chartData" :margin="{ left: 8, right: 8 }">
          <VisLine
            :x="(_d: typeof chartData[0], i: number) => i"
            :y="(d: typeof chartData[0]) => d[activeChart]"
            :color="chartConfig[activeChart]?.color ?? 'var(--chart-1)'"
          />
          <VisAxis type="x" :tick-line="false" :grid-line="false" :num-ticks="6" />
          <VisAxis type="y" :num-ticks="3" :tick-line="false" :grid-line="false" />
        </VisXYContainer>
      </ChartContainer>
    </UiCardContent>
  </UiCard>
</template>
