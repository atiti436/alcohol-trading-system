import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

/**
 * 🏠 Room-2: 客戶專價詳細管理 API
 * 負責單一專價記錄的修改、刪除功能
 * 🔒 重要：投資方角色完全不能存取此API
 */

// GET /api/customers/[id]/special-prices/[priceId] - 取得特定專價詳情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; priceId: string } }
) {
  try {
    // 🔒 權限檢查 - 投資方完全不能存取
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const { id: customerId, priceId } = params

    const specialPrice = await prisma.customerSpecialPrice.findFirst({
      where: {
        id: priceId,
        customer_id: customerId
      },
      include: {
        product: {
          select: {
            product_code: true,
            name_zh: true,
            name_en: true,
            standard_price: true,
            current_price: true
          }
        },
        customer: {
          select: {
            customer_code: true,
            name: true,
            tier: true
          }
        }
      }
    })

    if (!specialPrice) {
      return NextResponse.json({ error: '專價記錄不存在' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: specialPrice
    })

  } catch (error) {
    console.error('專價詳情查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}

// PUT /api/customers/[id]/special-prices/[priceId] - 修改專價
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; priceId: string } }
) {
  try {
    // 🔒 權限檢查 - 只有SUPER_ADMIN和EMPLOYEE可以修改專價
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const { id: customerId, priceId } = params
    const body = await request.json()
    const {
      special_price,
      reason,
      effective_date,
      expiry_date,
      notes,
      is_active
    } = body

    // 驗證專價記錄是否存在
    const existingPrice = await prisma.customerSpecialPrice.findFirst({
      where: {
        id: priceId,
        customer_id: customerId
      },
      include: {
        product: {
          select: { standard_price: true }
        }
      }
    })

    if (!existingPrice) {
      return NextResponse.json({ error: '專價記錄不存在' }, { status: 404 })
    }

    // 準備更新資料
    const updateData: any = {
      updated_at: new Date()
    }

    // 如果修改專價，重新計算折扣金額和折扣率
    if (special_price !== undefined) {
      if (special_price < 0) {
        return NextResponse.json({
          error: '專屬價格不能為負數'
        }, { status: 400 })
      }

      const standard_price = existingPrice.standard_price
      if (special_price > standard_price) {
        return NextResponse.json({
          error: '專屬價格不能高於標準價格'
        }, { status: 400 })
      }

      updateData.special_price = special_price
      updateData.discount_amount = standard_price - special_price
      updateData.discount_rate = (standard_price - special_price) / standard_price
    }

    // 其他欄位更新
    if (reason !== undefined) updateData.reason = reason
    if (effective_date !== undefined) {
      updateData.effective_date = new Date(effective_date)
    }
    if (expiry_date !== undefined) {
      updateData.expiry_date = expiry_date ? new Date(expiry_date) : null
    }
    if (notes !== undefined) updateData.notes = notes
    if (is_active !== undefined) updateData.is_active = is_active

    // 執行更新
    const updatedPrice = await prisma.customerSpecialPrice.update({
      where: { id: priceId },
      data: updateData,
      include: {
        product: {
          select: {
            product_code: true,
            name_zh: true,
            standard_price: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedPrice,
      message: '專價更新成功'
    })

  } catch (error) {
    console.error('專價更新失敗:', error)
    return NextResponse.json(
      { error: '更新失敗', details: error },
      { status: 500 }
    )
  }
}

// DELETE /api/customers/[id]/special-prices/[priceId] - 刪除專價
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; priceId: string } }
) {
  try {
    // 🔒 權限檢查 - 只有SUPER_ADMIN可以刪除專價
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const { id: customerId, priceId } = params

    // 驗證專價記錄是否存在
    const existingPrice = await prisma.customerSpecialPrice.findFirst({
      where: {
        id: priceId,
        customer_id: customerId
      }
    })

    if (!existingPrice) {
      return NextResponse.json({ error: '專價記錄不存在' }, { status: 404 })
    }

    // 軟刪除 - 設為無效而非實際刪除，保留歷史記錄
    await prisma.customerSpecialPrice.update({
      where: { id: priceId },
      data: {
        is_active: false,
        updated_at: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: '專價記錄已停用'
    })

  } catch (error) {
    console.error('專價刪除失敗:', error)
    return NextResponse.json(
      { error: '刪除失敗', details: error },
      { status: 500 }
    )
  }
}