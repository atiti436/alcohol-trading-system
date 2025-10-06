import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * 🏭 Room-3: 單一採購單管理 API
 * GET /api/purchases/[id] - 採購單詳情
 * PUT /api/purchases/[id] - 更新採購單
 * DELETE /api/purchases/[id] - 刪除採購單
 */

// GET /api/purchases/[id] - 採購單詳情
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

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        creator: {
          select: {
            investor_id: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                product_code: true,
                name: true,
                category: true,
                standard_price: true
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
          (purchase.creator?.investor_id && purchase.creator.investor_id !== session.user.investor_id)) {
        return NextResponse.json({ error: '權限不足' }, { status: 403 })
      }

      // 🔒 數據過濾 - 投資方看到調整後的金額
      const filteredPurchase = {
        ...purchase,
        // 投資方不應該看到可能被調整的總額，直接顯示原始總額
        total_amount: purchase.total_amount,
        items: purchase.items.map(item => ({
          ...item,
          // 隱藏敏感財務資訊
          dutiable_value: null,
        })),
        receipts: purchase.receipts.map(receipt => ({
          ...receipt,
          additional_costs: [] // 隱藏額外費用明細
        }))
      }

      return NextResponse.json({
        success: true,
        data: filteredPurchase
      })
    }

    return NextResponse.json({
      success: true,
      data: purchase
    })

  } catch (error) {
    console.error('採購單詳情查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}

// PUT /api/purchases/[id] - 更新採購單
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 權限檢查 - 只有SUPER_ADMIN和EMPLOYEE可以更新採購單
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const purchaseId = params.id
    const body = await request.json()

    // 檢查採購單是否存在
    const existingPurchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: true }
    })

    if (!existingPurchase) {
      return NextResponse.json({ error: '採購單不存在' }, { status: 404 })
    }

    // 檢查狀態 - 已完成的採購單不能修改
    if (existingPurchase.status === 'COMPLETED') {
      return NextResponse.json({
        error: '已完成的採購單不能修改'
      }, { status: 400 })
    }

    const {
      supplier,
      currency,
      exchange_rate,
      declaration_number,
      declaration_date,
      notes,
      status,
      items = []
    } = body

    // 準備更新資料
    const updateData: any = {}

    // 基本欄位更新
    if (supplier !== undefined) updateData.supplier = supplier
    if (currency !== undefined) updateData.currency = currency
    if (exchange_rate !== undefined) {
      if (exchange_rate <= 0) {
        return NextResponse.json({ error: '匯率必須大於0' }, { status: 400 })
      }
      updateData.exchange_rate = parseFloat(exchange_rate)
    }
    if (declaration_number !== undefined) updateData.declaration_number = declaration_number
    if (declaration_date !== undefined) {
      updateData.declaration_date = declaration_date ? new Date(declaration_date) : null
    }
    if (notes !== undefined) updateData.notes = notes
    if (status !== undefined) updateData.status = status

    // 如果有更新採購明細
    if (items.length > 0) {
      // 重新計算總金額
      let total_amount = 0
      const validatedItems: any[] = []

      for (const item of items) {
        if (!item.product_name || !item.quantity || !item.unit_price) {
          return NextResponse.json({
            error: '採購項目缺少必要資訊：產品名稱、數量、單價'
          }, { status: 400 })
        }

        const itemTotal = item.quantity * item.unit_price
        total_amount += itemTotal

        validatedItems.push({
          id: item.id || undefined, // 如果有ID就是更新，沒有就是新增
          product_id: item.product_id || null,
          product_name: item.product_name,
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price),
          total_price: itemTotal,
          dutiable_value: item.dutiable_value ? parseFloat(item.dutiable_value) : null,
          tariff_code: item.tariff_code || null,
          import_duty_rate: item.import_duty_rate ? parseFloat(item.import_duty_rate) : null,
          alc_percentage: item.alc_percentage ? parseFloat(item.alc_percentage) : null,
          volume_ml: item.volume_ml ? parseInt(item.volume_ml) : null,
          weight_kg: item.weight_kg ? parseFloat(item.weight_kg) : null
        })
      }

      updateData.total_amount = total_amount

      // 使用 transaction 確保數據一致性
      const updatedPurchase = await prisma.$transaction(async (prisma) => {
        // 先刪除舊的採購明細
        await prisma.purchaseItem.deleteMany({
          where: { purchase_id: purchaseId }
        })

        // 更新採購單並新增明細
        return await prisma.purchase.update({
          where: { id: purchaseId },
          data: {
            ...updateData,
            items: {
              create: validatedItems
            }
          },
          include: {
            items: true,
            _count: {
              select: {
                items: true
              }
            }
          }
        })
      })

      return NextResponse.json({
        success: true,
        data: updatedPurchase,
        message: '採購單更新成功'
      })
    } else {
      // 只更新基本資訊，不動明細
      const updatedPurchase = await prisma.purchase.update({
        where: { id: purchaseId },
        data: updateData,
        include: {
          items: true,
          _count: {
            select: {
              items: true
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        data: updatedPurchase,
        message: '採購單更新成功'
      })
    }

  } catch (error) {
    console.error('採購單更新失敗:', error)
    return NextResponse.json(
      { error: '更新失敗', details: error },
      { status: 500 }
    )
  }
}

// DELETE /api/purchases/[id] - 刪除採購單（級聯刪除所有相關資料）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 權限檢查 - 只有SUPER_ADMIN可以刪除採購單
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const purchaseId = params.id

    // 檢查採購單是否存在
    const existingPurchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        receipts: true,
        Import: true, // ✅ 正確：schema 中是 Import（大寫）
        items: true
      }
    })

    if (!existingPurchase) {
      return NextResponse.json({ error: '採購單不存在' }, { status: 404 })
    }

    // 使用事務進行級聯刪除
    await prisma.$transaction(async (tx) => {
      // 1. 查找所有庫存異動記錄
      const inventoryMovements = await tx.inventoryMovement.findMany({
        where: {
          reference_type: 'PURCHASE',
          reference_id: purchaseId
        }
      })

      console.log(`[刪除採購單] 採購單ID: ${purchaseId}`)
      console.log(`[刪除採購單] 找到 ${inventoryMovements.length} 筆庫存異動記錄`)
      inventoryMovements.forEach(m => {
        console.log(`  - variant: ${m.variant_id}, 倉庫: ${m.warehouse}, 數量變化: ${m.quantity_change}`)
      })

      // 2. 回滾庫存（如果已收貨）
      for (const movement of inventoryMovements) {
        if (movement.variant_id && movement.quantity_change > 0) {
          console.log(`  → 開始回滾 variant ${movement.variant_id}，數量: -${movement.quantity_change}`)

          // 回滾 Inventory 表
          const inventory = await tx.inventory.findFirst({
            where: {
              variant_id: movement.variant_id,
              warehouse: movement.warehouse
            }
          })

          if (inventory) {
            console.log(`    - 找到 Inventory，現有庫存: ${inventory.quantity}`)
            await tx.inventory.update({
              where: { id: inventory.id },
              data: {
                quantity: {
                  decrement: movement.quantity_change
                },
                available: {
                  decrement: movement.quantity_change
                }
              }
            })
            console.log(`    - Inventory 已更新: ${inventory.quantity} → ${inventory.quantity - movement.quantity_change}`)
          } else {
            console.log(`    ⚠️ 找不到 Inventory 記錄！`)
          }

          // 回滾 ProductVariant 表
          await tx.productVariant.update({
            where: { id: movement.variant_id },
            data: {
              stock_quantity: {
                decrement: movement.quantity_change
              },
              available_stock: {
                decrement: movement.quantity_change
              }
            }
          })
          console.log(`    - ProductVariant 已更新`)
        }
      }

      // 3. 刪除庫存異動記錄
      await tx.inventoryMovement.deleteMany({
        where: {
          reference_type: 'PURCHASE',
          reference_id: purchaseId
        }
      })

      // 4. 刪除收貨單（GoodsReceipt 會級聯刪除 AdditionalCost）
      await tx.goodsReceipt.deleteMany({
        where: { purchase_id: purchaseId }
      })

      // 5. 刪除新版進貨單（Import）
      const imports = await tx.import.findMany({
        where: { purchase_id: purchaseId }
      })

      for (const importRecord of imports) {
        // 先刪除進貨明細（ImportItem 會被級聯刪除）
        // 先刪除進貨費用（ImportCost）
        await tx.importCost.deleteMany({
          where: { import_id: importRecord.id }
        })

        // 刪除成本調整記錄
        await tx.costAdjustmentLog.deleteMany({
          where: { import_id: importRecord.id }
        })

        // 刪除進貨單本身（ImportItem 會級聯刪除）
        await tx.import.delete({
          where: { id: importRecord.id }
        })
      }

      // 6. 刪除採購明細（PurchaseItem 會級聯刪除）
      await tx.purchaseItem.deleteMany({
        where: { purchase_id: purchaseId }
      })

      // 7. 最後刪除採購單
      await tx.purchase.delete({
        where: { id: purchaseId }
      })
    })

    return NextResponse.json({
      success: true,
      message: '採購單及所有相關資料已刪除'
    })

  } catch (error) {
    console.error('採購單刪除失敗:', error)

    // 詳細錯誤訊息
    let errorMessage = '刪除失敗'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { error: '刪除失敗', details: errorMessage },
      { status: 500 }
    )
  }
}
