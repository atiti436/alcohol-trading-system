import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'

// 將進貨記錄狀態標記為 RECEIVED（配合前端完成收貨入庫後的狀態同步）
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
    const record = await prisma.importRecord.update({
      where: { id: importId },
      data: { status: 'RECEIVED' }
    })

    return NextResponse.json({ success: true, data: { id: record.id, status: record.status } })
  } catch (error) {
    console.error('更新進貨狀態失敗:', error)
    return NextResponse.json({ success: false, error: '更新進貨狀態失敗' }, { status: 500 })
  }
}

