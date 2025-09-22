import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-please-change-in-production'

// 加密函數
function encrypt(text: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

// 解密函數
function decrypt(text: string): string {
  try {
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY)
    let decrypted = decipher.update(text, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    return ''
  }
}

// 獲取API Keys
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未授權' }, { status: 401 })
    }

    // 查詢設定
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['gemini_api_key']
        }
      }
    })

    const result = {
      geminiApiKey: ''
    }

    settings.forEach(setting => {
      if (setting.key === 'gemini_api_key' && setting.value) {
        result.geminiApiKey = decrypt(setting.value)
      }
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('獲取API Keys失敗:', error)
    return NextResponse.json(
      { success: false, error: '獲取設定失敗' },
      { status: 500 }
    )
  }
}

// 保存API Keys
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未授權' }, { status: 401 })
    }

    // 檢查權限（只有超級管理員可以設定）
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: '權限不足' }, { status: 403 })
    }

    const body = await request.json()
    const { geminiApiKey } = body

    if (!geminiApiKey || typeof geminiApiKey !== 'string') {
      return NextResponse.json(
        { success: false, error: 'API Key 不能為空' },
        { status: 400 }
      )
    }

    // 加密並保存
    const encryptedKey = encrypt(geminiApiKey)

    await prisma.systemSetting.upsert({
      where: { key: 'gemini_api_key' },
      update: {
        value: encryptedKey,
        updated_at: new Date()
      },
      create: {
        key: 'gemini_api_key',
        value: encryptedKey,
        description: 'Google Gemini Vision API Key'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'API Key 已成功保存'
    })

  } catch (error) {
    console.error('保存API Key失敗:', error)
    return NextResponse.json(
      { success: false, error: '保存失敗' },
      { status: 500 }
    )
  }
}