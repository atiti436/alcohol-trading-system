# 預購系統完整實施計劃

> 📅 規劃日期：2025-10-03
> 🎯 目標：實現完整的預購訂單管理系統，支援部分滿足和智能分配
> 📝 備註：原 PLAN.MD 已備份為 PLAN.MD.backup-20251003

---

## 📋 目錄

- [需求背景](#需求背景)
- [系統架構](#系統架構)
- [實施順序](#實施順序)
- [功能模組詳細設計](#功能模組詳細設計)
- [數據庫設計](#數據庫設計)
- [API 設計](#api-設計)
- [UI 設計](#ui-設計)
- [測試計劃](#測試計劃)

---

## 需求背景

### 業務場景

1. **預購訂單**
   - 客戶預購未到貨商品（例如：山崎 2025 年版）
   - 不收訂金，等商品到貨再通知客戶
   - 同一商品可能有多個客戶預購

2. **進貨毀損處理**
   - 進貨時可能有商品毀損（運輸損壞、品質問題）
   - 毀損商品需調撥到變體 00X（盒損版）
   - 實際可用庫存少於預購總需求

3. **部分滿足分配**
   - 庫存不足時需要決定如何分配
   - 支援按客戶等級、下單時間等規則分配
   - 未滿足的數量記錄為缺貨，等待下次補貨

### 核心需求

- ✅ 預購訂單不檢查庫存
- ✅ 商品到貨自動/手動轉正式訂單
- ✅ 預購統計彙總（同商品多筆訂單彙總）
- ✅ 毀損處理（調撥到盒損變體 00X）
- ✅ 智能分配（庫存不足時的分配機制）
- ✅ 缺貨追蹤（記錄欠貨，下次優先補足）
- ✅ 到貨通知（完全滿足/部分滿足）

---

## 系統架構

### 狀態流轉圖

```
銷售訂單狀態：

DRAFT (草稿)
   │
   ├─ 一般銷售 → CONFIRMED (確認，檢查庫存)
   │                 │
   │                 └→ SHIPPED (出貨)
   │                       │
   │                       └→ DELIVERED (送達)
   │
   └─ 預購訂單 → PREORDER (預購中，不檢查庫存)
                    │
                    ├─ 到貨 + 庫存足夠 → CONFIRMED
                    │
                    ├─ 到貨 + 庫存不足 → PARTIALLY_CONFIRMED (部分確認)
                    │                        │
                    │                        └→ 缺貨部分 → BACKORDER (缺貨補單)
                    │
                    └─ 取消 → CANCELLED
```

### 核心模組

1. **預購訂單管理**
   - 建立預購單
   - 預購單列表（含篩選）
   - 預購統計彙總

2. **到貨處理**
   - 單筆手動轉換
   - 批次轉換
   - 自動轉換（進貨時觸發）

3. **分配管理**
   - 毀損數量輸入
   - 智能分配建議
   - 手動調整分配
   - 變體調撥（毀損→盒損 00X）

4. **缺貨追蹤**
   - 缺貨記錄建立
   - 優先級管理
   - 補貨自動處理

5. **通知系統**
   - 到貨通知（完全滿足）
   - 部分到貨通知（含缺貨說明）
   - 補貨完成通知

---

## 實施順序

### 🎯 Phase 1：基礎預購功能（2-3 天）

**優先級：P0 - 核心功能**

#### 1.1 數據庫 Schema 修改 ✅
- [x] 擴充 `SaleStatus` enum（加入 PREORDER, PARTIALLY_CONFIRMED, BACKORDER）
- [x] `Sale` 表新增預購相關欄位
- [x] 建立 `BackorderTracking` 表
- [x] 執行 migration

**檔案**：
- `webapp/prisma/schema.prisma`

**預計時間**：0.5 天
**實際完成**：2025-10-03

---

#### 1.2 預購訂單基礎 API ✅
- [x] `POST /api/sales` - 修改支援預購模式（`is_preorder: true`）
- [x] `POST /api/sales/[id]/confirm` - 修改邏輯：預購單跳過庫存檢查
- [x] `GET /api/sales` - 修改支援預購篩選

**檔案**：
- `webapp/src/app/api/sales/route.ts`
- `webapp/src/app/api/sales/[id]/confirm/route.ts`

**預計時間**：1 天
**實際完成**：2025-10-03

---

#### 1.3 銷售管理 UI 擴充 ✅
- [x] 新增按鈕：下拉選擇「一般銷售」/「預購單」
- [x] 新增表單：預購模式切換 + 預計到貨日期欄位
- [x] 列表顯示：預購標籤 + 預計到貨日
- [x] 篩選器：加入「預購中」狀態

**檔案**：
- `webapp/src/app/sales/page.tsx`
- `webapp/src/components/sales/SaleOrderModal.tsx`

**預計時間**：1 天
**實際完成**：2025-10-03

---

#### 1.4 手動轉換功能 ✅
- [x] `POST /api/sales/[id]/convert-to-confirmed` - 預購轉正式訂單
- [x] 訂單詳情頁：「商品已到貨」按鈕
- [x] 轉換確認對話框（顯示庫存狀況）

**檔案**：
- `webapp/src/app/api/sales/[id]/convert-to-confirmed/route.ts`
- `webapp/src/app/sales/page.tsx`（使用查看詳情 Modal）

**預計時間**：0.5 天
**實際完成**：2025-10-03

**✅ Phase 1 完成標準**：
- ✅ 可以建立預購單
- ✅ 預購單不檢查庫存
- ✅ 商品到貨後可手動轉為正式訂單

**🎉 Phase 1 已於 2025-10-03 完成！**

---

### 🎯 Phase 2：預購統計彙總（2 天）

**優先級：P0 - 核心功能**

#### 2.1 預購統計 API ✅
- [x] `GET /api/sales/preorder-summary` - 統計彙總 API
  - 按商品彙總（總需求、訂單數、客戶數）
  - 按客戶彙總（展開客戶的所有預購單）
  - 按時間軸彙總（預計到貨日分組）

**檔案**：
- `webapp/src/app/api/sales/preorder-summary/route.ts`

**預計時間**：1 天
**實際完成**：2025-10-03

---

#### 2.2 預購統計頁面 ✅
- [x] 建立頁面：`/sales/preorder-summary`
- [x] 總覽卡片（訂單數、商品種類、總金額）
- [x] 商品彙總表格（可展開查看訂單明細）
- [x] 客戶明細表格（可展開）
- [x] 時間軸視圖

**檔案**：
- `webapp/src/app/sales/preorder-summary/page.tsx`

**預計時間**：1 天
**實際完成**：2025-10-03

**✅ Phase 2 完成標準**：
- ✅ 可以看到所有預購單的統計
- ✅ 同商品多筆訂單正確彙總
- ✅ 可以快速查詢某客戶的所有預購

**🎉 Phase 2 已於 2025-10-03 完成！**

---

### 🎯 Phase 3：批次轉換功能（1 天）

**優先級：P1 - 重要功能**

#### 3.1 批次轉換 API
- [ ] `POST /api/sales/preorders/batch-convert` - 批次轉換
  - 支援選擇多張預購單
  - 按優先級排序處理
  - 批次預留庫存
  - 批次發送通知

**檔案**：
- `webapp/src/app/api/sales/preorders/batch-convert/route.ts`

**預計時間**：0.5 天

---

#### 3.2 批次轉換 UI
- [ ] 預購統計頁面：商品列表加入「批次轉換」按鈕
- [ ] 批次轉換對話框（選擇訂單、調整順序）
- [ ] 進度顯示（處理中/成功/失敗）
- [ ] 結果摘要

**檔案**：
- `webapp/src/app/sales/preorder-summary/page.tsx`
- `webapp/src/components/sales/BatchConvertModal.tsx`

**預計時間**：0.5 天

**✅ Phase 3 完成標準**：
- 可以一次處理多張預購單
- 顯示處理進度和結果

---

### 🎯 Phase 4：毀損處理和智能分配（3 天）⭐ 核心重點

**優先級：P0 - 核心功能**

#### 4.1 收貨流程修改（毀損處理）
- [ ] `POST /api/purchases/[id]/receive` - 加入毀損數量欄位
- [ ] 毀損商品自動調撥到盒損變體（00X）
- [ ] 檢測預購單需求 vs 可用庫存
- [ ] 庫存不足時觸發分配流程

**檔案**：
- `webapp/src/app/api/purchases/[id]/receive/route.ts`
- `webapp/src/components/purchases/ReceiveModal.tsx`

**預計時間**：1 天

---

#### 4.2 智能分配 API
- [ ] `POST /api/sales/preorders/allocate` - 智能分配 API
  - 輸入：可用庫存、預購單列表、分配規則
  - 輸出：分配建議（每張單分配多少）
  - 支援多種分配策略：
    - 按比例分配
    - 按優先級分配（VIP、下單時間等）
    - 優先滿足部分客戶
- [ ] `POST /api/sales/preorders/execute-allocation` - 執行分配

**檔案**：
- `webapp/src/app/api/sales/preorders/allocate/route.ts`
- `webapp/src/app/api/sales/preorders/execute-allocation/route.ts`
- `webapp/src/lib/allocation.ts` （分配算法）

**預計時間**：1 天

---

#### 4.3 分配 UI 和部分確認
- [ ] 收貨頁面：毀損數量輸入
- [ ] 自動彈出分配對話框
- [ ] 顯示分配建議（按比例/優先級）
- [ ] 手動調整分配數量
- [ ] 確認後執行：
  - 完全滿足 → CONFIRMED
  - 部分滿足 → PARTIALLY_CONFIRMED
  - 缺貨部分 → 建立 BACKORDER 記錄
- [ ] 毀損商品自動調撥顯示

**檔案**：
- `webapp/src/components/purchases/AllocationModal.tsx`

**預計時間**：1 天

**✅ Phase 4 完成標準**：
- 收貨時可輸入毀損數量
- 毀損商品自動調撥到盒損變體 00X
- 庫存不足時可智能分配
- 支援部分滿足訂單

---

### 🎯 Phase 5：缺貨追蹤和補貨（2 天）

**優先級：P1 - 重要功能**

#### 5.1 缺貨追蹤 API
- [ ] `POST /api/backorders` - 建立缺貨記錄
- [ ] `GET /api/backorders` - 查詢缺貨列表（按商品/客戶）
- [ ] `POST /api/backorders/[id]/resolve` - 標記缺貨已解決

**檔案**：
- `webapp/src/app/api/backorders/route.ts`
- `webapp/src/app/api/backorders/[id]/resolve/route.ts`

**預計時間**：0.5 天

---

#### 5.2 補貨自動處理
- [ ] 修改收貨流程：優先檢查 BACKORDER
- [ ] 自動補足缺貨訂單
- [ ] 發送補貨完成通知

**檔案**：
- `webapp/src/app/api/purchases/[id]/receive/route.ts`

**預計時間**：0.5 天

---

#### 5.3 缺貨管理頁面
- [ ] 建立頁面：`/sales/backorders`
- [ ] 缺貨列表（按商品/客戶分組）
- [ ] 顯示優先級和缺貨時間
- [ ] 手動標記已解決

**檔案**：
- `webapp/src/app/sales/backorders/page.tsx`

**預計時間**：1 天

**✅ Phase 5 完成標準**：
- 缺貨數量被記錄追蹤
- 下次進貨優先補足缺貨訂單
- 可以查看所有缺貨狀況

---

### 🎯 Phase 6：通知系統（1-2 天）

**優先級：P1 - 重要功能**

#### 6.1 通知模板
- [ ] 完全滿足通知模板
- [ ] 部分滿足通知模板（含缺貨說明）
- [ ] 補貨完成通知模板

**檔案**：
- `webapp/src/lib/notifications/templates.ts`

**預計時間**：0.5 天

---

#### 6.2 通知發送邏輯
- [ ] 整合 LINE Notify API
- [ ] Email 通知（使用 Resend 或其他服務）
- [ ] 批次發送通知

**檔案**：
- `webapp/src/lib/notifications/sender.ts`

**預計時間**：1 天

---

#### 6.3 通知記錄
- [ ] 記錄所有發送的通知
- [ ] 通知歷史查詢
- [ ] 重發通知功能

**檔案**：
- `webapp/src/app/api/notifications/route.ts`

**預計時間**：0.5 天

**✅ Phase 6 完成標準**：
- 到貨時自動發送通知
- 部分滿足時說明缺貨情況
- 可以查看通知歷史

---

### 🎯 Phase 7：自動化和優化（2 天）

**優先級：P2 - 優化功能**

#### 7.1 進貨時自動轉換
- [ ] 收貨完成自動檢查預購單
- [ ] 自動轉換 + 預留庫存
- [ ] 顯示處理結果彈窗

**檔案**：
- `webapp/src/app/api/purchases/[id]/receive/route.ts`

**預計時間**：0.5 天

---

#### 7.2 系統設定
- [ ] 預購轉換設定頁面
  - 自動/手動轉換開關
  - 分配優先級規則設定
  - 通知開關

**檔案**：
- `webapp/src/app/settings/preorder/page.tsx`

**預計時間**：0.5 天

---

#### 7.3 匯出功能
- [ ] 預購統計匯出 Excel
  - Sheet1: 商品彙總
  - Sheet2: 客戶明細
  - Sheet3: 時間軸

**檔案**：
- `webapp/src/lib/export/preorder-summary.ts`

**預計時間**：0.5 天

---

#### 7.4 儀表板小工具
- [ ] 首頁加入「預購提醒」卡片
- [ ] 顯示本週到貨提醒
- [ ] 待處理預購單數量

**檔案**：
- `webapp/src/app/dashboard/page.tsx`
- `webapp/src/components/dashboard/PreorderWidget.tsx`

**預計時間**：0.5 天

**✅ Phase 7 完成標準**：
- 進貨時自動處理預購單
- 系統設定完善
- 首頁可以看到預購提醒

---

### 🎯 Phase 8：測試和上線（2 天）

**優先級：P0 - 必須**

#### 8.1 功能測試
- [ ] 預購訂單建立測試
- [ ] 轉換流程測試（手動/批次/自動）
- [ ] 分配邏輯測試（完全/部分滿足）
- [ ] 缺貨追蹤測試
- [ ] 通知發送測試
- [ ] 毀損調撥測試（00X）

**預計時間**：1 天

---

#### 8.2 數據遷移和部署
- [ ] 執行 Prisma migration
- [ ] 測試環境驗證
- [ ] 生產環境部署
- [ ] 使用手冊撰寫

**預計時間**：1 天

**✅ Phase 8 完成標準**：
- 所有功能測試通過
- 生產環境穩定運行
- 團隊成員會使用

---

## 實施時程總覽

| Phase | 功能 | 優先級 | 預計時間 | 累計時間 |
|-------|------|--------|----------|----------|
| Phase 1 | 基礎預購功能 | P0 | 3 天 | 3 天 |
| Phase 2 | 預購統計彙總 | P0 | 2 天 | 5 天 |
| Phase 3 | 批次轉換功能 | P1 | 1 天 | 6 天 |
| Phase 4 | 毀損處理和分配 ⭐ | P0 | 3 天 | 9 天 |
| Phase 5 | 缺貨追蹤和補貨 | P1 | 2 天 | 11 天 |
| Phase 6 | 通知系統 | P1 | 2 天 | 13 天 |
| Phase 7 | 自動化和優化 | P2 | 2 天 | 15 天 |
| Phase 8 | 測試和上線 | P0 | 2 天 | 17 天 |

**總預計時間：約 3 週（17 個工作天）**

### 建議實施策略

**方案 A：MVP 快速上線（推薦）**
```
Week 1: Phase 1 + Phase 2（基礎功能 + 統計）
Week 2: Phase 4（毀損處理和分配）- 核心重點
Week 3: Phase 5 + Phase 8（缺貨追蹤 + 測試上線）
後續：Phase 3, 6, 7 逐步優化
```

**方案 B：完整實施**
```
按 Phase 1-8 順序完整實施（17 天）
```

---

## 功能模組詳細設計

### 1. 預購訂單建立

#### 使用者故事
```
作為業務人員
我想要建立預購單
好讓我記錄客戶對未到貨商品的預訂
```

#### 驗收標準
- [ ] 可以選擇「預購單」模式
- [ ] 必須填寫預計到貨日
- [ ] 不會檢查庫存（庫存為 0 也可以）
- [ ] 訂單狀態為 PREORDER

---

### 2. 預購統計彙總

#### 使用者故事
```
作為業務人員
我想要看到所有預購單的統計
好讓我知道需要進多少貨
```

#### 驗收標準
- [ ] 可以看到每個商品的總需求量
- [ ] 可以看到哪些客戶預購了該商品
- [ ] 可以看到預購訂單明細
- [ ] 可以按預計到貨日分組查看

#### UI 設計
```
商品彙總表格：
┌─────────────────────────────────────────────────────┐
│ 商品名稱    │需求量│已預留│缺口│預購單數│客戶數│操作│
├─────────────────────────────────────────────────────┤
│ 山崎2025   │ 15  │  0  │ 15 │  3    │  2  │批次轉│
│  └─ 展開：                                          │
│     • SA-001 客戶A 8個 (2025-01-15)                │
│     • SA-002 客戶B 5個 (2025-02-15)                │
│     • SA-003 客戶A 2個 (2025-01-15)                │
└─────────────────────────────────────────────────────┘
```

---

### 3. 毀損處理和分配（核心重點）

#### 使用者故事
```
作為業務人員
當我收貨時發現有毀損商品
我想要記錄毀損數量並調撥到盒損變體
同時智能分配剩餘庫存給預購客戶
```

#### 流程設計

```
Step 1: 收貨輸入
┌─────────────────────────────────────┐
│ 收貨單 #PO-001                      │
├─────────────────────────────────────┤
│ 商品：山崎2025                      │
│ 訂購數量：20                        │
│ 實際到貨：20                        │
│ 毀損數量：[5] ⭐ 輸入               │
│ 可用數量：15  (自動計算)           │
│                                     │
│ ⚠️ 毀損商品將調撥到：              │
│    P0001-00X-700-43 (盒損版)       │
└─────────────────────────────────────┘

Step 2: 檢測預購單
┌─────────────────────────────────────┐
│ ⚠️ 發現預購單需求                  │
├─────────────────────────────────────┤
│ 總需求：20 個                       │
│ 可用庫存：15 個                     │
│ 缺口：5 個                          │
│                                     │
│ 預購單明細：                        │
│ • 客戶A：8 個 (VIP)                │
│ • 客戶B：5 個 (一般)               │
│ • 客戶C：7 個 (一般)               │
│                                     │
│ [進行分配] [稍後處理]              │
└─────────────────────────────────────┘

Step 3: 選擇分配策略
┌─────────────────────────────────────┐
│ 分配策略選擇                        │
├─────────────────────────────────────┤
│ ⭕ 按比例分配 (推薦)                │
│    • 客戶A: 8 → 6 (-25%)           │
│    • 客戶B: 5 → 4 (-20%)           │
│    • 客戶C: 7 → 5 (-28%)           │
│                                     │
│ ⭕ 按優先級分配                     │
│    • 客戶A(VIP): 8 → 8 (100%)      │
│    • 客戶B: 5 → 3 (40%)            │
│    • 客戶C: 7 → 4 (57%)            │
│                                     │
│ ⭕ 手動調整                         │
│                                     │
│ [下一步]                            │
└─────────────────────────────────────┘

Step 4: 手動調整（如果需要）
┌─────────────────────────────────────┐
│ 手動調整分配                        │
├─────────────────────────────────────┤
│ 剩餘可分配：15 個                   │
│                                     │
│ SA-001 客戶A (VIP客戶)             │
│ 預購：8 → 分配：[8] ⭐             │
│ 備註：[VIP優先滿足]                │
│                                     │
│ SA-002 客戶B                       │
│ 預購：5 → 分配：[3] ⭐             │
│ 備註：[缺2個，已補貨中]            │
│                                     │
│ SA-003 客戶C                       │
│ 預購：7 → 分配：[4] ⭐             │
│ 備註：[缺3個，已補貨中]            │
│                                     │
│ 已分配：15 / 15 ✅                 │
│                                     │
│ ☑️ 發送到貨通知                    │
│ ☑️ 建立缺貨追蹤                    │
│                                     │
│ [確認分配]                          │
└─────────────────────────────────────┘

Step 5: 執行結果
┌─────────────────────────────────────┐
│ ✅ 分配完成                         │
├─────────────────────────────────────┤
│ 已處理：                            │
│ • SA-001：CONFIRMED (完全滿足)     │
│ • SA-002：PARTIALLY_CONFIRMED      │
│ • SA-003：PARTIALLY_CONFIRMED      │
│                                     │
│ 缺貨記錄：                          │
│ • SA-002：缺 2 個（優先級: 高）    │
│ • SA-003：缺 3 個（優先級: 高）    │
│                                     │
│ 毀損處理：                          │
│ • 已調撥 5 個到 P0001-00X          │
│                                     │
│ 通知狀態：                          │
│ • 客戶A：已發送 ✅                 │
│ • 客戶B：已發送 ✅                 │
│ • 客戶C：已發送 ✅                 │
└─────────────────────────────────────┘
```

---

## 數據庫設計

### Schema 修改

```prisma
// ============================================
// 銷售狀態擴充
// ============================================
enum SaleStatus {
  DRAFT                  // 草稿
  PREORDER              // 🆕 預購中
  CONFIRMED             // 已確認
  PARTIALLY_CONFIRMED   // 🆕 部分確認
  BACKORDER            // 🆕 缺貨補單
  SHIPPED              // 已出貨
  DELIVERED            // 已送達
  CANCELLED            // 已取消
}

// ============================================
// Sale 表擴充
// ============================================
model Sale {
  // ... 現有欄位 ...

  // 🆕 預購相關欄位
  is_preorder              Boolean   @default(false)
  expected_arrival_date    DateTime?  // 預計到貨日
  preorder_notes           String?    // 預購備註

  // 🆕 分配相關欄位
  allocated_quantity       Int?       // 已分配數量
  shortage_quantity        Int?       // 缺貨數量
  allocation_priority      Float?     // 分配優先級分數
  allocation_notes         String?    // 分配備註/說明

  // 🆕 轉換追蹤
  converted_at            DateTime?  // 預購轉正式訂單時間
  converted_by            String?    // 轉換操作人

  // 🆕 訂單拆分（用於部分滿足）
  parent_sale_id          String?    // 父訂單ID
  child_sales             Sale[]     @relation("SaleSplit")
  parent_sale             Sale?      @relation("SaleSplit", fields: [parent_sale_id], references: [id])

  // 🆕 缺貨追蹤
  backorder_trackings     BackorderTracking[]

  // ... 其他關聯 ...
}

// ============================================
// 🆕 缺貨追蹤表
// ============================================
model BackorderTracking {
  id                String   @id @default(cuid())
  sale_id          String
  variant_id       String
  shortage_quantity Int      // 缺貨數量
  priority         Float     // 優先級（用於補貨排序）

  // 狀態追蹤
  status           String    @default("PENDING") // PENDING, RESOLVED, CANCELLED
  resolved_at      DateTime? // 解決時間
  resolved_by      String?   // 解決人

  // 備註
  notes            String?

  // 時間戳
  created_at       DateTime  @default(now())
  updated_at       DateTime  @updatedAt

  // 關聯
  sale             Sale              @relation(fields: [sale_id], references: [id], onDelete: Cascade)
  variant          ProductVariant    @relation(fields: [variant_id], references: [id])

  @@index([sale_id])
  @@index([variant_id])
  @@index([status])
  @@map("backorder_tracking")
}

// ============================================
// 🆕 通知記錄表（可選）
// ============================================
model NotificationLog {
  id              String   @id @default(cuid())
  sale_id         String?
  customer_id     String?
  type            String   // ARRIVAL, PARTIAL_ARRIVAL, BACKORDER_RESOLVED
  channel         String   // LINE, EMAIL, SMS

  // 內容
  subject         String?
  message         String

  // 狀態
  status          String   @default("PENDING") // PENDING, SENT, FAILED
  sent_at         DateTime?
  error_message   String?

  // 時間戳
  created_at      DateTime @default(now())

  @@index([sale_id])
  @@index([customer_id])
  @@index([status])
  @@map("notification_logs")
}
```

### Migration 步驟

```bash
# 1. 修改 schema.prisma

# 2. 生成 migration
npx prisma migrate dev --name add_preorder_system

# 3. 查看生成的 SQL
cat prisma/migrations/xxxxx_add_preorder_system/migration.sql

# 4. 在測試環境執行
npx prisma migrate deploy

# 5. 驗證數據完整性
npx prisma studio

# 6. 生產環境部署
# 先備份！
npx prisma migrate deploy
```

---

## API 設計

*（內容與前面相同，詳見完整文檔）*

---

## 測試計劃

### 單元測試清單

#### 分配算法測試
```typescript
// webapp/src/lib/allocation.test.ts

describe('Allocation Algorithm', () => {
  test('按比例分配 - 基本情況', () => {
    const result = allocateProportionally({
      available: 15,
      preorders: [
        { id: '1', quantity: 8 },
        { id: '2', quantity: 5 },
        { id: '3', quantity: 7 }
      ]
    })

    expect(result).toEqual([
      { id: '1', allocated: 6, shortage: 2 },
      { id: '2', allocated: 4, shortage: 1 },
      { id: '3', allocated: 5, shortage: 2 }
    ])
  })

  test('按比例分配 - 庫存充足', () => {
    const result = allocateProportionally({
      available: 30,
      preorders: [
        { id: '1', quantity: 8 },
        { id: '2', quantity: 5 }
      ]
    })

    expect(result).toEqual([
      { id: '1', allocated: 8, shortage: 0 },
      { id: '2', allocated: 5, shortage: 0 }
    ])
  })

  test('按優先級分配 - VIP 優先', () => {
    const result = allocateByPriority({
      available: 10,
      preorders: [
        { id: '1', quantity: 8, priority: 100 },  // VIP
        { id: '2', quantity: 5, priority: 50 }    // 一般
      ]
    })

    expect(result).toEqual([
      { id: '1', allocated: 8, shortage: 0 },
      { id: '2', allocated: 2, shortage: 3 }
    ])
  })
})
```

---

### 整合測試清單

#### 完整預購流程
```typescript
describe('Complete Preorder Flow', () => {
  test('建立預購 → 到貨 → 轉正式單 → 出貨', async () => {
    // 1. 建立預購單
    const sale = await createSale({
      is_preorder: true,
      customer_id: 'customer_1',
      items: [{ variant_id: 'variant_1', quantity: 5 }],
      expected_arrival_date: '2025-11-15'
    })
    expect(sale.status).toBe('PREORDER')

    // 2. 商品到貨（庫存充足）
    await receiveGoods({ variant_id: 'variant_1', quantity: 10 })

    // 3. 手動轉換
    const converted = await convertToConfirmed(sale.id)
    expect(converted.status).toBe('CONFIRMED')

    // 4. 出貨
    const shipped = await shipSale(sale.id)
    expect(shipped.status).toBe('SHIPPED')
  })

  test('毀損導致部分滿足流程', async () => {
    // 1. 三個客戶預購
    const sales = await Promise.all([
      createSale({ customer: 'A', quantity: 8 }),
      createSale({ customer: 'B', quantity: 5 }),
      createSale({ customer: 'C', quantity: 7 })
    ])

    // 2. 進貨 20，毀損 5
    const received = await receiveGoods({
      variant_id: 'variant_1',
      ordered: 20,
      damaged: 5,
      damaged_target_variant: 'variant_1_00X'
    })

    // 3. 執行分配
    const allocation = await executeAllocation({
      available: 15,
      sale_ids: sales.map(s => s.id),
      strategy: 'proportional'
    })

    // 4. 驗證結果
    expect(allocation.confirmed_sales.length).toBeGreaterThan(0)
    expect(allocation.partially_confirmed_sales.length).toBeGreaterThan(0)
    expect(allocation.backorders_created).toBe(2) // B 和 C

    // 5. 驗證毀損調撥
    const damagedVariant = await getInventory('variant_1_00X')
    expect(damagedVariant.quantity).toBe(5)
  })
})
```

---

## 部署清單

### 前置準備
- [ ] 備份生產環境數據庫
- [ ] 準備 rollback 腳本
- [ ] 通知團隊維護時間

### 數據庫遷移
- [ ] 在測試環境執行 migration
- [ ] 驗證數據完整性
- [ ] 在生產環境執行 migration
- [ ] 驗證遷移成功

### 應用部署
- [ ] 部署新版本程式碼
- [ ] 重啟服務
- [ ] 驗證基本功能
- [ ] 監控錯誤日誌

### 功能驗證
- [ ] 建立測試預購單
- [ ] 測試轉換功能
- [ ] 測試分配功能
- [ ] 測試通知發送

### 監控設定
- [ ] 預購單數量監控
- [ ] 缺貨數量監控
- [ ] 分配失敗告警
- [ ] 通知發送失敗告警

---

## 使用手冊

### 業務人員操作指南

#### 1. 如何建立預購單
```
步驟：
1. 進入「銷售管理」
2. 點擊「新增銷售單」▼ 下拉選單
3. 選擇「預購單（未到貨）」
4. 填寫：
   - 客戶
   - 商品（庫存為 0 也可以）
   - 預計到貨日
5. 儲存

結果：
- 訂單狀態：預購中
- 不會預留庫存
- 等待商品到貨
```

#### 2. 如何查看預購統計
```
步驟：
1. 進入「銷售管理 → 預購統計彙總」
2. 查看商品彙總
3. 點擊展開查看訂單明細

用途：
- 了解需要進多少貨
- 查詢某客戶的所有預購
- 按到貨日規劃進貨
```

#### 3. 商品到貨如何處理

**方式 1：手動轉換**
```
1. 進入預購單詳情
2. 點擊「商品已到貨」
3. 系統檢查庫存
4. 庫存足夠 → 自動預留 → 發通知
```

**方式 2：批次轉換**
```
1. 進入「預購統計彙總」
2. 找到商品，點「批次轉換」
3. 選擇要轉換的訂單
4. 確認執行
```

**方式 3：自動轉換**
```
1. 在「進貨管理」收貨
2. 系統自動檢測預購單
3. 自動轉換並通知
```

#### 4. 遇到毀損如何分配（重點）

```
情境：訂 20 個，到貨 20 個，毀損 5 個，可用 15 個

步驟：
1. 收貨時輸入「毀損數量：5」
   → 系統自動調撥到 P0001-00X（盒損變體）

2. 系統彈出分配對話框：
   ┌─────────────────────────────┐
   │ 總需求：20 | 可用：15 | 缺：5 │
   │ 客戶A: 8 個               │
   │ 客戶B: 5 個               │
   │ 客戶C: 7 個               │
   └─────────────────────────────┘

3. 選擇分配方式：
   【按比例分配】- 每個人都少一點
   A: 8 → 6 (-2)
   B: 5 → 4 (-1)
   C: 7 → 5 (-2)

   【按優先級】- VIP 優先滿足
   A(VIP): 8 → 8 (✅ 滿足)
   B: 5 → 3 (缺 2)
   C: 7 → 4 (缺 3)

   【手動調整】- 自己決定
   A: [8] ← 可調整
   B: [3]
   C: [4]

4. 確認分配

結果：
- 完全滿足 → 轉正式訂單
- 部分滿足 → 記錄缺貨，等補貨
- 毀損 5 個 → 已調撥到盒損變體
- 發送通知給所有客戶
```

---

## 常見問題 FAQ

**Q1: 預購單可以修改嗎？**
A: PREORDER 狀態下可以修改，轉為 CONFIRMED 後不建議修改（會影響庫存預留）。

**Q2: 客戶取消預購怎麼辦？**
A: 直接刪除或標記為 CANCELLED。如果已轉 CONFIRMED，需要釋放預留庫存。

**Q3: 部分滿足的訂單，客戶不要了怎麼辦？**
A: 可以取消 BACKORDER 記錄，釋放優先級。

**Q4: 毀損商品調撥到哪個變體？**
A: 自動調撥到盒損變體（變體類型 00X），例如 P0001-00X-700-43。

**Q5: 如何調整分配優先級規則？**
A: 進入「系統設定 → 預購設定」，調整 VIP、下單時間等權重。

**Q6: 補貨時會自動處理缺貨嗎？**
A: 如果開啟「自動轉換」，補貨時會優先處理 BACKORDER。

**Q7: 可以同時有多個預購單嗎？**
A: 可以！系統會彙總所有預購單的需求。

**Q8: 預計到貨日過了沒到怎麼辦？**
A: 可以修改預計到貨日，或在備註說明延遲原因。

---

## 附錄

### A. 分配算法詳細說明

#### 按比例分配公式
```
分配量 = 可用庫存 × (訂單需求 / 總需求)

範例：
- 可用：15
- 總需求：20
- 比例：75% (15/20)

訂單A: 8 × 0.75 = 6
訂單B: 5 × 0.75 = 3.75 → 4（四捨五入）
訂單C: 7 × 0.75 = 5.25 → 5

總分配：6 + 4 + 5 = 15 ✅
```

#### 按優先級分配邏輯
```
1. 計算每個訂單的優先級分數
2. 按分數排序（高到低）
3. 從高分到低分依序滿足
4. 庫存用完為止

優先級公式：
score = (客戶等級分 × 權重1)
      + (時間分數 × 權重2)
      + (預付款分數 × 權重3)

範例：
VIP + 早下單 = 100 分 → 優先滿足
一般 + 晚下單 = 50 分 → 可能缺貨
```

### B. 毀損調撥規則

#### 變體命名規則
```
正常變體：P0001-A-700-43
盒損變體：P0001-00X-700-43 ⭐

其中：
- P0001: 商品編號
- 00X: 盒損類型
- 700: 容量 (ml)
- 43: 酒精度 (%)
```

#### 自動調撥流程
```
收貨時：
1. 輸入毀損數量：5
2. 系統查找對應的盒損變體：
   - 來源：P0001-A-700-43
   - 目標：P0001-00X-700-43
3. 執行調撥：
   - 建立 StockTransfer 記錄
   - 來源庫存 -5
   - 目標庫存 +5
4. 記錄異動：
   - movement_type: TRANSFER
   - reason: "進貨毀損調撥"
```

### C. 通知模板

#### 完全滿足通知
```
親愛的{customer_name}，您好！

您預購的「{product_name}」已到貨！

預購數量：{quantity} 個
本次到貨：{quantity} 個 ✅

請於 3 日內至門市取貨或聯繫安排出貨。

感謝您的支持！
```

#### 部分滿足通知
```
親愛的{customer_name}，您好！

您預購的「{product_name}」已部分到貨。

預購數量：{total_quantity} 個
本次到貨：{allocated_quantity} 個
尚缺數量：{shortage_quantity} 個

由於運輸過程中部分商品毀損，
本次僅能優先提供 {allocated_quantity} 個。
剩餘 {shortage_quantity} 個將於下批貨到時優先保留給您。

造成不便，敬請見諒。
```

#### 補貨完成通知
```
親愛的{customer_name}，您好！

您之前缺貨的「{product_name}」已補貨到位！

缺貨數量：{shortage_quantity} 個
已補貨：{shortage_quantity} 個 ✅

請於 3 日內至門市取貨或聯繫安排出貨。

感謝您的耐心等待！
```

---

## 結語

這份計劃涵蓋了完整的預購系統實施細節，特別強化了：

- ✅ 毀損處理和自動調撥到盒損變體（00X）
- ✅ 智能分配機制（按比例/優先級/手動）
- ✅ 部分滿足和缺貨追蹤
- ✅ 完整的業務流程和使用手冊

建議按照 **Phase 1 → Phase 8** 順序實施，重點關注 **Phase 4（毀損處理和分配）**。

---

📅 **預計開始日期**：待定
📅 **預計完成日期**：開始後 3 週（17 個工作天）
👤 **負責開發**：待分配
✅ **驗收標準**：所有 Phase 的完成標準達成

---

*文檔版本：v2.0 (預購系統)*
*最後更新：2025-10-03*
*上一版本備份：PLAN.MD.backup-20251003*
