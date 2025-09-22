import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getGeminiApiKey } from '@/lib/keys'

/**
 * 🤖 Room-6: Google Gemini AI 整合 API
 * 核心功能：智慧對話 + 商業領域知識 + 成本分析建議
 */

// Google Gemini API設定：動態讀取（DB 優先，其次環境變數）

// 酒類貿易專業prompt模板
const BUSINESS_CONTEXT = `
你是「小白酒類貿易」的專業AI助手，專精於：

🍷 商業領域：
- 酒類進口貿易（日本威士忌、清酒、紅酒等）
- 成本計算（匯率、進口稅、運費）
- 庫存管理與銷售分析
- 客戶關係管理

💰 專業知識：
- 日圓匯率約0.21 TWD
- 酒類進口稅率約15-20%
- 威士忌保存建議溫度15-20°C
- 客戶分級：VIP、PREMIUM、REGULAR、NEW

🎯 回應風格：
- 專業但親切
- 提供具體數據和建議
- 使用適當的emoji
- 繁體中文回應

📋 可提供服務：
1. 成本計算與分析
2. 商品資訊查詢
3. 市場趨勢分析
4. 庫存管理建議
5. 客戶服務支援

請根據用戶問題提供專業、實用的回答。
`

// 系統提示詞
const SYSTEM_PROMPTS = {
  cost_calculation: `
專精成本計算的AI助手，請協助計算酒類進口成本：
- 考慮匯率波動（目前約0.21 TWD/JPY）
- 包含進口稅費（約15-20%）
- 運費和保險費用
- 提供詳細分解和建議
`,

  product_query: `
專精商品查詢的AI助手，可協助：
- 威士忌產地和年份資訊
- 酒類分類和特色
- 保存和品飲建議
- 市場行情分析
`,

  inventory_management: `
專精庫存管理的AI助手，提供：
- 安全庫存建議
- 季節性需求分析
- 週轉率優化建議
- 滯銷商品處理方案
`,

  customer_service: `
專精客戶服務的AI助手，協助：
- 客戶問題解答
- 商品推薦
- 訂購流程說明
- 售後服務支援
`
}

// 檢測訊息類型並選擇適當的prompt
function getPromptByMessageType(message: string): string {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('成本') || lowerMessage.includes('計算') || lowerMessage.includes('價格')) {
    return SYSTEM_PROMPTS.cost_calculation
  }

  if (lowerMessage.includes('商品') || lowerMessage.includes('威士忌') || lowerMessage.includes('清酒') || lowerMessage.includes('紅酒')) {
    return SYSTEM_PROMPTS.product_query
  }

  if (lowerMessage.includes('庫存') || lowerMessage.includes('管理') || lowerMessage.includes('建議')) {
    return SYSTEM_PROMPTS.inventory_management
  }

  if (lowerMessage.includes('客戶') || lowerMessage.includes('服務') || lowerMessage.includes('怎麼') || lowerMessage.includes('如何')) {
    return SYSTEM_PROMPTS.customer_service
  }

  return BUSINESS_CONTEXT
}

// 加強的成本計算功能
function extractCostCalculationData(message: string) {
  // 提取數字
  const numbers = message.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/g)
  // 提取貨幣
  const currencies = message.match(/(日圓|yen|jpy|台幣|twd|美金|usd)/gi)
  // 提取商品類型
  const products = message.match(/(威士忌|清酒|紅酒|白酒|燒酒)/gi)

  return {
    numbers: numbers?.map(n => parseFloat(n.replace(/,/g, ''))),
    currencies,
    products
  }
}

// 生成詳細的成本分析
function generateCostAnalysis(data: any) {
  if (!data.numbers || data.numbers.length === 0) {
    return null
  }

  const amount = data.numbers[0]
  const exchangeRate = 0.21 // JPY to TWD

  // 基本轉換
  const twd = amount * exchangeRate

  // 成本結構
  const importDuty = twd * 0.15 // 15%進口關稅
  const shippingFee = Math.min(twd * 0.05, 10000) // 運費，最高1萬
  const insuranceFee = twd * 0.002 // 保險費0.2%
  const handlingFee = 500 // 手續費

  const totalCost = twd + importDuty + shippingFee + insuranceFee + handlingFee
  const markup = totalCost * 0.3 // 建議30%毛利
  const suggestedPrice = totalCost + markup

  return {
    originalAmount: amount,
    twd,
    importDuty,
    shippingFee,
    insuranceFee,
    handlingFee,
    totalCost,
    markup,
    suggestedPrice
  }
}

