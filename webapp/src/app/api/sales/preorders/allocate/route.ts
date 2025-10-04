import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { allocateStock, getAllocationStats, AllocationStrategy } from '@/lib/allocation'

export const dynamic = 'force-dynamic'

/**
 * 預購單分配建議 API
 * POST /api/sales/preorders/allocate
 *
 * 根據可用庫存和預購單需求，計算分配建議
 * 不實際執行分配，只返回建議結果供用戶確認
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const {
      variantId, // 變體 ID
      availableStock, // 可用庫存
      strategy = 'PROPORTIONAL' // 分配策略：PROPORTIONAL | PRIORITY | FCFS
    } = await request.json()

    if (!variantId) {
      return NextResponse.json({ error: '請提供變體 ID' }, { status: 400 })
    }

    if (availableStock === undefined || availableStock < 0) {
      return NextResponse.json({ error: '請提供有效的可用庫存數量' }, { status: 400 })
    }

    // 查詢該變體的所有預購單
    const preorders = await prisma.sale.findMany({
      where: {
        status: 'PREORDER',
        items: {
          some: {
            variant_id: variantId
          }
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            tier: true
          }
        },
        items: {
          where: {
            variant_id: variantId
          },
          select: {
            quantity: true
          }
        }
      },
      orderBy: {
        created_at: 'asc' // 按創建時間排序（用於 FCFS）
      }
    })

    if (preorders.length === 0) {
      return NextResponse.json({
        success: true,
        message: '沒有找到相關的預購單',
        data: {
          preorders: [],
          allocation: [],
          stats: {
            totalRequested: 0,
            totalAllocated: 0,
            totalShortage: 0,
            fullyFulfilled: 0,
            partiallyFulfilled: 0,
            notFulfilled: 0,
            overallFulfillmentRate: 0
          }
        }
      })
    }

    // 準備分配輸入數據
    const allocationInput = preorders.map(sale => {
      const quantity = sale.items.reduce((sum, item) => sum + item.quantity, 0)
      const isVIP = sale.customer.tier === 'VIP'

      return {
        saleId: sale.id,
        saleNumber: sale.sale_number,
        customerName: sale.customer.name,
        customerId: sale.customer.id,
        quantity,
        priority: sale.allocation_priority || (isVIP ? 100 : 50),
        orderDate: sale.created_at,
        isVIP
      }
    })

    // 執行分配算法
    const allocationResults = allocateStock(
      availableStock,
      allocationInput,
      strategy as AllocationStrategy
    )

    // 計算統計
    const stats = getAllocationStats(allocationResults)

    return NextResponse.json({
      success: true,
      data: {
        variantId,
        availableStock,
        strategy,
        preorders: allocationInput,
        allocation: allocationResults,
        stats
      }
    })

  } catch (error) {
    console.error('分配建議計算失敗:', error)
    return NextResponse.json(
      {
        error: '分配建議計算失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
}
