import { PrismaClient } from '@prisma/client'

/**
 * 毀損商品調撥工具
 * 處理進貨時的毀損商品，自動調撥到盒損變體（variant_code 後綴 -D）
 *
 * 範例：
 * - 來源變體：P0001-001 "700ML 43% 標準版" → 盒損變體：P0001-001-D "盒損-700ML 43% 標準版"
 * - 來源變體：P0001-002 "限量版" → 盒損變體：P0001-002-D "盒損-限量版"
 */

export const DAMAGE_SUFFIX = '-D' // 盒損變體後綴
export const DAMAGE_PREFIX = '盒損-' // 盒損變體類型前綴
export const DEFAULT_DAMAGE_RATIO = 0.8 // 預設折扣 80%（建議價，可手動調整）

/**
 * 檢查變體是否為盒損變體
 */
export function isDamagedVariant(variantCode: string): boolean {
  return variantCode.endsWith(DAMAGE_SUFFIX)
}

/**
 * 從盒損變體取得來源變體代碼
 */
export function getSourceVariantCode(damagedVariantCode: string): string | null {
  if (!isDamagedVariant(damagedVariantCode)) {
    return null
  }
  return damagedVariantCode.slice(0, -DAMAGE_SUFFIX.length)
}

/**
 * 查找或創建盒損變體
 * @param tx Prisma transaction
 * @param sourceVariantId 來源變體 ID
 * @param userId 操作用戶 ID
 * @param customPriceRatio 自訂價格折扣比例（可選，預設 0.8）
 * @returns 盒損變體
 */
export async function findOrCreateDamagedVariant(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  sourceVariantId: string,
  userId: string,
  customPriceRatio?: number
) {
  // 查找來源變體
  const sourceVariant = await tx.productVariant.findUnique({
    where: { id: sourceVariantId },
    include: {
      product: true
    }
  })

  if (!sourceVariant) {
    throw new Error(`找不到來源變體: ${sourceVariantId}`)
  }

  // 🎯 重點：variant_code 直接從來源變體衍生
  const damagedVariantCode = `${sourceVariant.variant_code}${DAMAGE_SUFFIX}`

  // 查找是否已存在該盒損變體
  let damagedVariant = await tx.productVariant.findUnique({
    where: { variant_code: damagedVariantCode }
  })

  // 如果不存在，創建新的盒損變體
  if (!damagedVariant) {
    const sku = `SKU-${damagedVariantCode}`

    // 價格折扣比例（可自訂，預設 80%）
    const priceRatio = customPriceRatio ?? DEFAULT_DAMAGE_RATIO

    // 計算盒損價格
    const basePrice = (sourceVariant.base_price || 0) * priceRatio
    const currentPrice = sourceVariant.current_price * priceRatio
    const costPrice = sourceVariant.cost_price * priceRatio
    const investorPrice = sourceVariant.investor_price * priceRatio
    const actualPrice = sourceVariant.actual_price * priceRatio

    // 🎯 variant_type 加上「盒損」前綴
    const damagedVariantType = sourceVariant.variant_type
      ? `${DAMAGE_PREFIX}${sourceVariant.variant_type}`
      : '盒損'

    damagedVariant = await tx.productVariant.create({
      data: {
        product_id: sourceVariant.product_id,
        variant_code: damagedVariantCode,
        sku,
        variant_type: damagedVariantType,
        description: `${sourceVariant.description} (盒損)`,

        // 價格（建議價，可後續手動調整）
        base_price: basePrice,
        current_price: currentPrice,
        cost_price: costPrice,
        investor_price: investorPrice,
        actual_price: actualPrice,

        // 庫存初始為 0
        stock_quantity: 0,
        reserved_stock: 0,
        available_stock: 0,

        // 規格完全相同
        volume_ml: sourceVariant.volume_ml,
        alc_percentage: sourceVariant.alc_percentage,
        weight_kg: sourceVariant.weight_kg,
        package_weight_kg: sourceVariant.package_weight_kg,
        total_weight_kg: sourceVariant.total_weight_kg,
        has_box: sourceVariant.has_box,
        has_accessories: sourceVariant.has_accessories,
        accessory_weight_kg: sourceVariant.accessory_weight_kg,
        accessories: sourceVariant.accessories,
        hs_code: sourceVariant.hs_code,
        supplier: sourceVariant.supplier,
        manufacturing_date: sourceVariant.manufacturing_date,
        expiry_date: sourceVariant.expiry_date,
        discount_rate: sourceVariant.discount_rate,
        limited_edition: sourceVariant.limited_edition,
        production_year: sourceVariant.production_year,
        condition: 'Damaged' // 狀態標記為損壞
      }
    })
  }

  return damagedVariant
}

