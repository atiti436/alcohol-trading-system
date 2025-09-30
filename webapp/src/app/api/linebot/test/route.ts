import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { Role } from '@/types/auth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未授權' },
        { status: 401 }
      )
    }

    // 只有管理員可以測試 LINE BOT
    if (session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: '權限不足' },
        { status: 403 }
      )
    }

    const { message, testType } = await request.json()

    // 模擬不同類型的測試
    const testResults = {
      cost_calculation: await simulateCostCalculation(message),
      webhook_connection: await simulateWebhookTest(),
      ai_recognition: await simulateAIRecognition(message)
    }

    const selectedTest = testResults[testType as keyof typeof testResults] || testResults.cost_calculation

    return NextResponse.json({
      success: true,
      test_type: testType,
      input: message,
      result: selectedTest,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('LINE BOT 測試錯誤:', error)
    return NextResponse.json(
      { error: 'LINE BOT 測試失敗' },
      { status: 500 }
    )
  }
}

// 模擬成本計算測試
async function simulateCostCalculation(message: string) {
  // 模擬解析酒類成本計算訊息
  const mockCalculation = {
    product: "白鶴清酒",
    volume: "720ml",
    alcohol_content: "15度",
    original_price: 800,
    exchange_rate: 0.21,
    taiwan_cost: 168,
    customs_duty: 34,
    tobacco_tax: 76,
    promotion_fee: 0,
    business_tax: 14,
    total_cost: 292
  }

  return {
    type: 'cost_calculation',
    status: 'success',
    calculation: mockCalculation,
    formatted_response: `成本計算結果：
💰 台幣成本: $${mockCalculation.taiwan_cost}
🏛️ 關稅: $${mockCalculation.customs_duty}
🍶 菸酒稅: $${mockCalculation.tobacco_tax}
📊 推廣費: $${mockCalculation.promotion_fee}
💸 營業稅: $${mockCalculation.business_tax}
━━━━━━━━━━
總成本: $${mockCalculation.total_cost}/瓶`
  }
}

// 模擬 Webhook 連接測試
async function simulateWebhookTest() {
  return {
    type: 'webhook_test',
    status: 'success',
    webhook_url: process.env.NEXTAUTH_URL + '/api/linebot/webhook',
    ssl_valid: true,
    response_time: '120ms',
    line_verification: 'pending'
  }
}

// 模擬 AI 辨識測試
async function simulateAIRecognition(message: string) {
  return {
    type: 'ai_recognition',
    status: 'success',
    confidence: 0.95,
    recognized_fields: {
      product_name: "白鶴清酒",
      volume: "720ml",
      alcohol_content: "15度",
      price: 800,
      currency: "日幣"
    },
    suggestions: [
      "建議補充匯率資訊",
      "可以詢問是否需要計算進口稅金"
    ]
  }
}