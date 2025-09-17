import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '請先登入'
        }
      }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        investorId: true,
        isActive: true,
        preferences: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: '使用者不存在'
        }
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        user,
        permissions: getUserPermissions(user.role)
      }
    })

  } catch (error) {
    console.error('獲取使用者資訊錯誤:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '內部伺服器錯誤'
      }
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '請先登入'
        }
      }, { status: 401 })
    }

    const body = await request.json()
    const { name, preferences } = body

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        ...(name && { name }),
        ...(preferences && { preferences })
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        investorId: true,
        isActive: true,
        preferences: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      data: { user: updatedUser }
    })

  } catch (error) {
    console.error('更新使用者資訊錯誤:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '更新失敗'
      }
    }, { status: 500 })
  }
}

function getUserPermissions(role: string): string[] {
  switch (role) {
    case 'SUPER_ADMIN':
      return [
        'users:read',
        'users:write',
        'customers:read',
        'customers:write',
        'products:read',
        'products:write',
        'sales:read',
        'sales:write',
        'reports:read',
        'settings:read',
        'settings:write'
      ]
    case 'INVESTOR':
      return [
        'customers:read',
        'products:read',
        'sales:read:filtered',
        'reports:read:filtered'
      ]
    case 'EMPLOYEE':
      return [
        'customers:read',
        'customers:write',
        'products:read',
        'inventory:read',
        'inventory:write'
      ]
    default:
      return []
  }
}