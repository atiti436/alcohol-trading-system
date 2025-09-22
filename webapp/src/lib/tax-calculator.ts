/**
 * 🧮 酒類稅金計算器 - 獨立模組
 *
 * 優點：
 * 1. 可重複使用 - 前端、後端、API都能用
 * 2. 易於測試 - 純函數，無副作用
 * 3. 易於維護 - 所有稅金邏輯集中在一個地方
 * 4. 易於擴展 - 新增稅種、匯率很簡單
 */

// ==================== 稅率常數 ====================

export const TAX_RATES = {
  // 基本稅率 (根據DEMO.txt正確稅制)
  business_tax: 0.05,        // 營業稅 5%
  trade_promotion: 0.0004,   // 推廣貿易服務費 0.04% (不到100元不徵收)
  processing_fee: 500,       // 處理費 固定500元
  insurance_rate: 0.002,     // 保險費率 0.2%
  shipping_rate: 0.05,       // 運費率 5%
  shipping_max: 10000,       // 運費上限 10,000元

  // 台灣酒類菸酒稅制 (根據DEMO.txt)
  alcohol: {
    // 啤酒 - 每公升 26 元
    beer: {
      import_duty: 0.0,           // 關稅 0%
      alcohol_tax_type: 'fixed',  // 固定稅額
      alcohol_tax_rate: 26        // 每公升 26 元
    },

    // 威士忌 (蒸餾酒類) - 每公升按酒精成分每度 2.5 元
    whisky: {
      import_duty: 0.0,              // 關稅 0%
      alcohol_tax_type: 'per_degree', // 按度計算
      alcohol_tax_rate: 2.5          // 每度每公升 2.5 元
    },

    // 伏特加 (蒸餾酒類)
    vodka: {
      import_duty: 0.0,
      alcohol_tax_type: 'per_degree',
      alcohol_tax_rate: 2.5
    },

    // 蘭姆酒 (蒸餾酒類)
    rum: {
      import_duty: 0.0,
      alcohol_tax_type: 'per_degree',
      alcohol_tax_rate: 2.5
    },

    // 琴酒 (蒸餾酒類)
    gin: {
      import_duty: 0.0,
      alcohol_tax_type: 'per_degree',
      alcohol_tax_rate: 2.5
    },

    // 白蘭地 (蒸餾酒類)
    brandy: {
      import_duty: 0.0,
      alcohol_tax_type: 'per_degree',
      alcohol_tax_rate: 2.5
    },

    // 葡萄酒 (釀造酒類) - 每公升按酒精成分每度 7 元
    wine: {
      import_duty: 0.0,
      alcohol_tax_type: 'per_degree',
      alcohol_tax_rate: 7
    },

    // 清酒 (釀造酒類)
    sake: {
      import_duty: 0.0,
      alcohol_tax_type: 'per_degree',
      alcohol_tax_rate: 7
    },

    // 利口酒 (再製酒類) - 根據酒精度判斷
    liqueur: {
      import_duty: 0.0,
      alcohol_tax_type: 'conditional',  // 條件式計算
      alcohol_tax_rate_high: 185,       // 酒精度>20%: 每公升185元
      alcohol_tax_rate_low: 7,          // 酒精度≤20%: 每度每公升7元
      threshold: 20                     // 門檻20%
    },

    // 烈酒 (蒸餾酒類高度)
    spirits: {
      import_duty: 0.0,
      alcohol_tax_type: 'per_degree',
      alcohol_tax_rate: 2.5
    },

    // 預設 (其他酒類 - 釀造酒)
    default: {
      import_duty: 0.0,
      alcohol_tax_type: 'per_degree',
      alcohol_tax_rate: 7
    }
  }
} as const

// 客戶等級折扣
export const CUSTOMER_DISCOUNTS = {
  VIP: 0.15,        // VIP客戶 15%折扣
  PREMIUM: 0.10,    // 優質客戶 10%折扣
  REGULAR: 0.05,    // 一般客戶 5%折扣
  NEW: 0.00         // 新客戶 無折扣
} as const

// ==================== 型別定義 ====================

export type AlcoholType = keyof typeof TAX_RATES.alcohol
export type CustomerTier = keyof typeof CUSTOMER_DISCOUNTS

export interface TaxCalculationInput {
  baseAmount: number          // 台幣基本金額
  productType?: AlcoholType   // 酒類類型
  quantity?: number          // 數量
  customerTier?: CustomerTier // 客戶等級
  includeShipping?: boolean  // 是否包含運費
  includeTax?: boolean       // 是否包含稅費

  // 酒精稅計算所需
  alcoholPercentage?: number  // 酒精度 (%, 如 40 代表40%)
  volumeML?: number          // 容量 (毫升, 如 750)
}

