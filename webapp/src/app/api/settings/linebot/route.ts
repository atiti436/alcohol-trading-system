import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types/auth'

/**
 * GET /api/settings/linebot - 取得 LINE Bot 設定
 * POST /api/settings/linebot - 儲存 LINE Bot 設定
 * 🔒 僅 SUPER_ADMIN 可存取
 */

// GET - 取得 LINE Bot 設定
export async function GET(request: NextRequest) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    // 取得 LINE Bot 設定
    const [channelAccessToken, channelSecret, webhookUrl] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: 'LINE_CHANNEL_ACCESS_TOKEN' } }),
      prisma.systemSetting.findUnique({ where: { key: 'LINE_CHANNEL_SECRET' } }),
      prisma.systemSetting.findUnique({ where: { key: 'LINE_WEBHOOK_URL' } })
    ])

    // 只返回設定是否存在，不返回實際的敏感值
    return NextResponse.json({
      success: true,
      data: {
        channelAccessToken: channelAccessToken?.value ? '***已設定***' : '',
        channelSecret: channelSecret?.value ? '***已設定***' : '',
        webhookUrl: webhookUrl?.value || `${process.env.NEXTAUTH_URL}/api/linebot/webhook`
      }
    })

  } catch (error) {
    console.error('取得 LINE Bot 設定失敗:', error)
    return NextResponse.json({ error: '取得設定失敗' }, { status: 500 })
  }
}

// POST - 儲存 LINE Bot 設定
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
        error: '請提供完整的 Channel Access Token 和 Channel Secret'
      }, { status: 400 })
    }

    // 基本格式驗證
    if (channelAccessToken.length < 50) {
      return NextResponse.json({
        error: 'Channel Access Token 格式不正確'
      }, { status: 400 })
    }

    if (channelSecret.length !== 32) {
      return NextResponse.json({
        error: 'Channel Secret 必須為 32 字符'
      }, { status: 400 })
    }

    // 儲存設定到資料庫
    await prisma.$transaction(async (tx) => {
      // 儲存或更新 Channel Access Token
      await tx.systemSetting.upsert({
        where: { key: 'LINE_CHANNEL_ACCESS_TOKEN' },
        update: {
          value: channelAccessToken.trim(),
          description: 'LINE Messaging API Channel Access Token'
        },
        create: {
          key: 'LINE_CHANNEL_ACCESS_TOKEN',
          value: channelAccessToken.trim(),
          description: 'LINE Messaging API Channel Access Token'
        }
      })

      // 儲存或更新 Channel Secret
      await tx.systemSetting.upsert({
        where: { key: 'LINE_CHANNEL_SECRET' },
        update: {
          value: channelSecret.trim(),
          description: 'LINE Messaging API Channel Secret'
        },
        create: {
          key: 'LINE_CHANNEL_SECRET',
          value: channelSecret.trim(),
          description: 'LINE Messaging API Channel Secret'
        }
      })

      // 儲存或更新 Webhook URL
      const finalWebhookUrl = webhookUrl?.trim() || `${process.env.NEXTAUTH_URL}/api/linebot/webhook`
      await tx.systemSetting.upsert({
        where: { key: 'LINE_WEBHOOK_URL' },
        update: {
          value: finalWebhookUrl,
          description: 'LINE Bot Webhook URL'
        },
        create: {
          key: 'LINE_WEBHOOK_URL',
          value: finalWebhookUrl,
          description: 'LINE Bot Webhook URL'
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'LINE Bot 設定已成功儲存'
    })

  } catch (error) {
    console.error('儲存 LINE Bot 設定失敗:', error)
    return NextResponse.json({ error: '儲存失敗' }, { status: 500 })
  }
}