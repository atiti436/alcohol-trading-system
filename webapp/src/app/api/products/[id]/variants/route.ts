import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

/**
 * 🏠 Room-2: 商品變體管理 API
 * GET /api/products/[id]/variants - 商品變體列表
 * POST /api/products/[id]/variants - 新增商品變體
 */

// GET /api/products/[id]/variants - 商品變體列表
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

    // 檢查商品是否存在
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, product_code: true }
    })

    if (!product) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 })
    }

    // 查詢變體列表
    const variants = await prisma.productVariant.findMany({
      where: { productId: params.id },
      orderBy: { variantType: 'asc' },
      include: {
        _count: {
          select: {
            saleItems: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        product,
        variants
      }
    })

  } catch (error) {
    console.error('變體列表查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}

// POST /api/products/[id]/variants - 新增商品變體
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 權限檢查 - 只有SUPER_ADMIN和EMPLOYEE可以新增變體
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const body = await request.json()
    const {
      variantType,
      description,
      basePrice,
      currentPrice,
      discountRate,
      limitedEdition = false,
      productionYear,
      serialNumber,
      condition = '正常',
      stock_quantity = 0
    } = body

    // 基本驗證
    if (!variantType || !description || !basePrice || !currentPrice) {
      return NextResponse.json({
        error: '必填欄位不完整',
        required: ['variantType', 'description', 'basePrice', 'currentPrice']
      }, { status: 400 })
    }

    // 檢查商品是否存在
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: { product_code: true }
    })

    if (!product) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 })
    }

    // 檢查變體類型是否已存在
    const existingVariant = await prisma.productVariant.findUnique({
      where: {
        productId_variantType: {
          productId: params.id,
          variantType: variantType
        }
      }
    })

    if (existingVariant) {
      return NextResponse.json({
        error: `變體類型 ${variantType} 已存在`
      }, { status: 400 })
    }

    // 生成變體編號
    const variant_code = `${product.product_code}-${variantType}`

    // 創建變體
    const variant = await prisma.productVariant.create({
      data: {
        productId: params.id,
        variant_code,
        variantType,
        description,
        basePrice,
        currentPrice,
        discountRate,
        limitedEdition,
        productionYear,
        serialNumber,
        condition,
        stock_quantity
      }
    })

    return NextResponse.json({
      success: true,
      data: variant,
      message: '變體創建成功'
    })

  } catch (error) {
    console.error('變體創建失敗:', error)
    return NextResponse.json(
      { error: '創建失敗', details: error },
      { status: 500 }
    )
  }
}