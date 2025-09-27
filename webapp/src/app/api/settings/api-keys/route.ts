import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'
import { logSensitiveAccess } from '@/lib/audit-log'
import crypto from 'crypto'

const RAW_KEY = process.env.ENCRYPTION_KEY || ''
const KEY = crypto.createHash('sha256').update(RAW_KEY || 'dev-key').digest() // 32 bytes

function requireKey() {
  if (process.env.NODE_ENV === 'production') {
    if (!RAW_KEY || RAW_KEY.length < 32) {
      throw new Error('ENCRYPTION_KEY missing or too short (>=32 chars recommended)')
    }
  }
}

// AES-256-GCM with random IV; store as base64(iv).base64(tag).base64(cipher)
function encrypt(text: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`
}

function decrypt(payload: string): string {
  try {
    const [ivB64, tagB64, dataB64] = (payload || '').split('.')
    if (!ivB64 || !tagB64 || !dataB64) return ''
    const iv = Buffer.from(ivB64, 'base64')
    const tag = Buffer.from(tagB64, 'base64')
    const data = Buffer.from(dataB64, 'base64')
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv)
    decipher.setAuthTag(tag)
    const dec = Buffer.concat([decipher.update(data), decipher.final()])
    return dec.toString('utf8')
  } catch {
    return ''
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未登入' }, { status: 401 })
    }

    const setting = await prisma.systemSetting.findUnique({ where: { key: 'gemini_api_key' } })
    const configured = !!setting?.value || !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_GEMINI_API_KEY

    return NextResponse.json({ success: true, data: { geminiApiKey: '', configured } })
  } catch (error) {
    console.error('讀取API Keys失敗:', error)
    return NextResponse.json({ success: false, error: '讀取設定失敗' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未登入' }, { status: 401 })
    }
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: '權限不足' }, { status: 403 })
    }

    requireKey()

    const body = await request.json()
    const { geminiApiKey } = body || {}
    if (!geminiApiKey || typeof geminiApiKey !== 'string') {
      return NextResponse.json({ success: false, error: 'API Key 不能為空' }, { status: 400 })
    }

    const encryptedKey = encrypt(geminiApiKey)
    await prisma.systemSetting.upsert({
      where: { key: 'gemini_api_key' },
      update: { value: encryptedKey, updated_at: new Date() },
      create: { key: 'gemini_api_key', value: encryptedKey, description: 'Google Gemini Vision API Key' }
    })

    // 審計日誌（不含明文）
    try {
      await logSensitiveAccess({
        userId: session.user.id,
        userEmail: session.user.email || '',
        userRole: session.user.role as any,
        action: 'WRITE',
        resourceType: 'SETTINGS',
        sensitiveFields: ['gemini_api_key']
      })
    } catch {}

    return NextResponse.json({ success: true, message: 'API Key 已更新並儲存' })
  } catch (error) {
    console.error('保存API Key失敗:', error)
    return NextResponse.json({ success: false, error: '保存失敗' }, { status: 500 })
  }
}
