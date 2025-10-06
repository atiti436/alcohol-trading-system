/**
 * 酒類重量計算工具
 * 用於推估空瓶重量和計算酒液重量
 */

/**
 * 計算酒液重量（根據容量和酒精度）
 * @param volumeMl 容量（毫升）
 * @param alcPercentage 酒精度（百分比）
 * @returns 酒液重量（克）
 */
export function calculateLiquidWeight(volumeMl: number, alcPercentage: number): number {
  if (!volumeMl || !alcPercentage) return 0

  // 酒精比重 = 0.789 g/ml
  // 水的比重 = 1.0 g/ml
  const alcoholRatio = alcPercentage / 100
  const waterRatio = 1 - alcoholRatio

  // 計算混合比重
  const density = (alcoholRatio * 0.789) + (waterRatio * 1.0)

  // 計算酒液重量
  return Math.round(volumeMl * density)
}

/**
 * 空瓶重量參考表
 */
export const BOTTLE_WEIGHT_REFERENCE: Record<number, { min: number; max: number; average: number; type: string }> = {
  // 威士忌標準瓶
  700: { min: 450, max: 550, average: 500, type: '威士忌標準瓶' },
  750: { min: 500, max: 600, average: 550, type: '威士忌標準瓶' },
  1000: { min: 600, max: 800, average: 700, type: '威士忌大瓶' },

  // 紅酒瓶（較輕）
  750: { min: 400, max: 500, average: 450, type: '紅酒瓶' },

  // 日本酒瓶
  720: { min: 550, max: 650, average: 600, type: '日本酒標準瓶' },
  1800: { min: 900, max: 1200, average: 1050, type: '日本酒一升瓶' },

  // 小容量
  375: { min: 300, max: 400, average: 350, type: '半瓶裝' },
  500: { min: 400, max: 500, average: 450, type: '中瓶裝' },
}

/**
 * 根據容量推估空瓶重量
 * @param volumeMl 容量（毫升）
 * @returns 推估的空瓶重量（克）及參考範圍
 */
export function estimateBottleWeight(volumeMl: number): {
  average: number;
  min: number;
  max: number;
  type: string;
  isEstimated: boolean;
} {
  // 1. 嘗試精確匹配
  if (BOTTLE_WEIGHT_REFERENCE[volumeMl]) {
    return {
      ...BOTTLE_WEIGHT_REFERENCE[volumeMl],
      isEstimated: false
    }
  }

  // 2. 找最接近的容量
  const volumes = Object.keys(BOTTLE_WEIGHT_REFERENCE).map(Number).sort((a, b) => a - b)
  let closestVolume = volumes[0]
  let minDiff = Math.abs(volumeMl - closestVolume)

  for (const vol of volumes) {
    const diff = Math.abs(volumeMl - vol)
    if (diff < minDiff) {
      minDiff = diff
      closestVolume = vol
    }
  }

  // 3. 根據最接近的容量線性插值
  const ref = BOTTLE_WEIGHT_REFERENCE[closestVolume]
  const ratio = volumeMl / closestVolume

  return {
    average: Math.round(ref.average * ratio),
    min: Math.round(ref.min * ratio),
    max: Math.round(ref.max * ratio),
    type: `推估值（基於${closestVolume}ml）`,
    isEstimated: true
  }
}

/**
 * 獲取所有參考容量列表（用於顯示參考表）
 */
export function getBottleWeightReferenceList(): Array<{
  volume: number;
  weight: { min: number; max: number; average: number };
  type: string;
}> {
  return Object.entries(BOTTLE_WEIGHT_REFERENCE).map(([volume, data]) => ({
    volume: Number(volume),
    weight: { min: data.min, max: data.max, average: data.average },
    type: data.type
  }))
}
