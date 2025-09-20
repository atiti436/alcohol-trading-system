import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未授權' },
        { status: 401 }
      )
    }

    // 更新用戶角色為 SUPER_ADMIN
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { role: Role.SUPER_ADMIN },
    })

    return NextResponse.json({
      message: '角色已升級為超級管理員',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role
      }
    })

  } catch (error) {
    console.error('角色升級錯誤:', error)
    return NextResponse.json(
      { error: '角色升級失敗' },
      { status: 500 }
    )
  }
}