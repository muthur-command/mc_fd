<script setup lang="ts">
import { VisAxis, VisLine, VisXYContainer } from '@unovis/vue'
import { AreaChart, DollarSign, HandCoins } from 'lucide-vue-next'

import type { ChartConfig } from '@/components/ui/chart'

import { ChartContainer } from '@/components/ui/chart'

const chartData = [
  { day: 'Mo', sales: 35 },
  { day: 'Thu', sales: 30 },
  { day: 'We', sales: 37 },
  { day: 'Th', sales: 14 },
  { day: 'Fr', sales: 20 },
  { day: 'Sa', sales: 24 },
  { day: 'Su', sales: 38 },
]
const chartConfig: ChartConfig = { desktop: { label: 'Sales', color: 'var(--chart-1)' } }
</script>

<template>
  <UiCard class="h-full">
    <UiCardHeader>
      <UiCardTitle>Earning Reports</UiCardTitle>
      <UiCardDescription>Last 28 days</UiCardDescription>
      <UiCardAction class="relative">
        <UiButton variant="outline" size="sm" class="absolute end-0 top-0">
          Export
        </UiButton>
      </UiCardAction>
    </UiCardHeader>
    <UiCardContent>
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <div class="font-display text-2xl lg:text-3xl">
              $1.468
            </div>
            <UiBadge class="bg-green-600">
              +4.2%
            </UiBadge>
          </div>
          <ChartContainer :config="chartConfig" class="max-h-[245px] w-full">
            <VisXYContainer :data="chartData" :margin="{ left: 8, right: 8 }">
              <VisLine :x="(_d: any, i: number) => i" :y="(d: any) => d.sales" color="var(--chart-1)" />
              <VisAxis type="x" :tick-line="false" :grid-line="false" :num-ticks="7" />
              <VisAxis type="y" :num-ticks="3" :tick-line="false" :grid-line="false" />
            </VisXYContainer>
          </ChartContainer>
        </div>
        <div class="flex flex-col space-y-4">
          <div class="flex flex-col gap-4 rounded-md border border-border bg-muted p-4">
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <div class="flex size-8 items-center justify-center rounded-md border border-border bg-background">
                  <DollarSign class="size-4" />
                </div>
                <span>Earnings</span>
              </div>
              <div class="font-semibold">
                $545.69
              </div>
            </div>
            <UiProgress :model-value="70" class="h-1 [&_[data-slot=progress-indicator]]:bg-black dark:[&_[data-slot=progress-indicator]]:bg-white/90" />
          </div>
          <div class="flex flex-col gap-4 rounded-md border border-border bg-muted p-4">
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <div class="flex size-8 items-center justify-center rounded-md border border-border bg-background">
                  <AreaChart class="size-4" />
                </div>
                <span>Profit</span>
              </div>
              <div class="font-semibold">
                $256.34
              </div>
            </div>
            <UiProgress :model-value="45" class="h-1 [&_[data-slot=progress-indicator]]:bg-black dark:[&_[data-slot=progress-indicator]]:bg-white/90" />
          </div>
          <div class="flex flex-col gap-4 rounded-md border border-border bg-muted p-4">
            <div class="flex items-center justify-between gap-4">
              <div class="flex size-8 items-center justify-center rounded-md border border-border bg-background">
                <HandCoins class="size-4" />
              </div>
              <span>Expense</span>
              <div class="font-semibold">
                $74.19
              </div>
            </div>
            <UiProgress :model-value="80" class="h-1 [&_[data-slot=progress-indicator]]:bg-black dark:[&_[data-slot=progress-indicator]]:bg-white/90" />
          </div>
        </div>
      </div>
    </UiCardContent>
  </UiCard>
</template>
