import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/notifications/mark-all-read - 標記所有通知為已讀
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await prisma.notification.updateMany({
      where: {
        recipient_id: session.user.id,
        is_read: false
      },
      data: {
        is_read: true,
        read_at: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: { count: result.count },
      message: `Marked ${result.count} notifications as read`
    })

  } catch (error) {
    console.error('Failed to mark all notifications as read:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
