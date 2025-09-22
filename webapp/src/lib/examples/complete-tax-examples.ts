/**
 * 🏛️ 完整台灣酒類稅制計算範例
 *
 * 包含：關稅、酒稅、貨物稅、酒精稅、營業稅、推廣貿易服務費
 */

import { calculateTaxes } from '../tax-calculator'
import { toTWD } from '../currency-converter'

// ==================== 完整稅制範例 ====================

/**
 * 範例1: 威士忌進口 (蒸餾酒類)
 * - 關稅: 0%
 * - 酒稅: 0%
 * - 貨物稅: 0%
 * - 酒精稅: NT$185/公升酒精
 */
export function example1_WhiskyImport() {
  console.log('=== 威士忌進口稅金計算 ===')

  // 山崎12年 JPY 45,000, 40%, 700ml
  const twdAmount = toTWD(45000, 'JPY', 0.2) // 使用報單匯率

  const result = calculateTaxes({
    baseAmount: twdAmount,           // NT$ 9,000
    productType: 'whisky',
    quantity: 1,
    alcoholPercentage: 40,           // 40%酒精度
    volumeML: 700,                   // 700ml
    includeShipping: true,
    includeTax: true
  })

  console.log(`原始價格 (CIF): NT$ ${result.costs.basePrice.toLocaleString()}`)
  console.log(`關稅 (0%): NT$ ${result.costs.importDuty.toLocaleString()}`)
  console.log(`酒稅 (0%): NT$ ${result.costs.exciseTax.toLocaleString()}`)
  console.log(`貨物稅 (0%): NT$ ${result.costs.commodityTax.toLocaleString()}`)
  console.log(`酒精稅 (40% × 0.7L × NT$185): NT$ ${result.costs.alcoholTax.toLocaleString()}`)
  console.log(`營業稅 (5%): NT$ ${result.costs.businessTax.toLocaleString()}`)
  console.log(`推廣貿易 (3%): NT$ ${result.costs.tradePromotion.toLocaleString()}`)
  console.log(`運費保險: NT$ ${(result.costs.shippingFee + result.costs.insuranceFee).toLocaleString()}`)
  console.log(`─────────────────────────`)
  console.log(`總成本: NT$ ${result.pricing.totalCost.toLocaleString()}`)
  console.log(`建議售價: NT$ ${result.pricing.suggestedPrice.toLocaleString()}`)
}

/**
 * 範例2: 清酒進口 (釀造酒類)
 * - 關稅: 0%
 * - 酒稅: 0%
 * - 貨物稅: 20%
 * - 酒精稅: NT$7/公升酒精
 */
export function example2_SakeImport() {
  console.log('\n=== 清酒進口稅金計算 ===')

  // 獺祭23 JPY 12,000, 16%, 720ml
  const twdAmount = toTWD(12000, 'JPY', 0.21)

  const result = calculateTaxes({
    baseAmount: twdAmount,           // NT$ 2,520
    productType: 'sake',
    quantity: 1,
    alcoholPercentage: 16,           // 16%酒精度
    volumeML: 720,                   // 720ml
    includeShipping: true,
    includeTax: true
  })

  console.log(`原始價格 (CIF): NT$ ${result.costs.basePrice.toLocaleString()}`)
  console.log(`關稅 (0%): NT$ ${result.costs.importDuty.toLocaleString()}`)
  console.log(`酒稅 (0%): NT$ ${result.costs.exciseTax.toLocaleString()}`)
  console.log(`貨物稅 (20%): NT$ ${result.costs.commodityTax.toLocaleString()}`)
  console.log(`酒精稅 (16% × 0.72L × NT$7): NT$ ${result.costs.alcoholTax.toLocaleString()}`)
  console.log(`營業稅 (5%): NT$ ${result.costs.businessTax.toLocaleString()}`)
  console.log(`推廣貿易 (3%): NT$ ${result.costs.tradePromotion.toLocaleString()}`)
  console.log(`─────────────────────────`)
  console.log(`總成本: NT$ ${result.pricing.totalCost.toLocaleString()}`)
}

/**
 * 範例3: 利口酒進口 (調製酒類)
 * - 關稅: 0%
 * - 酒稅: 0%
 * - 貨物稅: 20%
 * - 酒精稅: NT$185/公升酒精 (高稅率)
 */
export function example3_LiqueurImport() {
  console.log('\n=== 利口酒進口稅金計算 ===')

  // Cointreau €35, 40%, 700ml
  const twdAmount = toTWD(35, 'EUR', 35.0)

  const result = calculateTaxes({
    baseAmount: twdAmount,           // NT$ 1,225
    productType: 'liqueur',
    quantity: 1,
    alcoholPercentage: 40,           // 40%酒精度
    volumeML: 700,                   // 700ml
    includeShipping: true,
    includeTax: true
  })

  console.log(`原始價格 (CIF): NT$ ${result.costs.basePrice.toLocaleString()}`)
  console.log(`關稅 (0%): NT$ ${result.costs.importDuty.toLocaleString()}`)
  console.log(`酒稅 (0%): NT$ ${result.costs.exciseTax.toLocaleString()}`)
  console.log(`貨物稅 (20%): NT$ ${result.costs.commodityTax.toLocaleString()}`)
  console.log(`酒精稅 (40% × 0.7L × NT$185): NT$ ${result.costs.alcoholTax.toLocaleString()}`)
  console.log(`營業稅 (5%): NT$ ${result.costs.businessTax.toLocaleString()}`)
  console.log(`推廣貿易 (3%): NT$ ${result.costs.tradePromotion.toLocaleString()}`)
  console.log(`─────────────────────────`)
  console.log(`總成本: NT$ ${result.pricing.totalCost.toLocaleString()}`)
}

