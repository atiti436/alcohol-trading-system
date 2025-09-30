import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { Role } from '@/types/auth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * 💰 Room-4: 個別銷售訂單管理 API
 * 核心功能：CRUD操作 + 雙重價格機制保護
 */

// GET /api/sales/[id] - 取得單一銷售訂單
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

    const { id } = params

    // 查詢銷售訂單
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            customer_code: true,
            name: true,
            company: true,
            tier: true,
            contact_person: true,
            phone: true,
            email: true,
            address: true,
            payment_terms: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                product_code: true,
                name: true,
                category: true,
                volume_ml: true,
                alc_percentage: true,
                standard_price: true,
                current_price: true,
                cost_price: true // 只有超級管理員能看到
              }
            },
            variant: {
              select: {
                id: true,
                variant_code: true,
                variant_type: true,
                description: true,
                current_price: true,
                cost_price: true // 只有超級管理員能看到
              }
            }
          }
        }
      }
    })

    if (!sale) {
      return NextResponse.json({ error: '銷售訂單不存在' }, { status: 404 })
    }

    // 🔒 投資方數據隔離檢查 (已被系統權限處理)

    // 🔒 資料過濾：根據角色隱藏敏感資訊 (INVESTOR已被系統權限處理)
    const filteredSale = {
      ...sale,
      // 顯示真實金額和傭金
      actual_amount: sale.actual_amount,
      commission: sale.commission,
      // 顯示創建者資訊
      creator: sale.creator,
      // 完整商品資訊
      items: sale.items.map((item: any) => ({
        ...item,
        // 顯示實際價格
        actual_unit_price: item.actual_unit_price,
        actual_total_price: item.actual_total_price,
        is_personal_purchase: item.is_personal_purchase,
        // 過濾產品成本資訊
        product: {
          ...item.product,
          cost_price: session.user.role === Role.SUPER_ADMIN ? item.product.cost_price : undefined
        },
        variant: item.variant ? {
          ...item.variant,
          cost_price: session.user.role === Role.SUPER_ADMIN ? item.variant.cost_price : undefined
        } : null
      }))
    }

    return NextResponse.json({
      success: true,
      data: filteredSale
    })

  } catch (error) {
    console.error('查詢銷售訂單失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}

// PUT /api/sales/[id] - 更新銷售訂單
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    // 投資方不能編輯銷售訂單 (已被系統權限處理)

    const { id } = params
    const body = await request.json()

    // 檢查銷售訂單是否存在
    const existingSale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!existingSale) {
      return NextResponse.json({ error: '銷售訂單不存在' }, { status: 404 })
    }

    // 🔒 權限檢查：員工不能編輯個人調貨訂單
    if (existingSale.funding_source === 'PERSONAL' && session.user.role === 'EMPLOYEE') {
      return NextResponse.json({ error: '員工無權限編輯個人調貨訂單' }, { status: 403 })
    }

    const {
      customer_id,
      payment_terms,
      due_date,
      notes,
      is_paid,
      paid_at
    } = body

    // 更新銷售訂單基本資訊
    const updatedSale = await prisma.sale.update({
      where: { id },
      data: {
        ...(customer_id && { customer_id }),
        ...(payment_terms && { payment_terms }),
        ...(due_date && { due_date: new Date(due_date) }),
        ...(notes !== undefined && { notes }),
        ...(is_paid !== undefined && { is_paid }),
        ...(paid_at && { paid_at: new Date(paid_at) }),
      },
      include: {
        customer: {
          select: {
            id: true,
            customer_code: true,
            name: true,
            company: true,
            tier: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                product_code: true,
                name: true,
                category: true
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
        }
      }
    })

    // 🔒 回傳前過濾敏感資料 (INVESTOR已被系統權限限制)
    const filteredSale = {
      ...updatedSale,
      actual_amount: updatedSale.actual_amount,
      commission: updatedSale.commission,
      creator: updatedSale.creator,
      items: updatedSale.items.map((item: any) => ({
        ...item,
        actual_unit_price: item.actual_unit_price,
        actual_total_price: item.actual_total_price,
        is_personal_purchase: item.is_personal_purchase
      }))
    }

    return NextResponse.json({
      success: true,
      data: filteredSale,
      message: '銷售訂單更新成功'
    })

  } catch (error) {
    console.error('更新銷售訂單失敗:', error)
    return NextResponse.json(
      { error: '更新失敗', details: error },
      { status: 500 }
    )
  }
}

// DELETE /api/sales/[id] - 刪除銷售訂單
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    // 只有超級管理員可以刪除銷售訂單
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '權限不足，只有超級管理員可以刪除銷售訂單' }, { status: 403 })
    }

    const { id } = params

    // 檢查銷售訂單是否存在
    const existingSale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!existingSale) {
      return NextResponse.json({ error: '銷售訂單不存在' }, { status: 404 })
    }

    // 檢查是否已付款（已付款的訂單不能刪除）
    if (existingSale.is_paid) {
      return NextResponse.json({ error: '已付款的銷售訂單無法刪除' }, { status: 400 })
    }

    // 刪除銷售訂單（CASCADE會自動刪除關聯的items）
    await prisma.sale.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: '銷售訂單刪除成功'
    })

  } catch (error) {
    console.error('刪除銷售訂單失敗:', error)
    return NextResponse.json(
      { error: '刪除失敗', details: error },
      { status: 500 }
    )
  }
}
