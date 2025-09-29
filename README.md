# 🍶 酒類進口貿易管理系統

> **企業級酒類進出口貿易管理平台** - 具備完整權限控制、數據隔離機制與AI智慧化的現代貿易管理解決方案

## 🎯 專案狀態總覽 (2025-09-29)

### ✅ 已完成模組 (生產就緒)
| 模組 | 功能範圍 | 狀態 | 完成度 |
|------|---------|------|---------|
| 🔐 **Room-1** 基礎架構 | 認證系統、權限控制、用戶管理 | ✅ 完成 | 100% |
| 🏪 **Room-2** 主檔管理 | 客戶管理、商品變體系統 | ✅ 完成 | 100% |
| 🏭 **Room-3** 交易核心 | 採購管理、庫存系統 | ✅ 完成 | 95% |
| 💰 **Room-4** 銷售財務 | 雙重價格機制、收支記錄 | ✅ 完成 | 90% |
| 🤖 **Room-6** AI智慧助手 | LINE BOT、Gemini AI整合 | ✅ 完成 | 85% |

### 🚧 待開發模組
| 模組 | 功能範圍 | 狀態 | 預計時程 |
|------|---------|------|----------|
| 📊 **Room-5** 報表分析 | 多維度報表、數據視覺化 | 🟡 待開發 | 2-3週 |
| 🎨 **Room-7** UI/UX專門 | Dashboard優化、像素風CRM | 🟡 待開發 | 4-6週 |

## 🔒 核心安全特性

### 雙重價格機制 ⭐ (企業級資料隔離)
- **投資方完全隔離**：無法存取真實價格、傭金、個人調貨等商業機密
- **三層API保護**：資料庫層RLS + API層過濾 + 前端權限控制
- **審計追蹤系統**：所有敏感資料存取完整記錄，異常行為即時告警
- **數據轉換層**：DTO模式確保敏感欄位永不洩露

### 四級權限系統
| 角色 | 權限範圍 | 數據可見性 | 核心功能 |
|------|----------|------------|----------|
| 🔥 **SUPER_ADMIN** | 完整系統管理 | 所有真實數據 | 定價管理、抽成設定、個人調貨 |
| 💼 **EMPLOYEE** | 基本業務操作 | 標準業務數據 | 訂單處理、庫存管理、客戶維護 |
| 💰 **INVESTOR** | 限制性查看 | 過濾後數據 | 投資項目ROI、成本分析 |
| ⏳ **PENDING** | 待審核狀態 | 無數據存取 | 等待管理員審核 |

## 🏗️ 技術架構

### 前端技術棧
```
React 18.3 + Next.js 14 (App Router)
├── TypeScript 5.2 - 嚴格類型檢查
├── Ant Design 5.21 - 企業級UI組件
├── Tailwind CSS 4.0 - 現代CSS框架
├── React Testing Library - 組件測試
└── ECharts + D3.js - 數據視覺化
```

### 後端技術棧
```
Node.js 20+ Runtime
├── Prisma 6.16 - 類型安全ORM
├── PostgreSQL 13+ - 關聯式資料庫
├── NextAuth.js 4.24 - 身份認證
├── JWT - 會話管理
└── Zod - 數據驗證
```

### AI與整合服務
```
Google Gemini AI 2.5 Pro
├── PDF OCR辨識 - 自動化進口報單處理
├── 成本計算引擎 - 智慧稅費與匯率
├── LINE Bot整合 - 客戶服務自動化
└── 語音轉文字 - 業務記錄快速輸入
```

### DevOps & CI/CD
```
GitHub Actions Pipeline
├── Jest 29.5 - 單元測試 + 覆蓋率報告
├── ESLint + TypeScript - 程式品質檢查
├── 安全檢測 - 敏感資料洩露防護
└── 自動部署 - Vercel/ZEABUR 雲端平台
```

## 📊 核心數據模型

### 客戶管理系統
```typescript
interface Customer {
  // 基礎資訊
  customer_code: string         // C00001
  name: string                 // 客戶名稱
  tier: 'VIP'|'PREMIUM'|'REGULAR'|'NEW'
  payment_terms: PaymentTerms

  // 聯絡資訊
  contact_person: string
  phone: string
  email: string
  address: string
  shipping_address: string

  // 商業資訊
  tax_id: string              // 統一編號
  company: string             // 公司名稱
  credit_limit: number        // 信用額度
  requires_invoice: boolean   // 發票需求
}
```

