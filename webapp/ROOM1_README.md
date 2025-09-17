# 🍶 酒類進口貿易管理系統 - Room-1 基礎架構

## 📋 專案概述

這是酒類進口貿易管理系統的核心基礎架構，包含認證系統、權限控制和基礎Dashboard。

### 🔑 核心商業邏輯
- **雙重價格機制**：投資方看到調整後價格，超級管理員看到真實價格
- **三種角色權限**：超級管理員、投資方、員工
- **數據隔離**：確保投資方永遠看不到敏感商業資料

## 🏗️ 技術架構

### 前端技術棧
- **Next.js 15** - React框架
- **TypeScript** - 型別安全
- **Ant Design** - UI組件庫
- **NextAuth.js** - 認證系統
- **Tailwind CSS** - 樣式框架

### 後端技術棧
- **Prisma** - ORM資料庫操作
- **PostgreSQL** - 資料庫
- **JSON Web Token** - 權限驗證

## 🚀 快速開始

### 1. 環境設定
```bash
# 複製環境變數文件
cp .env.example .env.local

# 編輯 .env.local 並填入真實的API金鑰
```

### 2. 安裝依賴
```bash
npm install
```

### 3. 資料庫設定
```bash
# 初始化Prisma
npx prisma generate

# 執行資料庫遷移
npx prisma migrate dev --name init

# (可選) 查看資料庫
npx prisma studio
```

### 4. 啟動開發伺服器
```bash
npm run dev
```

開啟瀏覽器並訪問 [http://localhost:3000](http://localhost:3000)

## 📁 專案結構

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API路由
│   ├── auth/              # 認證頁面
│   ├── dashboard/         # Dashboard頁面
│   └── layout.tsx         # 根布局
├── components/            # React組件
│   ├── layout/           # 佈局組件
│   └── providers/        # Context Providers
├── lib/                  # 共用函式庫
├── modules/              # 模組化業務邏輯
│   └── auth/            # 認證模組
└── types/               # TypeScript型別定義
```

## 🔐 認證與權限

### 角色權限
1. **SUPER_ADMIN (超級管理員)**
   - 完整系統存取權限
   - 看到所有真實數據
   - 管理使用者角色

2. **INVESTOR (投資方)**
   - 有限的資料存取
   - 只看到調整後的價格
   - 無法看到個人調貨資料

3. **EMPLOYEE (員工)**
   - 基本操作權限
   - 客戶和商品管理
   - 庫存操作

### 數據隔離機制
- **API層級過濾**：所有API自動根據使用者角色過濾資料
- **前端權限控制**：UI組件根據角色顯示不同內容
- **中間件保護**：敏感路由需要特定權限

## 🛡️ 安全特性

### 商業機密保護
- 投資方永遠看不到 `actualPrice` 欄位
- 個人調貨資料完全隔離
- 傭金計算對投資方不可見

### 技術安全
- JWT token認證
- 密碼雜湊存儲
- SQL注入防護 (Prisma ORM)
- XSS攻擊防護

## 📊 Dashboard功能

### 超級管理員Dashboard
- 總營收和個人調貨營收
- 庫存價值和待收款項
- 快速操作按鈕
- 低庫存警報

### 投資方Dashboard
- 投資項目營收（過濾後）
- 投資獲利分析
- 月度趨勢圖表
- 投資商品明細

### 員工Dashboard
- 今日待辦事項
- 最近訂單狀態
- 庫存警報
- 快速操作功能

## 🔧 開發指南

### API開發規範
1. 使用統一的API回應格式
2. 所有API都要有權限檢查
3. 敏感資料必須過濾
4. 錯誤處理要完整

### 前端開發規範
1. 組件要支援角色權限
2. 使用TypeScript嚴格模式
3. 遵循Ant Design設計規範
4. 響應式設計支援手機版

### 資料庫規範
1. 使用Prisma schema定義
2. 所有敏感欄位要標註
3. 建立適當的索引
4. 資料驗證規則

## 🧪 測试

### 单元测试
```bash
npm run test
```

### E2E测试
```bash
npm run test:e2e
```

### 权限测试重点
1. 角色权限正确性
2. 数据过滤准确性
3. API安全性
4. 前端权限控制

## 📝 API文档

### 认证相关
- `POST /api/auth/signin` - 登入
- `POST /api/auth/signout` - 登出
- `GET /api/auth/session` - 获取session

### 用户管理
- `GET /api/users/me` - 获取当前用户信息
- `PUT /api/users/me` - 更新个人资料

### Dashboard
- `GET /api/dashboard` - 获取Dashboard资料（自动过滤）

## 🚨 重要提醒

### 商业逻辑安全
⚠️ **绝对不能让投资方看到以下资料**：
- `actualPrice` / `actualAmount` 字段
- `commission` 佣金资料
- 个人调货 (`fundingSource: 'PERSONAL'`) 资料
- 真实的销售价格

### 开发注意事项
1. **数据过滤**：新增任何API都要确认数据过滤逻辑
2. **权限检查**：前端组件要检查用户权限
3. **敏感资料**：绝不在前端暴露敏感API endpoint
4. **测试验证**：每个功能都要测试不同角色的存取权限

## 📞 联络信息

如有问题请查阅：
- 项目文档：`/docs` 目录
- API规格：`/shared/docs/API_SPEC.md`
- 商业逻辑：`/docs/BUSINESS_LOGIC.md`

---

**🎯 Next Steps**
1. 完成Room-2主档管理模块
2. 实作Room-3交易核心功能
3. 建立Room-4销售财务系统（双重价格核心）