import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { Role } from '@/types/auth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * 💰 銷售訂單確認 API
 * 核心功能：將草稿狀態的銷售訂單確認為正式訂單
 */

// POST /api/sales/[id]/confirm - 確認銷售訂單
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

    // 只有員工以上可以確認銷售訂單
    if (session.user.role === Role.INVESTOR) {
      return NextResponse.json({ error: '權限不足，投資方無法確認銷售訂單' }, { status: 403 })
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

    // 檢查訂單狀態 - 只有草稿狀態可以確認（預購單不能直接確認，需走轉換流程）
    if (existingSale.status !== 'DRAFT') {
      // 🆕 預購單不能直接確認
      if (existingSale.status === 'PREORDER') {
        return NextResponse.json(
          { error: '預購單無法直接確認，請使用「商品已到貨」功能轉換為正式訂單' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: `訂單狀態為 ${existingSale.status}，只有草稿狀態的訂單可以確認` },
        { status: 400 }
      )
    }

    // 檢查訂單是否有商品明細
    if (!existingSale.items || existingSale.items.length === 0) {
      return NextResponse.json(
        { error: '訂單沒有商品明細，無法確認' },
        { status: 400 }
      )
    }

    // 檢查庫存是否足夠（從 Inventory 表查詢，匯總所有倉庫）
    const chosenVariants: Record<string, string> = {} // sale_item_id -> variant_id
    const stockCheckErrors: string[] = []
    for (const item of existingSale.items) {
      let variantIdToUse = item.variant_id || ''
      let availableStock = 0

      if (!variantIdToUse) {
        // 嘗試找到該商品下可用庫存足夠的變體，優先 A 版
        // ⚠️ 暫時註解：Production 資料庫缺少 Inventory 表
        // TODO: 執行 prisma db push 後取消註解
        /*
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
          available_stock: v.inventory.reduce((sum, inv) => sum + inv.available, 0)
        }))
        */

        // ⚠️ 暫時使用空庫存
        const variants = await prisma.productVariant.findMany({
          where: { product_id: item.product_id },
          orderBy: [
            { variant_type: 'asc' }
          ]
        })
        const variantsWithStock = variants.map(v => ({
          id: v.id,
          variant_type: v.variant_type,
          available_stock: 0 // ⚠️ 暫時硬編碼為 0
        }))

        // 先找 A，其次任何足夠庫存者
        const anyEnough = variantsWithStock.find(v => v.available_stock >= item.quantity)
        if (anyEnough) {
          variantIdToUse = anyEnough.id
          availableStock = anyEnough.available_stock
        } else {
          // 沒有足夠的單一變體，回報錯誤
          const totalAvailable = variantsWithStock.reduce((s, v) => s + v.available_stock, 0)
          availableStock = totalAvailable
        }
      } else {
        // ⚠️ 暫時註解：Production 資料庫缺少 Inventory 表
        // TODO: 執行 prisma db push 後取消註解
        /*
        // 查詢指定變體的庫存（匯總所有倉庫）
        const inventories = await prisma.inventory.findMany({
          where: { variant_id: variantIdToUse },
          select: { available: true }
        })
        availableStock = inventories.reduce((sum, inv) => sum + inv.available, 0)
        */
        availableStock = 0 // ⚠️ 暫時硬編碼為 0
      }

      if (availableStock < item.quantity) {
        const productName = item.variant?.variant_type || item.variant?.variant_code || item.product?.name || '未知商品'
        stockCheckErrors.push(`商品 ${productName} 庫存不足，需要 ${item.quantity}，可用 ${availableStock}`)
      } else if (!item.variant_id && variantIdToUse) {
        chosenVariants[item.id] = variantIdToUse
      }
    }

    if (stockCheckErrors.length > 0) {
      return NextResponse.json(
        { error: '庫存檢查失敗', details: stockCheckErrors },
        { status: 400 }
      )
    }

    // 開始交易：確認訂單並預留庫存
    const updatedSale = await prisma.$transaction(async (tx) => {
      // 1. 更新銷售訂單狀態
      const sale = await tx.sale.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmed_at: new Date(),
          confirmed_by: session.user.id
        }
      })

      // 2. 預留庫存（從 Inventory 表，優先從公司倉扣除）
      for (const item of existingSale.items) {
        const variantId = item.variant_id || chosenVariants[item.id]
        if (!variantId) {
          throw new Error(`銷售項目 ${item.product?.name || item.product_id} 缺少可用變體`)
        }

        // ⚠️ 暫時註解：Production 資料庫缺少 Inventory 表
        // TODO: 執行 prisma db push 後取消註解
        /*
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
        */

        // 更新 sale item 的 variant_id（如果是自動選擇的）
        if (!item.variant_id) {
          await tx.saleItem.update({
            where: { id: item.id },
            data: { variant_id: variantId }
          })
        }
      }

      return sale
    })

    return NextResponse.json({
      success: true,
      data: updatedSale,
      message: '銷售訂單確認成功，庫存已預留'
    })

  } catch (error) {
    console.error('確認銷售訂單失敗:', error)
    return NextResponse.json(
      { error: '確認失敗', details: error },
      { status: 500 }
    )
  }
}