### 產品與庫存系統
```typescript
interface Product {
  // 產品基本資訊
  product_code: string        // P00001
  name: string               // 山崎18年單一麥芽威士忌
  category: AlcoholCategory  // WHISKY, WINE, SAKE, etc.

  // 規格資訊
  volume_ml: number          // 容量 700ml
  alc_percentage: number     // 酒精度 43%
  weight_kg: number          // 商品重量

  // 定價資訊 (分層權限)
  standard_price: number     // 標準售價 (投資方可見)
  current_price: number      // 目前售價 (投資方可見)
  min_price: number          // 最低限價 (管理員限定)
  cost_price: number         // 成本價格 (管理員限定)
}

interface ProductVariant {
  variant_code: string       // P00001-A, P00001-X
  variant_type: 'A'|'B'|'C'|'D'|'X'  // 一般版|限定版|損傷品
  stock_quantity: number     // 庫存數量
  condition: string          // 商品狀況
}
```

### 雙重價格交易系統
```typescript
interface Sale {
  // 基本交易資訊
  sale_number: string
  customer_id: string
  funding_source: 'COMPANY'|'PERSONAL'

  // 雙重價格機制 (核心安全功能)
  unit_display_price: number    // 投資方看到的價格
  unit_actual_price: number     // 真實收取價格 (敏感)
  total_commission: number      // 老闆抽成 (敏感)

  // 個人調貨標記
  is_personal_purchase: boolean // 完全對投資方隱藏
}
```

## 🚀 系統功能亮點

### 🤖 AI智慧化功能
- **智慧OCR辨識**：自動解析進口報單，辨識率85%+
- **成本計算引擎**：含稅費、匯率、運費的精確計算
- **LINE Bot助手**：24/7客戶服務、訂單狀態通知
- **語音快速記錄**：業務資訊語音轉文字輸入

### 📊 商業智慧分析
- **多維度報表**：客戶、產品、時間多角度分析
- **ROI投資分析**：投資方專屬的收益報告
- **庫存預警系統**：低庫存自動提醒與補貨建議
- **客戶價值分析**：VIP客戶識別與分級管理

### 💰 財務管理系統
- **多幣別支援**：JPY, USD, EUR, TWD 即時匯率
- **分期付款管理**：CASH, WEEKLY, MONTHLY, SIXTY_DAYS
- **應收帳款追蹤**：逾期提醒與催款管理
- **成本利潤分析**：精確的毛利與淨利計算

### 🔐 企業級安全控制
- **Row-Level Security**：資料庫層級的數據隔離
- **API權限過濾**：每個端點都有角色檢查
- **審計日誌系統**：完整的操作記錄與異常告警
- **加密金鑰管理**：敏感設定的安全儲存

## 🗂️ 專案結構

