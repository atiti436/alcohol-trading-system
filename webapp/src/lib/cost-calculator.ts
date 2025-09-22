/**
 * 🧮 完整成本計算器 - 組合模組
 *
 * 整合匯率轉換 + 稅金計算 + 定價策略
 * 這是您複雜公式的最終封裝版本！
 */

import { convertCurrency, type SupportedCurrency } from './currency-converter'
import {
  calculateTaxes,
  type TaxCalculationInput,
  type TaxCalculationResult,
  type CustomerTier,
  type AlcoholType
} from './tax-calculator'

// ==================== 型別定義 ====================

export interface CostCalculationInput {
  // 基本資料
  amount: number                    // 原始金額
  currency: SupportedCurrency       // 原始幣別
  productType?: AlcoholType         // 商品類型
  quantity?: number                 // 數量

  // 客戶資料
  customerTier?: CustomerTier       // 客戶等級

  // 計算選項
  includeShipping?: boolean         // 是否包含運費
  includeTax?: boolean              // 是否包含稅費
  customExchangeRate?: number       // 自訂匯率
  profitMarginTarget?: number       // 目標毛利率 (預設30%)
}

export interface CompleteCostResult {
  // 輸入資料
  input: CostCalculationInput

  // 匯率轉換結果
  currency: {
    originalAmount: number
    originalCurrency: SupportedCurrency
    exchangeRate: number
    twdAmount: number
  }

  // 稅費計算結果
  taxes: TaxCalculationResult

  // 最終定價
  finalPricing: {
    totalCostTWD: number            // 總成本 (台幣)
    suggestedPriceTWD: number       // 建議售價 (台幣)
    finalPriceTWD: number           // 最終售價 (台幣)

    // 回轉原始幣別
    totalCostOriginal: number       // 總成本 (原幣別)
    suggestedPriceOriginal: number  // 建議售價 (原幣別)
    finalPriceOriginal: number      // 最終售價 (原幣別)
  }

  // 獲利分析
  profitAnalysis: {
    grossProfitTWD: number          // 毛利 (台幣)
    profitMargin: number            // 毛利率
    roi: number                     // 投資報酬率
    markupRate: number              // 加價率
  }

  // 中間計算詳情
  breakdown: {
    baseAmountTWD: number           // 基本金額 (台幣)
    importTax: number               // 進口稅
    customsDuty: number             // 關稅
    businessTax: number             // 營業稅
    shippingFee: number             // 運費
    insuranceFee: number            // 保險費
    processingFee: number           // 處理費
    totalTaxes: number              // 總稅費
    customerDiscount: number        // 客戶折扣
  }
}

// ==================== 主要計算函數 ====================

/**
 * 完整成本計算 - 一站式解決方案
 */
export function calculateCompleteCost(input: CostCalculationInput): CompleteCostResult {
  const {
    amount,
    currency,
    productType = 'default',
    quantity = 1,
    customerTier = 'REGULAR',
    includeShipping = true,
    includeTax = true,
    customExchangeRate,
    profitMarginTarget = 0.3
  } = input

  // 1. 匯率轉換 - 轉為台幣計算
  const currencyResult = convertCurrency({
    amount,
    fromCurrency: currency,
    toCurrency: 'TWD',
    customRate: customExchangeRate
  })

  const twdAmount = currencyResult.conversion.roundedAmount
  const exchangeRate = currencyResult.conversion.exchangeRate

  // 2. 稅費計算
  const taxInput: TaxCalculationInput = {
    baseAmount: twdAmount,
    productType,
    quantity,
    customerTier,
    includeShipping,
    includeTax
  }

  const taxResult = calculateTaxes(taxInput)

  // 3. 計算原幣別價格 (回轉)
  const totalCostOriginal = currency === 'TWD'
    ? taxResult.pricing.totalCost
    : Math.round(taxResult.pricing.totalCost / exchangeRate * 100) / 100

  const suggestedPriceOriginal = currency === 'TWD'
    ? taxResult.pricing.suggestedPrice
    : Math.round(taxResult.pricing.suggestedPrice / exchangeRate * 100) / 100

  const finalPriceOriginal = currency === 'TWD'
    ? taxResult.pricing.finalPrice
    : Math.round(taxResult.pricing.finalPrice / exchangeRate * 100) / 100

  // 4. 進階獲利分析
  const grossProfitTWD = taxResult.analysis.grossProfit
  const markupRate = taxResult.pricing.totalCost > 0
    ? (taxResult.pricing.suggestedMarkup / taxResult.pricing.totalCost) * 100
    : 0

  return {
    input,
    currency: {
      originalAmount: amount,
      originalCurrency: currency,
      exchangeRate,
      twdAmount
    },
    taxes: taxResult,
    finalPricing: {
      totalCostTWD: taxResult.pricing.totalCost,
      suggestedPriceTWD: taxResult.pricing.suggestedPrice,
      finalPriceTWD: taxResult.pricing.finalPrice,
      totalCostOriginal,
      suggestedPriceOriginal,
      finalPriceOriginal
    },
    profitAnalysis: {
      grossProfitTWD,
      profitMargin: taxResult.analysis.profitMargin,
      roi: taxResult.analysis.roi,
      markupRate
    },
    breakdown: {
      baseAmountTWD: twdAmount,
      importTax: taxResult.costs.importDuty,
      customsDuty: taxResult.costs.alcoholTax,
      businessTax: taxResult.costs.businessTax,
      shippingFee: taxResult.costs.shippingFee,
      insuranceFee: taxResult.costs.insuranceFee,
      processingFee: taxResult.costs.processingFee,
      totalTaxes: taxResult.costs.totalTaxes,
      customerDiscount: taxResult.pricing.customerDiscount
    }
  }
}

