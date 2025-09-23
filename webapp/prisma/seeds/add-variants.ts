/**
 * 🧪 添加測試變體 - 讓老闆能清楚看到變體差異
 */

import { PrismaClient } from '@prisma/client'

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

    if (!yamazaki || !hibiki) {
      console.log('❌ 商品不存在，請先執行基本種子資料')
      return
    }

    // 為山崎18年創建變體
    console.log('📦 為山崎18年創建變體...')
    const yamazakiVariants = [
      {
        product_id: yamazaki.id,
        variant_code: 'W001-A',
        sku: 'W001-A-700-43',
        variant_type: 'A' as const,
        description: '普通版',
        base_price: 21000,
        current_price: 21000,
        cost_price: 15000,
        stock_quantity: 10,
        condition: '原裝無盒，瓶身完整'
      },
      {
        product_id: yamazaki.id,
        variant_code: 'W001-B',
        sku: 'W001-B-700-43',
        variant_type: 'B' as const,
        description: '禮盒版',
        base_price: 23000,
        current_price: 23000,
        cost_price: 16500,
        stock_quantity: 5,
        condition: '附原廠禮盒，含證書'
      },
      {
        product_id: yamazaki.id,
        variant_code: 'W001-C',
        sku: 'W001-C-700-43',
        variant_type: 'C' as const,
        description: '收藏版',
        base_price: 25000,
        current_price: 25000,
        cost_price: 18000,
        stock_quantity: 3,
        condition: '限量收藏盒，編號證書'
      },
      {
        product_id: yamazaki.id,
        variant_code: 'W001-X',
        sku: 'W001-X-700-43',
        variant_type: 'X' as const,
        description: '損傷品',
        base_price: 18000,
        current_price: 18000,
        cost_price: 15000,
        stock_quantity: 2,
        condition: '外盒破損，酒體完好'
      }
    ]

    for (const variant of yamazakiVariants) {
      await prisma.productVariant.upsert({
        where: { variant_code: variant.variant_code },
        update: {},
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
        variant_type: 'A' as const,
        description: '普通版',
        base_price: 35000,
        current_price: 35000,
        cost_price: 25000,
        stock_quantity: 8,
        condition: '原裝無盒'
      },
      {
        product_id: hibiki.id,
        variant_code: 'W002-B',
        sku: 'W002-B-700-43',
        variant_type: 'B' as const,
        description: '限定版',
        base_price: 40000,
        current_price: 40000,
        cost_price: 28000,
        stock_quantity: 3,
        condition: '年度限定包裝'
      }
    ]

    for (const variant of hibikiVariants) {
      await prisma.productVariant.upsert({
        where: { variant_code: variant.variant_code },
        update: {},
        create: variant
      })
    }

    console.log('✅ 測試變體創建完成')
    console.log('')
    console.log('📋 創建的變體：')
    console.log('山崎18年:')
    console.log('  - W001-A: 普通版 ($21,000)')
    console.log('  - W001-B: 禮盒版 ($23,000)')
    console.log('  - W001-C: 收藏版 ($25,000)')
    console.log('  - W001-X: 損傷品 ($18,000)')
    console.log('響21年:')
    console.log('  - W002-A: 普通版 ($35,000)')
    console.log('  - W002-B: 限定版 ($40,000)')

  } catch (error) {
    console.error('❌ 變體創建失敗:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 直接執行
addTestVariants().catch(console.error)