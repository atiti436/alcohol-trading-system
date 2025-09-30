import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import {
  InventoryWhereCondition,
  InventoryQueryParams,
  DashboardStatsAccumulator,
  InventoryStats,
  InventoryMovementCreate
} from '@/types/api'
import { AlcoholCategory } from '@prisma/client'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * 🏭 Room-3: Inventory 庫存管理 API
 * 負責庫存查詢、庫存異動記錄、庫存統計
 * 🔒 重要：投資方不能看到個人調貨相關庫存
 */

// GET /api/inventory - 庫存總覽列表
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
    const category = searchParams.get('category') // 酒類分類篩選
    const lowStock = searchParams.get('lowStock') === 'true' // 低庫存警告
    const orderBy = searchParams.get('orderBy') || 'name'
    const order = searchParams.get('order') || 'asc'

    const skip = (page - 1) * limit

    // 建立查詢條件
    const where: any = {
      is_active: true
    }

    // 搜尋條件 - 支援產品名稱、產品編號的模糊搜尋
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { product_code: { contains: search, mode: 'insensitive' } },
        { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } }
      ]
    }

    // 分類篩選
    if (category && Object.values(AlcoholCategory).includes(category as AlcoholCategory)) {
      where.category = category as AlcoholCategory
    }

    // 低庫存篩選
    if (lowStock) {
      where.variants = {
        some: {
          available_stock: { lte: 10 } 
          // TODO: Prisma does not support comparing two columns in a where clause directly.
          // This logic needs to be implemented differently, possibly with a raw query or by filtering in the application.
          // OR: [
          //   { available_stock: { lte: 10 } }, // 可售庫存 <= 10
          //   {
          //     AND: [
          //       { stock_quantity: { gt: 0 } },
          //       { available_stock: { lte: { stock_quantity: 0.2 } } } // 可售庫存 <= 總庫存的20%
          //     ]
          //   }
          // ]
        }
      }
    }

    // 執行查詢 - 包含庫存統計
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        include: {
          variants: {
            select: {
              id: true,
              variant_code: true,
              variant_type: true,
              description: true,
              sku: true,
              stock_quantity: true,
              reserved_stock: true,
              available_stock: true,
              cost_price: true,
              base_price: true,
              current_price: true,
              condition: true
            }
          },
          _count: {
            select: {
              variants: true
            }
          }
        }
      }),
      prisma.product.count({ where })
    ])

    // 計算庫存統計資訊
    const inventoryData = products.map(product => {
      const stats: DashboardStatsAccumulator = product.variants.reduce(
        (acc: DashboardStatsAccumulator, variant) => ({
          total_stock_quantity: acc.total_stock_quantity + variant.stock_quantity,
          total_reserved_stock: acc.total_reserved_stock + variant.reserved_stock,
          total_available_stock: acc.total_available_stock + variant.available_stock,
          total_value: acc.total_value + (variant.stock_quantity * (variant.cost_price || 0))
        }),
        { total_stock_quantity: 0, total_reserved_stock: 0, total_available_stock: 0, total_value: 0 }
      )

      // 判斷庫存狀態
      let stock_status: InventoryStats['stock_status'] = 'NORMAL'
      if (stats.total_available_stock === 0) {
        stock_status = 'OUT_OF_STOCK'
      } else if (stats.total_available_stock <= 10 || stats.total_available_stock <= stats.total_stock_quantity * 0.2) {
        stock_status = 'LOW_STOCK'
      }

      const inventory: InventoryStats = {
        total_stock_quantity: stats.total_stock_quantity,
        total_reserved_stock: stats.total_reserved_stock,
        total_available_stock: stats.total_available_stock,
        total_value: Math.round(stats.total_value),
        stock_status,
        variant_count: product.variants.length
      }

      return {
        ...product,
        inventory
      }
    })

    // 🔒 數據過濾 - 投資方不能看到個人調貨庫存
    const filteredData = inventoryData.map(product => {
      if (session.user.role === 'INVESTOR') {
        // 過濾掉個人調貨相關的庫存
        const filteredVariants = product.variants.filter(variant => {
          // 個人調貨判斷邏輯：
          // 1. 檢查庫存量是否為小批量 (通常個人調貨量較小)
          // 2. 檢查產品描述是否包含個人標記
          // 3. 檢查變種代碼是否包含個人調貨標記 (如 'P' 前綴)
          const isPersonalTransfer = (
            variant.description?.toLowerCase().includes('personal') ||
            variant.description?.toLowerCase().includes('private') ||
            variant.variant_code?.toLowerCase().includes('personal') ||
            (variant.stock_quantity && variant.stock_quantity < 10 && variant.variant_code?.includes('P'))
          )

          // 投資方不能看到個人調貨庫存
          return !isPersonalTransfer
        })

        return {
          ...product,
          variants: filteredVariants.map(variant => ({
            ...variant,
            cost_price: null // 隱藏成本價
          }))
        }
      }
      return product
    })

    return NextResponse.json({
      success: true,
      data: {
        products: filteredData,
        total,
        page,
        limit,
        hasMore: skip + limit < total
      }
    })

  } catch (error) {
    console.error('庫存列表查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}

// POST /api/inventory - 手動庫存調整
export async function POST(request: NextRequest) {
  try {
    // 權限檢查 - 只有SUPER_ADMIN和EMPLOYEE可以調整庫存
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const body = await request.json()
    const {
      variant_id,
      adjustment_type, // 'ADD' | 'SUBTRACT' | 'SET'
      quantity,
      reason,
      notes
    } = body

    // 基本驗證
    if (!variant_id || !adjustment_type || quantity === undefined) {
      return NextResponse.json({
        error: '變體ID、調整類型和數量為必填'
      }, { status: 400 })
    }

    if (!['ADD', 'SUBTRACT', 'SET'].includes(adjustment_type)) {
      return NextResponse.json({
        error: '調整類型必須是 ADD、SUBTRACT 或 SET'
      }, { status: 400 })
    }

    const adjustmentQuantity = parseInt(quantity)
    if (isNaN(adjustmentQuantity) || adjustmentQuantity < 0) {
      return NextResponse.json({
        error: '數量必須是非負整數'
      }, { status: 400 })
    }

    // 檢查變體是否存在
    const variant = await prisma.productVariant.findUnique({
      where: { id: variant_id },
      include: {
        product: {
          select: {
            name: true,
            product_code: true
          }
        }
      }
    })

    if (!variant) {
      return NextResponse.json({ error: '產品變體不存在' }, { status: 404 })
    }

    // 計算新的庫存數量
    let newStockQuantity: number

    switch (adjustment_type) {
      case 'ADD':
        newStockQuantity = variant.stock_quantity + adjustmentQuantity
        break
      case 'SUBTRACT':
        newStockQuantity = Math.max(0, variant.stock_quantity - adjustmentQuantity)
        break
      case 'SET':
        newStockQuantity = adjustmentQuantity
        break
      default:
        throw new Error('無效的調整類型')
    }

    // 檢查庫存不能小於已預留的數量
    if (newStockQuantity < variant.reserved_stock) {
      return NextResponse.json({
        error: `庫存調整後 (${newStockQuantity}) 不能少於已預留數量 (${variant.reserved_stock})`
      }, { status: 400 })
    }

    // 使用 transaction 確保數據一致性
    const result = await prisma.$transaction(async (prisma) => {
      // 更新庫存
      const updatedVariant = await prisma.productVariant.update({
        where: { id: variant_id },
        data: {
          stock_quantity: newStockQuantity,
          available_stock: newStockQuantity - variant.reserved_stock,
          updated_at: new Date()
        },
        include: {
          product: {
            select: {
              name: true,
              product_code: true
            }
          }
        }
      })

      // 記錄庫存異動
      await prisma.inventoryMovement.create({
        data: {
          variant_id,
          movement_type: 'ADJUSTMENT',
          adjustment_type,
          quantity_before: variant.stock_quantity,
          quantity_change: adjustmentQuantity - variant.stock_quantity,
          quantity_after: newStockQuantity,
          unit_cost: variant.cost_price || 0,
          total_cost: (variant.cost_price || 0) * Math.abs(adjustmentQuantity - variant.stock_quantity),
          reason: reason || '手動調整',
          notes,
          created_by: session.user.id
        }
      })

      return updatedVariant
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: '庫存調整成功'
    })

  } catch (error) {
    console.error('庫存調整失敗:', error)
    return NextResponse.json(
      { error: '調整失敗', details: error },
      { status: 500 }
    )
  }
}
