import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/auth-config'

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
            paymentTerms: true
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
                standardPrice: true,
                currentPrice: true,
                costPrice: true // 只有超級管理員能看到
              }
            },
            variant: {
              select: {
                id: true,
                variant_code: true,
                variantType: true,
                description: true,
                currentPrice: true,
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

    // 🔒 投資方數據隔離檢查
    if (session.user.role === 'INVESTOR') {
      // 投資方只能看公司資金的銷售
      if (sale.fundingSource === 'PERSONAL') {
        return NextResponse.json({ error: '權限不足' }, { status: 403 })
      }
    }

    // 🔒 資料過濾：根據角色隱藏敏感資訊
    const filteredSale = {
      ...sale,
      // 投資方看不到真實金額和傭金
      actualAmount: session.user.role === 'INVESTOR' ? undefined : sale.actualAmount,
      commission: session.user.role === 'INVESTOR' ? undefined : sale.commission,
      // 隱藏創建者資訊（投資方）
      creator: session.user.role === 'INVESTOR' ? null : sale.creator,
      // 過濾商品資訊
      items: sale.items.map(item => ({
        ...item,
        // 投資方看不到實際價格
        actualUnitPrice: session.user.role === 'INVESTOR' ? undefined : item.actualUnitPrice,
        actualTotalPrice: session.user.role === 'INVESTOR' ? undefined : item.actualTotalPrice,
        isPersonalPurchase: session.user.role === 'INVESTOR' ? undefined : item.isPersonalPurchase,
        // 過濾產品成本資訊
        product: {
          ...item.product,
          costPrice: session.user.role === 'SUPER_ADMIN' ? item.product.costPrice : undefined
        },
        variant: item.variant ? {
          ...item.variant,
          cost_price: session.user.role === 'SUPER_ADMIN' ? item.variant.cost_price : undefined
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

    // 投資方不能編輯銷售訂單
    if (session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

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
    if (existingSale.fundingSource === 'PERSONAL' && session.user.role === 'EMPLOYEE') {
      return NextResponse.json({ error: '員工無權限編輯個人調貨訂單' }, { status: 403 })
    }

    const {
      customerId,
      paymentTerms,
      dueDate,
      notes,
      isPaid,
      paidAt
    } = body

    // 更新銷售訂單基本資訊
    const updatedSale = await prisma.sale.update({
      where: { id },
      data: {
        ...(customerId && { customerId }),
        ...(paymentTerms && { paymentTerms }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(notes !== undefined && { notes }),
        ...(isPaid !== undefined && { isPaid }),
        ...(paidAt && { paidAt: new Date(paidAt) }),
        updatedAt: new Date()
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
                variantType: true,
                description: true
              }
            }
          }
        }
      }
    })

    // 🔒 回傳前過濾敏感資料
    const filteredSale = {
      ...updatedSale,
      actualAmount: session.user.role === 'INVESTOR' ? undefined : updatedSale.actualAmount,
      commission: session.user.role === 'INVESTOR' ? undefined : updatedSale.commission,
      creator: session.user.role === 'INVESTOR' ? null : updatedSale.creator,
      items: updatedSale.items.map(item => ({
        ...item,
        actualUnitPrice: session.user.role === 'INVESTOR' ? undefined : item.actualUnitPrice,
        actualTotalPrice: session.user.role === 'INVESTOR' ? undefined : item.actualTotalPrice,
        isPersonalPurchase: session.user.role === 'INVESTOR' ? undefined : item.isPersonalPurchase
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
    if (existingSale.isPaid) {
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