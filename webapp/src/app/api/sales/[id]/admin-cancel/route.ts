import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * 🧯 Admin 取消銷售單（含庫存還原）
 * 只給已登入使用者使用（建議 SUPER_ADMIN），用於 Demo 或誤觸快速回復。
 *
 * POST /api/sales/[id]/admin-cancel?delete=true  // 取消並刪除
 * POST /api/sales/[id]/admin-cancel              // 只取消，狀態改為 CANCELLED
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const { id } = params
    const { searchParams } = new URL(request.url)
    const shouldDelete = searchParams.get('delete') === 'true'

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
        accounts_receivables: true,
        shipping_orders: true
      }
    })

    if (!sale) {
      return NextResponse.json({ error: '銷售訂單不存在' }, { status: 404 })
    }

    // 若已出貨（未實作完整退貨流程），暫時不允許直接取消
    if (sale.status === 'SHIPPED' || sale.status === 'DELIVERED') {
      return NextResponse.json({ error: '訂單已出貨，暫不支援直接取消，請先處理退貨' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      // 若已預留庫存（CONFIRMED），歸還 reserved -> available
      if (sale.status === 'CONFIRMED') {
        for (const item of sale.items) {
          if (item.variant_id) {
            // 1. 更新 ProductVariant（保持兼容性，未來可移除）
            await tx.productVariant.update({
              where: { id: item.variant_id },
              data: {
                reserved_stock: { decrement: item.quantity },
                available_stock: { increment: item.quantity }
              }
            })

            // 2. 更新 Inventory 表（主要庫存來源）- FIFO 回滾
            // ⚠️ 暫時註解：Production 資料庫缺少 Inventory 表
            // TODO: 執行 prisma db push 後取消註解
            /*
            let remainingToRelease = item.quantity
            const inventories = await tx.inventory.findMany({
              where: {
                variant_id: item.variant_id,
                reserved: { gt: 0 }
              },
              orderBy: { created_at: 'asc' } // FIFO
            })

            for (const inv of inventories) {
              if (remainingToRelease <= 0) break

              const toRelease = Math.min(inv.reserved, remainingToRelease)
              await tx.inventory.update({
                where: { id: inv.id },
                data: {
                  reserved: { decrement: toRelease },
                  available: { increment: toRelease }
                }
              })

              remainingToRelease -= toRelease
            }
            */
          }
        }
      }

      // 🔒 刪除或取消關聯資料
      if (shouldDelete) {
        // 1. 刪除應收帳款（如果存在）
        if (sale.accounts_receivables && sale.accounts_receivables.length > 0) {
          await tx.accountsReceivable.deleteMany({ where: { sale_id: id } })
        }

        // 2. 刪除所有出貨單（無論狀態，因為銷售單要刪除了）
        if (sale.shipping_orders && sale.shipping_orders.length > 0) {
          await tx.shippingOrder.deleteMany({ where: { sale_id: id } })
        }

        // 3. 刪除銷售項目
        await tx.saleItem.deleteMany({ where: { sale_id: id } })

        // 4. 最後刪除銷售單
        await tx.sale.delete({ where: { id } })
      } else {
        // 只取消：同時取消所有出貨單
        if (sale.shipping_orders && sale.shipping_orders.length > 0) {
          await tx.shippingOrder.updateMany({
            where: { sale_id: id },
            data: { status: 'CANCELLED' }
          })
        }

        await tx.sale.update({
          where: { id },
          data: { status: 'CANCELLED' }
        })
      }
    })

    return NextResponse.json({ success: true, message: shouldDelete ? '已取消並刪除' : '已取消' })
  } catch (error) {
    console.error('Admin 取消失敗:', error)
    return NextResponse.json({ error: '取消失敗', details: String(error) }, { status: 500 })
  }
}