/**
 * 範例4: 批量採購成本差異
 */
export function example4_BulkImportComparison() {
  console.log('\n=== 批量採購成本差異 ===')

  const baseParams = {
    baseAmount: toTWD(8000, 'JPY', 0.2),  // JPY 8,000 → NT$ 1,600
    productType: 'wine' as const,
    alcoholPercentage: 13,
    volumeML: 750,
    includeShipping: true,
    includeTax: true
  }

  const quantities = [1, 6, 12, 24]

  quantities.forEach(qty => {
    const result = calculateTaxes({
      ...baseParams,
      quantity: qty
    })

    const unitCost = result.pricing.totalCost / qty
    const unitAlcoholTax = result.costs.alcoholTax / qty

    console.log(`${qty} 瓶購買:`)
    console.log(`  - 單瓶總成本: NT$ ${Math.round(unitCost)}`)
    console.log(`  - 單瓶酒精稅: NT$ ${Math.round(unitAlcoholTax)}`)
    console.log(`  - 總成本: NT$ ${result.pricing.totalCost.toLocaleString()}`)
  })
}

/**
 * 範例5: 不同酒類稅負比較
 */
export function example5_TaxBurdenComparison() {
  console.log('\n=== 不同酒類稅負比較 (相同價格基礎) ===')

  const baseAmount = 2000  // NT$ 2,000 CIF價格
  const commonSpecs = {
    baseAmount,
    quantity: 1,
    alcoholPercentage: 40,
    volumeML: 700,
    includeShipping: false,  // 只比較稅費
    includeTax: true
  }

  const alcoholTypes = [
    { type: 'whisky', name: '威士忌' },
    { type: 'sake', name: '清酒' },
    { type: 'wine', name: '葡萄酒' },
    { type: 'liqueur', name: '利口酒' },
    { type: 'spirits', name: '烈酒' }
  ] as const

  alcoholTypes.forEach(({ type, name }) => {
    const result = calculateTaxes({
      ...commonSpecs,
      productType: type
    })

    const taxRate = (result.costs.totalTaxes / baseAmount) * 100

    console.log(`${name}:`)
    console.log(`  - 貨物稅: NT$ ${result.costs.commodityTax}`)
    console.log(`  - 酒精稅: NT$ ${result.costs.alcoholTax}`)
    console.log(`  - 營業稅: NT$ ${result.costs.businessTax}`)
    console.log(`  - 總稅費: NT$ ${result.costs.totalTaxes} (${taxRate.toFixed(1)}%)`)
    console.log('')
  })
}

/**
 * 範例6: 實際採購單應用
 */
export function example6_RealPurchaseOrder() {
  console.log('\n=== 實際採購單應用 ===')

  const purchaseItems = [
    {
      name: '山崎12年威士忌',
      price: 45000, currency: 'JPY', rate: 0.2,
      type: 'whisky', alcohol: 43, volume: 700, qty: 2
    },
    {
      name: '獺祭23清酒',
      price: 12000, currency: 'JPY', rate: 0.21,
      type: 'sake', alcohol: 16, volume: 720, qty: 6
    },
    {
      name: 'Dom Pérignon',
      price: 180, currency: 'EUR', rate: 35.0,
      type: 'wine', alcohol: 12.5, volume: 750, qty: 3
    }
  ]

  let grandTotal = 0
  let totalTaxes = 0

  purchaseItems.forEach(item => {
    const twdAmount = toTWD(item.price, item.currency as any, item.rate)

    const result = calculateTaxes({
      baseAmount: twdAmount,
      productType: item.type as any,
      quantity: item.qty,
      alcoholPercentage: item.alcohol,
      volumeML: item.volume,
      includeShipping: true,
      includeTax: true
    })

    grandTotal += result.pricing.totalCost
    totalTaxes += result.costs.totalTaxes

    console.log(`${item.name} × ${item.qty}:`)
    console.log(`  原價: ${item.currency} ${item.price.toLocaleString()} @ ${item.rate}`)
    console.log(`  成本: NT$ ${result.pricing.totalCost.toLocaleString()}`)
    console.log(`  稅費: NT$ ${result.costs.totalTaxes.toLocaleString()}`)
    console.log('')
  })

  console.log(`採購單總計:`)
  console.log(`  總成本: NT$ ${grandTotal.toLocaleString()}`)
  console.log(`  總稅費: NT$ ${totalTaxes.toLocaleString()}`)
  console.log(`  稅費比例: ${((totalTaxes / grandTotal) * 100).toFixed(1)}%`)
}

// ==================== 執行所有範例 ====================

export function runCompleteTaxExamples() {
  example1_WhiskyImport()
  example2_SakeImport()
  example3_LiqueurImport()
  example4_BulkImportComparison()
  example5_TaxBurdenComparison()
  example6_RealPurchaseOrder()
}

// 如果直接執行此檔案
if (require.main === module) {
  runCompleteTaxExamples()
}