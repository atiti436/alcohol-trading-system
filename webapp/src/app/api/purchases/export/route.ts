import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'
import { assertSameOrigin, rateLimit } from '@/lib/security'

// 強制動態渲染
export const dynamic = 'force-dynamic'

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
    const limited = rateLimit(request, 'purchases-export', 10, 60_000)
    if (limited) return limited

    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: '未登入' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const funding_source = searchParams.get('funding_source') || ''
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    const where: any = {}
    if (search) {
      where.OR = [
        { purchase_number: { contains: search, mode: 'insensitive' } },
        { supplier: { contains: search, mode: 'insensitive' } },
        { declaration_number: { contains: search, mode: 'insensitive' } }
      ]
    }
    if (status) where.status = status
    if (funding_source) where.funding_source = funding_source
    if (session.user.role === 'INVESTOR') where.funding_source = 'COMPANY'
    if (dateFrom || dateTo) {
      where.created_at = {}
      if (dateFrom) where.created_at.gte = new Date(dateFrom)
      if (dateTo) { const end = new Date(dateTo); end.setHours(23,59,59,999); where.created_at.lte = end }
    }

    const purchases = await prisma.purchase.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        items: true
      }
    })

    const header = [
      'purchase_number','created_at','supplier','status','currency','exchange_rate',
      'product_name','quantity','unit_price','total_price','notes'
    ]
    const rows: string[] = []
    rows.push(header.join(','))

    for (const p of purchases) {
      for (const item of p.items) {
        rows.push([
          p.purchase_number,
          p.created_at.toISOString().slice(0,10),
          p.supplier,
          p.status,
          p.currency,
          p.exchange_rate,
          item.product_name,
          item.quantity,
          item.unit_price,
          item.total_price,
          p.notes || ''
        ].map(escapeCsv).join(','))
      }
    }

    const csv = rows.join('\n')
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=purchases_export_${new Date().toISOString().slice(0,10)}.csv`
      }
    })
  } catch (error) {
    console.error('匯出採購明細失敗:', error)
    return NextResponse.json({ error: '匯出失敗' }, { status: 500 })
  }
}

