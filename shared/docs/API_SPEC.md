# 🔌 API規格文件

## 📋 統一API規範

### 通用回應格式
```typescript
interface APIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata?: {
    total?: number
    page?: number
    limit?: number
    timestamp: string
  }
}
```

### 權限檢查標準
```typescript
interface PermissionContext {
  userId: string
  role: 'SUPER_ADMIN' | 'INVESTOR' | 'EMPLOYEE'
  investorId?: string
}

// 每個API都必須包含權限檢查
function withAuth(requiredRole?: Role[]) {
  return (handler: NextApiHandler) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      // 1. 驗證JWT token
      // 2. 檢查使用者角色
      // 3. 投資方數據過濾
      // 4. 執行原始handler
    }
  }
}
```

## 🔐 Auth模組API

### 登入相關
```typescript
// POST /api/auth/signin
interface SignInRequest {
  provider: 'google'
  redirectUrl?: string
}

interface SignInResponse {
  user: {
    id: string
    email: string
    name: string
    role: Role
    investorId?: string
  }
  token: string
  expiresAt: string
}

// POST /api/auth/signout
interface SignOutResponse {
  success: boolean
}

// GET /api/auth/session
interface SessionResponse {
  user: User | null
  isAuthenticated: boolean
}
```

## 👥 User模組API

### 使用者管理
```typescript
// GET /api/users
// 權限：SUPER_ADMIN only
interface GetUsersResponse {
  users: User[]
  total: number
}

// GET /api/users/me
interface GetCurrentUserResponse {
  user: User
  permissions: string[]
}

// PUT /api/users/me
interface UpdateProfileRequest {
  name?: string
  preferences?: Record<string, any>
}

// POST /api/users
// 權限：SUPER_ADMIN only
interface CreateUserRequest {
  email: string
  name: string
  role: Role
  investorId?: string
}

// PUT /api/users/[id]
// 權限：SUPER_ADMIN only
interface UpdateUserRequest {
  name?: string
  role?: Role
  investorId?: string
  isActive?: boolean
}
```

## 👤 Customer模組API

### 客戶管理
```typescript
// GET /api/customers
interface GetCustomersQuery {
  search?: string
  page?: number
  limit?: number
  orderBy?: 'name' | 'createdAt'
  order?: 'asc' | 'desc'
}

interface GetCustomersResponse {
  customers: Customer[]
  total: number
}

// POST /api/customers
interface CreateCustomerRequest {
  name: string
  contactInfo?: string
  paymentTerms: 'CASH' | 'WEEKLY' | 'MONTHLY' | 'SIXTY_DAYS'
  requiresInvoice: boolean
  notes?: string
}

// GET /api/customers/[id]
interface GetCustomerResponse {
  customer: Customer
  recentOrders: Order[]
  totalOrders: number
  totalAmount: number
}

// PUT /api/customers/[id]
interface UpdateCustomerRequest {
  name?: string
  contactInfo?: string
  paymentTerms?: PaymentTerms
  requiresInvoice?: boolean
  customerTier?: CustomerTier
  notes?: string
}

// 客戶分級枚舉
enum CustomerTier {
  VIP = 'VIP',           // VIP客戶 (最優惠價格)
  REGULAR = 'REGULAR',   // 一般客戶 (標準價格)
  PREMIUM = 'PREMIUM',   // 高價客戶 (較高價格)
  NEW = 'NEW'           // 新客戶 (公版價格)
}
```

## 🍶 Product模組API

