# 📦 Room-4 工作包：營收管理

## 🔥 **新螞蟻快速入門**

歡迎來到Room-4！這是老闆的金庫 - 營收管理核心。

### **30秒理解您的任務**
您負責**Sales + Accounting + Report模組**，處理銷售、會計和報表。最重要的是**雙重價格系統** - 這是整個商業模式的核心機密！

## 🚨 **絕對機密：雙重價格系統**
```
真實世界：客戶付$1200 → 老闆收$1200
投資方看到：老闆賣$1000 → 投資方分潤$200
老闆密收：額外$200傭金 (投資方永遠看不到)
```
**這是老闆的商業機密，絕對不能洩漏給投資方！**

## 📚 **立即閱讀清單 (按順序)**

1. **單一事實來源** (開發前必讀) ⚠️重要：
   - `../shared/docs/ID_DEFINITIONS.md` - **所有ID和編號規則**
   - `../shared/docs/DATA_MODELS.md` - **統一資料模型定義**

2. **超重要文檔** (先讀這些)：
   - `../docs/BUSINESS_LOGIC.md` ⚠️ **最重要 - 雙重價格邏輯**
   - `../shared/docs/CUSTOMER_PRICING_SYSTEM.md` - 客戶分級報價
   - `../FOR_CLAUDE.md` - 專案交接

3. **必讀文檔**：
   - `../docs/OVERVIEW.md` - 系統總覽
   - `../shared/docs/API_SPEC.md` - API規格 (Sales/Accounting/Report部分)

4. **三大防護文件** (必讀)：
   - `../shared/docs/VALIDATION_RULES.md` - 資料驗證規則 🛡️防錯
   - `../shared/docs/INVENTORY_LOGIC.md` - 庫存連動規則 📦防超賣
   - `../shared/docs/PERMISSION_CONTROL.md` - 權限控制實作 🔒保護機密

5. **開發參考**：
   - `../shared/docs/UI_DESIGN_SPEC.md` - UI設計規範
   - `./README.md` - 本房間詳細任務

6. **體驗優化文檔** (品質提升) ⭐新增：
   - `../shared/docs/UI_COMPONENT_LIBRARY.md` - **UI組件庫標準** 🎨統一設計
   - `../shared/docs/RESPONSIVE_DESIGN_SPEC.md` - **響應式設計規範** 📱手機友善
   - `../shared/docs/PERFORMANCE_OPTIMIZATION.md` - **效能優化指南** ⚡提升速度
   - `../shared/docs/CODE_QUALITY_STANDARDS.md` - **程式碼品質管控** 🔧維護性

## 🚀 **開發路線圖**

### **Week 1: Sales模組 - 雙重價格系統**
```
Day 1-2: 銷售基礎功能
├── 銷售單資料模型
├── 基本CRUD功能
├── 客戶選擇和商品選擇
└── 銷售流程設計

Day 3-5: 雙重價格系統 ⭐核心機密
├── 投資方價格vs真實價格邏輯
├── 價格計算引擎
├── 權限控制 (投資方看不到真實價格)
├── 分潤計算邏輯
└── 老闆抽成隱藏機制
```

### **Week 2: 客戶專屬報價系統**
```
Day 1-2: 客戶分級報價
├── VIP/REGULAR/PREMIUM/NEW 價格體系
├── 客戶專屬價格設定
├── 報價單生成引擎
└── 價格歷史記錄

Day 3-4: 報價管理進階
├── 報價單範本設計
├── PDF導出功能
├── 報價有效期管理
├── 報價追蹤和轉換
└── 客戶報價分析

Day 5: 整合測試
├── 與Room-2客戶資料整合
├── 價格邏輯驗證
└── 權限隔離測試
```

### **Week 3: Accounting模組**
```
Day 1-2: 會計基礎
├── 開銷記錄系統 (老闆個人開銷)
├── 收支分類管理
├── 對帳功能
└── 財務核對機制

Day 3-4: 獲利分析系統
├── 投資方分潤計算
├── 老闆抽成計算 (隐藏)
├── 毛利分析
├── 成本效益分析
└── 現金流管理

Day 5: 權限隔離
├── 投資方看不到的開銷資料
├── 敏感財務資料隔離
└── 會計報表權限控制
```

### **Week 4: Report模組**
```
Day 1-2: 報表基礎系統
├── 報表資料聚合引擎
├── 多維度分析
├── 圖表組件整合 (ECharts)
└── 報表範本設計

Day 3-4: 營運報表
├── 營收趨勢分析
├── 商品銷售排行
├── 客戶價值分析
├── 獲利能力分析
└── 庫存週轉分析

Day 5: 報表導出和排程
├── PDF/Excel導出
├── 定期報表排程
├── 報表分享機制
└── 行動端報表優化
```

## 🔧 **技術規格速查**

### **雙重價格核心邏輯**
```typescript
interface DualPriceCalculation {
  // 輸入
  productId: string;
  customerId: string;
  quantity: number;
  actualSellingPrice: number;  // 真實銷售價格 (客戶實付)

  // 輸出給投資方看的
  investorView: {
    displayPrice: number;      // 投資方看到的假價格
    cost: number;             // 成本
    investorShare: number;    // 投資方分潤
  };

  // 老闆實際獲得的 (機密)
  ownerActual: {
    actualRevenue: number;    // 實際收入
    hiddenCommission: number; // 隱藏抽成
    totalProfit: number;      // 總獲利
  };
}

function calculateDualPrice(input: DualPriceInput): DualPriceCalculation
```

