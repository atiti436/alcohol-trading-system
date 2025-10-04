import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

import { DEFAULT_VARIANT_TYPE, generateVariantCode } from '@/lib/variant-utils'
import { autoConvertPreorders, getVariantIdsByProductIds } from '@/lib/preorder-auto-convert'
import { transferDamagedGoods } from '@/lib/damage-transfer'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * 🏭 Room-3: 採購進貨收貨 API
 * POST /api/purchases/[id]/receive - 處理採購進貨，更新庫存
 * 核心業務邏輯：採購確認後的實際收貨和庫存入庫流程
 */

// POST /api/purchases/[id]/receive - 收貨並更新庫存
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 權限檢查 - 只有SUPER_ADMIN和EMPLOYEE可以進行收貨
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const purchaseId = params.id
    const body = await request.json()

    const {
      actual_quantity, // 實際收到數量
      exchange_rate, // 實際匯率
      loss_type = 'NONE', // 損耗類型：NONE, DAMAGE, SHORTAGE, CUSTOM
      loss_quantity = 0, // 損耗數量
      inspection_fee = 0, // 檢驗費
      allocation_method = 'BY_AMOUNT', // 分攤方式：BY_AMOUNT, BY_QUANTITY, BY_WEIGHT
      additional_costs = [], // 額外費用：[{type: 'SHIPPING', amount: 1000, description: '運費'}]
      preorder_mode = 'AUTO', // 預購單處理模式：AUTO(自動轉換), MANUAL(手動分配), SKIP(跳過)
      item_damages = [] // 逐商品毀損明細：[{product_id: '...', damaged_quantity: 2}]
    } = body

    // 檢查採購單是否存在且已確認
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    if (!purchase) {
      return NextResponse.json({ error: '採購單不存在' }, { status: 404 })
    }

    if (purchase.status !== 'CONFIRMED') {
      return NextResponse.json({
        error: `採購單狀態為 ${purchase.status}，必須先確認採購單才能收貨`
      }, { status: 400 })
    }

    // 驗證收貨數量
    if (!actual_quantity || actual_quantity <= 0) {
      return NextResponse.json({ error: '實際收貨數量必須大於0' }, { status: 400 })
    }

    if (loss_quantity < 0 || loss_quantity >= actual_quantity) {
      return NextResponse.json({ error: '損耗數量不能為負數或大於等於收貨數量' }, { status: 400 })
    }

    // 驗證匯率
    if (!exchange_rate || exchange_rate <= 0) {
      return NextResponse.json({ error: '實際匯率必須大於0' }, { status: 400 })
    }

    // 使用資料庫交易確保數據一致性
    const result = await prisma.$transaction(async (tx) => {
      // 1. 建立收貨記錄
      const total_cost = purchase.items.reduce((sum, item) =>
        sum + (item.quantity * item.unit_price), 0
      ) * exchange_rate + inspection_fee + additional_costs.reduce((sum: number, cost: any) => sum + cost.amount, 0)

      const goodsReceipt = await tx.goodsReceipt.create({
        data: {
          purchase_id: purchaseId,
          actual_quantity,
          exchange_rate,
          loss_type,
          loss_quantity,
          inspection_fee,
          allocation_method,
          total_cost,
          additional_costs: {
            create: additional_costs.map((cost: any) => ({
              type: cost.type,
              amount: cost.amount,
              description: cost.description || ''
            }))
          }
        },
        include: {
          additional_costs: true
        }
      })

      // 2. 更新採購單狀態為已收貨
      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: 'RECEIVED',
          received_date: new Date()
        }
      })

      // 3. 建立商品毀損數量對照表
      const damageMap = new Map<string, number>()
      for (const damage of item_damages) {
        if (damage.product_id && damage.damaged_quantity > 0) {
          damageMap.set(damage.product_id, damage.damaged_quantity)
        }
      }

      // 3. 處理每個採購項目的庫存更新
      const inventoryUpdates = []

      for (const item of purchase.items) {
        // 計算該項目的實際成本（包含分攤）
        let itemCost = item.unit_price * exchange_rate

        // 根據分攤方式計算額外成本分攤
        const totalAdditionalCost = inspection_fee + additional_costs.reduce((sum: number, cost: any) => sum + cost.amount, 0)
        let itemAdditionalCost = 0

        switch (allocation_method) {
          case 'BY_AMOUNT':
            const itemAmountRatio = (item.quantity * item.unit_price) / purchase.total_amount
            itemAdditionalCost = totalAdditionalCost * itemAmountRatio
            break
          case 'BY_QUANTITY':
            const totalQuantity = purchase.items.reduce((sum, i) => sum + i.quantity, 0)
            itemAdditionalCost = totalAdditionalCost * (item.quantity / totalQuantity)
            break
          case 'BY_WEIGHT':
            if (item.weight_kg) {
              const totalWeight = purchase.items.reduce((sum, i) => sum + (i.weight_kg || 0), 0)
              itemAdditionalCost = totalWeight > 0 ? totalAdditionalCost * (item.weight_kg / totalWeight) : 0
            } else {
              // 如果沒有重量資料，退回按數量分攤
              const totalQuantity = purchase.items.reduce((sum, i) => sum + i.quantity, 0)
              itemAdditionalCost = totalAdditionalCost * (item.quantity / totalQuantity)
            }
            break
        }

        const finalUnitCost = itemCost + (itemAdditionalCost / item.quantity)

        // 計算實際入庫數量（扣除損耗）
        // 優先使用逐商品毀損明細，否則按比例分攤總損耗
        let itemLoss = 0
        if (item.product_id && damageMap.has(item.product_id)) {
          // 使用精確的商品毀損數量
          itemLoss = damageMap.get(item.product_id) || 0
        } else {
          // 按比例分攤總損耗（向下取整）
          const itemLossRatio = loss_quantity > 0 ? loss_quantity / actual_quantity : 0
          itemLoss = Math.floor(item.quantity * itemLossRatio)
        }

        const actualStockIncrease = item.quantity - itemLoss

        if (actualStockIncrease > 0) {
          // 查找或創建產品變體
          let variant = null

          if (item.product_id) {
          const targetVariantType = DEFAULT_VARIANT_TYPE
            // 尋找現有的A類變體（正常品）
            variant = await tx.productVariant.findFirst({
              where: {
                product_id: item.product_id,
                variant_type: targetVariantType
              }
            })

            if (!variant) {
              // 創建新的A類變體
              const productCode = item.product?.product_code || 'P001'
              const variantCode = await generateVariantCode(tx, item.product_id, productCode, targetVariantType)
              const sku = `SKU-${variantCode}`

              variant = await tx.productVariant.create({
                data: {
                  product_id: item.product_id,
                  variant_code: variantCode,
                  sku,
                  variant_type: targetVariantType,
                  description: `${item.product_name} - ${targetVariantType}`,
                  base_price: item.product?.standard_price || item.unit_price * exchange_rate,
                  current_price: item.product?.current_price || item.unit_price * exchange_rate,
                  cost_price: finalUnitCost,
                  stock_quantity: 0,
                  reserved_stock: 0,
                  available_stock: 0,
                  weight_kg: item.weight_kg || 0
                }
              })
            }

            // 更新變體庫存和成本
            await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                stock_quantity: { increment: actualStockIncrease },
                available_stock: { increment: actualStockIncrease },
                cost_price: finalUnitCost // 更新最新成本價
              }
            })

            // 更新產品的成本價
            await tx.product.update({
              where: { id: item.product_id },
              data: {
                cost_price: finalUnitCost
              }
            })
          }

          // 🏭 更新或創建 Inventory 記錄（公司倉）
          let inventory = await tx.inventory.findFirst({
            where: {
              variant_id: variant?.id,
              warehouse: 'COMPANY'
            }
          })

          if (!inventory) {
            // 創建公司倉庫存記錄
            inventory = await tx.inventory.create({
              data: {
                variant_id: variant?.id || '',
                warehouse: 'COMPANY',
                quantity: actualStockIncrease,
                reserved: 0,
                available: actualStockIncrease,
                cost_price: finalUnitCost
              }
            })
          } else {
            // 更新公司倉庫存
            await tx.inventory.update({
              where: { id: inventory.id },
              data: {
                quantity: { increment: actualStockIncrease },
                available: { increment: actualStockIncrease },
                cost_price: finalUnitCost
              }
            })
          }

          // 建立庫存異動記錄
          await tx.inventoryMovement.create({
            data: {
              variant_id: variant?.id || '',
              movement_type: 'PURCHASE',
              adjustment_type: 'ADD',
              quantity_before: inventory.quantity - actualStockIncrease,
              quantity_change: actualStockIncrease,
              quantity_after: inventory.quantity,
              unit_cost: finalUnitCost,
              total_cost: finalUnitCost * actualStockIncrease,
              reason: `採購進貨 - ${purchase.purchase_number}`,
              reference_type: 'PURCHASE',
              reference_id: purchaseId,
              notes: loss_quantity > 0 ? `損耗 ${itemLoss} 件 (${loss_type})` : '正常進貨',
              warehouse: 'COMPANY',
              created_by: session.user.id
            }
          })

          inventoryUpdates.push({
            item_name: item.product_name,
            ordered_quantity: item.quantity,
            received_quantity: actualStockIncrease,
            loss_quantity: itemLoss,
            unit_cost: finalUnitCost,
            total_cost: finalUnitCost * actualStockIncrease,
            variant_id: variant?.id
          })

          // 🔧 如果有毀損，調撥到盒損變體（00X）- Phase 4
          if (itemLoss > 0 && variant) {
            try {
              const damageResult = await transferDamagedGoods(
                tx,
                variant.id,
                itemLoss,
                session.user.id,
                purchaseId,
                `進貨毀損 - ${loss_type}`
              )

              inventoryUpdates[inventoryUpdates.length - 1].damageTransfer = {
                damagedQuantity: itemLoss,
                damagedVariantCode: damageResult.damagedVariantCode,
                message: damageResult.message
              }
            } catch (error) {
              console.error('毀損調撥失敗:', error)
              // 不阻擋收貨流程，只記錄錯誤
            }
          }
        }
      }

      // 4. 🔄 優先處理缺貨補單（Phase 5.2）
      // 收貨完成後，優先檢查並補足 BACKORDER
      const productIds = purchase.items
        .map(item => item.product_id)
        .filter((id): id is string => id !== null)

      let backorderResolveResult: any = null
      if (productIds.length > 0) {
        try {
          const variantIds = await getVariantIdsByProductIds(tx, productIds)

          // 查詢待補貨的 BACKORDER
          const pendingBackorders = await tx.backorderTracking.findMany({
            where: {
              variant_id: { in: variantIds },
              status: 'PENDING'
            },
            include: {
              sale: {
                include: {
                  customer: true
                }
              },
              variant: true
            },
            orderBy: [
              { priority: 'desc' }, // 優先級高的優先
              { created_at: 'asc' } // 時間早的優先
            ]
          })

          const resolved: any[] = []
          const partiallyResolved: any[] = []

          for (const backorder of pendingBackorders) {
            // 檢查該變體的可用庫存
            const inventories = await tx.inventory.findMany({
              where: {
                variant_id: backorder.variant_id,
                available: { gt: 0 }
              },
              orderBy: { created_at: 'asc' }
            })

            const availableStock = inventories.reduce((sum, inv) => sum + inv.available, 0)

            if (availableStock >= backorder.shortage_quantity) {
              // 庫存充足，預留並解決缺貨
              let remainingToReserve = backorder.shortage_quantity

              for (const inv of inventories) {
                if (remainingToReserve <= 0) break

                const toReserve = Math.min(inv.available, remainingToReserve)

                await tx.inventory.update({
                  where: { id: inv.id },
                  data: {
                    available: inv.available - toReserve,
                    reserved: inv.reserved + toReserve
                  }
                })

                remainingToReserve -= toReserve
              }

              // 標記缺貨已解決
              await tx.backorderTracking.update({
                where: { id: backorder.id },
                data: {
                  status: 'RESOLVED',
                  resolved_at: new Date(),
                  resolved_by: session.user.id,
                  notes: `${backorder.notes}\n自動補貨完成 - 進貨單 ${purchase.purchase_number}`
                }
              })

              // 如果訂單是部分確認，更新為完全確認
              if (backorder.sale.status === 'PARTIALLY_CONFIRMED') {
                await tx.sale.update({
                  where: { id: backorder.sale_id },
                  data: {
                    status: 'CONFIRMED',
                    shortage_quantity: 0,
                    allocation_notes: `${backorder.sale.allocation_notes}\n補貨完成`
                  }
                })
              }

              resolved.push({
                backorderId: backorder.id,
                saleNumber: backorder.sale.sale_number,
                customerName: backorder.sale.customer.name,
                quantity: backorder.shortage_quantity,
                variantCode: backorder.variant.variant_code
              })
            } else if (availableStock > 0) {
              // 部分補貨
              let remainingToReserve = availableStock

              for (const inv of inventories) {
                if (remainingToReserve <= 0) break

                const toReserve = Math.min(inv.available, remainingToReserve)

                await tx.inventory.update({
                  where: { id: inv.id },
                  data: {
                    available: inv.available - toReserve,
                    reserved: inv.reserved + toReserve
                  }
                })

                remainingToReserve -= toReserve
              }

              // 更新缺貨數量
              await tx.backorderTracking.update({
                where: { id: backorder.id },
                data: {
                  shortage_quantity: backorder.shortage_quantity - availableStock,
                  notes: `${backorder.notes}\n部分補貨 ${availableStock} 個 - 進貨單 ${purchase.purchase_number}`
                }
              })

              partiallyResolved.push({
                backorderId: backorder.id,
                saleNumber: backorder.sale.sale_number,
                customerName: backorder.sale.customer.name,
                resolvedQuantity: availableStock,
                remainingShortage: backorder.shortage_quantity - availableStock,
                variantCode: backorder.variant.variant_code
              })
            }
          }

          if (resolved.length > 0 || partiallyResolved.length > 0) {
            backorderResolveResult = {
              resolved,
              partiallyResolved
            }
          }
        } catch (error) {
          console.error('補貨處理失敗:', error)
          // 不阻擋收貨流程
        }
      }

      // 5. 🎯 預購單處理（Phase 7.1）
      // 根據 preorder_mode 決定處理方式
      let preorderConvertResult = null
      let variantsWithPreorders: any[] = []

      if (productIds.length > 0 && preorder_mode !== 'SKIP') {
        try {
          // 根據產品 ID 查找相關變體
          const variantIds = await getVariantIdsByProductIds(tx, productIds)

          if (preorder_mode === 'AUTO') {
            // 自動模式：直接轉換預購單
            preorderConvertResult = await autoConvertPreorders(tx, session.user.id, variantIds)
          } else if (preorder_mode === 'MANUAL') {
            // 手動模式：查詢有預購單的變體，返回給前端手動分配
            const variantsData = await tx.productVariant.findMany({
              where: {
                id: { in: variantIds }
              },
              include: {
                product: {
                  select: {
                    id: true,
                    name: true
                  }
                },
                inventory: {
                  select: {
                    available: true
                  }
                }
              }
            })

            // 查詢每個變體的預購單情況
            for (const variant of variantsData) {
              const preorders = await tx.sale.findMany({
                where: {
                  status: 'PREORDER',
                  items: {
                    some: {
                      variant_id: variant.id
                    }
                  }
                },
                include: {
                  items: {
                    where: {
                      variant_id: variant.id
                    },
                    select: {
                      quantity: true
                    }
                  }
                }
              })

              if (preorders.length > 0) {
                const totalAvailable = variant.inventory.reduce((sum, inv) => sum + inv.available, 0)
                const totalRequested = preorders.reduce((sum, sale) =>
                  sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
                )

                variantsWithPreorders.push({
                  variant_id: variant.id,
                  variant_code: variant.variant_code,
                  variant_name: `${variant.product.name} - ${variant.variant_type}`,
                  available_stock: totalAvailable,
                  preorder_count: preorders.length,
                  total_requested: totalRequested
                })
              }
            }
          }
        } catch (error) {
          console.error('預購單處理失敗:', error)
          // 不阻擋收貨流程，只記錄錯誤
        }
      }

      return {
        goodsReceipt,
        inventoryUpdates,
        backorderResolveResult,
        preorderConvertResult,
        variantsWithPreorders, // 手動模式時返回待分配變體列表
        purchase: await tx.purchase.findUnique({
          where: { id: purchaseId },
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        })
      }
    })

    // 組合訊息
    let message = '收貨完成，庫存已更新'

    // 補貨訊息
    if (result.backorderResolveResult) {
      const { resolved, partiallyResolved } = result.backorderResolveResult
      if (resolved && resolved.length > 0) {
        message += `，並自動補足了 ${resolved.length} 筆缺貨`
      }
      if (partiallyResolved && partiallyResolved.length > 0) {
        message += `，部分補足了 ${partiallyResolved.length} 筆缺貨`
      }
    }

    // 預購轉換訊息
    if (result.preorderConvertResult) {
      const { success, warnings, failed } = result.preorderConvertResult
      const totalConverted = success.length + warnings.length
      if (totalConverted > 0) {
        message += `，並自動轉換了 ${totalConverted} 筆預購單`
      }
      if (failed.length > 0) {
        message += `（${failed.length} 筆因庫存不足未轉換）`
      }
    }

    return NextResponse.json({
      success: true,
      message,
      data: {
        goods_receipt_id: result.goodsReceipt.id,
        purchase_status: result.purchase?.status,
        inventory_updates: result.inventoryUpdates,
        total_cost: result.goodsReceipt.total_cost,
        received_date: result.purchase?.received_date,
        backorder_resolve_result: result.backorderResolveResult,
        preorder_convert_result: result.preorderConvertResult,
        variants_with_preorders: result.variantsWithPreorders, // 手動模式時有值
        preorder_mode // 返回模式，前端判斷是否需要彈出分配對話框
      }
    })

  } catch (error) {
    console.error('收貨處理失敗:', error)
    return NextResponse.json(
      {
        error: '收貨處理失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
}

// GET /api/purchases/[id]/receive - 獲取收貨狀態
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

    // 查詢採購單和收貨記錄
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
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
        receipts: {
          include: {
            additional_costs: true
          }
        }
      }
    })

    if (!purchase) {
      return NextResponse.json({ error: '採購單不存在' }, { status: 404 })
    }

    // 🔒 權限檢查 - 投資方只能看自己相關的採購
    if (session.user.role === 'INVESTOR') {
      if (purchase.funding_source === 'PERSONAL' ||
          (purchase.created_by !== session.user.id)) {
        return NextResponse.json({ error: '權限不足' }, { status: 403 })
      }
    }

    // 計算收貨狀態
    const canReceive = purchase.status === 'CONFIRMED'
    const isReceived = purchase.status === 'RECEIVED'
    const totalOrderedQuantity = purchase.items.reduce((sum, item) => sum + item.quantity, 0)

    return NextResponse.json({
      success: true,
      data: {
        purchase_id: purchase.id,
        purchase_number: purchase.purchase_number,
        status: purchase.status,
        can_receive: canReceive,
        is_received: isReceived,
        total_ordered_quantity: totalOrderedQuantity,
        supplier: purchase.supplier,
        currency: purchase.currency,
        exchange_rate: purchase.exchange_rate,
        items: purchase.items,
        receipts: purchase.receipts
      }
    })

  } catch (error) {
    console.error('收貨狀態查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}