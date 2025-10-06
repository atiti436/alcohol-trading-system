import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * 撤銷收貨API
 * POST /api/purchases/[id]/undo-receive
 *
 * 功能：
 * 1. 將採購單狀態從 RECEIVED 改回 CONFIRMED
 * 2. 還原庫存數量（扣除之前加入的庫存）
 * 3. 刪除相關的庫存異動記錄
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 只有超級管理員可以撤銷收貨
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '沒有權限執行此操作' }, { status: 403 })
    }

    const purchaseId = params.id

    // 檢查採購單是否存在且狀態為已收貨
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        items: true
      }
    })

    if (!purchase) {
      return NextResponse.json({ error: '採購單不存在' }, { status: 404 })
    }

    if (purchase.status !== 'RECEIVED') {
      return NextResponse.json({
        error: '只能撤銷已收貨的採購單',
        current_status: purchase.status
      }, { status: 400 })
    }

    // 使用事務處理撤銷收貨
    const result = await prisma.$transaction(async (tx) => {
      // 1. 查找所有相關的庫存異動記錄
      const inventoryMovements = await tx.inventoryMovement.findMany({
        where: {
          reference_type: 'PURCHASE',
          reference_id: purchaseId,
          movement_type: 'PURCHASE'
        }
      })

      console.log(`[撤銷收貨] 找到 ${inventoryMovements.length} 筆庫存異動記錄`)
      inventoryMovements.forEach(m => {
        console.log(`  - variant: ${m.variant_id}, 倉庫: ${m.warehouse}, 數量變化: ${m.quantity_change}`)
      })

      // 2. 還原庫存數量（兩個表都要回滾）
      for (const movement of inventoryMovements) {
        if (movement.variant_id) {
          // 🔄 還原 Inventory 表（新版庫存）
          const inventory = await tx.inventory.findFirst({
            where: {
              variant_id: movement.variant_id,
              warehouse: movement.warehouse
            }
          })

          if (inventory) {
            await tx.inventory.update({
              where: { id: inventory.id },
              data: {
                quantity: {
                  decrement: movement.quantity_change
                },
                available: {
                  decrement: movement.quantity_change
                }
              }
            })
          }

          // 🔄 還原 ProductVariant 表（舊版庫存，向後兼容）
          await tx.productVariant.update({
            where: { id: movement.variant_id },
            data: {
              stock_quantity: {
                decrement: movement.quantity_change
              },
              available_stock: {
                decrement: movement.quantity_change
              }
            }
          })
        }
      }

      // 3. 刪除庫存異動記錄
      await tx.inventoryMovement.deleteMany({
        where: {
          reference_type: 'PURCHASE',
          reference_id: purchaseId,
          movement_type: 'PURCHASE'
        }
      })

      // 4. 刪除收貨單（GoodsReceipt）及其額外費用
      const goodsReceipts = await tx.goodsReceipt.findMany({
        where: { purchase_id: purchaseId }
      })

      for (const receipt of goodsReceipts) {
        // 先刪除額外費用（AdditionalCost 會級聯刪除）
        await tx.goodsReceipt.delete({
          where: { id: receipt.id }
        })
      }

      // 5. 將採購單狀態改回已確認
      const updatedPurchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: 'CONFIRMED',
          received_date: null, // 清除收貨日期
          updated_at: new Date()
        },
        include: {
          items: true,
          _count: {
            select: { items: true }
          }
        }
      })

      return updatedPurchase
    })

    console.log(`採購單 ${result.purchase_number} 收貨已撤銷，庫存已還原`)

    return NextResponse.json({
      success: true,
      message: '撤銷收貨成功，庫存已還原',
      data: {
        purchase_id: result.id,
        purchase_number: result.purchase_number,
        status: result.status,
        items_count: result._count.items,
        updated_at: result.updated_at
      }
    })

  } catch (error) {
    console.error('撤銷收貨失敗:', error)

    if (error instanceof Error) {
      return NextResponse.json({
        error: '撤銷收貨失敗',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      error: '撤銷收貨失敗，請重試'
    }, { status: 500 })
  }
}