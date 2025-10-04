import { PrismaClient } from '@prisma/client'
import { generateVariantCode } from './variant-utils'

/**
 * 毀損商品調撥工具
 * 處理進貨時的毀損商品，自動調撥到盒損變體（00X）
 */

const DAMAGED_VARIANT_TYPE = '00X' // 盒損變體類型

/**
 * 查找或創建盒損變體
 * @param tx Prisma transaction
 * @param sourceVariantId 來源變體 ID
 * @param userId 操作用戶 ID
 * @returns 盒損變體
 */
export async function findOrCreateDamagedVariant(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  sourceVariantId: string,
  userId: string
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

  // 查找是否已存在相同商品的盒損變體
  let damagedVariant = await tx.productVariant.findFirst({
    where: {
      product_id: sourceVariant.product_id,
      variant_type: DAMAGED_VARIANT_TYPE
    }
  })

  // 如果不存在，創建新的盒損變體
  if (!damagedVariant) {
    const productCode = sourceVariant.product?.product_code || 'P001'
    const variantCode = await generateVariantCode(
      tx,
      sourceVariant.product_id,
      productCode,
      DAMAGED_VARIANT_TYPE
    )
    const sku = `SKU-${variantCode}`

    // 盒損變體價格通常是原價的 80-85%
    const damagedPriceRatio = 0.8
    const basePrice = sourceVariant.base_price * damagedPriceRatio
    const currentPrice = sourceVariant.current_price * damagedPriceRatio
    const costPrice = sourceVariant.cost_price * damagedPriceRatio

    damagedVariant = await tx.productVariant.create({
      data: {
        product_id: sourceVariant.product_id,
        variant_code: variantCode,
        sku,
        variant_type: DAMAGED_VARIANT_TYPE,
        description: `${sourceVariant.product?.name || '商品'} - 盒損版`,
        base_price: basePrice,
        current_price: currentPrice,
        cost_price: costPrice,
        stock_quantity: 0,
        reserved_stock: 0,
        available_stock: 0,
        volume_ml: sourceVariant.volume_ml,
        alcohol_percentage: sourceVariant.alcohol_percentage,
        weight_kg: sourceVariant.weight_kg
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
