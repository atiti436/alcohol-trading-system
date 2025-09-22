/**
 * 🤖 LINE Bot 類型定義
 * 移除 any 類型，提供強類型支援
 */

// LINE Bot 訊息類型
export interface LineTextMessage {
  type: 'text'
  text: string
}

export interface LineImageMessage {
  type: 'image'
  originalContentUrl: string
  previewImageUrl: string
}

export interface LineTemplateMessage {
  type: 'template'
  altText: string
  template: {
    type: string
    [key: string]: any
  }
}

export type LineMessage = LineTextMessage | LineImageMessage | LineTemplateMessage

// LINE Bot 事件類型
export interface LineMessageEvent {
  type: 'message'
  replyToken: string
  source: {
    userId: string
    type: 'user' | 'group' | 'room'
  }
  message: {
    id: string
    type: 'text' | 'image' | 'video' | 'audio' | 'file'
    text?: string
    [key: string]: any
  }
  timestamp: number
}

export interface LineEvent {
  type: string
  mode: string
  timestamp: number
  source: {
    type: 'user' | 'group' | 'room'
    userId?: string
  }
  replyToken?: string
  message?: {
    id: string
    type: string
    [key: string]: any
  }
}

export interface LineWebhookRequest {
  destination: string
  events: LineEvent[]
}

// OCR 相關類型
export interface OCRResult {
  type: 'customs_declaration' | 'product_label' | 'price_list' | 'invoice' | 'general'
  confidence: number
  extractedData: Record<string, any>
  summary: string
  suggestions: string[]
}

// Gemini AI 相關類型
export interface GeminiRequest {
  message: string
  userId: string
  messageType?: 'general' | 'cost_calculation' | 'product_query' | 'inventory' | 'customer_service'
}

export interface GeminiResponse {
  success: boolean
  response: string
  metadata?: {
    messageType: string
    hasCostAnalysis: boolean
    responseTime: number
    model: string
  }
  error?: string
}

// 成本計算類型
export interface CostCalculationRequest {
  amount: number
  currency: 'JPY' | 'USD' | 'EUR' | 'TWD'
  productType?: string
  quantity?: number
  customerTier?: 'VIP' | 'PREMIUM' | 'REGULAR' | 'NEW'
  includeShipping?: boolean
  includeTax?: boolean
  customExchangeRate?: number
}

export interface CostCalculationResult {
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