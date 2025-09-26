import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'
import { assertSameOrigin, rateLimit } from '@/lib/security'

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

export async function GET(request: NextRequest) {
  try {
    const csrf = assertSameOrigin(request)
    if (csrf) return csrf
    const limited = rateLimit(request, 'shipping-export', 10, 60_000)
    if (limited) return limited

    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: '未登入' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const customer_id = searchParams.get('customer_id')
    const search = searchParams.get('search') || ''

    const where: any = { is_paid: true }
    if (session.user.role === 'INVESTOR') where.funding_source = 'COMPANY'
    if (customer_id) where.customer_id = customer_id
    if (dateFrom || dateTo) {
      where.created_at = {}
      if (dateFrom) where.created_at.gte = new Date(dateFrom)
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        where.created_at.lte = end
      }
    }
    if (search) {
      where.OR = [
        { sale_number: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { company: { contains: search, mode: 'insensitive' } } }
      ]
    }

    const sales = await prisma.sale.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        customer: { select: { customer_code: true, name: true } },
        items: {
          include: {
            product: { select: { product_code: true, name: true } },
            variant: { select: { variant_code: true } }
          }
        }
      }
    })

    const header = [
      'shipping_number','sale_number','shipping_date','customer_code','customer_name',
      'product_code','product_name','variant_code','quantity','unit_price','total_price'
    ]
    const rows: string[] = []
    rows.push(header.join(','))

    for (const sale of sales) {
      const shipNo = `SH${sale.sale_number.slice(2)}`
      for (const item of sale.items) {
        rows.push([
          shipNo,
          sale.sale_number,
          sale.created_at.toISOString().slice(0,10),
          sale.customer?.customer_code || '',
          sale.customer?.name || '',
          item.product?.product_code || '',
          item.product?.name || '',
          item.variant?.variant_code || '',
          item.quantity,
          item.unit_price,
          item.total_price
        ].map(escapeCsv).join(','))
      }
    }

    const csv = rows.join('\n')
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=shipping_export_${new Date().toISOString().slice(0,10)}.csv`
      }
    })
  } catch (error) {
    console.error('匯出出貨明細失敗:', error)
    return NextResponse.json({ error: '匯出失敗' }, { status: 500 })
  }
}

