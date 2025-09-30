import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types/auth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * 🔐 用戶管理 API
 * 只有 SUPER_ADMIN 可以管理用戶權限
 */

// GET /api/users - 取得所有用戶列表 (只有管理員可以看)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '請先登入' }
      }, { status: 401 })
    }

    // 只有超級管理員可以查看用戶列表
    if (session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: '權限不足，只有管理員可以查看用戶列表' }
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') // pending, active, all

    const skip = (page - 1) * limit

    // 建立查詢條件
    const where: any = {}
    if (status === 'pending') {
      where.role = Role.PENDING
    } else if (status === 'active') {
      where.role = { not: Role.PENDING }
      where.is_active = true
    }

    // 取得用戶列表
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          is_active: true,
          created_at: true,
          updated_at: true
        },
        orderBy: [
          { role: 'asc' },  // PENDING 排前面
          { created_at: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    })

  } catch (error) {
    console.error('獲取用戶列表錯誤:', error)
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '內部伺服器錯誤' }
    }, { status: 500 })
  }
}