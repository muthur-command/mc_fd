import type { LayerItemConfig } from '../../interface/layer.interface'

import { GenderType } from '../../interface/avatar.interface'

const eyeBrowsConfig: LayerItemConfig[] = [
  { genderType: GenderType.UNSET, filename: 'dot', weight: 10 },
  { genderType: GenderType.UNSET, filename: 'Doubt', weight: 10 },
  { genderType: GenderType.FEMAL, filename: 'Eyelashes Down-1', weight: 10 },
  { genderType: GenderType.UNSET, filename: 'Eyelashes Down', weight: 10 },
  { genderType: GenderType.UNSET, filename: 'Eyelashes Up', weight: 10 },
  { genderType: GenderType.UNSET, filename: 'Up', weight: 10 },
]
export default eyeBrowsConfig
