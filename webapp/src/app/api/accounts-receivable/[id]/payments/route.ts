export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

/**
 * 💰 Room-4: 收款記錄管理 API
 * 負責記錄客戶付款並更新應收帳款狀態
 * 🔒 重要：投資方角色不能操作收款功能
 */

// GET /api/accounts-receivable/[id]/payments - 取得收款記錄
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔒 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const arId = params.id

    // 驗證應收帳款是否存在
    const accountsReceivable = await prisma.accountsReceivable.findUnique({
      where: { id: arId },
      include: {
        customer: {
          select: {
            customer_code: true,
            name: true,
            company: true
          }
        },
        sale: {
          select: {
            sale_number: true,
            funding_source: true
          }
        }
      }
    })

    if (!accountsReceivable) {
      return NextResponse.json({ error: '應收帳款記錄不存在' }, { status: 404 })
    }

    // 🔒 投資方權限檢查 - 只能查看投資項目
    if (session.user.role === 'INVESTOR' && accountsReceivable.sale.funding_source !== 'COMPANY') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    // 查詢收款記錄
    const payments = await prisma.paymentRecord.findMany({
      where: { accounts_receivable_id: arId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { payment_date: 'desc' }
    })

    // 🔒 數據過濾 - 投資方看到調整後的金額
    const filteredPayments = payments.map(payment => ({
      ...payment,
      payment_amount: session.user.role === 'INVESTOR'
        ? payment.payment_amount * 0.8
        : payment.payment_amount
    }))

    return NextResponse.json({
      success: true,
      data: {
        accountsReceivable: {
          ...accountsReceivable,
          original_amount: session.user.role === 'INVESTOR'
            ? accountsReceivable.original_amount * 0.8
            : accountsReceivable.original_amount,
          remaining_amount: session.user.role === 'INVESTOR'
            ? accountsReceivable.remaining_amount * 0.8
            : accountsReceivable.remaining_amount
        },
        payments: filteredPayments
      }
    })

  } catch (error) {
    console.error('收款記錄查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}

// POST /api/accounts-receivable/[id]/payments - 新增收款記錄
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔒 權限檢查 - 只有SUPER_ADMIN和EMPLOYEE可以記錄收款
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const arId = params.id
    const body = await request.json()
    const {
      payment_amount,
      payment_date,
      payment_method,
      reference_number,
      notes
    } = body

    // 基本驗證
    if (!payment_amount || !payment_date || !payment_method) {
      return NextResponse.json({
        error: '付款金額、付款日期和付款方式為必填欄位'
      }, { status: 400 })
    }

    if (payment_amount <= 0) {
      return NextResponse.json({
        error: '付款金額必須大於0'
      }, { status: 400 })
    }

    // 驗證應收帳款是否存在
    const accountsReceivable = await prisma.accountsReceivable.findUnique({
      where: { id: arId },
      include: {
        customer: true,
        sale: true
      }
    })

    if (!accountsReceivable) {
      return NextResponse.json({ error: '應收帳款記錄不存在' }, { status: 404 })
    }

    // 檢查付款金額是否超過剩餘應收金額
    if (payment_amount > accountsReceivable.remaining_amount) {
      return NextResponse.json({
        error: `付款金額不能超過剩餘應收金額 NT$${accountsReceivable.remaining_amount.toLocaleString()}`
      }, { status: 400 })
    }

    // 產生收款編號
    const payment_number = await generatePaymentNumber()

    // 開始交易處理
    const result = await prisma.$transaction(async (tx) => {
      // 1. 建立收款記錄
      const paymentRecord = await tx.paymentRecord.create({
        data: {
          payment_number,
          accounts_receivable_id: arId,
          payment_amount,
          payment_date: new Date(payment_date),
          payment_method,
          reference_number,
          notes,
          created_by: session.user.id
        }
      })

      // 2. 更新應收帳款剩餘金額和狀態
      const newRemainingAmount = accountsReceivable.remaining_amount - payment_amount
      let newStatus = accountsReceivable.status

      if (newRemainingAmount === 0) {
        newStatus = 'PAID' // 已全額收款
      } else if (newRemainingAmount < accountsReceivable.original_amount) {
        newStatus = 'PARTIAL' // 部分收款
      }

      const updatedAR = await tx.accountsReceivable.update({
        where: { id: arId },
        data: {
          remaining_amount: newRemainingAmount,
          status: newStatus,
          updated_at: new Date()
        }
      })

      // 3. 如果完全收款，更新逾期天數為0
      if (newStatus === 'PAID') {
        await tx.accountsReceivable.update({
          where: { id: arId },
          data: { days_past_due: 0 }
        })
      }

      return { paymentRecord, updatedAR }
    })

    // 4. 自動產生會計分錄 (收款分錄)
    try {
      await fetch(`${request.url.split('/api')[0]}/api/accounting/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('Cookie') || ''
        },
        body: JSON.stringify({
          entry_type: 'PAYMENT',
          reference_id: result.paymentRecord.id,
          reference_type: 'PAYMENT',
          entry_date: payment_date,
          description: `收款 - ${accountsReceivable.customer.name}`,
          notes: `收款記錄：${payment_number}`
        })
      })
    } catch (error) {
      console.error('自動產生會計分錄失敗:', error)
      // 不影響主要流程，僅記錄錯誤
    }

    return NextResponse.json({
      success: true,
      data: {
        payment: result.paymentRecord,
        accountsReceivable: result.updatedAR
      },
      message: '收款記錄建立成功'
    })

  } catch (error) {
    console.error('收款記錄建立失敗:', error)
    return NextResponse.json(
      { error: '建立失敗', details: error },
      { status: 500 }
    )
  }
}

// 產生收款編號
async function generatePaymentNumber(): Promise<string> {
  const today = new Date()
  const dateString = today.toISOString().slice(0, 10).replace(/-/g, '')

  // 查找今日最後一筆收款記錄
  const lastPayment = await prisma.paymentRecord.findFirst({
    where: {
      payment_number: {
        startsWith: `PMT${dateString}`
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

  return `PMT${dateString}${sequence.toString().padStart(3, '0')}`
}
