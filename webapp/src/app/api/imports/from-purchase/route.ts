import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
      where: { purchaseId }
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
        importNumber,
        purchaseId: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        supplier: purchase.supplier,
        totalValue: purchase.total_amount,
        currency: purchase.currency,
        exchangeRate: purchase.exchangeRate,
        status: 'PENDING',
        alcoholTax: 0,
        businessTax: 0,
        tradePromotionFee: 0,
        totalTaxes: 0,
        items: {
          create: purchase.items.map(item => ({
            product_name: item.product_name,
            quantity: item.quantity,
            alcoholPercentage: 40, // 預設值，待報單識別更新
            volume: 700, // 預設值
            dutiableValue: item.total_price * purchase.exchangeRate,
            alcoholTax: 0,
            businessTax: 0,
            tariffCode: item.tariffCode
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