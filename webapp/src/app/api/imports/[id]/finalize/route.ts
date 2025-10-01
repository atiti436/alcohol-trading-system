import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAppActiveUser } from '@/modules/auth/middleware/permissions'
import { Role } from '@/types/auth'
import { Decimal } from '@prisma/client/runtime/library'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * 結算進貨單 (含成本回溯調整)
 * POST /api/imports/[id]/finalize
 *
 * 功能:
 * 1. 計算最終成本（商品總價 + 關稅 + 所有延後費用）
 * 2. 更新剩餘庫存成本
 * 3. 🔄 回溯調整已售出商品的成本與利潤
 * 4. 建立成本調整歷史記錄
 * 5. 發送通知給 SUPER_ADMIN
 */
export const POST = withAppActiveUser(async (request: NextRequest, response: NextResponse, context: any) => {
  try {
    const { params, session } = context
    const importId = params.id

    // 查詢進貨單（含明細和費用）
    const importRecord = await prisma.importRecord.findUnique({
      where: { id: importId },
      include: {
        items: true
      }
    })

    if (!importRecord) {
      return NextResponse.json(
        { success: false, error: '進貨單不存在' },
        { status: 404 }
      )
    }

    // 檢查是否已結算
    if (importRecord.cost_status === 'FINALIZED') {
      return NextResponse.json(
        { success: false, error: '進貨單已結算' },
        { status: 400 }
      )
    }

    // 查詢所有費用
    const costs = await prisma.importCost.findMany({
      where: { import_id: importId }
    })

    // 計算費用總計
    const totalAdditionalCost = costs.reduce((sum, cost) =>
      sum.plus(cost.amount), new Decimal(0)
    )

    // 計算最終成本
    const baseCost = importRecord.total_value
    const totalTaxes = importRecord.total_taxes
    const finalTotalCost = baseCost.plus(totalTaxes).plus(totalAdditionalCost)

    // 計算每瓶平均成本 (考慮海關抽驗)
    const totalQuantity = importRecord.items.reduce((sum, item) => sum + item.quantity, 0)
    const customsSeized = importRecord.customs_seized || 0
    const actualQuantity = totalQuantity - customsSeized

    if (actualQuantity <= 0) {
      return NextResponse.json(
        { success: false, error: '實收數量必須大於 0' },
        { status: 400 }
      )
    }

    const finalCostPerUnit = finalTotalCost.dividedBy(actualQuantity)

    // 使用 Transaction 執行所有更新
    const result = await prisma.$transaction(async (tx) => {
      // 1. 更新進貨單狀態
      const updatedImport = await tx.importRecord.update({
        where: { id: importId },
        data: {
          cost_status: 'FINALIZED',
          status: 'COMPLETED'
        }
      })

      // 2. 查詢此進貨單相關的庫存記錄
      // (假設我們透過 InventoryMovement 追蹤進貨來源)
      const inventoryMovements = await tx.inventoryMovement.findMany({
        where: {
          reference_type: 'IMPORT',
          reference_id: importId
        }
      })

      const affectedVariantIds = [...new Set(inventoryMovements.map(m => m.variant_id))]

      // 3. 更新剩餘庫存成本 (加權平均) - 使用新的獨立 Inventory 表
      for (const variantId of affectedVariantIds) {
        // 同時更新公司倉和個人倉的庫存
        const inventories = await tx.inventory.findMany({
          where: {
            variant_id: variantId
          }
        })

        for (const inv of inventories) {
          if (inv.quantity > 0) {
            // 更新庫存成本為最終成本
            await tx.inventory.update({
              where: { id: inv.id },
              data: {
                cost_price: finalCostPerUnit
              }
            })
          }
        }
      }

      // 4. 🔄 回溯調整已售出商品的成本與利潤
      // 查詢已售出的商品 (透過 InventoryMovement 找 SALE 類型)
      const soldMovements = await tx.inventoryMovement.findMany({
        where: {
          variant_id: { in: affectedVariantIds },
          movement_type: 'SALE',
          created_at: { gte: importRecord.created_at } // 只調整進貨後的銷售
        }
      })

      let totalAdjustment = new Decimal(0)
      let affectedSalesCount = 0

      for (const movement of soldMovements) {
        // 查詢對應的銷售明細
        const saleItem = await tx.saleItem.findFirst({
          where: {
            // 假設 SaleItem 有 variant_id 和 sale_id
            // 需要根據實際 Schema 調整查詢條件
            sale_id: movement.reference_id,
            // variant_id: movement.variant_id (如果有的話)
          }
        })

        if (saleItem) {
          const oldCost = saleItem.cost_price || new Decimal(0)
          const costDiff = finalCostPerUnit.minus(oldCost)

          // 更新銷售明細
          await tx.saleItem.update({
            where: { id: saleItem.id },
            data: {
              cost_price: finalCostPerUnit,
              profit: new Decimal(saleItem.sale_price).minus(finalCostPerUnit)
            }
          })

          totalAdjustment = totalAdjustment.plus(costDiff.times(saleItem.quantity))
          affectedSalesCount++
        }
      }

      // 5. 建立成本調整歷史記錄
      const adjustmentLog = await tx.costAdjustmentLog.create({
        data: {
          import_id: importId,
          affected_sales_count: affectedSalesCount,
          total_cost_adjustment: totalAdjustment,
          old_average_cost: baseCost.dividedBy(actualQuantity),
          new_average_cost: finalCostPerUnit,
          notes: `進貨單 ${importRecord.import_number} 結算，最終成本 ${finalCostPerUnit.toFixed(2)}`
        }
      })

      // 6. 發送通知給 SUPER_ADMIN
      await tx.notification.create({
        data: {
          user_id: session.user.id,
          type: 'IMPORT_FINALIZED',
          title: '進貨單已結算',
          message: `進貨單 ${importRecord.import_number} 已結算完成。\n` +
                   `最終成本: ${finalCostPerUnit.toFixed(2)}/單位\n` +
                   `已調整 ${affectedSalesCount} 筆銷售記錄`,
          link: `/imports/${importId}`,
          priority: 'MEDIUM'
        }
      })

      return {
        import: updatedImport,
        adjustment_log: adjustmentLog,
        summary: {
          base_cost: baseCost,
          total_taxes: totalTaxes,
          total_additional_cost: totalAdditionalCost,
          final_total_cost: finalTotalCost,
          actual_quantity: actualQuantity,
          final_cost_per_unit: finalCostPerUnit,
          affected_sales_count: affectedSalesCount,
          total_cost_adjustment: totalAdjustment
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: '進貨單結算成功'
    })

  } catch (error) {
    console.error('進貨單結算失敗:', error)
    return NextResponse.json(
      { success: false, error: '進貨單結算失敗: ' + (error as Error).message },
      { status: 500 }
    )
  }
}, [Role.SUPER_ADMIN])

/**
 * 查詢結算詳情
 * GET /api/imports/[id]/finalize
 */
export const GET = withAppActiveUser(async (request: NextRequest, response: NextResponse, context: any) => {
  try {
    const { params } = context
    const importId = params.id

    // 查詢成本調整記錄
    const adjustmentLog = await prisma.costAdjustmentLog.findFirst({
      where: { import_id: importId },
      orderBy: { created_at: 'desc' }
    })

    if (!adjustmentLog) {
      return NextResponse.json(
        { success: false, error: '尚未結算或無調整記錄' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: adjustmentLog
    })

  } catch (error) {
    console.error('查詢結算詳情失敗:', error)
    return NextResponse.json(
      { success: false, error: '查詢結算詳情失敗' },
      { status: 500 }
    )
  }
}, [Role.SUPER_ADMIN, Role.EMPLOYEE])
