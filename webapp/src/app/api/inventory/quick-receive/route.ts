import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * POST /api/inventory/quick-receive - 個人快速進貨
 * 用於個人資金調貨，直接進個人倉
 */
export async function POST(request: NextRequest) {
  try {
    // 權限檢查 - 只有SUPER_ADMIN和EMPLOYEE可以個人進貨
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const body = await request.json()
    const {
      variant_id,
      quantity,
      unit_cost,
      supplier,
      notes
    } = body

    // 基本驗證
    if (!variant_id || !quantity || unit_cost === undefined) {
      return NextResponse.json({
        error: '變體ID、數量和成本為必填'
      }, { status: 400 })
    }

    const receiveQuantity = parseInt(quantity)
    if (isNaN(receiveQuantity) || receiveQuantity <= 0) {
      return NextResponse.json({
        error: '數量必須大於0'
      }, { status: 400 })
    }

    const costPrice = parseFloat(unit_cost)
    if (isNaN(costPrice) || costPrice < 0) {
      return NextResponse.json({
        error: '成本不能為負數'
      }, { status: 400 })
    }

    // 檢查變體是否存在
    const variant = await prisma.productVariant.findUnique({
      where: { id: variant_id },
      include: {
        product: {
          select: {
            name: true,
            product_code: true
          }
        }
      }
    })

    if (!variant) {
      return NextResponse.json({ error: '產品變體不存在' }, { status: 404 })
    }

    // 使用 transaction 確保數據一致性
    const result = await prisma.$transaction(async (tx) => {
      // ✅ 查詢或創建個人倉庫存記錄
      let inventory = await tx.inventory.findFirst({
        where: {
          variant_id,
          warehouse: 'PRIVATE'
        }
      })

      const oldQuantity = inventory?.quantity || 0

      if (!inventory) {
        // 創建個人倉庫存記錄
        inventory = await tx.inventory.create({
          data: {
            variant_id,
            warehouse: 'PRIVATE',
            quantity: receiveQuantity,
            reserved: 0,
            available: receiveQuantity,
            cost_price: costPrice
          }
        })
      } else {
        // 更新個人倉庫存
        inventory = await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: { increment: receiveQuantity },
            available: { increment: receiveQuantity },
            cost_price: costPrice
          }
        })
      }

      // 記錄庫存異動
      await tx.inventoryMovement.create({
        data: {
          variant_id,
          movement_type: 'ADJUSTMENT',
          adjustment_type: 'ADD',
          quantity_before: oldQuantity,
          quantity_change: receiveQuantity,
          quantity_after: oldQuantity + receiveQuantity,
          unit_cost: costPrice,
          total_cost: costPrice * receiveQuantity,
          reason: '個人調貨進貨',
          notes: `供應商: ${supplier || '未填寫'}\n${notes || ''}`.trim(),
          warehouse: 'PRIVATE',
          created_by: session.user.id
        }
      })

      return {
        inventory,
        variant,
        total_cost: costPrice * receiveQuantity
      }
    })

    return NextResponse.json({
      success: true,
      message: `成功進貨 ${receiveQuantity} 個 ${result.variant.product.name}`,
      data: {
        variant_id,
        variant_code: result.variant.variant_code,
        product_name: result.variant.product.name,
        quantity: receiveQuantity,
        unit_cost: costPrice,
        total_cost: result.total_cost,
        warehouse: 'PRIVATE',
        new_stock: result.inventory.quantity
      }
    })

  } catch (error) {
    console.error('個人進貨失敗:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '進貨失敗' },
      { status: 500 }
    )
  }
}
