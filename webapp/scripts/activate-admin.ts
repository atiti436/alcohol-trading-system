import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'manpan.whisky@gmail.com'

  // 檢查用戶是否存在
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    // 更新為超級管理員並啟用
    await prisma.user.update({
      where: { email },
      data: {
        role: 'SUPER_ADMIN',
        is_active: true,
      }
    })
    console.log('✅ 已將用戶升級為超級管理員並啟用')
    console.log('📧 Email:', email)
    console.log('👤 Name:', existingUser.name)
    console.log('🔑 Role: SUPER_ADMIN')
    console.log('✅ Status: Active')
  } else {
    console.log('❌ 找不到該用戶，請先使用 Google/GitHub 登入一次')
    console.log('📧 Email:', email)
  }
}

main()
  .catch((e) => {
    console.error('❌ 錯誤:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
