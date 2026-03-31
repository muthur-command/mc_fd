import type { LayerItemConfig } from '../../interface/layer.interface'

import { GenderType } from '../../interface/avatar.interface'

const glassesConfig: LayerItemConfig[] = [
  { genderType: GenderType.UNSET, filename: 'egg', weight: 5 },
  { genderType: GenderType.UNSET, filename: 'Round-1', weight: 10 },
  { genderType: GenderType.UNSET, filename: 'Round', weight: 10 },
  { genderType: GenderType.UNSET, filename: 'star', weight: 5 },
  { genderType: GenderType.UNSET, empty: true, weight: 60 },
]
export default glassesConfig
