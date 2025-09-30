import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { assertSameOrigin, rateLimit } from '@/lib/security'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * 供應商付款記錄 API
 * POST /api/finance/payables/[id]/payment - 記錄付款給供應商
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const csrf = assertSameOrigin(request)
    if (csrf) return csrf
    const limited = rateLimit(request, 'finance-payables-payment', 30, 60_000)
    if (limited) return limited
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    // 只有 SUPER_ADMIN 可以記錄付款
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const payableId = params.id
    const body = await request.json()
    const {
      payment_amount,
      payment_date,
      payment_method,
      reference_number,
      notes
    } = body

    // 驗證必填欄位
    if (!payment_amount || !payment_date || !payment_method) {
      return NextResponse.json({ error: '缺少必填欄位' }, { status: 400 })
    }

    // 驗證付款金額
    if (payment_amount <= 0) {
      return NextResponse.json({ error: '付款金額必須大於 0' }, { status: 400 })
    }

    // 查找應付帳款記錄
    const payable = await prisma.accountsPayable.findUnique({
      where: { id: payableId },
      include: { payments: true }
    })

    if (!payable) {
      return NextResponse.json({ error: '找不到應付帳款記錄' }, { status: 404 })
    }

    // 檢查付款金額是否超過未付金額
    if (payment_amount > payable.remaining_amount) {
      return NextResponse.json(
        { error: `付款金額不能超過未付金額 $${payable.remaining_amount}` },
        { status: 400 }
      )
    }

    // 生成付款編號
    const paymentNumber = await generatePaymentNumber()

    // 使用交易確保數據一致性
    const result = await prisma.$transaction(async (tx) => {
      // 創建付款記錄
      const payment = await tx.supplierPayment.create({
        data: {
          payment_number: paymentNumber,
          accounts_payable_id: payableId,
          payment_amount,
          payment_date: new Date(payment_date),
          payment_method,
          reference_number,
          notes,
          created_by: session.user.id
        }
      })

      // 計算新的未付金額
      const newRemainingAmount = payable.remaining_amount - payment_amount

      // 決定新狀態
      let newStatus = payable.status
      if (newRemainingAmount === 0) {
        newStatus = 'PAID'
      } else if (newRemainingAmount < payable.original_amount) {
        newStatus = 'PARTIAL'
      }

      // 更新應付帳款
      const updatedPayable = await tx.accountsPayable.update({
        where: { id: payableId },
        data: {
          remaining_amount: newRemainingAmount,
          status: newStatus,
          updated_at: new Date()
        },
        include: {
          purchase: {
            select: {
              purchase_number: true,
              total_amount: true,
              status: true
            }
          },
          payments: {
            orderBy: { payment_date: 'desc' }
          }
        }
      })

      // 創建現金流記錄
      await tx.cashFlowRecord.create({
        data: {
          type: 'EXPENSE',
          amount: payment_amount,
          description: `供應商付款 - ${payable.supplier_name} (${paymentNumber})`,
          category: (payable as any).ap_category || 'PURCHASE',
          reference: payment.id,
          funding_source: 'COMPANY',
          transaction_date: new Date(payment_date),
          created_by: session.user.id
        }
      })

      return { payment, updatedPayable }
    })

    return NextResponse.json({
      success: true,
      data: {
        payment: result.payment,
        payable: result.updatedPayable
      },
      message: '付款記錄新增成功'
    })

  } catch (error) {
    console.error('記錄付款失敗:', error)
    return NextResponse.json({ error: '記錄付款失敗' }, { status: 500 })
  }
}

/**
 * 生成付款編號
 */
async function generatePaymentNumber(): Promise<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  const prefix = `PAY${year}${month}${day}`

  // 查找當天最大的序號
  const lastPayment = await prisma.supplierPayment.findFirst({
    where: {
      payment_number: {
        startsWith: prefix
      }
    },
    orderBy: {
      payment_number: 'desc'
    }
  })

  let sequence = 1
  if (lastPayment) {
    const lastSequence = parseInt(lastPayment.payment_number.slice(-3))
    sequence = lastSequence + 1
  }

  return `${prefix}${String(sequence).padStart(3, '0')}`
}
