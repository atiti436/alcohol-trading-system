import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

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
      items = [], // 出貨明細：[{sale_item_id, ship_quantity, variant_id}]
      print = false // 是否需要列印出貨單
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
                variant_code: true
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

    // 🔒 根據銷售單的資金來源決定目標倉庫
    const targetWarehouse = sale.funding_source === 'PERSONAL' ? 'PRIVATE' : 'COMPANY'
    console.log(`[出貨] 訂單 ${sale.sale_number} 資金來源: ${sale.funding_source} → 目標倉庫: ${targetWarehouse}`)

    // 檢查庫存是否充足
    const inventoryChecks: Array<{
      saleItem: any;
      inventories: any[];
      shipQuantity: number;
      variantId: string;
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

      // 檢查預留庫存（因為確認訂單時已經預留了）
      // ✅ 從 Inventory 表查詢可用庫存（只查目標倉庫）
      const inventories = await prisma.inventory.findMany({
        where: {
          variant_id: shipItem.variant_id,
          warehouse: targetWarehouse  // 🔒 只查目標倉庫
        },
        select: {
          id: true,
          warehouse: true,
          reserved: true,
          quantity: true
        },
        orderBy: [
          { created_at: 'asc' } // FIFO
        ]
      })

      if (inventories.length === 0) {
        return NextResponse.json({
          error: `商品變體 ${shipItem.variant_id} 不存在庫存記錄`
        }, { status: 404 })
      }

      // 計算總預留庫存
      const totalReserved = inventories.reduce((sum, inv) => sum + inv.reserved, 0)

      if (totalReserved < shipItem.ship_quantity) {
        return NextResponse.json({
          error: `商品 ${saleItem.product.name} 預留庫存不足，已預留：${totalReserved}，需要出貨：${shipItem.ship_quantity}。請先確認訂單以預留庫存。`
        }, { status: 400 })
      }

      inventoryChecks.push({
        saleItem,
        inventories: inventories,
        shipQuantity: shipItem.ship_quantity,
        variantId: shipItem.variant_id
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
          shipping_address: shipping_address || null, // 親送/自取時可為 null
          shipping_method,
          tracking_number: tracking_number || null,
          status: 'SHIPPED',
          shipped_at: new Date(),
          notes
        }
      })

      // 2. 處理每個出貨項目的庫存扣減（從 Inventory 表的預留庫存）
      const shippingItems = []

      for (const check of inventoryChecks) {
        const { saleItem, inventories, shipQuantity, variantId } = check

        // ✅ 從 Inventory 表查詢可用庫存
        // 從預留庫存扣除並實際扣庫存（優先從公司倉）
        let remainingToShip = shipQuantity
        let totalCost = 0

        for (const inv of inventories) {
          if (remainingToShip <= 0) break

          const toShip = Math.min(remainingToShip, inv.reserved)
          if (toShip > 0) {
            // 更新 Inventory：reserved 減少，quantity 減少
            await tx.inventory.update({
              where: { id: inv.id },
              data: {
                reserved: { decrement: toShip },
                quantity: { decrement: toShip }
              }
            })

            // 記錄庫存異動
            await tx.inventoryMovement.create({
              data: {
                variant_id: variantId,
                movement_type: 'SALE',
                adjustment_type: 'SUBTRACT',
                quantity_before: inv.quantity,
                quantity_change: -toShip,
                quantity_after: inv.quantity - toShip,
                unit_cost: inv.cost_price || 0,
                total_cost: (inv.cost_price || 0) * toShip,
                reason: `銷售出貨 - ${sale.sale_number}`,
                reference_type: 'SALE',
                reference_id: saleId,
                warehouse: inv.warehouse,
                notes: `出貨單號：${shippingOrder.shipping_number}，倉庫：${inv.warehouse}`,
                created_by: session.user.id
              }
            })

            totalCost += (inv.cost_price || 0) * toShip
            remainingToShip -= toShip
          }
        }

        // 建立出貨項目記錄
        const shippingItem = await tx.shippingItem.create({
          data: {
            shipping_order_id: shippingOrder.id,
            sale_item_id: saleItem.id,
            product_id: saleItem.product_id,
            variant_id: variantId,
            quantity: shipQuantity,
            unit_price: saleItem.unit_price,
            total_price: saleItem.unit_price * shipQuantity
          }
        })

        // 查詢變體信息（用於返回）
        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
          select: { variant_code: true }
        })

        // ✅ 從 Inventory 表查詢可用庫存
        // 計算剩餘庫存
        const remainingInventories = await tx.inventory.findMany({
          where: { variant_id: variantId }
        })
        const remainingStock = remainingInventories.reduce((sum, inv) => sum + inv.quantity, 0)

        shippingItems.push({
          product_name: saleItem.product.name,
          variant_code: variant?.variant_code || '',
          shipped_quantity: shipQuantity,
          remaining_stock: remainingStock,
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

    // 準備返回數據
    const responseData = {
      shipping_order_id: result.shippingOrder.id,
      shipping_number: result.shippingOrder.shipping_number,
      shipped_items: result.shippingItems,
      total_shipped_quantity: result.totalShippedQuantity,
      tracking_number: result.shippingOrder.tracking_number,
      shipped_at: result.shippingOrder.shipped_at
    }

    // 如果需要列印，返回出貨單數據
    if (print) {
      return NextResponse.json({
        success: true,
        message: '出貨完成，庫存已扣減',
        data: responseData,
        shippingData: {
          shippingOrder: result.shippingOrder,
          sale: {
            ...sale,
            items: sale.items.map(item => ({
              ...item,
              shipped_quantity: result.shippingItems.find(si => si.shipping_item_id)?.shipped_quantity || 0
            }))
          },
          shippingItems: result.shippingItems
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: '出貨完成，庫存已扣減',
      data: responseData
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
                variant_code: true
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

    // 計算庫存可用性（從 Inventory 表計算）
    const itemsWithStock = await Promise.all(sale.items.map(async (item) => {
      if (!item.variant_id) {
        return { ...item, can_ship: false, available_stock: 0 }
      }

      // ✅ 從 Inventory 表查詢可用庫存
      // 從 Inventory 表計算可用庫存
      const inventories = await prisma.inventory.findMany({
        where: { variant_id: item.variant_id }
      })
      const availableStock = inventories.reduce((sum, inv) => sum + inv.available, 0)

      return {
        ...item,
        can_ship: availableStock >= item.quantity,
        available_stock: availableStock
      }
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