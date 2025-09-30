import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { AlcoholCategory } from '@prisma/client'
import { DEFAULT_VARIANT_TYPE, generateVariantCode, normalizeVariantType } from '@/lib/variant-utils'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * POST /api/products/quick-add - 快速新增商品 API
 * 專門用於採購單、報價單中快速建立商品
 */

export async function POST(request: NextRequest) {
  try {
    // 權限檢查 - 只有員工以上可以新增商品
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'PENDING') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      category = 'WHISKY',
      volume_ml = 750,
      alc_percentage = 40.0,
      supplier,
      estimated_price,
      notes
    } = body

    // 變體名稱改為選填，若未提供則不創建變體
    let variantType: string | null = null
    if (typeof body.variant_type === 'string' && body.variant_type.trim()) {
      try {
        const normalized = normalizeVariantType(body.variant_type.trim())
        if (normalized) {
          variantType = normalized
        }
      } catch (err) {
        return NextResponse.json(
          { error: (err as Error).message },
          { status: 400 }
        )
      }
    }

    // 基本驗證
    if (!name?.trim()) {
      return NextResponse.json({
        error: '商品名稱為必填欄位'
      }, { status: 400 })
    }

    // 🤖 智能產品資訊推測
    const productInfo = analyzeProductName(name.trim())

    // 生成產品編號
    const productCode = await generateProductCode(productInfo.category, name)

    // 使用 transaction 確保資料一致性
    const result = await prisma.$transaction(async (tx) => {
      // 建立產品
      const basePrice = estimated_price || productInfo.estimated_price || 0
      const product = await tx.product.create({
        data: {
          product_code: productCode,
          name: name.trim(),
          category: productInfo.category as AlcoholCategory,
          volume_ml: productInfo.volume_ml || volume_ml,
          alc_percentage: productInfo.alc_percentage || alc_percentage,
          weight_kg: calculateWeight(productInfo.volume_ml || volume_ml),
          package_weight_kg: 0.5, // 預設包裝重量
          total_weight_kg: calculateWeight(productInfo.volume_ml || volume_ml) + 0.5,
          has_box: productInfo.has_box,
          has_accessories: false,
          supplier: supplier || productInfo.brand || '待確認',

          // 🎯 三層價格架構
          cost_price: 0,                    // 待採購時填入
          investor_price: basePrice * 0.9,  // 預設為估價的90%
          actual_price: basePrice,          // 實際售價
          standard_price: basePrice,        // 標準價
          current_price: basePrice,         // 當前價
          min_price: basePrice * 0.8,       // 預設最低價為標準價的80%

          is_active: true
        }
      })
      // 若有提供變體名稱，建立變體；否則只建立商品
      let variant = null
      if (variantType) {
        // 🎯 使用流水號邏輯（P0001-001）
        const variantCode = `${product.product_code}-001`
        const sku = `SKU-${variantCode}`

        variant = await tx.productVariant.create({
          data: {
            product_id: product.id,
            variant_code: variantCode,
            variant_type: variantType,
            description: productInfo.condition || variantType,

            // 🎯 三層價格架構（繼承 Product）
            cost_price: 0,
            investor_price: product.investor_price,
            actual_price: product.actual_price,
            current_price: product.current_price,

            condition: 'Normal',
            stock_quantity: 0,
            reserved_stock: 0,
            available_stock: 0,
            weight_kg: product.weight_kg,
            warehouse: 'COMPANY',
            sku
          }
        })
      }

      return { product, variant }
    })

    // 📝 記錄快速新增日誌
    console.log(`[QUICK-ADD] 用戶 ${session.user.email} 快速新增商品: ${name} (${productCode})`)

    const responseData: any = {
      success: true,
      message: '商品快速新增成功',
      data: {
        product: {
          id: result.product.id,
          name: result.product.name,
          product_code: result.product.product_code,
          category: result.product.category,
          standard_price: result.product.standard_price,
          supplier: result.product.supplier
        },
        // 🎯 返回用於選擇的格式化資料
        for_selection: {
          id: result.product.id,
          name: result.product.name,
          product_code: result.product.product_code,
          price: result.product.standard_price,
          variant_id: result.variant?.id || null,
          variant_code: result.variant?.variant_code || result.product.product_code,
          display_name: result.variant
            ? `${result.product.name} (${result.variant.variant_code})`
            : result.product.name,
          is_new: true // 標記為新建商品
        }
      }
    }

    // 若有建立變體，加入變體資訊
    if (result.variant) {
      responseData.data.variant = {
        id: result.variant.id,
        variant_code: result.variant.variant_code,
        variant_type: result.variant.variant_type,
        description: result.variant.description,
        current_price: result.variant.current_price
      }
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('快速新增商品失敗:', error)

    // 檢查是否為重複產品編號
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json({
        error: '商品已存在或產品編號重複，請檢查商品名稱'
      }, { status: 409 })
    }

    return NextResponse.json({
      error: '新增失敗，請重試'
    }, { status: 500 })
  }
}

