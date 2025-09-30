# 變體系統與價格架構重構計畫

**日期**: 2025-09-30
**討論者**: Claude + User
**狀態**: 設計階段 - 尚未實作

---

## 📋 討論總結

### ✅ 已確認的設計決策

#### 1. **變體編號邏輯**
```
商品 BASE: P0001 山崎18年
變體編號: P0001-001, P0001-002, P0001-003...

規則:
• 自動流水號 (001, 002, 003...)
• 用戶輸入變體描述（自由文字）
• 系統自動產生 variant_code
• 強制至少一個變體（統一邏輯：庫存記錄在變體層級）
```

**示例**：
```
P0001 山崎18年 (BASE - 僅參考資訊)
├─ P0001-001: 亮面新版(日版)
├─ P0001-002: 木盒禮盒版
├─ P0001-003: 損傷版(盒損)
└─ P0001-004: 2024年度限定版
```

---

#### 2. **價格架構（三層價格）**

**變體層級價格**（唯一真實價格）：
```typescript
{
  cost_price: 800,              // 1. 成本價 (所有人可見)
  investor_price: 1000,         // 2. 投資方期望售價 (投資方可修改)
  actual_price: 1200,           // 3. 實際售價 (僅SUPER_ADMIN可見)

  // 追蹤用
  original_investor_price: 1000, // 原始投資方價格（不可改）
  investor_price_updated_at: DateTime?
  investor_price_update_reason: String? // 選填
}
```

**商品層級價格**（參考用，新增變體時的預設值）：
```typescript
{
  reference_cost: 800,
  reference_investor_price: 1000,
  reference_actual_price: 1200
}
```

**權限對照表**：

| 欄位 | SUPER_ADMIN | EMPLOYEE | INVESTOR |
|------|-------------|----------|----------|
| `cost_price` | 👁️ ✏️ | 👁️ ✏️ | 👁️ ❌ |
| `investor_price` | 👁️ ✏️ | 👁️ ❌ | 👁️ ✏️ |
| `actual_price` | 👁️ ✏️ | 👁️ ✏️ | 🚫 🚫 |

---

#### 3. **投資方調價機制**

**流程**：
```
投資方登入
→ 商品詳情頁 → 變體列表
→ 點擊「調整售價」
→ 彈出對話框:
   原價: $1000
   新價: [輸入框]
   原因: [選填]
→ 確認

系統動作:
✅ 更新 investor_price
✅ 記錄 price_history LOG
✅ 發送系統內通知 (右上角鈴鐺)
✅ 若低於成本，彈出警告
✅ 無需審核，立即生效
```

**警告機制**：
```
⚠️ 此價格低於成本
   成本: $842
   新價: $600
   虧損: -$242/瓶

   確定要繼續嗎？
   [取消] [確認調整]
```

---

#### 4. **倉庫架構**

```
📦 公司倉 (Company Warehouse)
   • 投資方出資的商品
   • SUPER_ADMIN + INVESTOR 可見
   • INVESTOR 只能看，不能改
   • 用於正常銷售
   • 銷售金額進公司帳戶

🔒 個人倉 (Private Warehouse)
   • SUPER_ADMIN 自己調貨的商品
   • 僅 SUPER_ADMIN 可見
   • 【重要】通常用個人資金採購（10次只有1次用公司錢）
   • 用台幣交易居多
   • 銷售金額進個人帳戶（不經過公司）
```

**財務處理**：
- **個人倉 → 個人出錢**：單純記錄成本與利潤，無公司帳務
- **個人倉 → 公司代墊**（少數情況）：需標記「代墊款」，後續還款
- **決議**：先實作基本個人倉功能，代墊款追蹤延後至「財務管理模組」

**這就是為什麼需要這套 ERP**：
- 區分公司業務 vs 個人業務
- 投資方只能看到公司倉的商品與交易
- 避免帳務混亂

---

#### 5. **品號調撥（損傷品處理）**

**流程**：
```
Step 1: 進貨時全部入正常品
━━━━━━━━━━━━━━━━━━━━━
進貨單 IN-XXX
P0001-001 (完好品) × 100瓶 → 公司倉

Step 2: 倉管檢品發現損傷
━━━━━━━━━━━━━━━━━━━━━
檢品結果：
• 完好: 95瓶
• 盒損: 3瓶
• 標損: 2瓶

Step 3: 執行品號調撥
━━━━━━━━━━━━━━━━━━━━━
[功能: 品號調撥]

從: P0001-001 完好品
調出: 5瓶
調入: P0001-002 損傷版(盒損+標損) [新建變體]
原因: 檢品發現損傷

系統自動:
✅ 建立 P0001-002 變體
✅ 成本跟著移轉 (5瓶 × $842 = $4,210)
✅ 建立調撥單記錄
✅ 更新兩邊庫存

結果:
P0001-001: 95瓶
P0001-002: 5瓶 ⚠️
```

