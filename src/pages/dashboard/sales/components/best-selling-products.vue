<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'

const products = [
  { id: 1, image: 'https://bundui-images.netlify.app/products/01.jpeg', name: 'Sports Shoes', price: 316, sold: 316, sales: 10 },
  { id: 2, image: 'https://bundui-images.netlify.app/products/02.jpeg', name: 'Black T-Shirt', price: 274, sold: 274, sales: 20 },
  { id: 3, image: 'https://bundui-images.netlify.app/products/03.jpeg', name: 'Jeans', price: 195, sold: 195, sales: 15 },
  { id: 4, image: 'https://bundui-images.netlify.app/products/04.jpeg', name: 'Red Sneakers', price: 402, sold: 402, sales: 40 },
  { id: 5, image: 'https://bundui-images.netlify.app/products/05.jpeg', name: 'Red Scarf', price: 280, sold: 280, sales: 37 },
  { id: 6, image: 'https://bundui-images.netlify.app/products/06.jpeg', name: 'Kitchen Accessory', price: 150, sold: 150, sales: 18 },
]
</script>

<template>
  <UiCard class="h-full">
    <UiCardHeader>
      <UiCardTitle>Best Selling Product</UiCardTitle>
      <UiCardDescription>Top-Selling Products at a Glance</UiCardDescription>
      <UiCardAction>
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiButton size="icon" variant="outline" as-child>
              <RouterLink to="/dashboard/products/1">
                <ChevronRight />
              </RouterLink>
            </UiButton>
          </UiTooltipTrigger>
          <UiTooltipContent>View All</UiTooltipContent>
        </UiTooltip>
      </UiCardAction>
    </UiCardHeader>
    <UiCardContent class="space-y-4">
      <RouterLink
        v-for="product in products"
        :key="product.name"
        :to="`/dashboard/products/${product.id}`"
        class="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted"
      >
        <div class="flex items-center gap-4">
          <img
            :src="product.image"
            width="40"
            height="40"
            class="rounded-md"
            alt="..."
          >
          <div>
            <div class="font-medium">
              {{ product.name }}
            </div>
          </div>
        </div>
        <div class="text-sm text-green-600">
          {{ product.sold }} items sold
        </div>
      </RouterLink>
    </UiCardContent>
  </UiCard>
</template>
