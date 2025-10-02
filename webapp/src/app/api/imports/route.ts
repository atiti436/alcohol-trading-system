import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAppActiveUser } from '@/modules/auth/middleware/permissions'
import { Role } from '@/types/auth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

export const GET = withAppActiveUser(async (request: NextRequest, response: NextResponse, context: any) => {
  try {
    const { session } = context

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
      prisma.legacyImportRecord.findMany({
        where,
        include: {
          items: true,
          _count: { select: { items: true } }
        },
        orderBy: { [orderBy]: order },
        skip,
        take: limit
      }),
      prisma.legacyImportRecord.count({ where })
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
})

export const POST = withAppActiveUser(async (request: NextRequest, response: NextResponse, context: any) => {
  try {
    const { session } = context

    const body = await request.json()
    const {
      purchaseId,
      declarationNumber,
      declarationDate,
      notes
    } = body

    // 查詢採購單（包含商品變體資訊）
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        items: {
          include: {
            product: {
              include: {
                variants: true
              }
            }
          }
        }
      }
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
    const existingImport = await prisma.legacyImportRecord.findFirst({
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
    const importRecord = await prisma.legacyImportRecord.create({
      data: {
        import_number: importNumber,
        purchase_id: purchase.id,
        purchase_number: purchase.purchase_number,
        supplier: purchase.supplier,
        total_value: purchase.total_amount,
        currency: purchase.currency,
        exchange_rate: purchase.exchange_rate,
        declaration_number: declarationNumber,
        declaration_date: declarationDate ? new Date(declarationDate) : undefined,
        status: 'PENDING',
        alcohol_tax: 0,
        business_tax: 0,
        trade_promotion_fee: 0,
        total_taxes: 0,
        notes,
        items: {
          create: purchase.items.map(item => {
            // 從採購單明細讀取實際的酒精度和容量
            const alcoholPercentage = item.alc_percentage || 40
            const volume = item.volume_ml || 700

            return {
              product_name: item.product_name,
              quantity: item.quantity,
              alcohol_percentage: alcoholPercentage,
              volume: volume,
              dutiable_value: item.total_price * purchase.exchange_rate,
              alcohol_tax: 0,
              business_tax: 0,
              tariff_code: item.tariff_code
            }
          })
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
}, [Role.SUPER_ADMIN, Role.EMPLOYEE])