/**
 * 🏠 Room-2: 主檔管理 - TypeScript 類型定義
 * Customer + Product 模組的完整類型定義
 */

// ===== Customer 相關類型 =====

export enum CustomerTier {
  VIP = 'VIP',           // VIP客戶 -5%
  REGULAR = 'REGULAR',   // 一般客戶 標準價
  PREMIUM = 'PREMIUM',   // 高價客戶 +10%
  NEW = 'NEW'           // 新客戶 觀察期
}

export enum PaymentTerms {
  CASH = 'CASH',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  SIXTY_DAYS = 'SIXTY_DAYS'
}

export interface Customer {
  id: string
  customer_code: string      // C00001
  name: string
  contact_person?: string
  phone?: string
  email?: string
  company?: string
  tax_id?: string           // 統一編號
  address?: string
  shipping_address?: string
  tier: CustomerTier
  paymentTerms: PaymentTerms
  requiresInvoice: boolean
  credit_limit?: number     // 信用額度
  notes?: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface CustomerWithStats extends Customer {
  _count: {
    sales: number
  }
  total_amount?: number
  recentOrders?: Array<{
    id: string
    saleNumber: string
    total_amount: number
    actual_amount?: number    // 只有SUPER_ADMIN看得到
    created_at: Date
    isPaid: boolean
  }>
}

export interface CreateCustomerRequest {
  name: string
  contact_person?: string
  phone?: string
  email?: string
  company?: string
  tax_id?: string
  address?: string
  shipping_address?: string
  tier?: CustomerTier
  paymentTerms?: PaymentTerms
  requiresInvoice?: boolean
  credit_limit?: number
  notes?: string
}

export interface UpdateCustomerRequest {
  name?: string
  contact_person?: string
  phone?: string
  email?: string
  company?: string
  tax_id?: string
  address?: string
  shipping_address?: string
  tier?: CustomerTier
  paymentTerms?: PaymentTerms
  requiresInvoice?: boolean
  credit_limit?: number
  notes?: string
  is_active?: boolean
}

// ===== Product 相關類型 =====

export enum AlcoholCategory {
  WHISKY = 'WHISKY',
  WINE = 'WINE',
  SAKE = 'SAKE',
  BEER = 'BEER',
  SPIRITS = 'SPIRITS',
  LIQUEUR = 'LIQUEUR',
  OTHER = 'OTHER'
}

export enum VariantType {
  A = 'A',  // 一般版
  B = 'B',  // 年度限定版
  C = 'C',  // 紀念版
  D = 'D',  // 特殊限定版
  X = 'X'   // 損傷品
}

export interface Product {
  id: string
  product_code: string      // P00001
  // 已移除 code 欄位，統一使用 product_code
  name: string
  category: AlcoholCategory
  volume_ml: number        // 容量(ml)
  alc_percentage: number   // 酒精度(%)
  weight: number          // 商品重量(kg)
  packageWeight?: number   // 外盒重量(kg)
  totalWeight?: number     // 總重量(kg)
  hasBox: boolean
  hasAccessories: boolean
  accessoryWeight?: number // 附件重量(kg)
  accessories: string[]    // 附件清單
  hs_code?: string         // 稅則號列
  supplier?: string
  manufacturingDate?: string
  expiryDate?: string
  standard_price: number   // 標準售價
  current_price: number    // 目前售價
  cost_price: number       // 平均成本價
  min_price: number        // 最低售價限制
  // 庫存欄位已移除 - 庫存在ProductVariant層級管理
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface ProductVariant {
  id: string
  product_id: string
  variant_code: string    // P00001-A
  variantType: VariantType
  description: string     // "一般版", "100周年紀念版"
  basePrice: number       // 基礎售價
  current_price: number    // 目前售價
  discountRate?: number   // 折扣率 (損傷品用)
  limitedEdition: boolean
  productionYear?: number
  serialNumber?: string
  condition: string       // 商品狀況
  stock_quantity: number
  cost_price: number     // 實際成本
  created_at: Date
  updated_at: Date
}

export interface ProductWithVariants extends Product {
  variants: ProductVariant[]
  _count: {
    variants: number
    saleItems: number
  }
}

// 🔧 新增：Sales 相關類型定義 - 修復 any 類型問題

export interface Sale {
  id: string
  saleNumber: string
  customer_id: string
  total_amount: number        // 顯示金額（投資方看到的）
  actual_amount?: number      // 實際收取金額（僅超級管理員）
  commission?: number        // 老闆傭金（僅超級管理員）
  fundingSource: 'COMPANY' | 'PERSONAL'
  paymentTerms: 'CASH' | 'WEEKLY' | 'MONTHLY' | 'SIXTY_DAYS'
  isPaid: boolean
  paidAt?: Date
  dueDate?: Date
  notes?: string
  createdBy: string
  created_at: Date
  updated_at: Date
  items?: SaleItem[]
  customer?: Customer
}

export interface SaleItem {
  id: string
  saleId: string
  product_id: string
  variantId?: string
  quantity: number
  unit_price: number          // 顯示單價
  actual_unit_price?: number   // 實際單價（僅超級管理員）
  total_price: number         // 顯示總價
  actual_total_price?: number  // 實際總價（僅超級管理員）
  isPersonalPurchase: boolean
  created_at: Date
  updated_at: Date
  product?: Product
  variant?: ProductVariant
}

export interface CreateSaleRequest {
  customer_id: string
  total_amount: number
  actual_amount?: number
  commission?: number
  fundingSource: 'COMPANY' | 'PERSONAL'
  paymentTerms: 'CASH' | 'WEEKLY' | 'MONTHLY' | 'SIXTY_DAYS'
  dueDate?: string
  notes?: string
  items: CreateSaleItemRequest[]
}

export interface CreateSaleItemRequest {
  product_id: string
  variantId?: string
  quantity: number
  unit_price: number
  actual_unit_price?: number
  total_price: number
  actual_total_price?: number
  isPersonalPurchase?: boolean
}

export interface UpdateSaleRequest extends Partial<CreateSaleRequest> {
  isPaid?: boolean
  paidAt?: string
}

// 🔧 新增：Purchase 相關類型定義 - 修復 any 類型問題

export interface Purchase {
  id: string
  purchaseNumber: string
  supplierId?: string
  supplier: string
  currency: 'JPY' | 'USD' | 'TWD'
  exchangeRate: number
  total_amount: number
  fundingSource: 'COMPANY' | 'PERSONAL'
  status: 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'RECEIVED' | 'CANCELLED'
  declarationNumber?: string
  declarationDate?: Date
  notes?: string
  createdBy: string
  investor_id?: string
  created_at: Date
  updated_at: Date
  items?: PurchaseItem[]
}

export interface PurchaseItem {
  id: string
  purchaseId: string
  product_id?: string
  productName: string
  quantity: number
  unit_price: number
  total_price: number
  dutiableValue?: number
  tariffCode?: string
  importDutyRate?: number
  alc_percentage?: number
  volume_ml?: number
  weight?: number
  created_at: Date
  updated_at: Date
  product?: Product
}

export interface CreatePurchaseRequest {
  supplier: string
  currency: 'JPY' | 'USD' | 'TWD'
  exchangeRate: number
  fundingSource: 'COMPANY' | 'PERSONAL'
  declarationNumber?: string
  declarationDate?: string
  notes?: string
  items: CreatePurchaseItemRequest[]
}

export interface CreatePurchaseItemRequest {
  product_id?: string
  productName: string
  quantity: number
  unit_price: number
  dutiableValue?: number
  tariffCode?: string
  importDutyRate?: number
  alc_percentage?: number
  volume_ml?: number
  weight?: number
}

export interface UpdatePurchaseRequest extends Partial<CreatePurchaseRequest> {
  status?: 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'RECEIVED' | 'CANCELLED'
}

export interface CreateProductRequest {
  name: string
  category: AlcoholCategory
  volume_ml: number
  alc_percentage: number
  weight: number
  packageWeight?: number
  hasBox?: boolean
  hasAccessories?: boolean
  accessoryWeight?: number
  accessories?: string[]
  hs_code?: string
  supplier?: string
  manufacturingDate?: string
  expiryDate?: string
  standard_price: number
  current_price: number
  min_price: number
  createDefaultVariant?: boolean
}

export interface UpdateProductRequest {
  name?: string
  category?: AlcoholCategory
  volume_ml?: number
  alc_percentage?: number
  weight?: number
  packageWeight?: number
  hasBox?: boolean
  hasAccessories?: boolean
  accessoryWeight?: number
  accessories?: string[]
  hs_code?: string
  supplier?: string
  manufacturingDate?: string
  expiryDate?: string
  standard_price?: number
  current_price?: number
  cost_price?: number
  min_price?: number
  // 庫存欄位已移除 - 庫存在ProductVariant層級管理
  is_active?: boolean
}

export interface CreateVariantRequest {
  variantType: VariantType
  description: string
  basePrice: number
  current_price: number
  discountRate?: number
  limitedEdition?: boolean
  productionYear?: number
  serialNumber?: string
  condition?: string
  stock?: number
}

export interface UpdateVariantRequest {
  description?: string
  basePrice?: number
  current_price?: number
  discountRate?: number
  limitedEdition?: boolean
  productionYear?: number
  serialNumber?: string
  condition?: string
  stock?: number
  cost?: number
}

// ===== API Response 類型 =====

export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  details?: any
}

export interface PaginatedResponse<T> {
  success: boolean
  data: {
    [key: string]: T[]
    total: number
    page: number
    limit: number
    hasMore: boolean
  }
}

export interface SearchFilters {
  search?: string
  page?: number
  limit?: number
  orderBy?: string
  order?: 'asc' | 'desc'
}

export interface CustomerFilters extends SearchFilters {
  tier?: CustomerTier
}

export interface ProductFilters extends SearchFilters {
  category?: AlcoholCategory
  active?: boolean
}

// ===== 商業邏輯相關類型 =====

export interface CustomerStatistics {
  totalOrders: number
  total_amount: number
}

export interface ProductStatistics {
  totalVariants: number
  totalSales: number
  totalQuantitySold: number
  totalRevenue: number
  // 庫存統計從variants聚合計算
}

export interface VariantStatistics {
  totalSales: number
  totalQuantitySold: number
  totalRevenue: number
}

// ===== 前端UI相關類型 =====

export interface CustomerFormData extends CreateCustomerRequest {}
export interface ProductFormData extends CreateProductRequest {}
export interface VariantFormData extends CreateVariantRequest {}

export interface TableColumn {
  key: string
  title: string
  dataIndex: string
  sorter?: boolean
  width?: number
  render?: (value: any, record: any) => React.ReactNode
}