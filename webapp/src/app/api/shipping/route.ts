import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

/**
 * 📦 Room-5: 出貨單管理 API
 * 核心功能：出貨單生成 + PDF列印 + 投資方數據隔離
 */

// GET /api/shipping - 出貨單列表
export async function GET(request: NextRequest) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const customer_id = searchParams.get('customer_id')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const orderBy = searchParams.get('orderBy') || 'shippingDate'
    const order = searchParams.get('order') || 'desc'

    const skip = (page - 1) * limit

    // 建立查詢條件
    const where: any = {}

    // 🔒 投資方數據隔離：只能看公司資金的出貨
    if (session.user.role === 'INVESTOR') {
      where.sale = {
        fundingSource: 'COMPANY'
      }
    }

    // 篩選條件
    if (customer_id) {
      where.customer_id = customer_id
    }

    if (status) {
      where.status = status
    }

    // 日期範圍篩選
    if (dateFrom || dateTo) {
      where.shippingDate = {}
      if (dateFrom) {
        where.shippingDate.gte = new Date(dateFrom)
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        where.shippingDate.lte = endDate
      }
    }

    // 搜尋條件
    if (search) {
      where.OR = [
        { shippingNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { company: { contains: search, mode: 'insensitive' } } },
        { notes: { contains: search, mode: 'insensitive' } }
      ]
    }

    // 執行查詢 - 注意：目前使用Sale模型模擬出貨單
    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where: {
          ...where,
          isPaid: true // 只有已付款的才能出貨
        },
        skip,
        take: limit,
        orderBy: { [orderBy === 'shippingDate' ? 'created_at' : orderBy]: order },
        include: {
          customer: {
            select: {
              id: true,
              customer_code: true,
              name: true,
              company: true,
              contact_person: true,
              phone: true,
              address: true,
              shipping_address: true
            }
          },
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
                  volume_ml: true,
                  weight: true
                }
              },
              variant: {
                select: {
                  id: true,
                  variant_code: true,
                  description: true,
                  weight_kg: true
                }
              }
            }
          }
        }
      }),
      prisma.sale.count({
        where: {
          ...where,
          isPaid: true
        }
      })
    ])

    // 🔒 資料過濾：投資方看不到敏感資訊
    const filteredShippingData = sales.map(sale => {
      const shippingData = {
        id: sale.id,
        shippingNumber: `SH${sale.saleNumber.slice(2)}`, // SH20250917001
        saleNumber: sale.saleNumber,
        customer_id: sale.customer_id,
        customer: sale.customer,
        shippingDate: sale.created_at, // 暫時使用創建日期
        status: 'READY', // 出貨狀態
        total_amount: sale.total_amount,
        actual_amount: session.user.role !== 'INVESTOR' ? sale.actual_amount : undefined,
        commission: session.user.role !== 'INVESTOR' ? sale.commission : undefined,
        notes: sale.notes,
        creator: session.user.role !== 'INVESTOR' ? sale.creator : null,
        items: sale.items.map(item => ({
          ...item,
          actual_unit_price: session.user.role === 'INVESTOR' ? undefined : item.actual_unit_price,
          actual_total_price: session.user.role === 'INVESTOR' ? undefined : item.actual_total_price
        }))
      }

      return shippingData
    })

    return NextResponse.json({
      success: true,
      data: {
        shippingOrders: filteredShippingData,
        total,
        page,
        limit,
        hasMore: skip + limit < total
      }
    })

  } catch (error) {
    console.error('查詢出貨單失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}

// POST /api/shipping - 創建出貨單
export async function POST(request: NextRequest) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    // 投資方不能創建出貨單
    if (session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const body = await request.json()
    const {
      saleId,
      customer_id,
      shippingDate,
      items,
      notes
    } = body

    // 資料驗證
    if (!saleId && !customer_id) {
      return NextResponse.json({ error: '請提供銷售單ID或客戶ID' }, { status: 400 })
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: '請選擇出貨商品' }, { status: 400 })
    }

    let sale = null
    if (saleId) {
      // 基於現有銷售單創建出貨單
      sale = await prisma.sale.findUnique({
        where: { id: saleId },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
              variant: true
            }
          }
        }
      })

      if (!sale) {
        return NextResponse.json({ error: '銷售單不存在' }, { status: 400 })
      }

      if (!sale.isPaid) {
        return NextResponse.json({ error: '銷售單尚未付款，無法出貨' }, { status: 400 })
      }
    }

    // 生成出貨單號
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

    const lastShipping = await prisma.sale.findFirst({
      where: {
        saleNumber: {
          startsWith: `SH${dateStr}`
        }
      },
      orderBy: { saleNumber: 'desc' }
    })

    let nextNumber = 1
    if (lastShipping) {
      const lastNumber = parseInt(lastShipping.saleNumber.slice(-3))
      nextNumber = lastNumber + 1
    }

    const shippingNumber = `SH${dateStr}${nextNumber.toString().padStart(3, '0')}`

    // 暫時將出貨單資訊存儲在sales表的notes中
    // TODO: 後續可建立獨立的shipping_orders表
    const shippingData = {
      type: 'SHIPPING_ORDER',
      shippingNumber,
      shippingDate: shippingDate || new Date().toISOString(),
      status: 'READY',
      items: items.map((item: any) => ({
        product_id: item.product_id,
        variantId: item.variantId,
        quantity: item.quantity,
        notes: item.notes
      })),
      originalNotes: sale?.notes || notes
    }

    return NextResponse.json({
      success: true,
      data: {
        shippingNumber,
        shippingDate: shippingData.shippingDate,
        customer_id: sale?.customer_id || customer_id,
        customer: sale?.customer,
        items: shippingData.items,
        totalItems: items.reduce((sum: number, item: any) => sum + item.quantity, 0)
      },
      message: '出貨單創建成功'
    })

  } catch (error) {
    console.error('創建出貨單失敗:', error)
    return NextResponse.json(
      { error: '創建失敗', details: error },
      { status: 500 }
    )
  }
}