import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

/**
 * 🏭 Room-3: 採購單確認 API
 * POST /api/purchases/[id]/confirm - 確認採購單
 * 將採購單從 DRAFT → PENDING → CONFIRMED 狀態
 */

// POST /api/purchases/[id]/confirm - 確認採購單
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 權限檢查 - 只有SUPER_ADMIN和EMPLOYEE可以確認採購單
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const purchaseId = params.id
    const body = await request.json()
    const { action = 'confirm' } = body // confirm, pending, draft

    // 檢查採購單是否存在
    const existingPurchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        items: true
      }
    })

    if (!existingPurchase) {
      return NextResponse.json({ error: '採購單不存在' }, { status: 404 })
    }

    // 狀態驗證
    let newStatus: string
    let validCurrentStatuses: string[]

    switch (action) {
      case 'confirm':
        newStatus = 'CONFIRMED'
        validCurrentStatuses = ['DRAFT', 'PENDING']
        break
      case 'pending':
        newStatus = 'PENDING'
        validCurrentStatuses = ['DRAFT']
        break
      case 'draft':
        newStatus = 'DRAFT'
        validCurrentStatuses = ['PENDING']
        break
      default:
        return NextResponse.json({ error: '無效的操作' }, { status: 400 })
    }

    if (!validCurrentStatuses.includes(existingPurchase.status)) {
      return NextResponse.json({
        error: `無法從 ${existingPurchase.status} 狀態轉換為 ${newStatus}`
      }, { status: 400 })
    }

    // 確認時的額外驗證
    if (action === 'confirm') {
      // 檢查採購明細是否完整
      if (existingPurchase.items.length === 0) {
        return NextResponse.json({
          error: '採購單沒有採購項目，無法確認'
        }, { status: 400 })
      }

      // 檢查必要欄位
      if (!existingPurchase.supplier) {
        return NextResponse.json({
          error: '供應商資訊不完整，無法確認'
        }, { status: 400 })
      }

      if (!existingPurchase.exchangeRate || existingPurchase.exchangeRate <= 0) {
        return NextResponse.json({
          error: '匯率資訊不正確，無法確認'
        }, { status: 400 })
      }

      // 檢查每個採購項目的必要資訊
      for (const item of existingPurchase.items) {
        if (!item.productName || item.quantity <= 0 || item.unit_price <= 0) {
          return NextResponse.json({
            error: `採購項目 "${item.productName}" 資訊不完整，無法確認`
          }, { status: 400 })
        }
      }
    }

    // 更新採購單狀態
    const updatedPurchase = await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        status: newStatus,
        confirmedAt: action === 'confirm' ? new Date() : null,
        confirmedBy: action === 'confirm' ? session.user.id : null,
        updated_at: new Date()
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                product_code: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            items: true
          }
        }
      }
    })

    // 如果是確認採購單，可能需要觸發後續流程
    if (action === 'confirm') {
      // TODO: 觸發庫存預留邏輯（Room-3第二階段）
      // TODO: 發送確認通知（未來功能）
      // TODO: 整合ERP系統（未來功能）
    }

    const actionMessages = {
      confirm: '採購單已確認',
      pending: '採購單已送審',
      draft: '採購單已退回草稿'
    }

    return NextResponse.json({
      success: true,
      data: updatedPurchase,
      message: actionMessages[action as keyof typeof actionMessages]
    })

  } catch (error) {
    console.error('採購單狀態更新失敗:', error)
    return NextResponse.json(
      { error: '操作失敗', details: error },
      { status: 500 }
    )
  }
}

// GET /api/purchases/[id]/confirm - 檢查採購單確認狀態
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
      select: {
        id: true,
        purchaseNumber: true,
        status: true,
        confirmedAt: true,
        confirmedBy: true,
        created_at: true,
        updated_at: true
      }
    })

    if (!purchase) {
      return NextResponse.json({ error: '採購單不存在' }, { status: 404 })
    }

    // 🔒 權限檢查 - 投資方只能看自己相關的採購
    if (session.user.role === 'INVESTOR') {
      const fullPurchase = await prisma.purchase.findUnique({
        where: { id: purchaseId },
        select: { fundingSource: true, investor_id: true }
      })

      if (fullPurchase?.fundingSource === 'PERSONAL' ||
          (fullPurchase?.investor_id && fullPurchase.investor_id !== session.user.investor_id)) {
        return NextResponse.json({ error: '權限不足' }, { status: 403 })
      }
    }

    // 返回狀態資訊和可執行的操作
    const availableActions = []

    switch (purchase.status) {
      case 'DRAFT':
        availableActions.push('pending', 'confirm')
        break
      case 'PENDING':
        availableActions.push('draft', 'confirm')
        break
      case 'CONFIRMED':
        // 已確認的採購單可以收貨
        availableActions.push('receive')
        break
      default:
        break
    }

    return NextResponse.json({
      success: true,
      data: {
        ...purchase,
        availableActions
      }
    })

  } catch (error) {
    console.error('採購單狀態查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}