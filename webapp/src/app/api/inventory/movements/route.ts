import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

/**
 * 🏭 Room-3: 庫存異動記錄 API
 * 負責庫存異動歷史查詢和統計
 */

// GET /api/inventory/movements - 庫存異動記錄列表
export async function GET(request: NextRequest) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const variantId = searchParams.get('variantId') // 特定變體的異動記錄
    const movementType = searchParams.get('movementType') // 異動類型篩選
    const dateFrom = searchParams.get('dateFrom') // 起始日期
    const dateTo = searchParams.get('dateTo') // 結束日期
    const orderBy = searchParams.get('orderBy') || 'created_at'
    const order = searchParams.get('order') || 'desc'

    const skip = (page - 1) * limit

    // 建立查詢條件
    const where: any = {}

    // 特定變體篩選
    if (variantId) {
      where.variantId = variantId
    }

    // 異動類型篩選
    if (movementType) {
      where.movementType = movementType
    }

    // 日期範圍篩選
    if (dateFrom || dateTo) {
      where.created_at = {}
      if (dateFrom) {
        where.created_at.gte = new Date(dateFrom)
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999) // 設為當天結束
        where.created_at.lte = endDate
      }
    }

    // 搜尋條件 - 支援產品名稱、變體編號、原因的模糊搜尋
    if (search) {
      where.OR = [
        { reason: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        {
          variant: {
            OR: [
              { variant_code: { contains: search, mode: 'insensitive' } },
              { product: { name: { contains: search, mode: 'insensitive' } } }
            ]
          }
        }
      ]
    }

    // 執行查詢
    const [movements, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        include: {
          variant: {
            include: {
              product: {
                select: {
                  id: true,
                  product_code: true,
                  name: true,
                  category: true
                }
              }
            }
          }
        }
      }),
      prisma.inventoryMovement.count({ where })
    ])

    // 🔒 數據過濾 - 投資方不能看到個人調貨相關異動
    const filteredMovements = movements.filter(movement => {
      if (session.user.role === 'INVESTOR') {
        // TODO: 根據實際業務邏輯過濾個人調貨相關異動
        // 暫時假設所有異動都可見
        return true
      }
      return true
    }).map(movement => {
      if (session.user.role === 'INVESTOR') {
        // 隱藏敏感資訊
        return {
          ...movement,
          createdBy: null, // 隱藏操作者
          referenceId: null, // 隱藏關聯單據
          notes: movement.movementType === 'ADJUSTMENT' ? null : movement.notes
        }
      }
      return movement
    })

    return NextResponse.json({
      success: true,
      data: {
        movements: filteredMovements,
        total,
        page,
        limit,
        hasMore: skip + limit < total
      }
    })

  } catch (error) {
    console.error('庫存異動記錄查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}

// GET /api/inventory/movements/summary - 庫存異動統計
export async function POST(request: NextRequest) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const body = await request.json()
    const { variantId, dateFrom, dateTo } = body

    // 設定查詢條件
    const where: any = {}

    if (variantId) {
      where.variantId = variantId
    }

    if (dateFrom || dateTo) {
      where.created_at = {}
      if (dateFrom) {
        where.created_at.gte = new Date(dateFrom)
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        where.created_at.lte = endDate
      }
    }

    // 執行統計查詢
    const [
      totalMovements,
      purchaseMovements,
      saleMovements,
      adjustmentMovements,
      transferMovements
    ] = await Promise.all([
      prisma.inventoryMovement.count({ where }),
      prisma.inventoryMovement.count({
        where: { ...where, movementType: 'PURCHASE' }
      }),
      prisma.inventoryMovement.count({
        where: { ...where, movementType: 'SALE' }
      }),
      prisma.inventoryMovement.count({
        where: { ...where, movementType: 'ADJUSTMENT' }
      }),
      prisma.inventoryMovement.count({
        where: { ...where, movementType: 'TRANSFER' }
      })
    ])

    // 計算數量統計
    const quantityStats = await prisma.inventoryMovement.aggregate({
      where,
      _sum: {
        quantity: true
      },
      _avg: {
        quantity: true
      }
    })

    // 按異動類型統計數量
    const movementTypeStats = await prisma.inventoryMovement.groupBy({
      by: ['movementType'],
      where,
      _sum: {
        quantity: true
      },
      _count: {
        _all: true
      }
    })

    // 近期異動趨勢（最近7天）
    const recentTrend = await prisma.inventoryMovement.groupBy({
      by: ['movementType'],
      where: {
        ...where,
        created_at: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7天前
        }
      },
      _sum: {
        quantity: true
      },
      _count: {
        _all: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalMovements,
          purchaseMovements,
          saleMovements,
          adjustmentMovements,
          transferMovements
        },
        quantityStats: {
          totalQuantity: quantityStats._sum.quantity || 0,
          averageQuantity: quantityStats._avg.quantity || 0
        },
        movementTypeStats,
        recentTrend
      }
    })

  } catch (error) {
    console.error('庫存異動統計查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}