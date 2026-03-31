<script setup lang="ts">
import { ChevronRight, Star } from 'lucide-vue-next'

const totalReviews = 5500
const averageRating = 4.5

const reviewStats = [
  { stars: 5, count: 4000, color: 'bg-green-400' },
  { stars: 4, count: 2100, color: 'bg-lime-500' },
  { stars: 3, count: 800, color: 'bg-yellow-400' },
  { stars: 2, count: 631, color: 'bg-orange-400' },
  { stars: 1, count: 344, color: 'bg-red-400' },
]

const reviewStatsWithPercentage = reviewStats.map(stat => ({
  ...stat,
  percentage: (stat.count / totalReviews) * 100,
}))

const recentReviews = [
  {
    id: '1',
    author: 'Sarah J.',
    date: 'March 12, 2025',
    rating: 5,
    title: 'Exceeded my expectations!',
    content: 'I was skeptical at first, but this product has completely changed my daily routine. The quality is outstanding and it\'s so easy to use.',
    verified: true,
  },
]
</script>

<template>
  <UiCard class="lg:col-span-12 xl:col-span-5">
    <UiCardHeader>
      <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <UiCardTitle class="relative">
            Customer Reviews
          </UiCardTitle>
          <UiCardDescription>Based on {{ totalReviews.toLocaleString() }} verified purchases</UiCardDescription>
        </div>
        <UiButton size="sm" variant="outline" class="w-fit">
          <span class="hidden md:inline">View All</span>
          <ChevronRight />
        </UiButton>
      </div>
    </UiCardHeader>
    <UiCardContent>
      <div class="grid space-y-4 lg:grid-cols-3 lg:space-y-0">
        <div class="flex flex-col items-center justify-center gap-2 lg:col-span-1">
          <div class="flex items-center gap-1">
            <Star v-for="i in 4" :key="i" class="size-6 fill-yellow-400 text-yellow-400" />
            <Star class="size-6 fill-yellow-400 text-yellow-400" stroke-width="0" />
          </div>
          <div class="text-3xl font-bold">
            {{ averageRating }}
          </div>
          <div class="text-sm text-gray-500">
            out of 5
          </div>
        </div>
        <div class="w-full space-y-3 lg:col-span-2">
          <div v-for="stat in reviewStatsWithPercentage" :key="stat.stars" class="flex items-center">
            <div class="w-8 text-sm font-medium">
              {{ stat.stars }} ★
            </div>
            <div class="mx-2 h-3 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                class="h-full rounded-full" :class="[stat.color]"
                :style="{ width: `${stat.percentage}%` }"
              />
            </div>
            <div class="w-12 text-right text-sm font-medium text-muted-foreground">
              {{ stat.count }}
            </div>
          </div>
        </div>
      </div>
      <div class="mt-6">
        <div
          v-for="review in recentReviews"
          :key="review.id"
          class="rounded-lg border bg-muted p-4"
        >
          <div class="mb-2 flex flex-col items-start justify-between md:flex-row">
            <div>
              <div class="mb-1 flex items-center gap-1">
                <Star
                  v-for="i in 5"
                  :key="i"
                  :class="i <= review.rating ? 'h-4 w-4 fill-yellow-400 text-yellow-400' : 'h-4 w-4 fill-gray-200 text-gray-200'"
                />
              </div>
              <h4 class="font-medium">
                {{ review.title }}
              </h4>
            </div>
            <div class="text-xs text-muted-foreground">
              {{ review.date }}
            </div>
          </div>
          <p class="mb-3 text-sm text-muted-foreground">
            {{ review.content }}
          </p>
          <div class="flex items-center text-xs">
            <span class="font-medium">{{ review.author }}</span>
            <span
              v-if="review.verified"
              class="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-white"
            >Verified Purchase</span>
          </div>
        </div>
      </div>
    </UiCardContent>
  </UiCard>
</template>
