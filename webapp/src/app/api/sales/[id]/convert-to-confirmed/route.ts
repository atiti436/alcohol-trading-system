import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { Role } from '@/types/auth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * 💰 預購單轉正式訂單 API
 * 核心功能：將預購單（PREORDER）轉換為正式訂單（CONFIRMED）並預留庫存
 */

// POST /api/sales/[id]/convert-to-confirmed - 預購單轉正式訂單
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    // 只有員工以上可以轉換預購單
    if (session.user.role === Role.INVESTOR) {
      return NextResponse.json({ error: '權限不足，投資方無法轉換預購單' }, { status: 403 })
    }

    const { id } = params

    // 檢查銷售訂單是否存在
    const existingSale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            variant: true
          }
        }
      }
    })

    if (!existingSale) {
      return NextResponse.json({ error: '銷售訂單不存在' }, { status: 404 })
    }

    // 檢查訂單狀態 - 只有預購單可以轉換
    if (existingSale.status !== 'PREORDER') {
      return NextResponse.json(
        { error: `訂單狀態為 ${existingSale.status}，只有預購中的訂單可以轉換為正式訂單` },
        { status: 400 }
      )
    }

    // 檢查訂單是否有商品明細
    if (!existingSale.items || existingSale.items.length === 0) {
      return NextResponse.json(
        { error: '訂單沒有商品明細，無法轉換' },
        { status: 400 }
      )
    }

    // 檢查庫存是否足夠（從 Inventory 表查詢，匯總所有倉庫）
    const chosenVariants: Record<string, string> = {} // sale_item_id -> variant_id
    const stockCheckErrors: string[] = []
    const stockCheckWarnings: string[] = []

    for (const item of existingSale.items) {
      let variantIdToUse = item.variant_id || ''
      let availableStock = 0

      if (!variantIdToUse) {
        // 嘗試找到該商品下可用庫存足夠的變體，優先 A 版
        const variants = await prisma.productVariant.findMany({
          where: { product_id: item.product_id },
          include: {
            inventory: {
              select: {
                available: true
              }
            }
          },
          orderBy: [
            { variant_type: 'asc' }
          ]
        })

        // 計算每個變體的總可用庫存（所有倉庫）
        const variantsWithStock = variants.map(v => ({
          id: v.id,
          variant_type: v.variant_type,
          variant_code: v.variant_code,
          available_stock: v.inventory.reduce((sum, inv) => sum + inv.available, 0)
        }))

        // 先找 A，其次任何足夠庫存者
        const anyEnough = variantsWithStock.find(v => v.available_stock >= item.quantity)
        if (anyEnough) {
          variantIdToUse = anyEnough.id
          availableStock = anyEnough.available_stock
          if (anyEnough.variant_type !== 'A') {
            stockCheckWarnings.push(
              `商品 ${item.product?.name || '未知商品'} 自動選擇變體 ${anyEnough.variant_code || anyEnough.variant_type}`
            )
          }
        } else {
          // 沒有足夠的單一變體，回報錯誤
          const totalAvailable = variantsWithStock.reduce((s, v) => s + v.available_stock, 0)
          availableStock = totalAvailable
        }
      } else {
        // 查詢指定變體的庫存（匯總所有倉庫）
        const inventories = await prisma.inventory.findMany({
          where: { variant_id: variantIdToUse },
          select: { available: true }
        })
        availableStock = inventories.reduce((sum, inv) => sum + inv.available, 0)
      }

      if (availableStock < item.quantity) {
        const productName = item.variant?.variant_code || item.product?.name || '未知商品'
        stockCheckErrors.push(
          `商品 ${productName} 庫存不足，需要 ${item.quantity}，可用 ${availableStock}`
        )
      } else if (!item.variant_id && variantIdToUse) {
        chosenVariants[item.id] = variantIdToUse
      }
    }

    // 如果庫存不足，返回錯誤
    if (stockCheckErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: '庫存不足，無法轉換為正式訂單',
          details: stockCheckErrors,
          warnings: stockCheckWarnings
        },
        { status: 400 }
      )
    }

    // 開始交易：轉換訂單並預留庫存
    const result = await prisma.$transaction(async (tx) => {
      // 1. 更新銷售訂單狀態
      const sale = await tx.sale.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmed_at: new Date(),
          confirmed_by: session.user.id,
          converted_at: new Date(),
          converted_by: session.user.id
        }
      })

      // 2. 預留庫存（從 Inventory 表，優先從公司倉扣除）
      for (const item of existingSale.items) {
        const variantId = item.variant_id || chosenVariants[item.id]
        if (!variantId) {
          throw new Error(`銷售項目 ${item.product?.name || item.product_id} 缺少可用變體`)
        }

        // 查詢該變體的所有倉庫庫存，優先從公司倉扣
        const inventories = await tx.inventory.findMany({
          where: { variant_id: variantId },
          orderBy: [
            { warehouse: 'asc' } // COMPANY 排在 PRIVATE 前面
          ]
        })

        let remainingQty = item.quantity
        for (const inv of inventories) {
          if (remainingQty <= 0) break

          const toReserve = Math.min(remainingQty, inv.available)
          if (toReserve > 0) {
            await tx.inventory.update({
              where: { id: inv.id },
              data: {
                available: { decrement: toReserve },
                reserved: { increment: toReserve }
              }
            })
            remainingQty -= toReserve
          }
        }

        if (remainingQty > 0) {
          throw new Error(`變體 ${variantId} 庫存不足，無法預留`)
        }

        // 更新 sale item 的 variant_id（如果是自動選擇的）
        if (!item.variant_id) {
          await tx.saleItem.update({
            where: { id: item.id },
            data: { variant_id: variantId }
          })
        }
      }

      return { sale, warnings: stockCheckWarnings }
    })

    return NextResponse.json({
      success: true,
      data: result.sale,
      warnings: result.warnings,
      message: '預購單已成功轉換為正式訂單，庫存已預留'
    })

  } catch (error) {
    console.error('預購單轉換失敗:', error)
    return NextResponse.json(
      { error: '轉換失敗', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
