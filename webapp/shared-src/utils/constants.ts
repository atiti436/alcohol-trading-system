// 🍶 酒類進口貿易系統 - 共用常數定義

// 使用者角色
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  INVESTOR = 'INVESTOR',
  EMPLOYEE = 'EMPLOYEE'
}

// 資金來源
export enum FundingSource {
  COMPANY = 'COMPANY',     // 投資方出資
  PERSONAL = 'PERSONAL'    // 個人調貨
}

// 酒類分類
export enum AlcoholCategory {
  WHISKY = 'WHISKY',
  SAKE = 'SAKE',
  BEER = 'BEER',
  WINE = 'WINE',
  LIQUEUR = 'LIQUEUR',
  BRANDY = 'BRANDY',
  VODKA = 'VODKA',
  RUM = 'RUM',
  GIN = 'GIN'
}

export const DEFAULT_VARIANT_TYPE_LABEL = '標準款'

// 付款條件
export enum PaymentTerms {
  CASH = 'CASH',                    // 現金
  WEEKLY = 'WEEKLY',                // 週結
  MONTHLY = 'MONTHLY',              // 月結
  SIXTY_DAYS = 'SIXTY_DAYS'         // 60天
}

// 開銷分類
export enum ExpenseCategory {
  RENT = 'RENT',                    // 租金
  UTILITIES = 'UTILITIES',          // 水電瓦斯
  ACCOUNTANT = 'ACCOUNTANT',        // 會計師費
  SHIPPING = 'SHIPPING',            // 宅配運費
  ENTERTAINMENT = 'ENTERTAINMENT',  // 業務招待
  BANK_FEES = 'BANK_FEES',         // 銀行手續費
  INSURANCE = 'INSURANCE',          // 保險費
  SOFTWARE = 'SOFTWARE',            // 軟體訂閱
  OFFICE_SUPPLIES = 'OFFICE_SUPPLIES', // 辦公用品
  TRAVEL = 'TRAVEL',                // 出差旅費
  MARKETING = 'MARKETING',          // 行銷廣告
  TRAINING = 'TRAINING'             // 教育訓練
}

// 開銷分攤方式
export enum AllocationMethod {
  INVESTOR = 'INVESTOR',            // 投資方承擔
  PERSONAL = 'PERSONAL',            // 個人承擔
  CUSTOMER_ORDER = 'CUSTOMER_ORDER' // 客戶訂單分攤
}

// 成本分攤方式
export enum CostAllocationMethod {
  VALUE = 'VALUE',                  // 按金額比例
  QUANTITY = 'QUANTITY',            // 按數量平均
  WEIGHT = 'WEIGHT'                 // 按重量分配
}

// 庫存調撥原因
export enum TransferReason {
  DAMAGE = 'DAMAGE',                // 損傷
  QUALITY_ISSUE = 'QUALITY_ISSUE',  // 品質問題
  RECLASSIFICATION = 'RECLASSIFICATION' // 重新分類
}

// 稅率設定
export const TAX_RATES = {
  TRADE_FEE_RATE: 0.0004,           // 推廣費率 0.04%
  VAT_RATE: 0.05,                   // 營業稅率 5%
  TRADE_FEE_MINIMUM: 100            // 推廣費最低金額
} as const

// 菸酒稅率 (每公升)
export const ALCOHOL_TAX_RATES = {
  BEER: 26,                         // 啤酒 26元/公升
  DISTILLED_SPIRITS: 2.5,           // 蒸餾酒 2.5元/度/公升
  FERMENTED_OTHERS: 7,              // 其他釀造酒 7元/度/公升
  REPROCESSED_HIGH: 185,            // 再製酒(>20%) 185元/公升
  REPROCESSED_LOW: 7                // 再製酒(≤20%) 7元/度/公升
} as const

// 進口稅率 (預設值)
export const DEFAULT_IMPORT_DUTY_RATES = {
  [AlcoholCategory.WHISKY]: 20,     // 威士忌 20%
  [AlcoholCategory.SAKE]: 20,       // 清酒 20%
  [AlcoholCategory.BEER]: 20,       // 啤酒 20%
  [AlcoholCategory.WINE]: 10,       // 葡萄酒 10%
  [AlcoholCategory.LIQUEUR]: 20     // 利口酒 20%
} as const

// 系統設定
export const SYSTEM_CONFIG = {
  // 品號前綴
  PRODUCT_CODE_PREFIX: 'W',

  // 客戶代碼前綴
  CUSTOMER_CODE_PREFIX: 'C',

  // 採購單號前綴
  PURCHASE_ORDER_PREFIX: 'PO',

  // 進貨單號前綴
  GOODS_RECEIPT_PREFIX: 'GR',

  // 銷貨單號前綴
  SALES_ORDER_PREFIX: 'SO',

  // 調撥單號前綴
  TRANSFER_ORDER_PREFIX: 'TR',

  // 預設分頁大小
  DEFAULT_PAGE_SIZE: 20,

  // 最大分頁大小
  MAX_PAGE_SIZE: 100,

  // 搜尋結果限制
  SEARCH_RESULT_LIMIT: 50,

  // AI辨識信心度閾值
  AI_CONFIDENCE_THRESHOLD: 0.8,

  // 低庫存警告閾值
  LOW_STOCK_THRESHOLD: 5,

  // 密碼最小長度
  MIN_PASSWORD_LENGTH: 8,

  // JWT過期時間 (小時)
  JWT_EXPIRES_IN: 24,

  // 檔案上傳大小限制 (MB)
  MAX_FILE_SIZE: 10,

  // 允許的檔案類型
  ALLOWED_FILE_TYPES: ['pdf', 'jpg', 'jpeg', 'png'],

  // 預設匯率 (日幣對台幣)
  DEFAULT_JPY_TO_TWD_RATE: 0.21
} as const

