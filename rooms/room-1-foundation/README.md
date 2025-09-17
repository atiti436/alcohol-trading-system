# 🔐 Room-1: 基礎架構房間

## 👋 歡迎入住Room-1！

你將負責整個系統的**核心基礎**，這是所有其他房間的依賴基礎。

## 🎯 房間任務概覽
負責模組：**Auth + User + Dashboard**
預計時間：**2-3週**
優先級：**🔥 最高優先級**

## 📋 工作清單

### Week 1: 🔐 Auth模組
- [ ] NextAuth.js設定與Google登入
- [ ] 角色權限中間件
- [ ] 投資方數據隔離邏輯
- [ ] JWT處理與Session管理
- [ ] API權限驗證

### Week 2: 👥 User模組
- [ ] 使用者資料模型
- [ ] 角色管理介面
- [ ] 個人設定頁面
- [ ] 權限分配邏輯

### Week 3: 🏠 Dashboard模組
- [ ] 角色導向首頁設計
- [ ] 營運數據聚合API
- [ ] 快速操作介面
- [ ] 即時通知系統

## 🔒 關鍵安全要求

### 投資方數據隔離
```typescript
// 投資方只能看到這些
const investorView = {
  displayPrice: 1000,  // 調整後價格
  cost: 800,
  profit: 200
}

// 絕對不能看到這些
const hiddenData = {
  actualPrice: 1200,   // 真實收取價格
  commission: 200,     // 老闆抽成
  personalPurchases: [] // 個人調貨
}
```

### 權限控制矩陣
```
功能/角色        | 超級管理員 | 投資方 | 員工
查看所有數據     | ✅        | ❌    | ❌
投資項目查詢     | ✅        | ✅    | ✅
個人調貨查詢     | ✅        | ❌    | ❌
真實銷售價格     | ✅        | ❌    | ❌
系統設定管理     | ✅        | ❌    | ❌
```

## 📁 模組結構規範

### Auth模組結構
```
/src/modules/auth/
├── components/
│   ├── LoginForm/
│   ├── SignupForm/
│   └── AuthGuard/
├── middleware/
│   ├── auth.ts
│   ├── permissions.ts
│   └── data-filter.ts
├── providers/
│   ├── nextauth.ts
│   └── google.ts
├── types/
│   ├── auth.types.ts
│   └── permissions.types.ts
└── utils/
    ├── jwt.ts
    ├── session.ts
    └── validation.ts
```

### User模組結構
```
/src/modules/user/
├── components/
│   ├── UserProfile/
│   ├── RoleManager/
│   └── UserList/
├── api/
│   ├── users.ts
│   └── roles.ts
├── types/
│   └── user.types.ts
└── hooks/
    ├── useUser.ts
    └── useRole.ts
```

### Dashboard模組結構
```
/src/modules/dashboard/
├── components/
│   ├── SuperAdminDashboard/
│   ├── InvestorDashboard/
│   ├── EmployeeDashboard/
│   ├── QuickActions/
│   └── StatsCards/
├── api/
│   ├── dashboard.ts
│   └── stats.ts
├── types/
│   └── dashboard.types.ts
└── utils/
    ├── data-aggregation.ts
    └── role-specific-data.ts
```

## 🛠️ 技術要求

### 必須使用的技術棧
- **Next.js 14** + **TypeScript**
- **NextAuth.js** + **Google Provider**
- **PostgreSQL** + **Prisma ORM**
- **Ant Design** 5.x
- **Zustand** (狀態管理)

### 資料庫Schema設計
```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  role          Role     @default(EMPLOYEE)
  investorId    String?  // 投資方關聯ID
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum Role {
  SUPER_ADMIN
  INVESTOR
  EMPLOYEE
}
```

## 🧪 測試要求

### 必須通過的測試
1. **登入流程測試**
   - Google OAuth流程正常
   - 角色分配正確
   - Session持久化

2. **權限控制測試**
   - 投資方無法存取敏感API
   - 中間件正確攔截請求
   - 數據過濾功能正常

3. **數據隔離測試**
   - 投資方看不到真實價格
   - 個人調貨完全隱藏
   - API回傳數據正確過濾

## 📝 交接要求

### 必須提供的文件
- [ ] API接口文檔
- [ ] 權限系統使用說明
- [ ] 資料庫Schema文檔
- [ ] 部署配置說明
- [ ] 測試結果報告

### 必須完成的功能
- [ ] 基本登入登出
- [ ] 角色權限控制
- [ ] 投資方數據隔離
- [ ] 三種角色的首頁展示
- [ ] 共用組件和工具

## 🚨 重要提醒

### 安全第一
- **絕對不能洩漏**真實銷售價格給投資方
- **所有敏感API**都要權限檢查
- **資料庫查詢**必須加上角色過濾

### 品質標準
- **TypeScript**嚴格模式
- **ESLint**無錯誤
- **測試覆蓋率** > 80%
- **代碼文檔**完整

## 🔗 相關資源
- 總體需求：`/docs/OVERVIEW.md`
- 商業邏輯：`/docs/BUSINESS_LOGIC.md`
- 共用工具：`/shared/utils/`
- API規範：`/shared/docs/API_SPEC.md`

**這是整個專案的基石，加油！** 🚀