**UI 需求**：
- 新增「品號調撥」功能頁面
- 支援「調入新變體」（自動建立）
- 成本自動計算並移轉

---

#### 6. **海關抽驗處理**

**流程**：
```
採購單: 100瓶 × $800 = $80,000
  ↓
報關行通知: 海關抽驗 5瓶
  ↓
進貨單驗收:
• 採購數量: 100瓶
• 海關抽驗: 5瓶  ← 系統欄位
• 實收數量: 95瓶  ← 自動計算
  ↓
成本調整:
• 採購成本平攤: $80,000 ÷ 95 = $842/瓶
```

**資料結構**：
```typescript
model ImportItem {
  id: string
  import_id: string
  variant_id: string

  ordered_quantity: Int      // 採購數量 100
  customs_seized: Int        // 海關抽驗 5
  received_quantity: Int     // 實收數量 95 (自動計算)

  unit_purchase_price: Decimal  // 採購單價 $800
  adjusted_cost: Decimal        // 調整後成本 $842
}
```

---

#### 7. **成本分攤機制**

**已確認**：
1. **關稅**：各自計算（每瓶酒有獨立算法，已有 GEMINI API 辨識功能）
2. **其他費用**（運費、報關費等）：按**採購金額比例**分攤

**費用分攤公式**：
```typescript
// 進貨單總採購金額
totalPurchaseAmount = Σ(ordered_quantity × unit_purchase_price)

// 每個商品的分攤比例
itemRatio = (item_ordered_quantity × unit_purchase_price) / totalPurchaseAmount

// 費用分攤
itemSharedCost = totalSharedCost × itemRatio
itemUnitSharedCost = itemSharedCost / received_quantity
```

**示例**：
```
商品A: 100瓶 × $800 = $80,000 (51.6%)
商品B: 50瓶 × $1,500 = $75,000 (48.4%)
總計: $155,000

運費 + 報關費 = $5,000

商品A分攤: $5,000 × 51.6% = $2,580 → $2,580 ÷ 95瓶 = $27/瓶
商品B分攤: $5,000 × 48.4% = $2,420 → $2,420 ÷ 50瓶 = $48/瓶
```

---

#### 8. **成本結算方式（採用「先售出後結轉」）**

**用戶原話**：
> 我以前只有工程成本分攤的概念，即使是商品，我是先售出，等帳單到期才去做結轉

**方案 A：預估成本 + 延後結算** ✅ 採用

**流程**：
```
Step 1: 進貨時 (2025-09-30)
━━━━━━━━━━━━━━━━━━━━━
採購金額: $80,000
海關調整: $80,000 ÷ 95 = $842
關稅 (立即): $18,060 → $190/瓶
報關費 (立即): $2,000 → $21/瓶
━━━━━━━━━━━━━━━━━━━━━
暫時成本: $842 + $190 + $21 = $1,053/瓶

入庫: P0001-001 × 95瓶 @ $1,053
狀態: 🟡 成本未確定 (等待延後費用)

Step 2: 銷售 (2025-10-05)
━━━━━━━━━━━━━━━━━━━━━
賣出 10瓶 @ 成本 $1,053
剩餘庫存: 85瓶

Step 3: 費用帳單到齊 (2025-10-15)
━━━━━━━━━━━━━━━━━━━━━
檢驗費: $2,000 → $21/瓶
倉儲費: $1,000 → $11/瓶
運費: $3,000 → $32/瓶
━━━━━━━━━━━━━━━━━━━━━
追加成本: $21 + $11 + $32 = $64/瓶

Step 4: 結算 (2025-10-15)
━━━━━━━━━━━━━━━━━━━━━
最終成本: $1,053 + $64 = $1,117/瓶

處理方式:
✅ 已售出 10瓶: 不回溯調整（成本差異進會計科目）
   成本差異: $64 × 10瓶 = $640 (少估)

✅ 剩餘庫存 85瓶: 更新單位成本為 $1,117

✅ 進貨單狀態: 🟡 → 🟢 已結算
```

**資料結構**：
```typescript
model Import {
  id: string
  import_number: string

  // 費用清單
  costs: ImportCost[]

  // 結算狀態
  cost_status: CostStatus  // PENDING | FINALIZED
  finalized_at: DateTime?

  // 成本差異（已售出部分的差異）
  cost_variance: Decimal?
}

model ImportCost {
  id: string
  import_id: string

  cost_type: CostType  // TARIFF, CUSTOMS, INSPECTION, STORAGE, SHIPPING
  amount: Decimal
  description: String?
  invoice_date: DateTime?  // 帳單日期
  paid_date: DateTime?

  is_immediate: Boolean  // 立即費用 or 延後費用
  allocation_method: AllocationMethod  // AMOUNT_RATIO, QUANTITY, WEIGHT
}

enum CostStatus {
  PENDING      // 待結算（等待延後費用）
  FINALIZED    // 已結算
}

enum AllocationMethod {
  AMOUNT_RATIO  // 按金額比例（運費、報關費）
  INDIVIDUAL    // 個別計算（關稅）
  QUANTITY      // 按數量
  WEIGHT        // 按重量
}
```

