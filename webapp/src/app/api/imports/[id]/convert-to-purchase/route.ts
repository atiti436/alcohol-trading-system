import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * 🔄 Import 轉換成 Purchase
 * POST /api/imports/[id]/convert-to-purchase
 *
 * 功能：
 * 1. 檢查 Import 是否已通關完成
 * 2. 建立對應的 Purchase 採購單
 * 3. 自動帶入商品明細
 * 4. 將關稅/檢驗費轉換成額外費用
 * 5. 關聯 Import 與 Purchase
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未授權' }, { status: 401 })
    }

    const importId = params.id

    // 查詢進口記錄
    const importRecord = await prisma.import.findUnique({
      where: { id: importId },
      include: {
        items: true,
        costs: true
      }
    })

    if (!importRecord) {
      return NextResponse.json(
        { success: false, error: '進口記錄不存在' },
        { status: 404 }
      )
    }

    // 檢查是否已轉換
    if (importRecord.purchase_id) {
      return NextResponse.json(
        {
          success: false,
          error: '此進口記錄已轉換成採購單',
          purchase_id: importRecord.purchase_id
        },
        { status: 400 }
      )
    }

    // 檢查是否已通關完成
    if (importRecord.status !== 'CUSTOMS_CLEARED' && importRecord.status !== 'RECEIVED') {
      return NextResponse.json(
        {
          success: false,
          error: '進口記錄尚未通關完成，無法轉換成採購單',
          current_status: importRecord.status
        },
        { status: 400 }
      )
    }

    // 使用 transaction 確保原子性
    const result = await prisma.$transaction(async (tx) => {
      // 1. 生成採購單編號
      const today = new Date()
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
      const existingPurchases = await tx.purchase.findMany({
        where: {
          purchase_number: {
            startsWith: `PO-${dateStr}`
          }
        },
        orderBy: {
          purchase_number: 'desc'
        },
        take: 1
      })

      let sequence = 1
      if (existingPurchases.length > 0) {
        const lastNumber = existingPurchases[0].purchase_number
        const lastSequence = parseInt(lastNumber.split('-')[2] || '0')
        sequence = lastSequence + 1
      }

      const purchase_number = `PO-${dateStr}-${sequence.toString().padStart(4, '0')}`

      // 2. 計算商品總價
      const total_amount = importRecord.items.reduce((sum, item) =>
        sum + (item.unit_price * item.ordered_quantity), 0
      )

      // 3. 建立採購單
      const purchase = await tx.purchase.create({
        data: {
          purchase_number,
          supplier: importRecord.supplier,
          total_amount,
          currency: importRecord.currency,
          exchange_rate: importRecord.exchange_rate,
          status: 'CONFIRMED', // 進口商品已到貨，直接確認
          funding_source: importRecord.import_type === 'PRIVATE' ? 'PERSONAL' : 'COMPANY',
          warehouse: importRecord.warehouse,
          notes: `由進口記錄 ${importRecord.import_number} 自動轉換\n${importRecord.notes || ''}`,
          created_by: session.user.id,
          items: {
            create: importRecord.items.map(item => ({
              product_id: null, // Import 可能沒有 product_id，只有 variant
              product_name: item.product_name,
              variant_id: item.variant_id,
              quantity: item.ordered_quantity,
              unit_price: item.unit_price,
              subtotal: item.subtotal,
              weight_kg: 0, // 可以從 variant 取得
              notes: item.tariff_rate ? `關稅率: ${item.tariff_rate}%` : undefined
            }))
          }
        },
        include: {
          items: true
        }
      })

      // 4. 更新 Import 記錄，關聯 Purchase
      await tx.import.update({
        where: { id: importId },
        data: {
          purchase_id: purchase.id,
          purchase_number: purchase.purchase_number,
          status: 'CONVERTED' // 新增狀態：已轉換
        }
      })

      return { purchase, importRecord }
    })

    return NextResponse.json({
      success: true,
      message: '已成功轉換成採購單',
      data: {
        import_id: importId,
        import_number: importRecord.import_number,
        purchase_id: result.purchase.id,
        purchase_number: result.purchase.purchase_number,
        next_step: '請至採購管理進行收貨作業'
      }
    })

  } catch (error) {
    console.error('轉換採購單失敗:', error)

    let errorMessage = '未知錯誤'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json(
      {
        success: false,
        error: '轉換採購單失敗',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
