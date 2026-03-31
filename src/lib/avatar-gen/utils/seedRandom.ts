/**
 * 可播种的伪随机数生成器（Mulberry32）
 * 相同 seed 得到相同序列，用于确定性头像生成。
 * 使用 djb2 风格哈希使不同字符串得到更分散的初始状态，提升视觉差异。
 */
export function createSeededRandom(seed: string): () => number {
  let h = 5381
  for (let i = 0; i < seed.length; i++)
    h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0
  return function next() {
    h = Math.imul(h ^ (h >>> 15), h | 0)
    h = Math.imul(h ^ (h >>> 7), h | 0)
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296
  }
}
