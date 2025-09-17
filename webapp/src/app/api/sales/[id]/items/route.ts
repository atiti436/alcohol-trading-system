import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/auth-config'

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

    const { id: saleId } = params
    const body = await request.json()
    const {
      productId,
      variantId,
      quantity,
      unitPrice,        // 顯示單價（投資方看到的）
      actualUnitPrice   // 實際單價（只有SUPER_ADMIN能設定）
    } = body

    // 資料驗證
    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json({ error: '請提供有效的商品和數量' }, { status: 400 })
    }

    if (!unitPrice || unitPrice <= 0) {
      return NextResponse.json({ error: '請提供有效的單價' }, { status: 400 })
    }

    // 檢查銷售訂單是否存在
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: true }
    })

    if (!sale) {
      return NextResponse.json({ error: '銷售訂單不存在' }, { status: 404 })
    }

    // 🔒 權限檢查：員工不能操作個人調貨訂單
    if (sale.fundingSource === 'PERSONAL' && session.user.role === 'EMPLOYEE') {
      return NextResponse.json({ error: '員工無權限操作個人調貨訂單' }, { status: 403 })
    }

    // 檢查商品是否存在
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: variantId ? {
          where: { id: variantId }
        } : false
      }
    })

    if (!product) {
      return NextResponse.json({ error: '商品不存在' }, { status: 400 })
    }

    if (variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId }
      })
      if (!variant) {
        return NextResponse.json({ error: '商品變體不存在' }, { status: 400 })
      }
    }

    // 🔒 雙重價格邏輯
    let finalActualUnitPrice = unitPrice // 預設實際價格等於顯示價格

    // 只有超級管理員能設定不同的實際價格
    if (session.user.role === 'SUPER_ADMIN' && actualUnitPrice) {
      finalActualUnitPrice = actualUnitPrice
    }

    const totalPrice = unitPrice * quantity
    const actualTotalPrice = finalActualUnitPrice * quantity

    // 新增銷售明細
    const saleItem = await prisma.saleItem.create({
      data: {
        saleId,
        productId,
        variantId,
        quantity,
        unitPrice,                                    // 顯示單價
        actualUnitPrice: finalActualUnitPrice,        // 實際單價
        totalPrice,                                   // 顯示總價
        actualTotalPrice,                            // 實際總價
        isPersonalPurchase: sale.fundingSource === 'PERSONAL'
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
            variantType: true,
            description: true
          }
        }
      }
    })

    // 重新計算銷售訂單總金額
    const updatedItems = await prisma.saleItem.findMany({
      where: { saleId }
    })

    const newTotalAmount = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0)
    const newActualAmount = updatedItems.reduce((sum, item) => sum + item.actualTotalPrice, 0)
    const newCommission = newActualAmount - newTotalAmount

    // 更新銷售訂單總金額
    await prisma.sale.update({
      where: { id: saleId },
      data: {
        totalAmount: newTotalAmount,
        actualAmount: newActualAmount,
        commission: newCommission
      }
    })

    // 🔒 回傳前過濾敏感資料
    const filteredItem = {
      ...saleItem,
      actualUnitPrice: session.user.role === 'INVESTOR' ? undefined : saleItem.actualUnitPrice,
      actualTotalPrice: session.user.role === 'INVESTOR' ? undefined : saleItem.actualTotalPrice,
      isPersonalPurchase: session.user.role === 'INVESTOR' ? undefined : saleItem.isPersonalPurchase
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

    const { id: saleId } = params

    // 檢查銷售訂單是否存在且有權限查看
    const sale = await prisma.sale.findUnique({
      where: { id: saleId }
    })

    if (!sale) {
      return NextResponse.json({ error: '銷售訂單不存在' }, { status: 404 })
    }

    // 🔒 投資方權限檢查
    if (session.user.role === 'INVESTOR' && sale.fundingSource === 'PERSONAL') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    // 查詢銷售明細
    const items = await prisma.saleItem.findMany({
      where: { saleId },
      include: {
        product: {
          select: {
            id: true,
            product_code: true,
            name: true,
            category: true,
            volume_ml: true,
            alc_percentage: true,
            costPrice: true // 只有超級管理員能看到
          }
        },
        variant: {
          select: {
            id: true,
            variant_code: true,
            variantType: true,
            description: true,
            cost_price: true // 只有超級管理員能看到
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // 🔒 資料過濾：根據角色隱藏敏感資訊
    const filteredItems = items.map(item => ({
      ...item,
      actualUnitPrice: session.user.role === 'INVESTOR' ? undefined : item.actualUnitPrice,
      actualTotalPrice: session.user.role === 'INVESTOR' ? undefined : item.actualTotalPrice,
      isPersonalPurchase: session.user.role === 'INVESTOR' ? undefined : item.isPersonalPurchase,
      product: {
        ...item.product,
        costPrice: session.user.role === 'SUPER_ADMIN' ? item.product.costPrice : undefined
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
          totalAmount: items.reduce((sum, item) => sum + item.totalPrice, 0),
          // 實際金額只有非投資方能看到
          ...(session.user.role !== 'INVESTOR' && {
            actualTotalAmount: items.reduce((sum, item) => sum + item.actualTotalPrice, 0),
            commission: items.reduce((sum, item) => sum + (item.actualTotalPrice - item.totalPrice), 0)
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