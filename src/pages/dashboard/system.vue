<script lang="ts" setup>
/**
 * 系统监控已迁移至插件：src/plugin/system-monitor
 * 保留此页仅作重定向，兼容旧链接 /dashboard/system
 */
import { useRouter } from 'vue-router'

const router = useRouter()
onMounted(() => {
  router.replace('/plugin/system-monitor')
})
</script>

<template>
  <div class="flex min-h-[50vh] items-center justify-center text-muted-foreground">
    {{ $t('pluginSystem.loading') }}
  </div>
</template>
