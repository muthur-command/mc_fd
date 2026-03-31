<script setup lang="ts">
import { CircleAlert, Eye, Mail, MousePointer, UserMinus, UserPlus } from 'lucide-vue-next'

import { cn } from '@/lib/utils'

const metrics = [
  { name: 'Emails', value: 1.503, percentage: -0.3, icon: Mail },
  { name: 'Opened', value: 6.043, percentage: 2.1, icon: Eye },
  { name: 'Clicked', value: 600, percentage: -2.1, icon: MousePointer },
  { name: 'Subscribe', value: 490, percentage: 8.5, icon: UserPlus },
  { name: 'Complaints', value: 490, percentage: 4.5, icon: CircleAlert },
  { name: 'Unsubscribe', value: 1.2, percentage: -0.5, icon: UserMinus },
]
</script>

<template>
  <UiCard class="h-full">
    <UiCardHeader>
      <UiCardTitle>Monthly Campaign State</UiCardTitle>
      <UiCardDescription>8.5K social visitors</UiCardDescription>
    </UiCardHeader>
    <UiCardContent>
      <div class="space-y-5">
        <div v-for="(metric, key) in metrics" :key="key" class="flex items-center">
          <div class="flex size-10 items-center justify-center rounded-md border bg-muted">
            <component :is="metric.icon" class="size-4" />
          </div>
          <div class="ml-4">
            <p>{{ metric.name }}</p>
          </div>
          <div class="ml-auto flex items-center justify-between space-x-3">
            <span class="text-sm">{{ metric.value }}</span>
            <div class="w-14 text-end">
              <UiBadge
                variant="outline"
                :class="cn(
                  metric.percentage >= 0 ? 'text-green-600' : 'text-red-600',
                )"
              >
                {{ metric.percentage }}%
              </UiBadge>
            </div>
          </div>
        </div>
      </div>
    </UiCardContent>
  </UiCard>
</template>
