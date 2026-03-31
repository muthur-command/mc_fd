import type { LayerItemConfig } from '../../interface/layer.interface'

import { GenderType, LAYER_ID } from '../../interface/avatar.interface'
import { avaiableColors } from '../avaiable-colors'

const earConfig: LayerItemConfig[] = [
  {
    genderType: GenderType.UNSET,
    filename: 'Attached',
    weight: 10,
    avaiableColorGroups: avaiableColors[LAYER_ID.EAR],
    colorSameAs: LAYER_ID.BASE,
  },
  {
    genderType: GenderType.UNSET,
    filename: 'Detached',
    weight: 10,
    avaiableColorGroups: avaiableColors[LAYER_ID.EAR],
    colorSameAs: LAYER_ID.BASE,
  },
]
export default earConfig
