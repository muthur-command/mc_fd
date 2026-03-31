<script lang="ts" setup>
import { Download } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

import LeadBySourceCard from './crm/components/lead-by-source-card.vue'
import LeadsCard from './crm/components/leads-card.vue'
import RecentTasks from './crm/components/recent-tasks.vue'
import SalesPipeline from './crm/components/sales-pipeline.vue'
import TargetCard from './crm/components/target-card.vue'
import TotalCustomersCard from './crm/components/total-customers-card.vue'
import TotalDeals from './crm/components/total-deals.vue'
import TotalRevenueCard from './crm/components/total-revenue-card.vue'
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-row items-center justify-between">
      <h1 class="text-xl font-bold tracking-tight lg:text-2xl">
        CRM Dashboard
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
    <div class="space-y-4">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TargetCard />
        <TotalCustomersCard />
        <TotalDeals />
        <TotalRevenueCard />
      </div>
      <div class="grid gap-4 xl:grid-cols-3">
        <LeadBySourceCard />
        <RecentTasks />
        <SalesPipeline />
      </div>
      <LeadsCard />
    </div>
  </div>
</template>
