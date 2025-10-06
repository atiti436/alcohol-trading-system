/**
 * 銷售單收支記錄同步工具
 *
 * 功能：
 * - 銷售單建立/確認/更新時自動產生 cashflow 記錄
 * - 銷售單刪除/取消時自動清除 cashflow 記錄
 * - 記錄投資方應收、實際收入、利潤差額
 *
 * 使用方式：
 * await prisma.$transaction(async tx => {
 *   await syncSaleCashflow(tx, sale)
 * })
 */

import { Prisma, Sale, SaleItem } from '@prisma/client'

type SaleWithItems = Sale & { items: SaleItem[] }

/**
 * 同步銷售單的 cashflow 記錄
 *
 * @param tx - Prisma transaction client
 * @param sale - 銷售單（包含 items）
 */
export async function syncSaleCashflow(
  tx: Prisma.TransactionClient,
  sale: SaleWithItems
) {
  const reference = `sale:${sale.id}`

  // 只有確認後的訂單才需要產生 cashflow
  // DRAFT/CANCELLED/PREORDER 不產生記錄
  if (!['CONFIRMED', 'SHIPPED', 'DELIVERED', 'PAID'].includes(sale.status)) {
    // 清除舊記錄（如果訂單從 CONFIRMED 改回 DRAFT 或 CANCELLED）
    await tx.cashFlowRecord.deleteMany({ where: { reference } })
    console.log(`[Cashflow Sync] 銷售單 ${sale.sale_number} 狀態 ${sale.status}，清除 cashflow 記錄`)
    return
  }

  // 計算投資方期望總額（基於 unit_price）
  const investorTotal = sale.items.reduce((sum, item) =>
    sum + item.unit_price * item.quantity
  , 0)

  // 計算實際收入總額（基於 actual_unit_price）
  const actualTotal = sale.items.reduce((sum, item) =>
    sum + (item.actual_unit_price ?? item.unit_price) * item.quantity
  , 0)

  // 計算利潤差額（實際收入 - 投資方期望）
  const commission = actualTotal - investorTotal

  console.log(`[Cashflow Sync] 銷售單 ${sale.sale_number}`)
  console.log(`  投資方期望: ${investorTotal.toFixed(0)}`)
  console.log(`  實際收入: ${actualTotal.toFixed(0)}`)
  console.log(`  利潤差額: ${commission.toFixed(0)}`)

  // 避免重複寫入，先清掉舊紀錄
  await tx.cashFlowRecord.deleteMany({ where: { reference } })

  // 📊 產生基礎 2 筆記錄（實際收入 + 應付投資方）
  await tx.cashFlowRecord.createMany({
    data: [
      // 1️⃣ 實際收入（客戶付款）
      {
        type: 'INCOME',
        amount: actualTotal,
        description: `銷售實際收入 - ${sale.sale_number}`,
        category: 'SALES',
        funding_source: sale.funding_source === 'PERSONAL' ? 'PERSONAL' : 'INVESTOR',
        transaction_date: sale.created_at,
        reference,
        notes: commission !== 0 ? `利潤差額 ${commission.toFixed(0)}` : null,
        created_by: sale.created_by
      },
      // 2️⃣ 應付投資方（期望售價總額）
      {
        type: 'EXPENSE',
        amount: investorTotal,
        description: `應付投資方 - ${sale.sale_number}`,
        category: 'SETTLEMENT',
        funding_source: 'INVESTOR',
        transaction_date: sale.created_at,
        reference,
        notes: '投資方期望售價總額',
        created_by: sale.created_by
      }
    ]
  })

  // 3️⃣ 利潤差額（如果有的話）
  if (commission !== 0) {
    await tx.cashFlowRecord.create({
      data: {
        type: commission > 0 ? 'INCOME' : 'EXPENSE',
        amount: Math.abs(commission),
        description: `銷售利潤 - ${sale.sale_number}`,
        category: 'COMMISSION',
        funding_source: 'PERSONAL',
        transaction_date: sale.created_at,
        reference,
        notes: '實際成交價與投資方售價差額',
        created_by: sale.created_by
      }
    })
  }

  console.log(`[Cashflow Sync] ✅ 已產生 ${commission !== 0 ? 3 : 2} 筆 cashflow 記錄`)
}
