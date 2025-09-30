import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('檢查資料庫中的所有用戶...\n')
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      is_active: true,
      created_at: true,
    }
  })
  
  if (users.length === 0) {
    console.log('資料庫中沒有任何用戶！')
    console.log('\n可能原因：')
    console.log('1. NextAuth 的 Adapter 設定問題')
    console.log('2. 資料庫連線指向錯誤的資料庫')
    console.log('3. 登入時發生錯誤但沒有顯示')
  } else {
    console.log('找到用戶數量:', users.length)
    console.log('\n用戶列表：')
    users.forEach((user, idx) => {
      console.log('---')
      console.log('Email:', user.email)
      console.log('Name:', user.name)
      console.log('Role:', user.role)
      console.log('Active:', user.is_active)
      console.log('Created:', user.created_at)
    })
  }
}

main()
  .catch((e) => {
    console.error('錯誤:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
