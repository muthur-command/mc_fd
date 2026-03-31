<script setup lang="ts">
import { PlusCircle } from 'lucide-vue-next'
import { ref } from 'vue'

import { cn } from '@/lib/utils'

interface Task {
  id: string
  title: string
  description: string
  completed: boolean
  dueDate: string
  priority: 'high' | 'medium' | 'low'
}

const tasks = ref<Task[]>([
  { id: '1', title: 'Follow up with Acme Inc.', description: 'Send proposal and schedule meeting', completed: false, dueDate: 'Today', priority: 'high' },
  { id: '2', title: 'Prepare quarterly report', description: 'Compile sales data and forecasts', completed: false, dueDate: 'Tomorrow', priority: 'medium' },
  { id: '3', title: 'Update customer profiles', description: 'Verify contact information and preferences', completed: true, dueDate: 'Oct 15', priority: 'low' },
])
</script>

<template>
  <UiCard class="h-full">
    <UiCardHeader>
      <UiCardTitle>Tasks</UiCardTitle>
      <UiCardDescription>Track and manage your upcoming tasks.</UiCardDescription>
      <UiCardAction>
        <UiButton variant="outline" size="sm">
          <PlusCircle class="size-4" />
          Add Task
        </UiButton>
      </UiCardAction>
    </UiCardHeader>
    <UiCardContent class="space-y-3">
      <div
        v-for="task in tasks"
        :key="task.id"
        :class="cn(
          'flex items-start space-x-3 rounded-md border p-3 transition-colors',
          task.completed && 'bg-muted/50',
        )"
      >
        <UiCheckbox
          :checked="task.completed"
          class="mt-1"
          @update:checked="(v: boolean | 'indeterminate') => (task.completed = !!v)"
        />
        <div class="space-y-1">
          <p
            :class="cn(
              'text-sm font-medium leading-none',
              task.completed && 'text-muted-foreground line-through',
            )"
          >
            {{ task.title }}
          </p>
          <p :class="cn('text-xs text-muted-foreground', task.completed && 'line-through')">
            {{ task.description }}
          </p>
          <div class="flex items-center pt-1">
            <div
              :class="cn(
                'mr-2 rounded-full px-2 py-0.5 text-xs font-medium',
                task.priority === 'high' && 'bg-red-100 text-red-700',
                task.priority === 'medium' && 'bg-amber-100 text-amber-700',
                task.priority === 'low' && 'bg-green-100 text-green-700',
              )"
            >
              {{ task.priority.charAt(0).toUpperCase() + task.priority.slice(1) }}
            </div>
            <span class="text-xs text-muted-foreground">Due {{ task.dueDate }}</span>
          </div>
        </div>
      </div>
    </UiCardContent>
  </UiCard>
</template>
