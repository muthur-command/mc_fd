/**
 * Bento 网格项：可关联 card 插件中的卡片 ID（cardId）
 */
export interface BentoLayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
  title?: string
  /** 关联「卡片管理」中的卡片主键 */
  cardId?: number
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
  static?: boolean
  icon?: string
  color?: string
}

export interface DragState {
  isDragging: boolean
  isResizing: boolean
  startX: number
  startY: number
  originalItem: BentoLayoutItem | null
  resizeDirection?: 'e' | 'n' | 'ne' | 'nw' | 's' | 'se' | 'sw' | 'w'
}

export interface BentoLayoutResponse {
  success: boolean
  message?: string
  data?: {
    layout: BentoLayoutItem[]
    pageId: string
    timestamp: number
  }
}
