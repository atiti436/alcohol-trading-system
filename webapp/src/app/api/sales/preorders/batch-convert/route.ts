import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { autoConvertPreorders } from '@/lib/preorder-auto-convert'

export const dynamic = 'force-dynamic'

/**
 * 批次轉換預購單為正式訂單
 * POST /api/sales/preorders/batch-convert
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const { saleIds } = await request.json()

    if (!saleIds || !Array.isArray(saleIds) || saleIds.length === 0) {
      return NextResponse.json({ error: '請選擇要轉換的預購單' }, { status: 400 })
    }

    // 使用 transaction 確保一致性
    const results = await prisma.$transaction(async (tx) => {
      // 先驗證選中的訂單都是預購單
      const sales = await tx.sale.findMany({
        where: {
          id: { in: saleIds },
          status: 'PREORDER'
        }
      })

      if (sales.length === 0) {
        throw new Error('找不到可轉換的預購單')
      }

      if (sales.length < saleIds.length) {
        console.warn(`部分訂單不是預購狀態：要求 ${saleIds.length} 筆，找到 ${sales.length} 筆`)
      }

      // 調用共用的自動轉換函數
      // 注意：這裡不傳 variantIds，因為要轉換用戶選擇的特定訂單
      // 所以我們需要稍微修改邏輯：直接傳入 saleIds
      return await autoConvertPreordersBySaleIds(tx, session.user.id, saleIds)
    })

    return NextResponse.json({
      success: true,
      data: results,
      summary: {
        total: saleIds.length,
        success: results.success.length + results.warnings.length,
        failed: results.failed.length
      }
    })

  } catch (error) {
    console.error('批次轉換失敗:', error)
    return NextResponse.json(
      {
        error: '批次轉換失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
}

/**
 * 根據 Sale IDs 轉換預購單（用於批次轉換）
 */
async function autoConvertPreordersBySaleIds(
  tx: any,
  userId: string,
  saleIds: string[]
) {
  const results = {
    success: [] as any[],
    failed: [] as any[],
    warnings: [] as any[]
  }

  const sales = await tx.sale.findMany({
    where: {
      id: { in: saleIds },
      status: 'PREORDER'
    },
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

        // 如果沒有指定變體，自動選擇優先變體（非盒損）
        if (!variantIdToUse) {
          const availableVariants = await tx.productVariant.findMany({
            where: {
              product_id: item.product_id,
              is_active: true
            },
            orderBy: {
              variant_code: 'asc'
            }
          })

          // 過濾掉盒損變體
          const normalVariants = availableVariants.filter(v => !v.variant_code.endsWith('-D'))

          if (normalVariants.length === 0) {
            stockCheckErrors.push(`商品 ${item.product.name} 沒有可用的正常變體`)
            continue
          }

          const selectedVariant = normalVariants[0]
          variantIdToUse = selectedVariant.id
          stockCheckWarnings.push(
            `商品 ${item.product.name} 自動選擇變體（${selectedVariant.variant_code} - ${selectedVariant.variant_type}）`
          )
        }

        // 檢查庫存
        const inventories = await tx.inventory.findMany({
          where: { variant_id: variantIdToUse },
          select: { available: true }
        })

        const availableStock = inventories.reduce((sum: number, inv: any) => sum + inv.available, 0)

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

        // 如果沒有變體，使用優先變體（已在前面檢查過，這裡一定有）
        if (!variantIdToUse) {
          const availableVariants = await tx.productVariant.findMany({
            where: {
              product_id: item.product_id,
              is_active: true
            },
            orderBy: { variant_code: 'asc' }
          })
          const normalVariants = availableVariants.filter(v => !v.variant_code.endsWith('-D'))
          variantIdToUse = normalVariants[0]!.id

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
