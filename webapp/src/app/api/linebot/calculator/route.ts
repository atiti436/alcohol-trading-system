import { NextRequest, NextResponse } from 'next/server'

/**
 * 🤖 Room-6: 即時成本計算器 API
 * 核心功能：精確成本計算 + 多貨幣支援 + 稅費分析
 */

// 匯率資料 (實際應從外部API獲取)
const EXCHANGE_RATES = {
  JPY_TWD: 0.21,
  USD_TWD: 31.5,
  EUR_TWD: 34.2,
  updated: new Date().toISOString()
}

// 稅率設定
const TAX_RATES = {
  alcohol_import_tax: 0.15,      // 酒類進口稅 15%
  business_tax: 0.05,            // 營業稅 5%
  customs_duty: 0.10,            // 關稅 10%
  processing_fee: 500,           // 處理費 固定500元
  insurance_rate: 0.002,         // 保險費率 0.2%
  shipping_rate: 0.05,           // 運費率 5%
  shipping_max: 10000            // 運費上限 10,000元
}

// 商品類別稅率 (不同酒類可能有不同稅率)
const PRODUCT_TAX_RATES = {
  whisky: { import_tax: 0.15, customs: 0.10 },
  sake: { import_tax: 0.12, customs: 0.08 },
  wine: { import_tax: 0.18, customs: 0.12 },
  beer: { import_tax: 0.10, customs: 0.05 },
  spirits: { import_tax: 0.20, customs: 0.15 },
  default: { import_tax: 0.15, customs: 0.10 }
}

// 客戶等級折扣
const CUSTOMER_DISCOUNTS = {
  VIP: 0.15,        // VIP客戶 15%折扣
  PREMIUM: 0.10,    // 優質客戶 10%折扣
  REGULAR: 0.05,    // 一般客戶 5%折扣
  NEW: 0.00         // 新客戶 無折扣
}

interface CalculationRequest {
  amount: number
  currency: 'JPY' | 'USD' | 'EUR' | 'TWD'
  productType?: string
  quantity?: number
  customerTier?: 'VIP' | 'PREMIUM' | 'REGULAR' | 'NEW'
  includeShipping?: boolean
  includeTax?: boolean
  customExchangeRate?: number
}

interface CalculationResult {
  input: {
    amount: number
    currency: string
    productType: string
    quantity: number
  }
  conversion: {
    exchangeRate: number
    baseAmount: number
    currency: string
  }
  costs: {
    basePrice: number
    importDuty: number
    alcoholTax: number
    businessTax: number
    shippingFee: number
    insuranceFee: number
    processingFee: number
    totalCosts: number
  }
  pricing: {
    totalCost: number
    suggestedMarkup: number
    suggestedPrice: number
    customerDiscount: number
    finalPrice: number
  }
  profitAnalysis: {
    grossProfit: number
    profitMargin: number
    roi: number
  }
}

// 獲取即時匯率 (模擬)
async function getExchangeRate(fromCurrency: string, toCurrency: string = 'TWD'): Promise<number> {
  // 實際應該從外部API獲取
  const rates: { [key: string]: number } = {
    'JPY_TWD': EXCHANGE_RATES.JPY_TWD,
    'USD_TWD': EXCHANGE_RATES.USD_TWD,
    'EUR_TWD': EXCHANGE_RATES.EUR_TWD,
    'TWD_TWD': 1.0
  }

  return rates[`${fromCurrency}_${toCurrency}`] || 1.0
}

// 計算商品類別稅率
function getProductTaxRates(productType: string) {
  const normalizedType = productType.toLowerCase()

  if (normalizedType.includes('威士忌') || normalizedType.includes('whisky')) {
    return PRODUCT_TAX_RATES.whisky
  } else if (normalizedType.includes('清酒') || normalizedType.includes('sake')) {
    return PRODUCT_TAX_RATES.sake
  } else if (normalizedType.includes('紅酒') || normalizedType.includes('wine')) {
    return PRODUCT_TAX_RATES.wine
  } else if (normalizedType.includes('啤酒') || normalizedType.includes('beer')) {
    return PRODUCT_TAX_RATES.beer
  } else if (normalizedType.includes('烈酒') || normalizedType.includes('spirits')) {
    return PRODUCT_TAX_RATES.spirits
  }

  return PRODUCT_TAX_RATES.default
}

// 計算運費
function calculateShippingFee(baseAmount: number, quantity: number = 1): number {
  const baseFee = baseAmount * TAX_RATES.shipping_rate
  const quantityFee = quantity * 100 // 每件額外100元

  return Math.min(baseFee + quantityFee, TAX_RATES.shipping_max)
}

