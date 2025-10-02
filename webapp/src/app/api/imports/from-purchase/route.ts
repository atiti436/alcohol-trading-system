import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'

// 強制動態渲染
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未授權' }, { status: 401 })
    }

    const body = await request.json()
    const { purchaseId } = body

    if (!purchaseId) {
      return NextResponse.json(
        { success: false, error: '缺少採購單ID' },
        { status: 400 }
      )
    }

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

    if (purchase.status !== 'CONFIRMED' && purchase.status !== 'RECEIVED') {
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
        status: purchase.status === 'RECEIVED' ? 'RECEIVED' : 'PENDING',
        alcohol_tax: 0,
        business_tax: 0,
        trade_promotion_fee: 0,
        total_taxes: 0,
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
      data: importRecord,
      message: '進貨記錄已創建，請上傳報單進行稅金計算'
    })

  } catch (error) {
    console.error('從採購單創建進貨記錄失敗:', error)
    return NextResponse.json(
      { success: false, error: '創建進貨記錄失敗' },
      { status: 500 }
    )
  }
}
