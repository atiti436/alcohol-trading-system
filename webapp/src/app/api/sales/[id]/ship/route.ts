import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

/**
 * 🏭 Room-4: 銷售出貨 API
 * POST /api/sales/[id]/ship - 處理銷售出貨，扣減庫存
 * 核心業務邏輯：銷售確認後的實際出貨和庫存扣減流程
 */

// POST /api/sales/[id]/ship - 出貨並扣減庫存
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 權限檢查 - 只有SUPER_ADMIN和EMPLOYEE可以進行出貨
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const saleId = params.id
    const body = await request.json()

    const {
      shipping_address, // 出貨地址
      shipping_method = 'DELIVERY', // 出貨方式：DELIVERY, PICKUP, EXPRESS
      tracking_number, // 追蹤號碼
      notes = '', // 出貨備註
      items = [] // 出貨明細：[{sale_item_id, ship_quantity, variant_id}]
    } = body

    // 檢查銷售訂單是否存在
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            shipping_address: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                product_code: true,
                name: true
              }
            },
            variant: {
              select: {
                id: true,
                variant_code: true,
                stock_quantity: true,
                available_stock: true
              }
            }
          }
        }
      }
    })

    if (!sale) {
      return NextResponse.json({ error: '銷售訂單不存在' }, { status: 404 })
    }

    // 智能出貨邏輯：如果沒有提供明細，自動出貨全部商品
    let shippingItems = items
    if (!shippingItems || shippingItems.length === 0) {
      // 自動生成出貨明細 - 出貨銷售單中的全部商品
      shippingItems = sale.items.map(item => ({
        sale_item_id: item.id,
        variant_id: item.variant_id,
        ship_quantity: item.quantity
      }))

      console.log(`[自動出貨] 銷售單 ${sale.sale_number} 自動生成出貨明細，共 ${shippingItems.length} 項商品`)
    }

    // 檢查庫存是否充足
    const inventoryChecks: Array<{
      saleItem: any;
      variant: any;
      shipQuantity: number;
    }> = []
    for (const shipItem of shippingItems) {
      const saleItem = sale.items.find(item => item.id === shipItem.sale_item_id)
      if (!saleItem) {
        return NextResponse.json({
          error: `銷售項目 ${shipItem.sale_item_id} 不存在`
        }, { status: 400 })
      }

      if (shipItem.ship_quantity <= 0 || shipItem.ship_quantity > saleItem.quantity) {
        return NextResponse.json({
          error: `商品 ${saleItem.product.name} 出貨數量不正確`
        }, { status: 400 })
      }

      // 檢查庫存
      const variant = await prisma.productVariant.findUnique({
        where: { id: shipItem.variant_id }
      })

      if (!variant) {
        return NextResponse.json({
          error: `商品變體 ${shipItem.variant_id} 不存在`
        }, { status: 404 })
      }

      if (variant.available_stock < shipItem.ship_quantity) {
        return NextResponse.json({
          error: `商品 ${saleItem.product.name} 庫存不足，現有庫存：${variant.available_stock}，需要：${shipItem.ship_quantity}`
        }, { status: 400 })
      }

      inventoryChecks.push({
        saleItem,
        variant,
        shipQuantity: shipItem.ship_quantity
      })
    }

    // 使用資料庫交易確保數據一致性
    const result = await prisma.$transaction(async (tx) => {
      // 1. 建立出貨記錄
      const shippingOrder = await tx.shippingOrder.create({
        data: {
          shipping_number: await generateShippingNumber(),
          sale_id: saleId,
          customer_id: sale.customer_id,
          shipping_address: shipping_address || sale.customer.shipping_address || '',
          shipping_method,
          tracking_number: tracking_number || '',
          status: 'SHIPPED',
          shipped_at: new Date(),
          notes
        }
      })

      // 2. 處理每個出貨項目的庫存扣減
      const shippingItems = []

      for (const check of inventoryChecks) {
        const { saleItem, variant, shipQuantity } = check

        // 扣減庫存
        await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            stock_quantity: { decrement: shipQuantity },
            available_stock: { decrement: shipQuantity }
          }
        })

        // 建立庫存異動記錄
        await tx.inventoryMovement.create({
          data: {
            variant_id: variant.id,
            movement_type: 'SALE',
            adjustment_type: 'SUBTRACT',
            quantity_before: variant.stock_quantity,
            quantity_change: -shipQuantity,
            quantity_after: variant.stock_quantity - shipQuantity,
            unit_cost: variant.cost_price || 0,
            total_cost: (variant.cost_price || 0) * shipQuantity,
            reason: `銷售出貨 - ${sale.sale_number}`,
            reference_type: 'SALE',
            reference_id: saleId,
            notes: `出貨單號：${shippingOrder.shipping_number}`,
            created_by: session.user.id
          }
        })

        // 建立出貨項目記錄
        const shippingItem = await tx.shippingItem.create({
          data: {
            shipping_order_id: shippingOrder.id,
            sale_item_id: saleItem.id,
            product_id: saleItem.product_id,
            variant_id: variant.id,
            quantity: shipQuantity,
            unit_price: saleItem.unit_price,
            total_price: saleItem.unit_price * shipQuantity
          }
        })

        shippingItems.push({
          product_name: saleItem.product.name,
          variant_code: variant.variant_code,
          shipped_quantity: shipQuantity,
          remaining_stock: variant.stock_quantity - shipQuantity,
          shipping_item_id: shippingItem.id
        })
      }

      // 3. 檢查是否完全出貨，更新銷售訂單狀態
      const totalOrderedQuantity = sale.items.reduce((sum, item) => sum + item.quantity, 0)
      const totalShippedQuantity = shippingItems.reduce((sum: number, item: any) => sum + item.ship_quantity, 0)

      if (totalShippedQuantity >= totalOrderedQuantity) {
        await tx.sale.update({
          where: { id: saleId },
          data: {
            // 假設有 shipped_status 欄位
            // shipped_status: 'FULLY_SHIPPED'
          }
        })
      }

      return {
        shippingOrder,
        shippingItems,
        totalShippedQuantity
      }
    })

    return NextResponse.json({
      success: true,
      message: '出貨完成，庫存已扣減',
      data: {
        shipping_order_id: result.shippingOrder.id,
        shipping_number: result.shippingOrder.shipping_number,
        shipped_items: result.shippingItems,
        total_shipped_quantity: result.totalShippedQuantity,
        tracking_number: result.shippingOrder.tracking_number,
        shipped_at: result.shippingOrder.shipped_at
      }
    })

  } catch (error) {
    console.error('出貨處理失敗:', error)
    return NextResponse.json(
      {
        error: '出貨處理失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
}

// GET /api/sales/[id]/ship - 獲取出貨狀態
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const saleId = params.id

    // 查詢銷售訂單和出貨記錄
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            shipping_address: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                product_code: true,
                name: true
              }
            },
            variant: {
              select: {
                id: true,
                variant_code: true,
                stock_quantity: true,
                available_stock: true
              }
            }
          }
        }
      }
    })

    if (!sale) {
      return NextResponse.json({ error: '銷售訂單不存在' }, { status: 404 })
    }

    // 🔒 權限檢查 - 投資方只能看自己相關的銷售
    if (session.user.role === 'INVESTOR') {
      if (sale.funding_source === 'PERSONAL' ||
          (sale.created_by !== session.user.id)) {
        return NextResponse.json({ error: '權限不足' }, { status: 403 })
      }
    }

    // 查詢出貨記錄
    const shippingOrders = await prisma.shippingOrder.findMany({
      where: { sale_id: saleId },
      include: {
        items: {
          include: {
            product: true,
            variant: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    // 計算庫存可用性
    const itemsWithStock = sale.items.map(item => ({
      ...item,
      can_ship: item.variant ? item.variant.available_stock >= item.quantity : false,
      available_stock: item.variant?.available_stock || 0
    }))

    const totalOrderedQuantity = sale.items.reduce((sum, item) => sum + item.quantity, 0)
    const totalShippedQuantity = shippingOrders.reduce((sum, order) =>
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    )

    const canShip = itemsWithStock.every(item => item.can_ship) && totalShippedQuantity < totalOrderedQuantity

    return NextResponse.json({
      success: true,
      data: {
        sale_id: sale.id,
        sale_number: sale.sale_number,
        customer: sale.customer,
        total_ordered_quantity: totalOrderedQuantity,
        total_shipped_quantity: totalShippedQuantity,
        can_ship: canShip,
        items: itemsWithStock,
        shipping_orders: shippingOrders
      }
    })

  } catch (error) {
    console.error('出貨狀態查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}

/**
 * 生成出貨單號 - 格式：SH-YYYYMMDD-XXX
 */
async function generateShippingNumber(): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

  // 查找今天最後一個出貨單號
  const lastShipping = await prisma.shippingOrder.findFirst({
    where: {
      shipping_number: {
        startsWith: `SH-${dateStr}-`
      }
    },
    orderBy: {
      shipping_number: 'desc'
    }
  })

  let sequence = 1
  if (lastShipping?.shipping_number) {
    const lastSequence = lastShipping.shipping_number.split('-')[2]
    sequence = parseInt(lastSequence) + 1
  }

  return `SH-${dateStr}-${sequence.toString().padStart(3, '0')}`
}