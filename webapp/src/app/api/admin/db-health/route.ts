import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/db-health
 * 資料庫健康檢查 - 檢查 Inventory 表內部一致性
 *
 * 檢查項目：
 * 1. Inventory 表存在性和基本統計
 * 2. 負數庫存檢查
 * 3. 庫存狀態一致性 (available + reserved = quantity)
 * 4. 孤立記錄檢查 (variant 不存在)
 * 5. 最近的庫存異動記錄
 *
 * 注意：不檢查 ProductVariant.stock_quantity，因該欄位已棄用
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

    // 2. 檢查 Inventory 內部一致性
    try {
      // 檢查負數庫存
      const negativeInventory = await prisma.inventory.count({
        where: { quantity: { lt: 0 } }
      })
      if (negativeInventory > 0) {
        results.errors.push(`Inventory 有 ${negativeInventory} 筆負數總量 (需修正)`)

        const negativeSamples = await prisma.inventory.findMany({
          where: { quantity: { lt: 0 } },
          take: 5,
          include: {
            variant: {
              select: {
                variant_code: true,
                product: { select: { name: true } }
              }
            }
          }
        })
        results.consistency.negative_samples = negativeSamples.map(inv => ({
          variant_code: inv.variant.variant_code,
          product_name: inv.variant.product.name,
          warehouse: inv.warehouse,
          quantity: inv.quantity
        }))
      }

      // 檢查 available + reserved 是否等於 quantity
      const inconsistentInventory = await prisma.$queryRaw<Array<{
        id: string
        variant_code: string
        product_name: string
        warehouse: string
        quantity: number
        available: number
        reserved: number
      }>>`
        SELECT i.id, pv.variant_code, p.name as product_name, i.warehouse,
               i.quantity, i.available, i.reserved
        FROM inventory i
        INNER JOIN product_variants pv ON i.variant_id = pv.id
        INNER JOIN products p ON pv.product_id = p.id
        WHERE i.available + i.reserved != i.quantity
        LIMIT 10
      `

      if (inconsistentInventory.length > 0) {
        results.errors.push(
          `Inventory 有 ${inconsistentInventory.length} 筆庫存狀態不一致 (available + reserved ≠ quantity)`
        )
        results.consistency.inconsistent_samples = inconsistentInventory.map(inv => ({
          variant_code: inv.variant_code,
          product_name: inv.product_name,
          warehouse: inv.warehouse,
          quantity: inv.quantity,
          available: inv.available,
          reserved: inv.reserved,
          calculated: inv.available + inv.reserved
        }))
      }

      // 檢查是否有孤立的 Inventory 記錄（variant 不存在）
      const orphanedInventory = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM inventory i
        LEFT JOIN product_variants pv ON i.variant_id = pv.id
        WHERE pv.id IS NULL
      `
      const orphanedCount = Number(orphanedInventory[0]?.count || 0)

      if (orphanedCount > 0) {
        results.errors.push(`有 ${orphanedCount} 筆 Inventory 記錄的 variant 不存在 (需清理)`)
      }

    } catch (error: any) {
      results.consistency.error = error.message
      results.errors.push('Inventory 一致性檢查失敗')
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
