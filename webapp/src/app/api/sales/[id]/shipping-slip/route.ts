import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

/**
 * 🏭 Room-4: 出貨單查詢 API
 * GET /api/sales/[id]/shipping-slip - 獲取出貨單數據用於重新列印
 */

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

    // 查詢最新的出貨記錄
    const shippingOrder = await prisma.shippingOrder.findFirst({
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

    if (!shippingOrder) {
      return NextResponse.json({ error: '未找到出貨記錄' }, { status: 404 })
    }

    // 構建出貨單數據
    const shippingData = {
      shippingOrder,
      sale: {
        ...sale,
        items: sale.items.map(item => {
          const shippingItem = shippingOrder.items.find(si => si.sale_item_id === item.id)
          return {
            ...item,
            shipped_quantity: shippingItem?.quantity || item.quantity
          }
        })
      },
      shippingItems: shippingOrder.items.map(item => ({
        product_name: item.product?.name || '未知商品',
        variant_code: item.variant?.variant_code || '',
        shipped_quantity: item.quantity,
        shipping_item_id: item.id
      }))
    }

    return NextResponse.json({
      success: true,
      shippingData
    })

  } catch (error) {
    console.error('查詢出貨單失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}