export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

/**
 * 🔔 LINE Bot 通知 API
 * 功能：主動發送通知給指定用戶
 * 使用場景：
 * - 進貨到貨通知
 * - 預購訂單轉換通知
 * - 庫存警報
 * - 缺貨補貨通知
 */

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, message, notificationType } = body

    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      return NextResponse.json({
        success: false,
        error: 'LINE Bot 尚未設定（缺少 Channel Access Token）'
      }, { status: 500 })
    }

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '缺少 userId 參數'
      }, { status: 400 })
    }

    // 根據通知類型建立訊息
    const lineMessage = buildNotificationMessage(notificationType, message)

    // 發送 Push Message
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: userId,
        messages: [lineMessage]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to send LINE notification:', errorText)
      return NextResponse.json({
        success: false,
        error: 'LINE 訊息發送失敗',
        details: errorText
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      message: '通知已發送'
    })

  } catch (error) {
    console.error('LINE notify API error:', error)
    return NextResponse.json({
      success: false,
      error: '發送通知時發生錯誤'
    }, { status: 500 })
  }
}

// 建立通知訊息
function buildNotificationMessage(type: string, data: any) {
  let text = ''

  switch (type) {
    case 'PURCHASE_ARRIVED':
      // 進貨到貨通知
      text = `🚛 進貨到貨通知\n\n` +
        `📦 進貨單號：${data.purchase_number || 'N/A'}\n` +
        `📅 到貨日期：${data.received_date || new Date().toLocaleDateString('zh-TW')}\n` +
        `🍶 商品數量：${data.items_count || 0} 項\n\n` +
        `✅ 已自動轉換預購訂單並更新庫存`
      break

    case 'PREORDER_CONVERTED':
      // 預購訂單轉換通知
      text = `🎉 預購訂單已轉為正式訂單\n\n` +
        `📋 訂單號碼：${data.sale_number || 'N/A'}\n` +
        `👤 客戶：${data.customer_name || 'N/A'}\n` +
        `💰 訂單金額：$${data.total_amount?.toLocaleString() || '0'}\n` +
        `📦 商品：${data.product_name || ''}\n\n` +
        `✅ 已完成分配，可以安排出貨`
      break

    case 'INVENTORY_LOW':
      // 低庫存警報
      text = `⚠️ 低庫存警報\n\n` +
        `🍶 商品：${data.product_name || 'N/A'}\n` +
        `📊 目前庫存：${data.current_stock || 0} 瓶\n` +
        `⚡ 安全庫存：${data.safety_stock || 0} 瓶\n\n` +
        `💡 建議儘快補貨`
      break

    case 'BACKORDER_REFILLED':
      // 缺貨補貨通知
      text = `📦 缺貨商品已補貨\n\n` +
        `🍶 商品：${data.product_name || 'N/A'}\n` +
        `📦 補貨數量：${data.refilled_quantity || 0} 瓶\n` +
        `📋 影響訂單：${data.affected_orders || 0} 筆\n\n` +
        `✅ 已自動分配給缺貨訂單`
      break

    case 'PARTIAL_FULFILLMENT':
      // 部分滿足通知
      text = `📦 訂單部分出貨通知\n\n` +
        `📋 訂單號碼：${data.sale_number || 'N/A'}\n` +
        `👤 客戶：${data.customer_name || 'N/A'}\n` +
        `✅ 已出貨：${data.fulfilled_items || ''}\n` +
        `⏳ 缺貨中：${data.backorder_items || ''}\n\n` +
        `💡 缺貨商品將於到貨後優先補發`
      break

    case 'CUSTOM':
      // 自訂訊息
      text = data.message || '通知訊息'
      break

    default:
      text = `🔔 系統通知\n\n${JSON.stringify(data, null, 2)}`
  }

  return {
    type: 'text',
    text
  }
}

// GET - 取得通知設定
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      enabled: !!LINE_CHANNEL_ACCESS_TOKEN,
      supportedTypes: [
        'PURCHASE_ARRIVED',
        'PREORDER_CONVERTED',
        'INVENTORY_LOW',
        'BACKORDER_REFILLED',
        'PARTIAL_FULFILLMENT',
        'CUSTOM'
      ]
    }
  })
}
