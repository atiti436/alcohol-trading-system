import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * 💰 預購訂單統計彙總 API
 * GET /api/sales/preorder-summary
 * 提供三種視圖：按商品彙總、按客戶彙總、按時間軸彙總
 */

export async function GET(request: NextRequest) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    // 查詢所有預購中的訂單
    const preorders = await prisma.sale.findMany({
      where: {
        status: 'PREORDER'
      },
      include: {
        customer: {
          select: {
            id: true,
            customer_code: true,
            name: true,
            company: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                product_code: true,
                name: true,
                category: true
              }
            },
            variant: {
              select: {
                id: true,
                variant_code: true,
                variant_type: true,
                description: true,
                current_price: true
              }
            }
          }
        }
      },
      orderBy: {
        expected_arrival_date: 'asc'
      }
    })

    // 1. 按商品彙總
    const productSummary = new Map<string, {
      product_id: string
      product_code: string
      product_name: string
      category: string
      variants: Map<string, {
        variant_id: string
        variant_code: string
        variant_type: string
        description: string | null
        total_quantity: number
        order_count: number
        customer_count: number
        customers: Set<string>
        orders: Array<{
          sale_id: string
          sale_number: string
          customer_name: string
          quantity: number
          expected_arrival_date: Date | null
        }>
      }>
      total_quantity: number
      order_count: number
      customer_count: number
      total_amount: number
    }>()

    for (const order of preorders) {
      for (const item of order.items) {
        const productKey = item.product_id

        if (!productSummary.has(productKey)) {
          productSummary.set(productKey, {
            product_id: item.product_id,
            product_code: item.product.product_code,
            product_name: item.product.name,
            category: item.product.category || '',
            variants: new Map(),
            total_quantity: 0,
            order_count: 0,
            customer_count: 0,
            total_amount: 0
          })
        }

        const productData = productSummary.get(productKey)!
        const variantKey = item.variant_id || 'no-variant'

        if (!productData.variants.has(variantKey)) {
          productData.variants.set(variantKey, {
            variant_id: item.variant_id || '',
            variant_code: item.variant?.variant_code || '',
            variant_type: item.variant?.variant_type || '',
            description: item.variant?.description || null,
            total_quantity: 0,
            order_count: 0,
            customer_count: 0,
            customers: new Set(),
            orders: []
          })
        }

        const variantData = productData.variants.get(variantKey)!

        variantData.total_quantity += item.quantity
        variantData.order_count += 1
        variantData.customers.add(order.customer_id)
        variantData.customer_count = variantData.customers.size
        variantData.orders.push({
          sale_id: order.id,
          sale_number: order.sale_number,
          customer_name: order.customer.name,
          quantity: item.quantity,
          expected_arrival_date: order.expected_arrival_date
        })

        productData.total_quantity += item.quantity
        productData.total_amount += item.unit_price * item.quantity
      }
    }

    // 轉換為數組格式
    const productSummaryArray = Array.from(productSummary.values()).map(product => ({
      ...product,
      variants: Array.from(product.variants.values()).map(v => ({
        ...v,
        customers: undefined, // 移除 Set
        customer_count: v.customers.size
      }))
    }))

    // 2. 按客戶彙總
    const customerSummary = new Map<string, {
      customer_id: string
      customer_code: string
      customer_name: string
      company: string | null
      order_count: number
      total_quantity: number
      total_amount: number
      orders: Array<{
        sale_id: string
        sale_number: string
        expected_arrival_date: Date | null
        total_amount: number
        item_count: number
        items: Array<{
          product_name: string
          variant_code: string | null
          quantity: number
          unit_price: number
        }>
      }>
    }>()

    for (const order of preorders) {
      const customerKey = order.customer_id

      if (!customerSummary.has(customerKey)) {
        customerSummary.set(customerKey, {
          customer_id: order.customer_id,
          customer_code: order.customer.customer_code,
          customer_name: order.customer.name,
          company: order.customer.company,
          order_count: 0,
          total_quantity: 0,
          total_amount: 0,
          orders: []
        })
      }

      const customerData = customerSummary.get(customerKey)!
      const orderTotalQty = order.items.reduce((sum, item) => sum + item.quantity, 0)

      customerData.order_count += 1
      customerData.total_quantity += orderTotalQty
      customerData.total_amount += order.total_amount

      customerData.orders.push({
        sale_id: order.id,
        sale_number: order.sale_number,
        expected_arrival_date: order.expected_arrival_date,
        total_amount: order.total_amount,
        item_count: order.items.length,
        items: order.items.map(item => ({
          product_name: item.product.name,
          variant_code: item.variant?.variant_code || null,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      })
    }

    const customerSummaryArray = Array.from(customerSummary.values())

    // 3. 按時間軸彙總（預計到貨日期分組）
    const timelineSummary = new Map<string, {
      date: string
      order_count: number
      total_quantity: number
      total_amount: number
      orders: Array<{
        sale_id: string
        sale_number: string
        customer_name: string
        total_amount: number
        item_count: number
      }>
    }>()

    for (const order of preorders) {
      const dateKey = order.expected_arrival_date
        ? new Date(order.expected_arrival_date).toISOString().split('T')[0]
        : 'unknown'

      if (!timelineSummary.has(dateKey)) {
        timelineSummary.set(dateKey, {
          date: dateKey,
          order_count: 0,
          total_quantity: 0,
          total_amount: 0,
          orders: []
        })
      }

      const timelineData = timelineSummary.get(dateKey)!
      const orderTotalQty = order.items.reduce((sum, item) => sum + item.quantity, 0)

      timelineData.order_count += 1
      timelineData.total_quantity += orderTotalQty
      timelineData.total_amount += order.total_amount

      timelineData.orders.push({
        sale_id: order.id,
        sale_number: order.sale_number,
        customer_name: order.customer.name,
        total_amount: order.total_amount,
        item_count: order.items.length
      })
    }

    const timelineSummaryArray = Array.from(timelineSummary.values()).sort((a, b) => {
      if (a.date === 'unknown') return 1
      if (b.date === 'unknown') return -1
      return a.date.localeCompare(b.date)
    })

    // 總覽統計
    const overview = {
      total_preorders: preorders.length,
      total_products: productSummary.size,
      total_customers: customerSummary.size,
      total_quantity: Array.from(productSummary.values()).reduce((sum, p) => sum + p.total_quantity, 0),
      total_amount: Array.from(productSummary.values()).reduce((sum, p) => sum + p.total_amount, 0)
    }

    return NextResponse.json({
      success: true,
      data: {
        overview,
        by_product: productSummaryArray,
        by_customer: customerSummaryArray,
        by_timeline: timelineSummaryArray
      }
    })

  } catch (error) {
    console.error('預購統計查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
