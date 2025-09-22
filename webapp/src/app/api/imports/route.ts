import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未授權' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const orderBy = searchParams.get('orderBy') || 'created_at'
    const order = searchParams.get('order') || 'desc'

    const skip = (page - 1) * limit

    // 構建查詢條件
    const where: any = {}

    if (search) {
      where.OR = [
        { import_number: { contains: search, mode: 'insensitive' } },
        { supplier: { contains: search, mode: 'insensitive' } },
        { declaration_number: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (status) {
      where.status = status
    }

    // 查詢進貨記錄
    const [imports, total] = await Promise.all([
      prisma.importRecord.findMany({
        where,
        include: {
          items: true,
          _count: { select: { items: true } }
        },
        orderBy: { [orderBy]: order },
        skip,
        take: limit
      }),
      prisma.importRecord.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        imports,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('獲取進貨記錄失敗:', error)
    return NextResponse.json(
      { success: false, error: '獲取進貨記錄失敗' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未授權' }, { status: 401 })
    }

    const body = await request.json()
    const {
      purchaseId,
      declarationNumber,
      declarationDate,
      notes
    } = body

    // 查詢採購單
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: true }
    })

    if (!purchase) {
      return NextResponse.json(
        { success: false, error: '採購單不存在' },
        { status: 404 }
      )
    }

    if (purchase.status !== 'CONFIRMED') {
      return NextResponse.json(
        { success: false, error: '只能從已確認的採購單創建進貨記錄' },
        { status: 400 }
      )
    }

    // 檢查是否已經創建過進貨記錄
    const existingImport = await prisma.importRecord.findFirst({
      where: { purchase_id: purchaseId }
    })

    if (existingImport) {
      return NextResponse.json(
        { success: false, error: '此採購單已創建進貨記錄' },
        { status: 400 }
      )
    }

    // 生成進貨單號
    const now = new Date()
    const importNumber = `IMP${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(Date.now()).slice(-4)}`

    // 創建進貨記錄
    const importRecord = await prisma.importRecord.create({
      data: {
        import_number: importNumber,
        purchase_id: purchase.id,
        purchase_number: purchase.purchaseNumber,
        supplier: purchase.supplier,
        total_value: purchase.total_amount,
        currency: purchase.currency,
        exchange_rate: purchase.exchangeRate,
        declaration_number: declarationNumber,
        declaration_date: declarationDate ? new Date(declarationDate) : undefined,
        status: 'PENDING',
        alcohol_tax: 0,
        business_tax: 0,
        trade_promotion_fee: 0,
        total_taxes: 0,
        notes,
        items: {
          create: purchase.items.map(item => ({
            product_name: item.product_name,
            quantity: item.quantity,
            alcohol_percentage: 40, // 預設值，待報單識別更新
            volume: 700, // 預設值
            dutiable_value: item.total_price * purchase.exchangeRate,
            alcohol_tax: 0,
            business_tax: 0,
            tariff_code: item.tariffCode
          }))
        }
      },
      include: {
        items: true,
        _count: { select: { items: true } }
      }
    })

    return NextResponse.json({
      success: true,
      data: importRecord
    })

  } catch (error) {
    console.error('創建進貨記錄失敗:', error)
    return NextResponse.json(
      { success: false, error: '創建進貨記錄失敗' },
      { status: 500 }
    )
  }
}