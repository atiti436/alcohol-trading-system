import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

export const dynamic = 'force-dynamic'

/**
 * 取得預購提醒（本週預計到貨的預購單）
 * GET /api/sales/preorder-alerts
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    // 計算本週日期範圍（今天往後 7 天）
    const today = new Date()
    const nextWeek = new Date()
    nextWeek.setDate(today.getDate() + 7)

    // 查詢預購中且預計本週到貨的訂單
    const preorders = await prisma.sale.findMany({
      where: {
        status: 'PREORDER',
        expected_arrival_date: {
          lte: nextWeek
        }
      },
      include: {
        customer: {
          select: {
            name: true
          }
        },
        items: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        expected_arrival_date: 'asc'
      },
      take: 10 // 最多顯示 10 筆
    })

    // 計算每筆訂單還有幾天到貨
    const alerts = preorders.map(sale => {
      const daysUntilArrival = sale.expected_arrival_date
        ? Math.ceil((new Date(sale.expected_arrival_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : 999

      return {
        sale_id: sale.id,
        sale_number: sale.sale_number,
        customer_name: sale.customer.name,
        expected_arrival_date: sale.expected_arrival_date,
        days_until_arrival: daysUntilArrival,
        item_count: sale.items.length,
        total_amount: sale.total_amount
      }
    })

    return NextResponse.json({
      success: true,
      data: alerts
    })

  } catch (error) {
    console.error('查詢預購提醒失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}
