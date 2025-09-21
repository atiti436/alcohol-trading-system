// 業務模型型別定義 - 統一修復 any 類型使用
// 此檔案定義所有業務相關的 TypeScript 型別，避免使用 any

import { Role } from './auth'

// ========== 基礎實體型別 ==========

export interface Product {
  id: string
  product_code: string
  name: string
  brand?: string
  category: string
  origin?: string
  alc_percentage?: number
  volume_ml?: number
  description?: string
  cost_price: number
  suggestedPrice: number
  is_active: boolean
  created_at: Date
  updated_at: Date
  variants?: ProductVariant[]
}

export interface ProductVariant {
  id: string
  product_id: string
  sku: string
  description: string
  weight_kg?: number
  volume_ml?: number
  stock_quantity: number
  cost_price: number
  suggestedPrice: number
  is_active: boolean
  product?: Product
}

export interface Customer {
  id: string
  customer_code: string
  name: string
  company?: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  paymentTerms: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

// ========== 銷售相關型別 ==========

export interface SaleItem {
  id: string
  saleId: string
  product_id: string
  variantId?: string
  quantity: number
  unit_price: number
  total_price: number
  cost_price: number
  product: Product
  variant?: ProductVariant
}

export interface Sale {
  id: string
  saleNumber: string
  customer_id: string
  total_amount: number
  actual_amount?: number // 老闆實際收到的金額 (僅 SUPER_ADMIN 可見)
  commission?: number   // 老闆賺取的差價 (僅 SUPER_ADMIN 可見)
  isPaid: boolean
  paidAt?: Date
  notes?: string
  created_at: Date
  updated_at: Date
  customer: Customer
  items: SaleItem[]
}

// ========== 採購相關型別 ==========

export interface PurchaseItem {
  id: string
  purchaseId: string
  product_id: string
  variantId?: string
  quantity: number
  unit_price: number
  total_price: number
  product: Product
  variant?: ProductVariant
}

export interface Purchase {
  id: string
  purchaseNumber: string
  supplierName: string
  total_amount: number
  status: 'PENDING' | 'CONFIRMED' | 'RECEIVED' | 'CANCELLED'
  orderDate: Date
  expectedDate?: Date
  receivedDate?: Date
  notes?: string
  created_at: Date
  updated_at: Date
  items: PurchaseItem[]
}

// ========== 對帳單相關型別 ==========

export interface StatementPeriodInfo {
  dateFrom: string
  dateTo: string
  type: string
}

export interface StatementSummary {
  totalSales: number
  totalSalesAmount: number
  totalActualAmount?: number  // 僅 SUPER_ADMIN 可見
  totalCommission?: number    // 僅 SUPER_ADMIN 可見
  totalReceivableAmount: number
  totalPaidAmount: number
  totalOutstandingAmount: number
}

export interface StatementData {
  customer: Customer
  periodInfo: StatementPeriodInfo
  sales: Sale[]
  receivables: AccountReceivable[]
  summary: StatementSummary
}

// ========== 應收帳款型別 ==========

export interface AccountReceivable {
  id: string
  customer_id: string
  saleId?: string
  amount: number
  paidAmount: number
  remainingAmount: number
  dueDate: Date
  status: 'PENDING' | 'OVERDUE' | 'PAID' | 'PARTIAL'
  description?: string
  created_at: Date
  updated_at: Date
  customer: Customer
  sale?: Sale
}

// ========== 庫存相關型別 ==========

export interface InventoryMovement {
  id: string
  product_id: string
  variantId?: string
  type: 'IN' | 'OUT' | 'ADJUSTMENT'
  quantity: number
  reference?: string
  referenceId?: string
  notes?: string
  created_at: Date
  product: Product
  variant?: ProductVariant
}

// ========== 報表相關型別 ==========

export interface SalesReportSummary {
  totalSales: number
  totalRevenue: number
  totalActualRevenue?: number  // 僅 SUPER_ADMIN 可見
  totalCommission?: number     // 僅 SUPER_ADMIN 可見
}

export interface DailyTrendData {
  date: string
  sales: number
  revenue: number
  actualRevenue?: number  // 僅 SUPER_ADMIN 可見
}

export interface ProductSalesData {
  product_id: string
  productName: string
  totalQuantity: number
  totalRevenue: number
  actualRevenue?: number  // 僅 SUPER_ADMIN 可見
}

export interface SalesReport {
  summary: SalesReportSummary
  dailyTrend: DailyTrendData[]
  topProducts: ProductSalesData[]
}

// ========== 資料庫查詢相關型別 ==========

// Prisma 查詢的 WHERE 條件型別
export interface DatabaseWhereCondition {
  [key: string]: any // 這裡保留 any 因為 Prisma 的動態查詢需要
}

// 分組查詢型別 (用於報表)
export interface GroupingQuery {
  dateFormat: string
  groupBy: Record<string, any>
  select: Record<string, any>
}

// ========== API 回應型別 ==========

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ListResponse<T> {
  items: T[]
  pagination: PaginationMeta
}

// ========== 權限控制型別 ==========

export interface SecurePriceDisplayProps {
  amount: number
  currency?: string
  allowedRoles?: Role[]
  displayMultiplier?: number  // 投資方看到的比例 (如 0.8 = 80%)
}

export interface RoleBasedData<T> {
  [Role.SUPER_ADMIN]: T
  [Role.EMPLOYEE]: Partial<T>
  [Role.INVESTOR]: Partial<T>
}

// ========== 表格欄位型別 ==========

export interface TableColumn<T = any> {
  title: string
  dataIndex?: string
  key: string
  width?: number
  align?: 'left' | 'center' | 'right'
  render?: (value: any, record: T, index: number) => React.ReactNode
  sorter?: boolean
  filterable?: boolean
}

// ========== Dashboard 相關型別 ==========

export interface KPIData {
  totalSales: number
  totalRevenue: number
  totalActualRevenue?: number  // 僅 SUPER_ADMIN 可見
  totalProfit?: number         // 僅 SUPER_ADMIN 可見
  activeCustomers: number
  pendingOrders: number
}

export interface DashboardData {
  // 🔑 關鍵KPI指標 (超級管理員)
  totalRevenue?: number
  personalRevenue?: number
  investmentRevenue?: number
  commission?: number
  stockValue?: number
  stockCount?: number
  pendingReceivables?: number

