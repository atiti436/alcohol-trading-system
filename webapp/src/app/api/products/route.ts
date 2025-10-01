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
        select: {
          // ✅ 只選擇需要的欄位，排除 deprecated 的價格欄位
          id: true,
          product_code: true,
          name: true,
          category: true,
          volume_ml: true,
          alc_percentage: true,
          weight_kg: true,
          package_weight_kg: true,
          total_weight_kg: true,
          has_box: true,
          has_accessories: true,
          accessory_weight_kg: true,
          accessories: true,
          hs_code: true,
          supplier: true,
          manufacturing_date: true,
          expiry_date: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          // ❌ 不回傳 deprecated 的 Product 層級價格
          // cost_price, investor_price, actual_price, standard_price, current_price, min_price
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

    return NextResponse.json({
      success: true,
      data: {
        products,
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

    // 🎯 強制要求變體資料
    if (!body.variant || !body.variant.variant_type) {
      return NextResponse.json(
        {
          error: '缺少必要的變體資料',
          details: '商品必須至少包含一個變體，請提供 variant.variant_type'
        },
        { status: 400 }
      )
    }

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
      expiry_date
    } = validatedData

    // 🎯 提取變體資料
    const variantData = body.variant

    // 生成產品編號
    const product_code = await generateProductCode()

    // 計算總重量
    const total_weight_kg = (weight_kg || 0) + (package_weight_kg || 0) + (accessory_weight_kg || 0)

    // 🎯 使用 Transaction 確保 Product + Variant + Inventory 一起創建
    const result = await prisma.$transaction(async (tx) => {
      // 創建商品（不含價格，價格統一在變體層級）
      const product = await tx.product.create({
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

          // 🎯 Product 層級價格設為 0（已棄用，統一使用變體價格）
          cost_price: 0,
          investor_price: 0,
          actual_price: 0,
          standard_price: 0,
          current_price: 0,
          min_price: 0
        }
      })

      // 🎯 創建首個變體（強制要求）
      const variant_code = `${product_code}-001`
      const sku = `SKU-${variant_code}`

      const variant = await tx.productVariant.create({
        data: {
          product_id: product.id,
          variant_code,
          sku,
          variant_type: variantData.variant_type,
          description: variantData.variant_type,

          // 🎯 三層價格架構（來自前端輸入）
          cost_price: parseFloat(variantData.cost_price?.toString() || '0'),
          investor_price: parseFloat(variantData.investor_price?.toString() || '0'),
          actual_price: parseFloat(variantData.actual_price?.toString() || '0'),
          current_price: parseFloat(variantData.current_price?.toString() || variantData.investor_price?.toString() || '0')
        }
      })

      // 建立預設庫存（公司倉）
      await tx.inventory.create({
        data: {
          variant_id: variant.id,
          warehouse: 'COMPANY',
          quantity: 0,
          reserved: 0,
          available: 0,
          cost_price: parseFloat(variantData.cost_price?.toString() || '0')
        }
      })

      return { product, variant }
    })

    return NextResponse.json({
      success: true,
      data: {
        product: result.product,
        variant: result.variant
      },
      message: `商品創建成功（${result.product.product_code}），已自動創建首個變體（${result.variant.variant_code}）`
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
