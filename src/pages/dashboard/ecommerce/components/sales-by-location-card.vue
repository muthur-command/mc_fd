<script setup lang="ts">
interface SalesData {
  country: string
  percentage: number
  value: number
  change: number
}

const salesData: SalesData[] = [
  { country: 'Canada', percentage: 85, value: 1275000, change: 5.2 },
  { country: 'Greenland', percentage: 80, value: 1200000, change: 7.8 },
  { country: 'Russia', percentage: 63, value: 945000, change: -2.1 },
  { country: 'China', percentage: 60, value: 900000, change: 3.4 },
  { country: 'Australia', percentage: 45, value: 675000, change: 1.2 },
  { country: 'Greece', percentage: 40, value: 475000, change: 1 },
]
</script>

<template>
  <UiCard class="lg:col-span-6 xl:col-span-4">
    <UiCardHeader>
      <UiCardTitle class="relative">
        Sales by Location
      </UiCardTitle>
      <UiCardDescription>Income in the last 28 days</UiCardDescription>
    </UiCardHeader>
    <UiCardContent>
      <div class="space-y-5">
        <div v-for="item in salesData" :key="item.country" class="space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-sm">{{ item.country }}</span>
              <UiBadge v-if="item.change > 0" variant="outline" class="text-green-500">
                +{{ item.change }}%
              </UiBadge>
              <UiBadge v-else variant="outline" class="text-red-500">
                {{ item.change }}%
              </UiBadge>
            </div>
            <div class="text-sm">
              {{ item.percentage }}%
            </div>
          </div>
          <UiProgress :model-value="item.percentage" />
        </div>
      </div>
    </UiCardContent>
  </UiCard>
</template>