// 🤖 智能產品資訊分析函數
function analyzeProductName(name: string) {
  const nameLower = name.toLowerCase()
  const result = {
    brand: '',
    category: 'OTHER',
    volume_ml: 750,
    alc_percentage: 40.0,
    estimated_price: 0,
    has_box: false,
    condition: '原裝完整'
  }

  // 🏷️ 品牌識別
  const brands = {
    '山崎': { category: 'WHISKY', base_price: 50000 },
    '響': { category: 'WHISKY', base_price: 60000 },
    '白州': { category: 'WHISKY', base_price: 45000 },
    '余市': { category: 'WHISKY', base_price: 35000 },
    '宮城峡': { category: 'WHISKY', base_price: 30000 },
    'macallan': { category: 'WHISKY', base_price: 40000 },
    '麥卡倫': { category: 'WHISKY', base_price: 40000 },
    '格蘭菲迪': { category: 'WHISKY', base_price: 25000 },
    '皇家禮炮': { category: 'WHISKY', base_price: 35000 },
    '獺祭': { category: 'SAKE', base_price: 8000 },
    '十四代': { category: 'SAKE', base_price: 15000 }
  }

  for (const [brand, info] of Object.entries(brands)) {
    if (nameLower.includes(brand.toLowerCase())) {
      result.brand = brand
      result.category = info.category
      result.estimated_price = info.base_price
      break
    }
  }

  // 🍶 容量識別
  const volumeMatch = name.match(/(\d+)(ml|ML)/i)
  if (volumeMatch) {
    result.volume_ml = parseInt(volumeMatch[1])
  } else {
    // 常見容量推測
    if (nameLower.includes('1.8l') || nameLower.includes('一升八合')) {
      result.volume_ml = 1800
    } else if (nameLower.includes('720ml') || nameLower.includes('四合')) {
      result.volume_ml = 720
    } else if (nameLower.includes('500ml')) {
      result.volume_ml = 500
    }
  }

  // 🔢 年份識別 (影響價格)
  const ageMatch = name.match(/(\d+)年/)
  if (ageMatch) {
    const age = parseInt(ageMatch[1])
    // 年份越高，價格倍數越大
    if (age >= 25) result.estimated_price *= 3
    else if (age >= 18) result.estimated_price *= 2
    else if (age >= 12) result.estimated_price *= 1.5
  }

  // 📦 包裝識別
  if (nameLower.includes('禮盒') || nameLower.includes('gift box') || nameLower.includes('特別版')) {
    result.has_box = true
    result.estimated_price *= 1.2 // 禮盒版價格加成20%
  }

  // 🍺 分類識別
  if (nameLower.includes('清酒') || nameLower.includes('sake')) {
    result.category = 'SAKE'
    result.alc_percentage = 15.5
  } else if (nameLower.includes('燒酎') || nameLower.includes('shochu')) {
    result.category = 'SPIRITS'
    result.alc_percentage = 25.0
  } else if (nameLower.includes('葡萄酒') || nameLower.includes('wine')) {
    result.category = 'WINE'
    result.alc_percentage = 13.5
  }

  return result
}

// 🔤 產品編號生成
async function generateProductCode(category: string, name: string): Promise<string> {
  // 分類前綴
  const prefixes: Record<string, string> = {
    'WHISKY': 'WH',
    'SAKE': 'SK',
    'WINE': 'WN',
    'SPIRITS': 'SP',
    'BEER': 'BR',
    'LIQUEUR': 'LQ',
    'OTHER': 'OT'
  }

  const prefix = prefixes[category] || 'OT'

  // 找到該分類下的最大編號
  const lastProduct = await prisma.product.findFirst({
    where: {
      product_code: {
        startsWith: prefix
      }
    },
    orderBy: {
      product_code: 'desc'
    }
  })

  let nextNumber = 1
  if (lastProduct) {
    const lastNumber = parseInt(lastProduct.product_code.slice(2))
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1
    }
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`
}

// ⚖️ 重量計算
function calculateWeight(volume_ml: number): number {
  // 酒精重量約為水的80%，玻璃瓶重量根據容量估算
  const liquidWeight = (volume_ml / 1000) * 0.8 // 公斤
  const bottleWeight = Math.max(0.3, volume_ml / 1000 * 0.6) // 玻璃瓶重量

  return Math.round((liquidWeight + bottleWeight) * 100) / 100 // 四捨五入到小數點後兩位
}