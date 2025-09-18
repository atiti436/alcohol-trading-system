/**
 * 🔒 API查詢類型定義
 * 修復 ant-a 檢查報告中的16個高優先級any類型問題
 */

// === API查詢條件型別化 (修復12個any問題) ===

/**
 * 基礎WHERE條件類型
 */
export interface BaseWhereCondition {
  isActive?: boolean
  [key: string]: any // 保留彈性，但有基礎結構
}

/**
 * 庫存查詢條件
 */
export interface InventoryWhereCondition extends BaseWhereCondition {
  OR?: Array<{
    name?: { contains: string; mode: 'insensitive' }
    product_code?: { contains: string; mode: 'insensitive' }
    variants?: { some: { sku: { contains: string; mode: 'insensitive' } } }
  }>
  category?: string
  variants?: {
    some: {
      OR?: Array<
        | { available_stock: { lte: number } }
        | {
            AND: Array<{
              stock_quantity?: { gt: number }
              available_stock?: { lte: { stock_quantity: number } }
            }>
          }
      >
    }
  }
}

/**
 * 採購查詢條件
 */
export interface PurchaseWhereCondition extends BaseWhereCondition {
  OR?: Array<{
    purchaseNumber?: { contains: string; mode: 'insensitive' }
    supplier?: { contains: string; mode: 'insensitive' }
    declarationNumber?: { contains: string; mode: 'insensitive' }
  }>
  status?: string
  fundingSource?: string
  investorId?: string
}

/**
 * 客戶查詢條件
 */
export interface CustomerWhereCondition extends BaseWhereCondition {
  OR?: Array<{
    name?: { contains: string; mode: 'insensitive' }
    contact_person?: { contains: string; mode: 'insensitive' }
    phone?: { contains: string }
    company?: { contains: string; mode: 'insensitive' }
    customer_code?: { contains: string; mode: 'insensitive' }
  }>
  tier?: string
}

/**
 * 報表查詢條件 (已存在於business.ts，這裡提供別名)
 */
export interface ReportsWhereCondition {
  isPaid?: boolean
  fundingSource?: string
  createdAt?: {
    gte?: Date
    lte?: Date
  }
}

/**
 * 統一的查詢參數介面
 */
export interface StandardQueryParams {
  search?: string
  page?: number
  limit?: number
  orderBy?: string
  order?: 'asc' | 'desc'
}

/**
 * 庫存查詢參數
 */
export interface InventoryQueryParams extends StandardQueryParams {
  category?: string
  lowStock?: boolean
}

/**
 * 採購查詢參數
 */
export interface PurchaseQueryParams extends StandardQueryParams {
  status?: string
  fundingSource?: string
}

/**
 * 客戶查詢參數
 */
export interface CustomerQueryParams extends StandardQueryParams {
  tier?: string
}

/**
 * 報表查詢參數
 */
export interface ReportsQueryParams {
  type?: 'overview' | 'sales-trend' | 'product-analysis' | 'customer-analysis'
  dateFrom?: string
  dateTo?: string
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year'
}

// === Reduce操作型別 (修復4個any問題) ===

/**
 * Dashboard統計計算的Accumulator型別
 */
export interface DashboardStatsAccumulator {
  totalStock: number
  totalReserved: number
  totalAvailable: number
  totalValue: number
}

/**
 * 月度銷售趨勢Accumulator型別
 */
export interface MonthlySalesAccumulator {
  [month: string]: {
    revenue: number
    profit: number
    count: number
  }
}

/**
 * 產品分析Accumulator型別
 */
export interface ProductAnalysisAccumulator {
  [category: string]: {
    category: string
    salesCount: number
    totalQuantity: number
    revenue: number
    actualRevenue: number
  }
}

/**
 * 客戶統計Accumulator型別
 */
export interface CustomerStatsAccumulator {
  salesCount: number
  revenue: number
  actualRevenue: number
}

// === API響應型別 ===

/**
 * 標準API響應格式
 */
export interface StandardApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  details?: any
  message?: string
}

/**
 * 分頁響應格式
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

/**
 * 庫存統計介面
 */
export interface InventoryStats {
  totalStock: number
  totalReserved: number
  totalAvailable: number
  totalValue: number
  stockStatus: 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  variantCount: number
}

/**
 * 庫存異動記錄創建資料
 */
export interface InventoryMovementCreate {
  variantId: string
  movementType: 'ADJUSTMENT' | 'SALE' | 'PURCHASE' | 'TRANSFER'
  adjustmentType?: 'ADD' | 'SUBTRACT' | 'SET'
  quantity: number
  previousStock: number
  newStock: number
  reason?: string
  notes?: string
  createdBy: string
}