### 商品資料模型
```typescript
interface Product {
  // 基本資訊
  id: string
  code: string              // W001
  name: string             // 山崎18年威士忌
  category: AlcoholCategory // 威士忌分類

  // 規格資訊
  volume_ml: number        // 容量(ml) - 700
  alc_percentage: number   // 酒精度(%) - 43
  weight: number          // 商品重量(kg) - 1.2
  packageWeight: number   // 外盒重量(kg) - 0.3
  totalWeight: number     // 總重量(kg) - 1.5 (自動計算)

  // 包裝資訊
  hasBox: boolean         // 有無外盒
  hasAccessories: boolean // 有無附件
  accessoryWeight: number // 附件重量(kg)
  accessories: string[]   // 附件清單 ["證書", "特製木盒", "說明書"]

  // 進口資訊
  hsCode: string          // 稅則號列
  supplier: string        // 供應商
  manufacturingDate: string // 製造日期
  expiryDate?: string     // 保存期限

  // 定價資訊
  standardPrice: number   // 標準售價
  currentPrice: number    // 目前售價 (可調整)
  costPrice: number       // 平均成本價
  minPrice: number        // 最低售價限制

  // 庫存資訊
  totalStock: number      // 總庫存
  availableStock: number  // 可售庫存
  reservedStock: number   // 預留庫存

  // 系統資訊
  isActive: boolean       // 是否啟用
  createdAt: Date
  updatedAt: Date
}

interface ProductVariant {
  id: string
  productId: string
  variantCode: string     // W001-A, W001-C, W001-X
  variantType: VariantType
  description: string     // "一般版", "100周年紀念版", "損傷品"

  // 變體特殊定價
  basePrice: number       // 基礎售價
  currentPrice: number    // 目前售價
  discountRate?: number   // 折扣率 (損傷品用)

  // 變體特殊資訊
  limitedEdition: boolean // 是否限定版
  productionYear?: number // 生產年份
  serialNumber?: string   // 序號範圍
  condition: string       // 商品狀況

  // 庫存
  stock: number
  cost: number           // 實際成本
}
```

### 商品管理
```typescript
// GET /api/products
interface GetProductsQuery {
  search?: string
  category?: string
  inStock?: boolean
  page?: number
  limit?: number
}

interface GetProductsResponse {
  products: Product[]
  total: number
}

// GET /api/products/search
interface ProductSearchQuery {
  q: string
  limit?: number
  includeVariants?: boolean
}

interface ProductSearchResponse {
  products: ProductSearchResult[]
  suggestions: string[]
}

interface ProductSearchResult {
  id: string
  code: string
  name: string
  variants: ProductVariant[]
  stockCount: number
  avgCost: number
  suggestedPrice: number
  isInStock: boolean
}

// POST /api/products
interface CreateProductRequest {
  name: string
  category: AlcoholCategory
  volume_ml: number
  alc_percentage: number
  weight_kg: number
  packageWeight?: number // kg
  hasBox: boolean
  hasAccessories: boolean
  accessoryWeight?: number
  accessories?: string[]
  hsCode?: string
  supplier?: string
  manufacturingDate?: string
  expiryDate?: string
  standardPrice: number
  currentPrice: number
  minPrice: number
}

// PUT /api/products/[id]/pricing
interface UpdateProductPricingRequest {
  currentPrice: number
  minPrice?: number
  notes?: string
}

// GET /api/products/[id]/pricing-analysis
interface ProductPricingAnalysisResponse {
  product: Product
  costAnalysis: {
    averageCost: number
    suggestedPriceRange: [number, number]
    competitorPrices?: number[]
  }
  profitAnalysis: {
    currentMargin: number
    investorProfit: number
    ownerCommission: number
    breakEvenPrice: number
  }
  salesHistory: {
    lastSalePrice: number
    averageSalePrice: number
    totalSales: number
    salesTrend: 'UP' | 'DOWN' | 'STABLE'
  }
}

// 客戶分級報價系統
// GET /api/products/[id]/customer-pricing
// 權限：SUPER_ADMIN only
interface CustomerPricingResponse {
  product: Product
  standardPrice: number      // 公版報價
  customerPrices: CustomerPrice[]
  priceHistory: PriceHistory[]
}

interface CustomerPrice {
  customerId: string
  customerName: string
  customerTier: CustomerTier
  specialPrice: number      // 客製價格
  discount: number         // 折扣金額
  discountRate: number     // 折扣率
  reason: string          // 調價原因
  effectiveDate: string   // 生效日期
  lastUpdated: string
  isActive: boolean
}

// POST /api/products/[id]/customer-pricing
interface SetCustomerPriceRequest {
  customerId: string
  specialPrice: number
  reason: string
  effectiveDate?: string
  notes?: string
}

// PUT /api/products/[id]/customer-pricing/[customerId]
interface UpdateCustomerPriceRequest {
  specialPrice: number
  reason: string
  isActive?: boolean
  notes?: string
}

// GET /api/customers/[id]/special-prices
interface CustomerSpecialPricesResponse {
  customer: Customer
  specialPrices: ProductSpecialPrice[]
  totalProducts: number
  averageDiscount: number
}

interface ProductSpecialPrice {
  productId: string
  product_code: string
  productName: string
  standardPrice: number
  specialPrice: number
  discount: number
  discountRate: number
  lastUpdated: string
}

// GET /api/products/[id]/variants
interface GetProductVariantsResponse {
  variants: ProductVariant[]
  mainProduct: Product
}

// POST /api/products/[id]/variants
interface CreateVariantRequest {
  variantType: 'A' | 'B' | 'C' | 'D' | 'X'
  description: string
  notes?: string
}
```

