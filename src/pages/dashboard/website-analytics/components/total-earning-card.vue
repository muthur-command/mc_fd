<script setup lang="ts">
import { VisAxis, VisLine, VisXYContainer } from '@unovis/vue'
import { ChevronUp, DollarSign, HandCoins } from 'lucide-vue-next'

import type { ChartConfig } from '@/components/ui/chart'

import { ChartContainer } from '@/components/ui/chart'

const chartData = [
  { month: 'January', desktop: 186, mobile: 80 },
  { month: 'February', desktop: 305, mobile: 200 },
  { month: 'March', desktop: 237, mobile: 120 },
  { month: 'April', desktop: 73, mobile: 190 },
  { month: 'May', desktop: 209, mobile: 130 },
  { month: 'June', desktop: 214, mobile: 140 },
]

const chartConfig: ChartConfig = {
  desktop: { label: 'Revenue', color: 'var(--chart-1)' },
  mobile: { label: 'Sales', color: 'var(--chart-2)' },
}
</script>

<template>
  <UiCard class="h-full">
    <UiCardHeader>
      <UiCardDescription>Total Earning</UiCardDescription>
      <UiCardAction>
        <UiBadge variant="outline" class="text-green-600">
          <ChevronUp class="size-4" />
          24.2%
        </UiBadge>
      </UiCardAction>
      <div class="flex items-center gap-4">
        <div class="font-display text-2xl lg:text-3xl">
          83%
        </div>
      </div>
    </UiCardHeader>
    <UiCardContent>
      <ChartContainer class="!aspect-21/9 w-full" :config="chartConfig">
        <VisXYContainer :data="chartData" :margin="{ left: 8, right: 8 }">
          <VisLine
            :x="(_d: typeof chartData[0], i: number) => i"
            :y="[(d: typeof chartData[0]) => d.desktop, (d: typeof chartData[0]) => d.mobile]"
            :color="(_: unknown, i: number) => (i === 0 ? 'var(--chart-1)' : 'var(--chart-2)')"
          />
          <VisAxis type="x" :tick-line="false" :grid-line="false" :num-ticks="6" />
          <VisAxis type="y" :num-ticks="3" :tick-line="false" :grid-line="false" />
        </VisXYContainer>
      </ChartContainer>
      <div class="mt-5 space-y-4">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-md border bg-muted">
            <HandCoins class="size-4" />
          </div>
          <div>
            <div class="font-medium">
              Total Revenue
            </div>
            <div class="text-xs text-muted-foreground">
              Client Payment
            </div>
          </div>
          <div class="ms-auto text-sm text-green-600">
            +$126
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-md border bg-muted">
            <DollarSign class="size-4" />
          </div>
          <div>
            <div class="font-medium">
              Total Sales
            </div>
            <div class="text-xs text-muted-foreground">
              Refund
            </div>
          </div>
          <div class="ms-auto text-sm text-red-600">
            -$98
          </div>
        </div>
      </div>
    </UiCardContent>
  </UiCard>
</template>
