import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * 🤖 Room-6: 圖片OCR辨識 API
 * 核心功能：報單辨識 + 商品標籤識別 + 價格表解析
 */

// Google Gemini API設定 (支援Vision)
const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

// LINE Bot API設定
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''

// OCR辨識模板
const OCR_PROMPTS = {
  customs_declaration: `
請分析這張報單圖片，提取以下資訊：
1. 商品名稱和數量
2. 申報價值和貨幣
3. 稅則號列 (HS Code)
4. 原產地
5. 重量資訊
6. 其他重要資訊

請以結構化的JSON格式回應，包含confidence評分。
`,

  product_label: `
請分析這張商品標籤，提取以下資訊：
1. 商品名稱 (中文/英文/日文)
2. 品牌
3. 酒精度數
4. 容量
5. 生產年份
6. 產地
7. 價格 (如有)
8. 條碼 (如有)

請以結構化的JSON格式回應。
`,

  price_list: `
請分析這張價格表，提取以下資訊：
1. 商品清單和對應價格
2. 貨幣單位
3. 有效期限 (如有)
4. 折扣資訊 (如有)
5. 備註事項

請以結構化的JSON格式回應，方便系統處理。
`,

  invoice: `
請分析這張發票，提取以下資訊：
1. 發票號碼和日期
2. 賣方和買方資訊
3. 商品明細和價格
4. 稅額和總金額
5. 付款條件

請以結構化的JSON格式回應。
`,

  general: `
請分析這張圖片中的文字內容，特別關注：
1. 酒類相關資訊
2. 數字和價格
3. 日期
4. 重要的商業資訊

請提供中文說明和建議。
`
}

// 辨識結果後處理
interface OCRResult {
  type: 'customs_declaration' | 'product_label' | 'price_list' | 'invoice' | 'general'
  confidence: number
  extractedData: any
  summary: string
  suggestions: string[]
}

// 從LINE獲取圖片
async function getImageFromLine(messageId: string): Promise<Buffer> {
  try {
    const response = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
      headers: {
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error('Error fetching image from LINE:', error)
    throw error
  }
}

// 檢測圖片類型
function detectImageType(extractedText: string): 'customs_declaration' | 'product_label' | 'price_list' | 'invoice' | 'general' {
  const text = extractedText.toLowerCase()

  if (text.includes('報單') || text.includes('海關') || text.includes('customs') || text.includes('hs code')) {
    return 'customs_declaration'
  }

  if (text.includes('發票') || text.includes('invoice') || text.includes('統一編號') || text.includes('tax id')) {
    return 'invoice'
  }

  if (text.includes('價格表') || text.includes('price list') || text.includes('定價') || text.includes('報價')) {
    return 'price_list'
  }

  if (text.includes('ml') || text.includes('度') || text.includes('%') || text.includes('年份') || text.includes('產地')) {
    return 'product_label'
  }

  return 'general'
}

// 使用Gemini Vision進行OCR
async function performOCR(imageBuffer: Buffer, imageType?: string): Promise<OCRResult> {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured')
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })

    // 準備圖片數據
    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: 'image/jpeg' // 假設是JPEG，實際應該檢測
      }
    }

    // 先做基本OCR獲取文字
    const basicPrompt = "請提取這張圖片中的所有文字內容，保持原有格式。"
    const basicResult = await model.generateContent([basicPrompt, imagePart])
    const extractedText = basicResult.response.text()

    // 檢測圖片類型
    const detectedType = imageType as keyof typeof OCR_PROMPTS || detectImageType(extractedText)
    const specificPrompt = OCR_PROMPTS[detectedType]

    // 使用特定prompt進行結構化分析
    const structuredResult = await model.generateContent([
      `提取的文字內容：${extractedText}\n\n${specificPrompt}`,
      imagePart
    ])

    const analysisResult = structuredResult.response.text()

    // 嘗試解析JSON回應
    let extractedData = {}
    let confidence = 0.8

    try {
      // 尋找JSON部分
      const jsonMatch = analysisResult.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0])
        confidence = 0.9
      }
    } catch (jsonError) {
      // 如果無法解析JSON，使用原始文字
      extractedData = { rawText: extractedText, analysis: analysisResult }
      confidence = 0.7
    }

    // 生成摘要和建議
    const summary = generateSummary(detectedType, extractedData, extractedText)
    const suggestions = generateSuggestions(detectedType, extractedData)

    return {
      type: detectedType,
      confidence,
      extractedData,
      summary,
      suggestions
    }

  } catch (error) {
    console.error('OCR processing error:', error)
    throw error
  }
}

