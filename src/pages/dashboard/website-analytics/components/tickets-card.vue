<script setup lang="ts">
import { VisDonut, VisSingleContainer } from '@unovis/vue'
import { Clock, MessageCircleReply, Ticket } from 'lucide-vue-next'

import type { ChartConfig } from '@/components/ui/chart'

import { ChartContainer } from '@/components/ui/chart'

const chartData = [
  { browser: 'new', tickets: 40, fill: 'var(--chart-1)' },
  { browser: 'open', tickets: 25, fill: 'var(--chart-2)' },
]
const chartConfig: ChartConfig = {
  new: { label: 'New Tickets', color: 'var(--chart-1)' },
  open: { label: 'Open Tickets', color: 'var(--chart-2)' },
}
</script>

<template>
  <UiCard class="h-full">
    <UiCardContent>
      <ChartContainer :config="chartConfig" class="mx-auto aspect-square max-h-[270px]">
        <VisSingleContainer :data="chartData">
          <VisDonut :value="(d: any) => d.tickets" :color="(d: any) => d.fill" central-label="88%" central-sub-label="Completed" />
        </VisSingleContainer>
      </ChartContainer>
    </UiCardContent>
    <UiCardFooter class="flex flex-col items-start justify-start gap-4 border-t md:flex-row md:justify-between lg:items-center lg:gap-0">
      <div class="flex w-full items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-full border border-green-400 bg-green-200 dark:bg-green-900">
          <Ticket class="size-4" />
        </div>
        <div class="flex flex-1 flex-row justify-between md:flex-col md:justify-normal">
          <div class="text-sm">
            New Tickets
          </div>
          <div class="ms-auto text-sm text-muted-foreground md:ms-0">
            40
          </div>
        </div>
      </div>
      <div class="flex w-full items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-full border border-orange-400 bg-orange-200 dark:bg-orange-900">
          <Clock class="size-4" />
        </div>
        <div class="flex flex-1 flex-row justify-between md:flex-col md:justify-normal">
          <div class="text-sm">
            Open Tickets
          </div>
          <div class="ms-auto text-sm text-muted-foreground md:ms-0">
            25
          </div>
        </div>
      </div>
      <div class="flex w-full items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-full border border-teal-400 bg-teal-200 dark:bg-teal-900">
          <MessageCircleReply class="size-4" />
        </div>
        <div class="flex flex-1 flex-row justify-between md:flex-col md:justify-normal">
          <div class="text-sm">
            Response Time
          </div>
          <div class="ms-auto text-sm text-muted-foreground md:ms-0">
            1 Day
          </div>
        </div>
      </div>
    </UiCardFooter>
  </UiCard>
</template>
