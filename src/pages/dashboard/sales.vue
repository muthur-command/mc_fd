<script lang="ts" setup>
import { Download } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

import BalanceCard from './sales/components/balance-card.vue'
import BestSellingProducts from './sales/components/best-selling-products.vue'
import ExpenseCard from './sales/components/expense-card.vue'
import IncomeCard from './sales/components/income-card.vue'
import RevenueChart from './sales/components/revenue-chart.vue'
import TableOrderStatus from './sales/components/table-order-status.vue'
import TaxCard from './sales/components/tax-card.vue'
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-row items-center justify-between">
      <h1 class="text-xl font-bold tracking-tight lg:text-2xl">
        Sales Dashboard
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
    <div class="gap-4 space-y-4 md:grid md:grid-cols-2 lg:space-y-0 xl:grid-cols-8">
      <div class="md:col-span-4">
        <RevenueChart />
      </div>
      <div class="md:col-span-4">
        <div class="col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
          <BalanceCard />
          <IncomeCard />
          <ExpenseCard />
          <TaxCard />
        </div>
      </div>
    </div>
    <div class="gap-4 space-y-4 lg:space-y-0 xl:grid xl:grid-cols-3">
      <div class="xl:col-span-1">
        <BestSellingProducts />
      </div>
      <div class="xl:col-span-2">
        <TableOrderStatus />
      </div>
    </div>
  </div>
</template>
