<script setup lang="ts">
interface PipelineStage {
  id: string
  name: string
  count: number
  value: number
  color: string
}

const pipelineData: PipelineStage[] = [
  { id: 'lead', name: 'Lead', count: 235, value: 420500, color: 'bg-[var(--chart-1)]' },
  { id: 'qualified', name: 'Qualified', count: 146, value: 267800, color: 'bg-[var(--chart-2)]' },
  { id: 'proposal', name: 'Proposal', count: 84, value: 192400, color: 'bg-[var(--chart-3)]' },
  { id: 'negotiation', name: 'Negotiation', count: 52, value: 129600, color: 'bg-[var(--chart-4)]' },
  { id: 'closed', name: 'Closed Won', count: 36, value: 87200, color: 'bg-[var(--chart-5)]' },
]

const totalValue = pipelineData.reduce((sum, stage) => sum + stage.value, 0)
const totalCount = pipelineData.reduce((sum, stage) => sum + stage.count, 0)
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <UiCardTitle>Sales Pipeline</UiCardTitle>
      <UiCardDescription>Current deals in your sales pipeline.</UiCardDescription>
    </UiCardHeader>
    <UiCardContent>
      <UiTooltipProvider>
        <div class="mb-6 flex h-4 w-full overflow-hidden rounded-full">
          <UiTooltip v-for="stage in pipelineData" :key="stage.id">
            <UiTooltipTrigger as-child>
              <div
                :class="stage.color"
                class="h-full"
                :style="{ width: `${(stage.value / totalValue) * 100}%` }"
              />
            </UiTooltipTrigger>
            <UiTooltipContent>
              <div class="text-sm">
                <p class="font-medium">
                  {{ stage.name }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ stage.count }} deals
                </p>
                <p class="text-xs text-muted-foreground">
                  ${{ stage.value.toLocaleString() }}
                </p>
              </div>
            </UiTooltipContent>
          </UiTooltip>
        </div>
      </UiTooltipProvider>

      <div class="space-y-4">
        <div v-for="stage in pipelineData" :key="stage.id" class="flex items-center gap-4">
          <div class="h-3 w-3 rounded-full" :class="[stage.color]" />
          <div class="flex flex-1 items-center justify-between">
            <div>
              <p class="text-sm font-medium">
                {{ stage.name }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ stage.count }} deals · ${{ stage.value.toLocaleString() }}
              </p>
            </div>
            <div class="flex w-24 items-center gap-2">
              <UiProgress
                :model-value="(stage.count / totalCount) * 100"
                class="h-2"
                :class="[stage.color]"
              />
              <span class="w-10 text-right text-xs text-muted-foreground">
                {{ Math.round((stage.value / totalValue) * 100) }}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </UiCardContent>
  </UiCard>
</template>
