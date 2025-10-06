import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/stock-transfers - 查詢品號調撥記錄
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const transfers = await prisma.stockTransfer.findMany({
      take: limit,
      skip: offset,
      orderBy: { created_at: 'desc' },
      include: {
        source_variant: {
          include: {
            product: { select: { name: true, product_code: true } }
          }
        },
        target_variant: {
          include: {
            product: { select: { name: true, product_code: true } }
          }
        },
        creator: { select: { name: true, email: true } }
      }
    })

    const total = await prisma.stockTransfer.count()

    return NextResponse.json({
      success: true,
      data: transfers,
      pagination: {
        total,
        limit,
        offset
      }
    })
  } catch (error) {
    console.error('Failed to fetch stock transfers:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/stock-transfers - 建立品號調撥
 * 用於將商品從一個變體轉移到另一個變體（如損傷商品）
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      source_variant_id,
      target_variant_id,
      quantity,
      reason,
      notes
    } = body

    // 驗證必填欄位
    const missingFields: string[] = []
    if (!source_variant_id) missingFields.push('source_variant_id')
    if (!target_variant_id) missingFields.push('target_variant_id')
    if (!quantity) missingFields.push('quantity')
    if (!reason) missingFields.push('reason')

    if (missingFields.length > 0) {
      return NextResponse.json({
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 })
    }

    if (source_variant_id === target_variant_id) {
      return NextResponse.json({
        error: 'Source and target variants cannot be the same'
      }, { status: 400 })
    }

    // 使用 transaction 確保資料一致性
    const result = await prisma.$transaction(async (tx) => {
      // 檢查來源變體
      const sourceVariant = await tx.productVariant.findUnique({
        where: { id: source_variant_id },
        include: { product: { select: { name: true, product_code: true } } }
      })

      if (!sourceVariant) {
        throw new Error('Source variant not found')
      }

      if (sourceVariant.available_stock < quantity) {
        throw new Error(`Insufficient stock. Available: ${sourceVariant.available_stock}, Requested: ${quantity}`)
      }

      // 檢查目標變體
      const targetVariant = await tx.productVariant.findUnique({
        where: { id: target_variant_id },
        include: { product: { select: { name: true, product_code: true } } }
      })

      if (!targetVariant) {
        throw new Error('Target variant not found')
      }

      // 🎯 成本繼承：使用來源變體的成本價
      const unit_cost = sourceVariant.cost_price
      const total_cost = unit_cost * quantity

      // 生成調撥單號
      const lastTransfer = await tx.stockTransfer.findFirst({
        orderBy: { transfer_number: 'desc' }
      })

      let nextNumber = 1
      if (lastTransfer) {
        const match = lastTransfer.transfer_number.match(/ST-(\d+)/)
        if (match) {
          nextNumber = parseInt(match[1]) + 1
        }
      }

      const transfer_number = `ST-${nextNumber.toString().padStart(6, '0')}`

      // 建立調撥記錄
      const transfer = await tx.stockTransfer.create({
        data: {
          transfer_number,
          source_variant_id,
          source_variant_code: sourceVariant.variant_code,
          target_variant_id,
          target_variant_code: targetVariant.variant_code,
          quantity,
          unit_cost,
          total_cost,
          reason,
          notes,
          created_by: session.user.id
        }
      })

      // ✅ 更新來源變體的 Inventory 表（減少公司倉庫存）
      const sourceInventory = await tx.inventory.findFirst({
        where: {
          variant_id: source_variant_id,
          warehouse: 'COMPANY'
        }
      })

      if (!sourceInventory) {
        throw new Error(`來源變體 ${sourceVariant.variant_code} 在公司倉無庫存記錄`)
      }

      if (sourceInventory.available < quantity) {
        throw new Error(`庫存不足。可用：${sourceInventory.available}，需要：${quantity}`)
      }

      await tx.inventory.update({
        where: { id: sourceInventory.id },
        data: {
          quantity: { decrement: quantity },
          available: { decrement: quantity }
        }
      })

      // ✅ 更新目標變體的 Inventory 表（增加公司倉庫存）
      const targetInventory = await tx.inventory.findFirst({
        where: {
          variant_id: target_variant_id,
          warehouse: 'COMPANY'
        }
      })

      if (!targetInventory) {
        // 如果目標變體沒有庫存記錄，創建一筆
        await tx.inventory.create({
          data: {
            variant_id: target_variant_id,
            warehouse: 'COMPANY',
            quantity: quantity,
            available: quantity,
            reserved: 0,
            cost_price: unit_cost
          }
        })
      } else {
        await tx.inventory.update({
          where: { id: targetInventory.id },
          data: {
            quantity: { increment: quantity },
            available: { increment: quantity },
            cost_price: unit_cost  // 繼承來源成本
          }
        })
      }

      // 記錄庫存異動（來源）
      await tx.inventoryMovement.create({
        data: {
          variant_id: source_variant_id,
          movement_type: 'OUT',
          adjustment_type: 'TRANSFER',
          reason: `轉出至 ${targetVariant.variant_code}`,
          notes,
          reference_id: transfer.id,
          reference_type: 'STOCK_TRANSFER',
          created_by: session.user.id,
          quantity_before: sourceInventory.quantity,
          quantity_after: sourceInventory.quantity - quantity,
          quantity_change: -quantity,
          unit_cost,
          total_cost,
          warehouse: 'COMPANY'
        }
      })

      // 記錄庫存異動（目標）
      await tx.inventoryMovement.create({
        data: {
          variant_id: target_variant_id,
          movement_type: 'IN',
          adjustment_type: 'TRANSFER',
          reason: `從 ${sourceVariant.variant_code} 轉入`,
          notes,
          reference_id: transfer.id,
          reference_type: 'STOCK_TRANSFER',
          created_by: session.user.id,
          quantity_before: targetInventory?.quantity || 0,
          quantity_after: (targetInventory?.quantity || 0) + quantity,
          quantity_change: quantity,
          unit_cost,
          total_cost,
          warehouse: 'COMPANY'
        }
      })

      return {
        transfer,
        sourceVariant,
        targetVariant
      }
    })

    return NextResponse.json({
      success: true,
      data: result.transfer,
      message: `成功調撥 ${quantity} 個品項從 ${result.sourceVariant.variant_code} 到 ${result.targetVariant.variant_code}`
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create stock transfer:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
