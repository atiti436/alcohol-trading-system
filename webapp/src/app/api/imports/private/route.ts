import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAppActiveUser } from '@/modules/auth/middleware/permissions'
import { Role } from '@/types/auth'
import { Decimal } from '@prisma/client/runtime/library'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * 個人倉進貨 API (簡化流程)
 * POST /api/imports/private
 *
 * 特點:
 * - 無需採購單
 * - 固定台幣 (TWD)
 * - 無海關資訊
 * - 費用直接加入成本
 */
export const POST = withAppActiveUser(async (request: NextRequest, response: NextResponse, context: any) => {
  try {
    const { session } = context

    const body = await request.json()
    const {
      supplier,
      items, // [{ variant_id, quantity, unit_price, shipping_cost?, other_cost? }]
      notes
    } = body

    // 驗證必填欄位
    if (!supplier || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: '供應商和商品項目為必填' },
        { status: 400 }
      )
    }

    // 驗證所有變體存在
    const variantIds = items.map((item: any) => item.variant_id)
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true }
    })

    if (variants.length !== variantIds.length) {
      return NextResponse.json(
        { success: false, error: '部分商品變體不存在' },
        { status: 400 }
      )
    }

    // 生成進貨單號
    const now = new Date()
    const importNumber = `PRI${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(Date.now()).slice(-4)}`

    // 計算總金額
    let totalValue = new Decimal(0)
    const itemsData = items.map((item: any) => {
      const variant = variants.find(v => v.id === item.variant_id)!
      const unitPrice = new Decimal(item.unit_price)
      const shippingCost = item.shipping_cost ? new Decimal(item.shipping_cost) : new Decimal(0)
      const otherCost = item.other_cost ? new Decimal(item.other_cost) : new Decimal(0)
      const finalCost = unitPrice.plus(shippingCost).plus(otherCost)
      const subtotal = finalCost.times(item.quantity)

      totalValue = totalValue.plus(subtotal)

      return {
        variant_id: item.variant_id,
        product_name: `${variant.product.name} - ${variant.variant_type}`,
        quantity: item.quantity,
        unit_price: unitPrice,
        shipping_cost: shippingCost,
        other_cost: otherCost,
        final_cost: finalCost,
        subtotal: subtotal
      }
    })

    // 創建進貨記錄 (使用 ImportRecord)
    const importRecord = await prisma.$transaction(async (tx) => {
      // 創建進貨單
      const record = await tx.importRecord.create({
        data: {
          import_number: importNumber,
          supplier,
          total_value: totalValue,
          currency: 'TWD',
          exchange_rate: new Decimal(1), // 台幣固定 1:1
          status: 'COMPLETED', // 個人倉直接完成,無需結算
          notes,
          // 個人倉標記 (用 declaration_number 存標記)
          declaration_number: 'PRIVATE_WAREHOUSE',
          // 無採購單
          purchase_id: null,
          purchase_number: null,
          // 無海關資訊
          declaration_date: null,
          customs_seized: 0,
          // 無稅費
          alcohol_tax: new Decimal(0),
          business_tax: new Decimal(0),
          trade_promotion_fee: new Decimal(0),
          total_taxes: new Decimal(0)
        }
      })

      // 創建進貨明細
      for (const item of itemsData) {
        await tx.importItem.create({
          data: {
            import_id: record.id,
            product_name: item.product_name,
            quantity: item.quantity,
            dutiable_value: item.subtotal,
            alcohol_tax: new Decimal(0),
            business_tax: new Decimal(0),
            tariff_code: null,
            alcohol_percentage: null,
            volume: null
          }
        })

        // ⚠️ 暫時註解：Production 資料庫缺少 Inventory 表
        // TODO: 執行 prisma db push 後取消註解
        /*
        // 更新庫存 (個人倉) - 使用新的獨立 Inventory 表
        const existingStock = await tx.inventory.findUnique({
          where: {
            variant_id_warehouse: {
              variant_id: item.variant_id,
              warehouse: 'PRIVATE'
            }
          }
        })

        if (existingStock) {
          // 更新現有庫存 (加權平均成本)
          const oldTotalCost = existingStock.cost_price.times(existingStock.quantity)
          const newTotalCost = item.final_cost.times(item.quantity)
          const totalQuantity = existingStock.quantity + item.quantity
          const avgCost = oldTotalCost.plus(newTotalCost).dividedBy(totalQuantity)

          await tx.inventory.update({
            where: { id: existingStock.id },
            data: {
              quantity: totalQuantity,
              available: totalQuantity - existingStock.reserved, // 更新可售庫存
              cost_price: avgCost
            }
          })
        } else {
          // 創建新庫存
          await tx.inventory.create({
            data: {
              variant_id: item.variant_id,
              warehouse: 'PRIVATE',
              quantity: item.quantity,
              available: item.quantity, // 初始可售 = 總數
              cost_price: item.final_cost
            }
          })
        }
        */

        // 記錄庫存異動
        await tx.inventoryMovement.create({
          data: {
            variant_id: item.variant_id,
            movement_type: 'IMPORT',
            quantity: item.quantity,
            reference_type: 'PRIVATE_IMPORT',
            reference_id: record.id,
            notes: `個人倉進貨 - ${importNumber}`
          }
        })
      }

      return record
    })

    // 查詢完整資料返回
    const fullRecord = await prisma.importRecord.findUnique({
      where: { id: importRecord.id },
      include: {
        items: true,
        _count: { select: { items: true } }
      }
    })

    return NextResponse.json({
      success: true,
      data: fullRecord,
      message: '個人倉進貨成功'
    })

  } catch (error) {
    console.error('個人倉進貨失敗:', error)
    return NextResponse.json(
      { success: false, error: '個人倉進貨失敗' },
      { status: 500 }
    )
  }
}, [Role.SUPER_ADMIN]) // 只有 SUPER_ADMIN 可以操作個人倉
