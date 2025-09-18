import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

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

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        variants: {
          orderBy: { variantType: 'asc' }
        },
        saleItems: {
          take: 10, // 最近10筆銷售記錄
          orderBy: { createdAt: 'desc' },
          include: {
            sale: {
              select: {
                saleNumber: true,
                customer: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        },
        specialPrices: {
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
            saleItems: true
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 })
    }

    // 計算商品統計資料
    const salesStats = await prisma.saleItem.aggregate({
      where: { productId: params.id },
      _sum: {
        quantity: true,
        totalPrice: true
      }
    })

    // 🔧 修正：計算總庫存（所有變體）- 使用統一命名規範
    const totalStock = product.variants.reduce((sum, variant) => sum + (variant.stock_quantity || variant.stock || 0), 0)

    return NextResponse.json({
      success: true,
      data: {
        product,
        statistics: {
          totalVariants: product._count.variants,
          totalSales: product._count.saleItems,
          totalQuantitySold: salesStats._sum.quantity || 0,
          totalRevenue: salesStats._sum.totalPrice || 0,
          totalStock
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
      weight,
      packageWeight,
      hasBox,
      hasAccessories,
      accessoryWeight,
      accessories,
      hsCode,
      supplier,
      manufacturingDate,
      expiryDate,
      standardPrice,
      currentPrice,
      costPrice,
      minPrice,
      // 🔧 移除：庫存字段已遷移至 ProductVariant 層級管理
      // totalStock, availableStock, reservedStock 不在 Product 模型中
      isActive
    } = body

    // 檢查商品是否存在
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id }
    })

    if (!existingProduct) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 })
    }

    // 計算總重量
    const calculatedTotalWeight = weight !== undefined
      ? weight + (packageWeight || existingProduct.packageWeight || 0) + (accessoryWeight || existingProduct.accessoryWeight || 0)
      : undefined

    // 更新商品資料
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(volume_ml !== undefined && { volume_ml }),
        ...(alc_percentage !== undefined && { alc_percentage }),
        ...(weight !== undefined && { weight }),
        ...(packageWeight !== undefined && { packageWeight }),
        ...(calculatedTotalWeight !== undefined && { totalWeight: calculatedTotalWeight }),
        ...(hasBox !== undefined && { hasBox }),
        ...(hasAccessories !== undefined && { hasAccessories }),
        ...(accessoryWeight !== undefined && { accessoryWeight }),
        ...(accessories && { accessories }),
        ...(hsCode !== undefined && { hsCode }),
        ...(supplier !== undefined && { supplier }),
        ...(manufacturingDate !== undefined && { manufacturingDate }),
        ...(expiryDate !== undefined && { expiryDate }),
        ...(standardPrice !== undefined && { standardPrice }),
        ...(currentPrice !== undefined && { currentPrice }),
        ...(costPrice !== undefined && { costPrice }),
        ...(minPrice !== undefined && { minPrice }),
        // 🔧 移除：庫存字段不在 Product 模型中，在 ProductVariant 中管理
        ...(isActive !== undefined && { isActive })
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
            saleItems: true,
            purchaseItems: true
          }
        }
      }
    })

    if (!existingProduct) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 })
    }

    // 檢查是否有關聯的交易記錄
    if (existingProduct._count.saleItems > 0 || existingProduct._count.purchaseItems > 0) {
      // 有交易記錄的商品只能軟刪除
      await prisma.product.update({
        where: { id: params.id },
        data: { isActive: false }
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