/**
 * 🧪 測試資料種子檔案
 * 建立用於驗證數據隔離的測試帳號和資料
 */

import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function seedTestData() {
  console.log('🌱 開始建立測試資料...')

  try {
    // 1. 建立測試使用者
    await createTestUsers()

    // 2. 建立測試客戶
    await createTestCustomers()

    // 3. 建立測試商品
    await createTestProducts()

    // 4. 建立測試銷售資料 (包含雙重價格)
    await createTestSales()

    console.log('✅ 測試資料建立完成')

  } catch (error) {
    console.error('❌ 測試資料建立失敗:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * 建立測試使用者 (三種角色)
 */
async function createTestUsers() {
  console.log('👥 建立測試使用者...')

  // 超級管理員 (老闆)
  await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      name: '測試老闆',
      role: Role.SUPER_ADMIN,
      is_active: true
    }
  })

  // 投資方
  await prisma.user.upsert({
    where: { email: 'investor@test.com' },
    update: {},
    create: {
      email: 'investor@test.com',
      name: '測試投資方',
      role: Role.INVESTOR,
      investor_id: 'INV_001',
      is_active: true
    }
  })

  // 員工
  await prisma.user.upsert({
    where: { email: 'employee@test.com' },
    update: {},
    create: {
      email: 'employee@test.com',
      name: '測試員工',
      role: Role.EMPLOYEE,
      is_active: true
    }
  })

  console.log('✅ 測試使用者建立完成')
}

/**
 * 建立測試客戶
 */
async function createTestCustomers() {
  console.log('🏢 建立測試客戶...')

  const customers = [
    {
      customer_code: 'C00001',
      name: '測試客戶A',
      email: 'customer-a@test.com',
      paymentTerms: 'MONTHLY' as const,
      tier: 'VIP' as const,
      requiresInvoice: true
    },
    {
      customer_code: 'C00002',
      name: '測試客戶B',
      email: 'customer-b@test.com',
      paymentTerms: 'CASH' as const,
      tier: 'REGULAR' as const,
      requiresInvoice: false
    }
  ]

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { customer_code: customer.customer_code },
      update: {},
      create: customer
    })
  }

  console.log('✅ 測試客戶建立完成')
}

/**
 * 建立測試商品
 */
async function createTestProducts() {
  console.log('🍶 建立測試商品...')

  const products = [
    {
      product_code: 'W001',
      code: 'W001',  // 向後相容性
      name: '山崎18年威士忌',
      category: 'WHISKY' as const,
      volume_ml: 700,
      alc_percentage: 43.0,
      weight: 1.2,
      packageWeight: 0.3,
      totalWeight: 1.5,
      hasBox: true,
      hasAccessories: true,
      accessories: ['證書', '特製木盒'],
      hs_code: '2208.30.30.00',
      supplier: '日本山崎酒廠',
      standard_price: 21000,
      current_price: 21000,
      cost_price: 15000,  // 成本價
      min_price: 18000
    },
    {
      product_code: 'W002',
      code: 'W002',  // 向後相容性
      name: '響21年威士忌',
      category: 'WHISKY' as const,
      volume_ml: 700,
      alc_percentage: 43.0,
      weight: 1.0,
      packageWeight: 0.2,
      totalWeight: 1.2,
      hasBox: true,
      hasAccessories: false,
      accessories: ['證書'],
      hs_code: '2208.30.30.00',
      supplier: '日本響酒廠',
      standard_price: 35000,
      current_price: 35000,
      cost_price: 25000,  // 成本價
      min_price: 30000
    }
  ]

  for (const product of products) {
    await prisma.product.upsert({
      where: { product_code: product.product_code },
      update: {},
      create: product
    })
  }

  console.log('✅ 測試商品建立完成')
}

/**
 * 建立測試銷售資料 (核心：雙重價格機制)
 */
