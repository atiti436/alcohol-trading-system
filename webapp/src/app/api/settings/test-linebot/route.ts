import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { Role } from '@/types/auth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * POST /api/settings/test-linebot - 測試 LINE Bot 設定
 * 🔒 僅 SUPER_ADMIN 可存取
 */

export async function POST(request: NextRequest) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const body = await request.json()
    const { channelAccessToken, channelSecret, webhookUrl } = body

    // 驗證必需欄位
    if (!channelAccessToken?.trim() || !channelSecret?.trim()) {
      return NextResponse.json({
        success: false,
        message: '請提供完整的 Channel Access Token 和 Channel Secret'
      })
    }

    // 基本格式驗證
    if (channelAccessToken.length < 50) {
      return NextResponse.json({
        success: false,
        message: 'Channel Access Token 格式不正確，長度不足'
      })
    }

    if (channelSecret.length !== 32) {
      return NextResponse.json({
        success: false,
        message: 'Channel Secret 必須為 32 字符'
      })
    }

    try {
      // 測試 LINE Messaging API 連線
      const testResponse = await fetch('https://api.line.me/v2/bot/info', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${channelAccessToken.trim()}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10秒超時
      })

      if (!testResponse.ok) {
        let errorMessage = 'LINE API 連線失敗'

        switch (testResponse.status) {
          case 401:
            errorMessage = 'Channel Access Token 無效或已過期'
            break
          case 403:
            errorMessage = '權限不足，請檢查 Token 權限設定'
            break
          case 429:
            errorMessage = 'API 呼叫頻率過高，請稍後再試'
            break
          default:
            errorMessage = `LINE API 回應錯誤 (${testResponse.status})`
        }

        return NextResponse.json({
          success: false,
          message: errorMessage
        })
      }

      const botInfo = await testResponse.json()

      return NextResponse.json({
        success: true,
        message: `LINE Bot 連線成功！Bot 名稱: ${botInfo.displayName || '未知'}`,
        data: {
          botName: botInfo.displayName,
          userId: botInfo.userId,
          webhookUrl: webhookUrl || `${process.env.NEXTAUTH_URL}/api/linebot/webhook`
        }
      })

    } catch (apiError) {
      if (apiError instanceof Error) {
        if (apiError.name === 'AbortError') {
          return NextResponse.json({
            success: false,
            message: 'LINE API 連線超時，請檢查網路連線'
          })
        }

        return NextResponse.json({
          success: false,
          message: `連線測試失敗: ${apiError.message}`
        })
      }

      return NextResponse.json({
        success: false,
        message: '連線測試失敗，請檢查網路連線和設定'
      })
    }

  } catch (error) {
    console.error('LINE Bot 測試失敗:', error)
    return NextResponse.json({
      success: false,
      message: '測試失敗，請重試'
    })
  }
}