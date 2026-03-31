<script setup lang="ts">
/**
 * Tweak - 嵌入 tweakcn 主题编辑器
 * 本地开发时：在 ~/work/share/github/tweakcn 运行 pnpm dev，iframe 通过代理加载 localhost:3000/editor/theme
 * 生产或未运行本地 tweakcn 时：加载 https://tweakcn.com/editor/theme
 * @see https://github.com/jnsahaj/tweakcn
 */
import { useI18n } from 'vue-i18n'

import ThemeLayout from './components/theme-layout.vue'

const { t } = useI18n()

// 开发时通过 Vite proxy /tweakcn -> localhost:3000 加载本地 tweakcn
const TWEAKCN_EDITOR_URL = import.meta.env.DEV
  ? '/tweakcn/editor/theme'
  : 'https://tweakcn.com/editor/theme'
</script>

<template>
  <ThemeLayout
    :title="t('pluginTheme.tweakTitle')"
    :description="t('pluginTheme.tweakDesc')"
  >
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <p class="text-sm text-muted-foreground">
          {{ t('pluginTheme.tweakConfig.embedDesc') }}
        </p>
        <a
          :href="TWEAKCN_EDITOR_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm text-primary hover:underline"
        >
          {{ t('pluginTheme.tweakConfig.openInNewTab') }}
        </a>
      </div>
      <div class="min-h-[calc(100vh-12rem)] w-full overflow-hidden rounded-lg border bg-muted/30">
        <iframe
          :src="TWEAKCN_EDITOR_URL"
          title="tweakcn Theme Editor"
          class="h-[calc(100vh-12rem)] min-h-[600px] w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  </ThemeLayout>
</template>
