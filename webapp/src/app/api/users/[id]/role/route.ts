import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types/auth'

/**
 * 🔐 用戶角色管理 API
 * PUT /api/users/[id]/role - 修改用戶角色 (只有管理員可以操作)
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '請先登入' }
      }, { status: 401 })
    }

    // 只有超級管理員可以修改用戶角色
    if (session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: '權限不足，只有管理員可以修改用戶權限' }
      }, { status: 403 })
    }

    const { role, investor_id } = await request.json()
    const userId = params.id

    // 驗證角色是否有效
    if (!Object.values(Role).includes(role)) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_ROLE', message: '無效的角色' }
      }, { status: 400 })
    }

    // 檢查目標用戶是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true }
    })

    if (!targetUser) {
      return NextResponse.json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: '用戶不存在' }
      }, { status: 404 })
    }

    // 防止管理員誤改自己的權限
    if (targetUser.email === session.user.email && role !== Role.SUPER_ADMIN) {
      return NextResponse.json({
        success: false,
        error: { code: 'CANNOT_DEMOTE_SELF', message: '不能降低自己的權限' }
      }, { status: 400 })
    }

    // 更新用戶角色
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role,
        ...(investor_id && { investor_id }),  // 如果是投資方角色，設定投資方ID
        is_active: role !== Role.PENDING,    // PENDING用戶設為非活躍狀態
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        investor_id: true,
        is_active: true,
        updated_at: true
      }
    })

    // 記錄審核操作 (可以擴展為審計日誌)
    console.log(`管理員 ${session.user.email} 將用戶 ${targetUser.email} 的角色從 ${targetUser.role} 改為 ${role}`)

    return NextResponse.json({
      success: true,
      data: { user: updatedUser },
      message: `用戶 ${targetUser.name} 的角色已更新為 ${getRoleDisplayName(role)}`
    })

  } catch (error) {
    console.error('更新用戶角色錯誤:', error)
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '角色更新失敗' }
    }, { status: 500 })
  }
}

// 角色顯示名稱
function getRoleDisplayName(role: Role): string {
  switch (role) {
    case Role.SUPER_ADMIN:
      return '超級管理員'
    case Role.INVESTOR:
      return '投資方'
    case Role.EMPLOYEE:
      return '員工'
    case Role.PENDING:
      return '待審核'
    default:
      return '未知角色'
  }
}