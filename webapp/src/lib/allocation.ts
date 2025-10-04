/**
 * 智能分配算法
 * 用於處理預購單庫存不足時的分配邏輯
 */

export interface PreorderItem {
  saleId: string
  saleNumber: string
  customerName: string
  customerId: string
  quantity: number
  priority?: number // 優先級分數（可選）
  orderDate?: Date // 下單時間（可選）
  isVIP?: boolean // 是否 VIP（可選）
}

export interface AllocationResult {
  saleId: string
  saleNumber: string
  customerName: string
  requestedQuantity: number
  allocatedQuantity: number
  shortageQuantity: number
  fulfillmentRate: number // 滿足率（0-1）
}

export type AllocationStrategy = 'PROPORTIONAL' | 'PRIORITY' | 'FCFS'

/**
 * 按比例分配
 * 每個預購單按照其需求佔總需求的比例來分配庫存
 */
export function allocateProportionally(
  availableStock: number,
  preorders: PreorderItem[]
): AllocationResult[] {
  if (preorders.length === 0) return []

  const totalDemand = preorders.reduce((sum, p) => sum + p.quantity, 0)

  // 如果庫存充足，全部滿足
  if (availableStock >= totalDemand) {
    return preorders.map(p => ({
      saleId: p.saleId,
      saleNumber: p.saleNumber,
      customerName: p.customerName,
      requestedQuantity: p.quantity,
      allocatedQuantity: p.quantity,
      shortageQuantity: 0,
      fulfillmentRate: 1
    }))
  }

  // 庫存不足，按比例分配
  const ratio = availableStock / totalDemand
  let remainingStock = availableStock
  const results: AllocationResult[] = []

  // 先計算每個人應該得到多少（可能有小數）
  const allocations = preorders.map(p => ({
    ...p,
    exactAllocation: p.quantity * ratio
  }))

  // 整數分配（向下取整）
  allocations.forEach(p => {
    const allocated = Math.floor(p.exactAllocation)
    results.push({
      saleId: p.saleId,
      saleNumber: p.saleNumber,
      customerName: p.customerName,
      requestedQuantity: p.quantity,
      allocatedQuantity: allocated,
      shortageQuantity: p.quantity - allocated,
      fulfillmentRate: allocated / p.quantity
    })
    remainingStock -= allocated
  })

  // 將剩餘的庫存分配給小數部分最大的訂單
  if (remainingStock > 0) {
    const fractionalParts = allocations.map((p, index) => ({
      index,
      fraction: p.exactAllocation - Math.floor(p.exactAllocation)
    }))

    // 按小數部分排序（大到小）
    fractionalParts.sort((a, b) => b.fraction - a.fraction)

    // 分配剩餘庫存
    for (let i = 0; i < remainingStock && i < fractionalParts.length; i++) {
      const idx = fractionalParts[i].index
      results[idx].allocatedQuantity += 1
      results[idx].shortageQuantity -= 1
      results[idx].fulfillmentRate = results[idx].allocatedQuantity / results[idx].requestedQuantity
    }
  }

  return results
}

/**
 * 按優先級分配（VIP 優先）
 * 計算每個預購單的優先級分數，從高到低依序滿足
 */