### **客戶專屬報價邏輯**
```typescript
interface CustomerPricingRule {
  customerId: string;
  productId: string;
  basePrice: number;        // 公版價格
  specialPrice?: number;    // 專屬價格
  discountRate?: number;    // 折扣率
  tier: 'VIP' | 'REGULAR' | 'PREMIUM' | 'NEW';
  effectiveDate: Date;
  expiryDate?: Date;
}

function getCustomerPrice(
  customerId: string,
  productId: string
): number
```

### **關鍵API端點**
```typescript
// Sales API
GET    /api/sales                       // 銷售記錄 (按權限過濾)
POST   /api/sales                       // 新增銷售
GET    /api/sales/:id                   // 銷售詳情 (按權限過濾)
PUT    /api/sales/:id                   // 更新銷售
DELETE /api/sales/:id                   // 刪除銷售
POST   /api/sales/calculate-price       // 雙重價格計算

// Customer Pricing API (僅超級管理員)
GET    /api/customer-pricing/:productId // 商品客戶專價
POST   /api/customer-pricing            // 設定客戶專價
PUT    /api/customer-pricing/:id        // 更新客戶專價
DELETE /api/customer-pricing/:id        // 刪除客戶專價

// Quotation API (僅超級管理員)
GET    /api/quotations                  // 報價單列表
POST   /api/quotations                  // 生成報價單
GET    /api/quotations/:id              // 報價單詳情
POST   /api/quotations/:id/pdf          // 導出PDF
POST   /api/quotations/:id/send         // 發送報價單

// Accounting API
GET    /api/accounting/expenses         // 開銷記錄 (按權限過濾)
POST   /api/accounting/expenses         // 新增開銷
GET    /api/accounting/profit-analysis  // 獲利分析 (按權限過濾)
GET    /api/accounting/cash-flow        // 現金流分析

// Report API
GET    /api/reports/revenue-trend       // 營收趨勢 (按權限過濾)
GET    /api/reports/product-ranking     // 商品排行
GET    /api/reports/customer-analysis   // 客戶分析
POST   /api/reports/generate            // 生成自定義報表
POST   /api/reports/export              // 導出報表
```

## ⚠️ **超級重要注意事項**

### **雙重價格系統安全**
- 投資方**絕對不能**看到真實銷售價格
- 投資方**絕對不能**看到老闆的抽成
- 投資方**絕對不能**看到個人調貨資料
- 每個API都要嚴格權限檢查
- 前端顯示要按角色過濾資料

### **客戶專屬報價機密**
- 只有超級管理員(老闆)能設定客戶專價
- 報價策略是商業機密
- 價格歷史要完整記錄
- 報價單要專業美觀

### **會計資料隔離**
- 老闆個人開銷投資方看不到
- 真實獲利數據要隱藏
- 財務報表要分權限版本

### **與其他房間的接口**
- **依賴Room-1**：權限系統和使用者管理
- **依賴Room-2**：客戶和商品資料
- **依賴Room-3**：準確的成本資料
- **提供給Room-5**：營收資料供報表和BOT使用

## 📋 **交接檢查清單**

完成後請確保：
- [ ] 雙重價格系統100%正確且安全
- [ ] 投資方權限完全隔離驗證通過
- [ ] 客戶專屬報價系統完整
- [ ] 報價單生成和導出正常
- [ ] 會計開銷管理完整
- [ ] 獲利分析邏輯正確
- [ ] 報表系統功能完整
- [ ] 所有API權限檢查無漏洞
- [ ] 前端資料顯示按權限過濾
- [ ] 完整API文檔和測試
- [ ] 單元測試覆蓋率>80%
- [ ] 安全性測試通過

## 🚨 **安全檢查重點**

### **投資方絕對看不到的資料**
```typescript
// ❌ 投資方絕對不能取得這些資料
const FORBIDDEN_FOR_INVESTOR = {
  actualSellingPrice: 1200,    // 真實銷售價格
  hiddenCommission: 200,       // 隱藏抽成
  personalExpenses: [],        // 個人開銷
  customerSpecialPrices: [],   // 客戶專價策略
  realProfitMargin: 0.35       // 真實毛利率
};

// ✅ 投資方只能看到這些
const INVESTOR_VIEW = {
  displayPrice: 1000,          // 展示價格
  cost: 800,                   // 成本
  investorShare: 200,          // 投資方分潤
  publicExpenses: []           // 公開的營運開銷
};
```

## 🆘 **遇到問題怎麼辦**

1. **雙重價格邏輯疑問** → 仔細研讀 `BUSINESS_LOGIC.md`
2. **權限控制問題** → 聯絡Room-1螞蟻
3. **客戶資料問題** → 聯絡Room-2螞蟻
4. **成本資料問題** → 聯絡Room-3螞蟻
5. **報表設計疑問** → 查看 `UI_DESIGN_SPEC.md`

## 💪 **成功標準**

您的模組完成後：
- ✅ 老闆能完全掌控定價策略
- ✅ 投資方永遠看不到商業機密
- ✅ 客戶報價專業且靈活
- ✅ 財務分析清楚透明
- ✅ 營運報表一目了然
- ✅ 系統安全無漏洞

**您掌握著整個系統的商業核心，責任重大！** 💰🔐

**記住：投資方數據隔離是生死攸關的功能，絕不能有任何漏洞！**