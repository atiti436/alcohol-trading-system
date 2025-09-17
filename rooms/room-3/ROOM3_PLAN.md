# 🏭 Room-3: 交易核心房間 - 工作計劃

## 📋 基本資訊
- **負責模組**: Purchase + Inventory
- **預計時間**: 3-4週
- **信心度**: **95%** 🔥
- **狀態**: 🟢 Ready to Start

## ✅ 核心功能列表

### 🛒 Purchase 採購管理
1. **採購單基礎CRUD**
   - API: GET/POST/PUT/DELETE /api/purchases
   - 採購單號自動生成 (PO-YYYYMMDD-XXX)
   - 供應商選擇和管理
   - 多商品採購單支援

2. **AI報單辨識整合**
   - PDF上傳和處理
   - Gemini API整合 (基於DEMO.txt實作)
   - 報單資料自動填入採購單
   - OCR辨識結果驗證和修正

3. **採購單暫存確認機制**
   - DRAFT → PENDING → CONFIRMED 狀態流程
   - 暫存編輯功能
   - 確認前資料驗證

### 📦 Inventory 庫存管理
1. **庫存基礎管理**
   - 即時庫存追蹤
   - 總庫存/預留庫存/可售庫存 三分法
   - 庫存異動記錄

2. **庫存連動系統**
   - 採購入庫自動更新
   - 銷售出庫自動扣減
   - 庫存不足警告

3. **庫存調撥系統**
   - 倉庫間調撥
   - 調撥單據管理
   - 調撥歷史追蹤

### 💰 成本計算引擎
1. **進貨成本計算**
   - 匯率換算 (手動輸入)
   - 稅金計算 (關稅、酒稅、營業稅)
   - 運費分攤

2. **成本分攤計算引擎** (基於DEMO.txt)
   - 按金額比例分攤
   - 按數量平均分攤
   - 按重量比例分攤
   - 額外費用智慧分攤

## 🔧 技術實作架構

### API 端點設計
```
📁 /api/purchases/
├── route.ts (GET/POST)
├── [id]/route.ts (GET/PUT/DELETE)
├── [id]/items/route.ts (採購明細管理)
├── [id]/confirm/route.ts (確認採購單)
└── upload-declaration/route.ts (報單上傳)

📁 /api/inventory/
├── route.ts (庫存列表)
├── [productId]/route.ts (單一商品庫存)
├── movements/route.ts (庫存異動記錄)
└── transfer/route.ts (庫存調撥)

📁 /api/gemini/
└── analyze-declaration/route.ts (AI報單分析)
```

### 前端組件設計
```
📁 /components/purchase/
├── PurchaseList.tsx (採購單列表)
├── PurchaseForm.tsx (採購單表單)
├── DeclarationUpload.tsx (報單上傳)
├── CostAllocation.tsx (成本分攤)
└── PurchaseItemsTable.tsx (採購明細表)

📁 /components/inventory/
├── InventoryDashboard.tsx (庫存總覽)
├── InventoryMovements.tsx (庫存異動)
├── InventoryTransfer.tsx (庫存調撥)
└── StockAlert.tsx (庫存警告)
```

## 🎯 開發階段規劃

### **第一階段 (信心度: 95%)**
1. ✅ Purchase採購單基礎CRUD
2. ✅ Inventory庫存基礎管理
3. ✅ 權限控制延續Room-2模式
4. ✅ 基礎數據模型建立

### **第二階段 (信心度: 90%)**
1. 🔄 成本分攤計算引擎 (基於DEMO.txt)
2. 🔄 庫存連動自動化
3. 🔄 採購單暫存確認機制
4. 🔄 基礎報表功能

### **第三階段 (信心度: 85%)**
1. 🚀 Gemini API報單辨識功能
2. 🚀 AI辨識結果驗證機制
3. 🚀 庫存調撥系統
4. 🚀 進階成本分析

## 🔒 數據隔離要求

### 投資方不可見功能
- **個人調貨採購** - 完全隔離
- **實際採購成本** - 只能看到調整後金額
- **供應商資訊** - 敏感商業機密
- **成本分攤細節** - 只能看到最終結果

### 權限控制策略
- **SUPER_ADMIN**: 完整功能存取
- **EMPLOYEE**: 操作功能，限制敏感資料
- **INVESTOR**: 只能查看投資相關採購，無法看到個人調貨

## 📚 參考資料

### 核心文檔
- `shared/docs/DATA_MODELS.md` - Purchase/Inventory資料模型
- `shared/docs/INVENTORY_LOGIC.md` - 庫存連動規則
- `shared/docs/TAX_CALCULATION.md` - 稅金計算邏輯
- `導讀/DEMO.txt` - Gemini API實作範例

### 依賴關係
- Room-1: 基礎架構 ✅
- Room-2: Customer/Product模組 ✅
- Room-4: 雙重價格邏輯 (後續整合)

## 💡 關鍵成功因素

1. **Gemini API整合** - 已有DEMO.txt完整範例
2. **成本計算引擎** - 算法已實作完成
3. **庫存連動邏輯** - 規則文檔完整
4. **權限控制** - 延續Room-2成功模式

## 🚀 準備狀態確認

- [x] 技術架構理解 ✅
- [x] 商業邏輯掌握 ✅
- [x] API設計規劃 ✅
- [x] Gemini整合方案 ✅
- [x] 成本計算算法 ✅
- [x] 權限控制策略 ✅

**Room-3 已準備就緒，可立即開始開發！** 🎯