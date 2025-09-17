# 📦 Room-5 工作包：AI智慧助手

## 🤖 **新螞蟻快速入門**

歡迎來到Room-5！您負責最酷的功能 - LINE BOT AI助手。

### **30秒理解您的任務**
您負責**LineBot模組**，讓老闆隨時隨地透過LINE查詢成本、生成報價、上傳報單辨識。這是系統的AI大腦！

## 🎯 **LINE BOT三大核心功能**
1. **📸 PDF報單辨識** - 上傳報關文件，AI自動提取商品資訊
2. **🧮 即時成本計算** - 輸入「白鶴清酒 720ml 15度 日幣800 匯率0.21」秒算成本
3. **💬 智慧對話** - 查詢庫存、營收、客戶資訊等

## 📚 **立即閱讀清單 (按順序)**

1. **單一事實來源** (開發前必讀) ⚠️重要：
   - `../shared/docs/ID_DEFINITIONS.md` - **所有ID和編號規則**
   - `../shared/docs/DATA_MODELS.md` - **統一資料模型定義**

2. **體驗優化文檔** (品質提升) ⭐新增：
   - `../shared/docs/UI_COMPONENT_LIBRARY.md` - **UI組件庫標準** 🎨統一設計
   - `../shared/docs/RESPONSIVE_DESIGN_SPEC.md` - **響應式設計規範** 📱手機友善
   - `../shared/docs/PERFORMANCE_OPTIMIZATION.md` - **效能優化指南** ⚡提升速度
   - `../shared/docs/CODE_QUALITY_STANDARDS.md` - **程式碼品質管控** 🔧維護性

3. **必讀文檔**：
   - `../小白老闆準備清單.md` - LINE API申請指南
   - `../shared/docs/TAX_CALCULATION.md` - 成本計算邏輯 ⚠️重要
   - `../FOR_CLAUDE.md` - 專案交接

4. **開發參考**：
   - `../docs/OVERVIEW.md` - 系統總覽
   - `../shared/docs/API_SPEC.md` - API規格 (LineBot部分)
   - `../shared/docs/UI_DESIGN_SPEC.md` - 設計規範
   - `./README.md` - 本房間詳細任務

## 🚀 **開發路線圖**

### **Week 1: LINE BOT基礎建設**
```
Day 1-2: LINE開發環境
├── LINE Messaging API設定
├── Webhook URL配置
├── 基本訊息收發測試
├── Rich Menu設計
└── 使用者認證機制

Day 3-4: Google Gemini整合
├── Gemini 2.5 Pro API設定
├── PDF檔案處理
├── 圖片OCR處理
├── AI回應優化
└── API呼叫限制處理

Day 5: 基礎對話邏輯
├── 訊息路由系統
├── 指令解析
├── 錯誤處理機制
└── 使用者狀態管理
```

### **Week 2: 核心功能實作**
```
Day 1-3: PDF報單辨識 ⭐核心功能
├── PDF上傳處理
├── Gemini API文件分析
├── 關鍵資訊提取 (商品名/數量/價格/規格)
├── 結構化資料輸出
├── 確認和修正機制
└── 直接匯入採購系統

Day 4-5: 即時成本計算
├── 自然語言解析 「山崎18年 700ml 43度 日幣5000 匯率0.21」
├── 商品資訊識別和匹配
├── 呼叫Room-3的稅金計算API
├── 成本明細展示
└── 計算結果儲存
```

### **整合週: 智慧對話和優化**
```
Day 1-2: 智慧查詢功能
├── 庫存查詢 「山崎18年還有多少瓶？」
├── 營收查詢 「這個月賺了多少？」
├── 客戶查詢 「A客戶的聯絡資料」
├── 商品查詢 「威士忌類有哪些商品？」
└── 智慧推薦功能

Day 3-4: 進階功能
├── 報價單快速生成
├── 低庫存提醒推播
├── 營運數據週報
├── 圖片商品識別
└── 語音訊息處理 (選配)

Day 5: 測試和優化
├── 完整功能測試
├── 對話流程優化
├── AI回應準確性調整
├── 錯誤處理改善
└── 性能優化
```

## 🔧 **技術規格速查**

### **LINE BOT架構**
```typescript
// LINE Webhook處理
interface LineWebhookEvent {
  type: 'message' | 'postback';
  message?: {
    type: 'text' | 'image' | 'file';
    text?: string;
    id?: string;
  };
  postback?: {
    data: string;
  };
  source: {
    userId: string;
    type: 'user';
  };
}

// 主要處理函數
async function handleLineWebhook(event: LineWebhookEvent): Promise<void>
```

### **AI功能實作**
```typescript
// PDF報單辨識
interface DocumentRecognition {
  products: Array<{
    name: string;
    quantity: number;
    unitPrice: number;      // 日幣
    specifications: string;
    confidence: number;
  }>;
  currency: string;
  totalAmount: number;
  extractedText: string;
}

async function recognizePurchaseDocument(
  fileBuffer: Buffer
): Promise<DocumentRecognition>

// 成本計算
interface CostCalculationRequest {
  productName: string;
  volume?: string;        // "720ml"
  abv?: string;          // "43度"
  price: number;         // 日幣價格
  exchangeRate: number;  // 匯率
  quantity?: number;     // 數量，預設1
}

async function calculateCostFromText(
  input: string
): Promise<CostCalculationResult>
```

