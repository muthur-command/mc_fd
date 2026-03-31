<script lang="ts" setup>
import { Icon } from '@iconify/vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'OAuth2ThirdParty' })

defineEmits<{
  github: []
  google: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="grid gap-4">
    <UiSeparator :label="t('auth.thirdPartySeparator')" />
    <div class="flex flex-wrap justify-center gap-2">
      <UiButton variant="outline" class="flex-1 sm:flex-none" @click="$emit('github')">
        <Icon icon="simple-icons:github" class="mr-2 size-5" />
        GitHub
      </UiButton>
      <UiButton variant="outline" class="flex-1 sm:flex-none" @click="$emit('google')">
        <Icon icon="simple-icons:google" class="mr-2 size-5" />
        Google
      </UiButton>
    </div>
  </div>
</template>
