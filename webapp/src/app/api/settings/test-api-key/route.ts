import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { getClientIp, rateLimit } from '@/lib/rate-limit'

// 強制動態渲染
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Simple rate limit: 10 requests / minute per IP
    const ip = getClientIp(request)
    const rl = rateLimit({ key: `test-api-key:${ip}`, limit: 10, windowMs: 60_000 })
    if (!rl.allowed) {
      return NextResponse.json({ success: false, error: 'Too many requests, please try later.' }, { status: 429 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未授權' }, { status: 401 })
    }

    const body = await request.json()
    const { apiKey } = body

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { success: false, error: 'API Key 不能為空' },
        { status: 400 }
      )
    }

    // 測試 Gemini API（不回傳任何金鑰資訊）
    try {
      const testResponse = await fetch('https://generativelanguage.googleapis.com/v1/models?key=' + apiKey, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (testResponse.ok) {
        const data = await testResponse.json()
        if (data.models && Array.isArray(data.models) && data.models.length > 0) {
          return NextResponse.json({
            success: true,
            message: `API Key 有效，找到 ${data.models.length} 個可用模型`
          })
        } else {
          return NextResponse.json({
            success: false,
            message: 'API Key 有效但無可用模型'
          })
        }
      } else {
        const errorData = await testResponse.json().catch(() => ({}))
        return NextResponse.json({
          success: false,
          message: `API Key 無效: ${errorData.error?.message || testResponse.statusText}`
        })
      }
    } catch (apiError) {
      console.error('測試 API Key 失敗:', apiError)
      return NextResponse.json({
        success: false,
        message: 'API 連線測試失敗，請檢查 API Key 或網路連線'
      })
    }

  } catch (error) {
    console.error('測試 API Key 失敗:', error)
    return NextResponse.json(
      { success: false, error: '測試失敗' },
      { status: 500 }
    )
  }
}
