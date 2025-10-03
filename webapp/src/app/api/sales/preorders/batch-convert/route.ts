import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

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

    // 查詢所有預購單
    const sales = await prisma.sale.findMany({
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

    if (sales.length === 0) {
      return NextResponse.json({ error: '找不到可轉換的預購單' }, { status: 404 })
    }

    const results = {
      success: [] as any[],
      failed: [] as any[],
      warnings: [] as any[]
    }

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
            const aVariant = await prisma.productVariant.findFirst({
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
          const inventories = await prisma.inventory.findMany({
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

        // 執行轉換（使用 transaction）
        await prisma.$transaction(async (tx) => {
          // 1. 更新訂單狀態
          await tx.sale.update({
            where: { id: sale.id },
            data: {
              status: 'CONFIRMED',
              confirmed_at: new Date(),
              confirmed_by: session.user.id,
              converted_at: new Date(),
              converted_by: session.user.id
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

            // 預留庫存（從 available 移到 reserved）
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
        })

        // 轉換成功
        const result: any = {
          saleId: sale.id,
          saleNumber: sale.sale_number,
          customer: sale.customer.name,
          itemCount: sale.items.length
        }

        if (stockCheckWarnings.length > 0) {
          result.warnings = stockCheckWarnings
          results.warnings.push(result)
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
      { error: '批次轉換失敗', details: error },
      { status: 500 }
    )
  }
}
