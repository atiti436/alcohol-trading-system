import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/notifications - 取得使用者通知
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread_only') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {
      recipient_id: session.user.id
    }

    if (unreadOnly) {
      where.is_read = false
    }

    const notifications = await prisma.notification.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { created_at: 'desc' }
    })

    const total = await prisma.notification.count({ where })
    const unreadCount = await prisma.notification.count({
      where: {
        recipient_id: session.user.id,
        is_read: false
      }
    })

    return NextResponse.json({
      success: true,
      data: notifications,
      pagination: {
        total,
        unreadCount,
        limit,
        offset
      }
    })
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications - 建立通知（系統內部使用）
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      type,
      title,
      message,
      link,
      recipient_id,
      recipient_role,
      priority = 'NORMAL',
      resource_type,
      resource_id,
      expires_at
    } = body

    // 驗證必填欄位
    const missingFields: string[] = []
    if (!type) missingFields.push('type')
    if (!title) missingFields.push('title')
    if (!message) missingFields.push('message')
    if (!recipient_id) missingFields.push('recipient_id')

    if (missingFields.length > 0) {
      return NextResponse.json({
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 })
    }

    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        link,
        recipient_id,
        recipient_role,
        priority,
        resource_type,
        resource_id,
        expires_at: expires_at ? new Date(expires_at) : null
      }
    })

    return NextResponse.json({
      success: true,
      data: notification,
      message: 'Notification created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create notification:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
