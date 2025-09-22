'use server'

import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-please-change-in-production'

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

export async function getGeminiApiKey(): Promise<string> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'gemini_api_key' } })
    if (setting?.value) {
      const key = decrypt(setting.value)
      if (key) return key
    }
  } catch {
    // ignore and fall back to env
  }
  return process.env.GOOGLE_GEMINI_API_KEY || ''
}

