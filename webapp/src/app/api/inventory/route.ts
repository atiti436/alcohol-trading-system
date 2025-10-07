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
import { getWarehouseFilter } from '@/lib/permissions'

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
              cost_price: true,
              base_price: true,
              current_price: true,
              condition: true,
              // ✅ 從 Inventory 表查詢庫存
              inventory: {
                where: session.user.role === 'INVESTOR'
                  ? { warehouse: 'COMPANY' }  // 🔒 投資方只能看公司倉
                  : undefined,  // 員工和管理員可以看全部倉庫
                select: {
                  id: true,
                  warehouse: true,
                  quantity: true,
                  reserved: true,
                  available: true,
                  cost_price: true,
                  updated_at: true
                }
              }
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

    // ✅ 計算庫存統計資訊（從 Inventory 表匯總）
    const inventoryData = products.map(product => {
      const stats: DashboardStatsAccumulator = product.variants.reduce(
        (acc: DashboardStatsAccumulator, variant: any) => {
          // 從 inventory 數組中匯總所有倉庫的庫存
          const variantInventoryStats = variant.inventory.reduce(
            (invAcc: any, inv: any) => ({
              quantity: invAcc.quantity + inv.quantity,
              reserved: invAcc.reserved + inv.reserved,
              available: invAcc.available + inv.available,
              value: invAcc.value + (inv.quantity * (inv.cost_price || 0))
            }),
            { quantity: 0, reserved: 0, available: 0, value: 0 }
          )

          return {
            total_stock_quantity: acc.total_stock_quantity + variantInventoryStats.quantity,
            total_reserved_stock: acc.total_reserved_stock + variantInventoryStats.reserved,
            total_available_stock: acc.total_available_stock + variantInventoryStats.available,
            total_value: acc.total_value + variantInventoryStats.value
          }
        },
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

    // 🔒 數據過濾 - 投資方隱藏實際售價（個人倉已在查詢時過濾）
    const filteredData = inventoryData.map(product => {
      if (session.user.role === 'INVESTOR') {
        return {
          ...product,
          variants: product.variants.map(variant => ({
            ...variant,
            actual_price: undefined // 隱藏實際售價
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

// POST /api/inventory - 手動庫存調整（支援多倉庫）
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
      warehouse, // 'COMPANY' | 'PRIVATE'
      adjustment_type, // 'ADD' | 'SUBTRACT' | 'SET'
      quantity,
      reason,
      notes
    } = body

    // 基本驗證
    if (!variant_id || !warehouse || !adjustment_type || quantity === undefined) {
      return NextResponse.json({
        error: '變體ID、倉庫、調整類型和數量為必填'
      }, { status: 400 })
    }

    if (!['COMPANY', 'PRIVATE'].includes(warehouse)) {
      return NextResponse.json({
        error: '倉庫必須是 COMPANY 或 PRIVATE'
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

    // 使用 transaction 確保數據一致性
    const result = await prisma.$transaction(async (tx) => {
      // ✅ 查詢或創建該倉庫的庫存記錄
      let inventory = await tx.inventory.findFirst({
        where: {
          variant_id,
          warehouse
        }
      })

      if (!inventory) {
        // 如果該倉庫沒有庫存記錄，創建一個
        inventory = await tx.inventory.create({
          data: {
            variant_id,
            warehouse,
            quantity: 0,
            reserved: 0,
            available: 0,
            cost_price: variant.cost_price || 0
          }
        })
      }

      // 計算新的庫存數量
      let newQuantity: number

      switch (adjustment_type) {
        case 'ADD':
          newQuantity = inventory.quantity + adjustmentQuantity
          break
        case 'SUBTRACT':
          newQuantity = Math.max(0, inventory.quantity - adjustmentQuantity)
          break
        case 'SET':
          newQuantity = adjustmentQuantity
          break
        default:
          throw new Error('無效的調整類型')
      }

      // ✅ 檢查庫存不能小於已預留的數量
      if (newQuantity < inventory.reserved) {
        throw new Error(`庫存調整後 (${newQuantity}) 不能少於已預留數量 (${inventory.reserved})`)
      }

      // ✅ 更新 Inventory 表
      const updatedInventory = await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: newQuantity,
          available: newQuantity - inventory.reserved,
          updated_at: new Date()
        }
      })

      // 記錄庫存異動
      const quantityChange = newQuantity - inventory.quantity
      await tx.inventoryMovement.create({
        data: {
          variant_id,
          movement_type: 'ADJUSTMENT',
          adjustment_type,
          quantity_before: inventory.quantity,
          quantity_change: quantityChange,
          quantity_after: newQuantity,
          unit_cost: variant.cost_price || 0,
          total_cost: (variant.cost_price || 0) * Math.abs(quantityChange),
          reason: reason || '手動調整',
          notes,
          warehouse,
          created_by: session.user.id
        }
      })

      return updatedInventory
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: '庫存調整成功'
    })

  } catch (error) {
    console.error('庫存調整失敗:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '調整失敗' },
      { status: 500 }
    )
  }
}