export interface TaxCalculationResult {
  input: TaxCalculationInput
  costs: {
    basePrice: number        // 原始價格
    importDuty: number       // 關稅
    exciseTax: number        // 酒稅
    commodityTax: number     // 貨物稅
    alcoholTax: number       // 酒精稅
    businessTax: number      // 營業稅
    tradePromotion: number   // 推廣貿易服務費
    shippingFee: number      // 運費
    insuranceFee: number     // 保險費
    processingFee: number    // 處理費
    totalTaxes: number       // 總稅費
    totalCosts: number       // 總成本
  }
  pricing: {
    totalCost: number        // 總成本
    suggestedMarkup: number  // 建議加價
    suggestedPrice: number   // 建議售價
    customerDiscount: number // 客戶折扣
    finalPrice: number       // 最終價格
  }
  analysis: {
    grossProfit: number      // 毛利
    profitMargin: number     // 毛利率 %
    roi: number             // 投資報酬率 %
  }
}

// ==================== 核心計算函數 ====================

/**
 * 根據商品名稱判斷酒類分類 (基於DEMO.txt的邏輯)
 */
export function getAlcoholTaxConfig(itemName: string): any {
  const normalizedName = (itemName || '').toUpperCase()

  // 啤酒：每公升 26 元
  if (normalizedName.includes('BEER') || normalizedName.includes('啤酒') || normalizedName.includes('MALTS')) {
    return TAX_RATES.alcohol.beer
  }

  // 蒸餾酒類：每公升按酒精成分每度 2.5 元
  if (normalizedName.includes('WHISKY') || normalizedName.includes('WHISKEY') ||
      normalizedName.includes('VODKA') || normalizedName.includes('RUM') ||
      normalizedName.includes('GIN') || normalizedName.includes('BRANDY')) {

    if (normalizedName.includes('WHISKY') || normalizedName.includes('WHISKEY')) {
      return TAX_RATES.alcohol.whisky
    } else if (normalizedName.includes('VODKA')) {
      return TAX_RATES.alcohol.vodka
    } else if (normalizedName.includes('RUM')) {
      return TAX_RATES.alcohol.rum
    } else if (normalizedName.includes('GIN')) {
      return TAX_RATES.alcohol.gin
    } else if (normalizedName.includes('BRANDY')) {
      return TAX_RATES.alcohol.brandy
    }
  }

  // 釀造酒類(其他)：每公升按酒精成分每度 7 元
  if (normalizedName.includes('WINE') || normalizedName.includes('葡萄酒') ||
      normalizedName.includes('SAKE') || normalizedName.includes('清酒')) {

    if (normalizedName.includes('WINE') || normalizedName.includes('葡萄酒')) {
      return TAX_RATES.alcohol.wine
    } else if (normalizedName.includes('SAKE') || normalizedName.includes('清酒')) {
      return TAX_RATES.alcohol.sake
    }
  }

  // 再製酒類：根據酒精濃度判斷
  if (normalizedName.includes('LIQUEUR') || normalizedName.includes('利口酒')) {
    return TAX_RATES.alcohol.liqueur
  }

  // 其他烈酒
  if (normalizedName.includes('SPIRITS') || normalizedName.includes('烈酒')) {
    return TAX_RATES.alcohol.spirits
  }

  // 其他酒類：預設為釀造酒，每公升按酒精成分每度 7 元
  return TAX_RATES.alcohol.default
}

/**
 * 計算運費
 */
export function calculateShippingFee(baseAmount: number, quantity: number = 1): number {
  const baseFee = baseAmount * TAX_RATES.shipping_rate
  const quantityFee = quantity * 100 // 每件額外100元

  return Math.min(baseFee + quantityFee, TAX_RATES.shipping_max)
}

/**
 * 計算客戶折扣
 */
export function calculateCustomerDiscount(price: number, tier: CustomerTier): number {
  return price * CUSTOMER_DISCOUNTS[tier]
}

/**
 * 計算菸酒稅 (基於DEMO.txt的正確算法)
 */
export function calculateAlcoholTax(
  itemName: string,
  alcoholPercentage: number,
  volumeML: number,
  quantity: number
): number {
  const volumeInLiters = volumeML / 1000
  const taxConfig = getAlcoholTaxConfig(itemName)

  let alcoholTaxPerLiter = 0

  switch (taxConfig.alcohol_tax_type) {
    case 'fixed':
      // 啤酒：每公升 26 元
      alcoholTaxPerLiter = taxConfig.alcohol_tax_rate
      break

    case 'per_degree':
      // 蒸餾酒類/釀造酒類：每公升按酒精成分每度計算
      alcoholTaxPerLiter = taxConfig.alcohol_tax_rate * alcoholPercentage
      break

    case 'conditional':
      // 再製酒類 (利口酒)：根據酒精濃度判斷
      if (alcoholPercentage > taxConfig.threshold) {
        alcoholTaxPerLiter = taxConfig.alcohol_tax_rate_high // 酒精成分超過20%：每公升 185 元
      } else {
        alcoholTaxPerLiter = taxConfig.alcohol_tax_rate_low * alcoholPercentage // 20%以下：每公升按度數 7 元
      }
      break

    default:
      // 預設：釀造酒類，每公升按酒精成分每度 7 元
      alcoholTaxPerLiter = 7 * alcoholPercentage
      break
  }

  return alcoholTaxPerLiter * volumeInLiters * quantity
}

