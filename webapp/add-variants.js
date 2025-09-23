/**
 * 🧪 添加測試變體 - 讓老闆能清楚看到變體差異
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function addTestVariants() {
  console.log('🎯 添加測試變體...')

  try {
    // 獲取現有商品
    const yamazaki = await prisma.product.findUnique({
      where: { product_code: 'W001' }
    })

    const hibiki = await prisma.product.findUnique({
      where: { product_code: 'W002' }
    })

    if (!yamazaki) {
      console.log('❌ 山崎商品不存在，請先執行基本種子資料')
      return
    }

    if (!hibiki) {
      console.log('❌ 響商品不存在，請先執行基本種子資料')
      return
    }

    // 為山崎18年創建變體
    console.log('📦 為山崎18年創建變體...')
    const yamazakiVariants = [
      {
        product_id: yamazaki.id,
        variant_code: 'W001-A',
        sku: 'W001-A-700-43',
        variant_type: 'A',
        description: '普通版',
        base_price: 21000,
        current_price: 21000,
        cost_price: 15000,
        stock_quantity: 10,
        reserved_stock: 0,
        available_stock: 10,
        condition: '原裝無盒，瓶身完整'
      },
      {
        product_id: yamazaki.id,
        variant_code: 'W001-B',
        sku: 'W001-B-700-43',
        variant_type: 'B',
        description: '禮盒版',
        base_price: 23000,
        current_price: 23000,
        cost_price: 16500,
        stock_quantity: 5,
        reserved_stock: 0,
        available_stock: 5,
        condition: '附原廠禮盒，含證書'
      },
      {
        product_id: yamazaki.id,
        variant_code: 'W001-C',
        sku: 'W001-C-700-43',
        variant_type: 'C',
        description: '收藏版',
        base_price: 25000,
        current_price: 25000,
        cost_price: 18000,
        stock_quantity: 3,
        reserved_stock: 0,
        available_stock: 3,
        condition: '限量收藏盒，編號證書'
      },
      {
        product_id: yamazaki.id,
        variant_code: 'W001-X',
        sku: 'W001-X-700-43',
        variant_type: 'X',
        description: '損傷品',
        base_price: 18000,
        current_price: 18000,
        cost_price: 15000,
        stock_quantity: 2,
        reserved_stock: 0,
        available_stock: 2,
        condition: '外盒破損，酒體完好'
      }
    ]

    for (const variant of yamazakiVariants) {
      await prisma.productVariant.upsert({
        where: { variant_code: variant.variant_code },
        update: variant,
        create: variant
      })
    }

    // 為響21年創建變體
    console.log('📦 為響21年創建變體...')
    const hibikiVariants = [
      {
        product_id: hibiki.id,
        variant_code: 'W002-A',
        sku: 'W002-A-700-43',
        variant_type: 'A',
        description: '普通版',
        base_price: 35000,
        current_price: 35000,
        cost_price: 25000,
        stock_quantity: 8,
        reserved_stock: 0,
        available_stock: 8,
        condition: '原裝無盒，完整包裝'
      },
      {
        product_id: hibiki.id,
        variant_code: 'W002-B',
        sku: 'W002-B-700-43',
        variant_type: 'B',
        description: '限定版',
        base_price: 40000,
        current_price: 40000,
        cost_price: 28000,
        stock_quantity: 3,
        reserved_stock: 0,
        available_stock: 3,
        condition: '年度限定包裝，特製盒'
      }
    ]

    for (const variant of hibikiVariants) {
      await prisma.productVariant.upsert({
        where: { variant_code: variant.variant_code },
        update: variant,
        create: variant
      })
    }

    console.log('✅ 測試變體創建完成')
    console.log('')
    console.log('📋 創建的變體：')
    console.log('山崎18年:')
    console.log('  - W001-A: 普通版 (庫存: 10瓶, $21,000)')
    console.log('  - W001-B: 禮盒版 (庫存: 5瓶, $23,000)')
    console.log('  - W001-C: 收藏版 (庫存: 3瓶, $25,000)')
    console.log('  - W001-X: 損傷品 (庫存: 2瓶, $18,000)')
    console.log('響21年:')
    console.log('  - W002-A: 普通版 (庫存: 8瓶, $35,000)')
    console.log('  - W002-B: 限定版 (庫存: 3瓶, $40,000)')
    console.log('')
    console.log('🎯 現在你可以在銷售頁面測試變體選擇了！')

  } catch (error) {
    console.error('❌ 變體創建失敗:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 直接執行
addTestVariants().catch(console.error)