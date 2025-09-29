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
  payment_terms: PaymentTerms
  requires_invoice: boolean
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
    sale_number: string
    total_amount: number
    actual_amount?: number    // 只有SUPER_ADMIN看得到
    created_at: Date
    is_paid: boolean
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
  payment_terms?: PaymentTerms
  requires_invoice?: boolean
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
  payment_terms?: PaymentTerms
  requires_invoice?: boolean
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

export interface Product {
  id: string
  product_code: string      // P00001
  name: string
  category: AlcoholCategory
  volume_ml: number        // 容量(ml)
  alc_percentage: number   // 酒精度(%)
  weight_kg: number          // 商品重量(kg)
  package_weight_kg?: number   // 外盒重量(kg)
  total_weight_kg?: number     // 總重量(kg)
  has_box: boolean
  has_accessories: boolean
  accessory_weight_kg?: number // 附件重量(kg)
  accessories: string[]    // 附件清單
  hs_code?: string         // 稅則號列
  supplier?: string
  manufacturing_date?: string
  expiry_date?: string
  standard_price: number   // 標準售價
  current_price: number    // 目前售價
  cost_price: number       // 平均成本價
  min_price: number        // 最低售價限制
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface ProductVariant {
  id: string
  product_id: string
  variant_code: string    // P00001-A
  variant_type: string
  description: string     // "一般版", "100周年紀念版"
  base_price: number       // 基礎售價
  current_price: number    // 目前售價
  discount_rate?: number   // 折扣率 (損傷品用)
  limited_edition: boolean
  production_year?: number
  serial_number?: string
  condition: string       // 商品狀況
  stock_quantity: number
  reserved_stock?: number  // 已預留庫存（UI 顯示使用，可選）
  available_stock?: number // 可用庫存（UI 顯示使用，可選）
  cost_price: number     // 實際成本
  created_at: Date
  updated_at: Date
}

export interface ProductWithVariants extends Product {
  variants: ProductVariant[]
  _count: {
    variants: number
    sale_items: number
  }
}

// 🔧 新增：Sales 相關類型定義 - 修復 any 類型問題

export interface Sale {
  id: string
  sale_number: string
  customer_id: string
  total_amount: number        // 顯示金額（投資方看到的）
  actual_amount?: number      // 實際收取金額（僅超級管理員）
  commission?: number        // 老闆傭金（僅超級管理員）
  funding_source: 'COMPANY' | 'PERSONAL'
  payment_terms: 'CASH' | 'WEEKLY' | 'MONTHLY' | 'SIXTY_DAYS'
  status: 'DRAFT' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  is_paid: boolean
  paid_at?: Date
  due_date?: Date
  notes?: string
  created_by: string
  created_at: Date
  updated_at: Date
  items?: SaleItem[]
  customer?: Customer
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  variant_id?: string
  quantity: number
  unit_price: number          // 顯示單價
  actual_unit_price?: number   // 實際單價（僅超級管理員）
  total_price: number         // 顯示總價
  actual_total_price?: number  // 實際總價（僅超級管理員）
  is_personal_purchase: boolean
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
  funding_source: 'COMPANY' | 'PERSONAL'
  payment_terms: 'CASH' | 'WEEKLY' | 'MONTHLY' | 'SIXTY_DAYS'
  due_date?: string
  notes?: string
  items: CreateSaleItemRequest[]
}

export interface CreateSaleItemRequest {
  product_id: string
  variant_id?: string
  quantity: number
  unit_price: number
  actual_unit_price?: number
  total_price: number
  actual_total_price?: number
  is_personal_purchase?: boolean
}

export interface UpdateSaleRequest extends Partial<CreateSaleRequest> {
  is_paid?: boolean
  paid_at?: string
}

// 🔧 新增：Purchase 相關類型定義 - 修復 any 類型問題

export interface Purchase {
  id: string
  purchase_number: string
  supplier_id?: string
  supplier: string
  currency: 'JPY' | 'USD' | 'TWD'
  exchange_rate: number
  total_amount: number
  funding_source: 'COMPANY' | 'PERSONAL'
  status: 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'RECEIVED' | 'CANCELLED'
  declaration_number?: string
  declaration_date?: Date
  notes?: string
  created_by: string
  investor_id?: string
  created_at: Date
  updated_at: Date
  items?: PurchaseItem[]
}

export interface PurchaseItem {
  id: string
  purchase_id: string
  product_id?: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  dutiable_value?: number
  tariff_code?: string
  import_duty_rate?: number
  alc_percentage?: number
  volume_ml?: number
  weight_kg?: number
  created_at: Date
  updated_at: Date
  product?: Product
}

export interface CreatePurchaseRequest {
  supplier: string
  currency: 'JPY' | 'USD' | 'TWD'
  exchange_rate: number
  funding_source: 'COMPANY' | 'PERSONAL'
  declaration_number?: string
  declaration_date?: string
  notes?: string
  items: CreatePurchaseItemRequest[]
}

export interface CreatePurchaseItemRequest {
  product_id?: string
  product_name: string
  quantity: number
  unit_price: number
  dutiable_value?: number
  tariff_code?: string
  import_duty_rate?: number
  alc_percentage?: number
  volume_ml?: number
  weight_kg?: number
}

export interface UpdatePurchaseRequest extends Partial<CreatePurchaseRequest> {
  status?: 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'RECEIVED' | 'CANCELLED'
}

export interface CreateProductRequest {
  name: string
  category: AlcoholCategory
  volume_ml: number
  alc_percentage: number
  weight_kg: number
  package_weight_kg?: number
  has_box?: boolean
  has_accessories?: boolean
  accessory_weight_kg?: number
  accessories?: string[]
  hs_code?: string
  supplier?: string
  manufacturing_date?: string
  expiry_date?: string
  standard_price: number
  current_price: number
  min_price: number
  create_default_variant?: boolean
}

export interface UpdateProductRequest {
  name?: string
  category?: AlcoholCategory
  volume_ml?: number
  alc_percentage?: number
  weight_kg?: number
  package_weight_kg?: number
  has_box?: boolean
  has_accessories?: boolean
  accessory_weight_kg?: number
  accessories?: string[]
  hs_code?: string
  supplier?: string
  manufacturing_date?: string
  expiry_date?: string
  standard_price?: number
  current_price?: number
  cost_price?: number
  min_price?: number
  is_active?: boolean
}

export interface CreateVariantRequest {
  variant_type: string
  description: string
  base_price: number
  current_price: number
  discount_rate?: number
  limited_edition?: boolean
  production_year?: number
  serial_number?: string
  condition?: string
  stock_quantity?: number
}

export interface UpdateVariantRequest {
  description?: string
  base_price?: number
  current_price?: number
  discount_rate?: number
  limited_edition?: boolean
  production_year?: number
  serial_number?: string
  condition?: string
  stock_quantity?: number
  cost_price?: number
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
    items: T[]
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
