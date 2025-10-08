import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

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
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const orderBy = searchParams.get('orderBy') || 'created_at'
    const order = searchParams.get('order') || 'desc'

    const skip = (page - 1) * limit

    // 建立查詢條件
    const where: any = {}

    // 🔒 投資方數據隔離：只能看公司資金的出貨
    if (session.user.role === 'INVESTOR') {
      where.funding_source = 'COMPANY'
    }

    // 篩選條件
    if (customer_id) {
      where.customer_id = customer_id
    }

    if (status) {
      // NOTE: Shipping status is not on Sale model, this is a placeholder
      // where.status = status
    }

    // 日期範圍篩選
    if (dateFrom || dateTo) {
      where.created_at = {}
      if (dateFrom) {
        where.created_at.gte = new Date(dateFrom)
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        where.created_at.lte = endDate
      }
    }

    // 搜尋條件
    if (search) {
      where.OR = [
        { sale_number: { contains: search, mode: 'insensitive' } },
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
          is_paid: true // 只有已付款的才能出貨
        },
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
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
                  weight_kg: true
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
          is_paid: true
        }
      })
    ])

    // 🔒 資料過濾：投資方看不到敏感資訊
    const filteredShippingData = sales.map((sale: any) => {
      const shippingData = {
        id: sale.id,
        shippingNumber: `SH${sale.sale_number.slice(2)}`, // SH20250917001
        sale_number: sale.sale_number,
        customer_id: sale.customer_id,
        customer: sale.customer,
        shippingDate: sale.created_at, // 暫時使用創建日期
        status: 'READY', // 出貨狀態
        total_amount: sale.total_amount,
        actual_amount: session.user.role !== 'INVESTOR' ? sale.actual_amount : undefined,
        commission: session.user.role !== 'INVESTOR' ? sale.commission : undefined,
        notes: sale.notes,
        creator: session.user.role !== 'INVESTOR' ? sale.creator : null,
        items: sale.items.map((item: any) => ({
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
      sale_id,
      customer_id,
      shipping_date,
      items,
      notes
    } = body

    // 資料驗證
    if (!sale_id && !customer_id) {
      return NextResponse.json({ error: '請提供銷售單ID或客戶ID' }, { status: 400 })
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: '請選擇出貨商品' }, { status: 400 })
    }

    let sale = null
    if (sale_id) {
      // 基於現有銷售單創建出貨單
      sale = await prisma.sale.findUnique({
        where: { id: sale_id },
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

      if (!sale.is_paid) {
        return NextResponse.json({ error: '銷售單尚未付款，無法出貨' }, { status: 400 })
      }
    }

    // 生成出貨單號
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

    const lastShipping = await prisma.sale.findFirst({
      where: {
        sale_number: {
          startsWith: `SH${dateStr}`
        }
      },
      orderBy: { sale_number: 'desc' }
    })

    let nextNumber = 1
    if (lastShipping) {
      const lastNumber = parseInt(lastShipping.sale_number.slice(-3))
      nextNumber = lastNumber + 1
    }

    const shippingNumber = `SH${dateStr}${nextNumber.toString().padStart(3, '0')}`

    // 計算總金額
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (item.unit_price * item.quantity)
    }, 0)

    // 創建出貨單（使用 Sale 模型，標記為已付款）
    const newShipping = await prisma.sale.create({
      data: {
        sale_number: shippingNumber,
        customer_id: sale?.customer_id || customer_id,
        sale_date: new Date(shipping_date || new Date()),
        total_amount: totalAmount,
        actual_amount: totalAmount,
        payment_status: 'PAID',
        is_paid: true, // 標記為已付款，才會出現在出貨單列表
        funding_source: sale?.funding_source || 'COMPANY',
        created_by: session.user.id,
        notes: notes || `出貨單 - ${shippingNumber}`,
        items: {
          create: items.map((item: any) => ({
            product_id: item.product_id,
            variant_id: item.variant_id || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            actual_unit_price: item.unit_price,
            total_price: item.unit_price * item.quantity,
            actual_total_price: item.unit_price * item.quantity,
            notes: item.notes
          }))
        }
      },
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

    return NextResponse.json({
      success: true,
      data: {
        id: newShipping.id,
        shippingNumber,
        shippingDate: newShipping.sale_date,
        customer_id: newShipping.customer_id,
        customer: newShipping.customer,
        items: newShipping.items,
        totalAmount,
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
