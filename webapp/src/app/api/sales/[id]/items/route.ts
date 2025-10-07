import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { Role } from '@/types/auth'
import { syncSaleCashflow } from '@/lib/cashflow/syncSaleCashflow'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * 💰 Room-4: 銷售明細管理 API
 * 核心功能：商品明細 + 雙重價格計算
 */

// POST /api/sales/[id]/items - 新增銷售明細
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

    // 投資方不能操作銷售明細
    if (session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const { id: sale_id } = params
    const body = await request.json()
    const {
      product_id,
      variant_id,
      quantity,
      unit_price,        // 顯示單價（投資方看到的）
      actual_unit_price   // 實際單價（只有SUPER_ADMIN能設定）
    } = body

    // 資料驗證
    if (!product_id || !quantity || quantity <= 0) {
      return NextResponse.json({ error: '請提供有效的商品和數量' }, { status: 400 })
    }

    if (!unit_price || unit_price <= 0) {
      return NextResponse.json({ error: '請提供有效的單價' }, { status: 400 })
    }

    // 檢查銷售訂單是否存在
    const sale = await prisma.sale.findUnique({
      where: { id: sale_id },
      include: { items: true }
    })

    if (!sale) {
      return NextResponse.json({ error: '銷售訂單不存在' }, { status: 404 })
    }

    // 🔒 權限檢查：員工不能操作個人調貨訂單
    if (sale.funding_source === 'PERSONAL' && session.user.role === 'EMPLOYEE') {
      return NextResponse.json({ error: '員工無權限操作個人調貨訂單' }, { status: 403 })
    }

    // 檢查商品是否存在
    const product = await prisma.product.findUnique({
      where: { id: product_id },
      include: {
        variants: variant_id ? {
          where: { id: variant_id }
        } : false
      }
    })

    if (!product) {
      return NextResponse.json({ error: '商品不存在' }, { status: 400 })
    }

    if (variant_id) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variant_id }
      })
      if (!variant) {
        return NextResponse.json({ error: '商品變體不存在' }, { status: 400 })
      }
    }

    // 🔒 雙重價格邏輯
    let finalActualUnitPrice = unit_price // 預設實際價格等於顯示價格

    // 只有超級管理員能設定不同的實際價格
    if (session.user.role === Role.SUPER_ADMIN && actual_unit_price) {
      finalActualUnitPrice = actual_unit_price
    }

    const total_price = unit_price * quantity
    const actual_total_price = finalActualUnitPrice * quantity

    // 🔄 使用 Transaction 新增明細並同步 cashflow
    const saleItem = await prisma.$transaction(async (tx) => {
      // 新增銷售明細
      const newItem = await tx.saleItem.create({
        data: {
          sale_id,
          product_id,
          variant_id,
          quantity,
          unit_price,                                    // 顯示單價
          actual_unit_price: finalActualUnitPrice,        // 實際單價
          total_price,                                   // 顯示總價
          actual_total_price,                            // 實際總價
          is_personal_purchase: sale.funding_source === 'PERSONAL'
        },
        include: {
          product: {
            select: {
              id: true,
              product_code: true,
              name: true,
              category: true,
              volume_ml: true,
              alc_percentage: true
            }
          },
          variant: {
            select: {
              id: true,
              variant_code: true,
              variant_type: true,
              description: true
            }
          }
        }
      })

      // 重新計算銷售訂單總金額
      const updatedItems = await tx.saleItem.findMany({
        where: { sale_id }
      })

      const newTotalAmount = updatedItems.reduce((sum, item) => sum + item.total_price, 0)
      const newActualAmount = updatedItems.reduce((sum, item) => sum + (item.actual_total_price || 0), 0)
      const newCommission = newActualAmount - newTotalAmount

      // 更新銷售訂單總金額
      await tx.sale.update({
        where: { id: sale_id },
        data: {
          total_amount: newTotalAmount,
          actual_amount: newActualAmount,
          commission: newCommission
        }
      })

      // 🔄 同步 cashflow 記錄
      const updatedSale = await tx.sale.findUnique({
        where: { id: sale_id },
        include: { items: true }
      })

      if (updatedSale) {
        await syncSaleCashflow(tx, updatedSale)
      }

      return newItem
    })

    // 🔒 回傳前過濾敏感資料 (INVESTOR已在上方被阻擋)
    const filteredItem = {
      ...saleItem,
      actual_unit_price: saleItem.actual_unit_price,
      actual_total_price: saleItem.actual_total_price,
      is_personal_purchase: saleItem.is_personal_purchase
    }

    return NextResponse.json({
      success: true,
      data: filteredItem,
      message: '銷售明細新增成功'
    })

  } catch (error) {
    console.error('新增銷售明細失敗:', error)
    return NextResponse.json(
      { error: '新增失敗', details: error },
      { status: 500 }
    )
  }
}

// GET /api/sales/[id]/items - 取得銷售明細列表
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const { id: sale_id } = params

    // 檢查銷售訂單是否存在且有權限查看
    const sale = await prisma.sale.findUnique({
      where: { id: sale_id }
    })

    if (!sale) {
      return NextResponse.json({ error: '銷售訂單不存在' }, { status: 404 })
    }

    // 🔒 投資方權限檢查
    if (session.user.role === 'INVESTOR' && sale.funding_source === 'PERSONAL') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    // 查詢銷售明細
    const items = await prisma.saleItem.findMany({
      where: { sale_id },
      include: {
        product: {
          select: {
            id: true,
            product_code: true,
            name: true,
            category: true,
            volume_ml: true,
            alc_percentage: true,
            cost_price: true // 只有超級管理員能看到
          }
        },
        variant: {
          select: {
            id: true,
            variant_code: true,
            variant_type: true,
            description: true,
            cost_price: true // 只有超級管理員能看到
          }
        }
      },
      orderBy: { created_at: 'asc' }
    })

    // 🔒 資料過濾：根據角色隱藏敏感資訊 (INVESTOR已在上方被阻擋)
    const filteredItems = items.map(item => ({
      ...item,
      actual_unit_price: item.actual_unit_price,
      actual_total_price: item.actual_total_price,
      is_personal_purchase: item.is_personal_purchase,
      product: {
        ...item.product,
        cost_price: session.user.role === 'SUPER_ADMIN' ? item.product.cost_price : undefined
      },
      variant: item.variant ? {
        ...item.variant,
        cost_price: session.user.role === 'SUPER_ADMIN' ? item.variant.cost_price : undefined
      } : null
    }))

    return NextResponse.json({
      success: true,
      data: {
        items: filteredItems,
        summary: {
          totalItems: items.length,
          totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
          total_amount: items.reduce((sum, item) => sum + item.total_price, 0),
          // 實際金額只有非投資方能看到
          ...(session.user.role !== 'INVESTOR' && {
            actual_total_amount: items.reduce((sum, item) => sum + (item.actual_total_price || 0), 0),
            commission: items.reduce((sum, item) => sum + ((item.actual_total_price || 0) - item.total_price), 0)
          })
        }
      }
    })

  } catch (error) {
    console.error('查詢銷售明細失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}