### **對話管理系統**
```typescript
// 對話狀態管理
interface UserSession {
  userId: string;
  state: 'idle' | 'calculating' | 'uploading' | 'confirming';
  context: Record<string, any>;
  lastActivity: Date;
}

// 智慧查詢
interface QueryHandler {
  pattern: RegExp;
  handler: (match: RegExpMatchArray, userId: string) => Promise<string>;
}

const queryHandlers: QueryHandler[] = [
  {
    pattern: /(.+)(還有多少|庫存|剩餘)/,
    handler: handleInventoryQuery
  },
  {
    pattern: /(這個月|本月|營收|賺了)/,
    handler: handleRevenueQuery
  },
  {
    pattern: /(.+)(客戶|聯絡)/,
    handler: handleCustomerQuery
  }
];
```

### **Rich Menu設計**
```json
{
  "size": {
    "width": 2500,
    "height": 1686
  },
  "selected": false,
  "name": "酒類管理助手",
  "chatBarText": "點選功能",
  "areas": [
    {
      "bounds": { "x": 0, "y": 0, "width": 833, "height": 843 },
      "action": {
        "type": "postback",
        "data": "action=calculate_cost"
      }
    },
    {
      "bounds": { "x": 833, "y": 0, "width": 834, "height": 843 },
      "action": {
        "type": "postback",
        "data": "action=upload_document"
      }
    },
    {
      "bounds": { "x": 1667, "y": 0, "width": 833, "height": 843 },
      "action": {
        "type": "postback",
        "data": "action=query_inventory"
      }
    }
  ]
}
```

## 💬 **對話範例設計**

### **成本計算對話**
```
用戶: 白鶴清酒 720ml 15度 日幣800 匯率0.21
BOT:  🧮 正在計算成本...

      📦 商品：白鶴清酒 720ml 15度
      💰 日幣單價：¥800
      💱 匯率：0.21

      🧾 成本明細：
      ├─ 貨價：$168
      ├─ 關稅：$25
      ├─ 菸酒稅：$78 (釀造酒)
      ├─ 推廣費：$100
      ├─ 營業稅：$19
      └─ 總成本：$390

      💡 建議售價：$600-800
      📊 預估毛利：35-51%
```

### **庫存查詢對話**
```
用戶: 山崎18年還有多少瓶？
BOT:  📦 山崎18年威士忌庫存狀況

      🍶 700ml 43度：15瓶 ✅
      🍶 700ml 43度 (禮盒)：3瓶 ⚠️ 低庫存
      🍶 1000ml 48度：缺貨 ❌

      💰 平均成本：$8,500/瓶
      📈 本月銷售：8瓶
      🎯 建議補貨：700ml禮盒版
```

### **PDF辨識對話**
```
用戶: [上傳PDF文件]
BOT:  📄 正在分析報關文件...

      ✅ 辨識完成！找到3項商品：

      1️⃣ 山崎12年威士忌 700ml
         數量：24瓶 | 單價：¥3,500

      2️⃣ 響21年威士忌 700ml
         數量：12瓶 | 單價：¥8,000

      3️⃣ 白州18年威士忌 700ml
         數量：6瓶 | 單價：¥12,000

      💱 建議匯率：0.21 (今日即時)

      確認無誤請回覆「確認」
      需要修改請回覆「修改」
```

## ⚠️ **重要注意事項**

### **安全和權限**
- 只有超級管理員(老闆)能使用LINE BOT
- LINE User ID要與系統使用者綁定
- 敏感資料不能直接顯示
- API呼叫要有頻率限制

### **AI處理最佳實作**
- Gemini API有每分鐘呼叫限制
- PDF處理要控制檔案大小
- 辨識失敗要有友善錯誤訊息
- 成本計算要與Room-3保持一致

### **用戶體驗設計**
- 回應要快速(< 3秒)
- 長文件處理要有進度提示
- 支援語音轉文字 (選配)
- 錯誤訊息要清楚易懂

### **與其他房間的接口**
- **依賴Room-1**：使用者認證
- **依賴Room-3**：成本計算API
- **依賴Room-2**：商品查詢API
- **依賴Room-4**：營收查詢API

## 📋 **交接檢查清單**

完成後請確保：
- [ ] LINE BOT基礎功能正常
- [ ] Gemini API整合無誤
- [ ] PDF報單辨識準確率>80%
- [ ] 成本計算與Room-3一致
- [ ] 智慧查詢回應正確
- [ ] Rich Menu設計美觀實用
- [ ] 錯誤處理完善
- [ ] API呼叫頻率控制
- [ ] 使用者認證安全
- [ ] 對話流程順暢
- [ ] 完整API文檔
- [ ] 單元測試覆蓋率>70%

## 🆘 **遇到問題怎麼辦**

1. **LINE API問題** → 查看官方文檔或詢問老闆API設定
2. **Gemini API問題** → 檢查API金鑰和配額
3. **成本計算邏輯** → 參考Room-3的 `TAX_CALCULATION.md`
4. **權限整合問題** → 聯絡Room-1螞蟻
5. **商品查詢問題** → 聯絡Room-2螞蟻

## 💪 **成功標準**

您的模組完成後：
- ✅ 老闆隨時隨地用LINE處理業務
- ✅ AI辨識大幅提升工作效率
- ✅ 成本計算準確快速
- ✅ 智慧查詢回應精準
- ✅ 使用體驗流暢自然

**您打造的AI助手將成為老闆最得力的數位夥伴！** 🤖✨

**記住：這是整個系統最亮眼的功能，要讓老闆驚艷！**