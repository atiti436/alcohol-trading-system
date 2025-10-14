import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * POST /api/quotations/[id]/convert-to-sale
 * 將報價單轉為銷售單
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

    // 投資方不能創建銷售單
    if (session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '投資方無權創建銷售單' }, { status: 403 })
    }

    const body = await request.json()
    const {
      funding_source = 'COMPANY',
      payment_terms = 'CASH',
      notes: additional_notes
    } = body

    // 獲取報價單
    const quotation = await prisma.quotation.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
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

    // 檢查是否已關聯銷售單
    if (quotation.sale_id) {
      return NextResponse.json({
        error: '此報價單已轉換為銷售單',
        saleId: quotation.sale_id
      }, { status: 400 })
    }

    // 生成銷售單號
    const saleCode = await generateSaleCode()

    // 準備銷售項目
    const saleItems = [{
      product_id: quotation.product_id,
      product_name: quotation.product_name,
      quantity: quotation.quantity,
      unit_price: quotation.unit_price,
      actual_unit_price: quotation.unit_price, // 使用相同價格
      total_price: quotation.total_amount,
      actual_total_price: quotation.total_amount
    }]

    // 在事務中創建銷售單並更新報價單
    const result = await prisma.$transaction(async (tx) => {
      // 創建銷售單
      const sale = await tx.sale.create({
        data: {
          sale_code: saleCode,
          customer_id: quotation.customer_id,
          sale_date: new Date(),
          total_amount: quotation.total_amount,
          actual_amount: quotation.total_amount,
          status: 'PENDING',
          payment_status: 'PENDING',
          payment_terms,
          funding_source,
          created_by: session.user.id,
          is_paid: false,
          notes: `由報價單 ${quotation.quote_number} 轉換${additional_notes ? `\n${additional_notes}` : ''}`,
          items: {
            create: saleItems
          }
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              tier: true
            }
          },
          items: {
            include: {
              product: true,
              variant: true
            }
          }
        }
      })

      // 更新報價單狀態並關聯銷售單
      await tx.quotation.update({
        where: { id: quotation.id },
        data: {
          status: 'CONVERTED_TO_SALE',
          sale_id: sale.id
        }
      })

      return sale
    })

    return NextResponse.json({
      success: true,
      message: '成功轉換為銷售單',
      data: {
        sale: result,
        quotation_id: quotation.id,
        quote_number: quotation.quote_number
      }
    })

  } catch (error) {
    console.error('轉換銷售單失敗:', error)
    return NextResponse.json({
      error: '轉換失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

// 生成銷售單號
async function generateSaleCode(): Promise<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const prefix = `S-${year}${month}${day}`

  const lastSale = await prisma.sale.findFirst({
    where: {
      sale_code: {
        startsWith: prefix
      }
    },
    orderBy: {
      sale_code: 'desc'
    }
  })

  if (lastSale) {
    const lastNumber = parseInt(lastSale.sale_code.split('-').pop() || '0')
    const nextNumber = String(lastNumber + 1).padStart(3, '0')
    return `${prefix}-${nextNumber}`
  }

  return `${prefix}-001`
}
