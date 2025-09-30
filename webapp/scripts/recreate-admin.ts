import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'manpan.whisky@gmail.com'

  console.log('🔍 檢查現有管理員帳號...\n')

  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    console.log('找到現有帳號：')
    console.log('---')
    console.log('ID:', existingUser.id)
    console.log('Email:', existingUser.email)
    console.log('Name:', existingUser.name)
    console.log('Image:', existingUser.image || '(無頭像)')
    console.log('Role:', existingUser.role)
    console.log('---\n')

    // 檢查是否有相關記錄
    const [
      accountingEntries,
      accountsReceivable,
      paymentRecords,
      accountsPayable,
      supplierPayments,
      purchases,
      quotations,
      sales,
      cashflowRecords
    ] = await Promise.all([
      prisma.accountingEntry.count({ where: { created_by: existingUser.id } }),
      prisma.accountsReceivable.count({ where: { created_by: existingUser.id } }),
      prisma.paymentRecord.count({ where: { created_by: existingUser.id } }),
      prisma.accountsPayable.count({ where: { created_by: existingUser.id } }),
      prisma.supplierPayment.count({ where: { created_by: existingUser.id } }),
      prisma.purchase.count({ where: { created_by: existingUser.id } }),
      prisma.quotation.count({ where: { quoted_by: existingUser.id } }),
      prisma.sale.count({ where: { created_by: existingUser.id } }),
      prisma.cashFlowRecord.count({ where: { created_by: existingUser.id } })
    ])

    const totalRecords =
      accountingEntries +
      accountsReceivable +
      paymentRecords +
      accountsPayable +
      supplierPayments +
      purchases +
      quotations +
      sales +
      cashflowRecords

    console.log('📊 相關業務記錄統計：')
    console.log('- 會計分錄:', accountingEntries)
    console.log('- 應收帳款:', accountsReceivable)
    console.log('- 收款記錄:', paymentRecords)
    console.log('- 應付帳款:', accountsPayable)
    console.log('- 付款記錄:', supplierPayments)
    console.log('- 採購單:', purchases)
    console.log('- 報價單:', quotations)
    console.log('- 銷售單:', sales)
    console.log('- 現金流記錄:', cashflowRecords)
    console.log('總計:', totalRecords, '筆記錄\n')

    if (totalRecords > 0) {
      console.log('⚠️  警告：此帳號有 ' + totalRecords + ' 筆業務記錄')
      console.log('❌ 無法刪除！建議手動更新個人資料。\n')
      console.log('🔧 如果您確定要重建帳號，請先手動處理或轉移這些記錄。')
    } else {
      console.log('✅ 此帳號沒有業務記錄，可以安全刪除並重建。\n')
      console.log('🗑️  刪除現有帳號...')

      await prisma.user.delete({
        where: { email }
      })

      console.log('✅ 已刪除舊帳號！\n')
      console.log('📝 接下來請執行以下步驟：')
      console.log('1. 登出目前的帳號')
      console.log('2. 使用 Google 登入（manpan.whisky@gmail.com）')
      console.log('3. 系統會自動建立新帳號，並同步 Google 個人資料（頭像、名稱等）')
      console.log('4. 因為您在管理員白名單中，會自動獲得 SUPER_ADMIN 角色')
    }
  } else {
    console.log('❌ 找不到該帳號：', email)
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