/**
 * 執行毀損商品調撥
 * @param tx Prisma transaction
 * @param sourceVariantId 來源變體 ID
 * @param damagedQuantity 毀損數量
 * @param userId 操作用戶 ID
 * @param referenceId 參考 ID（例如進貨單 ID）
 * @param notes 備註
 * @returns 調撥結果
 */
export async function transferDamagedGoods(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  sourceVariantId: string,
  damagedQuantity: number,
  userId: string,
  referenceId?: string,
  notes?: string
) {
  if (damagedQuantity <= 0) {
    throw new Error('毀損數量必須大於 0')
  }

  // 查找或創建盒損變體
  const damagedVariant = await findOrCreateDamagedVariant(tx, sourceVariantId, userId)

  // 從來源變體扣除（註：這裡假設來源變體庫存已經包含毀損數量）
  // 實際上，毀損調撥通常在收貨時進行，所以不需要從來源扣除
  // 我們只需要將毀損數量加到盒損變體

  // 更新盒損變體庫存
  await tx.productVariant.update({
    where: { id: damagedVariant.id },
    data: {
      stock_quantity: { increment: damagedQuantity },
      available_stock: { increment: damagedQuantity }
    }
  })

  // 查找或創建盒損變體的公司倉庫存記錄
  let damagedInventory = await tx.inventory.findFirst({
    where: {
      variant_id: damagedVariant.id,
      warehouse: 'COMPANY'
    }
  })

  const costPrice = damagedVariant.cost_price || 0

  if (!damagedInventory) {
    damagedInventory = await tx.inventory.create({
      data: {
        variant_id: damagedVariant.id,
        warehouse: 'COMPANY',
        quantity: damagedQuantity,
        reserved: 0,
        available: damagedQuantity,
        cost_price: costPrice
      }
    })
  } else {
    await tx.inventory.update({
      where: { id: damagedInventory.id },
      data: {
        quantity: { increment: damagedQuantity },
        available: { increment: damagedQuantity }
      }
    })
  }

  // 建立庫存異動記錄
  await tx.inventoryMovement.create({
    data: {
      variant_id: damagedVariant.id,
      movement_type: 'DAMAGE_TRANSFER',
      adjustment_type: 'ADD',
      quantity_before: damagedInventory.quantity - damagedQuantity,
      quantity_change: damagedQuantity,
      quantity_after: damagedInventory.quantity,
      unit_cost: costPrice,
      total_cost: costPrice * damagedQuantity,
      reason: `進貨毀損調撥 - ${notes || '盒損商品'}`,
      reference_type: referenceId ? 'PURCHASE' : undefined,
      reference_id: referenceId,
      notes: `來源變體: ${sourceVariantId}, 毀損數量: ${damagedQuantity}`,
      warehouse: 'COMPANY',
      created_by: userId
    }
  })

  return {
    damagedVariant,
    transferredQuantity: damagedQuantity,
    damagedVariantCode: damagedVariant.variant_code,
    message: `已將 ${damagedQuantity} 個毀損商品調撥到盒損變體 ${damagedVariant.variant_code}`
  }
}

/**
 * 批量調撥毀損商品（用於多個商品的進貨單）
 */
export async function transferMultipleDamagedGoods(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  transfers: Array<{
    variantId: string
    quantity: number
  }>,
  userId: string,
  referenceId?: string
) {
  const results = []

  for (const transfer of transfers) {
    const result = await transferDamagedGoods(
      tx,
      transfer.variantId,
      transfer.quantity,
      userId,
      referenceId,
      '進貨毀損'
    )
    results.push(result)
  }

  return results
}
