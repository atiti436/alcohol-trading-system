import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { validateCustomerData } from '@/lib/validation'
import {
  CustomerWhereCondition,
  CustomerQueryParams,
  StandardApiResponse
} from '@/types/api'

/**
 * 🏠 Room-2: Customer 模組 API
 * 負責客戶基本資料管理、分級系統、搜尋功能
 */

// GET /api/customers - 客戶列表(支援搜尋和分頁)
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
    const tier = searchParams.get('tier') // 分級篩選
    const orderBy = searchParams.get('orderBy') || 'created_at'
    const order = searchParams.get('order') || 'desc'

    const skip = (page - 1) * limit

    // 建立查詢條件 - 🔧 修復：使用正確的型別定義
    const where: CustomerWhereCondition = {
      is_active: true
    }

    // 搜尋條件 - 支援姓名、電話、公司的模糊搜尋
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contact_person: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { company: { contains: search, mode: 'insensitive' } },
        { customer_code: { contains: search, mode: 'insensitive' } }
      ]
    }

    // 分級篩選
    if (tier) {
      where.tier = tier
    }

    // 權限過濾 - 投資方看不到個人調貨相關客戶
    if (session.user.role === 'INVESTOR') {
      // TODO: 這裡需要根據商業邏輯過濾個人調貨客戶
      // 暫時先允許看到所有客戶，具體過濾邏輯待Room-4確認
    }

    // 執行查詢
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        include: {
          _count: {
            select: {
              sales: true // 統計訂單數量
            }
          }
        }
      }),
      prisma.customer.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        customers,
        total,
        page,
        limit,
        hasMore: skip + limit < total
      }
    })

  } catch (error) {
    console.error('客戶列表查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}

// POST /api/customers - 新增客戶
export async function POST(request: NextRequest) {
  try {
    // 權限檢查 - 只有SUPER_ADMIN和EMPLOYEE可以新增客戶
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const body = await request.json()

    // 🔒 嚴格輸入驗證 - 修復安全漏洞
    let validatedData
    try {
      validatedData = validateCustomerData(body)
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
      contact_person,
      phone,
      email,
      company,
      tax_id,
      address,
      tier,
      creditLimit,
      paymentTerms,
      notes
    } = validatedData

    // 額外業務邏輯驗證
    const shipping_address = body.shipping_address || address
    const requiresInvoice = Boolean(body.requiresInvoice)

    // 生成客戶代碼
    const customer_code = await generateCustomerCode()

    // 創建客戶
    const customer = await prisma.customer.create({
      data: {
        customer_code,
        name,
        contact_person,
        phone,
        email,
        company,
        tax_id,
        address,
        shipping_address,
        tier,
        paymentTerms,
        requiresInvoice,
        credit_limit: creditLimit,
        notes
      }
    })

    return NextResponse.json({
      success: true,
      data: customer,
      message: '客戶創建成功'
    })

  } catch (error) {
    console.error('客戶創建失敗:', error)
    return NextResponse.json(
      { error: '創建失敗', details: error },
      { status: 500 }
    )
  }
}

/**
 * 生成客戶代碼 - 格式：C00001
 */
async function generateCustomerCode(): Promise<string> {
  // 查找最後一個客戶代碼
  const lastCustomer = await prisma.customer.findFirst({
    where: {
      customer_code: {
        startsWith: 'C'
      }
    },
    orderBy: {
      customer_code: 'desc'
    }
  })

  let nextNumber = 1
  if (lastCustomer?.customer_code) {
    const lastNumber = parseInt(lastCustomer.customer_code.substring(1))
    nextNumber = lastNumber + 1
  }

  return `C${nextNumber.toString().padStart(5, '0')}`
}