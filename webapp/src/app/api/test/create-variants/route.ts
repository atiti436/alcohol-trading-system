import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  // 安全保護：僅在開發環境啟用，避免誤上線
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This test endpoint is disabled outside development.' },
      { status: 404 }
    )
  }
  try {
    console.log('🎯 開始創建測試變體...')

    // 獲取山崎和響的產品ID
    const yamazaki = await prisma.product.findUnique({
      where: { product_code: 'W001' }
    })

    const hibiki = await prisma.product.findUnique({
      where: { product_code: 'W002' }
    })

    if (!yamazaki) {
      return NextResponse.json({ error: '山崎商品不存在' }, { status: 404 })
    }

    if (!hibiki) {
      return NextResponse.json({ error: '響商品不存在' }, { status: 404 })
    }

    // 創建山崎18年變體
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
        reserved_stock: 0,
        available_stock: 10,
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
        reserved_stock: 0,
        available_stock: 5,
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
        reserved_stock: 0,
        available_stock: 3,
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
        reserved_stock: 0,
        available_stock: 2,
        condition: '外盒破損，酒體完好'
      }
    ]

    // 創建響21年變體
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
        reserved_stock: 0,
        available_stock: 8,
        condition: '原裝無盒，完整包裝'
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
        reserved_stock: 0,
        available_stock: 3,
        condition: '年度限定包裝，特製盒'
      }
    ]

    const allVariants = [...yamazakiVariants, ...hibikiVariants]
    const createdVariants = []

    // 創建所有變體
    for (const variant of allVariants) {
      const created = await prisma.productVariant.upsert({
        where: { variant_code: variant.variant_code },
        update: variant,
        create: variant
      })
      createdVariants.push(created)
    }

    console.log('✅ 測試變體創建完成')

    return NextResponse.json({
      success: true,
      message: '測試變體創建成功',
      created_count: createdVariants.length,
      variants: {
        yamazaki: yamazakiVariants.map(v => ({ code: v.variant_code, description: v.description, price: v.current_price })),
        hibiki: hibikiVariants.map(v => ({ code: v.variant_code, description: v.description, price: v.current_price }))
      }
    })

  } catch (error) {
    console.error('❌ 創建變體失敗:', error)
    return NextResponse.json(
      { error: '創建變體失敗', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