---

#### 9. **通知系統**

**需求**：
- 右上角鈴鐺圖示（目前虛設）
- 通知類型：
  - 投資方調價
  - 進貨單待補費用提醒（月底前）
  - 其他業務通知

**資料結構**：
```typescript
model Notification {
  id: string
  user_id: string  // 接收者

  type: NotificationType
  title: String
  message: String
  link: String?  // 點擊跳轉連結

  is_read: Boolean @default(false)
  read_at: DateTime?

  created_at: DateTime
  created_by: String  // 觸發者
}

enum NotificationType {
  PRICE_ADJUSTMENT    // 投資方調價
  IMPORT_COST_PENDING // 進貨單待結算
  STOCK_LOW           // 庫存不足
  SYSTEM              // 系統通知
}
```

---

#### 10. **移除 variant_type 重複檢查**

**問題**：
```typescript
// webapp/src/app/api/products/[id]/variants/route.ts:173-184
const existingVariant = await prisma.productVariant.findFirst({
  where: {
    product_id: params.id,
    variant_type: normalizedVariantType,  // ❌ 不允許重複
  },
});

if (existingVariant) {
  return NextResponse.json({
    error: `Variant with type '${normalizedVariantType}' already exists`
  }, { status: 409 })
}
```

**解決**：
```typescript
// ✅ 移除此檢查，允許同一商品有多個變體
// ✅ 只檢查 variant_code 唯一性（已有 @@unique 約束）
```

---

## 🚧 待實作項目

### Phase 1: 資料庫 Schema 設計 ⏳
- [ ] 設計新的 ProductVariant Schema（三層價格）
- [ ] 設計 Import/ImportCost Schema（費用池）
- [ ] 設計 Notification Schema（通知系統）
- [ ] 設計 StockTransfer Schema（品號調撥）
- [ ] 設計 Warehouse 欄位（公司倉/個人倉）
- [ ] 撰寫 Prisma Migration

### Phase 2: 後端 API 實作 ⏳
- [ ] 修改 POST /api/products/[id]/variants（移除重複檢查）
- [ ] 實作變體編號生成邏輯（001, 002, 003...）
- [ ] 實作投資方調價 API（含權限控制）
- [ ] 實作品號調撥 API（含成本移轉）
- [ ] 實作進貨單費用管理 API
- [ ] 實作成本分攤計算邏輯
- [ ] 實作通知系統 API

### Phase 3: 前端 UI 重構 ⏳
- [ ] 重構商品詳情頁（變體列表）
- [ ] 實作變體新增對話框（三層價格輸入）
- [ ] 實作投資方調價對話框（含警告）
- [ ] 實作品號調撥功能頁面
- [ ] 重構進貨單頁面（費用池、結算）
- [ ] 實作通知系統 UI（右上角鈴鐺）

### Phase 4: 權限控制 ⏳
- [ ] API 層級權限檢查（INVESTOR 只能改 investor_price）
- [ ] UI 層級欄位隱藏（INVESTOR 看不到 actual_price）
- [ ] 通知權限過濾

### Phase 5: 測試與上線 ⏳
- [ ] 單元測試
- [ ] 整合測試（完整流程）
- [ ] 資料遷移測試
- [ ] 上線部署

---

## ❓ 待釐清問題（延後處理）

### 1. **個人倉財務管理**
- 需追蹤「借款/還款」
- 報表：個人倉對帳單
- **決議**：延後至「財務管理模組」實作

### 2. **預估費用率**
- 是否需要預設值？（如 30%）
- 是否可每批調整？
- **決議**：目前先不實作預估，等費用都到齊再結算

### 3. **成本調整方式選擇**
目前採用：不回溯已售出商品，差異進會計科目
- **可能問題**：利潤計算不精確
- **備案**：未來可改為「預估費用率」方案

---

## 📝 重要提醒

### 不在本次重構範圍的功能：
- ❌ 財務管理（借款/還款）
- ❌ 預估費用率系統
- ❌ 複雜的成本回溯調整
- ❌ 倉庫間調撥（目前只有品號調撥）

### 需保持向後相容：
- ✅ 已有的商品/變體資料
- ✅ 已有的進貨單記錄
- ✅ 已有的銷售記錄

---

**文檔建立日期**: 2025-09-30
**下次更新**: 開始實作後更新進度

---

## 🎯 下一步行動

1. **用戶確認**：確認以上設計無誤
2. **優先級排序**：決定先實作哪些功能
3. **開始 Phase 1**：設計資料庫 Schema
4. **撰寫 Migration**：準備資料遷移腳本

**等待用戶確認後開始實作** ⏸️