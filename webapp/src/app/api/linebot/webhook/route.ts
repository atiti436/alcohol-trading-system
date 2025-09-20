import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { LineMessage, LineMessageEvent, LineWebhookRequest } from '@/types/linebot'

/**
 * 🤖 Room-6: LINE BOT Webhook API
 * 核心功能：LINE訊息接收 + 智慧回應 + 成本計算
 */

// LINE Channel Secret (從環境變數讀取)
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || ''
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''

// 驗證LINE簽名
function validateSignature(body: string, signature: string): boolean {
  if (!CHANNEL_SECRET) {
    console.error('LINE_CHANNEL_SECRET not found')
    return false
  }

  const hash = crypto
    .createHmac('sha256', CHANNEL_SECRET)
    .update(body)
    .digest('base64')

  return signature === hash
}

// 發送LINE訊息 - 🔧 移除any類型
async function sendLineMessage(replyToken: string, messages: LineMessage[]) {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        replyToken,
        messages
      })
    })

    if (!response.ok) {
      console.error('Failed to send LINE message:', await response.text())
    }
  } catch (error) {
    console.error('Error sending LINE message:', error)
  }
}

// 處理文字訊息
async function handleTextMessage(text: string, userId: string): Promise<LineMessage> {
  console.log(`收到訊息 from ${userId}: ${text}`)

  // 成本計算功能
  if (text.includes('成本') || text.includes('計算')) {
    return await handleCostCalculation(text)
  }

  // 商品查詢功能
  if (text.includes('查詢') || text.includes('商品')) {
    return await handleProductQuery(text)
  }

  // 庫存查詢功能
  if (text.includes('庫存')) {
    return await handleInventoryQuery(text)
  }

  // 銷售報表功能
  if (text.includes('報表') || text.includes('銷售')) {
    return await handleSalesReport(text)
  }

  // 一般對話 - 整合Gemini AI
  return await handleGeneralChat(text, userId)
}

// 成本計算處理
async function handleCostCalculation(text: string): Promise<LineMessage> {
  try {
    // 解析數字和關鍵字
    const priceMatch = text.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/g)

    if (!priceMatch || priceMatch.length === 0) {
      return {
        type: 'text' as const,
        text: '請提供數字資訊，例如：「計算100萬日圓的成本」'
      }
    }

    const amount = parseFloat(priceMatch[0].replace(/,/g, ''))

    // 檢測貨幣類型
    let currency = 'JPY' // 預設日圓
    if (text.includes('美金') || text.includes('USD') || text.includes('美元')) {
      currency = 'USD'
    } else if (text.includes('歐元') || text.includes('EUR')) {
      currency = 'EUR'
    } else if (text.includes('台幣') || text.includes('TWD')) {
      currency = 'TWD'
    }

    // 檢測商品類型
    let productType = 'default'
    if (text.includes('威士忌')) productType = 'whisky'
    else if (text.includes('清酒')) productType = 'sake'
    else if (text.includes('紅酒') || text.includes('葡萄酒')) productType = 'wine'
    else if (text.includes('啤酒')) productType = 'beer'

    // 呼叫專業計算器API
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/linebot/calculator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount,
        currency,
        productType,
        quantity: 1,
        customerTier: 'REGULAR',
        includeShipping: true,
        includeTax: true
      })
    })

    const result = await response.json()

    if (result.success) {
      const data = result.data
      return {
        type: 'text' as const,
        text: `💰 專業成本計算結果：

📊 基本資訊：
• 原價：${currency === 'JPY' ? '¥' : currency === 'USD' ? '$' : '€'}${amount.toLocaleString()}
• 匯率：${data.conversion.exchangeRate}
• 商品類型：${productType}

💵 成本分解：
• 基本價格：NT$${data.costs.basePrice.toLocaleString()}
• 進口稅：NT$${data.costs.importTax.toLocaleString()}
• 關稅：NT$${data.costs.customsDuty.toLocaleString()}
• 營業稅：NT$${data.costs.businessTax.toLocaleString()}
• 運費：NT$${data.costs.shippingFee.toLocaleString()}
• 保險費：NT$${data.costs.insuranceFee.toLocaleString()}
• 手續費：NT$${data.costs.processingFee.toLocaleString()}

✅ 總成本：NT$${data.pricing.totalCost.toLocaleString()}
💎 建議售價：NT$${data.pricing.suggestedPrice.toLocaleString()}
📈 預期毛利：${data.profitAnalysis.profitMargin.toFixed(1)}%

※ 以上為參考值，實際可能因市況變動`
      }
    } else {
      // Fallback到簡單計算
      const exchangeRate = 0.21
      const costInTwd = amount * exchangeRate
      const importTax = costInTwd * 0.15
      const totalCost = costInTwd + importTax

      return {
        type: 'text' as const,
        text: `💰 基本成本計算：

原價：¥${amount.toLocaleString()}
台幣：NT$${costInTwd.toLocaleString()}
進口稅：NT$${importTax.toLocaleString()}
總成本：NT$${totalCost.toLocaleString()}

※ 建議使用專業版本獲得更精確計算`
      }
    }

  } catch (error) {
    console.error('Cost calculation error:', error)
    return {
      type: 'text' as const,
      text: '💰 成本計算暫時不可用，請稍後再試\n\n可以重新輸入：「計算100萬日圓成本」'
    }
  }
}

