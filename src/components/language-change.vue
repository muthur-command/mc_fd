<script setup lang="ts">
import { Icon } from '@iconify/vue'
</script>

<template>
  <UiDropdownMenu>
    <UiDropdownMenuTrigger as-child>
      <UiButton variant="outline" size="icon" :aria-label="$t('changeLanguage')">
        <Icon icon="mdi:translate" class="size-4" />
        <span class="sr-only">{{ $t('changeLanguage') }}</span>
      </UiButton>
    </UiDropdownMenuTrigger>
    <UiDropdownMenuContent class="w-56">
      <UiDropdownMenuLabel>{{ $t('changeLanguage') }}</UiDropdownMenuLabel>
      <UiDropdownMenuSeparator />
      <UiDropdownMenuRadioGroup v-model="$i18n.locale">
        <UiDropdownMenuRadioItem value="en">
          <Icon icon="flag:us-4x3" />
          <span class="ml-2">English</span>
        </UiDropdownMenuRadioItem>
        <UiDropdownMenuRadioItem value="zh">
          <Icon icon="flag:cn-4x3" />
          <span class="ml-2">中文</span>
        </UiDropdownMenuRadioItem>
      </UiDropdownMenuRadioGroup>
    </UiDropdownMenuContent>
  </UiDropdownMenu>
</template>
