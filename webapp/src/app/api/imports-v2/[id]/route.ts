import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * DELETE /api/imports-v2/[id] - 刪除進貨單（級聯刪除所有相關資料）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未授權' }, { status: 401 })
    }

    // 只有超級管理員可以刪除
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: '權限不足' }, { status: 403 })
    }

    const importId = params.id

    // 檢查進貨單是否存在
    const existingImport = await prisma.import.findUnique({
      where: { id: importId },
      include: {
        items: true,
        costs: true
      }
    })

    if (!existingImport) {
      return NextResponse.json(
        { success: false, error: '進貨單不存在' },
        { status: 404 }
      )
    }

    // 使用事務進行級聯刪除
    await prisma.$transaction(async (tx) => {
      // 1. 查找所有庫存異動記錄
      const inventoryMovements = await tx.inventoryMovement.findMany({
        where: {
          reference_type: 'IMPORT',
          reference_id: importId
        }
      })

      // 2. 回滾庫存（如果已收貨）
      for (const movement of inventoryMovements) {
        if (movement.variant_id && movement.quantity_change > 0) {
          // 回滾 Inventory 表
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

          // 回滾 ProductVariant 表
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
          reference_type: 'IMPORT',
          reference_id: importId
        }
      })

      // 4. 刪除進貨費用（ImportCost）
      await tx.importCost.deleteMany({
        where: { import_id: importId }
      })

      // 5. 刪除成本調整記錄
      await tx.costAdjustmentLog.deleteMany({
        where: { import_id: importId }
      })

      // 6. 刪除進貨明細（ImportItem 會級聯刪除）
      await tx.importItem.deleteMany({
        where: { import_id: importId }
      })

      // 7. 最後刪除進貨單本身
      await tx.import.delete({
        where: { id: importId }
      })
    })

    return NextResponse.json({
      success: true,
      message: '進貨單及所有相關資料已刪除'
    })

  } catch (error) {
    console.error('刪除進貨單失敗:', error)

    let errorMessage = '刪除失敗'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { success: false, error: '刪除失敗', details: errorMessage },
      { status: 500 }
    )
  }
}
