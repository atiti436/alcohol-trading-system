import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

/**
 * 財務總覽 API
 * GET /api/finance/overview - 獲取財務概況數據
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')

    // 設定日期範圍
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30))
    const end = endDate ? new Date(endDate) : new Date()
    end.setHours(23, 59, 59, 999) // 設置為當天結束

    // 基本查詢條件
    const dateFilter = {
      created_at: {
        gte: start,
        lte: end
      }
    }

    // 🔒 權限控制 - 投資方只能看到投資相關數據
    const userRoleFilter = session.user.role === 'INVESTOR'
      ? { funding_source: 'INVESTOR' }
      : {}

    // 1. 計算總收入 (銷售金額)
    const salesData = await prisma.sale.aggregate({
      where: {
        ...dateFilter,
        ...userRoleFilter,
        status: { not: 'CANCELLED' }
      },
      _sum: {
        total_amount: true,
        actual_amount: true
      },
      _count: {
        id: true
      }
    })

    // 2. 計算總支出 (現金流出)
    const expensesData = await prisma.cashFlowRecord.aggregate({
      where: {
        ...dateFilter,
        ...userRoleFilter,
        type: 'EXPENSE'
      },
      _sum: {
        amount: true
      }
    })

    // 3. 計算待收款項 (應收帳款)
    const pendingPayments = await prisma.accountsReceivable.aggregate({
      where: {
        status: { in: ['OUTSTANDING', 'OVERDUE'] },
        ...userRoleFilter
      },
      _sum: {
        remaining_amount: true
      }
    })

    // 4. 月度營收趨勢 (最近3個月)
    const monthlyData = await prisma.sale.groupBy({
      by: ['created_at'],
      where: {
        ...userRoleFilter,
        status: { not: 'CANCELLED' },
        created_at: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 3))
        }
      },
      _sum: {
        total_amount: true,
        actual_amount: true
      }
    })

    // 處理月度數據
    const monthlyRevenue = processMonthlyData(monthlyData, session.user.role)

    // 5. 近期交易記錄
    const recentTransactions = await prisma.cashFlowRecord.findMany({
      where: {
        ...userRoleFilter,
        created_at: {
          gte: new Date(new Date().setDate(new Date().getDate() - 7))
        }
      },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: {
        id: true,
        type: true,
        description: true,
        amount: true,
        created_at: true
      }
    })

    // 6. 逾期應收款項
    const outstandingInvoices = await prisma.accountsReceivable.findMany({
      where: {
        status: { in: ['OUTSTANDING', 'OVERDUE'] },
        ...userRoleFilter
      },
      include: {
        customer: {
          select: { name: true }
        }
      },
      orderBy: { due_date: 'asc' },
      take: 5
    })

    // 計算財務指標
    const totalRevenue = salesData._sum.total_amount || 0
    const totalExpenses = expensesData._sum.amount || 0
    const netProfit = totalRevenue - totalExpenses
    const pendingAmount = pendingPayments._sum.remaining_amount || 0

    // 根據角色返回不同的數據
    const responseData = {
      totalRevenue: session.user.role === 'INVESTOR' ? totalRevenue : totalRevenue,
      totalActualRevenue: session.user.role !== 'INVESTOR' ? (salesData._sum.actual_amount || 0) : undefined,
      totalExpenses,
      netProfit,
      pendingPayments: pendingAmount,
      monthlyRevenue,
      recentTransactions: recentTransactions.map(tx => ({
        id: tx.id,
        type: tx.type.toLowerCase(),
        description: tx.description,
        amount: tx.type === 'INCOME' ? tx.amount : -tx.amount,
        date: tx.created_at
      })),
      outstandingInvoices: outstandingInvoices.map(item => ({
        id: item.ar_number,
        customer: item.customer.name,
        amount: item.remaining_amount,
        dueDate: item.due_date,
        status: item.status.toLowerCase()
      }))
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error('財務總覽數據載入失敗:', error)
    return NextResponse.json(
      { error: '數據載入失敗', details: error instanceof Error ? error.message : '未知錯誤' },
      { status: 500 }
    )
  }
}

/**
 * 處理月度數據，按月分組
 */
function processMonthlyData(data: any[], userRole: string) {
  const monthlyMap = new Map()

  data.forEach(item => {
    const date = new Date(item.created_at)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        month: `${date.getMonth() + 1}月`,
        revenue: 0,
        expenses: 0
      })
    }

    const monthData = monthlyMap.get(monthKey)
    monthData.revenue += item._sum.total_amount || 0
  })

  // 確保至少有3個月的數據
  const result = []
  const now = new Date()
  for (let i = 2; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthName = `${date.getMonth() + 1}月`

    result.push(monthlyMap.get(monthKey) || {
      month: monthName,
      revenue: 0,
      expenses: 0
    })
  }

  return result
}