```
alcohol-trading-system/
├── webapp/                           # 主應用程式
│   ├── src/
│   │   ├── app/                     # Next.js 14 App Router
│   │   │   ├── api/                 # API Routes (REST)
│   │   │   ├── auth/                # 認證頁面
│   │   │   ├── dashboard/           # 主控台
│   │   │   ├── customers/           # 客戶管理
│   │   │   ├── products/            # 商品管理
│   │   │   ├── sales/               # 銷售管理
│   │   │   ├── purchases/           # 採購管理
│   │   │   ├── inventory/           # 庫存管理
│   │   │   ├── reports/             # 報表分析
│   │   │   └── settings/            # 系統設定
│   │   ├── components/              # React 組件庫
│   │   │   ├── ui/                  # 基礎UI組件
│   │   │   ├── forms/               # 表單組件
│   │   │   ├── tables/              # 表格組件
│   │   │   ├── charts/              # 圖表組件
│   │   │   └── auth/                # 認證組件
│   │   ├── lib/                     # 核心工具函數
│   │   │   ├── auth.ts             # 認證邏輯
│   │   │   ├── permissions.ts      # 權限控制
│   │   │   ├── encryption.ts       # 加密工具
│   │   │   ├── audit.ts            # 審計日誌
│   │   │   └── validation.ts       # 數據驗證
│   │   ├── types/                   # TypeScript 類型定義
│   │   │   ├── database.ts         # 資料庫類型
│   │   │   ├── api.ts              # API回應類型
│   │   │   └── business.ts         # 業務邏輯類型
│   │   ├── middleware/              # API中間件
│   │   │   ├── auth.middleware.ts  # 身份驗證
│   │   │   └── permissions.middleware.ts # 權限檢查
│   │   ├── dto/                     # 數據傳輸對象
│   │   │   ├── sales.dto.ts        # 銷售數據轉換
│   │   │   ├── customer.dto.ts     # 客戶數據轉換
│   │   │   └── product.dto.ts      # 商品數據轉換
│   │   └── tests/                   # 測試套件
│   │       ├── security/           # 安全性測試
│   │       ├── api/                # API測試
│   │       ├── business/           # 業務邏輯測試
│   │       └── integration/        # 整合測試
│   ├── prisma/                      # 資料庫 Schema & 遷移
│   │   ├── schema.prisma           # 數據模型定義
│   │   ├── migrations/             # 資料庫遷移
│   │   └── seeds/                  # 測試數據種子
│   ├── public/                      # 靜態資源
│   │   ├── icons/                  # 圖標資源
│   │   ├── images/                 # 圖片資源
│   │   └── docs/                   # 公開文檔
│   └── scripts/                     # 部署腳本
├── shared/                          # 共用資源與文檔
│   └── docs/                        # 技術規格文檔
│       ├── DATA_MODELS.md          # 核心數據模型
│       ├── API_SPEC.md             # API規格文檔
│       ├── PERMISSION_CONTROL.md   # 權限控制指南
│       ├── DEPLOYMENT.md           # 部署策略
│       └── TESTING_GUIDE.md        # 測試指引
├── rooms/                           # 開發房間計劃
│   ├── room-1-foundation/          # 基礎架構
│   ├── room-2-masterdata/          # 主檔管理
│   ├── room-3-trading/             # 交易核心
│   ├── room-4-revenue/             # 銷售財務
│   ├── room-5-reports/             # 報表分析
│   ├── room-6-linebot/             # AI助手
│   └── room-7-uiux/                # UI/UX設計
├── docs/                            # 專案文檔
│   ├── handovers/                  # 交接文檔
│   ├── BUSINESS_LOGIC.md           # 業務邏輯文檔
│   └── OVERVIEW.md                 # 系統總覽
└── .github/                         # GitHub Actions CI/CD
    └── workflows/
        ├── test.yml                # 自動測試
        ├── deploy.yml              # 自動部署
        └── security.yml            # 安全檢查
```

## 🔧 本地開發環境設置

### 環境需求
```bash
# 必要軟體版本
Node.js >= 20.0.0
PostgreSQL >= 13.0
Git >= 2.30

# 雲端服務帳號
Google Cloud Platform (Gemini AI API)
LINE Developers Account (Bot API)
```

### 快速啟動
```bash
# 1. 克隆專案
git clone https://github.com/your-repo/alcohol-trading-system.git
cd alcohol-trading-system/webapp

# 2. 安裝相依套件
npm install

# 3. 設置環境變數
cp .env.example .env.local

# 編輯 .env.local 並填入以下必要變數：
# NEXTAUTH_SECRET=your-32-char-secret
# NEXTAUTH_URL=http://localhost:3000
# DATABASE_URL=postgresql://user:pass@localhost:5432/alcohol_trading
# GOOGLE_CLIENT_ID=your-google-oauth-client-id
# GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
# GEMINI_API_KEY=your-gemini-api-key
# LINE_CHANNEL_ACCESS_TOKEN=your-line-bot-token
# LINE_CHANNEL_SECRET=your-line-bot-secret

# 4. 資料庫初始化
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed

# 5. 啟動開發伺服器
npm run dev

# 6. 系統健康檢查
npm run check:all
```

