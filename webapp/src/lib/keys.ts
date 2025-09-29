"use server"

import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Derive a 32-byte key from ENCRYPTION_KEY using SHA-256 (must be consistent across encrypt/decrypt)
const RAW_KEY = process.env.ENCRYPTION_KEY || ''
const KEY = crypto.createHash('sha256').update(RAW_KEY || 'dev-key').digest() // 32 bytes

// Decrypt payload stored as base64(iv).base64(tag).base64(cipher) using AES-256-GCM
function decryptGCM(payload: string): string {
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

export async function getGeminiApiKey(): Promise<string> {
  try {
    const [primary, secondary] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: 'gemini_api_key' } }),
      prisma.systemSetting.findUnique({ where: { key: 'gemini_api_key_secondary' } })
    ])
    if (primary?.value) {
      const key = decryptGCM(primary.value)
      if (key) return key
    }
    if (secondary?.value) {
      const key2 = decryptGCM(secondary.value)
      if (key2) return key2
    }
  } catch {
    // ignore and fall back to env
  }
  // ENV fallback: prefer GEMINI_API_KEY; fallback to legacy GOOGLE_GEMINI_API_KEY
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || ''
}