// 商品查詢處理
async function handleProductQuery(text: string): Promise<LineMessage> {
  // 這裡可以整合產品API查詢
  return {
    type: 'text' as const,
    text: '🍷 商品查詢功能開發中...\n\n可以查詢：\n• 威士忌\n• 清酒\n• 紅酒\n• 庫存狀況'
  }
}

// 庫存查詢處理
async function handleInventoryQuery(text: string): Promise<LineMessage> {
  return {
    type: 'text' as const,
    text: '📦 庫存查詢功能開發中...\n\n將提供：\n• 即時庫存數量\n• 預留庫存\n• 可售庫存\n• 安全庫存警示'
  }
}

// 銷售報表處理
async function handleSalesReport(text: string): Promise<LineMessage> {
  return {
    type: 'text' as const,
    text: '📊 銷售報表功能開發中...\n\n將提供：\n• 今日銷售\n• 本月統計\n• TOP客戶\n• 熱銷商品'
  }
}

// 一般對話處理 (Gemini AI)
async function handleGeneralChat(text: string, userId: string): Promise<LineMessage> {
  try {
    const aiResponse = await callGeminiAPI(text, userId)
    return {
      type: 'text' as const,
      text: aiResponse
    }
  } catch (error) {
    console.error('Gemini API error:', error)
    return {
      type: 'text' as const,
      text: '🤖 小白助手暫時無法回應，請稍後再試。\n\n可以嘗試：\n• 成本計算\n• 商品查詢\n• 庫存查詢\n• 銷售報表'
    }
  }
}

// 呼叫Gemini AI API
async function callGeminiAPI(text: string, userId: string): Promise<string> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/linebot/gemini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: text,
        userId,
        messageType: 'general'
      })
    })

    const result = await response.json()

    if (result.success) {
      return result.response
    } else {
      throw new Error(result.error || 'Gemini API failed')
    }
  } catch (error) {
    console.error('Gemini API call failed:', error)
    return `您好！我是小白酒類貿易助手 🤖

我可以幫您：
• 💰 成本計算：「計算100萬日圓成本」
• 🍷 商品查詢：「查詢威士忌」
• 📦 庫存查詢：「庫存狀況」
• 📊 銷售報表：「今日銷售報表」

請問需要什麼協助嗎？`
  }
}

// 處理圖片訊息 (OCR辨識)
async function handleImageMessage(messageId: string, userId: string): Promise<LineMessage> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/linebot/ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messageId,
        userId
      })
    })

    const result = await response.json()

    if (result.success) {
      const ocrData = result.data
      let responseText = ocrData.summary

      if (ocrData.suggestions && ocrData.suggestions.length > 0) {
        responseText += '\n\n💡 建議操作：\n'
        ocrData.suggestions.forEach((suggestion: string, index: number) => {
          responseText += `${index + 1}. ${suggestion}\n`
        })
      }

      return {
        type: 'text' as const,
        text: responseText
      }
    } else {
      return {
        type: 'text' as const,
        text: '📷 圖片辨識功能暫時不可用\n\n將支援：\n• 報單辨識\n• 商品標籤辨識\n• 價格表辨識\n• 發票辨識'
      }
    }
  } catch (error) {
    console.error('Image processing error:', error)
    return {
      type: 'text' as const,
      text: '❌ 圖片處理失敗，請稍後再試\n\n💡 提示：\n• 確保圖片清晰\n• 支援JPG/PNG格式\n• 文字內容完整可見'
    }
  }
}

// POST /api/linebot/webhook - LINE Bot主要接收端點
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-line-signature') || ''

    // 驗證LINE簽名
    if (!validateSignature(body, signature)) {
      console.error('Invalid LINE signature')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = JSON.parse(body)

    // 處理每個事件
    for (const event of data.events) {
      console.log('LINE Event:', JSON.stringify(event, null, 2))

      if (event.type === 'message') {
        let response: LineMessage | undefined

        switch (event.message.type) {
          case 'text':
            response = await handleTextMessage(event.message.text, event.source.userId)
            break

          case 'image':
            response = await handleImageMessage(event.message.id, event.source.userId)
            break

          default:
            response = {
              type: 'text' as const,
              text: '🤖 目前只支援文字和圖片訊息\n\n試試看：\n• 輸入「成本計算」\n• 上傳圖片進行辨識'
            }
        }

        // 回覆訊息
        if (response && event.replyToken) {
          await sendLineMessage(event.replyToken, [response])
        }
      }
    }

    return NextResponse.json({ status: 'success' })

  } catch (error) {
    console.error('LINE Bot webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/linebot/webhook - 健康檢查
export async function GET() {
  return NextResponse.json({
    status: 'LINE Bot webhook is running',
    timestamp: new Date().toISOString()
  })
}