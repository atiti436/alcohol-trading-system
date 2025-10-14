import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * POST /api/quotations/[id]/convert-to-purchase
 * 將報價單轉為採購單
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 投資方不能創建採購單
    if (session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '投資方無權創建採購單' }, { status: 403 })
    }

    const body = await request.json()
    const {
      supplier,
      currency = 'JPY',
      exchange_rate = 1.0,
      funding_source = 'COMPANY',
      notes: additional_notes
    } = body

    // 驗證必填欄位
    if (!supplier) {
      return NextResponse.json({ error: '供應商名稱為必填' }, { status: 400 })
    }

    if (!exchange_rate || exchange_rate <= 0) {
      return NextResponse.json({ error: '匯率必須大於 0' }, { status: 400 })
    }

    // 獲取報價單
    const quotation = await prisma.quotation.findUnique({
      where: { id: params.id },
      include: {
        product: true
      }
    })

    if (!quotation) {
      return NextResponse.json({ error: '報價單不存在' }, { status: 404 })
    }

    // 檢查報價單狀態
    if (quotation.status !== 'PENDING') {
      return NextResponse.json({
        error: '此報價單已處理，無法重複轉換',
        currentStatus: quotation.status
      }, { status: 400 })
    }

    // 檢查是否已關聯採購單
    if (quotation.purchase_id) {
      return NextResponse.json({
        error: '此報價單已轉換為採購單',
        purchaseId: quotation.purchase_id
      }, { status: 400 })
    }

    // 生成採購單號
    const purchaseNumber = await generatePurchaseNumber()

    // 準備採購項目
    const purchaseItems = [{
      product_id: quotation.product_id,
      product_name: quotation.product_name,
      quantity: quotation.quantity,
      unit_price: quotation.unit_price,
      total_price: quotation.total_amount
    }]

    // 在事務中創建採購單並更新報價單
    const result = await prisma.$transaction(async (tx) => {
      // 創建採購單
      const purchase = await tx.purchase.create({
        data: {
          purchase_number: purchaseNumber,
          supplier,
          currency,
          exchange_rate,
          total_amount: quotation.total_amount,
          status: 'DRAFT',
          funding_source,
          created_by: session.user.id,
          notes: `由報價單 ${quotation.quote_number} 轉換${additional_notes ? `\n${additional_notes}` : ''}`,
          items: {
            create: purchaseItems
          }
        },
        include: {
          items: {
            include: {
              product: true,
              variant: true
            }
          }
        }
      })

      // 更新報價單狀態並關聯採購單
      await tx.quotation.update({
        where: { id: quotation.id },
        data: {
          status: 'CONVERTED_TO_PURCHASE',
          purchase_id: purchase.id
        }
      })

      return purchase
    })

    return NextResponse.json({
      success: true,
      message: '成功轉換為採購單',
      data: {
        purchase: result,
        quotation_id: quotation.id,
        quote_number: quotation.quote_number
      }
    })

  } catch (error) {
    console.error('轉換採購單失敗:', error)
    return NextResponse.json({
      error: '轉換失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

// 生成採購單號
async function generatePurchaseNumber(): Promise<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const prefix = `P-${year}${month}${day}`

  const lastPurchase = await prisma.purchase.findFirst({
    where: {
      purchase_number: {
        startsWith: prefix
      }
    },
    orderBy: {
      purchase_number: 'desc'
    }
  })

  if (lastPurchase) {
    const lastNumber = parseInt(lastPurchase.purchase_number.split('-').pop() || '0')
    const nextNumber = String(lastNumber + 1).padStart(3, '0')
    return `${prefix}-${nextNumber}`
  }

  return `${prefix}-001`
}
