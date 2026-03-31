import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { fileURLToPath, URL } from 'node:url'
import { visualizer } from 'rollup-plugin-visualizer'
import AutoImport from 'unplugin-auto-import/vite'
import Component from 'unplugin-vue-components/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import VueRouter from 'unplugin-vue-router/vite'
import { defineConfig, loadEnv } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import Layouts from 'vite-plugin-vue-layouts'

const RouteGenerateExclude = ['**/components/**', '**/layouts/**', '**/data/**', '**/types/**']

export default defineConfig(({ mode }) => {
  const root = fileURLToPath(new URL('.', import.meta.url))
  const env = loadEnv(mode, root, '')
  const apiProxyTarget = env.API_PROXY_TARGET || 'http://localhost:8000'

  return {
    server: {
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          ws: true, // 转发 WebSocket（Container Logs / Stats 等）
        },
        // 静态资源（含用户头像）走后端
        '/static': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    plugins: [
      VueRouter({
        exclude: RouteGenerateExclude,
        dts: 'src/types/typed-router.d.ts',
      }),
      vue(),
      vueJsx(),
      vueDevTools(),
      tailwindcss(),
      visualizer({ gzipSize: true, brotliSize: true }),
      Layouts({
        defaultLayout: 'default',
      }),
      AutoImport({
        include: [/\.[tj]sx?$/, /\.vue$/],
        imports: ['vue', VueRouterAutoImports],
        dirs: [
          'src/composables/**/*.ts',
          'src/constants/**/*.ts',
          'src/stores/**/*.ts',
        ],
        defaultExportByFilename: true,
        dts: 'src/types/auto-import.d.ts',
      }),
      Component({
        dirs: ['src/components'],
        collapseSamePrefixes: true,
        directoryAsNamespace: true,
        dts: 'src/types/auto-import-components.d.ts',
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    esbuild: {
      drop: ['debugger'],
      pure: ['console.log'],
    },
  }
})
