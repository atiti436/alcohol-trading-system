import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/auth-config'

/**
 * 🏭 Room-3: 單一採購單管理 API
 * GET /api/purchases/[id] - 採購單詳情
 * PUT /api/purchases/[id] - 更新採購單
 * DELETE /api/purchases/[id] - 刪除採購單
 */

// GET /api/purchases/[id] - 採購單詳情
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

    const purchaseId = params.id

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                product_code: true,
                name: true,
                category: true,
                standard_price: true
              }
            }
          }
        },
        receipts: {
          include: {
            additionalCosts: true
          }
        }
      }
    })

    if (!purchase) {
      return NextResponse.json({ error: '採購單不存在' }, { status: 404 })
    }

    // 🔒 權限檢查 - 投資方只能看自己相關的採購
    if (session.user.role === 'INVESTOR') {
      if (purchase.fundingSource === 'PERSONAL' ||
          (purchase.investorId && purchase.investorId !== session.user.investorId)) {
        return NextResponse.json({ error: '權限不足' }, { status: 403 })
      }

      // 🔒 數據過濾 - 投資方看到調整後的金額
      const filteredPurchase = {
        ...purchase,
        totalAmount: purchase.displayAmount || purchase.totalAmount * 0.8,
        items: purchase.items.map(item => ({
          ...item,
          unitPrice: item.displayPrice || item.unitPrice * 0.8,
          totalPrice: item.displayTotal || item.totalPrice * 0.8,
          dutiableValue: null, // 隱藏完稅價格
          actualCost: null // 隱藏實際成本
        })),
        receipts: purchase.receipts.map(receipt => ({
          ...receipt,
          additionalCosts: [] // 隱藏額外費用明細
        }))
      }

      return NextResponse.json({
        success: true,
        data: filteredPurchase
      })
    }

    return NextResponse.json({
      success: true,
      data: purchase
    })

  } catch (error) {
    console.error('採購單詳情查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}

// PUT /api/purchases/[id] - 更新採購單
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 權限檢查 - 只有SUPER_ADMIN和EMPLOYEE可以更新採購單
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const purchaseId = params.id
    const body = await request.json()

    // 檢查採購單是否存在
    const existingPurchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: true }
    })

    if (!existingPurchase) {
      return NextResponse.json({ error: '採購單不存在' }, { status: 404 })
    }

    // 檢查狀態 - 已完成的採購單不能修改
    if (existingPurchase.status === 'COMPLETED') {
      return NextResponse.json({
        error: '已完成的採購單不能修改'
      }, { status: 400 })
    }

    const {
      supplier,
      currency,
      exchangeRate,
      declarationNumber,
      declarationDate,
      notes,
      status,
      items = []
    } = body

    // 準備更新資料
    const updateData: any = {
      updatedAt: new Date()
    }

    // 基本欄位更新
    if (supplier !== undefined) updateData.supplier = supplier
    if (currency !== undefined) updateData.currency = currency
    if (exchangeRate !== undefined) {
      if (exchangeRate <= 0) {
        return NextResponse.json({ error: '匯率必須大於0' }, { status: 400 })
      }
      updateData.exchangeRate = parseFloat(exchangeRate)
    }
    if (declarationNumber !== undefined) updateData.declarationNumber = declarationNumber
    if (declarationDate !== undefined) {
      updateData.declarationDate = declarationDate ? new Date(declarationDate) : null
    }
    if (notes !== undefined) updateData.notes = notes
    if (status !== undefined) updateData.status = status

    // 如果有更新採購明細
    if (items.length > 0) {
      // 重新計算總金額
      let totalAmount = 0
      const validatedItems = []

      for (const item of items) {
        if (!item.productName || !item.quantity || !item.unitPrice) {
          return NextResponse.json({
            error: '採購項目缺少必要資訊：產品名稱、數量、單價'
          }, { status: 400 })
        }

        const itemTotal = item.quantity * item.unitPrice
        totalAmount += itemTotal

        validatedItems.push({
          id: item.id || undefined, // 如果有ID就是更新，沒有就是新增
          productId: item.productId || null,
          productName: item.productName,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          totalPrice: itemTotal,
          dutiableValue: item.dutiableValue ? parseFloat(item.dutiableValue) : null,
          tariffCode: item.tariffCode || null,
          importDutyRate: item.importDutyRate ? parseFloat(item.importDutyRate) : null,
          alcoholPercentage: item.alcoholPercentage ? parseFloat(item.alcoholPercentage) : null,
          volumeML: item.volumeML ? parseInt(item.volumeML) : null,
          weight: item.weight ? parseFloat(item.weight) : null
        })
      }

      updateData.totalAmount = totalAmount

      // 使用 transaction 確保數據一致性
      const updatedPurchase = await prisma.$transaction(async (prisma) => {
        // 先刪除舊的採購明細
        await prisma.purchaseItem.deleteMany({
          where: { purchaseId }
        })

        // 更新採購單並新增明細
        return await prisma.purchase.update({
          where: { id: purchaseId },
          data: {
            ...updateData,
            items: {
              create: validatedItems
            }
          },
          include: {
            items: true,
            _count: {
              select: {
                items: true
              }
            }
          }
        })
      })

      return NextResponse.json({
        success: true,
        data: updatedPurchase,
        message: '採購單更新成功'
      })
    } else {
      // 只更新基本資訊，不動明細
      const updatedPurchase = await prisma.purchase.update({
        where: { id: purchaseId },
        data: updateData,
        include: {
          items: true,
          _count: {
            select: {
              items: true
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        data: updatedPurchase,
        message: '採購單更新成功'
      })
    }

  } catch (error) {
    console.error('採購單更新失敗:', error)
    return NextResponse.json(
      { error: '更新失敗', details: error },
      { status: 500 }
    )
  }
}

// DELETE /api/purchases/[id] - 刪除採購單
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 權限檢查 - 只有SUPER_ADMIN可以刪除採購單
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const purchaseId = params.id

    // 檢查採購單是否存在
    const existingPurchase = await prisma.purchase.findUnique({
      where: { id: purchaseId }
    })

    if (!existingPurchase) {
      return NextResponse.json({ error: '採購單不存在' }, { status: 404 })
    }

    // 檢查狀態 - 已收貨或已完成的採購單不能刪除
    if (existingPurchase.status === 'RECEIVED' || existingPurchase.status === 'COMPLETED') {
      return NextResponse.json({
        error: '已收貨或已完成的採購單不能刪除'
      }, { status: 400 })
    }

    // 軟刪除 - 標記為已取消而非實際刪除
    await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: '採購單已取消'
    })

  } catch (error) {
    console.error('採購單刪除失敗:', error)
    return NextResponse.json(
      { error: '刪除失敗', details: error },
      { status: 500 }
    )
  }
}