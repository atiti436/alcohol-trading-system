# 📋 Room-1 工作包詳細規格

## 🎯 任務總覽
建立酒類進口貿易系統的**核心基礎架構**，確保後續所有模組能夠安全、穩定地運行。

## 📚 **必讀單一事實來源 (開發前必讀)** ⚠️重要
- `../shared/docs/ID_DEFINITIONS.md` - **所有ID和編號規則**
- `../shared/docs/DATA_MODELS.md` - **統一資料模型定義**
- `../shared/docs/VALIDATION_RULES.md` - **資料驗證規則** 🛡️防錯必讀
- `../shared/docs/INVENTORY_LOGIC.md` - **庫存連動規則** 📦防超賣必讀  
- `../shared/docs/PERMISSION_CONTROL.md` - **權限控制實作** 🔒商業機密保護
- `../shared/docs/API_SPEC.md` - API規格標準

## 📚 **體驗優化文檔 (品質提升)** ⭐新增
- `../shared/docs/UI_COMPONENT_LIBRARY.md` - **UI組件庫標準** 🎨統一設計
- `../shared/docs/RESPONSIVE_DESIGN_SPEC.md` - **響應式設計規範** 📱手機友善
- `../shared/docs/PERFORMANCE_OPTIMIZATION.md` - **效能優化指南** ⚡提升速度
- `../shared/docs/CODE_QUALITY_STANDARDS.md` - **程式碼品質管控** 🔧維護性

## 🔐 Auth模組詳細規格

### 核心功能需求
1. **Google OAuth登入**
   - 使用NextAuth.js整合Google Provider
   - 支援email和name基本資料獲取
   - 首次登入自動建立使用者記錄

2. **角色權限系統**
   - 三種角色：SUPER_ADMIN, INVESTOR, EMPLOYEE
   - 角色可由超級管理員動態分配
   - 支援投資方關聯ID（一個投資方可有多個帳號）

3. **數據隔離中間件**
   - API層級權限檢查
   - 投資方數據自動過濾
   - 敏感資料存取控制

### 技術實作細節

#### NextAuth.js配置
```typescript
// /src/modules/auth/providers/nextauth.ts
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // 載入使用者角色資訊
    },
    async session({ session, token }) {
      // 附加角色和權限資訊
    },
  },
}
```

#### 權限中間件
```typescript
// /src/modules/auth/middleware/permissions.ts
export function withAuth(handler: NextApiHandler, requiredRole?: Role) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // 1. 驗證JWT token
    // 2. 檢查使用者角色
    // 3. 投資方數據過濾
    // 4. 執行原始handler
  }
}
```

#### 數據過濾邏輯
```typescript
// /src/modules/auth/utils/data-filter.ts
export function filterSalesData(data: SalesData[], userRole: Role, investorId?: string) {
  if (userRole === 'INVESTOR') {
    return data
      .filter(item => item.fundingSource === 'COMPANY') // 只看投資項目
      .map(item => ({
        ...item,
        actualPrice: undefined,    // 隱藏真實價格
        commission: undefined,     // 隱藏傭金
        displayPrice: item.displayPrice // 只顯示調整價格
      }))
  }
  return data // 超級管理員看完整資料
}
```

## 👥 User模組詳細規格

### 核心功能需求
1. **使用者管理CRUD**
   - 新增、編輯、刪除使用者
   - 角色分配與權限設定
   - 投資方關聯設定

2. **個人資料管理**
   - 個人設定頁面
   - 密碼變更（如果支援）
   - 個人偏好設定

### 資料庫Schema
```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  image         String?
  role          Role     @default(EMPLOYEE)
  investorId    String?  // 投資方關聯
  isActive      Boolean  @default(true)
  preferences   Json?    // 個人偏好設定
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // 關聯其他表
  createdPurchases Purchase[]
  createdSales     Sale[]

  @@map("users")
}

enum Role {
  SUPER_ADMIN
  INVESTOR
  EMPLOYEE
}
```

### API端點設計
```typescript
// GET /api/users - 獲取使用者列表（僅超級管理員）
// GET /api/users/me - 獲取當前使用者資訊
// PUT /api/users/me - 更新個人資料
// POST /api/users - 新增使用者（僅超級管理員）
// PUT /api/users/[id] - 更新使用者（僅超級管理員）
// DELETE /api/users/[id] - 刪除使用者（僅超級管理員）
```

## 🏠 Dashboard模組詳細規格

