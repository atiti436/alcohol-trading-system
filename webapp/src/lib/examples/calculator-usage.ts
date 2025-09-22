/**
 * 🧮 計算器使用範例
 *
 * 展示如何使用封裝好的計算模組
 */

import { calculateCompleteCost, quickImportCost, quickSuggestedPrice } from '../cost-calculator'
import { toTWD } from '../currency-converter'
import { calculateTaxes } from '../tax-calculator'

// ==================== 使用範例 ====================

/**
 * 範例1: 簡單的進口成本計算
 */
export function example1_BasicImportCost() {
  console.log('=== 範例1: 基本進口成本計算 ===')

  // JPY 13,000 威士忌，使用報單匯率 0.2
  const cost = quickImportCost(13000, 'JPY', 'whisky')
  console.log(`JPY 13,000 威士忌進口總成本: NT$ ${cost.toLocaleString()}`)

  // 自訂匯率版本
  const result = calculateCompleteCost({
    amount: 13000,
    currency: 'JPY',
    productType: 'whisky',
    customExchangeRate: 0.2  // 報單匯率
  })

  console.log('詳細計算結果:')
  console.log(`- 原始金額: ¥${result.currency.originalAmount.toLocaleString()}`)
  console.log(`- 使用匯率: ${result.currency.exchangeRate}`)
  console.log(`- 台幣金額: NT$ ${result.currency.twdAmount.toLocaleString()}`)
  console.log(`- 進口關稅: NT$ ${result.breakdown.importDuty.toLocaleString()}`)
  console.log(`- 關稅: NT$ ${result.breakdown.customsDuty.toLocaleString()}`)
  console.log(`- 營業稅: NT$ ${result.breakdown.businessTax.toLocaleString()}`)
  console.log(`- 運費: NT$ ${result.breakdown.shippingFee.toLocaleString()}`)
  console.log(`- 總成本: NT$ ${result.finalPricing.totalCostTWD.toLocaleString()}`)
  console.log(`- 建議售價: NT$ ${result.finalPricing.suggestedPriceTWD.toLocaleString()}`)
}

/**
 * 範例2: 不同客戶等級定價
 */
export function example2_CustomerTierPricing() {
  console.log('\n=== 範例2: 客戶分級定價 ===')

  const baseParams = {
    amount: 50000,  // JPY 50,000
    currency: 'JPY' as const,
    productType: 'sake' as const,
    customExchangeRate: 0.21
  }

  const tiers = ['NEW', 'REGULAR', 'PREMIUM', 'VIP'] as const

  tiers.forEach(tier => {
    const result = calculateCompleteCost({
      ...baseParams,
      customerTier: tier
    })

    console.log(`${tier} 客戶最終價格: NT$ ${result.finalPricing.finalPriceTWD.toLocaleString()}`)
  })
}

/**
 * 範例3: 批量採購成本效益
 */
export function example3_QuantityBreakdown() {
  console.log('\n=== 範例3: 批量採購效益 ===')

  const quantities = [1, 6, 12, 24]

  quantities.forEach(qty => {
    const result = calculateCompleteCost({
      amount: 8000,  // JPY 8,000 per bottle
      currency: 'JPY',
      productType: 'wine',
      quantity: qty,
      customExchangeRate: 0.2
    })

    const unitCost = result.finalPricing.totalCostTWD / qty

    console.log(`${qty} 瓶購買:`)
    console.log(`  - 單瓶成本: NT$ ${Math.round(unitCost).toLocaleString()}`)
    console.log(`  - 總成本: NT$ ${result.finalPricing.totalCostTWD.toLocaleString()}`)
  })
}

/**
 * 範例4: 只計算稅費 (不含運費)
 */
export function example4_TaxOnlyCalculation() {
  console.log('\n=== 範例4: 純稅費計算 ===')

  // 直接使用稅金計算器
  const twdAmount = toTWD(100000, 'JPY', 0.2)  // JPY 100,000 @ 0.2 = NT$ 20,000

  const taxResult = calculateTaxes({
    baseAmount: twdAmount,
    productType: 'spirits',
    includeShipping: false,  // 不含運費
    includeTax: true
  })

  console.log(`基本金額: NT$ ${taxResult.costs.basePrice.toLocaleString()}`)
  console.log(`進口關稅: NT$ ${taxResult.costs.importDuty.toLocaleString()}`)
  console.log(`關稅 (15%): NT$ ${taxResult.costs.customsDuty.toLocaleString()}`)
  console.log(`營業稅 (5%): NT$ ${taxResult.costs.businessTax.toLocaleString()}`)
  console.log(`總稅費: NT$ ${taxResult.costs.totalTaxes.toLocaleString()}`)
  console.log(`含稅總價: NT$ ${taxResult.pricing.totalCost.toLocaleString()}`)
}

/**
 * 範例5: 在採購單中使用
 */
export function example5_InPurchaseOrder() {
  console.log('\n=== 範例5: 採購單中的使用 ===')

  // 模擬採購單資料
  const purchaseItems = [
    { name: '山崎12年', amount: 45000, currency: 'JPY', type: 'whisky', qty: 2 },
    { name: '獺祭23', amount: 12000, currency: 'JPY', type: 'sake', qty: 6 },
    { name: '法國波爾多', amount: 25, currency: 'EUR', type: 'wine', qty: 12 }
  ]

  const declarationRate = { JPY: 0.2, EUR: 35.0 }  // 報單匯率

  let totalCostTWD = 0

  purchaseItems.forEach(item => {
    const result = calculateCompleteCost({
      amount: item.amount,
      currency: item.currency as any,
      productType: item.type as any,
      quantity: item.qty,
      customExchangeRate: declarationRate[item.currency as keyof typeof declarationRate]
    })

    totalCostTWD += result.finalPricing.totalCostTWD

    console.log(`${item.name}:`)
    console.log(`  - 數量: ${item.qty}`)
    console.log(`  - 原價: ${item.currency} ${item.amount.toLocaleString()}`)
    console.log(`  - 總成本: NT$ ${result.finalPricing.totalCostTWD.toLocaleString()}`)
  })

  console.log(`\n採購單總成本: NT$ ${totalCostTWD.toLocaleString()}`)
}

// ==================== 執行範例 ====================

export function runAllExamples() {
  example1_BasicImportCost()
  example2_CustomerTierPricing()
  example3_QuantityBreakdown()
  example4_TaxOnlyCalculation()
  example5_InPurchaseOrder()
}

// 如果直接執行此檔案
if (require.main === module) {
  runAllExamples()
}