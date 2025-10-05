import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

export const dynamic = 'force-dynamic'

/**
 * 執行預購單分配 API
 * POST /api/sales/preorders/execute-allocation
 *
 * 根據分配結果執行實際的訂單狀態更新和庫存預留
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const {
      variantId,
      allocations // Array<{ saleId, allocatedQuantity, shortageQuantity }>
    } = await request.json()

    if (!variantId || !allocations || !Array.isArray(allocations)) {
      return NextResponse.json({ error: '請提供有效的分配數據' }, { status: 400 })
    }

    const results = {
      confirmed: [] as any[],
      partiallyConfirmed: [] as any[],
      backorders: [] as any[],
      errors: [] as any[]
    }

    // 使用 transaction 確保資料一致性
    await prisma.$transaction(async (tx) => {
      for (const allocation of allocations) {
        try {
          const { saleId, allocatedQuantity, shortageQuantity } = allocation

          // 查詢訂單
          const sale = await tx.sale.findUnique({
            where: { id: saleId },
            include: {
              customer: true,
              items: {
                where: { variant_id: variantId }
              }
            }
          })

          if (!sale) {
            results.errors.push({
              saleId,
              error: '訂單不存在'
            })
            continue
          }

          if (sale.status !== 'PREORDER') {
            results.errors.push({
              saleId,
              saleNumber: sale.sale_number,
              error: `訂單狀態為 ${sale.status}，無法分配`
            })
            continue
          }

          // ⚠️ 暫時註解：Production 資料庫缺少 Inventory 表
          // TODO: 執行 prisma db push 後取消註解
          /*
          // 如果分配數量 > 0，預留庫存
          if (allocatedQuantity > 0) {
            // 預留庫存（FIFO）
            let remainingToReserve = allocatedQuantity

            const inventories = await tx.inventory.findMany({
              where: {
                variant_id: variantId,
                available: { gt: 0 }
              },
              orderBy: { created_at: 'asc' }
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

            if (remainingToReserve > 0) {
              results.errors.push({
                saleId,
                saleNumber: sale.sale_number,
                error: `庫存不足，無法預留 ${remainingToReserve} 個`
              })
              continue
            }
          }
          */

          // 更新訂單狀態
          const isFullyFulfilled = shortageQuantity === 0
          const newStatus = isFullyFulfilled ? 'CONFIRMED' : 'PARTIALLY_CONFIRMED'

          await tx.sale.update({
            where: { id: saleId },
            data: {
              status: newStatus,
              confirmed_at: new Date(),
              confirmed_by: session.user.id,
              allocated_quantity: allocatedQuantity,
              shortage_quantity: shortageQuantity,
              allocation_notes: isFullyFulfilled
                ? '完全滿足'
                : `部分滿足：分配 ${allocatedQuantity}，缺 ${shortageQuantity}`
            }
          })

          // 如果有缺貨，建立 BACKORDER 記錄
          if (shortageQuantity > 0) {
            const backorder = await tx.backorderTracking.create({
              data: {
                sale_id: saleId,
                variant_id: variantId,
                shortage_quantity: shortageQuantity,
                priority: sale.allocation_priority || 50,
                status: 'PENDING',
                notes: `自動分配建立 - 原需求 ${allocatedQuantity + shortageQuantity}，已分配 ${allocatedQuantity}`
              }
            })

            results.backorders.push({
              saleId,
              saleNumber: sale.sale_number,
              customerName: sale.customer.name,
              shortageQuantity,
              backorderId: backorder.id
            })
          }

          // 記錄到結果
          if (isFullyFulfilled) {
            results.confirmed.push({
              saleId,
              saleNumber: sale.sale_number,
              customerName: sale.customer.name,
              allocatedQuantity
            })
          } else {
            results.partiallyConfirmed.push({
              saleId,
              saleNumber: sale.sale_number,
              customerName: sale.customer.name,
              allocatedQuantity,
              shortageQuantity
            })
          }

        } catch (error) {
          console.error(`處理訂單 ${allocation.saleId} 失敗:`, error)
          results.errors.push({
            saleId: allocation.saleId,
            error: error instanceof Error ? error.message : '未知錯誤'
          })
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `分配完成：${results.confirmed.length} 筆完全滿足，${results.partiallyConfirmed.length} 筆部分滿足`,
      data: results,
      summary: {
        confirmed: results.confirmed.length,
        partiallyConfirmed: results.partiallyConfirmed.length,
        backorders: results.backorders.length,
        errors: results.errors.length
      }
    })

  } catch (error) {
    console.error('執行分配失敗:', error)
    return NextResponse.json(
      {
        error: '執行分配失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
}
