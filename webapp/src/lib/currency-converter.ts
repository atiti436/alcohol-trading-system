/**
 * 💱 匯率轉換器 - 獨立模組
 *
 * 功能：
 * 1. 支援多幣別轉換
 * 2. 使用報單匯率 (手動輸入)
 * 3. 簡單的匯率計算
 */

// ==================== 預設匯率 (僅供參考) ====================

export const DEFAULT_EXCHANGE_RATES = {
  JPY_TWD: 0.2,       // 日圓對台幣 (參考值)
  USD_TWD: 31.5,      // 美元對台幣 (參考值)
  EUR_TWD: 34.2,      // 歐元對台幣 (參考值)
  GBP_TWD: 39.8,      // 英鎊對台幣 (參考值)
  TWD_TWD: 1.0,       // 台幣對台幣
  updated: '2025-01-01T00:00:00.000Z'  // 更新時間
} as const

// 為了向後兼容，建立別名
export const EXCHANGE_RATES = DEFAULT_EXCHANGE_RATES

// ==================== 型別定義 ====================

export type SupportedCurrency = 'JPY' | 'USD' | 'EUR' | 'GBP' | 'TWD'

export interface CurrencyConversionInput {
  amount: number
  fromCurrency: SupportedCurrency
  toCurrency?: SupportedCurrency  // 預設轉為台幣
  customRate?: number             // 自訂匯率
}

export interface CurrencyConversionResult {
  input: {
    amount: number
    fromCurrency: SupportedCurrency
    toCurrency: SupportedCurrency
  }
  conversion: {
    exchangeRate: number
    convertedAmount: number
    roundedAmount: number  // 四捨五入到整數
  }
  metadata: {
    rateSource: 'default' | 'custom' | 'api'
    convertedAt: string
    rateUpdatedAt: string
  }
}

// ==================== 核心轉換函數 ====================

/**
 * 取得預設匯率 (僅供參考，實際使用報單匯率)
 */
export function getDefaultExchangeRate(
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency = 'TWD'
): number {
  // 同幣別
  if (fromCurrency === toCurrency) {
    return 1.0
  }

  // 轉為台幣
  if (toCurrency === 'TWD') {
    const rateKey = `${fromCurrency}_TWD` as keyof typeof DEFAULT_EXCHANGE_RATES
    return DEFAULT_EXCHANGE_RATES[rateKey] || 1.0
  }

  // 其他幣別間轉換 (透過台幣中轉)
  const fromToTwd = getDefaultExchangeRate(fromCurrency, 'TWD')
  const twdToTarget = 1 / getDefaultExchangeRate(toCurrency, 'TWD')
  return fromToTwd * twdToTarget
}

/**
 * 匯率轉換主函數
 */
export function convertCurrency(input: CurrencyConversionInput): CurrencyConversionResult {
  const {
    amount,
    fromCurrency,
    toCurrency = 'TWD',
    customRate
  } = input

  // 取得匯率 - 優先使用自訂匯率 (報單匯率)
  const exchangeRate = customRate || getDefaultExchangeRate(fromCurrency, toCurrency)

  // 計算轉換金額
  const convertedAmount = amount * exchangeRate
  const roundedAmount = Math.round(convertedAmount)

  return {
    input: {
      amount,
      fromCurrency,
      toCurrency
    },
    conversion: {
      exchangeRate,
      convertedAmount,
      roundedAmount
    },
    metadata: {
      rateSource: customRate ? 'custom' : 'default',
      convertedAt: new Date().toISOString(),
      rateUpdatedAt: EXCHANGE_RATES.updated
    }
  }
}

// ==================== 便利函數 ====================

/**
 * 快速轉為台幣
 */
export function toTWD(amount: number, fromCurrency: SupportedCurrency, customRate?: number): number {
  if (fromCurrency === 'TWD') return amount

  const rate = customRate || getDefaultExchangeRate(fromCurrency, 'TWD')
  return Math.round(amount * rate)
}

/**
 * 快速從台幣轉為其他幣別
 */
export function fromTWD(twdAmount: number, toCurrency: SupportedCurrency): number {
  if (toCurrency === 'TWD') return twdAmount

  const rate = getExchangeRate('TWD', toCurrency)
  return Math.round(twdAmount * rate * 100) / 100 // 保留兩位小數
}

/**
 * 驗證貨幣代碼
 */
export function isValidCurrency(currency: string): currency is SupportedCurrency {
  return ['JPY', 'USD', 'EUR', 'GBP', 'TWD'].includes(currency)
}

/**
 * 格式化金額顯示
 */
export function formatCurrencyAmount(
  amount: number,
  currency: SupportedCurrency,
  showSymbol: boolean = true
): string {
  const symbols = {
    JPY: '¥',
    USD: '$',
    EUR: '€',
    GBP: '£',
    TWD: 'NT$'
  }

  const formattedAmount = amount.toLocaleString()
  return showSymbol ? `${symbols[currency]} ${formattedAmount}` : formattedAmount
}

// ==================== 批量轉換 ====================

/**
 * 批量貨幣轉換
 */
export function convertMultipleCurrencies(
  amount: number,
  fromCurrency: SupportedCurrency,
  targetCurrencies: SupportedCurrency[]
): Record<SupportedCurrency, number> {
  const results: Record<string, number> = {}

  for (const target of targetCurrencies) {
    const result = convertCurrency({
      amount,
      fromCurrency,
      toCurrency: target
    })
    results[target] = result.conversion.roundedAmount
  }

  return results as Record<SupportedCurrency, number>
}

// ==================== 匯率歷史 (可擴展) ====================

/**
 * 取得所有支援的幣別匯率
 */
export function getAllExchangeRates(): Record<string, number> {
  return {
    'JPY/TWD': EXCHANGE_RATES.JPY_TWD,
    'USD/TWD': EXCHANGE_RATES.USD_TWD,
    'EUR/TWD': EXCHANGE_RATES.EUR_TWD,
    'GBP/TWD': EXCHANGE_RATES.GBP_TWD,
    'TWD/TWD': EXCHANGE_RATES.TWD_TWD
  }
}

/**
 * 檢查匯率是否需要更新 (可擴展)
 */
export function shouldUpdateRates(): boolean {
  const lastUpdate = new Date(EXCHANGE_RATES.updated)
  const now = new Date()
  const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)

  return hoursDiff > 24 // 24小時更新一次
}