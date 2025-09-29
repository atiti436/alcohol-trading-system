import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { normalizeVariantType, generateVariantCode } from '@/lib/variant-utils'

/**
 * ?? Room-2: 商品變體管理 API
 * GET /api/products/[id]/variants - 取得變體清單
 * POST /api/products/[id]/variants - 建立新的變體
 */

// GET /api/products/[id]/variants - 取得變體清單
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

    // 查詢變體清單
    const variants = await prisma.productVariant.findMany({
      where: { product_id: params.id },
      orderBy: { variant_type: 'asc' },
      include: {
        _count: {
          select: {
            sale_items: true
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
    console.error('變體清單查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}

// POST /api/products/[id]/variants - 建立新的變體
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 權限檢查 - 僅 SUPER_ADMIN 與 EMPLOYEE 可以建立變體
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const body = await request.json()
    const {
      variant_type,
      description,
      base_price,
      current_price,
      discount_rate,
      limited_edition = false,
      production_year,
      serial_number,
      condition = '良好',
      stock_quantity = 0,
      sku
    } = body

    let normalizedVariantType = ''
    try {
      normalizedVariantType = normalizeVariantType(variant_type)
    } catch (validationError) {
      return NextResponse.json({
        error: validationError instanceof Error ? validationError.message : '變體類型不合法'
      }, { status: 400 })
    }

    const missingFields: string[] = []
    if (!normalizedVariantType) missingFields.push('variant_type')
    if (!description) missingFields.push('description')
    if (!base_price) missingFields.push('base_price')
    if (!current_price) missingFields.push('current_price')
    if (!sku) missingFields.push('sku')

    if (missingFields.length > 0) {
      return NextResponse.json({
        error: '必填欄位未提供',
        required: missingFields
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

    // 檢查變體類型是否已存在（同一商品下不可重複）
    const existingVariant = await prisma.productVariant.findUnique({
      where: {
        product_id_variant_type: {
          product_id: params.id,
          variant_type: normalizedVariantType
        }
      }
    })

    if (existingVariant) {
      return NextResponse.json({
        error: 變體類型  已存在
      }, { status: 400 })
    }

    // 生成變體代碼
    const variant_code = await generateVariantCode(
      prisma,
      params.id,
      product.product_code,
      normalizedVariantType
    )

    // 建立變體
    const variant = await prisma.productVariant.create({
      data: {
        product_id: params.id,
        variant_code,
        sku,
        variant_type: normalizedVariantType,
        description,
        base_price,
        current_price,
        discount_rate,
        limited_edition,
        production_year,
        serial_number,
        condition,
        stock_quantity
      }
    })

    return NextResponse.json({
      success: true,
      data: variant,
      message: '變體建立成功'
    })

  } catch (error) {
    console.error('變體建立失敗:', error)
    return NextResponse.json(
      { error: '建立失敗', details: error },
      { status: 500 }
    )
  }
}
