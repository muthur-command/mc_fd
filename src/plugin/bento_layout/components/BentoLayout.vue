<script setup lang="ts">
import { useDark } from '@vueuse/core'
import {
  Download,
  LayoutGrid,
  Plus,
  RotateCcw,
  Save,
  X,
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import type { CardItem } from '@/plugin/card/api'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import type { BentoLayoutItem, DragState } from './types'

import { getBentoLayoutApi, saveBentoLayoutApi } from '../api'

const props = withDefaults(
  defineProps<{
    autoLoad?: boolean
    cardCatalog?: CardItem[]
    cols?: number
    editable?: boolean
    gap?: number
    modelValue?: BentoLayoutItem[]
    pageId?: string
    rowHeight?: number
    width?: number
  }>(),
  {
    autoLoad: false,
    cardCatalog: () => [],
    cols: 12,
    rowHeight: 100,
    width: 1000,
    gap: 4,
    editable: false,
    modelValue: () => [],
    pageId: '',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: BentoLayoutItem[]): void
  (e: 'cardAdd', item: BentoLayoutItem): void
  (e: 'cardRemove', id: string): void
  (e: 'layoutSave', layout: BentoLayoutItem[]): void
  (e: 'layoutLoad', layout: BentoLayoutItem[]): void
  (e: 'layoutChange', layout: BentoLayoutItem[]): void
}>()

const { t, locale } = useI18n()

/** 内置几何占位卡片 id，切换语言时只刷新这些项的标题文案 */
const DEFAULT_GEOMETRIC_IDS = new Set([
  'card-1',
  'card-2',
  'card-3',
  'card-4',
  'card-5',
  'card-6',
])

const isDark = useDark()

const gridRef = ref<HTMLElement | null>(null)
const isLoading = ref(false)
const loadingText = ref('')
const addDialogOpen = ref(false)

const defaultLayout = ref<BentoLayoutItem[]>([])

const SLOT_POSITIONS: Array<Pick<BentoLayoutItem, 'x' | 'y' | 'w' | 'h'>> = [
  { x: 0, y: 0, w: 4, h: 2 },
  { x: 4, y: 0, w: 4, h: 1 },
  { x: 4, y: 1, w: 4, h: 1 },
  { x: 8, y: 0, w: 4, h: 2 },
  { x: 0, y: 2, w: 6, h: 2 },
  { x: 6, y: 2, w: 6, h: 2 },
]

const COLOR_CYCLE = ['blue', 'green', 'orange', 'purple', 'cyan', 'pink'] as const

function rebuildDefaultLayout() {
  if (props.cardCatalog?.length) {
    defaultLayout.value = props.cardCatalog.slice(0, 6).map((c, idx) => ({
      i: `store-${c.id}-${idx}`,
      ...SLOT_POSITIONS[idx]!,
      cardId: c.id,
      title: c.title,
      color: COLOR_CYCLE[idx % COLOR_CYCLE.length],
    }))
    return
  }
  defaultLayout.value = [
    { i: 'card-1', x: 0, y: 0, w: 4, h: 2, title: t('bentoLayout.cards.overview'), color: 'blue' },
    { i: 'card-2', x: 4, y: 0, w: 4, h: 1, title: t('bentoLayout.cards.statistics'), color: 'green' },
    { i: 'card-3', x: 4, y: 1, w: 4, h: 1, title: t('bentoLayout.cards.trends'), color: 'orange' },
    { i: 'card-4', x: 8, y: 0, w: 4, h: 2, title: t('bentoLayout.cards.activities'), color: 'purple' },
    { i: 'card-5', x: 0, y: 2, w: 6, h: 2, title: t('bentoLayout.cards.details'), color: 'cyan' },
    { i: 'card-6', x: 6, y: 2, w: 6, h: 2, title: t('bentoLayout.cards.list'), color: 'pink' },
  ]
}

rebuildDefaultLayout()

watch(
  () => props.cardCatalog,
  () => rebuildDefaultLayout(),
  { deep: true },
)

const layout = ref<BentoLayoutItem[]>(
  props.modelValue?.length ? [...props.modelValue] : [...defaultLayout.value],
)

watch(locale, () => {
  rebuildDefaultLayout()
  const titles = new Map(defaultLayout.value.map(item => [item.i, item.title]))
  for (const item of layout.value) {
    if (DEFAULT_GEOMETRIC_IDS.has(item.i)) {
      const nextTitle = titles.get(item.i)
      if (nextTitle)
        item.title = nextTitle
    }
  }
})

const dragState = ref<DragState>({
  isDragging: false,
  isResizing: false,
  startX: 0,
  startY: 0,
  originalItem: null,
  resizeDirection: undefined,
})

const dragPreview = ref<null | { h: number, w: number, x: number, y: number }>(null)

const cellWidth = computed(() => {
  if (gridRef.value) {
    let currentCols = props.cols || 12
    const gridStyle = window.getComputedStyle(gridRef.value)
    const cssCols = gridStyle.getPropertyValue('--cols')
    if (cssCols) {
      const parsedCols = Number.parseInt(cssCols)
      if (!Number.isNaN(parsedCols))
        currentCols = parsedCols
    }
    return gridRef.value.clientWidth / currentCols
  }
  return 0
})

/** 网格可用高度：优先用已布局父节点，否则用视口估算（避免固定 300px 压扁画布） */
function usableGridParentHeight(): number {
  const parent = gridRef.value?.parentElement
  if (parent && parent.clientHeight > 80)
    return parent.clientHeight
  if (typeof window === 'undefined')
    return 480
  return Math.max(360, window.innerHeight - 200)
}

const gridRows = computed(() => {
  const maxY = layout.value.length
    ? Math.max(...layout.value.map(item => item.y + item.h))
    : 0
  const maxRowsFromCards = Math.max(4, maxY)
  const parentHeight = usableGridParentHeight()
  const maxRowsFromParent = Math.max(4, Math.ceil(parentHeight / props.rowHeight))
  return Math.max(maxRowsFromCards, maxRowsFromParent)
})

const usedCardIds = computed(() => {
  const s = new Set<number>()
  for (const it of layout.value) {
    if (it.cardId != null)
      s.add(it.cardId)
  }
  return s
})

const availableCatalogCards = computed(() =>
  (props.cardCatalog ?? []).filter(c => !usedCardIds.value.has(c.id)),
)

function resolveStoreCard(item: BentoLayoutItem): CardItem | undefined {
  if (item.cardId == null)
    return undefined
  return props.cardCatalog?.find(c => c.id === item.cardId)
}

const generateId = () => `card-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue?.length)
      layout.value = newValue
  },
  { deep: true },
)

function calculateMinHeight(): number {
  const parentHeight = usableGridParentHeight()
  const maxY = layout.value.length
    ? Math.max(...layout.value.map(item => item.y + item.h))
    : 4
  const cardBasedHeight = maxY * props.rowHeight + props.gap
  return Math.max(cardBasedHeight, parentHeight)
}

function getCardStyle(item: BentoLayoutItem) {
  const gap = props.gap
  const halfGap = gap / 2
  return {
    left: `${item.x * cellWidth.value + halfGap}px`,
    top: `${item.y * props.rowHeight + halfGap}px`,
    width: `${item.w * cellWidth.value - gap}px`,
    height: `${item.h * props.rowHeight - gap}px`,
  }
}

function getDragPreviewStyle() {
  if (!dragPreview.value)
    return {}
  const gap = props.gap
  const halfGap = gap / 2
  return {
    left: `${dragPreview.value.x * cellWidth.value + halfGap}px`,
    top: `${dragPreview.value.y * props.rowHeight + halfGap}px`,
    width: `${dragPreview.value.w * cellWidth.value - gap}px`,
    height: `${dragPreview.value.h * props.rowHeight - gap}px`,
  }
}

function throttle<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let lastTime = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastTime >= delay) {
      lastTime = now
      fn(...args)
    }
  }
}

function checkCollision(item: BentoLayoutItem, x: number, y: number, w: number, h: number): boolean {
  return layout.value.some((other) => {
    if (other.i === item.i)
      return false
    return !(x + w <= other.x || x >= other.x + other.w || y + h <= other.y || y >= other.y + other.h)
  })
}

function handleCardMouseDown(event: MouseEvent, item: BentoLayoutItem) {
  if (!props.editable || item.static)
    return
  const target = event.target as HTMLElement
  if (target.closest('.bento-card-btn') || target.closest('.bento-resize-handle'))
    return
  event.preventDefault()
  startDrag(event, item)
}

function startDrag(event: MouseEvent, item: BentoLayoutItem) {
  dragState.value = {
    isDragging: true,
    isResizing: false,
    startX: event.clientX,
    startY: event.clientY,
    originalItem: { ...item },
  }
  dragPreview.value = { x: item.x, y: item.y, w: item.w, h: item.h }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', endDrag)
}

const throttledOnDrag = throttle((event: MouseEvent) => {
  if (!dragState.value.isDragging || !dragState.value.originalItem)
    return
  const deltaX = event.clientX - dragState.value.startX
  const deltaY = event.clientY - dragState.value.startY
  const gridDeltaX = Math.round(deltaX / cellWidth.value)
  const gridDeltaY = Math.round(deltaY / props.rowHeight)
  let newX = Math.max(0, dragState.value.originalItem.x + gridDeltaX)
  let newY = Math.max(0, dragState.value.originalItem.y + gridDeltaY)
  newX = Math.min(newX, props.cols - dragState.value.originalItem.w)
  const parentH = usableGridParentHeight()
  const maxY = Math.max(
    0,
    Math.floor((parentH - dragState.value.originalItem.h * props.rowHeight) / props.rowHeight),
  )
  newY = Math.min(newY, maxY)
  if (dragPreview.value) {
    dragPreview.value.x = newX
    dragPreview.value.y = newY
  }
  const originalItem = dragState.value.originalItem
  if (
    originalItem
    && !checkCollision(originalItem, newX, newY, originalItem.w, originalItem.h)
  ) {
    const idx = layout.value.findIndex(l => l.i === originalItem.i)
    if (idx !== -1) {
      layout.value[idx] = {
        ...layout.value[idx],
        x: newX,
        y: newY,
      } as BentoLayoutItem
    }
  }
}, 16)

function onDrag(event: MouseEvent) {
  throttledOnDrag(event)
}

function endDrag() {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', endDrag)
  if (dragState.value.isDragging) {
    emit('update:modelValue', layout.value)
    emit('layoutChange', layout.value)
  }
  dragState.value = {
    isDragging: false,
    isResizing: false,
    startX: 0,
    startY: 0,
    originalItem: null,
  }
  dragPreview.value = null
}

function startResize(event: MouseEvent, item: BentoLayoutItem, direction: 'e' | 's' | 'se') {
  event.preventDefault()
  dragState.value = {
    isDragging: false,
    isResizing: true,
    startX: event.clientX,
    startY: event.clientY,
    originalItem: { ...item },
    resizeDirection: direction,
  }
  dragPreview.value = { x: item.x, y: item.y, w: item.w, h: item.h }
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', endResize)
}

const throttledOnResize = throttle((event: MouseEvent) => {
  if (!dragState.value.isResizing || !dragState.value.originalItem)
    return
  const deltaX = event.clientX - dragState.value.startX
  const deltaY = event.clientY - dragState.value.startY
  const direction = dragState.value.resizeDirection
  let newW = dragState.value.originalItem.w
  let newH = dragState.value.originalItem.h
  if (direction === 'e' || direction === 'se') {
    newW = Math.max(1, dragState.value.originalItem.w + Math.round(deltaX / cellWidth.value))
    newW = Math.min(newW, props.cols - dragState.value.originalItem.x)
    if (dragState.value.originalItem.minW)
      newW = Math.max(newW, dragState.value.originalItem.minW)
    if (dragState.value.originalItem.maxW)
      newW = Math.min(newW, dragState.value.originalItem.maxW)
  }
  if (direction === 's' || direction === 'se') {
    newH = Math.max(
      1,
      dragState.value.originalItem.h + Math.round(deltaY / props.rowHeight),
    )
    {
      const parentHeight = usableGridParentHeight()
      const maxH = Math.floor(
        (parentHeight - dragState.value.originalItem.y * props.rowHeight) / props.rowHeight,
      )
      newH = Math.min(newH, Math.max(1, maxH))
    }
    if (dragState.value.originalItem.minH)
      newH = Math.max(newH, dragState.value.originalItem.minH)
    if (dragState.value.originalItem.maxH)
      newH = Math.min(newH, dragState.value.originalItem.maxH)
  }
  if (dragPreview.value) {
    dragPreview.value.w = newW
    dragPreview.value.h = newH
  }
  const originalItem = dragState.value.originalItem
  if (
    originalItem
    && !checkCollision(originalItem, originalItem.x, originalItem.y, newW, newH)
  ) {
    const idx = layout.value.findIndex(l => l.i === originalItem.i)
    if (idx !== -1) {
      layout.value[idx] = {
        ...layout.value[idx],
        w: newW,
        h: newH,
      } as BentoLayoutItem
    }
  }
}, 16)

function onResize(event: MouseEvent) {
  throttledOnResize(event)
}

function endResize() {
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', endResize)
  if (dragState.value.isResizing) {
    emit('update:modelValue', layout.value)
    emit('layoutChange', layout.value)
  }
  dragState.value = {
    isDragging: false,
    isResizing: false,
    startX: 0,
    startY: 0,
    originalItem: null,
  }
  dragPreview.value = null
}

function appendNewItem(item: BentoLayoutItem) {
  layout.value.push(item)
  emit('update:modelValue', layout.value)
  emit('cardAdd', item)
  emit('layoutChange', layout.value)
}

function addBlankCard() {
  let maxY = 0
  layout.value.forEach((item) => {
    maxY = Math.max(maxY, item.y + item.h)
  })
  const randomColor = COLOR_CYCLE[Math.floor(Math.random() * COLOR_CYCLE.length)]!
  appendNewItem({
    i: generateId(),
    x: 0,
    y: maxY,
    w: 3,
    h: 2,
    title: t('bentoLayout.cards.newCard'),
    color: randomColor,
  })
  addDialogOpen.value = false
}

function addCardFromCatalog(card: CardItem) {
  let maxY = 0
  layout.value.forEach((item) => {
    maxY = Math.max(maxY, item.y + item.h)
  })
  const idx = layout.value.length
  appendNewItem({
    i: `store-${card.id}-${generateId()}`,
    x: 0,
    y: maxY,
    w: 3,
    h: 2,
    cardId: card.id,
    title: card.title,
    color: COLOR_CYCLE[idx % COLOR_CYCLE.length],
  })
  addDialogOpen.value = false
}

function removeCard(id: string) {
  layout.value = layout.value.filter(item => item.i !== id)
  emit('update:modelValue', layout.value)
  emit('cardRemove', id)
  emit('layoutChange', layout.value)
}

function resetLayout() {
  layout.value = [...defaultLayout.value]
  emit('update:modelValue', layout.value)
  emit('layoutChange', layout.value)
  toast.info(t('bentoLayout.messages.layoutReset'))
}

async function saveLayout() {
  isLoading.value = true
  loadingText.value = t('bentoLayout.loading.saving')
  try {
    const res = await saveBentoLayoutApi({
      layout: layout.value,
      pageId: props.pageId || 'default',
      timestamp: Date.now(),
    })
    if (res.success) {
      toast.success(t('bentoLayout.messages.layoutSaved'))
      emit('layoutSave', layout.value)
    }
    else {
      toast.error(res.message || t('bentoLayout.messages.saveFailed'))
    }
  }
  catch (e) {
    console.error(e)
    toast.error(t('bentoLayout.messages.saveError'))
  }
  finally {
    isLoading.value = false
    loadingText.value = ''
  }
}

async function loadLayout() {
  isLoading.value = true
  loadingText.value = t('bentoLayout.loading.loading')
  try {
    const data = await getBentoLayoutApi(props.pageId || 'default', { skipGlobalErrorToast: true })
    if (data && data.layout != null) {
      layout.value = data.layout
      emit('update:modelValue', layout.value)
      emit('layoutLoad', layout.value)
      toast.success(t('bentoLayout.messages.layoutLoaded'))
    }
  }
  catch (e: unknown) {
    const status = (e as { response?: { status?: number } })?.response?.status
    if (layout.value.length === 0 && defaultLayout.value.length) {
      layout.value = [...defaultLayout.value]
      emit('update:modelValue', layout.value)
    }
    if (status === 404)
      toast.info(t('bentoLayout.messages.layoutNotFound'))
    else
      toast.error(t('bentoLayout.messages.loadError'))
  }
  finally {
    isLoading.value = false
    loadingText.value = ''
  }
}

const handleResize = throttle(() => {
  emit('layoutChange', layout.value)
}, 100)

onMounted(() => {
  if (props.autoLoad)
    void loadLayout()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', endDrag)
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', endResize)
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div
    class="bento-layout flex min-h-0 min-w-0 flex-1 flex-col"
    :class="{
      'bento-layout--editing': editable,
      'bento-layout--dark': isDark,
    }"
  >
    <div class="bento-container min-h-0 flex-1 overflow-auto">
      <div v-if="isLoading" class="bento-loading-overlay">
        <div class="bento-loading-spinner">
          <span class="bento-loading-dot" />
          <span class="bento-loading-dot" />
          <span class="bento-loading-dot" />
        </div>
        <span class="bento-loading-text">{{ loadingText }}</span>
      </div>

      <div
        ref="gridRef"
        class="bento-grid"
        :style="{
          'width': '100%',
          'minHeight': `${calculateMinHeight()}px`,
          '--cols': cols || 12,
          '--row-height': `${rowHeight || 100}px`,
          '--gap': `${gap || 12}px`,
        }"
      >
        <div v-if="editable" class="bento-grid-bg">
          <div
            v-for="row in gridRows"
            :key="`row-${row}`"
            class="bento-grid-row"
          >
            <div
              v-for="col in cols || 12"
              :key="`cell-${row}-${col}`"
              class="bento-grid-cell"
            />
          </div>
        </div>

        <TransitionGroup name="bento-card">
          <div
            v-for="item in layout"
            :key="item.i"
            class="bento-card"
            :class="{
              'bento-card--editable': editable && !item.static,
              'bento-card--dragging': dragState.isDragging && dragState.originalItem?.i === item.i,
              'bento-card--resizing': dragState.isResizing && dragState.originalItem?.i === item.i,
              'bento-card--static': item.static,
              [`bento-card--${item.color || 'default'}`]: true,
            }"
            :style="getCardStyle(item)"
            @mousedown="handleCardMouseDown($event, item)"
          >
            <div class="bento-card-header">
              <div class="bento-card-title">
                <span class="bento-card-title-text">{{
                  resolveStoreCard(item)?.title || item.title || `${t('bentoLayout.cards.defaultTitle')} ${item.i}`
                }}</span>
              </div>
              <div
                v-if="editable && !item.static"
                class="bento-card-actions"
              >
                <button
                  type="button"
                  class="bento-card-btn bento-card-btn--remove"
                  :title="t('bentoLayout.buttons.deleteCard')"
                  @click.stop="removeCard(item.i)"
                >
                  <X class="size-4" />
                </button>
              </div>
            </div>

            <div class="bento-card-content">
              <slot name="card" :item="item" :store-card="resolveStoreCard(item)">
                <Card class="border-0 bg-transparent shadow-none">
                  <CardHeader class="p-0 pb-2">
                    <CardTitle class="text-sm font-medium">
                      {{ resolveStoreCard(item)?.title || item.title }}
                    </CardTitle>
                    <CardDescription v-if="resolveStoreCard(item)?.summary || resolveStoreCard(item)?.description" class="line-clamp-3 text-xs">
                      {{ resolveStoreCard(item)?.summary || resolveStoreCard(item)?.description }}
                    </CardDescription>
                  </CardHeader>
                  <CardContent class="p-0 text-muted-foreground text-xs">
                    <div v-if="!resolveStoreCard(item)" class="bento-card-default-content">
                      <div class="bento-card-info">
                        <span class="bento-card-info-label">{{ t('bentoLayout.cards.position') }}</span>
                        <span class="bento-card-info-value">({{ item.x }}, {{ item.y }})</span>
                      </div>
                      <div class="bento-card-info">
                        <span class="bento-card-info-label">{{ t('bentoLayout.cards.size') }}</span>
                        <span class="bento-card-info-value">{{ item.w }} × {{ item.h }}</span>
                      </div>
                    </div>
                    <div v-else class="space-y-1">
                      <p v-if="resolveStoreCard(item)?.card_type" class="text-muted-foreground">
                        {{ resolveStoreCard(item)?.card_type }}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </slot>
            </div>

            <template v-if="editable && !item.static">
              <div
                class="bento-resize-handle bento-resize-handle--se"
                @mousedown.stop="startResize($event, item, 'se')"
              />
              <div
                class="bento-resize-handle bento-resize-handle--e"
                @mousedown.stop="startResize($event, item, 'e')"
              />
              <div
                class="bento-resize-handle bento-resize-handle--s"
                @mousedown.stop="startResize($event, item, 's')"
              />
            </template>
          </div>
        </TransitionGroup>

        <div
          v-if="dragPreview"
          class="bento-drag-preview"
          :style="getDragPreviewStyle()"
        />
      </div>
    </div>

    <TooltipProvider v-if="editable">
      <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button size="icon" class="size-11 rounded-full shadow-lg" @click="addDialogOpen = true">
              <Plus class="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {{ t('bentoLayout.buttons.addCard') }}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              size="icon"
              variant="secondary"
              class="size-11 rounded-full shadow-lg"
              :disabled="isLoading"
              @click="saveLayout"
            >
              <Save class="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {{ t('bentoLayout.buttons.saveLayout') }}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              size="icon"
              variant="secondary"
              class="size-11 rounded-full shadow-lg"
              :disabled="isLoading"
              @click="loadLayout"
            >
              <Download class="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {{ t('bentoLayout.buttons.loadLayout') }}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              size="icon"
              variant="outline"
              class="size-11 rounded-full shadow-lg"
              @click="resetLayout"
            >
              <RotateCcw class="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {{ t('bentoLayout.buttons.resetLayout') }}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>

    <Dialog v-model:open="addDialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('bentoLayout.addDialog.title') }}</DialogTitle>
        </DialogHeader>
        <div class="grid gap-3 py-2">
          <Button variant="outline" class="w-full justify-start gap-2" @click="addBlankCard">
            <LayoutGrid class="size-4" />
            {{ t('bentoLayout.addDialog.blank') }}
          </Button>
          <template v-if="cardCatalog?.length">
            <p class="text-muted-foreground text-xs">
              {{ t('bentoLayout.addDialog.fromStoreHint') }}
            </p>
            <ScrollArea class="max-h-64 pr-3">
              <div class="flex flex-col gap-1">
                <Button
                  v-for="c in availableCatalogCards"
                  :key="c.id"
                  variant="ghost"
                  class="h-auto justify-start py-2 text-left"
                  @click="addCardFromCatalog(c)"
                >
                  <div class="flex flex-col items-start gap-0.5">
                    <span class="font-medium">{{ c.title }}</span>
                    <span v-if="c.summary" class="text-muted-foreground line-clamp-2 text-xs font-normal">{{ c.summary }}</span>
                  </div>
                </Button>
                <p v-if="!availableCatalogCards.length" class="text-muted-foreground py-4 text-center text-sm">
                  {{ t('bentoLayout.addDialog.allAdded') }}
                </p>
              </div>
            </ScrollArea>
          </template>
          <p v-else class="text-muted-foreground text-xs">
            {{ t('bentoLayout.addDialog.noCatalog') }}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="addDialogOpen = false">
            {{ t('bentoLayout.addDialog.close') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
@keyframes bento-bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

@media (max-width: 768px) {
  .bento-layout {
    padding: 12px;
  }
  .bento-card {
    padding: 14px;
  }
  .bento-card-title-text {
    font-size: 14px;
  }
}

@media (max-width: 1200px) {
  .bento-grid {
    --cols: 10 !important;
  }
}

@media (max-width: 1024px) {
  .bento-grid {
    --cols: 8 !important;
  }
}

@media (max-width: 768px) {
  .bento-grid {
    --cols: 6 !important;
  }
}

@media (max-width: 480px) {
  .bento-grid {
    --cols: 4 !important;
  }
}

.bento-layout {
  --bento-bg: hsl(var(--muted) / 0.35);
  --bento-card-bg: hsl(var(--card));
  --bento-card-border: hsl(var(--border));
  --bento-card-shadow: 0 8px 32px rgb(0 0 0 / 8%);
  --bento-text-primary: hsl(var(--foreground));
  --bento-text-secondary: hsl(var(--muted-foreground));
  --bento-grid-line: hsl(var(--border) / 0.5);
  --bento-accent-blue: #3b82f6;
  --bento-accent-green: #22c55e;
  --bento-accent-orange: #f97316;
  --bento-accent-purple: #a855f7;
  --bento-accent-cyan: #06b6d4;
  --bento-accent-pink: #ec4899;
  --bento-radius: var(--radius, 16px);
  --bento-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  position: relative;
  box-sizing: border-box;
  width: 100%;
  padding: 0;
  background: var(--bento-bg);
}

.bento-layout--dark {
  --bento-card-shadow: 0 8px 32px rgb(0 0 0 / 40%);
}

.bento-container {
  position: relative;
  box-sizing: border-box;
  width: 100%;
}

.bento-grid {
  position: relative;
  box-sizing: border-box;
  width: 100% !important;
  min-height: 0;
  margin: 0;
  overflow: hidden;
  background: var(--bento-bg);
  transition: var(--bento-transition);
}

.bento-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 60%);
  border-radius: var(--bento-radius);
  backdrop-filter: blur(4px);
}

.bento-loading-spinner {
  display: flex;
  gap: 8px;
}

.bento-loading-dot {
  width: 12px;
  height: 12px;
  background: var(--bento-accent-blue);
  border-radius: 50%;
  animation: bento-bounce 1.4s ease-in-out infinite both;
}

.bento-loading-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.bento-loading-dot:nth-child(2) {
  animation-delay: -0.16s;
}

.bento-loading-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--bento-text-primary);
}

.bento-grid-bg {
  position: absolute;
  inset: 0;
  padding: var(--gap);
  pointer-events: none;
  opacity: 0.5;
}

.bento-grid-row {
  display: flex;
  height: var(--row-height);
}

.bento-grid-cell {
  flex: 1;
  margin: 2px;
  border: 1px dashed var(--bento-grid-line);
  border-radius: 4px;
}

.bento-card {
  position: absolute;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
  background: var(--bento-card-bg);
  border: 1px solid var(--bento-card-border);
  border-radius: var(--bento-radius);
  box-shadow: var(--bento-card-shadow);
  transition: var(--bento-transition);
}

.bento-card::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 3px;
  content: '';
  background: var(--bento-accent-blue);
  border-radius: var(--bento-radius) var(--bento-radius) 0 0;
  opacity: 0;
  transition: opacity 0.3s;
}

.bento-card:hover::before {
  opacity: 1;
}

.bento-card--blue::before {
  background: var(--bento-accent-blue);
}
.bento-card--green::before {
  background: var(--bento-accent-green);
}
.bento-card--orange::before {
  background: var(--bento-accent-orange);
}
.bento-card--purple::before {
  background: var(--bento-accent-purple);
}
.bento-card--cyan::before {
  background: var(--bento-accent-cyan);
}
.bento-card--pink::before {
  background: var(--bento-accent-pink);
}

.bento-card--editable {
  cursor: grab;
}

.bento-card--editable:active,
.bento-card--dragging {
  z-index: 50;
  cursor: grabbing;
  box-shadow: 0 16px 48px rgb(0 0 0 / 50%);
  transform: scale(1.02);
}

.bento-card--resizing {
  z-index: 50;
}

.bento-card--static {
  opacity: 0.8;
}

.bento-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--bento-card-border);
}

.bento-card-title-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--bento-text-primary);
}

.bento-card-actions {
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s;
}

.bento-card:hover .bento-card-actions {
  opacity: 1;
}

.bento-card-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--bento-text-secondary);
  cursor: pointer;
  background: hsl(var(--muted) / 0.5);
  border: none;
  border-radius: 6px;
  transition: var(--bento-transition);
}

.bento-card-btn:hover {
  color: var(--bento-text-primary);
}

.bento-card-btn--remove:hover {
  color: #ef4444;
  background: rgb(239 68 68 / 20%);
}

.bento-card-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.bento-card-default-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bento-card-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: hsl(var(--muted) / 0.35);
  border-radius: 8px;
}

.bento-card-info-label {
  font-size: 12px;
  color: var(--bento-text-secondary);
}

.bento-card-info-value {
  font-family: ui-monospace, monospace;
  font-size: 13px;
  font-weight: 500;
  color: var(--bento-text-primary);
}

.bento-resize-handle {
  position: absolute;
  opacity: 0;
  transition: opacity 0.2s;
}

.bento-card:hover .bento-resize-handle {
  opacity: 1;
}

.bento-resize-handle--se {
  right: 4px;
  bottom: 4px;
  width: 16px;
  height: 16px;
  cursor: se-resize;
  background: linear-gradient(135deg, transparent 50%, var(--bento-accent-blue) 50%);
  border-radius: 0 0 8px;
}

.bento-resize-handle--e {
  top: 50%;
  right: 0;
  width: 6px;
  height: 40px;
  cursor: e-resize;
  background: var(--bento-accent-blue);
  border-radius: 3px;
  opacity: 0.3;
  transform: translateY(-50%);
}

.bento-resize-handle--s {
  bottom: 0;
  left: 50%;
  width: 40px;
  height: 6px;
  cursor: s-resize;
  background: var(--bento-accent-blue);
  border-radius: 3px;
  opacity: 0.3;
  transform: translateX(-50%);
}

.bento-resize-handle:hover {
  opacity: 1 !important;
}

.bento-drag-preview {
  position: absolute;
  z-index: 40;
  pointer-events: none;
  background: rgb(59 130 246 / 10%);
  border: 2px dashed var(--bento-accent-blue);
  border-radius: var(--bento-radius);
  transition: all 0.15s ease;
}

.bento-card-enter-active,
.bento-card-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.bento-card-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}

.bento-card-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(-20px);
}
</style>
