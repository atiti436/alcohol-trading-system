import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

/**
 * 💰 簡單收支記錄 API
 * 不使用複雜會計借貸，直接記錄收入支出
 */

// GET /api/cashflow - 獲取收支記錄
export async function GET(request: NextRequest) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type') // 'INCOME' | 'EXPENSE' | null
    const funding_source = searchParams.get('funding_source') // 'INVESTOR' | 'PERSONAL' | null
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    // 建立查詢條件
    const where: any = {}

    // 類型篩選
    if (type && ['INCOME', 'EXPENSE'].includes(type)) {
      where.type = type
    }

    // 資金來源篩選
    if (funding_source && ['INVESTOR', 'PERSONAL'].includes(funding_source)) {
      where.funding_source = funding_source
    }

    // 日期範圍篩選
    if (date_from || date_to) {
      where.transaction_date = {}
      if (date_from) {
        where.transaction_date.gte = new Date(date_from)
      }
      if (date_to) {
        const endDate = new Date(date_to)
        endDate.setHours(23, 59, 59, 999)
        where.transaction_date.lte = endDate
      }
    }

    // 搜尋條件
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } }
      ]
    }

    // 執行查詢
    const [records, total] = await Promise.all([
      prisma.cashFlowRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { transaction_date: 'desc' },
        include: {
          creator: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.cashFlowRecord.count({ where })
    ])

    // 計算統計資訊
    const stats = await calculateCashFlowStats(where)

    return NextResponse.json({
      success: true,
      data: {
        records,
        total,
        page,
        limit,
        hasMore: skip + limit < total,
        stats
      }
    })

  } catch (error) {
    console.error('獲取收支記錄失敗:', error)
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }
}

// POST /api/cashflow - 新增收支記錄
export async function POST(request: NextRequest) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const body = await request.json()
    const {
      type, // 'INCOME' | 'EXPENSE'
      amount,
      description,
      category,
      funding_source, // 'INVESTOR' | 'PERSONAL'
      transaction_date,
      reference,
      notes
    } = body

    // 基本驗證
    if (!type || !amount || !description || !funding_source) {
      return NextResponse.json({
        error: '請填入完整資訊：類型、金額、描述、資金來源'
      }, { status: 400 })
    }

    if (!['INCOME', 'EXPENSE'].includes(type)) {
      return NextResponse.json({
        error: '類型必須是收入(INCOME)或支出(EXPENSE)'
      }, { status: 400 })
    }

    if (!['INVESTOR', 'PERSONAL'].includes(funding_source)) {
      return NextResponse.json({
        error: '資金來源必須是投資方(INVESTOR)或個人墊付(PERSONAL)'
      }, { status: 400 })
    }

    if (amount <= 0) {
      return NextResponse.json({
        error: '金額必須大於0'
      }, { status: 400 })
    }

    // 建立收支記錄
    const record = await prisma.cashFlowRecord.create({
      data: {
        type,
        amount,
        description: description.trim(),
        category: category?.trim() || getCategoryByType(type),
        funding_source,
        transaction_date: transaction_date ? new Date(transaction_date) : new Date(),
        reference: reference?.trim(),
        notes: notes?.trim(),
        created_by: session.user.id
      },
      include: {
        creator: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // 📝 記錄操作日誌
    console.log(`[CASHFLOW] ${session.user.email} 新增${type === 'INCOME' ? '收入' : '支出'}記錄: ${description} - NT$${amount} (${funding_source})`)

    return NextResponse.json({
      success: true,
      data: record,
      message: `${type === 'INCOME' ? '收入' : '支出'}記錄已新增`
    })

  } catch (error) {
    console.error('新增收支記錄失敗:', error)
    return NextResponse.json({ error: '新增失敗' }, { status: 500 })
  }
}

// PUT /api/cashflow - 更新收支記錄
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: '請提供記錄ID' }, { status: 400 })
    }

    // 檢查記錄是否存在且有權限修改
    const existingRecord = await prisma.cashFlowRecord.findUnique({
      where: { id }
    })

    if (!existingRecord) {
      return NextResponse.json({ error: '記錄不存在' }, { status: 404 })
    }

    // 只有記錄創建者或超級管理員可以修改
    if (existingRecord.created_by !== session.user.id && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '無權限修改此記錄' }, { status: 403 })
    }

    // 更新記錄
    const updatedRecord = await prisma.cashFlowRecord.update({
      where: { id },
      data: {
        ...updateData,
        updated_at: new Date()
      },
      include: {
        creator: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedRecord,
      message: '記錄已更新'
    })

  } catch (error) {
    console.error('更新收支記錄失敗:', error)
    return NextResponse.json({ error: '更新失敗' }, { status: 500 })
  }
}

// 計算收支統計
async function calculateCashFlowStats(where: any) {
  // 總收入
  const totalIncome = await prisma.cashFlowRecord.aggregate({
    where: { ...where, type: 'INCOME' },
    _sum: { amount: true }
  })

  // 總支出
  const totalExpense = await prisma.cashFlowRecord.aggregate({
    where: { ...where, type: 'EXPENSE' },
    _sum: { amount: true }
  })

  // 投資方資金統計
  const investorStats = await prisma.cashFlowRecord.groupBy({
    by: ['type'],
    where: { ...where, funding_source: 'INVESTOR' },
    _sum: { amount: true }
  })

  // 個人墊付統計
  const personalStats = await prisma.cashFlowRecord.groupBy({
    by: ['type'],
    where: { ...where, funding_source: 'PERSONAL' },
    _sum: { amount: true }
  })

  const investorIncome = investorStats.find(s => s.type === 'INCOME')?._sum.amount || 0
  const investorExpense = investorStats.find(s => s.type === 'EXPENSE')?._sum.amount || 0
  const personalIncome = personalStats.find(s => s.type === 'INCOME')?._sum.amount || 0
  const personalExpense = personalStats.find(s => s.type === 'EXPENSE')?._sum.amount || 0

  return {
    total_income: totalIncome._sum.amount || 0,
    total_expense: totalExpense._sum.amount || 0,
    net_flow: (totalIncome._sum.amount || 0) - (totalExpense._sum.amount || 0),
    investor: {
      income: investorIncome,
      expense: investorExpense,
      net: investorIncome - investorExpense
    },
    personal: {
      income: personalIncome,
      expense: personalExpense,
      net: personalIncome - personalExpense
    }
  }
}

// 根據類型獲取預設分類
function getCategoryByType(type: string): string {
  return type === 'INCOME' ? '銷售收入' : '營運支出'
}