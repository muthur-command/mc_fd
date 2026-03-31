import type { LayerItemConfig } from '../../interface/layer.interface'

import { GenderType, LAYER_ID } from '../../interface/avatar.interface'
import { avaiableColors } from '../avaiable-colors'

const baseConfig: LayerItemConfig[] = [
  {
    genderType: GenderType.UNSET,
    filename: '1',
    weight: 10,
    avaiableColorGroups: avaiableColors[LAYER_ID.BASE],
  },
  {
    genderType: GenderType.UNSET,
    filename: 'QY-02',
    weight: 10,
    avaiableColorGroups: avaiableColors[LAYER_ID.BASE],
  },
]
export default baseConfig
