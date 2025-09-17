# 📦 Room-3 工作包：交易核心

## 🎯 **新螞蟻快速入門**

歡迎來到Room-3！這是系統的心臟 - 交易核心。

### **30秒理解您的任務**
您負責**Purchase + Inventory模組**，處理進口、成本計算、庫存管理。這是最複雜但也最重要的模組，涉及AI辨識和精確的稅務計算。

## 🚨 **超級重要：稅金計算**
**您的核心任務是100%準確實現稅金計算邏輯！**
- 必須按照 `TAX_CALCULATION.md` 精確實作
- 這關係到整個系統的成本準確性
- 計算錯誤會直接影響獲利分析

## 📚 **立即閱讀清單 (按順序)**

1. **單一事實來源** (開發前必讀) ⚠️重要：
   - `../shared/docs/ID_DEFINITIONS.md` - **所有ID和編號規則**
   - `../shared/docs/DATA_MODELS.md` - **統一資料模型定義**

2. **超重要文檔** (先讀這些)：
   - `../shared/docs/TAX_CALCULATION.md` ⚠️ **最重要**
   - `../DEMO.txt` - 原始計算邏輯參考
   - `../FOR_CLAUDE.md` - 專案交接

3. **三大防護文件** (必讀)：
   - `../shared/docs/VALIDATION_RULES.md` - 資料驗證規則 🛡️防錯
   - `../shared/docs/INVENTORY_LOGIC.md` - 庫存連動規則 📦防超賣
   - `../shared/docs/PERMISSION_CONTROL.md` - 權限控制實作 🔒保護機密

4. **必讀文檔**：
   - `../docs/OVERVIEW.md` - 系統總覽
   - `../docs/BUSINESS_LOGIC.md` - 商業邏輯
   - `../shared/docs/API_SPEC.md` - API規格 (Purchase/Inventory部分)

5. **開發參考**：
   - `../shared/docs/UI_DESIGN_SPEC.md` - UI設計規範
   - `./README.md` - 本房間詳細任務

6. **體驗優化文檔** (品質提升) ⭐新增：
   - `../shared/docs/UI_COMPONENT_LIBRARY.md` - **UI組件庫標準** 🎨統一設計
   - `../shared/docs/RESPONSIVE_DESIGN_SPEC.md` - **響應式設計規範** 📱手機友善
   - `../shared/docs/PERFORMANCE_OPTIMIZATION.md` - **效能優化指南** ⚡提升速度
   - `../shared/docs/CODE_QUALITY_STANDARDS.md` - **程式碼品質管控** 🔧維護性

## 🚀 **開發路線圖**

### **Week 1: 稅金計算引擎 (最重要!)**
```
Day 1-2: 稅務計算核心
├── calculateAllCosts() 函數實作
├── 關稅計算邏輯
├── 菸酒稅分類 (啤酒/蒸餾酒/釀造酒)
├── 推廣費計算 (0.04%, 最低100元)
└── 營業稅計算 (5%)

Day 3: 抽檢損耗處理
├── 損耗率設定 (一般3-5%)
├── 成本分攤邏輯
└── 損耗記錄管理

Day 4-5: 匯率處理和測試
├── 即時匯率獲取
├── 匯率波動計算
├── 大量測試案例驗證
└── 與DEMO.txt結果對比驗證
```

### **Week 2: Purchase模組**
```
Day 1-2: 採購單基礎
├── 採購單資料模型
├── 基本CRUD功能
├── 供應商管理
└── 採購單狀態管理

Day 3-4: AI報單辨識 ⭐核心功能
├── Google Gemini 2.5 Pro API整合
├── PDF報單解析
├── 關鍵資訊提取 (品名/數量/價格/稅率)
├── 辨識結果確認機制
└── 暫存和人工確認流程

Day 5: 成本分攤系統
├── 多商品採購成本分攤
├── 運費分攤邏輯
├── 額外費用處理
└── 成本明細記錄
```

### **Week 3: Inventory模組**
```
Day 1-2: 庫存基礎管理
├── 庫存資料模型
├── 入庫出庫記錄
├── 庫存變動追蹤
└── 批次號管理

Day 3-4: 庫存進階功能
├── 低庫存預警系統
├── 庫存盤點功能
├── 調撥管理 (個人調貨 vs 投資方)
└── 庫存分析報表

Day 5: 整合測試
├── Purchase → Inventory 流程
├── 成本計算準確性驗證
├── AI辨識準確性測試
└── 權限隔離測試
```

### **Week 4: 整合與優化**
```
Day 1-2: 模組間整合
├── 與Room-2 Product模組整合
├── 與Room-1 權限系統整合
├── 為Room-4準備資料介面
└── API文檔完善

Day 3-4: 性能優化和測試
├── 大量資料處理優化
├── AI API呼叫優化
├── 完整功能測試
└── 壓力測試

Day 5: 交接準備
├── 文檔整理
├── 測試報告
├── 部署指南
└── 下一階段準備
```

