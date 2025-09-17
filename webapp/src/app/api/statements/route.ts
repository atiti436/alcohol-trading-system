import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/auth-config'

/**
 * 📋 Room-5: 對帳單管理 API
 * 核心功能：對帳單生成 + PDF列印 + 投資方數據隔離
 */

// GET /api/statements - 對帳單生成
export async function GET(request: NextRequest) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const statementType = searchParams.get('type') || 'monthly' // monthly, custom

    if (!customerId) {
      return NextResponse.json({ error: '請選擇客戶' }, { status: 400 })
    }

    // 🔒 投資方數據隔離：只能看公司資金的交易
    const saleWhere: any = {
      customerId,
      isPaid: true
    }

    if (session.user.role === 'INVESTOR') {
      saleWhere.fundingSource = 'COMPANY'
    }

    // 日期範圍篩選
    if (dateFrom || dateTo) {
      saleWhere.createdAt = {}
      if (dateFrom) {
        saleWhere.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        saleWhere.createdAt.lte = endDate
      }
    } else {
      // 預設為當月
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      saleWhere.createdAt = {
        gte: startOfMonth,
        lte: endOfMonth
      }
    }

    // 查詢客戶資料
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        customer_code: true,
        name: true,
        company: true,
        contact_person: true,
        phone: true,
        email: true,
        address: true,
        paymentTerms: true
      }
    })

    if (!customer) {
      return NextResponse.json({ error: '客戶不存在' }, { status: 404 })
    }

    // 查詢期間內的銷售記錄
    const sales = await prisma.sale.findMany({
      where: saleWhere,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                product_code: true,
                name: true,
                category: true,
                volume_ml: true
              }
            },
            variant: {
              select: {
                id: true,
                variant_code: true,
                description: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // 查詢應收帳款記錄
    const receivables = await prisma.accountsReceivable.findMany({
      where: {
        customerId,
        sale: {
          createdAt: saleWhere.createdAt
        }
      },
      include: {
        sale: {
          select: {
            id: true,
            saleNumber: true,
            createdAt: true
          }
        },
        payments: {
          orderBy: { paymentDate: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // 🔒 資料過濾：投資方看不到敏感資訊
    const filteredSales = sales.map(sale => {
      const saleData = {
        id: sale.id,
        saleNumber: sale.saleNumber,
        totalAmount: sale.totalAmount,
        actualAmount: session.user.role !== 'INVESTOR' ? sale.actualAmount : undefined,
        commission: session.user.role !== 'INVESTOR' ? sale.commission : undefined,
        fundingSource: sale.fundingSource,
        isPaid: sale.isPaid,
        paidAt: sale.paidAt,
        createdAt: sale.createdAt,
        creator: session.user.role !== 'INVESTOR' ? sale.creator : null,
        items: sale.items.map(item => ({
          ...item,
          actualUnitPrice: session.user.role === 'INVESTOR' ? undefined : item.actualUnitPrice,
          actualTotalPrice: session.user.role === 'INVESTOR' ? undefined : item.actualTotalPrice
        }))
      }
      return saleData
    })

    // 計算統計資訊
    const totalSalesAmount = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0)
    const totalActualAmount = session.user.role === 'INVESTOR'
      ? totalSalesAmount
      : filteredSales.reduce((sum, sale) => sum + (sale.actualAmount || sale.totalAmount), 0)
    const totalCommission = session.user.role === 'INVESTOR'
      ? 0
      : totalActualAmount - totalSalesAmount

    const totalReceivableAmount = receivables.reduce((sum, rec) => sum + rec.originalAmount, 0)
    const totalPaidAmount = receivables.reduce((sum, rec) =>
      sum + rec.payments.reduce((paySum, pay) => paySum + pay.paymentAmount, 0), 0)
    const totalOutstandingAmount = totalReceivableAmount - totalPaidAmount

    return NextResponse.json({
      success: true,
      data: {
        customer,
        periodInfo: {
          dateFrom: saleWhere.createdAt?.gte || null,
          dateTo: saleWhere.createdAt?.lte || null,
          type: statementType
        },
        sales: filteredSales,
        receivables: receivables.map(rec => ({
          ...rec,
          payments: rec.payments
        })),
        summary: {
          totalSales: filteredSales.length,
          totalSalesAmount,
          totalActualAmount: session.user.role !== 'INVESTOR' ? totalActualAmount : undefined,
          totalCommission: session.user.role !== 'INVESTOR' ? totalCommission : undefined,
          totalReceivableAmount,
          totalPaidAmount,
          totalOutstandingAmount
        }
      }
    })

  } catch (error) {
    console.error('生成對帳單失敗:', error)
    return NextResponse.json(
      { error: '生成失敗', details: error },
      { status: 500 }
    )
  }
}

// POST /api/statements - 創建對帳單記錄 (未來擴展用)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    // 投資方不能創建對帳單
    if (session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const body = await request.json()
    const { customerId, periodStart, periodEnd, notes } = body

    // 這裡可以實現對帳單歷史記錄的創建
    // 暫時返回成功訊息
    return NextResponse.json({
      success: true,
      message: '對帳單記錄創建功能開發中'
    })

  } catch (error) {
    console.error('創建對帳單記錄失敗:', error)
    return NextResponse.json(
      { error: '創建失敗', details: error },
      { status: 500 }
    )
  }
}