import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

export const dynamic = 'force-dynamic'

/**
 * 缺貨追蹤 API
 * GET /api/backorders - 查詢缺貨列表
 * POST /api/backorders - 建立缺貨記錄（手動）
 */

// GET /api/backorders - 查詢缺貨列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'
    const groupBy = searchParams.get('groupBy') || 'variant' // variant | customer
    const variantId = searchParams.get('variantId')
    const customerId = searchParams.get('customerId')

    // 建立查詢條件
    const where: any = {
      status
    }

    if (variantId) {
      where.variant_id = variantId
    }

    if (customerId) {
      where.sale = {
        customer_id: customerId
      }
    }

    // 查詢缺貨記錄
    const backorders = await prisma.backorderTracking.findMany({
      where,
      include: {
        sale: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                customer_code: true,
                tier: true
              }
            }
          }
        },
        variant: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                product_code: true
              }
            }
          }
        }
      },
      orderBy: [
        { priority: 'desc' }, // 優先級高的排前面
        { created_at: 'asc' } // 相同優先級按時間排序
      ]
    })

    // 根據 groupBy 參數組織數據
    let result: any = backorders

    if (groupBy === 'variant') {
      // 按商品變體彙總
      const grouped = new Map<string, any>()

      for (const backorder of backorders) {
        const variantId = backorder.variant_id
        if (!grouped.has(variantId)) {
          grouped.set(variantId, {
            variant_id: variantId,
            variant_code: backorder.variant.variant_code,
            product_name: backorder.variant.product.name,
            product_code: backorder.variant.product.product_code,
            total_shortage: 0,
            backorder_count: 0,
            customer_count: 0,
            backorders: []
          })
        }

        const group = grouped.get(variantId)!
        group.total_shortage += backorder.shortage_quantity
        group.backorder_count += 1
        group.backorders.push({
          id: backorder.id,
          sale_id: backorder.sale_id,
          sale_number: backorder.sale.sale_number,
          customer_name: backorder.sale.customer.name,
          customer_code: backorder.sale.customer.customer_code,
          shortage_quantity: backorder.shortage_quantity,
          priority: backorder.priority,
          created_at: backorder.created_at,
          notes: backorder.notes
        })
      }

      // 計算每個變體的客戶數
      grouped.forEach(group => {
        const uniqueCustomers = new Set(group.backorders.map((b: any) => b.customer_name))
        group.customer_count = uniqueCustomers.size
      })

      result = Array.from(grouped.values())
    } else if (groupBy === 'customer') {
      // 按客戶彙總
      const grouped = new Map<string, any>()

      for (const backorder of backorders) {
        const customerId = backorder.sale.customer_id
        if (!grouped.has(customerId)) {
          grouped.set(customerId, {
            customer_id: customerId,
            customer_name: backorder.sale.customer.name,
            customer_code: backorder.sale.customer.customer_code,
            customer_tier: backorder.sale.customer.tier,
            total_shortage: 0,
            backorder_count: 0,
            product_count: 0,
            backorders: []
          })
        }

        const group = grouped.get(customerId)!
        group.total_shortage += backorder.shortage_quantity
        group.backorder_count += 1
        group.backorders.push({
          id: backorder.id,
          sale_id: backorder.sale_id,
          sale_number: backorder.sale.sale_number,
          variant_code: backorder.variant.variant_code,
          product_name: backorder.variant.product.name,
          shortage_quantity: backorder.shortage_quantity,
          priority: backorder.priority,
          created_at: backorder.created_at,
          notes: backorder.notes
        })
      }

      // 計算每個客戶的商品數
      grouped.forEach(group => {
        const uniqueProducts = new Set(group.backorders.map((b: any) => b.product_name))
        group.product_count = uniqueProducts.size
      })

      result = Array.from(grouped.values())
    }

    return NextResponse.json({
      success: true,
      data: result,
      summary: {
        total_backorders: backorders.length,
        total_shortage: backorders.reduce((sum, b) => sum + b.shortage_quantity, 0)
      }
    })

  } catch (error) {
    console.error('查詢缺貨記錄失敗:', error)
    return NextResponse.json(
      {
        error: '查詢失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
}

// POST /api/backorders - 建立缺貨記錄（手動）
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const {
      sale_id,
      variant_id,
      shortage_quantity,
      priority = 50,
      notes
    } = await request.json()

    if (!sale_id || !variant_id || !shortage_quantity) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    if (shortage_quantity <= 0) {
      return NextResponse.json({ error: '缺貨數量必須大於 0' }, { status: 400 })
    }

    // 檢查銷售單是否存在
    const sale = await prisma.sale.findUnique({
      where: { id: sale_id },
      include: {
        customer: true
      }
    })

    if (!sale) {
      return NextResponse.json({ error: '銷售單不存在' }, { status: 404 })
    }

    // 建立缺貨記錄
    const backorder = await prisma.backorderTracking.create({
      data: {
        sale_id,
        variant_id,
        shortage_quantity,
        priority,
        status: 'PENDING',
        notes: notes || `手動建立缺貨記錄 - ${session.user.name}`
      },
      include: {
        sale: {
          include: {
            customer: true
          }
        },
        variant: {
          include: {
            product: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: '缺貨記錄建立成功',
      data: backorder
    })

  } catch (error) {
    console.error('建立缺貨記錄失敗:', error)
    return NextResponse.json(
      {
        error: '建立失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
}