// API回應訊息
export const API_MESSAGES = {
  // 成功訊息
  SUCCESS: {
    CREATED: '建立成功',
    UPDATED: '更新成功',
    DELETED: '刪除成功',
    UPLOADED: '上傳成功'
  },

  // 錯誤訊息
  ERROR: {
    UNAUTHORIZED: '未授權存取',
    FORBIDDEN: '權限不足',
    NOT_FOUND: '資料不存在',
    VALIDATION_FAILED: '資料驗證失敗',
    INTERNAL_ERROR: '系統內部錯誤',
    FILE_TOO_LARGE: '檔案大小超過限制',
    INVALID_FILE_TYPE: '不支援的檔案格式',
    AI_RECOGNITION_FAILED: 'AI辨識失敗',
    INSUFFICIENT_STOCK: '庫存不足',
    DUPLICATE_ENTRY: '資料重複',
    CALCULATION_ERROR: '計算錯誤'
  }
} as const

// LINE BOT設定
export const LINEBOT_CONFIG = {
  // 快速回覆按鈕
  QUICK_REPLIES: {
    CALCULATE_COST: '成本計算',
    SAVE_QUOTE: '儲存報價',
    VIEW_QUOTES: '查看報價',
    TODAY_SUMMARY: '今日總覽'
  },

  // 計算相關關鍵字
  CALCULATION_KEYWORDS: ['計算', '成本', '報價', '價格'],

  // 查詢相關關鍵字
  QUERY_KEYWORDS: ['查詢', '查看', '搜尋', '找'],

  // 記錄相關關鍵字
  RECORD_KEYWORDS: ['記錄', '儲存', '報價給', '賣給']
} as const

// 報表設定
export const REPORT_CONFIG = {
  // 時間範圍選項
  TIME_PERIODS: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'],

  // 圖表顏色配置
  CHART_COLORS: {
    PRIMARY: '#1890ff',
    SUCCESS: '#52c41a',
    WARNING: '#faad14',
    ERROR: '#ff4d4f',
    PURPLE: '#722ed1',
    CYAN: '#13c2c2'
  },

  // 匯出格式
  EXPORT_FORMATS: ['excel', 'pdf', 'csv']
} as const

// 權限定義
export const PERMISSIONS = {
  // 使用者管理
  USER_MANAGEMENT: 'user:manage',
  USER_VIEW: 'user:view',

  // 商品管理
  PRODUCT_MANAGEMENT: 'product:manage',
  PRODUCT_VIEW: 'product:view',

  // 採購管理
  PURCHASE_MANAGEMENT: 'purchase:manage',
  PURCHASE_VIEW: 'purchase:view',

  // 銷售管理
  SALES_MANAGEMENT: 'sales:manage',
  SALES_VIEW: 'sales:view',
  SALES_ACTUAL_PRICE: 'sales:actual_price',

  // 庫存管理
  INVENTORY_MANAGEMENT: 'inventory:manage',
  INVENTORY_VIEW: 'inventory:view',

  // 財務管理
  ACCOUNTING_MANAGEMENT: 'accounting:manage',
  ACCOUNTING_VIEW: 'accounting:view',

  // 報表查看
  REPORT_FULL: 'report:full',
  REPORT_INVESTOR: 'report:investor',
  REPORT_BASIC: 'report:basic',

  // LINE BOT
  LINEBOT_ACCESS: 'linebot:access'
} as const

// 角色權限對應
export const ROLE_PERMISSIONS = {
  [UserRole.SUPER_ADMIN]: Object.values(PERMISSIONS),

  [UserRole.INVESTOR]: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.PURCHASE_VIEW,
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.REPORT_INVESTOR
  ],

  [UserRole.EMPLOYEE]: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.PURCHASE_MANAGEMENT,
    PERMISSIONS.SALES_MANAGEMENT,
    PERMISSIONS.INVENTORY_MANAGEMENT,
    PERMISSIONS.REPORT_BASIC
  ]
} as const

// 驗證規則
export const VALIDATION_RULES = {
  // 商品
  PRODUCT_NAME_MAX_LENGTH: 100,
  PRODUCT_CODE_PATTERN: /^W\d{3}$/,

  // 客戶
  CUSTOMER_NAME_MAX_LENGTH: 50,
  CUSTOMER_CODE_PATTERN: /^C\d{3}$/,

  // 價格
  MIN_PRICE: 0.01,
  MAX_PRICE: 999999.99,

  // 數量
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 9999,

  // 酒精度數
  MIN_ALCOHOL_PERCENTAGE: 0,
  MAX_ALCOHOL_PERCENTAGE: 100,

  // 容量 (ml)
  MIN_VOLUME: 1,
  MAX_VOLUME: 10000,

  // 重量 (kg)
  MIN_WEIGHT: 0.001,
  MAX_WEIGHT: 100,

  // 匯率
  MIN_EXCHANGE_RATE: 0.001,
  MAX_EXCHANGE_RATE: 100
} as const