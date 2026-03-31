<script lang="ts" setup>
import { Download } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

import ChatWidget from './components/default/chat-widget.vue'
import ExerciseMinutes from './components/default/exercise-minutes.vue'
import LatestPayments from './components/default/latest-payments.vue'
import PaymentMethodCard from './components/default/payment-method-card.vue'
import SubscriptionsCard from './components/default/subscriptions-card.vue'
import TeamMembersCard from './components/default/team-members-card.vue'
import TotalRevenueCard from './components/default/total-revenue-card.vue'
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-row items-center justify-between">
      <h1 class="text-xl font-bold tracking-tight lg:text-2xl">
        Dashboard
      </h1>
      <div class="flex items-center space-x-2">
        <UiButton variant="outline" size="sm" class="h-9">
          <span class="text-muted-foreground text-sm">Last 28 days</span>
        </UiButton>
        <UiButton @click="toast.success('Download started')">
          <Download class="size-4" />
          <span class="hidden lg:inline">Download</span>
        </UiButton>
      </div>
    </div>
    <div class="grid gap-4 lg:grid-cols-3 lg:space-y-0 space-y-4">
      <TeamMembersCard />
      <SubscriptionsCard />
      <TotalRevenueCard />
      <ChatWidget />
      <div class="lg:col-span-2">
        <ExerciseMinutes />
      </div>
      <div class="lg:col-span-2">
        <LatestPayments />
      </div>
      <PaymentMethodCard />
    </div>
  </div>
</template>
