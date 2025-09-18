import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

/**
 * 🧮 Room-4: 會計分錄自動產生 API
 * 負責銷售交易的會計處理，支援雙重價格機制
 * 🔒 重要：投資方角色完全不能存取會計資料
 */

// GET /api/accounting/entries - 會計分錄列表
export async function GET(request: NextRequest) {
  try {
    // 🔒 權限檢查 - 投資方完全不能存取會計功能
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    // 🚨 投資方角色完全禁止存取會計資料
    if (session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const entryType = searchParams.get('entryType')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const isPosted = searchParams.get('isPosted')

    const skip = (page - 1) * limit

    // 建立查詢條件
    const where: any = {}

    if (entryType) where.entryType = entryType
    if (isPosted !== null) where.isPosted = isPosted === 'true'

    if (dateFrom || dateTo) {
      where.entryDate = {}
      if (dateFrom) where.entryDate.gte = new Date(dateFrom)
      if (dateTo) where.entryDate.lte = new Date(dateTo)
    }

    // 執行查詢
    const [entries, total] = await Promise.all([
      prisma.accountingEntry.findMany({
        where,
        include: {
          journalEntries: {
            orderBy: { accountCode: 'asc' }
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { entryDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.accountingEntry.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        entries,
        total,
        page,
        limit,
        hasMore: skip + limit < total
      }
    })

  } catch (error) {
    console.error('會計分錄查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}

// POST /api/accounting/entries - 自動產生會計分錄
export async function POST(request: NextRequest) {
  try {
    // 🔒 權限檢查 - 只有SUPER_ADMIN和EMPLOYEE可以產生會計分錄
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const body = await request.json()
    const {
      entryType,
      referenceId,
      referenceType,
      entryDate,
      description,
      notes
    } = body

    // 基本驗證
    if (!entryType || !referenceId || !referenceType) {
      return NextResponse.json({
        error: '分錄類型、關聯單據ID和類型為必填欄位'
      }, { status: 400 })
    }

    // 根據不同類型產生對應的會計分錄
    let journalEntries = []
    let totalAmount = 0
    let entryDescription = description

    switch (entryType) {
      case 'SALE':
        // 銷售分錄處理
        const saleData = await generateSaleEntry(referenceId, session.user.role)
        journalEntries = saleData.journalEntries
        totalAmount = saleData.totalAmount
        entryDescription = entryDescription || `銷售收入 - ${saleData.saleNumber}`
        break

      case 'PAYMENT':
        // 收款分錄處理
        const paymentData = await generatePaymentEntry(referenceId)
        journalEntries = paymentData.journalEntries
        totalAmount = paymentData.totalAmount
        entryDescription = entryDescription || `客戶付款 - ${paymentData.paymentNumber}`
        break

      default:
        return NextResponse.json({
          error: '不支援的分錄類型'
        }, { status: 400 })
    }

    // 產生分錄編號
    const entryNumber = await generateEntryNumber()

    // 建立會計分錄
    const accountingEntry = await prisma.accountingEntry.create({
      data: {
        entryNumber,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        entryType,
        referenceId,
        referenceType,
        description: entryDescription,
        totalAmount,
        notes,
        createdBy: session.user.id,
        journalEntries: {
          create: journalEntries
        }
      },
      include: {
        journalEntries: {
          orderBy: { accountCode: 'asc' }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: accountingEntry,
      message: '會計分錄產生成功'
    })

  } catch (error) {
    console.error('會計分錄產生失敗:', error)
    return NextResponse.json(
      { error: '分錄產生失敗', details: error },
      { status: 500 }
    )
  }
}

// 🔒 產生銷售分錄 - 支援雙重價格機制
async function generateSaleEntry(saleId: string, userRole: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      customer: true,
      items: {
        include: {
          product: true
        }
      }
    }
  })

  if (!sale) {
    throw new Error('銷售單不存在')
  }

  const journalEntries = []

  // 根據付款條件決定借方科目
  const debitAccount = sale.paymentTerms === 'CASH'
    ? { code: '1101', name: '現金' }
    : { code: '1103', name: '應收帳款' }

  // 🔒 核心：根據角色決定使用哪個金額
  // 超級管理員看到實際金額，其他角色看到顯示金額
  const actualAmount = userRole === 'SUPER_ADMIN' && sale.actualAmount
    ? sale.actualAmount
    : sale.totalAmount

  // 借：現金/應收帳款
  journalEntries.push({
    accountCode: debitAccount.code,
    accountName: debitAccount.name,
    debitAmount: actualAmount,
    creditAmount: 0,
    description: `銷售 - ${sale.customer.name}`
  })

  // 貸：銷貨收入
  journalEntries.push({
    accountCode: '4101',
    accountName: '銷貨收入',
    debitAmount: 0,
    creditAmount: sale.totalAmount, // 投資方看到的金額
    description: `銷售收入 - ${sale.customer.name}`
  })

  // 🔒 如果有老闆傭金且是超級管理員，額外記錄
  if (userRole === 'SUPER_ADMIN' && sale.commission && sale.commission > 0) {
    journalEntries.push({
      accountCode: '6201',
      accountName: '銷售傭金',
      debitAmount: 0,
      creditAmount: sale.commission,
      description: `銷售傭金 - ${sale.customer.name}`
    })
  }

  return {
    journalEntries,
    totalAmount: actualAmount,
    saleNumber: sale.saleNumber
  }
}

// 產生收款分錄
async function generatePaymentEntry(paymentId: string) {
  const payment = await prisma.paymentRecord.findUnique({
    where: { id: paymentId },
    include: {
      accountsReceivable: {
        include: {
          customer: true,
          sale: true
        }
      }
    }
  })

  if (!payment) {
    throw new Error('付款記錄不存在')
  }

  const journalEntries = []

  // 借：現金
  journalEntries.push({
    accountCode: '1101',
    accountName: '現金',
    debitAmount: payment.paymentAmount,
    creditAmount: 0,
    description: `收款 - ${payment.accountsReceivable.customer.name}`
  })

  // 貸：應收帳款
  journalEntries.push({
    accountCode: '1103',
    accountName: '應收帳款',
    debitAmount: 0,
    creditAmount: payment.paymentAmount,
    description: `收款 - ${payment.accountsReceivable.customer.name}`
  })

  return {
    journalEntries,
    totalAmount: payment.paymentAmount,
    paymentNumber: payment.paymentNumber
  }
}

// 產生分錄編號
async function generateEntryNumber(): Promise<string> {
  const today = new Date()
  const dateString = today.toISOString().slice(0, 10).replace(/-/g, '')

  // 查找今日最後一筆分錄
  const lastEntry = await prisma.accountingEntry.findFirst({
    where: {
      entryNumber: {
        startsWith: `AE${dateString}`
      }
    },
    orderBy: {
      entryNumber: 'desc'
    }
  })

  let sequence = 1
  if (lastEntry) {
    const lastSequence = parseInt(lastEntry.entryNumber.slice(-3))
    sequence = lastSequence + 1
  }

  return `AE${dateString}${sequence.toString().padStart(3, '0')}`
}