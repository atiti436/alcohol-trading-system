import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import prisma from '@/lib/prisma'

// GET - 獲取報價統計資料
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 獲取各種狀態的報價數量
    const [total, pending, accepted, rejected, expired] = await Promise.all([
      prisma.quotation.count(),
      prisma.quotation.count({ where: { status: 'PENDING' } }),
      prisma.quotation.count({ where: { status: 'ACCEPTED' } }),
      prisma.quotation.count({ where: { status: 'REJECTED' } }),
      prisma.quotation.count({ where: { status: 'EXPIRED' } })
    ])

    return NextResponse.json({
      total,
      pending,
      accepted,
      rejected,
      expired
    })

  } catch (error) {
    console.error('獲取報價統計失敗:', error)
    return NextResponse.json({ error: '獲取報價統計失敗' }, { status: 500 })
  }
}