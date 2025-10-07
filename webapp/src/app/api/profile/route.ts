export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAppActiveUser } from '@/modules/auth/middleware/permissions'
import { logSensitiveAccess } from '@/lib/audit-log'

interface ProfileUpdateData {
  name?: string
  phone?: string
  department?: string
  position?: string
  preferences?: {
    language?: string
    timezone?: string
    currency?: string
  }
  notifications?: {
    email?: boolean
    sms?: boolean
    system?: boolean
  }
}

/**
 * GET /api/profile - 獲取用戶個人資料
 */
export const GET = withAppActiveUser(async (request: NextRequest, response: NextResponse, context: any) => {
  try {
    // 記錄敏感資料存取
    await logSensitiveAccess({
      userId: context.userId,
      userEmail: '', // context 沒有 email，留空或從 DB 查
      userRole: context.role,
      action: 'READ',
      resourceType: 'USERS',
      resourceId: context.userId,
      sensitiveFields: ['name', 'email', 'phone', 'preferences'],
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    // 從資料庫獲取用戶資料
    const user = await prisma.user.findUnique({
      where: { id: context.userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        preferences: true,
        created_at: true,
        updated_at: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用戶不存在' },
        { status: 404 }
      )
    }

    // 構建回傳資料
    const profileData = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.image,
      role: user.role,
      // 從 preferences JSON 中解析資料，或使用預設值
      phone: (user.preferences as any)?.phone || '',
      department: (user.preferences as any)?.department || '',
      position: (user.preferences as any)?.position || '',
      notifications: (user.preferences as any)?.notifications || {
        email: true,
        sms: false,
        system: true
      },
      preferences: (user.preferences as any)?.ui || {
        language: 'zh-TW',
        timezone: 'Asia/Taipei',
        currency: 'TWD'
      },
      created_at: user.created_at,
      updated_at: user.updated_at
    }

    return NextResponse.json({
      success: true,
      data: profileData
    })

  } catch (error) {
    console.error('獲取個人資料失敗:', error)
    return NextResponse.json(
      { success: false, error: '獲取個人資料失敗' },
      { status: 500 }
    )
  }
})

/**
 * PUT /api/profile - 更新用戶個人資料
 */
export const PUT = withAppActiveUser(async (request: NextRequest, response: NextResponse, context: any) => {
  try {
    const body: ProfileUpdateData = await request.json()

    // 記錄敏感資料修改
    await logSensitiveAccess({
      userId: context.userId,
      userEmail: '', // context 沒有 email
      userRole: context.role,
      action: 'WRITE',
      resourceType: 'USERS',
      resourceId: context.userId,
      sensitiveFields: Object.keys(body),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    // 驗證輸入資料
    const updateData: any = {}

    // 更新基本資料
    if (body.name && body.name.trim().length > 0) {
      updateData.name = body.name.trim()
    }

    // 構建 preferences JSON
    const currentUser = await prisma.user.findUnique({
      where: { id: context.userId },
      select: { preferences: true }
    })

    const currentPreferences = (currentUser?.preferences as any) || {}
    const newPreferences = { ...currentPreferences }

    // 更新個人詳細資料
    if (body.phone !== undefined) {
      newPreferences.phone = body.phone
    }
    if (body.department !== undefined) {
      newPreferences.department = body.department
    }
    if (body.position !== undefined) {
      newPreferences.position = body.position
    }

    // 更新通知設定
    if (body.notifications) {
      newPreferences.notifications = {
        ...newPreferences.notifications,
        ...body.notifications
      }
    }

    // 更新UI偏好設定
    if (body.preferences) {
      newPreferences.ui = {
        ...newPreferences.ui,
        ...body.preferences
      }
    }

    updateData.preferences = newPreferences
    updateData.updated_at = new Date()

    // 更新資料庫
    const updatedUser = await prisma.user.update({
      where: { id: context.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        preferences: true,
        updated_at: true
      }
    })

    // 構建回傳資料
    const profileData = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.image,
      role: updatedUser.role,
      phone: (updatedUser.preferences as any)?.phone || '',
      department: (updatedUser.preferences as any)?.department || '',
      position: (updatedUser.preferences as any)?.position || '',
      notifications: (updatedUser.preferences as any)?.notifications || {
        email: true,
        sms: false,
        system: true
      },
      preferences: (updatedUser.preferences as any)?.ui || {
        language: 'zh-TW',
        timezone: 'Asia/Taipei',
        currency: 'TWD'
      },
      updated_at: updatedUser.updated_at
    }

    return NextResponse.json({
      success: true,
      message: '個人資料更新成功',
      data: profileData
    })

  } catch (error) {
    console.error('更新個人資料失敗:', error)
    return NextResponse.json(
      { success: false, error: '更新個人資料失敗' },
      { status: 500 }
    )
  }
})
