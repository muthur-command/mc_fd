<script setup lang="ts">
</script>

<template>
  <UiCard class="relative overflow-hidden bg-muted md:col-span-6 xl:col-span-3">
    <UiCardHeader>
      <UiCardTitle class="text-2xl">
        Congratulations Toby! 🎉
      </UiCardTitle>
      <UiCardDescription>Best seller of the month</UiCardDescription>
    </UiCardHeader>
    <UiCardContent>
      <div class="flex items-center justify-between">
        <div>
          <div class="font-display text-3xl">
            $15,231.89
          </div>
          <div class="text-xs text-muted-foreground">
            <span class="text-green-500">+65%</span> from last month
          </div>
        </div>
        <UiButton variant="outline">
          View Sales
        </UiButton>
      </div>
    </UiCardContent>
    <img
      src="/placeholder.png"
      alt=""
      class="pointer-events-none absolute inset-0 aspect-auto max-h-full w-full object-cover opacity-30"
    >
  </UiCard>
</template>