// ==================== 便利函數 ====================

/**
 * 快速計算進口成本 (最常用)
 */
export function quickImportCost(
  amount: number,
  currency: SupportedCurrency,
  productType?: AlcoholType
): number {
  const result = calculateCompleteCost({
    amount,
    currency,
    productType,
    includeShipping: true,
    includeTax: true
  })

  return result.finalPricing.totalCostTWD
}

/**
 * 快速計算建議售價
 */
export function quickSuggestedPrice(
  amount: number,
  currency: SupportedCurrency,
  productType?: AlcoholType,
  customerTier?: CustomerTier
): number {
  const result = calculateCompleteCost({
    amount,
    currency,
    productType,
    customerTier
  })

  return result.finalPricing.finalPriceTWD
}

/**
 * 批量計算不同客戶等級的價格
 */
export function calculateTierPricing(
  amount: number,
  currency: SupportedCurrency,
  productType?: AlcoholType
): Record<CustomerTier, number> {
  const tiers: CustomerTier[] = ['NEW', 'REGULAR', 'PREMIUM', 'VIP']
  const results: Record<string, number> = {}

  for (const tier of tiers) {
    const result = calculateCompleteCost({
      amount,
      currency,
      productType,
      customerTier: tier
    })
    results[tier] = result.finalPricing.finalPriceTWD
  }

  return results as Record<CustomerTier, number>
}

/**
 * 計算不同數量的成本效益
 */
export function calculateQuantityBreakdown(
  amount: number,
  currency: SupportedCurrency,
  quantities: number[],
  productType?: AlcoholType
): Array<{ quantity: number; unitCost: number; totalCost: number; savings: number }> {
  const baseResult = calculateCompleteCost({
    amount,
    currency,
    productType,
    quantity: 1
  })
  const baseCost = baseResult.finalPricing.totalCostTWD

  return quantities.map(qty => {
    const result = calculateCompleteCost({
      amount,
      currency,
      productType,
      quantity: qty
    })

    const unitCost = result.finalPricing.totalCostTWD / qty
    const totalCost = result.finalPricing.totalCostTWD
    const savings = (baseCost - unitCost) / baseCost * 100

    return {
      quantity: qty,
      unitCost: Math.round(unitCost),
      totalCost: Math.round(totalCost),
      savings: Math.round(savings * 100) / 100
    }
  })
}

// ==================== 驗證函數 ====================

/**
 * 驗證計算輸入
 */
export function validateCostInput(input: Partial<CostCalculationInput>): string[] {
  const errors: string[] = []

  if (!input.amount || input.amount <= 0) {
    errors.push('金額必須大於0')
  }

  if (!input.currency) {
    errors.push('必須指定幣別')
  }

  if (input.quantity && input.quantity <= 0) {
    errors.push('數量必須大於0')
  }

  if (input.customExchangeRate && input.customExchangeRate <= 0) {
    errors.push('自訂匯率必須大於0')
  }

  return errors
}

// ==================== 預設配置 ====================

export const DEFAULT_COST_CONFIG = {
  currency: 'JPY' as SupportedCurrency,
  productType: 'default' as AlcoholType,
  quantity: 1,
  customerTier: 'REGULAR' as CustomerTier,
  includeShipping: true,
  includeTax: true,
  profitMarginTarget: 0.3
} as const