import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * POST /api/imports-v2/from-purchase
 * 從採購單創建新版進貨單（Import）
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未授權' }, { status: 401 })
    }

    const body = await request.json()
    const { purchaseId } = body

    if (!purchaseId) {
      return NextResponse.json(
        { success: false, error: '缺少採購單ID' },
        { status: 400 }
      )
    }

    // 查詢採購單（包含完整的 variant_id 資訊）
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        items: {
          include: {
            variant: true,  // ✅ 關鍵：取得 variant 資訊
            product: true
          }
        }
      }
    })

    if (!purchase) {
      return NextResponse.json(
        { success: false, error: '採購單不存在' },
        { status: 404 }
      )
    }

    if (purchase.status !== 'CONFIRMED' && purchase.status !== 'RECEIVED') {
      return NextResponse.json(
        { success: false, error: '只能從已確認的採購單創建進貨記錄' },
        { status: 400 }
      )
    }

    // 檢查是否已經創建過進貨記錄
    const existingImport = await prisma.import.findFirst({
      where: { purchase_id: purchaseId }
    })

    if (existingImport) {
      return NextResponse.json(
        { success: false, error: '此採購單已創建進貨記錄' },
        { status: 400 }
      )
    }

    // 驗證所有採購項目都有 variant_id
    const missingVariants = purchase.items.filter(item => !item.variant_id)
    if (missingVariants.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `以下採購項目缺少商品變體：${missingVariants.map(i => i.product_name).join(', ')}`
        },
        { status: 400 }
      )
    }

    // 生成進貨單號
    const now = new Date()
    const importNumber = await generateImportNumber()

    // 決定倉庫類型和進貨類型
    const warehouse = purchase.funding_source === 'PRIVATE' ? 'PRIVATE' : 'COMPANY'
    const importType = purchase.funding_source === 'PRIVATE' ? 'PRIVATE' : 'COMPANY'

    // 創建進貨記錄（使用事務）
    const importRecord = await prisma.$transaction(async (tx) => {
      // 創建 Import 主記錄
      const newImport = await tx.import.create({
        data: {
          import_number: importNumber,
          purchase_id: purchase.id,
          purchase_number: purchase.purchase_number,
          import_type: importType,
          warehouse: warehouse,
          supplier: purchase.supplier,
          currency: purchase.currency,
          exchange_rate: purchase.exchange_rate,
          goods_total: purchase.total_amount,
          status: 'PENDING',
          created_by: session.user.id,
          items: {
            create: purchase.items.map(item => {
              if (!item.variant_id || !item.variant) {
                throw new Error(`採購項目 ${item.product_name} 缺少變體資訊`)
              }

              return {
                variant_id: item.variant_id,  // ✅ 保存 variant_id
                variant_code: item.variant.variant_code,
                product_name: item.product_name,
                ordered_quantity: item.quantity,
                received_quantity: 0,  // 尚未收貨
                damaged_quantity: 0,
                unit_price: item.unit_price,
                subtotal: item.total_price,
                tariff_rate: item.import_duty_rate,
                tariff_amount: 0  // 稍後計算
              }
            })
          }
        },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true
                }
              }
            }
          }
        }
      })

      return newImport
    })

    return NextResponse.json({
      success: true,
      data: importRecord,
      message: '進貨記錄已創建'
    })

  } catch (error) {
    console.error('從採購單創建進貨記錄失敗:', error)
    return NextResponse.json(
      { success: false, error: '創建進貨記錄失敗', details: error instanceof Error ? error.message : '未知錯誤' },
      { status: 500 }
    )
  }
}

/**
 * 生成進貨單號 - 格式：IMP-YYYYMMDD-XXX
 */
async function generateImportNumber(): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

  // 查找今天最後一個進貨單號
  const lastImport = await prisma.import.findFirst({
    where: {
      import_number: {
        startsWith: `IMP-${dateStr}-`
      }
    },
    orderBy: {
      import_number: 'desc'
    }
  })

  let sequence = 1
  if (lastImport?.import_number) {
    const lastSequence = lastImport.import_number.split('-')[2]
    sequence = parseInt(lastSequence) + 1
  }

  return `IMP-${dateStr}-${sequence.toString().padStart(3, '0')}`
}
