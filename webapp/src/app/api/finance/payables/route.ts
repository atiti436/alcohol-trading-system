import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

/**
 * 應付帳款 API
 * GET /api/finance/payables - 獲取應付帳款列表和統計數據
 * POST /api/finance/payables - 創建新的應付帳款
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    // 只有 SUPER_ADMIN 可以查看應付帳款
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const supplier = searchParams.get('supplier')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    // 構建查詢條件
    const where: any = {}

    if (status) {
      where.status = status
    }

    if (supplier) {
      where.supplier_name = {
        contains: supplier,
        mode: 'insensitive'
      }
    }

    if (dateFrom || dateTo) {
      where.due_date = {}
      if (dateFrom) where.due_date.gte = new Date(dateFrom)
      if (dateTo) where.due_date.lte = new Date(dateTo + 'T23:59:59.999Z')
    }

    // 獲取應付帳款列表 - 先嘗試簡單查詢
    const payables = await prisma.accountsPayable.findMany({
      where,
      include: {
        purchase: {
          select: {
            purchase_number: true,
            total_amount: true,
            status: true
          }
        },
        payments: {
          select: {
            id: true,
            payment_number: true,
            payment_amount: true,
            payment_date: true,
            payment_method: true,
            reference_number: true,
            notes: true
          },
          orderBy: { payment_date: 'desc' }
        }
      },
      orderBy: { due_date: 'asc' }
    })

    // 計算統計數據 - 添加錯誤處理
    let stats
    try {
      stats = await calculatePayableStats()
    } catch (statsError) {
      console.error('統計數據計算失敗:', statsError)
      // 提供預設值
      stats = {
        total_pending: 0,
        total_overdue: 0,
        total_partial: 0,
        count_pending: 0,
        count_overdue: 0,
        average_days_overdue: 0
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        payables,
        stats
      }
    })

  } catch (error) {
    console.error('獲取應付帳款失敗:', error)
    return NextResponse.json(
      { error: '獲取數據失敗', details: error instanceof Error ? error.message : '未知錯誤' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    // 只有 SUPER_ADMIN 可以創建應付帳款
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const body = await request.json()
    const { purchase_id, supplier_name, original_amount, due_date, notes } = body

    // 驗證必填欄位
    if (!purchase_id || !supplier_name || !original_amount || !due_date) {
      return NextResponse.json({ error: '缺少必填欄位' }, { status: 400 })
    }

    // 檢查採購單是否存在
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchase_id }
    })

    if (!purchase) {
      return NextResponse.json({ error: '找不到對應的採購單' }, { status: 404 })
    }

    // 生成應付帳款編號
    const apNumber = await generateAPNumber()

    // 計算逾期天數
    const dueDate = new Date(due_date)
    const today = new Date()
    const daysPastDue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))

    // 決定狀態
    let status = 'PENDING'
    if (daysPastDue > 0) {
      status = 'OVERDUE'
    }

    // 創建應付帳款
    const payable = await prisma.accountsPayable.create({
      data: {
        ap_number: apNumber,
        purchase_id,
        supplier_name,
        original_amount,
        remaining_amount: original_amount,
        due_date: dueDate,
        status,
        days_past_due: daysPastDue,
        notes,
        created_by: session.user.id
      },
      include: {
        purchase: {
          select: {
            purchase_number: true,
            total_amount: true,
            status: true
          }
        },
        payments: true
      }
    })

    return NextResponse.json({
      success: true,
      data: payable
    })

  } catch (error) {
    console.error('創建應付帳款失敗:', error)
    return NextResponse.json(
      { error: '創建失敗', details: error instanceof Error ? error.message : '未知錯誤' },
      { status: 500 }
    )
  }
}

/**
 * 計算應付帳款統計數據
 */
async function calculatePayableStats() {
  const today = new Date()

  // 待付款金額和數量
  const pendingStats = await prisma.accountsPayable.aggregate({
    where: { status: 'PENDING' },
    _sum: { remaining_amount: true },
    _count: { id: true }
  })

  // 逾期金額和數量
  const overdueStats = await prisma.accountsPayable.aggregate({
    where: { status: 'OVERDUE' },
    _sum: { remaining_amount: true },
    _count: { id: true }
  })

  // 部分付款金額
  const partialStats = await prisma.accountsPayable.aggregate({
    where: { status: 'PARTIAL' },
    _sum: { remaining_amount: true }
  })

  // 平均逾期天數
  const overduePayables = await prisma.accountsPayable.findMany({
    where: { status: 'OVERDUE' },
    select: { days_past_due: true }
  })

  const averageDaysOverdue = overduePayables.length > 0
    ? overduePayables.reduce((sum, p) => sum + p.days_past_due, 0) / overduePayables.length
    : 0

  return {
    total_pending: pendingStats._sum.remaining_amount || 0,
    total_overdue: overdueStats._sum.remaining_amount || 0,
    total_partial: partialStats._sum.remaining_amount || 0,
    count_pending: pendingStats._count || 0,
    count_overdue: overdueStats._count || 0,
    average_days_overdue: Math.round(averageDaysOverdue * 10) / 10
  }
}

/**
 * 生成應付帳款編號
 */
async function generateAPNumber(): Promise<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')

  const prefix = `AP${year}${month}`

  // 查找當月最大的序號
  const lastPayable = await prisma.accountsPayable.findFirst({
    where: {
      ap_number: {
        startsWith: prefix
      }
    },
    orderBy: {
      ap_number: 'desc'
    }
  })

  let sequence = 1
  if (lastPayable) {
    const lastSequence = parseInt(lastPayable.ap_number.slice(-4))
    sequence = lastSequence + 1
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`
}