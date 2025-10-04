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
    const userRole = session.user.role

    // 🏭 倉庫過濾條件：投資人只看公司倉
    const warehouseFilter = userRole === 'INVESTOR' ? { warehouse: 'COMPANY' } : {}

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
              condition: true,
              // 🏭 加入倉庫庫存明細
              inventory: {
                where: warehouseFilter,
                select: {
                  id: true,
                  warehouse: true,
                  quantity: true,
                  reserved: true,
                  available: true,
                  cost_price: true
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

    // ✅ 簡化驗證：只需要品名和分類
    const { name, category } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: '品名為必填欄位' },
        { status: 400 }
      )
    }

    if (!category || !Object.values(AlcoholCategory).includes(category as AlcoholCategory)) {
      return NextResponse.json(
        { error: '請選擇有效的商品分類' },
        { status: 400 }
      )
    }

    // 生成產品編號
    const product_code = await generateProductCode()

    // 🎯 只創建 Product BASE（不含規格和變體）
    const product = await prisma.product.create({
      data: {
        product_code,
        name: name.trim(),
        category: category as AlcoholCategory
        // ✅ 不再填充任何規格或價格欄位
        // 規格在變體層級管理
      }
    })

    return NextResponse.json({
      success: true,
      data: { product },
      message: `商品 BASE 創建成功（${product.product_code}），請新增變體以設定完整規格`
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