### 角色導向首頁設計

#### 超級管理員首頁
```typescript
interface SuperAdminDashboard {
  totalRevenue: number        // 總營收
  personalRevenue: number     // 個人調貨營收
  investmentRevenue: number   // 投資項目營收
  commission: number          // 總傭金
  stockValue: number          // 庫存價值
  stockCount: number          // 庫存數量
  pendingReceivables: number  // 待收款項
  monthlyTrend: ChartData[]   // 月度趨勢
  topCustomers: Customer[]    // 熱銷客戶
  lowStockItems: Product[]    // 低庫存商品
  quickActions: ActionItem[]  // 快速操作
}
```

#### 投資方首頁
```typescript
interface InvestorDashboard {
  investmentRevenue: number   // 投資項目營收（過濾後）
  investmentProfit: number    // 投資獲利
  investmentStock: number     // 投資商品庫存
  damageLoss: number         // 損傷承擔
  monthlyTrend: ChartData[]   // 投資趨勢（過濾後）
  investmentItems: Product[]  // 投資商品明細
}
```

#### 員工首頁
```typescript
interface EmployeeDashboard {
  todayTasks: Task[]          // 今日待辦
  recentOrders: Order[]       // 最近訂單
  stockAlerts: Alert[]        // 庫存警報
  quickActions: ActionItem[]  // 快速操作
}
```

### 快速操作設計
```typescript
interface QuickAction {
  id: string
  title: string
  icon: string
  url: string
  permission: Role[]
  description: string
}

const quickActions: QuickAction[] = [
  {
    id: 'new-purchase',
    title: '新增採購',
    icon: 'ShoppingCartOutlined',
    url: '/purchase/create',
    permission: ['SUPER_ADMIN', 'EMPLOYEE'],
    description: '建立新的採購單'
  },
  {
    id: 'upload-declaration',
    title: 'AI報單辨識',
    icon: 'FileTextOutlined',
    url: '/purchase/ai-recognition',
    permission: ['SUPER_ADMIN', 'EMPLOYEE'],
    description: '上傳報單PDF進行AI辨識'
  }
  // ... 更多操作
]
```

## 🧪 測試標準

### 單元測試要求
```typescript
// Auth測試
describe('Auth Module', () => {
  test('Google OAuth flow', async () => {
    // 測試登入流程
  })

  test('Role permission check', async () => {
    // 測試權限檢查
  })

  test('Data filtering for investors', async () => {
    // 測試投資方數據過濾
  })
})

// User測試
describe('User Module', () => {
  test('User CRUD operations', async () => {
    // 測試使用者管理
  })

  test('Role assignment', async () => {
    // 測試角色分配
  })
})

// Dashboard測試
describe('Dashboard Module', () => {
  test('Role-specific data display', async () => {
    // 測試角色導向顯示
  })

  test('Quick actions permissions', async () => {
    // 測試快速操作權限
  })
})
```

### 整合測試要求
1. **端到端登入流程**
2. **角色切換測試**
3. **API權限驗證**
4. **數據隔離驗證**

## 📋 驗收標準

### 功能完整性
- [ ] Google登入正常運作
- [ ] 三種角色首頁正確顯示
- [ ] 權限控制無漏洞
- [ ] 投資方數據完全隔離
- [ ] API接口文檔完整

### 安全性檢查
- [ ] 投資方無法存取敏感API
- [ ] 真實銷售價格完全隱藏
- [ ] 個人調貨資料不外洩
- [ ] JWT token安全處理

### 代碼品質
- [ ] TypeScript嚴格模式通過
- [ ] ESLint無錯誤警告
- [ ] 測試覆蓋率 > 80%
- [ ] 代碼註釋完整

### 文檔完整性
- [ ] API接口文檔
- [ ] 模組使用說明
- [ ] 部署配置文檔
- [ ] 故障排除指南

## 🚀 完成後的交接清單

1. **代碼交付**
   - [ ] 完整的模組代碼
   - [ ] 單元測試和整合測試
   - [ ] 配置文件和環境變數說明

2. **文檔交付**
   - [ ] 技術文檔
   - [ ] API規格文檔
   - [ ] 使用者手冊
   - [ ] 維護指南

3. **部署準備**
   - [ ] Docker配置（如需要）
   - [ ] 環境變數列表
   - [ ] 資料庫遷移腳本
   - [ ] 初始化數據腳本

**準備開始了嗎？這是整個系統的基石！** 🏗️