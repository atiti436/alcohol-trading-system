import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAppActiveUser } from '@/modules/auth/middleware/permissions'
import { Role } from '@/types/auth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * POST /api/inventory/adjustments - 創建庫存調整記錄
 */
export const POST = withAppActiveUser(async (request: NextRequest, response: NextResponse, context: any) => {
  try {
    const body = await request.json()
    const { product_id, adjustment_type, notes, adjustments } = body

    // 驗證必要欄位
    if (!product_id || !adjustments || !Array.isArray(adjustments)) {
      return NextResponse.json({
        error: '缺少必要欄位：product_id 和 adjustments'
      }, { status: 400 })
    }

    // 驗證調整項目
    const validAdjustments = adjustments.filter(adj =>
      adj.variant_id && adj.adjustment_quantity !== 0 && adj.reason
    )

    if (validAdjustments.length === 0) {
      return NextResponse.json({
        error: '沒有有效的調整項目'
      }, { status: 400 })
    }

    // 使用交易確保數據一致性
    const result = await prisma.$transaction(async (tx) => {
      const movements = []

      for (const adjustment of validAdjustments) {
        // 🔒 使用調整項目指定的倉庫（預設 COMPANY）
        const targetWarehouse = adjustment.warehouse || 'COMPANY'
        const warehouseName = targetWarehouse === 'COMPANY' ? '公司倉' : '個人倉'

        // 查詢變體資訊（用於創建新記錄或取得成本）
        const variant = await tx.productVariant.findUnique({
          where: { id: adjustment.variant_id },
          select: {
            variant_code: true,
            cost_price: true
          }
        })

        if (!variant) {
          throw new Error(`變體 ${adjustment.variant_id} 不存在`)
        }

        // ✅ 查詢或創建 Inventory 記錄
        let inventory = await tx.inventory.findFirst({
          where: {
            variant_id: adjustment.variant_id,
            warehouse: targetWarehouse
          }
        })

        let oldQuantity = 0
        let oldAvailable = 0

        if (!inventory) {
          // 🆕 沒有記錄：自動創建（調整數量必須是正數）
          if (adjustment.adjustment_quantity < 0) {
            throw new Error(`變體 ${variant.variant_code} 在${warehouseName}無庫存記錄，無法扣減庫存`)
          }

          // 創建新的庫存記錄
          inventory = await tx.inventory.create({
            data: {
              variant_id: adjustment.variant_id,
              warehouse: targetWarehouse,
              quantity: adjustment.adjustment_quantity,
              available: adjustment.adjustment_quantity,
              reserved: 0,
              cost_price: variant.cost_price || 0
            }
          })

          console.log(`[庫存調整] 自動創建 ${variant.variant_code} ${warehouseName} 庫存記錄，數量：${adjustment.adjustment_quantity}`)
        } else {
          // 已有記錄：更新庫存
          oldQuantity = inventory.quantity
          oldAvailable = inventory.available

          const newQuantity = inventory.quantity + adjustment.adjustment_quantity
          const newAvailable = inventory.available + adjustment.adjustment_quantity

          // 檢查庫存不能為負數
          if (newQuantity < 0) {
            throw new Error(`變體 ${variant.variant_code} ${warehouseName}庫存不足，當前庫存 ${inventory.quantity}，調整數量 ${adjustment.adjustment_quantity}`)
          }

          // 🔒 檢查可用庫存不能小於 0
          if (newAvailable < 0) {
            throw new Error(`變體 ${variant.variant_code} ${warehouseName}可用庫存不足，當前可用 ${inventory.available}，調整數量 ${adjustment.adjustment_quantity}`)
          }

          // ✅ 更新 Inventory 表
          inventory = await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              quantity: newQuantity,
              available: newAvailable,
              updated_at: new Date()
            }
          })
        }

        // 創建庫存異動記錄
        const movement = await tx.inventoryMovement.create({
          data: {
            variant_id: adjustment.variant_id,
            movement_type: 'ADJUSTMENT',
            adjustment_type: adjustment.adjustment_quantity > 0 ? 'ADD' : 'SUBTRACT',
            quantity_change: adjustment.adjustment_quantity,
            quantity_before: oldQuantity,
            quantity_after: inventory.quantity,
            unit_cost: variant.cost_price || 0,
            total_cost: Math.abs(adjustment.adjustment_quantity) * (variant.cost_price || 0),
            reason: adjustment.reason,
            warehouse: targetWarehouse,  // 🔒 記錄實際調整的倉庫
            notes: notes || `庫存調整 - ${adjustment_type}`,
            reference_type: 'ADJUSTMENT',
            created_by: context.userId
          }
        })

        movements.push(movement)
      }

      return movements
    })

    return NextResponse.json({
      success: true,
      message: '庫存調整成功',
      data: {
        movements: result,
        adjustments_count: validAdjustments.length
      }
    })

  } catch (error) {
    console.error('庫存調整失敗:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '庫存調整失敗',
        details: error
      },
      { status: 500 }
    )
  }
}, [Role.SUPER_ADMIN, Role.EMPLOYEE])