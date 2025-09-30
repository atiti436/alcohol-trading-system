import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { Role } from '@/types/auth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未授權' },
        { status: 401 }
      )
    }

    // 只有管理員可以查看 LINE BOT 設定
    if (session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: '權限不足' },
        { status: 403 }
      )
    }

    // 模擬獲取 LINE BOT 設定
    const settings = {
      channel_access_token: process.env.LINE_CHANNEL_ACCESS_TOKEN ? '已設定' : '未設定',
      channel_secret: process.env.LINE_CHANNEL_SECRET ? '已設定' : '未設定',
      webhook_url: process.env.NEXTAUTH_URL + '/api/linebot/webhook',
      auto_reply_enabled: true,
      cost_calculation_enabled: true,
      ai_recognition_enabled: true,
      last_test_time: null,
      status: 'configured'
    }

    return NextResponse.json({
      success: true,
      settings
    })

  } catch (error) {
    console.error('獲取 LINE BOT 設定錯誤:', error)
    return NextResponse.json(
      { error: '獲取設定失敗' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未授權' },
        { status: 401 }
      )
    }

    // 只有管理員可以修改 LINE BOT 設定
    if (session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: '權限不足' },
        { status: 403 }
      )
    }

    const settings = await request.json()

    // 在實際環境中，這裡會將設定保存到資料庫或環境變數
    // 目前模擬保存操作
    const savedSettings = {
      ...settings,
      updated_by: session.user.email,
      updated_at: new Date().toISOString()
    }

    // TODO: 實際保存到設定表
    // await prisma.systemSettings.upsert({
    //   where: { key: 'linebot' },
    //   update: { value: savedSettings },
    //   create: { key: 'linebot', value: savedSettings }
    // })

    console.log('LINE BOT 設定已更新:', savedSettings)

    return NextResponse.json({
      success: true,
      message: 'LINE BOT 設定已保存',
      settings: savedSettings
    })

  } catch (error) {
    console.error('保存 LINE BOT 設定錯誤:', error)
    return NextResponse.json(
      { error: '保存設定失敗' },
      { status: 500 }
    )
  }
}