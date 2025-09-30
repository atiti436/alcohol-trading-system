import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

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
    const variant_id = searchParams.get('variant_id') // 特定變體的異動記錄
    const movement_type = searchParams.get('movement_type') // 異動類型篩選
    const dateFrom = searchParams.get('date_from') // 起始日期
    const dateTo = searchParams.get('date_to') // 結束日期
    const orderBy = searchParams.get('orderBy') || 'created_at'
    const order = searchParams.get('order') || 'desc'

    const skip = (page - 1) * limit

    // 建立查詢條件
    const where: any = {}

    // 特定變體篩選
    if (variant_id) {
      where.variant_id = variant_id
    }

    // 異動類型篩選
    if (movement_type) {
      where.movement_type = movement_type
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
        // 個人調貨異動過濾邏輯：
        // 1. 檢查異動類型是否為個人調貨相關
        // 2. 檢查備註是否包含個人調貨關鍵字
        // 3. 檢查原因欄位是否包含個人調貨標記
        const isPersonalMovement = (
          movement.movement_type === 'PERSONAL_TRANSFER' ||
          movement.notes?.includes('個人調貨') ||
          movement.notes?.includes('personal') ||
          movement.reason?.toLowerCase().includes('personal')
        )

        // 投資方不能看到個人調貨相關異動
        return !isPersonalMovement
      }
      return true
    }).map(movement => {
      if (session.user.role === 'INVESTOR') {
        // 隱藏敏感資訊
        return {
          ...movement,
          created_by: null, // 隱藏操作者
          reference_id: null, // 隱藏關聯單據
          notes: movement.movement_type === 'ADJUSTMENT' ? null : movement.notes
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
    const { variant_id, date_from, date_to } = body

    // 設定查詢條件
    const where: any = {}

    if (variant_id) {
      where.variant_id = variant_id
    }

    if (date_from || date_to) {
      where.created_at = {}
      if (date_from) {
        where.created_at.gte = new Date(date_from)
      }
      if (date_to) {
        const endDate = new Date(date_to)
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
        where: { ...where, movement_type: 'PURCHASE' }
      }),
      prisma.inventoryMovement.count({
        where: { ...where, movement_type: 'SALE' }
      }),
      prisma.inventoryMovement.count({
        where: { ...where, movement_type: 'ADJUSTMENT' }
      }),
      prisma.inventoryMovement.count({
        where: { ...where, movement_type: 'TRANSFER' }
      })
    ])

    // 計算數量統計
    const quantityStats = await prisma.inventoryMovement.aggregate({
      where,
      _sum: {
        quantity_change: true,
        total_cost: true
      },
      _avg: {
        quantity_change: true,
        unit_cost: true
      }
    })

    // 按異動類型統計數量
    const movementTypeStats = await prisma.inventoryMovement.groupBy({
      by: ['movement_type'],
      where,
      _sum: {
        quantity_change: true,
        total_cost: true
      },
      _count: {
        _all: true
      }
    })

    // 近期異動趨勢（最近7天）
    const recentTrend = await prisma.inventoryMovement.groupBy({
      by: ['movement_type'],
      where: {
        ...where,
        created_at: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7天前
        }
      },
      _sum: {
        quantity_change: true
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
          totalQuantityChange: quantityStats._sum.quantity_change || 0,
          totalCost: quantityStats._sum.total_cost || 0,
          averageQuantityChange: quantityStats._avg.quantity_change || 0,
          averageUnitCost: quantityStats._avg.unit_cost || 0
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
