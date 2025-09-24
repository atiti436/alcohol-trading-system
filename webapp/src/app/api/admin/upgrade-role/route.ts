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

    // 僅允許已是超級管理員的使用者呼叫此 API
    if (session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: '權限不足' },
        { status: 403 }
      )
    }

    // 安全起見，僅回傳目前使用者資訊；實際升級其他使用者應改為專用管理 API
    const updatedUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, name: true, role: true }
    })

    return NextResponse.json({
      message: 'OK',
      user: {
        id: updatedUser?.id,
        email: updatedUser?.email,
        name: updatedUser?.name,
        role: updatedUser?.role
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
