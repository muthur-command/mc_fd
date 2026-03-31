<script lang="ts" setup>
import { Download } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

import BestSellingProductsCard from './ecommerce/components/best-selling-products-card.vue'
import CustomerReviewsCard from './ecommerce/components/customer-reviews-card.vue'
import NewCustomersCard from './ecommerce/components/new-customers-card.vue'
import RecentOrdersCard from './ecommerce/components/recent-orders-card.vue'
import ReturnRateCard from './ecommerce/components/return-rate-card.vue'
import RevenueCard from './ecommerce/components/revenue-card.vue'
import SalesByLocationCard from './ecommerce/components/sales-by-location-card.vue'
import SalesCard from './ecommerce/components/sales-card.vue'
import TotalRevenueCard from './ecommerce/components/total-revenue-card.vue'
import VisitBySourceCard from './ecommerce/components/visit-by-source-card.vue'
import WelcomeCard from './ecommerce/components/welcome-card.vue'
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-row items-center justify-between">
      <h1 class="text-xl font-bold tracking-tight lg:text-2xl">
        E-Commerce Dashboard
      </h1>
      <div class="flex items-center space-x-2">
        <UiButton variant="outline" size="sm" class="h-9">
          <span class="text-sm text-muted-foreground">Last 28 days</span>
        </UiButton>
        <UiButton @click="toast.success('Download started')">
          <Download class="size-4" />
          <span class="hidden lg:inline">Download</span>
        </UiButton>
      </div>
    </div>
    <div class="space-y-4">
      <div class="grid gap-4 lg:grid-cols-12">
        <WelcomeCard />
        <RevenueCard />
        <SalesCard />
        <NewCustomersCard />
      </div>
      <div class="space-y-4 xl:grid xl:grid-cols-2 xl:gap-4 xl:space-y-0">
        <TotalRevenueCard />
        <ReturnRateCard />
      </div>
      <div class="grid gap-4 lg:grid-cols-12">
        <SalesByLocationCard />
        <VisitBySourceCard />
        <CustomerReviewsCard />
      </div>
      <div class="space-y-4 xl:grid xl:grid-cols-12 xl:gap-4 xl:space-y-0">
        <RecentOrdersCard />
        <BestSellingProductsCard />
      </div>
    </div>
  </div>
</template>
