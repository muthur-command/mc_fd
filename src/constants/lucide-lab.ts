/**
 * Lucide Lab 实验性图标集合
 * @see https://lucide.dev/icons?search=&categories=lab
 *
 * 使用方式：Lab 图标需通过 lucide-vue-next 的 Icon 组件 + iconNode 渲染，不能直接当组件用。
 *
 * @example
 * ```vue
 * <script setup>
 * import { Icon } from 'lucide-vue-next';
 * import { textSquare, burger } from '@/constants/lucide-lab';
 * </script>
 * <template>
 *   <Icon :iconNode="textSquare" :size="20" />
 *   <Icon :iconNode="burger" :size="24" class="text-primary" />
 * </template>
 * ```
 */
export * from '@lucide/lab'