// 生成摘要
function generateSummary(type: string, data: any, rawText: string): string {
  const typeNames = {
    customs_declaration: '報單',
    product_label: '商品標籤',
    price_list: '價格表',
    invoice: '發票',
    general: '一般文件'
  }

  const typeName = typeNames[type as keyof typeof typeNames] || '文件'

  return `📷 已辨識${typeName}內容

🔍 提取到的關鍵資訊：
${rawText.length > 200 ? rawText.substring(0, 200) + '...' : rawText}

📊 辨識類型：${typeName}
✅ 辨識可信度：${Math.round((data.confidence || 0.8) * 100)}%`
}

// 生成建議
function generateSuggestions(type: string, data: any): string[] {
  const suggestions: { [key: string]: string[] } = {
    customs_declaration: [
      '建議建立商品檔案以便後續追蹤',
      '可以將稅則號列加入商品資料',
      '留意申報價值是否合理',
      '確認原產地標示正確'
    ],
    product_label: [
      '可以建立新商品檔案',
      '設定合適的售價和庫存',
      '注意保存條件要求',
      '確認進口相關證件'
    ],
    price_list: [
      '可以批量更新商品價格',
      '注意價格有效期限',
      '比較與目前售價差異',
      '評估利潤空間'
    ],
    invoice: [
      '建議建立應付帳款記錄',
      '確認商品已入庫',
      '檢查發票資訊是否正確',
      '安排付款事宜'
    ],
    general: [
      '可以補充更多商品資訊',
      '建議人工確認重要數據',
      '保存原始文件備查'
    ]
  }

  return suggestions[type] || suggestions.general
}

// POST /api/linebot/ocr - 圖片OCR辨識
export async function POST(request: NextRequest) {
  try {
    const { messageId, imageType, userId } = await request.json()

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      )
    }

    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'LINE Bot not configured' },
        { status: 500 }
      )
    }

    // 從LINE獲取圖片
    console.log(`Processing OCR for message ${messageId} from user ${userId}`)
    const imageBuffer = await getImageFromLine(messageId)

    // 執行OCR分析
    const result = await performOCR(imageBuffer, imageType)

    // 記錄處理結果
    console.log(`OCR completed for ${messageId}:`, {
      type: result.type,
      confidence: result.confidence,
      dataSize: JSON.stringify(result.extractedData).length
    })

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        messageId,
        userId,
        processedAt: new Date().toISOString(),
        imageSize: imageBuffer.length
      }
    })

  } catch (error) {
    console.error('OCR API error:', error)

    // 提供fallback回應
    const fallbackResult: OCRResult = {
      type: 'general',
      confidence: 0,
      extractedData: {},
      summary: '📷 圖片辨識功能暫時不可用',
      suggestions: [
        '請稍後重試',
        '或聯繫客服協助處理',
        '確保圖片清晰可讀'
      ]
    }

    return NextResponse.json({
      success: false,
      data: fallbackResult,
      error: '圖片處理失敗',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    })
  }
}

// GET /api/linebot/ocr - OCR服務資訊
export async function GET() {
  const isConfigured = !!(GEMINI_API_KEY && LINE_CHANNEL_ACCESS_TOKEN)

  return NextResponse.json({
    service: 'OCR Recognition API',
    version: '1.0.0',
    configured: isConfigured,
    supportedTypes: [
      'customs_declaration',
      'product_label',
      'price_list',
      'invoice',
      'general'
    ],
    features: [
      'automatic_type_detection',
      'structured_data_extraction',
      'multi_language_support',
      'confidence_scoring'
    ],
    model: 'gemini-2.5-pro',
    timestamp: new Date().toISOString()
  })
}