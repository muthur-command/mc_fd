<script setup lang="ts">
import { WalletMinimal } from 'lucide-vue-next'
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <UiCardDescription>Total Revenue</UiCardDescription>
      <div class="flex flex-col gap-2">
        <h4 class="font-display text-2xl lg:text-3xl">
          $435,578
        </h4>
        <div class="text-sm text-muted-foreground">
          <span class="text-green-600">+20.1%</span> from last month
        </div>
      </div>
      <UiCardAction>
        <div class="flex gap-4">
          <div class="flex size-12 items-center justify-center rounded-full border bg-muted">
            <WalletMinimal class="size-5" />
          </div>
        </div>
      </UiCardAction>
    </UiCardHeader>
  </UiCard>
</template>
