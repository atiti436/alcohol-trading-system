import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

export const dynamic = 'force-dynamic'

/**
 * 標記缺貨已解決
 * POST /api/backorders/[id]/resolve
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const backorderId = params.id

    // 查詢缺貨記錄
    const backorder = await prisma.backorderTracking.findUnique({
      where: { id: backorderId },
      include: {
        sale: true,
        variant: true
      }
    })

    if (!backorder) {
      return NextResponse.json({ error: '缺貨記錄不存在' }, { status: 404 })
    }

    if (backorder.status === 'RESOLVED') {
      return NextResponse.json({ error: '此缺貨記錄已解決' }, { status: 400 })
    }

    // 更新缺貨記錄
    const updated = await prisma.backorderTracking.update({
      where: { id: backorderId },
      data: {
        status: 'RESOLVED',
        resolved_at: new Date(),
        resolved_by: session.user.id
      },
      include: {
        sale: {
          include: {
            customer: true
          }
        },
        variant: {
          include: {
            product: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: '缺貨記錄已標記為已解決',
      data: updated
    })

  } catch (error) {
    console.error('解決缺貨記錄失敗:', error)
    return NextResponse.json(
      {
        error: '操作失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
}

/**
 * 取消缺貨記錄
 * DELETE /api/backorders/[id]/resolve
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const backorderId = params.id

    // 查詢缺貨記錄
    const backorder = await prisma.backorderTracking.findUnique({
      where: { id: backorderId }
    })

    if (!backorder) {
      return NextResponse.json({ error: '缺貨記錄不存在' }, { status: 404 })
    }

    // 更新為已取消
    const cancelled = await prisma.backorderTracking.update({
      where: { id: backorderId },
      data: {
        status: 'CANCELLED',
        resolved_at: new Date(),
        resolved_by: session.user.id,
        notes: `${backorder.notes || ''}\n已取消 - ${session.user.name} (${new Date().toISOString()})`
      }
    })

    return NextResponse.json({
      success: true,
      message: '缺貨記錄已取消',
      data: cancelled
    })

  } catch (error) {
    console.error('取消缺貨記錄失敗:', error)
    return NextResponse.json(
      {
        error: '操作失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
}
