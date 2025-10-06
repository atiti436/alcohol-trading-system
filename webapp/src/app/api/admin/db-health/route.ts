import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/db-health
 * 資料庫健康檢查 - 檢查 Inventory 表和資料一致性
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const results: any = {
      timestamp: new Date().toISOString(),
      database: 'PostgreSQL',
      tables: {},
      consistency: {},
      warnings: [],
      errors: []
    }

    // 1. 檢查 Inventory 表是否存在
    try {
      const inventoryCount = await prisma.inventory.count()
      results.tables.inventory = {
        exists: true,
        count: inventoryCount,
        status: 'OK'
      }

      // 取得樣本資料
      if (inventoryCount > 0) {
        const samples = await prisma.inventory.findMany({
          take: 3,
          include: {
            variant: {
              select: {
                variant_code: true,
                product: {
                  select: { name: true }
                }
              }
            }
          }
        })
        results.tables.inventory.samples = samples.map(inv => ({
          variant_code: inv.variant.variant_code,
          product_name: inv.variant.product.name,
          warehouse: inv.warehouse,
          quantity: inv.quantity,
          available: inv.available,
          reserved: inv.reserved
        }))
      }
    } catch (error: any) {
      results.tables.inventory = {
        exists: false,
        error: error.message,
        status: 'ERROR'
      }
      results.errors.push('Inventory 表不存在或無法訪問')
    }

    // 2. 檢查 ProductVariant 表
    try {
      const variantCount = await prisma.productVariant.count()
      const totalStockQuantity = await prisma.productVariant.aggregate({
        _sum: { stock_quantity: true },
        _min: { stock_quantity: true },
        _max: { stock_quantity: true }
      })

      results.tables.product_variants = {
        exists: true,
        count: variantCount,
        total_stock: totalStockQuantity._sum.stock_quantity || 0,
        min_stock: totalStockQuantity._min.stock_quantity || 0,
        max_stock: totalStockQuantity._max.stock_quantity || 0,
        status: 'OK'
      }

      // 檢查負數庫存
      const negativeStock = await prisma.productVariant.count({
        where: { stock_quantity: { lt: 0 } }
      })
      if (negativeStock > 0) {
        results.warnings.push(`ProductVariant 有 ${negativeStock} 筆負數庫存`)

        const negativeSamples = await prisma.productVariant.findMany({
          where: { stock_quantity: { lt: 0 } },
          take: 5,
          select: {
            variant_code: true,
            stock_quantity: true,
            product: { select: { name: true } }
          }
        })
        results.tables.product_variants.negative_samples = negativeSamples
      }
    } catch (error: any) {
      results.tables.product_variants = {
        exists: false,
        error: error.message,
        status: 'ERROR'
      }
      results.errors.push('ProductVariant 表無法訪問')
    }

    // 3. 資料一致性檢查（如果兩個表都存在）
    if (results.tables.inventory?.exists && results.tables.product_variants?.exists) {
      try {
        // 檢查 Inventory 和 ProductVariant 的數量差異
        const inventoryTotal = await prisma.$queryRaw<Array<{ total: bigint }>>`
          SELECT COALESCE(SUM(quantity), 0) as total FROM inventory
        `
        const inventorySum = Number(inventoryTotal[0]?.total || 0)
        const variantSum = results.tables.product_variants.total_stock

        results.consistency.inventory_vs_variant = {
          inventory_total: inventorySum,
          variant_total: variantSum,
          difference: inventorySum - variantSum,
          status: Math.abs(inventorySum - variantSum) < 1 ? 'OK' : 'WARNING'
        }

        if (Math.abs(inventorySum - variantSum) > 0) {
          results.warnings.push(
            `Inventory 總量 (${inventorySum}) 與 ProductVariant 總量 (${variantSum}) 不一致，差異：${inventorySum - variantSum}`
          )
        }

        // 檢查缺少 Inventory 記錄的 Variant
        const variantsWithoutInventory = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count
          FROM product_variants pv
          LEFT JOIN inventory i ON i.variant_id = pv.id
          WHERE i.id IS NULL AND pv.stock_quantity != 0
        `
        const missingCount = Number(variantsWithoutInventory[0]?.count || 0)

        if (missingCount > 0) {
          results.warnings.push(`有 ${missingCount} 個 Variant 有庫存但缺少 Inventory 記錄`)

          const missingSamples = await prisma.$queryRaw<Array<{
            variant_code: string
            stock_quantity: number
            product_name: string
          }>>`
            SELECT pv.variant_code, pv.stock_quantity, p.name as product_name
            FROM product_variants pv
            LEFT JOIN inventory i ON i.variant_id = pv.id
            INNER JOIN products p ON pv.product_id = p.id
            WHERE i.id IS NULL AND pv.stock_quantity != 0
            LIMIT 5
          `
          results.consistency.missing_inventory_samples = missingSamples
        }

      } catch (error: any) {
        results.consistency.error = error.message
        results.errors.push('一致性檢查失敗')
      }
    }

    // 4. 檢查最近的庫存異動
    try {
      const recentMovements = await prisma.inventoryMovement.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        select: {
          movement_type: true,
          adjustment_type: true,
          quantity_change: true,
          warehouse: true,
          reason: true,
          created_at: true,
          variant: {
            select: {
              variant_code: true,
              product: { select: { name: true } }
            }
          }
        }
      })

      results.tables.inventory_movements = {
        exists: true,
        recent_count: recentMovements.length,
        recent_movements: recentMovements.map(m => ({
          type: m.movement_type,
          adjustment: m.adjustment_type,
          quantity_change: m.quantity_change,
          warehouse: m.warehouse,
          reason: m.reason,
          variant: `${m.variant?.product.name} (${m.variant?.variant_code})`,
          created_at: m.created_at
        }))
      }
    } catch (error: any) {
      results.tables.inventory_movements = {
        exists: false,
        error: error.message
      }
    }

    // 5. 整體健康狀態
    results.overall_health = {
      status: results.errors.length === 0 ?
        (results.warnings.length === 0 ? 'HEALTHY' : 'WARNING') :
        'ERROR',
      errors_count: results.errors.length,
      warnings_count: results.warnings.length
    }

    return NextResponse.json({
      success: true,
      data: results
    })

  } catch (error) {
    console.error('資料庫健康檢查失敗:', error)
    return NextResponse.json(
      {
        success: false,
        error: '健康檢查失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
}
