import type { LayerItemConfig } from '../../interface/layer.interface'

import { GenderType } from '../../interface/avatar.interface'

const earRingConfig: LayerItemConfig[] = [
  { genderType: GenderType.UNSET, filename: 'Hoop', weight: 10 },
  { genderType: GenderType.UNSET, filename: 'Stud', weight: 10 },
  { genderType: GenderType.UNSET, empty: true, weight: 100 },
]
export default earRingConfig
