<script lang="ts" setup>
import { Sparkles } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
    <div class="flex max-w-md flex-col items-center gap-6 text-center">
      <div class="flex size-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles class="size-10" />
      </div>
      <div class="space-y-2">
        <h2 class="text-3xl font-bold tracking-tight sm:text-4xl">
          {{ t('help.comingSoon') }}
        </h2>
        <p class="text-muted-foreground text-base leading-relaxed sm:text-lg">
          {{ t('help.placeholderDescription') }}
        </p>
      </div>
    </div>
  </div>
</template>
