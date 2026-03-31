<script setup lang="ts">
const sourceData = [
  { name: 'Direct', visitors: 275, color: 'var(--chart-1)' },
  { name: 'Social', visitors: 200, color: 'var(--chart-2)' },
  { name: 'Email', visitors: 287, color: 'var(--chart-3)' },
  { name: 'Referrals', visitors: 173, color: 'var(--chart-4)' },
  { name: 'Other', visitors: 190, color: 'var(--chart-5)' },
]
</script>

<template>
  <UiCard class="lg:col-span-6 xl:col-span-3">
    <UiCardHeader>
      <UiCardTitle>Store Visits by Source</UiCardTitle>
    </UiCardHeader>
    <UiCardContent>
      <div class="mx-auto flex max-h-[350px] flex-col items-center gap-4">
        <div class="text-center">
          <div class="fill-foreground text-3xl font-bold">
            10.2K
          </div>
          <div class="fill-muted-foreground text-sm">
            Visitors
          </div>
        </div>
        <div class="flex w-full flex-wrap justify-center gap-3">
          <div
            v-for="item in sourceData"
            :key="item.name"
            class="flex items-center gap-2"
          >
            <span
              class="size-3 rounded-full"
              :style="{ background: item.color }"
            />
            <span class="text-sm">{{ item.name }}</span>
          </div>
        </div>
      </div>
    </UiCardContent>
  </UiCard>
</template>