## 🛒 Purchase模組API

### 採購管理
```typescript
// POST /api/purchases
interface CreatePurchaseRequest {
  fundingSource: 'COMPANY' | 'PERSONAL'
  supplier: string
  currency: string
  exchangeRate?: number
  items: PurchaseItem[]
  notes?: string
}

interface PurchaseItem {
  productId?: string
  productName: string
  quantity: number
  unitPrice: number
  alc_percentage?: number
  volume_ml?: number
  weight_kg?: number
}

// POST /api/purchases/ai-recognition
interface AIRecognitionRequest {
  fileId: string // uploaded PDF file ID
}

interface AIRecognitionResponse {
  declarationDate: string
  declarationNumber: string
  exchangeRate: number
  items: RecognizedItem[]
  confidence: number
  stagingId: string // for user confirmation
}

interface RecognizedItem {
  name: string
  quantity: number
  unitPrice: number
  dutiableValue: number
  tariffCode: string
  importDutyRate: number
  alc_percentage?: number
  volume_ml?: number
  weight_kg?: number
}

// POST /api/purchases/staging/[id]/confirm
interface ConfirmStagingRequest {
  items: ConfirmedItem[]
}

interface ConfirmedItem {
  originalIndex: number
  productId?: string
  confirmed: boolean
  modifications?: Partial<RecognizedItem>
}
```

## 📦 Inventory模組API

### 庫存管理
```typescript
// POST /api/inventory/goods-receipts
interface CreateGoodsReceiptRequest {
  purchaseOrderId: string
  actualQuantity: number
  exchangeRate: number
  lossType: 'NONE' | 'INSPECTION' | 'RADIATION' | 'DAMAGE'
  lossQuantity?: number // 僅DAMAGE類型時需要，其他自動計算
  inspectionFee?: number // 僅INSPECTION類型時的抽驗費
  additionalCosts: AdditionalCost[]
  allocationMethod: 'VALUE' | 'QUANTITY' | 'WEIGHT'
}

interface AdditionalCost {
  type: 'SHIPPING' | 'INSPECTION' | 'DECLARATION' | 'PORT_SERVICE'
  amount: number
  description?: string
}

// POST /api/inventory/transfers
interface CreateTransferRequest {
  fromVariantId: string
  toVariantId: string
  quantity: number
  reason: 'DAMAGE' | 'QUALITY_ISSUE' | 'RECLASSIFICATION'
  notes?: string
}

// GET /api/inventory/stock
interface GetStockQuery {
  productId?: string
  lowStock?: boolean
  includeVariants?: boolean
}

interface GetStockResponse {
  stock: StockItem[]
  totalValue: number
  totalQuantity: number
}

interface StockItem {
  productId: string
  variantId: string
  productName: string
  variantCode: string
  quantity: number
  unitCost: number
  totalValue: number
  lastUpdated: string
}
```

## 💸 Sales模組API

