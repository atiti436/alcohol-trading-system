import { PrismaClient } from '@prisma/client'

/**
 * 自動轉換預購單為已確認訂單
 * 當進貨收貨完成時，自動檢查並轉換相關的預購單
 */

interface ConvertResult {
  success: Array<{
    saleId: string
    saleNumber: string
    customer: string
    itemCount: number
    warnings?: string[]
  }>
  failed: Array<{
    saleId: string
    saleNumber: string
    customer: string
    errors: string[]
  }>
  warnings: Array<{
    saleId: string
    saleNumber: string
    customer: string
    itemCount: number
    warnings: string[]
  }>
}

/**
 * 自動轉換預購單
 * @param tx Prisma transaction 實例
 * @param userId 執行轉換的用戶 ID
 * @param variantIds 可選：僅轉換包含這些變體的預購單（用於進貨時的精準轉換）
 * @returns 轉換結果統計
 */
export async function autoConvertPreorders(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  userId: string,
  variantIds?: string[]
): Promise<ConvertResult> {

  const results: ConvertResult = {
    success: [],
    failed: [],
    warnings: []
  }

  // 查詢所有預購單
  const whereClause: any = {
    status: 'PREORDER'
  }

  // 如果指定了變體 ID，只查找包含這些變體的預購單
  if (variantIds && variantIds.length > 0) {
    whereClause.items = {
      some: {
        product: {
          variants: {
            some: {
              id: { in: variantIds }
            }
          }
        }
      }
    }
  }

  const sales = await tx.sale.findMany({
    where: whereClause,
    include: {
      customer: true,
      items: {
        include: {
          product: true,
          variant: true
        }
      }
    }
  })

  // 逐一處理每張預購單
  for (const sale of sales) {
    try {
      const stockCheckErrors: string[] = []
      const stockCheckWarnings: string[] = []

      // 檢查每個商品的庫存
      for (const item of sale.items) {
        let variantIdToUse = item.variant_id

        // 如果沒有指定變體，自動選擇 A 版
        if (!variantIdToUse) {
          const aVariant = await tx.productVariant.findFirst({
            where: {
              product_id: item.product_id,
              variant_type: 'A'
            }
          })

          if (!aVariant) {
            stockCheckErrors.push(`商品 ${item.product.name} 沒有可用的 A 版變體`)
            continue
          }

          variantIdToUse = aVariant.id
          stockCheckWarnings.push(
            `商品 ${item.product.name} 自動選擇 A 版變體（${aVariant.variant_code}）`
          )
        }

        // 檢查庫存
        const inventories = await tx.inventory.findMany({
          where: { variant_id: variantIdToUse },
          select: { available: true }
        })

        const availableStock = inventories.reduce((sum, inv) => sum + inv.available, 0)

        if (availableStock < item.quantity) {
          stockCheckErrors.push(
            `商品 ${item.product.name} 庫存不足（需要 ${item.quantity}，可用 ${availableStock}）`
          )
        }
      }

      // 如果有庫存錯誤，標記為失敗
      if (stockCheckErrors.length > 0) {
        results.failed.push({
          saleId: sale.id,
          saleNumber: sale.sale_number,
          customer: sale.customer.name,
          errors: stockCheckErrors
        })
        continue
      }

      // 執行轉換
      // 1. 更新訂單狀態
      await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: 'CONFIRMED',
          confirmed_at: new Date(),
          confirmed_by: userId,
          converted_at: new Date(),
          converted_by: userId
        }
      })

      // 2. 預留庫存
      for (const item of sale.items) {
        let variantIdToUse = item.variant_id

        // 如果沒有變體，使用 A 版
        if (!variantIdToUse) {
          const aVariant = await tx.productVariant.findFirst({
            where: {
              product_id: item.product_id,
              variant_type: 'A'
            }
          })
          variantIdToUse = aVariant!.id

          // 更新 SaleItem 的 variant_id
          await tx.saleItem.update({
            where: { id: item.id },
            data: { variant_id: variantIdToUse }
          })
        }

        // 預留庫存（從 available 移到 reserved）- FIFO 策略
        let remainingToReserve = item.quantity

        const inventories = await tx.inventory.findMany({
          where: {
            variant_id: variantIdToUse,
            available: { gt: 0 }
          },
          orderBy: { created_at: 'asc' } // FIFO
        })

        for (const inv of inventories) {
          if (remainingToReserve <= 0) break

          const toReserve = Math.min(inv.available, remainingToReserve)

          await tx.inventory.update({
            where: { id: inv.id },
            data: {
              available: inv.available - toReserve,
              reserved: inv.reserved + toReserve
            }
          })

          remainingToReserve -= toReserve
        }
      }

      // 轉換成功
      const result = {
        saleId: sale.id,
        saleNumber: sale.sale_number,
        customer: sale.customer.name,
        itemCount: sale.items.length
      }

      if (stockCheckWarnings.length > 0) {
        results.warnings.push({
          ...result,
          warnings: stockCheckWarnings
        })
      } else {
        results.success.push(result)
      }

    } catch (error) {
      console.error(`轉換訂單 ${sale.sale_number} 失敗:`, error)
      results.failed.push({
        saleId: sale.id,
        saleNumber: sale.sale_number,
        customer: sale.customer.name,
        errors: ['系統錯誤，請稍後再試']
      })
    }
  }

  return results
}

/**
 * 根據產品 ID 查找相關的變體 ID
 */
export async function getVariantIdsByProductIds(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  productIds: string[]
): Promise<string[]> {
  const variants = await tx.productVariant.findMany({
    where: {
      product_id: { in: productIds }
    },
    select: {
      id: true
    }
  })

  return variants.map(v => v.id)
}
