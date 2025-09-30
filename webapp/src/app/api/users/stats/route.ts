import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types/auth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * GET /api/users/stats - 獲取用戶角色統計
 * 只有超級管理員可以查看
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    // 權限檢查
    if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, error: '權限不足' },
        { status: 403 }
      )
    }

    // 統計各角色人數
    const [superAdminCount, investorCount, employeeCount, pendingCount, totalCount, activeCount] = await Promise.all([
      prisma.user.count({ where: { role: Role.SUPER_ADMIN } }),
      prisma.user.count({ where: { role: Role.INVESTOR } }),
      prisma.user.count({ where: { role: Role.EMPLOYEE } }),
      prisma.user.count({ where: { role: Role.PENDING } }),
      prisma.user.count(),
      prisma.user.count({ where: { is_active: true } })
    ])

    return NextResponse.json({
      success: true,
      data: {
        superAdmin: superAdminCount,
        investor: investorCount,
        employee: employeeCount,
        pending: pendingCount,
        total: totalCount,
        active: activeCount,
        inactive: totalCount - activeCount
      }
    })

  } catch (error) {
    console.error('獲取用戶統計失敗:', error)
    return NextResponse.json(
      { success: false, error: '獲取用戶統計失敗' },
      { status: 500 }
    )
  }
}