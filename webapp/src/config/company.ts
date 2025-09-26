/**
 * 公司資訊配置
 * 統一管理所有單據的公司抬頭資訊
 */

export interface CompanyInfo {
  name: string
  englishName?: string
  address: string
  phone: string
  fax?: string
  email?: string
  website?: string
  taxId?: string // 統一編號
  logo?: string
}

export const COMPANY_INFO: CompanyInfo = {
  name: '滿帆洋行有限公司',
  englishName: 'Full Sail Trading Co., Ltd.',
  address: '台北市中山區南京東路二段123號8樓',
  phone: '(02) 2545-1234',
  fax: '(02) 2545-5678',
  email: 'info@fullsail-trading.com.tw',
  website: 'www.fullsail-trading.com.tw',
  taxId: '12345678'
}

/**
 * 單據類型定義
 */
export const DOCUMENT_TYPES = {
  SHIPPING: 'shipping',      // 出貨單
  STATEMENT: 'statement',    // 對帳單
  INVOICE: 'invoice',        // 發票
  QUOTATION: 'quotation',    // 報價單
  PURCHASE: 'purchase'       // 採購單
} as const

export type DocumentType = typeof DOCUMENT_TYPES[keyof typeof DOCUMENT_TYPES]

/**
 * 單據標題映射
 */
export const DOCUMENT_TITLES: Record<DocumentType, string> = {
  [DOCUMENT_TYPES.SHIPPING]: '出貨單',
  [DOCUMENT_TYPES.STATEMENT]: '對帳單',
  [DOCUMENT_TYPES.INVOICE]: '發票',
  [DOCUMENT_TYPES.QUOTATION]: '報價單',
  [DOCUMENT_TYPES.PURCHASE]: '採購單'
}