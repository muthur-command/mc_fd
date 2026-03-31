/**
 * 按权重从数组中随机取一项（使用传入的 random 以支持 seed）
 */
export function getRandomValueInArr<T>(arr: T[], random: () => number, weightKey: keyof T = 'weight' as keyof T): T {
  const tmpArr: number[] = []
  arr.forEach((el, index) => {
    const w = Number((el as Record<string, unknown>)[weightKey as string]) || 1
    for (let i = 0; i < w; i++) tmpArr.push(index)
  })
  if (tmpArr.length === 0)
    return arr[0]
  for (let i = tmpArr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [tmpArr[i], tmpArr[j]] = [tmpArr[j], tmpArr[i]]
  }
  const randomIndex = Math.floor(random() * tmpArr.length)
  return arr[tmpArr[randomIndex]]
}
