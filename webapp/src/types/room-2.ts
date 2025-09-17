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
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CustomerWithStats extends Customer {
  _count: {
    sales: number
  }
  totalAmount?: number
  recentOrders?: Array<{
    id: string
    saleNumber: string
    totalAmount: number
    actualAmount?: number    // 只有SUPER_ADMIN看得到
    createdAt: Date
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
  isActive?: boolean
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
  code: string             // 向後相容性
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
  hsCode?: string         // 稅則號列
  supplier?: string
  manufacturingDate?: string
  expiryDate?: string
  standardPrice: number   // 標準售價
  currentPrice: number    // 目前售價
  costPrice: number       // 平均成本價
  minPrice: number        // 最低售價限制
  // 庫存欄位已移除 - 庫存在ProductVariant層級管理
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ProductVariant {
  id: string
  productId: string
  variant_code: string    // P00001-A
  variantType: VariantType
  description: string     // "一般版", "100周年紀念版"
  basePrice: number       // 基礎售價
  currentPrice: number    // 目前售價
  discountRate?: number   // 折扣率 (損傷品用)
  limitedEdition: boolean
  productionYear?: number
  serialNumber?: string
  condition: string       // 商品狀況
  stock: number
  cost: number           // 實際成本
  createdAt: Date
  updatedAt: Date
}

export interface ProductWithVariants extends Product {
  variants: ProductVariant[]
  _count: {
    variants: number
    saleItems: number
  }
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
  hsCode?: string
  supplier?: string
  manufacturingDate?: string
  expiryDate?: string
  standardPrice: number
  currentPrice: number
  minPrice: number
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
  hsCode?: string
  supplier?: string
  manufacturingDate?: string
  expiryDate?: string
  standardPrice?: number
  currentPrice?: number
  costPrice?: number
  minPrice?: number
  // 庫存欄位已移除 - 庫存在ProductVariant層級管理
  isActive?: boolean
}

export interface CreateVariantRequest {
  variantType: VariantType
  description: string
  basePrice: number
  currentPrice: number
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
  currentPrice?: number
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
  totalAmount: number
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