### 銷售管理
```typescript
// POST /api/sales
interface CreateSaleRequest {
  customerId: string
  items: SaleItem[]
  displayPrices: number[] // 投資方看到的價格
  actualPrices: number[]  // 實際收取價格 (僅超級管理員)
  paymentTerms: PaymentTerms
  notes?: string
}

interface SaleItem {
  variantId: string
  quantity: number
  unitPrice: number
  isPersonalPurchase: boolean // 是否為個人調貨
}

// GET /api/sales
// 數據會根據角色自動過濾
interface GetSalesQuery {
  customerId?: string
  dateFrom?: string
  dateTo?: string
  fundingSource?: 'COMPANY' | 'PERSONAL' | 'ALL'
  page?: number
  limit?: number
}

interface GetSalesResponse {
  sales: Sale[]
  total: number
  summary: {
    totalRevenue: number
    totalCost: number
    totalProfit: number
    commission?: number // 僅超級管理員可見
  }
}

// 投資方版本的Sale資料 (自動過濾)
interface InvestorSale {
  id: string
  customerId: string
  customerName: string
  items: InvestorSaleItem[]
  totalAmount: number // 僅displayPrice總和
  cost: number
  profit: number
  createdAt: string
  // 不包含actualPrice, commission等敏感資料
}

// 超級管理員版本的Sale資料 (完整資料)
interface FullSale extends InvestorSale {
  actualTotalAmount: number
  commission: number
  isPersonalPurchase: boolean
  profitBreakdown: {
    investorProfit: number
    ownerCommission: number
  }
}
```

## 💳 Accounting模組API

### 對帳管理
```typescript
// GET /api/accounting/receivables
interface GetReceivablesResponse {
  receivables: Receivable[]
  overdue: Receivable[]
  totalAmount: number
  overdueAmount: number
}

interface Receivable {
  id: string
  customerId: string
  customerName: string
  amount: number
  dueDate: string
  daysPastDue: number
  paymentTerms: PaymentTerms
  isOverdue: boolean
}

// POST /api/accounting/expenses
interface CreateExpenseRequest {
  category: ExpenseCategory
  amount: number
  description: string
  supplier?: string
  invoiceNumber?: string
  allocationMethod: 'INVESTOR' | 'PERSONAL' | 'CUSTOMER_ORDER'
  orderId?: string // if allocated to specific order
  date: string
  attachments?: string[]
}

enum ExpenseCategory {
  RENT = 'RENT',
  UTILITIES = 'UTILITIES',
  ACCOUNTANT = 'ACCOUNTANT',
  SHIPPING = 'SHIPPING',
  ENTERTAINMENT = 'ENTERTAINMENT',
  BANK_FEES = 'BANK_FEES',
  INSURANCE = 'INSURANCE',
  SOFTWARE = 'SOFTWARE'
}

// GET /api/accounting/expenses
interface GetExpensesQuery {
  category?: ExpenseCategory
  allocationMethod?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

interface GetExpensesResponse {
  expenses: Expense[]
  total: number
  summary: ExpenseSummary
}

interface ExpenseSummary {
  totalAmount: number
  byCategory: Record<ExpenseCategory, number>
  byAllocation: {
    investor: number
    personal: number
    customerOrder: number
  }
}
```

## 📈 Report模組API

### 報表分析
```typescript
// GET /api/reports/dashboard
// 根據使用者角色回傳不同資料
interface GetDashboardQuery {
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  dateFrom?: string
  dateTo?: string
}

// 投資方版本 (資料已過濾)
interface InvestorDashboardResponse {
  revenue: number // 僅投資項目displayPrice
  cost: number
  profit: number
  topProducts: ProductStats[]
  monthlyTrend: TrendData[]
  // 不包含personal purchases, actual prices等
}

// 超級管理員版本 (完整資料)
interface FullDashboardResponse extends InvestorDashboardResponse {
  personalRevenue: number
  totalCommission: number
  actualTotalRevenue: number
  profitBreakdown: {
    investorProfit: number
    ownerCommission: number
    personalProfit: number
  }
  expenseBreakdown: ExpenseSummary
}

// GET /api/reports/products
interface GetProductReportQuery {
  period: string
  includeVariants?: boolean
  sortBy?: 'revenue' | 'quantity' | 'profit'
}

interface GetProductReportResponse {
  products: ProductPerformance[]
  summary: {
    totalRevenue: number
    totalQuantity: number
    averageMargin: number
  }
}

interface ProductPerformance {
  productId: string
  productName: string
  variants: VariantPerformance[]
  totalRevenue: number
  totalQuantity: number
  averageMargin: number
  trendData: TrendData[]
}
```

