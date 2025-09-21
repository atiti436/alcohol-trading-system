import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

/**
 * POST /api/inventory/adjustments - 創建庫存調整記錄
 */
export async function POST(request: NextRequest) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

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
        // 獲取當前變體庫存
        const variant = await tx.productVariant.findUnique({
          where: { id: adjustment.variant_id },
          select: {
            id: true,
            stock_quantity: true,
            cost_price: true,
            variant_code: true
          }
        })

        if (!variant) {
          throw new Error(`變體 ${adjustment.variant_id} 不存在`)
        }

        const newStockQuantity = variant.stock_quantity + adjustment.adjustment_quantity

        // 檢查庫存不能為負數
        if (newStockQuantity < 0) {
          throw new Error(`變體 ${variant.variant_code} 庫存不足，當前庫存 ${variant.stock_quantity}，調整數量 ${adjustment.adjustment_quantity}`)
        }

        // 更新變體庫存
        await tx.productVariant.update({
          where: { id: adjustment.variant_id },
          data: {
            stock_quantity: newStockQuantity,
            updated_at: new Date()
          }
        })

        // 創建庫存異動記錄
        const movement = await tx.inventoryMovement.create({
          data: {
            variant_id: adjustment.variant_id,
            movement_type: 'ADJUSTMENT',
            quantity_change: adjustment.adjustment_quantity,
            quantity_before: variant.stock_quantity,
            quantity_after: newStockQuantity,
            unit_cost: variant.cost_price,
            total_cost: Math.abs(adjustment.adjustment_quantity) * (variant.cost_price || 0),
            reason: adjustment.reason,
            notes: notes || `庫存調整 - ${adjustment_type}`,
            reference_type: 'ADJUSTMENT',
            created_by: session.user.id
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
}