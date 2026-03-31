import type { GenderType, LAYER_ID } from './avatar.interface'
import type { ColorGroup } from './color.interface'

export interface LayerItemConfig {
  genderType: GenderType
  weight: number
  filename?: string
  empty?: boolean
  avaiableColorGroups?: ColorGroup[]
  colorSameAs?: LAYER_ID
  removeLayers?: LAYER_ID[]
  colorNotSameAs?: LAYER_ID[]
  congratulate?: boolean
}

export interface LayerListItem {
  id: LAYER_ID
  dir: string
  zIndex: number
  layers: LayerItemConfig[]
  description?: string
}