  // 🔑 投資方KPI指標
  investmentProfit?: number
  investmentStock?: number
  profitMargin?: number

  // 詳細資料列表
  lowStockItems?: Array<{
    name: string
    stock: number
    minStock: number
  }>
  salesTrend?: Array<{
    month: string
    revenue: number
    profit: number
    orders: number
  }>
  monthlyTrend?: Array<{
    month: string
    revenue: number
    profit: number
    orders: number
  }>
  investmentItems?: Array<{
    id: string
    sale_number: string
    amount: number
    profit: number
    date: Date
  }>

  // 員工相關資料
  todayTasks?: Array<{
    id: number
    task: string
    status: string
  }>
  recentOrders?: Array<{
    id: string
    customer: string
    amount: number
    status: string
  }>
  stockAlerts?: Array<{
    id: string
    name: string
    stock: number
    alertLevel: string
  }>

  // 快速操作
  quickActions?: Array<{
    id: string
    title: string
    icon: string
    url: string
  }>

  // 圖表資料
  categoryDistribution?: Array<{
    name: string
    value: number
    color: string
  }>
  customerDistribution?: Array<{
    name: string
    value: number
    color: string
  }>
}

// ========== 投資方數據隔離型別 ==========

// 用於標記哪些欄位對投資方隱藏
export type InvestorHiddenFields = 'actual_amount' | 'commission' | 'actualRevenue' | 'totalProfit'

// 用於過濾投資方數據的工具型別
export type OmitForInvestor<T> = Omit<T, InvestorHiddenFields>

// 用於根據角色動態過濾數據
export type RoleFilteredData<T> = T extends { actual_amount?: any }
  ? Role extends 'INVESTOR'
    ? OmitForInvestor<T>
    : T
  : T