async function createTestSales() {
  console.log('💰 建立測試銷售資料...')

  // 獲取測試資料的ID
  const [admin, customer, product] = await Promise.all([
    prisma.user.findUnique({ where: { email: 'admin@test.com' } }),
    prisma.customer.findUnique({ where: { customer_code: 'C00001' } }),
    prisma.product.findUnique({ where: { product_code: 'W001' } })
  ])

  if (!admin || !customer || !product) {
    throw new Error('測試資料依賴項目不存在')
  }

  // 🔑 投資項目銷售 (雙重價格機制)
  const investmentSale = await prisma.sale.create({
    data: {
      saleNumber: 'SA20250917001',
      customer_id: customer.id,
      total_amount: 20000,        // 🔒 投資方看到的價格
      actual_amount: 24000,       // 🔒 實際收取價格 (僅超級管理員)
      commission: 4000,          // 🔒 老闆傭金 (24000 - 20000)
      fundingSource: 'COMPANY',  // 投資項目
      paymentTerms: 'MONTHLY',
      notes: '測試投資項目銷售 - 雙重價格機制',
      createdBy: admin.id,
      items: {
        create: [
          {
            product_id: product.id,
            quantity: 1,
            unit_price: 20000,        // 顯示單價
            actual_unit_price: 24000,  // 實際單價 (敏感)
            total_price: 20000,       // 顯示總價
            actual_total_price: 24000, // 實際總價 (敏感)
            isPersonalPurchase: false
          }
        ]
      }
    }
  })

  // 🔑 個人調貨銷售 (投資方不能看到)
  const personalSale = await prisma.sale.create({
    data: {
      saleNumber: 'SA20250917002',
      customer_id: customer.id,
      total_amount: 18000,        // 個人調貨沒有雙重價格
      actual_amount: 18000,
      commission: 0,             // 個人調貨沒有傭金
      fundingSource: 'PERSONAL', // 🔒 個人調貨 (投資方看不到)
      paymentTerms: 'CASH',
      notes: '測試個人調貨銷售 - 投資方不可見',
      createdBy: admin.id,
      items: {
        create: [
          {
            product_id: product.id,
            quantity: 1,
            unit_price: 18000,
            actual_unit_price: 18000,
            total_price: 18000,
            actual_total_price: 18000,
            isPersonalPurchase: true
          }
        ]
      }
    }
  })

  // 建立更多測試資料以驗證篩選邏輯
  const response = await prisma.product.findUnique({ where: { product_code: 'W002' } })
  if (response) {
    await prisma.sale.create({
      data: {
        saleNumber: 'SA20250917003',
        customer_id: customer.id,
        total_amount: 32000,        // 顯示價格
        actual_amount: 38000,       // 實際價格
        commission: 6000,          // 傭金
        fundingSource: 'COMPANY',
        paymentTerms: 'WEEKLY',
        notes: '測試投資項目銷售2 - 更高差價',
        createdBy: admin.id,
        items: {
          create: [
            {
              product_id: response.id,
              quantity: 1,
              unit_price: 32000,
              actual_unit_price: 38000,
              total_price: 32000,
              actual_total_price: 38000,
              isPersonalPurchase: false
            }
          ]
        }
      }
    })
  }

  console.log('✅ 測試銷售資料建立完成')
  console.log(`📊 投資項目銷售ID: ${investmentSale.id}`)
  console.log('🔑 雙重價格機制測試資料:')
  console.log('   - 投資方看到: 成本15000 → 銷售20000 → 獲利5000')
  console.log('   - 實際情況: 成本15000 → 實收24000 → 投資方獲利5000 + 老闆傭金4000')
}

/**
 * 清理測試資料
 */
export async function cleanTestData() {
  console.log('🧹 清理測試資料...')

  // 按順序刪除 (避免外鍵約束問題)
  await prisma.saleItem.deleteMany({
    where: {
      sale: {
        saleNumber: {
          startsWith: 'SA20250917'
        }
      }
    }
  })

  await prisma.sale.deleteMany({
    where: {
      saleNumber: {
        startsWith: 'SA20250917'
      }
    }
  })

  await prisma.product.deleteMany({
    where: {
      product_code: {
        in: ['W001', 'W002']
      }
    }
  })

  await prisma.customer.deleteMany({
    where: {
      customer_code: {
        in: ['C00001', 'C00002']
      }
    }
  })

  await prisma.user.deleteMany({
    where: {
      email: {
        endsWith: '@test.com'
      }
    }
  })

  console.log('✅ 測試資料清理完成')
}

/**
 * 驗證數據隔離
 */
export async function verifyDataIsolation() {
  console.log('🔍 驗證數據隔離...')

  // 查詢所有測試銷售資料
  const allSales = await prisma.sale.findMany({
    where: {
      saleNumber: {
        startsWith: 'SA20250917'
      }
    },
    include: {
      items: true
    }
  })

  // 統計資料
  const investmentSales = allSales.filter(sale => sale.fundingSource === 'COMPANY')
  const personalSales = allSales.filter(sale => sale.fundingSource === 'PERSONAL')

  console.log('📊 測試資料統計:')
  console.log(`   總銷售記錄: ${allSales.length}`)
  console.log(`   投資項目: ${investmentSales.length} (投資方可見)`)
  console.log(`   個人調貨: ${personalSales.length} (投資方不可見)`)

  // 檢查雙重價格機制
  const doublePriceSales = investmentSales.filter(sale =>
    sale.actual_amount && sale.actual_amount > sale.total_amount
  )

  console.log(`   雙重價格記錄: ${doublePriceSales.length}`)

  if (doublePriceSales.length > 0) {
    const sale = doublePriceSales[0]
    console.log('🔑 雙重價格驗證:')
    console.log(`   顯示金額: ${sale.total_amount} (投資方看到)`)
    console.log(`   實際金額: ${sale.actual_amount} (僅超級管理員)`)
    console.log(`   老闆傭金: ${sale.commission} (${sale.actual_amount} - ${sale.total_amount})`)
  }

  return {
    totalSales: allSales.length,
    investmentSales: investmentSales.length,
    personalSales: personalSales.length,
    doublePriceSales: doublePriceSales.length
  }
}

// 如果直接執行此文件，則建立測試資料
if (require.main === module) {
  seedTestData()
    .then(() => verifyDataIsolation())
    .catch(console.error)
}