export function allocateByPriority(
  availableStock: number,
  preorders: PreorderItem[]
): AllocationResult[] {
  if (preorders.length === 0) return []

  // 計算優先級分數
  const scoredPreorders = preorders.map(p => {
    let score = p.priority || 0

    // VIP 加分
    if (p.isVIP) {
      score += 100
    }

    // 下單時間早加分（每早一天加 0.1 分）
    if (p.orderDate) {
      const daysAgo = Math.floor((Date.now() - p.orderDate.getTime()) / (1000 * 60 * 60 * 24))
      score += daysAgo * 0.1
    }

    return { ...p, score }
  })

  // 按分數排序（高到低）
  scoredPreorders.sort((a, b) => b.score - a.score)

  // 從高分到低分依序分配
  let remainingStock = availableStock
  const results: AllocationResult[] = []

  for (const p of scoredPreorders) {
    const allocated = Math.min(p.quantity, remainingStock)
    results.push({
      saleId: p.saleId,
      saleNumber: p.saleNumber,
      customerName: p.customerName,
      requestedQuantity: p.quantity,
      allocatedQuantity: allocated,
      shortageQuantity: p.quantity - allocated,
      fulfillmentRate: allocated / p.quantity
    })
    remainingStock -= allocated

    if (remainingStock <= 0) {
      // 庫存用完，剩餘訂單全部缺貨
      break
    }
  }

  // 補充沒有分配到的訂單（全部缺貨）
  const allocatedIds = new Set(results.map(r => r.saleId))
  for (const p of preorders) {
    if (!allocatedIds.has(p.saleId)) {
      results.push({
        saleId: p.saleId,
        saleNumber: p.saleNumber,
        customerName: p.customerName,
        requestedQuantity: p.quantity,
        allocatedQuantity: 0,
        shortageQuantity: p.quantity,
        fulfillmentRate: 0
      })
    }
  }

  return results
}

/**
 * FCFS（First Come First Served）先到先得
 * 按下單時間排序，先下單的先滿足
 */
export function allocateFCFS(
  availableStock: number,
  preorders: PreorderItem[]
): AllocationResult[] {
  if (preorders.length === 0) return []

  // 按下單時間排序（早到晚）
  const sorted = [...preorders].sort((a, b) => {
    if (!a.orderDate) return 1
    if (!b.orderDate) return -1
    return a.orderDate.getTime() - b.orderDate.getTime()
  })

  // 從早到晚依序滿足
  let remainingStock = availableStock
  const results: AllocationResult[] = []

  for (const p of sorted) {
    const allocated = Math.min(p.quantity, remainingStock)
    results.push({
      saleId: p.saleId,
      saleNumber: p.saleNumber,
      customerName: p.customerName,
      requestedQuantity: p.quantity,
      allocatedQuantity: allocated,
      shortageQuantity: p.quantity - allocated,
      fulfillmentRate: allocated / p.quantity
    })
    remainingStock -= allocated

    if (remainingStock <= 0) {
      break
    }
  }

  // 補充沒有分配到的訂單
  const allocatedIds = new Set(results.map(r => r.saleId))
  for (const p of preorders) {
    if (!allocatedIds.has(p.saleId)) {
      results.push({
        saleId: p.saleId,
        saleNumber: p.saleNumber,
        customerName: p.customerName,
        requestedQuantity: p.quantity,
        allocatedQuantity: 0,
        shortageQuantity: p.quantity,
        fulfillmentRate: 0
      })
    }
  }

  return results
}

/**
 * 主分配函數
 * 根據策略選擇相應的分配算法
 */
export function allocateStock(
  availableStock: number,
  preorders: PreorderItem[],
  strategy: AllocationStrategy = 'PROPORTIONAL'
): AllocationResult[] {
  switch (strategy) {
    case 'PROPORTIONAL':
      return allocateProportionally(availableStock, preorders)
    case 'PRIORITY':
      return allocateByPriority(availableStock, preorders)
    case 'FCFS':
      return allocateFCFS(availableStock, preorders)
    default:
      return allocateProportionally(availableStock, preorders)
  }
}

/**
 * 計算分配統計
 */
export function getAllocationStats(results: AllocationResult[]) {
  const totalRequested = results.reduce((sum, r) => sum + r.requestedQuantity, 0)
  const totalAllocated = results.reduce((sum, r) => sum + r.allocatedQuantity, 0)
  const totalShortage = results.reduce((sum, r) => sum + r.shortageQuantity, 0)

  const fullyFulfilled = results.filter(r => r.fulfillmentRate === 1).length
  const partiallyFulfilled = results.filter(r => r.fulfillmentRate > 0 && r.fulfillmentRate < 1).length
  const notFulfilled = results.filter(r => r.fulfillmentRate === 0).length

  return {
    totalRequested,
    totalAllocated,
    totalShortage,
    fullyFulfilled,
    partiallyFulfilled,
    notFulfilled,
    overallFulfillmentRate: totalAllocated / totalRequested
  }
}
