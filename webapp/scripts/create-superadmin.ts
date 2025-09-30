import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'manpan.whisky@gmail.com'
  const hashedPassword = await bcrypt.hash('temp123456', 10) // 臨時密碼

  // 檢查用戶是否存在
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    // 更新為超級管理員
    await prisma.user.update({
      where: { email },
      data: {
        role: 'SUPER_ADMIN',
        isActive: true,
      }
    })
    console.log('✅ 已將用戶升級為超級管理員並啟用')
  } else {
    // 創建新的超級管理員
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
      }
    })
    console.log('✅ 已創建超級管理員帳號')
    console.log('📧 Email:', email)
    console.log('🔑 臨時密碼: temp123456')
    console.log('⚠️  請登入後立即修改密碼')
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