// POST /api/linebot/gemini - 處理AI對話請求
export async function POST(request: NextRequest) {
  try {
    const { message, userId, messageType = 'general' } = await request.json()

    const apiKey = await getGeminiApiKey(); if (!apiKey) {
      throw new Error('Google Gemini API key not configured')
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // 選擇適當的模型和提示詞
    const genAI = new GoogleGenerativeAI(apiKey); const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })
    const systemPrompt = getPromptByMessageType(message)

    // 如果是成本計算請求，先嘗試結構化分析
    const costData = extractCostCalculationData(message)
    const costAnalysis = generateCostAnalysis(costData)

    let enhancedMessage = message
    if (costAnalysis) {
      enhancedMessage = `
用戶詢問：${message}

檢測到的數據：
- 原始金額：¥${costAnalysis.originalAmount.toLocaleString()}
- 台幣換算：NT$${costAnalysis.twd.toLocaleString()}
- 總成本：NT$${costAnalysis.totalCost.toLocaleString()}
- 建議售價：NT$${costAnalysis.suggestedPrice.toLocaleString()}

請基於以上數據提供專業的成本分析和建議。
`
    }

    // 構建完整的prompt
    const fullPrompt = `${systemPrompt}

用戶ID：${userId}
用戶訊息：${enhancedMessage}

請提供專業、實用的回答：`

    // 呼叫Gemini API
    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const aiReply = response.text()

    // 如果有成本分析，加入結構化數據
    let finalReply = aiReply
    if (costAnalysis) {
      finalReply = `${aiReply}

📊 詳細成本分解：
💰 原價：¥${costAnalysis.originalAmount.toLocaleString()}
💱 台幣：NT$${costAnalysis.twd.toLocaleString()}
🏛️ 進口關稅：NT$${costAnalysis.importDuty.toLocaleString()}
🚢 運費：NT$${costAnalysis.shippingFee.toLocaleString()}
🛡️ 保險：NT$${costAnalysis.insuranceFee.toLocaleString()}
📝 手續費：NT$${costAnalysis.handlingFee.toLocaleString()}
✅ 總成本：NT$${costAnalysis.totalCost.toLocaleString()}
💎 建議售價：NT$${costAnalysis.suggestedPrice.toLocaleString()} (含30%毛利)

※ 匯率和稅率僅供參考，實際可能有變動`
    }

    // 記錄對話 (可選)
    console.log(`AI Response for ${userId}:`, {
      message: message.substring(0, 100),
      responseLength: finalReply.length,
      hasCostAnalysis: !!costAnalysis
    })

    return NextResponse.json({
      success: true,
      response: finalReply,
      metadata: {
        messageType,
        hasCostAnalysis: !!costAnalysis,
        responseTime: Date.now(),
        model: 'gemini-2.5-pro'
      }
    })

  } catch (error) {
    console.error('Gemini API error:', error)

    // 提供fallback回應
    const fallbackResponse = `🤖 小白AI助手暫時忙碌中，請稍後再試。

可以嘗試這些功能：
💰 成本計算：「計算100萬日圓成本」
🍷 商品查詢：「查詢山崎威士忌」
📦 庫存查詢：「威士忌庫存狀況」
📊 報表查詢：「今日銷售報表」

或者直接聯繫客服人員協助您！`

    return NextResponse.json({
      success: false,
      response: fallbackResponse,
      error: 'AI服務暫時不可用',
      metadata: {
        fallback: true,
        timestamp: Date.now()
      }
    })
  }
}

// GET /api/linebot/gemini - 健康檢查
export async function GET() {
  const isConfigured = !!GEMINI_API_KEY

  return NextResponse.json({
    status: 'Gemini AI integration',
    configured: isConfigured,
    model: 'gemini-pro',
    features: [
      'intelligent_conversation',
      'cost_calculation',
      'product_consultation',
      'business_analysis'
    ],
    timestamp: new Date().toISOString()
  })
}

