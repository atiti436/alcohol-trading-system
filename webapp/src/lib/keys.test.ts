import crypto from 'crypto'

// We will mock prisma used by '@/lib/keys'
jest.mock('@/lib/prisma', () => {
  return {
    prisma: {
      systemSetting: {
        findUnique: jest.fn()
      }
    }
  }
})

// Helper to get mocked prisma
const getMockPrisma = () => require('@/lib/prisma').prisma as {
  systemSetting: { findUnique: jest.Mock }
}

// Helper: encrypt text the same way as API route (AES-256-GCM with SHA-256 key derivation)
function encryptGCM(text: string, rawKey: string): string {
  const KEY = crypto.createHash('sha256').update(rawKey || 'dev-key').digest()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`
}

describe('getGeminiApiKey', () => {
  const RAW_KEY = 'unit-test-encryption-key-very-strong-32bytes-min'

  beforeEach(() => {
    jest.resetModules()
    // Set encryption key before importing module under test
    process.env.ENCRYPTION_KEY = RAW_KEY
    delete process.env.GEMINI_API_KEY
    delete process.env.GOOGLE_GEMINI_API_KEY

    const prisma = getMockPrisma()
    prisma.systemSetting.findUnique.mockReset()
  })

  test('returns primary DB key when available', async () => {
    const prisma = getMockPrisma()
    const encrypted = encryptGCM('PRIMARY_DB_KEY', RAW_KEY)
    prisma.systemSetting.findUnique.mockImplementation(({ where }: any) => {
      if (where.key === 'gemini_api_key') return Promise.resolve({ value: encrypted })
      if (where.key === 'gemini_api_key_secondary') return Promise.resolve({ value: null })
      return Promise.resolve(null)
    })

    const { getGeminiApiKey } = await import('@/lib/keys')
    await expect(getGeminiApiKey()).resolves.toBe('PRIMARY_DB_KEY')
  })

  test('returns secondary DB key when primary is missing', async () => {
    const prisma = getMockPrisma()
    const encrypted2 = encryptGCM('SECONDARY_DB_KEY', RAW_KEY)
    prisma.systemSetting.findUnique.mockImplementation(({ where }: any) => {
      if (where.key === 'gemini_api_key') return Promise.resolve({ value: null })
      if (where.key === 'gemini_api_key_secondary') return Promise.resolve({ value: encrypted2 })
      return Promise.resolve(null)
    })

    const { getGeminiApiKey } = await import('@/lib/keys')
    await expect(getGeminiApiKey()).resolves.toBe('SECONDARY_DB_KEY')
  })

  test('falls back to GEMINI_API_KEY env when DB empty', async () => {
    const prisma = getMockPrisma()
    prisma.systemSetting.findUnique.mockResolvedValue({ value: null })
    process.env.GEMINI_API_KEY = 'ENV_PRIMARY'

    const { getGeminiApiKey } = await import('@/lib/keys')
    await expect(getGeminiApiKey()).resolves.toBe('ENV_PRIMARY')
  })

  test('falls back to GOOGLE_GEMINI_API_KEY env if primary env missing', async () => {
    const prisma = getMockPrisma()
    prisma.systemSetting.findUnique.mockResolvedValue({ value: null })
    process.env.GOOGLE_GEMINI_API_KEY = 'ENV_LEGACY'

    const { getGeminiApiKey } = await import('@/lib/keys')
    await expect(getGeminiApiKey()).resolves.toBe('ENV_LEGACY')
  })

  test('returns empty string if neither DB nor env provide a key', async () => {
    const prisma = getMockPrisma()
    prisma.systemSetting.findUnique.mockResolvedValue({ value: null })

    const { getGeminiApiKey } = await import('@/lib/keys')
    await expect(getGeminiApiKey()).resolves.toBe('')
  })
})

