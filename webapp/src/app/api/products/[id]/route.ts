import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * 🏠 Room-2: 單一商品管理 API
 * GET /api/products/[id] - 商品詳情
 * PUT /api/products/[id] - 更新商品
 * DELETE /api/products/[id] - 刪除商品
 */

// GET /api/products/[id] - 商品詳情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    // 🔒 根據角色決定 variant 欄位的過濾
    const canViewActualPrice = session.user.role === 'SUPER_ADMIN' || session.user.role === 'EMPLOYEE'

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        variants: {
          select: {
            id: true,
            variant_code: true,
            variant_type: true,
            description: true,
            sku: true,
            condition: true,
            stock_quantity: true,
            reserved_stock: true,
            available_stock: true,
            cost_price: true,
            investor_price: true,
            // 🔒 actual_price 只有 SUPER_ADMIN 和 EMPLOYEE 可見
            ...(canViewActualPrice && { actual_price: true }),
            current_price: true,
            is_active: true,
            created_at: true,
            updated_at: true
          },
          orderBy: { variant_type: 'asc' }
        },
        sale_items: {
          take: 10, // 最近10筆銷售記錄
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
        special_prices: {
          include: {
            customer: {
              select: {
                name: true,
                tier: true
              }
            }
          }
        },
        _count: {
          select: {
            variants: true,
            sale_items: true
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 })
    }

    // 計算商品統計資料
    const salesStats = await prisma.saleItem.aggregate({
      where: { product_id: params.id },
      _sum: {
        quantity: true,
        total_price: true
      }
    })

    // 🔧 修正：計算總庫存（所有變體）- 使用統一命名規範
    const total_stock_quantity = product.variants.reduce((sum, variant) => sum + variant.stock_quantity, 0)

    // 🔒 如果是投資人，額外過濾 Product 層級的 actual_price
    const filteredProduct = session.user.role === 'INVESTOR'
      ? {
          ...product,
          actual_price: undefined  // 移除商品的 actual_price
        }
      : product

    return NextResponse.json({
      success: true,
      data: {
        product: filteredProduct,
        statistics: {
          totalVariants: product._count.variants,
          totalSales: product._count.sale_items,
          totalQuantitySold: salesStats._sum.quantity || 0,
          totalRevenue: salesStats._sum.total_price || 0,
          total_stock_quantity
        }
      }
    })

  } catch (error) {
    console.error('商品詳情查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}

// PUT /api/products/[id] - 更新商品
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 權限檢查 - 只有SUPER_ADMIN和EMPLOYEE可以更新商品
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      category,
      volume_ml,
      alc_percentage,
      weight_kg,
      package_weight_kg,
      has_box,
      has_accessories,
      accessory_weight_kg,
      accessories,
      hs_code,
      supplier,
      manufacturing_date,
      expiry_date,
      standard_price,
      current_price,
      cost_price,
      min_price,
      is_active
    } = body

    // 檢查商品是否存在
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id }
    })

    if (!existingProduct) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 })
    }

    // 計算總重量
    const calculatedTotalWeight = weight_kg !== undefined
      ? weight_kg + (package_weight_kg || existingProduct.package_weight_kg || 0) + (accessory_weight_kg || existingProduct.accessory_weight_kg || 0)
      : undefined

    // 更新商品資料
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(volume_ml !== undefined && { volume_ml }),
        ...(alc_percentage !== undefined && { alc_percentage }),
        ...(weight_kg !== undefined && { weight_kg }),
        ...(package_weight_kg !== undefined && { package_weight_kg }),
        ...(calculatedTotalWeight !== undefined && { total_weight_kg: calculatedTotalWeight }),
        ...(has_box !== undefined && { has_box }),
        ...(has_accessories !== undefined && { has_accessories }),
        ...(accessory_weight_kg !== undefined && { accessory_weight_kg }),
        ...(accessories && { accessories }),
        ...(hs_code !== undefined && { hs_code }),
        ...(supplier !== undefined && { supplier }),
        ...(manufacturing_date !== undefined && { manufacturing_date: manufacturing_date ? manufacturing_date.toISOString() : null }),
        ...(expiry_date !== undefined && { expiry_date: expiry_date ? expiry_date.toISOString() : null }),
        ...(standard_price !== undefined && { standard_price }),
        ...(current_price !== undefined && { current_price }),
        ...(cost_price !== undefined && { cost_price }),
        ...(min_price !== undefined && { min_price }),
        ...(is_active !== undefined && { is_active })
      }
    })

    return NextResponse.json({
      success: true,
      data: product,
      message: '商品更新成功'
    })

  } catch (error) {
    console.error('商品更新失敗:', error)
    return NextResponse.json(
      { error: '更新失敗', details: error },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id] - 刪除商品(軟刪除)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 權限檢查 - 只有SUPER_ADMIN可以刪除商品
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    // 檢查商品是否存在
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            sale_items: true,
            purchase_items: true
          }
        }
      }
    })

    if (!existingProduct) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 })
    }

    // 檢查是否有關聯的交易記錄
    if (existingProduct._count.sale_items > 0 || existingProduct._count.purchase_items > 0) {
      // 有交易記錄的商品只能軟刪除
      await prisma.product.update({
        where: { id: params.id },
        data: { is_active: false }
      })

      return NextResponse.json({
        success: true,
        message: '商品已停用（因有交易記錄）'
      })
    } else {
      // 無交易記錄可以直接刪除（連同變體）
      await prisma.product.delete({
        where: { id: params.id }
      })

      return NextResponse.json({
        success: true,
        message: '商品已刪除'
      })
    }

  } catch (error) {
    console.error('商品刪除失敗:', error)
    return NextResponse.json(
      { error: '刪除失敗', details: error },
      { status: 500 }
    )
  }
}
