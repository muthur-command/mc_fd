import type { LAYER_ID } from './interface/avatar.interface'
import type { LayerItemConfig, LayerListItem } from './interface/layer.interface'

/**
 * Avatar-gen 头像生成核心（基于 wave-charts/avatar-gen 逻辑，支持 seed 确定性）
 * 资源 SVG 在构建时通过 import.meta.glob 打包，无需运行时 fetch
 */
import { layerList } from './config/refs'
import { GenderType } from './interface/avatar.interface'
import { getRandomValueInArr } from './utils/getRandomInArr'
import { createSeededRandom } from './utils/seedRandom'

// 构建时打包所有 SVG（相对本文件路径）
const svgModules = import.meta.glob<{ default: string }>(
  '../../assets/avatar-gen/resource/**/*.svg',
  { query: '?raw', import: 'default', eager: true },
)

/** dir/filename -> SVG 文本，如 "Base/1" -> "<svg>..." */
const svgMap = new Map<string, string>()
for (const [path, mod] of Object.entries(svgModules)) {
  const match = path.match(/resource\/(.+?)\.svg$/i)
  if (match) {
    const key = match[1] // "Base/1" 或 "Ear Ring/Hoop"
    const content = typeof mod === 'string' ? mod : (mod && typeof mod === 'object' && 'default' in mod ? (mod as { default: string }).default : '')
    if (content)
      svgMap.set(key, content)
  }
}

function loadSvg(dir: string, filename: string): string {
  const key = `${dir}/${filename}`
  const content = svgMap.get(key)
  if (!content)
    throw new Error(`Avatar resource not found: ${key}`)
  return content
}

export interface CreateAvatarOptions {
  /** 种子字符串，相同 seed 生成相同头像（useTrueRandom 为 true 时忽略） */
  seed?: string
  /** 输出 SVG 尺寸（viewBox 为 360x360） */
  size?: number
  /** 性别偏好 */
  gender?: GenderType
  /** 为 true 时使用 Math.random() 真随机，不依赖 seed，每次结果不同 */
  useTrueRandom?: boolean
}

/** 生成一张头像，返回 SVG 字符串（同步，无网络请求） */
export function createAvatar(options: CreateAvatarOptions): string {
  const { seed = '', size = 360, gender = GenderType.UNSET, useTrueRandom = false } = options
  const random = useTrueRandom ? () => Math.random() : createSeededRandom(seed || 'default')

  const ls: Array<LayerListItem & { layers: LayerItemConfig[] }> = JSON.parse(
    JSON.stringify(layerList),
  )
  ls.sort((a, b) => a.zIndex - b.zIndex)

  interface LayerPick { id: LAYER_ID, dir: string, layer: LayerItemConfig & { color?: string[] } }
  const filteredLayers = (l: LayerListItem) =>
    l.layers.filter(
      (item: LayerItemConfig) =>
        gender === GenderType.UNSET
        || item.genderType === gender
        || item.genderType === GenderType.UNSET,
    )
  let randomLayerList: LayerPick[] = ls
    .map((l) => {
      const options = filteredLayers(l)
      const layer: LayerItemConfig & { color?: string[] }
        = options.length > 0
          ? getRandomValueInArr(options, random, 'weight') as LayerItemConfig & { color?: string[] }
          : ({ empty: true } as LayerItemConfig & { color?: string[] })
      return { id: l.id, dir: l.dir, layer }
    })
    .filter(({ layer }) => !layer.empty)

  const removeIdList: LAYER_ID[] = randomLayerList.reduce(
    (res, item) => res.concat((item.layer.removeLayers as LAYER_ID[]) || []),
    [] as LAYER_ID[],
  )
  randomLayerList = randomLayerList.filter(({ id }) => !removeIdList.includes(id))

  randomLayerList.forEach(({ layer }) => {
    if (!layer.avaiableColorGroups?.length)
      return
    const group = getRandomValueInArr(layer.avaiableColorGroups, random, 'weight') as { value: string[] }
    layer.color = group.value
  })

  const maxTry = 10
  randomLayerList.forEach(({ layer }) => {
    if (!layer.colorNotSameAs?.length)
      return
    const currentColors = layer.color!
    for (const id of layer.colorNotSameAs) {
      const target = randomLayerList.find(e => e.id === id)
      let tried = 0
      while (target?.layer.color?.[0] === currentColors[0] && tried < maxTry) {
        tried++
        if (target.layer.avaiableColorGroups?.length) {
          const group = getRandomValueInArr(target.layer.avaiableColorGroups, random, 'weight') as { value: string[] }
          target.layer.color = group.value
        }
      }
    }
  })

  randomLayerList.forEach(({ layer }) => {
    if (!layer.colorSameAs)
      return
    const target = randomLayerList.find(e => e.id === layer.colorSameAs!)
    if (target?.layer.color)
      layer.color = target.layer.color
  })

  randomLayerList.forEach(({ layer }) => {
    const L = layer as unknown as Record<string, unknown>
    delete L.avaiableColorGroups
    delete L.genderType
    delete L.weight
    delete L.removeLayers
    delete L.colorNotSameAs
    delete L.colorSameAs
  })

  const groups: string[] = []
  for (const { layer, dir } of randomLayerList) {
    if (!layer.filename)
      continue
    let svgRaw = loadSvg(dir, layer.filename)
    const colors = layer.color || []
    svgRaw = svgRaw.replace(/\{\{color\[(\d+)\]\}\}/g, (_, n) => colors[Number.parseInt(n, 10)] ?? '#ccc')
    const inner = svgRaw.replace(/<svg[^>]*>/i, '').replace(/<\/svg>/i, '').trim()
    groups.push(`<g>${inner}</g>`)
  }

  const svgInner = groups.join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" width="${size}" height="${size}">${svgInner}</svg>`
    .trim()
    .replace(/\n|\t/g, ' ')
  return svg
}
