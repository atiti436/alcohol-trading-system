import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

import { DEFAULT_VARIANT_TYPE, generateVariantCode } from '@/lib/variant-utils'
import { autoConvertPreorders, getVariantIdsByProductIds } from '@/lib/preorder-auto-convert'

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
      additional_costs = [] // 額外費用：[{type: 'SHIPPING', amount: 1000, description: '運費'}]
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
        const itemLossRatio = loss_quantity > 0 ? loss_quantity / actual_quantity : 0
        const itemLoss = Math.floor(item.quantity * itemLossRatio)
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
        }
      }

      // 4. 🎯 自動轉換預購單（Phase 7.1）
      // 收貨完成後，自動檢查並轉換相關的預購單
      const productIds = purchase.items
        .map(item => item.product_id)
        .filter((id): id is string => id !== null)

      let preorderConvertResult = null
      if (productIds.length > 0) {
        try {
          // 根據產品 ID 查找相關變體
          const variantIds = await getVariantIdsByProductIds(tx, productIds)

          // 自動轉換預購單
          preorderConvertResult = await autoConvertPreorders(tx, session.user.id, variantIds)
        } catch (error) {
          console.error('自動轉換預購單失敗:', error)
          // 不阻擋收貨流程，只記錄錯誤
        }
      }

      return {
        goodsReceipt,
        inventoryUpdates,
        preorderConvertResult,
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
        preorder_convert_result: result.preorderConvertResult
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