### 開發工具設置
```bash
# 程式碼品質檢查
npm run lint                 # ESLint 檢查
npm run check:fields        # 資料模型一致性檢查
npm run check:permissions   # 權限配置檢查
npm run check:secrets       # 敏感資料洩露檢查

# 測試套件
npm run test                # 執行所有測試
npm run test:security       # 安全性測試
npm run test:api            # API測試
npm run test:coverage       # 測試覆蓋率報告

# 資料庫管理
npm run seed:test           # 載入測試資料
npm run verify:isolation    # 驗證數據隔離機制
```

## 🧪 測試與品質保證

### 測試策略
```
測試金字塔架構
├── 單元測試 (70%) - 業務邏輯、工具函數
├── 整合測試 (20%) - API端點、資料庫互動
├── 端對端測試 (10%) - 完整用戶流程
└── 安全性測試 (必要) - 權限隔離、數據洩露
```

### 關鍵測試案例
- **權限隔離測試**：確保投資方無法存取敏感數據
- **API安全測試**：驗證所有端點的權限控制
- **業務邏輯測試**：雙重價格機制、庫存計算
- **整合測試**：AI服務、LINE Bot、第三方API

### CI/CD Pipeline
```yaml
GitHub Actions 工作流程：
1. 程式碼檢查 (ESLint + TypeScript)
2. 安全掃描 (敏感資料、依賴漏洞)
3. 單元測試 (Jest + Coverage)
4. 建置測試 (Next.js Build)
5. 部署到預覽環境
6. 自動化煙霧測試
7. 部署到生產環境 (需手動確認)
```

## 🚀 生產環境部署

### 部署架構選擇

#### 推薦架構 (Vercel + PostgreSQL)
```
使用者請求
    ↓
Cloudflare CDN (快取 + 安全防護)
    ↓
Vercel (Next.js 應用 + API Routes)
    ↓
PostgreSQL (託管資料庫)
    ↓
外部服務 (Gemini AI, LINE API)
```

#### 替代架構 (自託管)
```
使用者請求
    ↓
Nginx 反向代理
    ↓
Docker 容器 (Next.js + Node.js)
    ↓
PostgreSQL (自架或雲端)
```

### 部署前檢查清單
```bash
# 安全檢查 (最高優先級)
□ 投資方數據隔離測試100%通過
□ 所有API端點權限驗證完成
□ 敏感資料加密儲存
□ 錯誤訊息不洩露系統資訊
□ HTTPS強制啟用
□ 安全標頭設定完成

# 功能檢查
□ 所有核心模組功能測試通過
□ 雙重價格機制正確運作
□ AI服務 (Gemini, LINE Bot) 正常
□ 多角色登入測試通過
□ 報表生成功能正常

# 性能檢查
□ 首頁載入時間 < 2秒
□ API回應時間 < 500ms
□ 資料庫查詢最佳化
□ 圖片和資源壓縮完成

# 一鍵部署檢查
npm run deploy:check
```

### 環境變數管理
```bash
# 生產環境必要變數
NEXTAUTH_SECRET=your-production-secret-32-chars
NEXTAUTH_URL=https://your-domain.com
DATABASE_URL=postgresql://user:pass@prod-db/alcohol_trading

# API金鑰 (加密儲存)
GEMINI_API_KEY=your-production-gemini-key
LINE_CHANNEL_ACCESS_TOKEN=your-production-line-token
GOOGLE_CLIENT_ID=your-production-google-client-id

# 系統設定
NODE_ENV=production
ENCRYPTION_SECRET=your-encryption-key-32-chars
LOG_LEVEL=info
```

## 📊 系統監控與維護

### 性能指標
- **回應時間**：API < 500ms, 頁面載入 < 2秒
- **可用性**：99.9% uptime 目標
- **安全評分**：A+ 級安全等級
- **測試覆蓋率**：85%+ 代碼覆蓋率

### 監控儀表板
- **應用性能**：Vercel Analytics / 自建監控
- **資料庫性能**：查詢時間、連線數監控
- **API使用率**：Gemini AI, LINE Bot 額度追蹤
- **錯誤追蹤**：異常日誌收集與分析
- **安全事件**：權限違規、異常存取告警

### 定期維護任務
- **安全更新**：依賴套件漏洞修補 (每週)
- **資料庫備份**：自動化每日備份 + 每週完整備份
- **日誌清理**：30天日誌保留政策
- **性能檢查**：每月性能報告與最佳化

