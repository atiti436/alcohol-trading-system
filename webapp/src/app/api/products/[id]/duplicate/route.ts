import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { Role } from '@/types/auth'
import { AlcoholCategory } from '@prisma/client'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * POST /api/products/[id]/duplicate - 複製商品
 * 複製商品及其所有變體，產品編號重新生成，庫存歸零
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 權限檢查 - 只有SUPER_ADMIN和EMPLOYEE可以複製商品
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    if (session.user.role === Role.PENDING) {
      return NextResponse.json({
        error: '帳戶待審核中，暫無權限複製商品'
      }, { status: 403 })
    }

    if (session.user.role === Role.INVESTOR) {
      return NextResponse.json({ error: '投資方無權複製商品' }, { status: 403 })
    }

    // 獲取原商品資料（包含所有變體）
    const originalProduct = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        variants: true
      }
    })

    if (!originalProduct) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 })
    }

    // 生成新的產品編號
    const newProductCode = await generateProductCode()

    // 複製商品（使用 transaction 確保原子性）
    const duplicatedProduct = await prisma.$transaction(async (tx) => {
      // 1. 建立新商品
      const newProduct = await tx.product.create({
        data: {
          product_code: newProductCode,
          name: `${originalProduct.name} (副本)`,
          category: originalProduct.category,
          supplier: originalProduct.supplier,
          volume_ml: originalProduct.volume_ml,
          alc_percentage: originalProduct.alc_percentage,
          weight_kg: originalProduct.weight_kg,
          package_weight_kg: originalProduct.package_weight_kg,
          total_weight_kg: originalProduct.total_weight_kg,
          has_box: originalProduct.has_box,
          has_accessories: originalProduct.has_accessories,
          accessory_weight_kg: originalProduct.accessory_weight_kg,
          accessories: originalProduct.accessories,
          hs_code: originalProduct.hs_code,
          manufacturing_date: originalProduct.manufacturing_date,
          expiry_date: originalProduct.expiry_date,
          cost_price: originalProduct.cost_price,
          standard_price: originalProduct.standard_price,
          current_price: originalProduct.current_price,
          min_price: originalProduct.min_price,
          description: originalProduct.description,
          is_active: true
        }
      })

      // 2. 複製所有變體（庫存歸零）
      if (originalProduct.variants && originalProduct.variants.length > 0) {
        const variantsData = originalProduct.variants.map((variant) => {
          // 為新商品生成新的變體代碼
          const newVariantCode = `${newProductCode}-${variant.variant_type}-${variant.label}`.toUpperCase()
          const newSKU = variant.sku ? `${newProductCode}-${variant.sku.split('-').slice(1).join('-')}` : newVariantCode

          return {
            product_id: newProduct.id,
            variant_type: variant.variant_type,
            label: variant.label || '',
            variant_code: newVariantCode,
            sku: newSKU,
            stock_quantity: 0, // 庫存歸零
            cost_price: variant.cost_price,
            price: variant.price
          }
        })

        await tx.productVariant.createMany({
          data: variantsData
        })
      }

      // 返回新建立的商品（包含變體）
      return tx.product.findUnique({
        where: { id: newProduct.id },
        include: {
          variants: true
        }
      })
    })

    return NextResponse.json({
      success: true,
      data: duplicatedProduct,
      message: '商品複製成功'
    })

  } catch (error) {
    console.error('商品複製失敗:', error)
    return NextResponse.json(
      {
        error: '複製失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
}

/**
 * 生成產品編號（格式：P + 6位數字）
 */
async function generateProductCode(): Promise<string> {
  const latestProduct = await prisma.product.findFirst({
    where: {
      product_code: { startsWith: 'P' }
    },
    orderBy: { created_at: 'desc' }
  })

  if (latestProduct?.product_code) {
    const match = latestProduct.product_code.match(/^P(\d+)/)
    if (match) {
      const nextNumber = parseInt(match[1], 10) + 1
      return `P${nextNumber.toString().padStart(6, '0')}`
    }
  }

  // 從 P000001 開始
  return 'P000001'
}