import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { assertSameOrigin, rateLimit } from '@/lib/security'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: '未登入' }, { status: 401 })
    if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: '權限不足' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const supplier = searchParams.get('supplier')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const apCategory = searchParams.get('ap_category')

    const where: any = {}
    if (status) where.status = status
    if (supplier) where.supplier_name = { contains: supplier, mode: 'insensitive' }
    if (dateFrom || dateTo) {
      where.due_date = {}
      if (dateFrom) where.due_date.gte = new Date(dateFrom)
      if (dateTo) where.due_date.lte = new Date(dateTo + 'T23:59:59.999Z')
    }
    if (apCategory) where.ap_category = apCategory

    const payables = await prisma.accountsPayable.findMany({
      where,
      include: {
        purchase: { select: { purchase_number: true, total_amount: true, status: true } },
        payments: {
          select: { id: true, payment_number: true, payment_amount: true, payment_date: true, payment_method: true, reference_number: true, notes: true },
          orderBy: { payment_date: 'desc' }
        }
      },
      orderBy: { due_date: 'asc' }
    })

    const stats = await calculatePayableStats().catch(() => ({
      total_pending: 0,
      total_overdue: 0,
      total_partial: 0,
      count_pending: 0,
      count_overdue: 0,
      average_days_overdue: 0
    }))

    return NextResponse.json({ success: true, data: { payables, stats } })
  } catch (error) {
    console.error('查詢應付帳款失敗:', error)
    return NextResponse.json({ error: '查詢失敗', details: (error as Error)?.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const csrf = assertSameOrigin(request)
    if (csrf) return csrf
    const limited = rateLimit(request, 'finance-payables-create', 20, 60_000)
    if (limited) return limited
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: '未登入' }, { status: 401 })
    if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: '權限不足' }, { status: 403 })

    const body = await request.json()
    const { purchase_id, supplier_name, original_amount, due_date, notes, ap_category, reference } = body

    if ((!purchase_id && (!supplier_name || !original_amount || !due_date)) || (purchase_id && !due_date)) {
      return NextResponse.json({ error: '缺少必填欄位' }, { status: 400 })
    }

    let purchase: any = null
    if (purchase_id) {
      purchase = await prisma.purchase.findUnique({ where: { id: purchase_id } })
      if (!purchase) return NextResponse.json({ error: '找不到對應採購單' }, { status: 404 })
    }

    const apNumber = await generateAPNumber()
    const dueDate = new Date(due_date)
    const today = new Date()
    const daysPastDue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
    const status = daysPastDue > 0 ? 'OVERDUE' : 'PENDING'

    const payable = await prisma.accountsPayable.create({
      data: {
        ap_number: apNumber,
        purchase_id: purchase_id || null,
        supplier_name: supplier_name || purchase?.supplier || '未知供應商',
        original_amount: original_amount ?? purchase?.total_amount ?? 0,
        remaining_amount: original_amount ?? purchase?.total_amount ?? 0,
        due_date: dueDate,
        status,
        days_past_due: daysPastDue,
        // Prisma 型別為 AccountsPayableCreateInput，不存在 ap_category 時改用 category 欄位
        category: ap_category || 'PURCHASE',
        reference,
        notes,
        created_by: session.user.id
      },
      include: {
        purchase: { select: { purchase_number: true, total_amount: true, status: true } },
        payments: true
      }
    })

    return NextResponse.json({ success: true, data: payable })
  } catch (error) {
    console.error('建立應付帳款失敗:', error)
    return NextResponse.json({ error: '建立失敗' }, { status: 500 })
  }
}

async function calculatePayableStats() {
  const pendingStats = await prisma.accountsPayable.aggregate({ where: { status: 'PENDING' }, _sum: { remaining_amount: true }, _count: { id: true } })
  const overdueStats = await prisma.accountsPayable.aggregate({ where: { status: 'OVERDUE' }, _sum: { remaining_amount: true }, _count: { id: true } })
  const partialStats = await prisma.accountsPayable.aggregate({ where: { status: 'PARTIAL' }, _sum: { remaining_amount: true } })
  const overduePayables = await prisma.accountsPayable.findMany({ where: { status: 'OVERDUE' }, select: { days_past_due: true } })
  const averageDaysOverdue = overduePayables.length > 0 ? overduePayables.reduce((sum, p) => sum + p.days_past_due, 0) / overduePayables.length : 0
  return {
    total_pending: pendingStats._sum.remaining_amount || 0,
    total_overdue: overdueStats._sum.remaining_amount || 0,
    total_partial: partialStats._sum.remaining_amount || 0,
    count_pending: (pendingStats._count as any)?.id || 0,
    count_overdue: (overdueStats._count as any)?.id || 0,
    average_days_overdue: Math.round(averageDaysOverdue * 10) / 10
  }
}

async function generateAPNumber(): Promise<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const prefix = `AP${year}${month}`
  const lastPayable = await prisma.accountsPayable.findFirst({ where: { ap_number: { startsWith: prefix } }, orderBy: { ap_number: 'desc' } })
  let sequence = 1
  if (lastPayable) {
    const lastSequence = parseInt(lastPayable.ap_number.slice(-3))
    sequence = lastSequence + 1
  }
  return `${prefix}${String(sequence).padStart(3, '0')}`
}