## 🤝 開發團隊協作

### Claude AI 房間系統
本專案採用模組化的「房間」開發系統，每個房間負責特定功能領域：

| 房間 | 負責領域 | 核心職責 |
|------|----------|----------|
| **Room-1** | 基礎架構 | 認證系統、權限控制、資料庫設計 |
| **Room-2** | 主檔管理 | 客戶管理、商品管理、分類系統 |
| **Room-3** | 交易核心 | 採購流程、庫存管理、成本計算 |
| **Room-4** | 銷售財務 | 銷售管理、收支記錄、雙重價格 |
| **Room-5** | 報表分析 | BI報表、數據視覺化、KPI監控 |
| **Room-6** | AI整合 | LINE Bot、Gemini AI、OCR處理 |
| **Room-7** | UI/UX | 介面設計、使用者體驗最佳化 |

### 文檔資源
```
核心技術文檔：
├── shared/docs/DATA_MODELS.md     # 統一數據模型規範
├── shared/docs/API_SPEC.md        # RESTful API規格
├── shared/docs/PERMISSION_CONTROL.md # 權限控制實作指南
├── shared/docs/DEPLOYMENT.md      # 部署策略與環境管理
└── shared/docs/TESTING_GUIDE.md   # 測試策略與品質標準

交接與維護文檔：
├── docs/handovers/CLAUDE-*.md     # AI開發者交接紀錄
├── 交接報告_0924_完整版.md        # 最新系統狀態
├── CODEX補強報告_0924.md          # 完成項目記錄
└── HEALTH_CHECK.md                # 系統健康檢查指引
```

### 開發工作流程
1. **需求分析**：業務需求 → 技術規格 → 房間分配
2. **模組開發**：獨立房間開發 → 單元測試 → 代碼審查
3. **整合測試**：模組整合 → 安全測試 → 性能測試
4. **部署流程**：預覽環境 → 用戶驗收 → 生產部署

## ⚠️ 重要安全提醒

### 商業機密保護
- 🔴 **投資方隔離**：永遠無法存取真實價格、傭金、個人調貨
- 🔴 **數據完整性**：所有敏感操作都有審計記錄
- 🔴 **權限最小化**：每個角色僅能存取必要資訊
- 🔴 **加密傳輸**：所有API通訊強制HTTPS

### 系統維護注意事項
- ⚠️ **權限變更需謹慎**：任何權限調整都要經過完整測試
- ⚠️ **密碼政策**：使用強密碼並定期更換
- ⚠️ **依賴更新**：定期檢查並修補安全漏洞
- ⚠️ **備份驗證**：定期測試備份恢復程序

## 📞 技術支援與聯絡方式

### 問題回報
- **GitHub Issues**：https://github.com/your-repo/alcohol-trading-system/issues
- **安全漏洞回報**：security@your-domain.com (加密通訊)
- **功能請求**：使用 GitHub Discussions

### 文檔與資源
- **技術文檔**：`/shared/docs/` 目錄
- **API文檔**：http://localhost:3000/api-docs (開發環境)
- **系統監控**：生產環境健康狀態儀表板

### 緊急聯絡
- **系統異常**：立即檢查 GitHub Actions 建置狀態
- **安全事件**：查看審計日誌 `/api/admin/audit-logs`
- **資料備份**：自動每日備份，手動備份請聯絡系統管理員

---

## 🎉 系統狀態總結

| 指標 | 狀態 | 說明 |
|------|------|------|
| **系統狀態** | 🟢 生產就緒 | 核心功能完整，安全機制到位 |
| **安全等級** | 🔒 企業級 (A+) | 通過完整安全測試與權限驗證 |
| **功能完整度** | 📈 90%+ | 5個核心房間完成，2個房間待開發 |
| **測試覆蓋率** | ✅ 85%+ | 包含單元、整合、安全性測試 |
| **文檔完整性** | 📚 完整 | API規格、部署指引、維護文檔齊全 |
| **AI整合度** | 🤖 進階 | Gemini AI + LINE Bot 完整整合 |

**🚀 準備投入生產運營 | 🛡️ 商業機密受到完整保護 | 📊 數據驅動決策支援完備**