import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types/auth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

// PUT /api/users/[id]/status - 切換啟用/停用（僅 SUPER_ADMIN）
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '請先登入' } }, { status: 401 })
    }
    if (session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: '權限不足' } }, { status: 403 })
    }

    const userId = params.id
    const { is_active } = await request.json()

    if (typeof is_active !== 'boolean') {
      return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT', message: '缺少或錯誤的 is_active' } }, { status: 400 })
    }

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } })
    if (!target) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: '用戶不存在' } }, { status: 404 })
    }

    // 不允許自己把自己停用
    if (target.email === session.user.email && !is_active) {
      return NextResponse.json({ success: false, error: { code: 'CANNOT_DEACTIVATE_SELF', message: '不可停用自己' } }, { status: 400 })
    }

    const updated = await prisma.user.update({ where: { id: userId }, data: { is_active } })
    return NextResponse.json({ success: true, data: { user: { id: updated.id, is_active: updated.is_active } } })
  } catch (error) {
    console.error('更新用戶狀態錯誤:', error)
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: '伺服器錯誤' } }, { status: 500 })
  }
}

