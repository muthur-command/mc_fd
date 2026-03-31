<script setup lang="ts">
import { Users } from 'lucide-vue-next'
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <UiCardDescription>Total Customers</UiCardDescription>
      <div class="flex flex-col gap-2">
        <h4 class="font-display text-2xl lg:text-3xl">
          1890
        </h4>
        <div class="text-sm text-muted-foreground">
          <span class="text-green-600">+10.4%</span> from last month
        </div>
      </div>
      <UiCardAction>
        <div class="flex gap-4">
          <div class="flex size-12 items-center justify-center rounded-full border bg-muted">
            <Users class="size-5" />
          </div>
        </div>
      </UiCardAction>
    </UiCardHeader>
  </UiCard>
</template>
