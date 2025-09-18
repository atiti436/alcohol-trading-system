import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

/**
 * 🏠 Room-2: 客戶專價管理 API
 * 負責客戶專屬價格設定、查詢、修改功能
 * 🔒 重要：投資方角色完全不能存取此API
 */

// GET /api/customers/[id]/special-prices - 取得客戶專價清單
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔒 權限檢查 - 投資方完全不能存取專價資訊
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    // 🚨 投資方角色完全禁止存取
    if (session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const customerId = params.id
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const isActive = searchParams.get('active') !== 'false' // 預設只顯示啟用中的專價

    const skip = (page - 1) * limit

    // 查詢條件
    const where: any = {
      customer_id: customerId
    }

    // 是否只顯示啟用中的專價
    if (isActive) {
      where.is_active = true
      where.OR = [
        { expiry_date: null }, // 無到期日
        { expiry_date: { gte: new Date() } } // 或未到期
      ]
    }

    // 執行查詢
    const [specialPrices, total] = await Promise.all([
      prisma.customerSpecialPrice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          product: {
            select: {
              product_code: true,
              name_zh: true,
              name_en: true,
              standard_price: true,
              current_price: true
            }
          }
        }
      }),
      prisma.customerSpecialPrice.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        specialPrices,
        total,
        page,
        limit,
        hasMore: skip + limit < total
      }
    })

  } catch (error) {
    console.error('客戶專價查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}

// POST /api/customers/[id]/special-prices - 新增客戶專價
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔒 權限檢查 - 只有SUPER_ADMIN和EMPLOYEE可以設定專價
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const customerId = params.id
    const body = await request.json()
    const {
      product_id,
      special_price,
      reason,
      effective_date,
      expiry_date,
      notes
    } = body

    // 基本驗證
    if (!product_id || !special_price || !reason) {
      return NextResponse.json({
        error: '產品ID、專屬價格和調價原因為必填欄位'
      }, { status: 400 })
    }

    // 驗證客戶是否存在
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    })
    if (!customer) {
      return NextResponse.json({ error: '客戶不存在' }, { status: 404 })
    }

    // 驗證產品是否存在並取得標準價格
    const product = await prisma.product.findUnique({
      where: { id: product_id },
      select: { id: true, standard_price: true, current_price: true }
    })
    if (!product) {
      return NextResponse.json({ error: '產品不存在' }, { status: 404 })
    }

    // 計算折扣金額和折扣率
    const standard_price = product.standard_price
    const discount_amount = standard_price - special_price
    const discount_rate = discount_amount / standard_price

    // 驗證專價是否合理 (不能為負數，且不能高於標準價)
    if (special_price < 0) {
      return NextResponse.json({
        error: '專屬價格不能為負數'
      }, { status: 400 })
    }

    if (special_price > standard_price) {
      return NextResponse.json({
        error: '專屬價格不能高於標準價格'
      }, { status: 400 })
    }

    // 檢查是否已有啟用中的專價 (停用舊的專價)
    await prisma.customerSpecialPrice.updateMany({
      where: {
        customer_id: customerId,
        product_id: product_id,
        is_active: true
      },
      data: {
        is_active: false,
        updated_at: new Date()
      }
    })

    // 創建新的客戶專價
    const specialPrice = await prisma.customerSpecialPrice.create({
      data: {
        customer_id: customerId,
        product_id,
        standard_price,
        special_price,
        discount_amount,
        discount_rate,
        reason,
        effective_date: effective_date ? new Date(effective_date) : new Date(),
        expiry_date: expiry_date ? new Date(expiry_date) : null,
        is_active: true,
        notes,
        created_by: session.user.id
      },
      include: {
        product: {
          select: {
            product_code: true,
            name_zh: true,
            standard_price: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: specialPrice,
      message: '客戶專價設定成功'
    })

  } catch (error) {
    console.error('客戶專價創建失敗:', error)
    return NextResponse.json(
      { error: '創建失敗', details: error },
      { status: 500 }
    )
  }
}