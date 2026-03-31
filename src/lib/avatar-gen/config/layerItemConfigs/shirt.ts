import type { LayerItemConfig } from '../../interface/layer.interface'

import { GenderType, LAYER_ID } from '../../interface/avatar.interface'
import { avaiableColors } from '../avaiable-colors'

const shirtConfig: LayerItemConfig[] = [
  { filename: 'chocker', genderType: GenderType.UNSET, avaiableColorGroups: avaiableColors[LAYER_ID.SHIRT], colorNotSameAs: [LAYER_ID.BACKGROUND], weight: 10 },
  { filename: 'Collared', genderType: GenderType.UNSET, avaiableColorGroups: avaiableColors[LAYER_ID.SHIRT], colorNotSameAs: [LAYER_ID.BACKGROUND], weight: 10 },
  { filename: 'Crew', genderType: GenderType.UNSET, avaiableColorGroups: avaiableColors[LAYER_ID.SHIRT], colorNotSameAs: [LAYER_ID.BACKGROUND], weight: 10 },
  { filename: 'Leisure', genderType: GenderType.UNSET, avaiableColorGroups: avaiableColors[LAYER_ID.SHIRT], colorNotSameAs: [LAYER_ID.BACKGROUND], weight: 10 },
  { filename: 'Open', genderType: GenderType.UNSET, avaiableColorGroups: avaiableColors[LAYER_ID.SHIRT], colorNotSameAs: [LAYER_ID.BACKGROUND], weight: 10 },
]
export default shirtConfig
