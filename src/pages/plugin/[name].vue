<script lang="ts" setup>
/**
 * 插件视图动态路由：/plugin/:name 渲染对应插件 src/plugin/:name/views/index.vue
 * 侧栏「Card」等菜单点击后直接跳转到此处，无需为每个插件新建页面文件
 */
const route = useRoute()
const name = computed(() => {
  const p = route.params as Record<string, string | string[] | undefined>
  const raw = p.name
  return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '')
})

const pluginViewLoaders = import.meta.glob<{ default: import('vue').Component }>('/src/plugin/*/views/index.vue')
const PluginView = shallowRef<import('vue').Component | null>(null)

watchEffect(() => {
  const n = name.value
  if (!n) {
    PluginView.value = null
    return
  }
  const key = `/src/plugin/${n}/views/index.vue`
  const loader = pluginViewLoaders[key]
  PluginView.value = loader ? defineAsyncComponent(loader) : null
}, { flush: 'sync' })
</script>

<template>
  <component :is="PluginView" v-if="PluginView" />
  <div v-else class="text-muted-foreground flex min-h-[40vh] items-center justify-center text-sm">
    {{ name ? '插件不存在或没有 views/index.vue' : '' }}
  </div>
</template>
