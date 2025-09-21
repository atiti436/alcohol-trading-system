import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { Role } from '@/types/auth'

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

    // 檢查訂單狀態 - 只有草稿狀態可以確認
    if (existingSale.status !== 'DRAFT') {
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

    // 檢查庫存是否足夠
    const stockCheckErrors = []
    for (const item of existingSale.items) {
      let availableStock = 0

      if (item.variant_id) {
        // 檢查變體庫存
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variant_id }
        })
        availableStock = variant?.available_stock || 0
      } else {
        // 檢查商品總庫存
        const product = await prisma.product.findUnique({
          where: { id: item.product_id },
          select: { total_available_stock: true }
        })
        availableStock = product?.total_available_stock || 0
      }

      if (availableStock < item.quantity) {
        const productName = item.variant?.variant_code || item.product?.name || '未知商品'
        stockCheckErrors.push(`商品 ${productName} 庫存不足，需要 ${item.quantity}，可用 ${availableStock}`)
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

      // 2. 預留庫存
      for (const item of existingSale.items) {
        if (item.variant_id) {
          // 預留變體庫存
          await tx.productVariant.update({
            where: { id: item.variant_id },
            data: {
              available_stock: {
                decrement: item.quantity
              },
              reserved_stock: {
                increment: item.quantity
              }
            }
          })
        } else {
          // 預留商品總庫存
          await tx.product.update({
            where: { id: item.product_id },
            data: {
              total_available_stock: {
                decrement: item.quantity
              },
              total_reserved_stock: {
                increment: item.quantity
              }
            }
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