// 主要計算邏輯
async function calculateCosts(request: CalculationRequest): Promise<CalculationResult> {
  const {
    amount,
    currency,
    productType = 'default',
    quantity = 1,
    customerTier = 'REGULAR',
    includeShipping = true,
    includeTax = true,
    customExchangeRate
  } = request

  // 1. 匯率轉換
  const exchangeRate = customExchangeRate || await getExchangeRate(currency)
  const baseAmount = currency === 'TWD' ? amount : amount * exchangeRate

  // 2. 取得商品稅率
  const productTaxRates = getProductTaxRates(productType)

  // 3. 計算各項成本
  const importDuty = includeTax ? baseAmount * productTaxRates.import_tax : 0
  const alcoholTax = includeTax ? baseAmount * productTaxRates.customs : 0
  const businessTax = includeTax ? (baseAmount + importDuty + alcoholTax) * TAX_RATES.business_tax : 0

  const shippingFee = includeShipping ? calculateShippingFee(baseAmount, quantity) : 0
  const insuranceFee = includeShipping ? baseAmount * TAX_RATES.insurance_rate : 0
  const processingFee = TAX_RATES.processing_fee

  const totalCosts = importDuty + alcoholTax + businessTax + shippingFee + insuranceFee + processingFee
  const totalCost = baseAmount + totalCosts

  // 4. 定價建議
  const suggestedMarkup = totalCost * 0.3 // 建議30%毛利
  const suggestedPrice = totalCost + suggestedMarkup

  // 5. 客戶折扣
  const customerDiscount = suggestedPrice * CUSTOMER_DISCOUNTS[customerTier]
  const finalPrice = suggestedPrice - customerDiscount

  // 6. 利潤分析
  const grossProfit = finalPrice - totalCost
  const profitMargin = (grossProfit / finalPrice) * 100
  const roi = (grossProfit / totalCost) * 100

  return {
    input: {
      amount,
      currency,
      productType,
      quantity
    },
    conversion: {
      exchangeRate,
      baseAmount,
      currency: 'TWD'
    },
    costs: {
      basePrice: baseAmount,
      importDuty,
      alcoholTax,
      businessTax,
      shippingFee,
      insuranceFee,
      processingFee,
      totalCosts
    },
    pricing: {
      totalCost,
      suggestedMarkup,
      suggestedPrice,
      customerDiscount,
      finalPrice
    },
    profitAnalysis: {
      grossProfit,
      profitMargin,
      roi
    }
  }
}

// POST /api/linebot/calculator - 成本計算
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 驗證必要參數
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { error: '請提供有效的金額' },
        { status: 400 }
      )
    }

    if (!body.currency) {
      return NextResponse.json(
        { error: '請指定貨幣類型' },
        { status: 400 }
      )
    }

    // 執行計算
    const result = await calculateCosts(body)

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        calculatedAt: new Date().toISOString(),
        exchangeRateUpdated: EXCHANGE_RATES.updated
      }
    })

  } catch (error) {
    console.error('Cost calculation error:', error)
    return NextResponse.json(
      { error: '計算失敗', details: error },
      { status: 500 }
    )
  }
}

// GET /api/linebot/calculator - 獲取計算器資訊
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'info'

  try {
    switch (type) {
      case 'rates':
        return NextResponse.json({
          exchangeRates: EXCHANGE_RATES,
          taxRates: TAX_RATES,
          productTaxRates: PRODUCT_TAX_RATES,
          customerDiscounts: CUSTOMER_DISCOUNTS
        })

      case 'currencies':
        return NextResponse.json({
          supportedCurrencies: ['JPY', 'USD', 'EUR', 'TWD'],
          defaultCurrency: 'JPY',
          primaryConversion: 'TWD'
        })

      case 'example':
        const exampleRequest = {
          amount: 1000000,
          currency: 'JPY' as 'JPY' | 'USD' | 'EUR' | 'TWD',
          productType: 'whisky',
          quantity: 1,
          customerTier: 'REGULAR' as 'VIP' | 'REGULAR' | 'PREMIUM' | 'NEW'
        }
        const exampleResult = await calculateCosts(exampleRequest)

        return NextResponse.json({
          example: {
            request: exampleRequest,
            result: exampleResult
          }
        })

      default:
        return NextResponse.json({
          service: 'Cost Calculator API',
          version: '1.0.0',
          features: [
            'multi_currency_conversion',
            'product_specific_tax_rates',
            'customer_tier_pricing',
            'comprehensive_cost_analysis',
            'profit_margin_calculation'
          ],
          supportedCurrencies: ['JPY', 'USD', 'EUR', 'TWD'],
          lastUpdated: new Date().toISOString()
        })
    }

  } catch (error) {
    console.error('Calculator API error:', error)
    return NextResponse.json(
      { error: '服務暫時不可用' },
      { status: 500 }
    )
  }
}