import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { validateProductData } from '@/lib/validation'
import { DEFAULT_VARIANT_TYPE, generateVariantCode } from '@/lib/variant-utils'
import { DatabaseWhereCondition } from '@/types/business'
import { AlcoholCategory } from '@prisma/client'
import { Role } from '@/types/auth'

// 撘瑕??皜脫?
export const dynamic = 'force-dynamic'

/**
 * ?? Room-2: Product 璅∠? API
 * 鞎痊???箸鞈?蝞∠???擃頂蝯晞?憿恣??
 */

// GET /api/products - ???”(?舀??????
export async function GET(request: NextRequest) {
  try {
    // 甈?瑼Ｘ
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '?芰?? }, { status: 401 })
    }

    // ?餅?敺祟?貊??
    if (session.user.role === Role.PENDING) {
      return NextResponse.json({
        error: '撣單敺祟?訾葉嚗?⊥?????????
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category') // ??蝭拚
    const orderBy = searchParams.get('orderBy') || 'created_at'
    const order = searchParams.get('order') || 'desc'
    const active = searchParams.get('active') !== 'false' // ?身?芷＊蝷箸暑頨???

    const skip = (page - 1) * limit

    // 撱箇??亥岷璇辣
    const where: any = {}

    // ?芷＊蝷箸暑頨???
    if (active) {
      where.is_active = true
    }

    // ??璇辣 - ?舀???迂??楊????璅∠???
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { product_code: { contains: search, mode: 'insensitive' } },
        { supplier: { contains: search, mode: 'insensitive' } }
      ]
    }

    // ??蝭拚
    if (category && Object.values(AlcoholCategory).includes(category as AlcoholCategory)) {
      where.category = category as AlcoholCategory
    }

    // ?? ?寞?閫瘙箏??航?甈?
    const canViewActualPrice = session.user.role === 'SUPER_ADMIN' || session.user.role === 'EMPLOYEE'
    const userRole = session.user.role

    // ? ?澈?蕪璇辣嚗?鞈犖?芰??砍??
    const warehouseFilter = userRole === 'INVESTOR' ? { warehouse: 'COMPANY' } : {}

    // ?瑁??亥岷
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        select: {
          // ???芷??閬?甈?嚗???deprecated ??潭?雿?
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
          // ??銝???deprecated ??Product 撅斤??寞
          // cost_price, investor_price, actual_price, standard_price, current_price, min_price
          variants: {
            select: {
              id: true,
              variant_code: true,
              variant_type: true,
              description: true,
              cost_price: true,
              investor_price: true,
              // ?? actual_price ?芣? SUPER_ADMIN ??EMPLOYEE ?航?
              ...(canViewActualPrice && { actual_price: true }),
              current_price: true,
              stock_quantity: true,
              available_stock: true,
              condition: true,
              // ? ??澈摨怠??敦
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

    const productsWithStock = products.map(product => {
      const variantInventories = product.variants.flatMap(variant => variant.inventory ?? [])
      const totalStock = variantInventories.reduce((sum, inv) => sum + inv.quantity, 0)
      const availableStock = variantInventories.reduce((sum, inv) => sum + inv.available, 0)

      return {
        ...product,
        total_stock: totalStock,
        available_stock: availableStock
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        products: productsWithStock,
        total,
        page,
        limit,
        hasMore: skip + limit < total
      }
    })

  } catch (error) {
    console.error('???”?亥岷憭望?:', error)
    return NextResponse.json(
      { error: '?亥岷憭望?', details: error },
      { status: 500 }
    )
  }
}

// POST /api/products - ?啣???
export async function POST(request: NextRequest) {
  try {
    // 甈?瑼Ｘ - ?芣?SUPER_ADMIN?MPLOYEE?臭誑?啣???
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '?芰?? }, { status: 401 })
    }

    // ?餅?敺祟?貊?嗅?????
    if (session.user.role === Role.PENDING) {
      return NextResponse.json({
        error: '撣單敺祟?訾葉嚗?⊥??憓???
      }, { status: 403 })
    }

    if (session.user.role === Role.INVESTOR) {
      return NextResponse.json({ error: '???寧甈憓??? }, { status: 403 })
    }

    const body = await request.json()

    // ??蝪∪?撽?嚗?閬?????
    const { name, category } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: '???箏?憛急?雿? },
        { status: 400 }
      )
    }

    if (!category || !Object.values(AlcoholCategory).includes(category as AlcoholCategory)) {
      return NextResponse.json(
        { error: '隢????????' },
        { status: 400 }
      )
    }

    // ???Ｗ?蝺刻?
    const product_code = await generateProductCode()

    // ? ?芸撱?Product BASE嚗??怨??澆?霈?嚗?
    const product = await prisma.product.create({
      data: {
        product_code,
        name: name.trim(),
        category: category as AlcoholCategory
        // ??銝?憛怠?隞颱?閬??潭?雿?
        // 閬?刻?擃惜蝝恣??
      }
    })

    return NextResponse.json({
      success: true,
      data: { product },
      message: `?? BASE ?萄遣??嚗?{product.product_code}嚗?隢憓?擃誑閮剖?摰閬`
    })

  } catch (error) {
    console.error('???萄遣憭望?:', error)
    return NextResponse.json(
      { error: '?萄遣憭望?', details: error },
      { status: 500 }
    )
  }
}

/**
 * ???Ｗ?蝺刻? - ?澆?嚗00001
 */
async function generateProductCode(): Promise<string> {
  // ?交?敺???楊??
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


