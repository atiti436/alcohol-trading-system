import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'manpan.whisky@gmail.com'
  
  // 直接創建超級管理員
  const user = await prisma.user.create({
    data: {
      email: email,
      name: 'Man Pan',
      role: 'SUPER_ADMIN',
      is_active: true,
    }
  })
  
  console.log('✅ 已直接創建超級管理員帳號！')
  console.log('---')
  console.log('ID:', user.id)
  console.log('Email:', user.email)
  console.log('Name:', user.name)
  console.log('Role:', user.role)
  console.log('Active:', user.is_active)
  console.log('---')
  console.log('🎉 現在可以直接登入了！')
}

main()
  .catch((e) => {
    console.error('錯誤:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
