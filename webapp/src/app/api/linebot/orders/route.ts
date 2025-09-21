import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 🤖 LINE BOT 訂單記錄 API
 * 完全按照GAS版本的邏輯實現
 * 支援多行訂單格式：#訂單 客戶 商品*數量 價格\n...
 */

// POST /api/linebot/orders - 創建LINE BOT訂單記錄
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

    // 按照GAS邏輯解析訂單指令
    const result = await processOrderCommand(text, line_user_id)

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.orders
    })

  } catch (error) {
    console.error('LINE BOT訂單記錄失敗:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '處理失敗，請重新嘗試'
    }, { status: 500 })
  }
}

/**
 * 處理訂單指令 - 完全按照GAS邏輯
 * 格式：#訂單 客戶 商品*數量 價格\n...
 */
async function processOrderCommand(text: string, lineUserId: string) {
  // 移除 #訂單 關鍵字，按行切分（完全按照GAS邏輯）
  const content = text.replace('#訂單', '').trim()
  const lines = content.split('\n').filter(line => line.trim() !== '')

  if (lines.length === 0) {
    throw new Error('❌ 訂單格式錯誤\n\n支援格式：\n• #訂單 客戶 商品*數量 價格\n• 多行商品每行一筆\n\n範例：\n#訂單 花花 大七梅酒 1800*8\n響2025 6000*3\n若鶴 850*60')
  }

  const recordDate = new Date()
  let customer = null
  let currentCustomer = null
  const items = []
  const errors = []

  // 逐行處理（完全按照GAS邏輯）
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const parts = line.split(' ').filter(p => p.trim() !== '')

    try {
      // 第一行必須有客戶
      if (i === 0) {
        if (parts.length < 2) {
          errors.push(`第${i+1}行未記錄：缺少客戶和商品資訊`)
          continue
        }
        customer = currentCustomer = parts[0]

        // 解析第一行的商品
        const productInfo = parseProductLine(parts.slice(1), i+1)
        if (productInfo.success) {
          items.push({
            customer: currentCustomer,
            ...productInfo.item
          })
        } else {
          errors.push(productInfo.error)
        }
      } else {
        // 後續行：判斷是新客戶還是繼續商品
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

          const productInfo = parseProductLine(parts, i+1)
          if (productInfo.success) {
            items.push({
              customer: currentCustomer,
              ...productInfo.item
            })
          } else {
            errors.push(productInfo.error)
          }
        }
      }
    } catch (lineError) {
      if (lineError instanceof Error) {
        errors.push(`第${i+1}行處理失敗：${lineError.message}`)
      } else {
        errors.push(`第${i+1}行處理失敗：${String(lineError)}`)
      }
    }
  }

  // 按客戶分組建立訂單
  const customerGroups = groupByCustomer(items)
  const results = []

  for (const [customerName, customerItems] of Object.entries(customerGroups)) {
    try {
      const order = await createOrderRecord(customerName, customerItems, recordDate, lineUserId)
      results.push(`• ${customerName}: ${customerItems.length}項商品，總金額 ${calculateTotal(customerItems).toLocaleString()}元`)
    } catch (orderError) {
      if (orderError instanceof Error) {
        errors.push(`${customerName}訂單創建失敗：${orderError.message}`)
      } else {
        errors.push(`${customerName}訂單創建失敗：${String(orderError)}`)
      }
    }
  }

  // 組合回應訊息（按照GAS格式）
  let message = ''
  if (results.length > 0) {
    message += `✅ 成功記錄 ${results.length} 筆訂單：\n${results.join('\n')}`
  }
  if (errors.length > 0) {
    message += (results.length > 0 ? '\n\n' : '') + `❌ ${errors.length} 筆失敗：\n${errors.join('\n')}`
  }

  return {
    message: message || '無有效記錄',
    orders: results.length
  }
}

/**
 * 解析商品行 - 按照GAS邏輯
 * 格式：商品名稱 數量*價格 或 商品名稱 價格*數量
 */
