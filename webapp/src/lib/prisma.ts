import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

// 在開發環境中避免熱更新時重複建立多個Prisma實例
export const prisma =
  globalThis.prisma ||
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma