import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

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
    // 阻擋待審核用戶
    if ((session as any).user?.role === 'PENDING') {
      return NextResponse.json({ error: '帳戶待審核中，暫無權限存取對帳單' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const customer_id = searchParams.get('customer_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const statementType = searchParams.get('type') || 'monthly' // monthly, custom

    if (!customer_id) {
      return NextResponse.json({ error: '請選擇客戶' }, { status: 400 })
    }

    // 🔒 投資方數據隔離：只能看公司資金的交易
    const saleWhere: any = {
      customer_id,
      is_paid: true
    }

    if (session.user.role === 'INVESTOR') {
      saleWhere.funding_source = 'COMPANY'
    }

    // 日期範圍篩選
    if (dateFrom || dateTo) {
      saleWhere.created_at = {}
      if (dateFrom) {
        saleWhere.created_at.gte = new Date(dateFrom)
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        saleWhere.created_at.lte = endDate
      }
    } else {
      // 預設為當月
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      saleWhere.created_at = {
        gte: startOfMonth,
        lte: endOfMonth
      }
    }

    // 查詢客戶資料
    const customer = await prisma.customer.findUnique({
      where: { id: customer_id },
      select: {
        id: true,
        customer_code: true,
        name: true,
        company: true,
        contact_person: true,
        phone: true,
        email: true,
        address: true,
        payment_terms: true
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
      orderBy: { created_at: 'asc' }
    })

    // 查詢應收帳款記錄
    const receivables = await prisma.accountsReceivable.findMany({
      where: {
        customer_id,
        sale: {
          created_at: saleWhere.created_at
        }
      },
      include: {
        sale: {
          select: {
            id: true,
            sale_number: true,
            created_at: true
          }
        },
        payments: {
          orderBy: { payment_date: 'asc' }
        }
      },
      orderBy: { created_at: 'asc' }
    })

    // 🔒 資料過濾：投資方看不到敏感資訊
    const filteredSales = sales.map((sale: any) => {
      const saleData = {
        id: sale.id,
        sale_number: sale.sale_number,
        total_amount: sale.total_amount,
        actual_amount: session.user.role !== 'INVESTOR' ? sale.actual_amount : undefined,
        commission: session.user.role !== 'INVESTOR' ? sale.commission : undefined,
        funding_source: sale.funding_source,
        is_paid: sale.is_paid,
        paid_at: sale.paid_at,
        created_at: sale.created_at,
        creator: session.user.role !== 'INVESTOR' ? sale.creator : null,
        items: sale.items.map((item: any) => ({
          ...item,
          actual_unit_price: session.user.role === 'INVESTOR' ? undefined : item.actual_unit_price,
          actual_total_price: session.user.role === 'INVESTOR' ? undefined : item.actual_total_price
        }))
      }
      return saleData
    })

    // 計算統計資訊
    const total_sales_amount = filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0)
    const total_actual_amount = session.user.role === 'INVESTOR'
      ? total_sales_amount
      : filteredSales.reduce((sum, sale) => sum + (sale.actual_amount || sale.total_amount), 0)
    const total_commission = session.user.role === 'INVESTOR'
      ? 0
      : total_actual_amount - total_sales_amount

    const total_receivable_amount = receivables.reduce((sum, rec) => sum + rec.original_amount, 0)
    const total_paid_amount = receivables.reduce((sum, rec) =>
      sum + rec.payments.reduce((paySum, pay) => paySum + pay.payment_amount, 0), 0)
    const total_outstanding_amount = total_receivable_amount - total_paid_amount

    return NextResponse.json({
      success: true,
      data: {
        customer,
        periodInfo: {
          dateFrom: saleWhere.created_at?.gte || null,
          dateTo: saleWhere.created_at?.lte || null,
          type: statementType
        },
        sales: filteredSales,
        receivables: receivables.map(rec => ({
          ...rec,
          payments: rec.payments
        })),
        summary: {
          totalSales: filteredSales.length,
          total_sales_amount,
          total_actual_amount: session.user.role !== 'INVESTOR' ? total_actual_amount : undefined,
          total_commission: session.user.role !== 'INVESTOR' ? total_commission : undefined,
          total_receivable_amount,
          total_paid_amount,
          total_outstanding_amount
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
    if (session.user.role === 'PENDING') {
      return NextResponse.json({ error: '帳戶待審核中，暫無權限建立對帳單' }, { status: 403 })
    }

    // 投資方不能創建對帳單
    if (session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const body = await request.json()
    const { customer_id, period_start, period_end, notes } = body

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
