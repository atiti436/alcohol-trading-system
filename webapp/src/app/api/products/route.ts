import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { validateProductData } from '@/lib/validation'
import { DEFAULT_VARIANT_TYPE, generateVariantCode } from '@/lib/variant-utils'
import { DatabaseWhereCondition } from '@/types/business'
import { AlcoholCategory } from '@prisma/client'
import { Role } from '@/types/auth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * 🏠 Room-2: Product 模組 API
 * 負責商品基本資料管理、變體系統、分類管理
 */

// GET /api/products - 商品列表(支援搜尋和分頁)
export async function GET(request: NextRequest) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    // 阻擋待審核用戶
    if (session.user.role === Role.PENDING) {
      return NextResponse.json({
        error: '帳戶待審核中，暫無權限存取商品資料'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category') // 分類篩選
    const orderBy = searchParams.get('orderBy') || 'created_at'
    const order = searchParams.get('order') || 'desc'
    const active = searchParams.get('active') !== 'false' // 預設只顯示活躍商品

    const skip = (page - 1) * limit

    // 建立查詢條件
    const where: any = {}

    // 只顯示活躍商品
    if (active) {
      where.is_active = true
    }

    // 搜尋條件 - 支援商品名稱、產品編號、品牌的模糊搜尋
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { product_code: { contains: search, mode: 'insensitive' } },
        { supplier: { contains: search, mode: 'insensitive' } }
      ]
    }

    // 分類篩選
    if (category && Object.values(AlcoholCategory).includes(category as AlcoholCategory)) {
      where.category = category as AlcoholCategory
    }

    // 🔒 根據角色決定可見欄位
    const canViewActualPrice = session.user.role === 'SUPER_ADMIN' || session.user.role === 'EMPLOYEE'

    // 執行查詢
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        include: {
          variants: {
            select: {
              id: true,
              variant_code: true,
              variant_type: true,
              description: true,
              cost_price: true,
              investor_price: true,
              // 🔒 actual_price 只有 SUPER_ADMIN 和 EMPLOYEE 可見
              ...(canViewActualPrice && { actual_price: true }),
              current_price: true,
              stock_quantity: true,
              available_stock: true,
              condition: true
            }
          },
          _count: {
            select: {
              variants: true,
              sale_items: true
            }
          }
        }
      }),
      prisma.product.count({ where })
    ])

    // 🔒 如果是投資人，過濾 Product 層級的 actual_price
    const filteredProducts = session.user.role === 'INVESTOR'
      ? products.map(p => ({
          ...p,
          actual_price: undefined
        }))
      : products

    return NextResponse.json({
      success: true,
      data: {
        products: filteredProducts,
        total,
        page,
        limit,
        hasMore: skip + limit < total
      }
    })

  } catch (error) {
    console.error('商品列表查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}

// POST /api/products - 新增商品
export async function POST(request: NextRequest) {
  try {
    // 權限檢查 - 只有SUPER_ADMIN和EMPLOYEE可以新增商品
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    // 阻擋待審核用戶和投資方
    if (session.user.role === Role.PENDING) {
      return NextResponse.json({
        error: '帳戶待審核中，暫無權限新增商品'
      }, { status: 403 })
    }

    if (session.user.role === Role.INVESTOR) {
      return NextResponse.json({ error: '投資方無權新增商品' }, { status: 403 })
    }

    const body = await request.json()

    // 🔒 嚴格輸入驗證 - 修復安全漏洞
    let validatedData
    try {
      console.log('收到的商品資料:', body) // 調試輸出
      validatedData = validateProductData(body)
      console.log('驗證後的商品資料:', validatedData) // 調試輸出
    } catch (validationError) {
      console.error('商品驗證錯誤:', validationError) // 調試輸出
      return NextResponse.json(
        {
          error: '輸入資料驗證失敗',
          details: validationError instanceof Error ? validationError.message : '格式錯誤',
          originalData: body // 調試時顯示原始數據
        },
        { status: 400 }
      )
    }

    // 使用驗證過的資料
    const {
      name,
      category,
      supplier,
      volume_ml,
      alc_percentage,
      weight_kg,
      package_weight_kg,
      has_box,
      has_accessories,
      accessory_weight_kg,
      accessories,
      hs_code,
      manufacturing_date,
      expiry_date,
      standard_price,
      current_price,
      min_price
    } = validatedData

    const create_default_variant = body.create_default_variant !== false // 預設為 true

    // 生成產品編號
    const product_code = await generateProductCode()

    // 計算總重量
    const total_weight_kg = (weight_kg || 0) + (package_weight_kg || 0) + (accessory_weight_kg || 0)

    // 創建商品
    const product = await prisma.product.create({
      data: {
        product_code,
        name,
        category: category as AlcoholCategory,
        volume_ml,
        alc_percentage,
        weight_kg: weight_kg || 0,
        package_weight_kg,
        total_weight_kg,
        has_box,
        has_accessories,
        accessory_weight_kg,
        accessories,
        hs_code,
        supplier,
        manufacturing_date: manufacturing_date ? manufacturing_date.toISOString() : null,
        expiry_date: expiry_date ? expiry_date.toISOString() : null,

        // 🎯 三層價格架構
        cost_price: 0,                              // 初始成本為0，等進貨後更新
        investor_price: standard_price * 0.9,       // 預設為標準價的90%
        actual_price: standard_price,               // 實際售價
        standard_price,                             // 標準價
        current_price,                              // 當前價
        min_price                                   // 最低價
      }
    })

    // 自動創建預設變體（一般版）
    let defaultVariant = null
    if (create_default_variant) {
      const defaultVariantType = DEFAULT_VARIANT_TYPE
      // 🎯 使用流水號（P0001-001）
      const variant_code = `${product_code}-001`
      const sku = `SKU-${variant_code}`

      defaultVariant = await prisma.productVariant.create({
        data: {
          product_id: product.id,
          variant_code,
          sku,
          variant_type: defaultVariantType,
          description: defaultVariantType,

          // 🎯 三層價格架構（繼承 Product）
          cost_price: 0,
          investor_price: product.investor_price,
          actual_price: product.actual_price,
          current_price: product.current_price
        }
      })

      // 建立預設庫存（公司倉）
      await prisma.inventory.create({
        data: {
          variant_id: defaultVariant.id,
          warehouse: 'COMPANY',
          quantity: 0,
          reserved: 0,
          available: 0,
          cost_price: 0
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        product,
        defaultVariant
      },
      message: '商品創建成功'
    })

  } catch (error) {
    console.error('商品創建失敗:', error)
    return NextResponse.json(
      { error: '創建失敗', details: error },
      { status: 500 }
    )
  }
}

/**
 * 生成產品編號 - 格式：P00001
 */
async function generateProductCode(): Promise<string> {
  // 查找最後一個產品編號
  const lastProduct = await prisma.product.findFirst({
    where: {
      product_code: {
        startsWith: 'P'
      }
    },
    orderBy: {
      product_code: 'desc'
    }
  })

  let nextNumber = 1
  if (lastProduct?.product_code) {
    const lastNumber = parseInt(lastProduct.product_code.substring(1))
    nextNumber = lastNumber + 1
  }

  return `P${nextNumber.toString().padStart(5, '0')}`
}
