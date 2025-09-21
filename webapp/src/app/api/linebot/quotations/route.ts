import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 🤖 LINE BOT 報價記錄 API
 * 完全按照GAS版本的邏輯實現
 * 支援多行報價格式：#報價 客戶\n商品 價格\n...
 */

// POST /api/linebot/quotations - 創建LINE BOT報價記錄
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, line_user_id } = body

    if (!text || !line_user_id) {
      return NextResponse.json({
        success: false,
        error: '缺少必要參數'
      }, { status: 400 })
    }

    // 按照GAS邏輯解析報價指令
    const result = await processQuotationCommand(text, line_user_id)

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.quotations
    })

  } catch (error) {
    console.error('LINE BOT報價記錄失敗:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '處理失敗，請重新嘗試'
    }, { status: 500 })
  }
}

/**
 * 處理報價指令 - 完全按照GAS邏輯
 * 格式：#報價 客戶\n商品 價格\n...
 */
async function processQuotationCommand(text: string, lineUserId: string) {
  // 移除 #報價 關鍵字，按行切分（完全按照GAS邏輯）
  const content = text.replace(/#報價單?/g, '').trim()
  const lines = content.split('\n').filter(line => line.trim() !== '')

  if (lines.length === 0) {
    throw new Error('❌ 報價格式錯誤\n\n支援格式：\n• #報價 客戶 \n商品 價格\n\n範例：\n#報價 花花\n若鶴 1000\n山崎18 45000')
  }

  const recordDate = new Date()
  let customer = null
  let currentCustomer = null
  const results = []
  const errors = []

  // 逐行處理（完全按照GAS邏輯）
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const parts = line.split(' ').filter(p => p.trim() !== '')

    try {
      // 第一行必須有客戶
      if (i === 0) {
        if (parts.length < 1) {
          errors.push(`第${i+1}行未記錄：缺少客戶名稱`)
          continue
        }

        if (parts.length === 1) {
          // 只有客戶名稱
          customer = currentCustomer = parts[0]
        } else if (parts.length >= 3) {
          // 客戶 + 商品 + 價格
          customer = currentCustomer = parts[0]
          const quoteInfo = parseQuotationLine(parts.slice(1), i+1)
          if (quoteInfo.success) {
            const quotation = await createQuotationRecord(currentCustomer, quoteInfo.product, quoteInfo.price, quoteInfo.note, recordDate, lineUserId)
            results.push(`• ${currentCustomer}: ${quoteInfo.product} ${quoteInfo.price.toLocaleString()}元`)
          } else {
            errors.push(quoteInfo.error)
          }
        } else {
          errors.push(`第${i+1}行未記錄：格式不正確`)
        }
      } else {
        // 後續行：判斷是新客戶還是繼續報價
        if (parts.length === 1 && /^[\u4e00-\u9fa5\w]+$/.test(parts[0])) {
          // 只有一個中文或英文字，判斷為新客戶
          currentCustomer = parts[0]
          if (!customer) customer = currentCustomer
        } else {
          // 商品行
          if (!currentCustomer) {
            errors.push(`第${i+1}行未記錄：無法確定客戶`)
            continue
          }

          const quoteInfo = parseQuotationLine(parts, i+1)
          if (quoteInfo.success) {
            const quotation = await createQuotationRecord(currentCustomer, quoteInfo.product, quoteInfo.price, quoteInfo.note, recordDate, lineUserId)
            results.push(`• ${currentCustomer}: ${quoteInfo.product} ${quoteInfo.price.toLocaleString()}元`)
          } else {
            errors.push(quoteInfo.error)
          }
        }
      }
    } catch (lineError) {
      errors.push(`第${i+1}行處理失敗：${lineError.message}`)
    }
  }

  // 組合回應訊息（按照GAS格式）
  let message = ''
  if (results.length > 0) {
    message += `✅ 成功記錄 ${results.length} 筆報價：\n${results.join('\n')}`
  }
  if (errors.length > 0) {
    message += (results.length > 0 ? '\n\n' : '') + `❌ ${errors.length} 筆失敗：\n${errors.join('\n')}`
  }

  return {
    message: message || '無有效記錄',
    quotations: results.length
  }
}

/**
 * 解析報價行 - 按照GAS邏輯
 * 格式：商品名稱 價格 [備註]
 */
function parseQuotationLine(parts: string[], lineNumber: number) {
  try {
    if (parts.length < 2) {
      return {
        success: false,
        error: `第${lineNumber}行未記錄：缺少商品或價格`
      }
    }

    // 最後一個部分是價格
    const priceStr = parts[parts.length - 1]
    const price = parseFloat(priceStr.replace(/[,\s]/g, ''))

    if (isNaN(price) || price <= 0) {
      return {
        success: false,
        error: `第${lineNumber}行未記錄：價格格式錯誤 (${priceStr})`
      }
    }

    // 商品名稱是除了最後一個價格以外的所有部分
    const product = parts.slice(0, -1).join(' ')
    const note = parts.length > 2 ? '多規格商品' : null

    return {
      success: true,
      product,
      price,
      note
    }
  } catch (error) {
    return {
      success: false,
      error: `第${lineNumber}行解析失敗：${error.message}`
    }
  }
}

/**
 * 創建報價記錄到資料庫
 */
async function createQuotationRecord(customerName: string, productName: string, price: number, note: string | null, recordDate: Date, lineUserId: string) {
  try {
    // 查找或創建客戶
    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { name: customerName },
          { customer_code: customerName }
        ]
      }
    })

    if (!customer) {
      // 創建新客戶（LINE BOT來源）
      const customerCode = `LINE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      customer = await prisma.customer.create({
        data: {
          customer_code: customerCode,
          name: customerName,
          tier: 'REGULAR',
          payment_terms: 'CASH',
          notes: `由LINE BOT自動創建 - ${recordDate.toISOString()}`
        }
      })
    }

    // 生成報價單號
    const quoteNumber = await generateQuoteNumber()

    // 創建報價記錄
    const quotation = await prisma.quotation.create({
      data: {
        quote_number: quoteNumber,
        customer_id: customer.id,
        product_name: productName,
        quantity: 1, // LINE BOT報價預設數量為1
        unit_price: price,
        total_amount: price,
        special_notes: note,
        status: 'PENDING',
        quoted_by: 'LINE_BOT', // 固定值，表示來自LINE BOT
        source: 'LINE_BOT',
        line_user_id: lineUserId,
        created_at: recordDate
      }
    })

    return quotation
  } catch (error) {
    console.error('創建報價記錄失敗:', error)
    throw new Error(`資料庫記錄失敗：${error.message}`)
  }
}

/**
 * 生成報價單號
 */
async function generateQuoteNumber(): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

  // 查詢當日最大序號
  const lastQuote = await prisma.quotation.findFirst({
    where: {
      quote_number: {
        startsWith: `QT${dateStr}`
      }
    },
    orderBy: {
      quote_number: 'desc'
    }
  })

  let sequence = 1
  if (lastQuote) {
    const lastSequence = parseInt(lastQuote.quote_number.slice(-3))
    sequence = lastSequence + 1
  }

  return `QT${dateStr}${sequence.toString().padStart(3, '0')}`
}