function parseProductLine(parts: string[], lineNumber: number) {
  try {
    if (parts.length < 2) {
      return {
        success: false,
        error: `第${lineNumber}行未記錄：缺少商品或價格資訊`
      }
    }

    // 尋找包含*的部分（數量和價格）
    let quantityPrice = null
    let productParts = []

    for (let i = 0; i < parts.length; i++) {
      if (parts[i].includes('*')) {
        quantityPrice = parts[i]
        productParts = parts.slice(0, i)
        // 檢查是否有價格在*號後面
        if (i + 1 < parts.length) {
          // 假設後面是單獨的價格
          const afterStar = parts.slice(i + 1).join('')
          if (!isNaN(parseFloat(afterStar))) {
            quantityPrice = quantityPrice + '*' + afterStar
          } else {
            productParts = productParts.concat(parts.slice(i + 1))
          }
        }
        break
      }
    }

    if (!quantityPrice) {
      // 沒有找到*號，假設最後一個是價格，數量為1
      const price = parseFloat(parts[parts.length - 1].replace(/[,\s]/g, ''))
      if (isNaN(price)) {
        return {
          success: false,
          error: `第${lineNumber}行未記錄：找不到有效的價格格式`
        }
      }

      return {
        success: true,
        item: {
          product: parts.slice(0, -1).join(' '),
          quantity: 1,
          unit_price: price,
          total_price: price
        }
      }
    }

    // 解析 quantity*price 格式
    const quantityPriceParts = quantityPrice.split('*')
    if (quantityPriceParts.length !== 2) {
      return {
        success: false,
        error: `第${lineNumber}行未記錄：數量*價格格式錯誤 (${quantityPrice})`
      }
    }

    const quantity = parseInt(quantityPriceParts[0])
    const price = parseFloat(quantityPriceParts[1].replace(/[,\s]/g, ''))

    if (isNaN(quantity) || quantity <= 0) {
      return {
        success: false,
        error: `第${lineNumber}行未記錄：數量格式錯誤 (${quantityPriceParts[0]})`
      }
    }

    if (isNaN(price) || price <= 0) {
      return {
        success: false,
        error: `第${lineNumber}行未記錄：價格格式錯誤 (${quantityPriceParts[1]})`
      }
    }

    const product = productParts.length > 0 ? productParts.join(' ') : '未指定商品'

    return {
      success: true,
      item: {
        product,
        quantity,
        unit_price: price,
        total_price: quantity * price
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `第${lineNumber}行解析失敗：${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * 按客戶分組
 */
function groupByCustomer(items: any[]) {
  const groups: { [key: string]: any[] } = {}

  for (const item of items) {
    if (!groups[item.customer]) {
      groups[item.customer] = []
    }
    groups[item.customer].push(item)
  }

  return groups
}

/**
 * 計算總金額
 */
function calculateTotal(items: any[]): number {
  return items.reduce((sum, item) => sum + item.total_price, 0)
}

/**
 * 創建訂單記錄到資料庫
 */
async function createOrderRecord(customerName: string, items: any[], recordDate: Date, lineUserId: string) {
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

    // 生成銷售單號
    const saleNumber = await generateSaleNumber()

    // 計算總金額
    const totalAmount = calculateTotal(items)

    // 創建銷售訂單
    const sale = await prisma.sale.create({
      data: {
        sale_number: saleNumber,
        customer_id: customer.id,
        total_amount: totalAmount,
        funding_source: 'COMPANY', // LINE BOT訂單預設為公司資金
        payment_terms: customer.payment_terms,
        status: 'DRAFT', // LINE BOT訂單初始狀態為草稿
        notes: `由LINE BOT創建 - User: ${lineUserId}`,
        created_by: 'LINE_BOT',
        created_at: recordDate
      }
    })

    // 創建訂單明細
    for (const item of items) {
      await prisma.saleItem.create({
        data: {
          sale_id: sale.id,
          product_id: null, // LINE BOT商品暫時不關聯具體產品
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          created_at: recordDate
        }
      })
    }

    return sale
  } catch (error) {
    console.error('創建訂單記錄失敗:', error)
    throw new Error(`資料庫記錄失敗：${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 生成銷售單號
 */
async function generateSaleNumber(): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

  // 查詢當日最大序號
  const lastSale = await prisma.sale.findFirst({
    where: {
      sale_number: {
        startsWith: `SO${dateStr}`
      }
    },
    orderBy: {
      sale_number: 'desc'
    }
  })

  let sequence = 1
  if (lastSale) {
    const lastSequence = parseInt(lastSale.sale_number.slice(-3))
    sequence = lastSequence + 1
  }

  return `SO${dateStr}${sequence.toString().padStart(3, '0')}`
}