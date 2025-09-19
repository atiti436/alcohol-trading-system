import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

/**
 * 🏠 Room-2: 單一商品變體管理 API
 * GET /api/products/[id]/variants/[variantId] - 變體詳情
 * PUT /api/products/[id]/variants/[variantId] - 更新變體
 * DELETE /api/products/[id]/variants/[variantId] - 刪除變體
 */

// GET /api/products/[id]/variants/[variantId] - 變體詳情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; variantId: string } }
) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: params.variantId },
      include: {
        product: {
          select: {
            name: true,
            product_code: true,
            category: true
          }
        },
        sale_items: {
          take: 10,
          orderBy: { created_at: 'desc' },
          include: {
            sale: {
              select: {
                sale_number: true,
                customer: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            sale_items: true
          }
        }
      }
    })

    if (!variant) {
      return NextResponse.json({ error: '變體不存在' }, { status: 404 })
    }

    // 檢查是否屬於指定的商品
    if (variant.product_id !== params.id) {
      return NextResponse.json({ error: '變體不屬於指定商品' }, { status: 400 })
    }

    // 計算銷售統計
    const salesStats = await prisma.saleItem.aggregate({
      where: { variant_id: params.variantId },
      _sum: {
        quantity: true,
        total_price: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        variant,
        statistics: {
          totalSales: variant._count.sale_items,
          totalQuantitySold: salesStats._sum.quantity || 0,
          totalRevenue: salesStats._sum.total_price || 0
        }
      }
    })

  } catch (error) {
    console.error('變體詳情查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}

// PUT /api/products/[id]/variants/[variantId] - 更新變體
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; variantId: string } }
) {
  try {
    // 權限檢查 - 只有SUPER_ADMIN和EMPLOYEE可以更新變體
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const body = await request.json()
    const {
      description,
      base_price,
      current_price,
      discount_rate,
      limited_edition,
      production_year,
      serial_number,
      condition,
      stock_quantity,
      cost_price
    } = body

    // 檢查變體是否存在並屬於指定商品
    const existingVariant = await prisma.productVariant.findUnique({
      where: { id: params.variantId }
    })

    if (!existingVariant) {
      return NextResponse.json({ error: '變體不存在' }, { status: 404 })
    }

    if (existingVariant.product_id !== params.id) {
      return NextResponse.json({ error: '變體不屬於指定商品' }, { status: 400 })
    }

    // 更新變體資料
    const variant = await prisma.productVariant.update({
      where: { id: params.variantId },
      data: {
        ...(description && { description }),
        ...(base_price !== undefined && { base_price }),
        ...(current_price !== undefined && { current_price }),
        ...(discount_rate !== undefined && { discount_rate }),
        ...(limited_edition !== undefined && { limited_edition }),
        ...(production_year !== undefined && { production_year }),
        ...(serial_number !== undefined && { serial_number }),
        ...(condition && { condition }),
        ...(stock_quantity !== undefined && { stock_quantity }),
        ...(cost_price !== undefined && { cost_price })
      }
    })

    return NextResponse.json({
      success: true,
      data: variant,
      message: '變體更新成功'
    })

  } catch (error) {
    console.error('變體更新失敗:', error)
    return NextResponse.json(
      { error: '更新失敗', details: error },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id]/variants/[variantId] - 刪除變體
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; variantId: string } }
) {
  try {
    // 權限檢查 - 只有SUPER_ADMIN可以刪除變體
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    // 檢查變體是否存在並屬於指定商品
    const existingVariant = await prisma.productVariant.findUnique({
      where: { id: params.variantId },
      include: {
        _count: {
          select: {
            sale_items: true
          }
        }
      }
    })

    if (!existingVariant) {
      return NextResponse.json({ error: '變體不存在' }, { status: 404 })
    }

    if (existingVariant.product_id !== params.id) {
      return NextResponse.json({ error: '變體不屬於指定商品' }, { status: 400 })
    }

    // 檢查是否有銷售記錄
    if (existingVariant._count.sale_items > 0) {
      return NextResponse.json({
        error: '無法刪除已有銷售記錄的變體'
      }, { status: 400 })
    }

    // 檢查是否為最後一個變體
    const variantCount = await prisma.productVariant.count({
      where: { product_id: params.id }
    })

    if (variantCount <= 1) {
      return NextResponse.json({
        error: '無法刪除最後一個變體，商品至少需要一個變體'
      }, { status: 400 })
    }

    // 刪除變體
    await prisma.productVariant.delete({
      where: { id: params.variantId }
    })

    return NextResponse.json({
      success: true,
      message: '變體已刪除'
    })

  } catch (error) {
    console.error('變體刪除失敗:', error)
    return NextResponse.json(
      { error: '刪除失敗', details: error },
      { status: 500 }
    )
  }
}
