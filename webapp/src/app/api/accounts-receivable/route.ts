import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { DatabaseWhereCondition } from '@/types/business'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * 💰 Room-4: 應收帳款管理 API
 * 負責應收帳款的追蹤、催收和帳齡分析
 * 🔒 重要：投資方角色不能存取應收帳款詳細資料
 */

// GET /api/accounts-receivable - 應收帳款列表
export async function GET(request: NextRequest) {
  try {
    // 🔒 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }
    // 阻擋待審核用戶
    if ((session as any).user?.role === 'PENDING') {
      return NextResponse.json({ error: '帳戶待審核中，暫無權限存取應收帳款' }, { status: 403 })
    }

    // 🚨 投資方只能看到基本統計，不能看到詳細帳款
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const customer_id = searchParams.get('customer_id')
    const overdue_days = searchParams.get('overdue_days')
    const summary = searchParams.get('summary') === 'true'

    const skip = (page - 1) * limit

    // 建立查詢條件
    const where: DatabaseWhereCondition = {}

    if (status) where.status = status
    if (customer_id) where.customer_id = customer_id

    // 逾期天數篩選
    if (overdue_days) {
      const days = parseInt(overdue_days)
      where.days_past_due = { gte: days }
    }

    // 🔒 投資方數據過濾 - 只能看到投資項目相關的應收帳款
    if (session.user.role === 'INVESTOR') {
      where.sale = {
        funding_source: 'COMPANY'
      }
    }

    // 如果只要統計資料
    if (summary) {
      const summaryData = await getAccountsReceivableSummary(where, session.user.role)
      return NextResponse.json({
        success: true,
        data: summaryData
      })
    }

    // 執行查詢
    const [accountsReceivable, total] = await Promise.all([
      prisma.accountsReceivable.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              customer_code: true,
              name: true,
              company: true,
              tier: true,
              payment_terms: true
            }
          },
          sale: {
            select: {
              id: true,
              sale_number: true,
              total_amount: true,
              actual_amount: session.user.role === 'SUPER_ADMIN',
              funding_source: true,
              created_at: true
            }
          },
          payments: {
            select: {
              id: true,
              payment_amount: true,
              payment_date: true,
              payment_method: true,
              reference_number: true
            },
            orderBy: { payment_date: 'desc' }
          }
        },
        orderBy: [
          { status: 'asc' },
          { due_date: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.accountsReceivable.count({ where })
    ])

    // 🔒 數據過濾 - 根據角色隱藏敏感資訊
    const filteredData = accountsReceivable.map(ar => ({
      ...ar,
      // 投資方看到調整後的金額
      original_amount: session.user.role === 'INVESTOR'
        ? ar.original_amount * 0.8
        : ar.original_amount,
      remaining_amount: session.user.role === 'INVESTOR'
        ? ar.remaining_amount * 0.8
        : ar.remaining_amount,
      sale: {
        ...ar.sale,
        actual_amount: session.user.role === 'SUPER_ADMIN' ? ar.sale.actual_amount : undefined
      }
    }))

    return NextResponse.json({
      success: true,
      data: {
        accountsReceivable: filteredData,
        total,
        page,
        limit,
        hasMore: skip + limit < total
      }
    })

  } catch (error) {
    console.error('應收帳款查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}

// POST /api/accounts-receivable - 創建應收帳款 (通常由銷售單自動觸發)
export async function POST(request: NextRequest) {
  try {
    // 🔒 權限檢查 - 只有SUPER_ADMIN和EMPLOYEE可以建立應收帳款
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }
    if (session.user.role === 'PENDING') {
      return NextResponse.json({ error: '帳戶待審核中，暫無權限建立應收帳款' }, { status: 403 })
    }

    const body = await request.json()
    const {
      sale_id,
      customer_id,
      original_amount,
      due_date,
      notes
    } = body

    // 基本驗證
    if (!sale_id || !customer_id || !original_amount) {
      return NextResponse.json({
        error: '銷售單ID、客戶ID和金額為必填欄位'
      }, { status: 400 })
    }

    // 檢查銷售單是否存在
    const sale = await prisma.sale.findUnique({
      where: { id: sale_id },
      include: { customer: true }
    })

    if (!sale) {
      return NextResponse.json({ error: '銷售單不存在' }, { status: 404 })
    }

    // 檢查是否已存在應收帳款
    const existingAR = await prisma.accountsReceivable.findFirst({
      where: { sale_id }
    })

    if (existingAR) {
      return NextResponse.json({ error: '此銷售單已存在應收帳款記錄' }, { status: 400 })
    }

    // 計算到期日（如果未提供）
    const calculatedDueDate = due_date ? new Date(due_date) : calculateDueDate(sale.customer.payment_terms)

    // 產生應收帳款編號
    const ar_number = await generateARNumber()

    // 建立應收帳款
    const accountsReceivable = await prisma.accountsReceivable.create({
      data: {
        ar_number,
        customer_id,
        sale_id,
        original_amount,
        remaining_amount: original_amount,
        due_date: calculatedDueDate,
        notes,
        created_by: session.user.id
      },
      include: {
        customer: {
          select: {
            customer_code: true,
            name: true,
            company: true
          }
        },
        sale: {
          select: {
            sale_number: true,
            total_amount: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: accountsReceivable,
      message: '應收帳款建立成功'
    })

  } catch (error) {
    console.error('應收帳款建立失敗:', error)
    return NextResponse.json(
      { error: '建立失敗', details: error },
      { status: 500 }
    )
  }
}

// 應收帳款統計摘要
async function getAccountsReceivableSummary(where: DatabaseWhereCondition, userRole: string) {
  // 基礎統計
  const [totalOutstanding, totalOverdue, totalPaid, ageingAnalysis] = await Promise.all([
    // 未收金額
    prisma.accountsReceivable.aggregate({
      where: { ...where, status: { in: ['OUTSTANDING', 'PARTIAL'] } },
      _sum: { remaining_amount: true },
      _count: { id: true }
    }),
    // 逾期金額
    prisma.accountsReceivable.aggregate({
      where: { ...where, status: 'OVERDUE' },
      _sum: { remaining_amount: true },
      _count: { id: true }
    }),
    // 已收金額
    prisma.accountsReceivable.aggregate({
      where: { ...where, status: 'PAID' },
      _sum: { original_amount: true },
      _count: { id: true }
    }),
    // 帳齡分析
    getAgeingAnalysis(where)
  ])

  // 🔒 根據角色調整顯示金額
  const multiplier = userRole === 'INVESTOR' ? 0.8 : 1

  return {
    totalOutstanding: {
      amount: (totalOutstanding._sum.remaining_amount || 0) * multiplier,
      count: totalOutstanding._count
    },
    totalOverdue: {
      amount: (totalOverdue._sum.remaining_amount || 0) * multiplier,
      count: totalOverdue._count
    },
    totalPaid: {
      amount: (totalPaid._sum.original_amount || 0) * multiplier,
      count: totalPaid._count
    },
    ageingAnalysis: ageingAnalysis.map(age => ({
      ...age,
      amount: age.amount * multiplier
    }))
  }
}

// 帳齡分析
async function getAgeingAnalysis(where: DatabaseWhereCondition) {
  const today = new Date()

  const ageBrackets = [
    { name: '未到期', min: -999, max: 0 },
    { name: '1-30天', min: 1, max: 30 },
    { name: '31-60天', min: 31, max: 60 },
    { name: '61-90天', min: 61, max: 90 },
    { name: '90天以上', min: 91, max: 9999 }
  ]

  const results = []

  for (const bracket of ageBrackets) {
    const bracketWhere: DatabaseWhereCondition = {
      ...where,
      status: { in: ['OUTSTANDING', 'OVERDUE', 'PARTIAL'] }
    }

    if (bracket.min > -999) {
      if (bracketWhere.days_past_due && typeof bracketWhere.days_past_due === 'object') {
        bracketWhere.days_past_due = { ...bracketWhere.days_past_due, gte: bracket.min }
      } else {
        bracketWhere.days_past_due = { gte: bracket.min }
      }
    }
    if (bracket.max < 9999) {
      if (bracketWhere.days_past_due && typeof bracketWhere.days_past_due === 'object') {
        bracketWhere.days_past_due = { ...bracketWhere.days_past_due, lte: bracket.max }
      } else {
        bracketWhere.days_past_due = { lte: bracket.max }
      }
    }

    const result = await prisma.accountsReceivable.aggregate({
      where: bracketWhere,
      _sum: { remaining_amount: true },
      _count: { id: true }
    })

    results.push({
      period: bracket.name,
      amount: result._sum.remaining_amount || 0,
      count: result._count
    })
  }

  return results
}

// 計算到期日
function calculateDueDate(payment_terms: string): Date {
  const today = new Date()

  switch (payment_terms) {
    case 'CASH':
      return today // 現金立即到期
    case 'WEEKLY':
      return new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) // 7天後
    case 'MONTHLY':
      return new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) // 30天後
    case 'SIXTY_DAYS':
      return new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000) // 60天後
    default:
      return new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) // 預設30天
  }
}

// 產生應收帳款編號
async function generateARNumber(): Promise<string> {
  const today = new Date()
  const dateString = today.toISOString().slice(0, 10).replace(/-/g, '')

  // 查找今日最後一筆應收帳款
  const lastAR = await prisma.accountsReceivable.findFirst({
    where: {
      ar_number: {
        startsWith: `AR${dateString}`
      }
    },
    orderBy: {
      ar_number: 'desc'
    }
  })

  let sequence = 1
  if (lastAR) {
    const lastSequence = parseInt(lastAR.ar_number.slice(-3))
    sequence = lastSequence + 1
  }

  return `AR${dateString}${sequence.toString().padStart(3, '0')}`
}