/**
 * 主要稅金計算函數
 */
export function calculateTaxes(input: TaxCalculationInput): TaxCalculationResult {
  const {
    baseAmount,
    productType = 'default',
    quantity = 1,
    customerTier = 'REGULAR',
    includeShipping = true,
    includeTax = true,
    alcoholPercentage = 40,  // 預設40%酒精度
    volumeML = 750          // 預設750ml
  } = input

  // 使用完稅價格作為稅基 (dutiableValueTWD)
  const dutiableValueTWD = baseAmount

  // 1. 關稅 (Tariff) - 目前大多酒類為0%
  const importDutyRate = 0  // 可從 getAlcoholTaxConfig(productType).import_duty 取得
  const importDuty = includeTax ? dutiableValueTWD * importDutyRate : 0

  // 2. 菸酒稅 (Alcohol Tax) - 根據DEMO.txt的正確算法
  const alcoholTax = includeTax
    ? calculateAlcoholTax(productType, alcoholPercentage, volumeML, quantity)
    : 0

  // 3. 推廣費 (Trade Promotion Fee) - 0.04%，不到100元不徵收
  const tradeFeeCalculated = dutiableValueTWD * TAX_RATES.trade_promotion
  const tradePromotion = (includeTax && tradeFeeCalculated >= 100) ? tradeFeeCalculated : 0

  // 4. 營業稅 (Business Tax / VAT) - 5%
  // 稅基 = 完稅價格 + 關稅 + 菸酒稅 (不含推廣費)
  const vatBase = dutiableValueTWD + importDuty + alcoholTax
  const businessTax = includeTax ? vatBase * TAX_RATES.business_tax : 0

  // 運費保險等其他費用
  const shippingFee = includeShipping ? calculateShippingFee(baseAmount, quantity) : 0
  const insuranceFee = includeShipping ? baseAmount * TAX_RATES.insurance_rate : 0
  const processingFee = TAX_RATES.processing_fee

  // 總計
  const totalTaxes = importDuty + alcoholTax + tradePromotion + businessTax
  const totalCosts = totalTaxes + shippingFee + insuranceFee + processingFee
  const totalCost = baseAmount + totalCosts

  // 定價建議 (30%毛利)
  const suggestedMarkup = totalCost * 0.3
  const suggestedPrice = totalCost + suggestedMarkup

  // 客戶折扣
  const customerDiscount = calculateCustomerDiscount(suggestedPrice, customerTier)
  const finalPrice = suggestedPrice - customerDiscount

  // 利潤分析
  const grossProfit = finalPrice - totalCost
  const profitMargin = totalCost > 0 ? (grossProfit / finalPrice) * 100 : 0
  const roi = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0

  return {
    input,
    costs: {
      basePrice: baseAmount,
      importDuty,
      exciseTax: 0,        // 台灣進口酒類酒稅多為0%
      commodityTax: 0,     // 簡化，專注於菸酒稅
      alcoholTax,          // 這是主要的稅種
      businessTax,
      tradePromotion,
      shippingFee,
      insuranceFee,
      processingFee,
      totalTaxes,
      totalCosts
    },
    pricing: {
      totalCost,
      suggestedMarkup,
      suggestedPrice,
      customerDiscount,
      finalPrice
    },
    analysis: {
      grossProfit,
      profitMargin,
      roi
    }
  }
}

// ==================== 便利函數 ====================

/**
 * 快速計算稅後價格
 */
export function calculateTaxedPrice(
  baseAmount: number,
  productType?: string,
  includeFees: boolean = true
): number {
  const result = calculateTaxes({
    baseAmount,
    productType: productType as AlcoholType,
    includeShipping: includeFees,
    includeTax: includeFees
  })

  return result.pricing.totalCost
}

/**
 * 快速計算建議售價
 */
export function calculateSuggestedPrice(
  baseAmount: number,
  productType?: string,
  customerTier: CustomerTier = 'REGULAR'
): number {
  const result = calculateTaxes({
    baseAmount,
    productType: productType as AlcoholType,
    customerTier
  })

  return result.pricing.finalPrice
}

/**
 * 驗證輸入參數
 */
export function validateTaxInput(input: Partial<TaxCalculationInput>): string[] {
  const errors: string[] = []

  if (!input.baseAmount || input.baseAmount <= 0) {
    errors.push('基本金額必須大於0')
  }

  if (input.quantity && input.quantity <= 0) {
    errors.push('數量必須大於0')
  }

  return errors
}

// ==================== 匯出預設配置 ====================

export const DEFAULT_CONFIG = {
  productType: 'default' as AlcoholType,
  customerTier: 'REGULAR' as CustomerTier,
  includeShipping: true,
  includeTax: true,
  quantity: 1
} as const