## 🤖 LineBot模組API

### LINE BOT整合
```typescript
// POST /api/linebot/webhook
interface LineBotWebhookRequest {
  events: LineBotEvent[]
}

interface LineBotEvent {
  type: 'message' | 'postback'
  source: {
    userId: string
    type: 'user'
  }
  message?: {
    type: 'text'
    text: string
  }
  postback?: {
    data: string
  }
}

// POST /api/linebot/calculate-cost
interface CalculateCostRequest {
  productName: string
  volume_ml: number
  alc_percentage: number
  jpyPrice: number
  exchangeRate: number
  isRadiation?: boolean
}

interface CalculateCostResponse {
  breakdown: CostBreakdown
  suggestedPrices: SuggestedPrice[]
  formula: string
}

interface CostBreakdown {
  baseCost: number
  tariff: number
  alcoholTax: number
  tradeFee: number
  vat: number
  totalCost: number
}

// POST /api/linebot/save-quote
interface SaveQuoteRequest {
  customerName: string
  productName: string
  cost: number
  quotePrice: number
  hasProductCode: boolean
  notes?: string
}

// GET /api/linebot/quotes/[customerName]
interface GetCustomerQuotesResponse {
  quotes: Quote[]
  customerStats: {
    totalQuotes: number
    acceptanceRate: number
    averageMargin: number
    preferredPriceRange: [number, number]
  }
}
```

## 🔒 權限控制說明

### API存取權限矩陣
```
API端點                    | SUPER_ADMIN | INVESTOR | EMPLOYEE
/api/auth/*               | ✅          | ✅       | ✅
/api/users/me             | ✅          | ✅       | ✅
/api/users (管理)         | ✅          | ❌       | ❌
/api/customers            | ✅          | ✅       | ✅
/api/products             | ✅          | ✅       | ✅
/api/purchases            | ✅          | ✅*      | ✅
/api/inventory            | ✅          | ✅*      | ✅
/api/sales                | ✅          | ✅*      | ✅
/api/accounting           | ✅          | ✅*      | ❌
/api/reports              | ✅          | ✅*      | ❌
/api/linebot              | ✅          | ❌       | ❌

* 表示資料會根據角色過濾
```

### 資料過濾規則
```typescript
// 投資方資料過濾範例
function filterForInvestor<T>(data: T[], userContext: PermissionContext): Partial<T>[] {
  return data
    .filter(item =>
      // 只顯示投資項目
      item.fundingSource === 'COMPANY' &&
      item.investorId === userContext.investorId
    )
    .map(item => ({
      ...item,
      // 移除敏感欄位
      actualPrice: undefined,
      commission: undefined,
      personalPurchases: undefined,
      // 保留投資方需要的欄位
      displayPrice: item.displayPrice,
      cost: item.cost,
      profit: item.displayPrice - item.cost
    }))
}
```

## 📝 API使用範例

### 建立銷售單 (雙重價格)
```typescript
// 超級管理員建立銷售單
const saleData = {
  customerId: 'cust_001',
  items: [{
    variantId: 'W001-A',
    quantity: 1,
    unitPrice: 1200, // 實際收取價格
    isPersonalPurchase: false
  }],
  displayPrices: [1000], // 投資方看到的價格
  actualPrices: [1200],   // 實際收取價格
  paymentTerms: 'MONTHLY'
}

const response = await fetch('/api/sales', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(saleData)
})

// 投資方查詢時，只會看到displayPrice相關資料
```

