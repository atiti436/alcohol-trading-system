import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/auth-config'
import { validateProductData } from '@/lib/validation'

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

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category') // 分類篩選
    const orderBy = searchParams.get('orderBy') || 'createdAt'
    const order = searchParams.get('order') || 'desc'
    const active = searchParams.get('active') !== 'false' // 預設只顯示活躍商品

    const skip = (page - 1) * limit

    // 建立查詢條件
    const where: any = {}

    // 只顯示活躍商品
    if (active) {
      where.isActive = true
    }

    // 搜尋條件 - 支援商品名稱、產品編號、品牌的模糊搜尋
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { product_code: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { supplier: { contains: search, mode: 'insensitive' } }
      ]
    }

    // 分類篩選
    if (category) {
      where.category = category
    }

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
              variantType: true,
              description: true,
              currentPrice: true,
              stock: true,
              condition: true
            }
          },
          _count: {
            select: {
              variants: true,
              saleItems: true
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
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const body = await request.json()

    // 🔒 嚴格輸入驗證 - 修復安全漏洞
    let validatedData
    try {
      validatedData = validateProductData(body)
    } catch (validationError) {
      return NextResponse.json(
        {
          error: '輸入資料驗證失敗',
          details: validationError instanceof Error ? validationError.message : '格式錯誤'
        },
        { status: 400 }
      )
    }

    const {
      name,
      product_code: inputProductCode,
      category,
      brand,
      supplier,
      costPrice,
      sellingPrice,
      investorPrice,
      stock_quantity,
      available_stock,
      safetyStock,
      description,
      specifications
    } = validatedData

    // 從body中提取產品特有欄位（validation後處理）
    const {
      volume_ml,
      alc_percentage,
      weight,
      packageWeight,
      hasBox = false,
      hasAccessories = false,
      accessoryWeight,
      accessories = [],
      hsCode,
      manufacturingDate,
      expiryDate,
      standardPrice,
      currentPrice,
      minPrice,
      createDefaultVariant = true
    } = body

    // 商品特有驗證
    if (!volume_ml || !alc_percentage || !standardPrice || !currentPrice || !minPrice) {
      return NextResponse.json({
        error: '商品必填欄位不完整',
        required: ['volume_ml', 'alc_percentage', 'standardPrice', 'currentPrice', 'minPrice']
      }, { status: 400 })
    }

    // 生成產品編號
    const product_code = await generateProductCode()

    // 計算總重量
    const totalWeight = weight + (packageWeight || 0) + (accessoryWeight || 0)

    // 創建商品
    const product = await prisma.product.create({
      data: {
        product_code,
        code: product_code, // 向後相容性
        name,
        category,
        volume_ml,
        alc_percentage,
        weight,
        packageWeight,
        totalWeight,
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
        costPrice: 0, // 初始成本為0，等進貨後更新
        minPrice
      }
    })

    // 自動創建預設變體（一般版）
    let defaultVariant = null
    if (createDefaultVariant) {
      const variant_code = `${product_code}-A`
      defaultVariant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          variant_code,
          variantType: 'A',
          description: '一般版',
          basePrice: standardPrice,
          currentPrice: currentPrice
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