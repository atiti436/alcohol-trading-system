import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/notifications/[id]/read - 標記通知為已讀
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查通知是否存在且屬於當前使用者
    const notification = await prisma.notification.findUnique({
      where: { id: params.id }
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    if (notification.recipient_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 更新為已讀
    const updatedNotification = await prisma.notification.update({
      where: { id: params.id },
      data: {
        is_read: true,
        read_at: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedNotification,
      message: 'Notification marked as read'
    })

  } catch (error) {
    console.error('Failed to mark notification as read:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
