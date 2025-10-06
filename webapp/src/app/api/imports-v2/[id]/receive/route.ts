import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * POST /api/imports-v2/[id]/receive
 * 進貨收貨入庫
 * - 更新 received_quantity
 * - 處理損毀商品
 * - 更新庫存（Inventory）
 * - 變更狀態為 RECEIVED
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未授權' }, { status: 401 })
    }

    const importId = params.id
    const body = await request.json()
    const {
      item_damages = []  // [{ import_item_id, damaged_quantity }]
    } = body

    // 查詢進貨單
    const importRecord = await prisma.import.findUnique({
      where: { id: importId },
      include: {
        items: {
          include: {
            variant: true
          }
        }
      }
    })

    if (!importRecord) {
      return NextResponse.json(
        { success: false, error: '進貨單不存在' },
        { status: 404 }
      )
    }

    // 檢查狀態
    if (importRecord.status === 'FINALIZED') {
      return NextResponse.json(
        { success: false, error: '進貨單已結算，無法再次收貨' },
        { status: 400 }
      )
    }

    // 使用事務處理收貨
    const result = await prisma.$transaction(async (tx) => {
      const updates = []

      // 處理每個進貨項目
      for (const item of importRecord.items) {
        // 查找該項目的損毀數量
        const damageInfo = item_damages.find((d: any) => d.import_item_id === item.id)
        const damagedQty = damageInfo?.damaged_quantity || 0

        // 計算實際收貨數量
        const receivedQty = item.ordered_quantity - damagedQty

        if (receivedQty < 0) {
          throw new Error(`商品 ${item.product_name} 的損毀數量不能大於訂購數量`)
        }

        // 更新進貨項目
        await tx.importItem.update({
          where: { id: item.id },
          data: {
            received_quantity: item.ordered_quantity,  // 實際收到的數量（含損毀）
            damaged_quantity: damagedQty
          }
        })

        // ✅ 更新庫存（只增加良品數量）
        if (receivedQty > 0) {
          // 查找該變體在對應倉庫的庫存記錄
          const existingInventory = await tx.inventory.findFirst({
            where: {
              variant_id: item.variant_id,
              warehouse: importRecord.warehouse
            }
          })

          if (existingInventory) {
            // 更新現有庫存
            await tx.inventory.update({
              where: { id: existingInventory.id },
              data: {
                quantity: existingInventory.quantity + receivedQty,
                available: existingInventory.available + receivedQty
              }
            })
          } else {
            // 創建新庫存記錄
            await tx.inventory.create({
              data: {
                variant_id: item.variant_id,
                warehouse: importRecord.warehouse,
                quantity: receivedQty,
                reserved: 0,
                available: receivedQty
              }
            })
          }

          // 記錄庫存異動
          await tx.inventoryMovement.create({
            data: {
              variant_id: item.variant_id,
              warehouse: importRecord.warehouse,
              movement_type: 'IN',
              quantity: receivedQty,
              reason: 'IMPORT_RECEIVE',
              reference_number: importRecord.import_number,
              notes: `進貨收貨：${item.product_name}`,
              created_by: session.user.id
            }
          })
        }

        // 處理損毀商品（如果有）
        if (damagedQty > 0) {
          // 記錄損毀庫存異動
          await tx.inventoryMovement.create({
            data: {
              variant_id: item.variant_id,
              warehouse: importRecord.warehouse,
              movement_type: 'DAMAGE',
              quantity: damagedQty,
              reason: 'IMPORT_DAMAGE',
              reference_number: importRecord.import_number,
              notes: `進貨損毀：${item.product_name}`,
              created_by: session.user.id
            }
          })
        }

        updates.push({
          variant_code: item.variant_code,
          product_name: item.product_name,
          ordered: item.ordered_quantity,
          received: receivedQty,
          damaged: damagedQty
        })
      }

      // 更新進貨單狀態
      const updatedImport = await tx.import.update({
        where: { id: importId },
        data: {
          status: 'RECEIVED',
          received_at: new Date(),
          received_by: session.user.id
        },
        include: {
          items: {
            include: {
              variant: true
            }
          }
        }
      })

      return {
        import: updatedImport,
        updates
      }
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: '收貨完成，庫存已更新'
    })

  } catch (error) {
    console.error('進貨收貨失敗:', error)
    return NextResponse.json(
      {
        success: false,
        error: '收貨失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
}