### LINE BOT成本計算
```typescript
// LINE BOT傳送計算請求
const costCalc = {
  productName: '白鶴清酒',
  volume_ml: 720,
  alc_percentage: 15,
  jpyPrice: 800,
  exchangeRate: 0.21
}

const result = await fetch('/api/linebot/calculate-cost', {
  method: 'POST',
  body: JSON.stringify(costCalc)
})

// 回傳詳細計算結果和建議售價
```

## ⚙️ 系統設定API

### API金鑰管理
```typescript
// GET /api/system/api-keys
// 權限：SUPER_ADMIN only
interface GetAPIKeysResponse {
  geminiApi: {
    isConfigured: boolean
    isConnected: boolean
    version: string // "gemini-2.5-pro"
    usage?: {
      used: number
      limit: number
      resetDate: string
    }
    lastTested: string
  }
  lineApi: {
    isConfigured: boolean
    isConnected: boolean
    webhookUrl: string
    lastTested: string
  }
  googleOAuth: {
    isConfigured: boolean
    isConnected: boolean
    lastTested: string
  }
  database: {
    isConnected: boolean
    version: string
    lastTested: string
  }
}

// PUT /api/system/api-keys/gemini
interface UpdateGeminiAPIRequest {
  apiKey: string
  testConnection?: boolean
}

// PUT /api/system/api-keys/line
interface UpdateLineAPIRequest {
  channelAccessToken: string
  channelSecret?: string
  testConnection?: boolean
}

// PUT /api/system/api-keys/google-oauth
interface UpdateGoogleOAuthRequest {
  clientId: string
  clientSecret: string
  testConnection?: boolean
}

// POST /api/system/api-keys/test-connection
interface TestConnectionRequest {
  service: 'gemini' | 'line' | 'google-oauth' | 'database'
}

interface TestConnectionResponse {
  success: boolean
  service: string
  message: string
  details?: any
  timestamp: string
}

// GET /api/system/health
interface SystemHealthResponse {
  status: 'healthy' | 'warning' | 'error'
  services: {
    database: ServiceStatus
    geminiApi: ServiceStatus
    lineBot: ServiceStatus
    googleOAuth: ServiceStatus
  }
  lastUpdated: string
}

interface ServiceStatus {
  status: 'online' | 'offline' | 'degraded'
  responseTime?: number
  lastError?: string
  uptime: string
}

// POST /api/system/backup
// 權限：SUPER_ADMIN only
interface CreateBackupRequest {
  includeApiKeys: boolean
  includeUserData: boolean
  description?: string
}

interface CreateBackupResponse {
  backupId: string
  downloadUrl: string
  expiresAt: string
  size: number
}

// 報價導出系統
// GET /api/quotations/export
// 權限：SUPER_ADMIN only
interface ExportQuotationQuery {
  customerId?: string
  productIds?: string[]
  format: 'excel' | 'pdf' | 'csv'
  includeImages?: boolean
  template?: 'standard' | 'premium' | 'simple'
}

interface ExportQuotationResponse {
  downloadUrl: string
  fileName: string
  expiresAt: string
  totalProducts: number
}

// POST /api/quotations/generate
interface GenerateQuotationRequest {
  customerId: string
  productIds: string[]
  quotationDate: string
  validUntil: string
  notes?: string
  template: 'standard' | 'premium' | 'simple'
  includeTerms: boolean
}

interface GenerateQuotationResponse {
  quotationId: string
  quotationNumber: string  // QT20250915001
  downloadUrl: string
  previewUrl: string
  totalAmount: number
  totalProducts: number
}

// GET /api/quotations/[id]
interface QuotationDetailsResponse {
  quotation: Quotation
  customer: Customer
  products: QuotationProduct[]
  totalAmount: number
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
}

interface Quotation {
  id: string
  quotationNumber: string
  customerId: string
  quotationDate: string
  validUntil: string
  notes: string
  template: string
  status: string
  createdAt: string
  sentAt?: string
  viewedAt?: string
  respondedAt?: string
}

interface QuotationProduct {
  productId: string
  product_code: string
  productName: string
  quantity: number
  unitPrice: number        // 根據客戶顯示對應價格
  totalPrice: number
  isSpecialPrice: boolean  // 是否為客製價格
  discount?: number        // 如果有折扣
}
```

