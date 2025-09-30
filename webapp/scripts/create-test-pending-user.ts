import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 創建測試用的待審核用戶
  const testUser = await prisma.user.create({
    data: {
      email: 'test.pending@example.com',
      name: '測試待審核用戶',
      role: 'PENDING',
      is_active: true,
    }
  })
  
  console.log('✅ 已創建測試待審核用戶！')
  console.log('---')
  console.log('Email:', testUser.email)
  console.log('Name:', testUser.name)
  console.log('Role:', testUser.role, '← 待審核狀態')
  console.log('---')
  console.log('🎯 現在到設定 → 用戶管理應該可以看到這個用戶了！')
}

main()
  .catch((e) => {
    console.error('錯誤:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