## 🔧 **技術規格速查**

### **核心計算函數 (TAX_CALCULATION.md)**
```typescript
interface CostCalculationInput {
  unitPrice: number;        // 單價 (日幣)
  quantity: number;         // 數量
  exchangeRate: number;     // 匯率
  productType: 'beer' | 'spirits' | 'wine';
  abv?: number;            // 酒精度 (蒸餾酒/釀造酒需要)
  volume?: number;         // 容量 (公升)
}

interface CostCalculationResult {
  subtotal: number;        // 小計 (台幣)
  customsDuty: number;     // 關稅
  alcoholTax: number;      // 菸酒稅
  tradeFee: number;        // 推廣費
  vat: number;            // 營業稅
  totalCost: number;       // 總成本
  unitCostTWD: number;     // 單位成本 (台幣)
}

function calculateAllCosts(input: CostCalculationInput): CostCalculationResult
```

### **關鍵API端點**
```typescript
// Purchase API
GET    /api/purchases                    // 採購單列表
POST   /api/purchases                    // 新增採購單
GET    /api/purchases/:id               // 採購單詳情
PUT    /api/purchases/:id               // 更新採購單
DELETE /api/purchases/:id               // 刪除採購單
POST   /api/purchases/:id/confirm       // 確認採購單
POST   /api/purchases/ai-recognize      // AI報單辨識
POST   /api/purchases/calculate-cost    // 成本計算

// Inventory API
GET    /api/inventory                   // 庫存列表
POST   /api/inventory/adjust            // 庫存調整
GET    /api/inventory/:productId        // 特定商品庫存
POST   /api/inventory/stocktake         // 盤點記錄
GET    /api/inventory/alerts            // 低庫存警示
POST   /api/inventory/transfer          // 庫存調撥
```

### **AI辨識API整合**
```typescript
// Google Gemini API
const recognizePurchaseDocument = async (
  pdfBuffer: Buffer,
  prompt: string
): Promise<RecognitionResult> => {
  // 使用 Gemini 2.5 Pro API
  // 提取：商品名稱、數量、單價、產地、規格等
}

interface RecognitionResult {
  products: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    origin: string;
    specifications: string;
    confidence: number;
  }>;
  rawText: string;
  needsReview: boolean;
}
```

## ⚠️ **超級重要注意事項**

### **稅金計算絕對正確**
- **關稅**：按產地和品類計算，複雜度高
- **菸酒稅**：
  - 啤酒：每公升26元
  - 蒸餾酒：每度每公升2.5元 (酒精度×容量×2.5)
  - 釀造酒：每度每公升7元 (酒精度×容量×7)
- **推廣費**：金額×0.04%，最低100元
- **營業稅**：(關稅+貨價+菸酒稅)×5%

### **AI辨識要準確**
- PDF解析要考慮各種格式
- 關鍵資訊提取要有容錯機制
- 必須有人工確認環節
- 辨識失敗要有降級處理

### **權限控制**
- 投資方看不到個人調貨的採購記錄
- 成本資料要按權限過濾
- 敏感的真實成本不能洩漏

### **與其他房間的接口**
- **依賴Room-1**：權限系統和使用者管理
- **依賴Room-2**：商品和供應商資料
- **提供給Room-4**：準確的成本資料用於獲利分析
- **提供給Room-5**：成本計算邏輯供LINE BOT使用

## 📋 **交接檢查清單**

完成後請確保：
- [ ] 稅金計算100%準確 (與DEMO.txt對比驗證)
- [ ] AI報單辨識準確率>85%
- [ ] Purchase CRUD全功能正常
- [ ] Inventory管理完整
- [ ] 成本分攤邏輯正確
- [ ] 低庫存預警正常
- [ ] 權限控制無漏洞
- [ ] API回應時間<2秒
- [ ] 大量資料處理穩定
- [ ] 完整API文檔
- [ ] 單元測試覆蓋率>80%
- [ ] 整合測試通過

## 🆘 **遇到問題怎麼辦**

1. **稅金計算疑問** → 對照 `TAX_CALCULATION.md` 和 `DEMO.txt`
2. **AI辨識問題** → 檢查 Gemini API 文檔
3. **商品資料問題** → 聯絡Room-2螞蟻
4. **權限問題** → 聯絡Room-1螞蟻
5. **成本邏輯不確定** → 查看 `BUSINESS_LOGIC.md`

## 💪 **成功標準**

您的模組完成後：
- ✅ 老闆能快速完成進口申報
- ✅ 成本計算精準無誤
- ✅ AI辨識大幅減少手工輸入
- ✅ 庫存管理井然有序
- ✅ 為後續獲利分析提供準確基礎

**您負責整個系統最核心的計算邏輯，責任重大！** 💪🔥

**記住：稅金計算錯誤會影響整個商業模式，務必100%準確！**