## ⚙️ 系統設定API (新增)

### API金鑰管理
```typescript
// GET /api/system/settings
// 權限：SUPER_ADMIN only
interface GetSystemSettingsResponse {
  geminiApi: {
    isConfigured: boolean
    isConnected: boolean
    version: string // "gemini-2.5-pro"
    usage?: {
      used: number
      limit: number
      resetDate: string
    }
    lastTested: string
  }
  lineApi: {
    isConfigured: boolean
    isConnected: boolean
    webhookUrl: string
    lastTested: string
  }
  googleOAuth: {
    isConfigured: boolean
    isConnected: boolean
    lastTested: string
  }
  database: {
    isConnected: boolean
    version: string
    lastTested: string
  }
}

// PUT /api/system/settings/gemini
interface UpdateGeminiAPIRequest {
  apiKey: string
  testConnection?: boolean
}

// PUT /api/system/settings/line
interface UpdateLineAPIRequest {
  channelAccessToken: string
  channelSecret?: string
  testConnection?: boolean
}

// PUT /api/system/settings/google-oauth
interface UpdateGoogleOAuthRequest {
  clientId: string
  clientSecret: string
  testConnection?: boolean
}

// POST /api/system/test-connection
interface TestConnectionRequest {
  service: 'gemini' | 'line' | 'google-oauth' | 'database'
}

interface TestConnectionResponse {
  success: boolean
  service: string
  message: string
  details?: any
  timestamp: string
}

// GET /api/system/health
interface SystemHealthResponse {
  status: 'healthy' | 'warning' | 'error'
  services: {
    database: ServiceStatus
    geminiApi: ServiceStatus
    lineBot: ServiceStatus
    googleOAuth: ServiceStatus
  }
  lastUpdated: string
}

interface ServiceStatus {
  status: 'online' | 'offline' | 'degraded'
  responseTime?: number
  lastError?: string
  uptime: string
}

// POST /api/system/backup
// 權限：SUPER_ADMIN only
interface CreateBackupRequest {
  includeApiKeys: boolean
  includeUserData: boolean
  description?: string
}

interface CreateBackupResponse {
  backupId: string
  downloadUrl: string
  expiresAt: string
  size: number
}
```

### 系統初始化API
```typescript
// POST /api/system/initialize
// 權限：未初始化時允許，初始化後僅SUPER_ADMIN
interface SystemInitializeRequest {
  adminEmail: string
  adminName: string
  companyName: string
  initialSettings: {
    geminiApiKey?: string
    lineChannelAccessToken?: string
    lineChannelSecret?: string
    googleClientId?: string
    googleClientSecret?: string
  }
}

interface SystemInitializeResponse {
  success: boolean
  adminUser: User
  systemStatus: 'initialized'
  nextSteps: string[]
}

// GET /api/system/status
interface SystemStatusResponse {
  isInitialized: boolean
  version: string
  environment: 'development' | 'production'
  features: {
    aiRecognition: boolean
    lineBot: boolean
    reporting: boolean
    multiUser: boolean
  }
}
```

### 加密設定管理
```typescript
// 所有敏感設定都要加密儲存
interface EncryptedSetting {
  id: string
  service: string
  encryptedValue: string
  createdAt: string
  updatedAt: string
  lastUsed?: string
}

// PUT /api/system/settings/encrypt
interface UpdateEncryptedSettingRequest {
  service: 'gemini' | 'line' | 'google-oauth' | 'custom'
  key: string
  value: string
  description?: string
}

// GET /api/system/settings/status
interface SettingsStatusResponse {
  configured: {
    geminiApi: boolean
    lineBot: boolean
    googleOAuth: boolean
    database: boolean
  }
  lastUpdated: {
    geminiApi?: string
    lineBot?: string
    googleOAuth?: string
  }
  health: {
    allServicesOnline: boolean
    criticalIssues: string[]
    warnings: string[]
  }
}
```

**所有API都必須遵循此規格，確保系統的一致性和安全性！** 🔒