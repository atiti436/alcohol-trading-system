import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/fix-shipped-status
 * 修復已出貨但狀態未更新的訂單
 *
 * 找出有 ShippingOrder 但 Sale.status 還是 CONFIRMED 的訂單，更新為 SHIPPED
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. 找出所有已出貨的訂單 ID
      const shippedOrders = await tx.shippingOrder.findMany({
        where: {
          status: 'SHIPPED'
        },
        select: {
          sale_id: true,
          shipping_number: true,
          shipped_at: true
        },
        distinct: ['sale_id']
      })

      const saleIds = shippedOrders.map(o => o.sale_id)

      // 2. 找出這些訂單中狀態還是 CONFIRMED 的
      const needFixSales = await tx.sale.findMany({
        where: {
          id: { in: saleIds },
          status: 'CONFIRMED'
        },
        select: {
          id: true,
          sale_number: true,
          status: true
        }
      })

      // 3. 更新為 SHIPPED
      if (needFixSales.length > 0) {
        await tx.sale.updateMany({
          where: {
            id: { in: needFixSales.map(s => s.id) }
          },
          data: {
            status: 'SHIPPED'
          }
        })
      }

      return {
        fixed_count: needFixSales.length,
        fixed_sales: needFixSales.map(s => ({
          sale_number: s.sale_number,
          old_status: s.status,
          new_status: 'SHIPPED'
        }))
      }
    })

    return NextResponse.json({
      success: true,
      message: `已修復 ${result.fixed_count} 張訂單`,
      data: result
    })

  } catch (error) {
    console.error('修復失敗:', error)
    return NextResponse.json(
      { error: '修復失敗', details: String(error) },
      { status: 500 }
    )
  }
}
