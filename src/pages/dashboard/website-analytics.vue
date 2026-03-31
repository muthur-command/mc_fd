<script lang="ts" setup>
import { Download } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

import AverageDailySalesCard from './website-analytics/components/average-daily-sales-card.vue'
import EarningReportsCard from './website-analytics/components/earning-reports-card.vue'
import MonthlyCampaignStateCard from './website-analytics/components/monthly-campaign-state-card.vue'
import SaleOverviewCard from './website-analytics/components/sale-overview-card.vue'
import SalesByCountriesCard from './website-analytics/components/sales-by-countries-card.vue'
import TicketsCard from './website-analytics/components/tickets-card.vue'
import TotalEarningCard from './website-analytics/components/total-earning-card.vue'
import WebsiteAnalyticsCard from './website-analytics/components/website-analytics-card.vue'
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-row items-center justify-between">
      <h1 class="text-xl font-bold tracking-tight lg:text-2xl">
        Website Analytics
      </h1>
      <div class="flex items-center space-x-2">
        <UiButton variant="outline" size="sm" class="h-9">
          <span class="text-sm text-muted-foreground">Last 28 days</span>
        </UiButton>
        <UiButton @click="toast.success('Download started')">
          <Download class="size-4" />
          Download
        </UiButton>
      </div>
    </div>
    <div class="grid gap-4 lg:grid-cols-12">
      <div class="lg:col-span-4">
        <WebsiteAnalyticsCard />
      </div>
      <div class="lg:col-span-4">
        <AverageDailySalesCard />
      </div>
      <div class="lg:col-span-4">
        <SaleOverviewCard />
      </div>
      <div class="lg:col-span-12 xl:col-span-8">
        <EarningReportsCard />
      </div>
      <div class="lg:col-span-12 xl:col-span-4">
        <TicketsCard />
      </div>
      <div class="lg:col-span-4">
        <SalesByCountriesCard />
      </div>
      <div class="lg:col-span-4">
        <TotalEarningCard />
      </div>
      <div class="lg:col-span-4">
        <MonthlyCampaignStateCard />
      </div>
    </div>
  </div>
</template>
