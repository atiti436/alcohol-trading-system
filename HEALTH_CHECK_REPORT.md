# 🏥 系統健康檢查報告

**生成時間**: 2025-10-04
**檢查範圍**: UI-API連接、ERP業務邏輯、多餘程式碼、資料庫Schema一致性
**最後更新**: 2025-10-04 (新增修復記錄與詳細計劃)

---

## 📋 執行摘要

| 檢查項目 | 狀態 | 關鍵問題數 | 已修復 |
|---------|------|-----------|--------|
| UI-API連接 | ✅ 良好 | 2個中等問題 | 2/2 |
| ERP業務邏輯 | 🟢 改善中 | 4個關鍵問題 | 2/4 |
| 多餘程式碼 | ⚠️ 警告 | 多個待清理項目 | 0 |
| Schema一致性 | 🟢 已修復 | 1個致命錯誤 | 1/1 |

**修復進度**: 6/13 問題已修復（46%）

---

## ✅ 已修復問題

### ✅ 問題 #2: 資料庫欄位不存在錯誤 (已修復 - 2025-10-04)

**修復內容**:
- ✅ `webapp/src/app/api/backorders/route.ts:54` - `customer_level` → `tier`
- ✅ `webapp/src/app/api/backorders/route.ts:133` - `customer_level` → `customer_tier`
- ✅ `webapp/src/app/api/sales/preorders/allocate/route.ts:52` - `customer_level` → `tier`
- ✅ `webapp/src/app/api/sales/preorders/allocate/route.ts:92` - VIP 判斷改用 `tier`

**影響**: 客戶查詢功能恢復正常，不再拋出 Prisma 錯誤

**Commit**: `010e0c1`

---

### ✅ 問題 #3: Admin 取消訂單未釋放 Inventory.reserved (已修復 - 2025-10-04)

**修復內容**:
- ✅ 新增 Inventory 表的庫存釋放邏輯（使用 FIFO 回滾）
- ✅ 保持 ProductVariant 雙寫（向後兼容）
- ✅ 正確處理多倉庫情境

**修復後邏輯**:
```typescript
// 1. 更新 ProductVariant（兼容性）
await tx.productVariant.update({
  data: { reserved_stock: { decrement }, available_stock: { increment } }
})

// 2. 更新 Inventory 表（主要來源）- FIFO 回滾
for (const inv of inventories) {
  await tx.inventory.update({
    data: { reserved: { decrement }, available: { increment } }
  })
}
```

**影響**: 取消訂單後庫存正確釋放，不再永久鎖定

**Commit**: `010e0c1`

---

### ✅ 問題 #4: BACKORDER 補貨邏輯驗證 (已確認無問題 - 2025-10-04)

**驗證結果**:
- ✅ BACKORDER 的 `shortage_quantity` 記錄的是**實際缺貨數量**，非訂單總數
- ✅ 補貨時只預留缺貨部分，**不會造成重複預留**
- ✅ 邏輯正確：訂100瓶 → 預留60瓶 → BACKORDER 40瓶 → 補貨預留40瓶 = 總共100瓶 ✅

**結論**: 原健康報告的此項判斷有誤，實際上沒有問題

---

### ✅ 問題 #5: AllocationModal 組件未使用 (已修復 - 2025-10-04)

**問題**: AllocationModal 組件完整實現但從未被使用

**修復內容**:
- ✅ 修改收貨 API 支援三種預購處理模式（AUTO/MANUAL/SKIP）
- ✅ 在 ReceiveGoodsModal 加入 preorder_mode 選擇器
- ✅ 整合 AllocationModal 到 purchases 頁面
- ✅ 實現多變體順序分配流程

**新增功能**:
```typescript
// 收貨時可選擇預購單處理模式
preorder_mode: 'MANUAL'  // 🎯 手動分配（可選客戶優先順序）
preorder_mode: 'AUTO'    // ⚡ 自動分配（先到先得）
preorder_mode: 'SKIP'    // ⏸️ 暫不處理（稍後手動）
```

**業務價值**:
- 解決客戶優先級問題（難搞客戶 vs 好講話客戶 vs 慢付款客戶）
- 支援三種分配策略：按比例、按優先級、先到先得
- 可跨變體連續分配，提高作業效率

**影響**: 重要功能恢復可用，符合實際業務需求

**修改檔案**:
- `webapp/src/app/api/purchases/[id]/receive/route.ts` - 新增 preorder_mode 參數支援
- `webapp/src/components/purchases/ReceiveGoodsModal.tsx` - 新增模式選擇器
- `webapp/src/app/purchases/page.tsx` - 整合 AllocationModal 流程

---

### ✅ 問題 #6: item_damages 參數未被處理 (已修復 - 2025-10-04)

**問題**: 前端 ReceiveGoodsModal 發送逐商品毀損明細，但後端完全忽略此參數

**修復內容**:
- ✅ 收貨 API 新增 `item_damages` 參數接收
- ✅ 建立商品毀損數量對照表 (Map)
- ✅ 優先使用精確商品毀損數量，否則按比例分攤

**修復邏輯**:
```typescript
// 1. 建立毀損對照表
const damageMap = new Map<string, number>()
for (const damage of item_damages) {
  damageMap.set(damage.product_id, damage.damaged_quantity)
}

// 2. 計算每個商品的實際毀損
if (damageMap.has(item.product_id)) {
  itemLoss = damageMap.get(item.product_id) || 0  // 精確數量
} else {
  itemLoss = Math.floor(item.quantity * lossRatio) // 按比例
}
```

**影響**: 使用者填寫的詳細毀損資料正確生效，提高庫存準確度

**修改檔案**:
- `webapp/src/app/api/purchases/[id]/receive/route.ts:43,121-173`

---

## 🔴 關鍵問題 (Critical) - 待處理

### 1. 雙重庫存追蹤導致數據不一致 ⚠️ **架構級問題**

**位置**: 32 個檔案，212 處相關代碼

**問題**: 同時維護 `ProductVariant.stock_quantity` 和 `Inventory` 表，但更新邏輯不一致

**影響範圍統計**:
- 🔴 後端 API：18 個路由檔案
- 🟡 前端組件：9 個組件
- 🟢 型別定義：3 個型別檔
- ⚪ 測試檔案：2 個測試

**關鍵受影響 API**:
- `purchases/[id]/receive` - 收貨（已雙寫）
- `sales/[id]/ship` - 出貨（已使用 Inventory）
- `inventory/adjustments` - 庫存調整
- `products/search` - 產品查詢
- `dashboard/route` - Dashboard 統計

**後果**:
- ProductVariant 顯示庫存與 Inventory 實際庫存不同步
- 報表和查詢可能使用不同數據源導致結果矛盾
- 庫存調撥、盒損轉換可能基於錯誤數據

**修復方案** (詳見下方「問題 #1 詳細修復計劃」):
- **方案 C（務實，1週）**: 僅修核心 API + 基本測試
- **方案 A（完整，2週）**: 完整重構 + 充分測試 + 保留舊欄位
- **方案 B（激進，3週）**: 完整重構 + 移除舊欄位 + 資料遷移

**建議策略**: 先執行方案 C（1週快速改善），再視情況執行方案 A（1-1.5週完善）

---

## ⚠️ 中等問題 (Medium) - 待處理

### 7. Backorders 頁面的 Resolve API 可能超時
**位置**: `webapp/src/app/sales/backorders/page.tsx:180-200`

**問題**: 前端調用 `/api/backorders/[id]/resolve` 後立即刷新，但 API 內部執行複雜的庫存預留和訂單更新，可能導致競態條件

**建議**: 使用樂觀更新或輪詢機制確認操作完成

---

## 🟡 程式碼清理建議 (Code Cleanup)

### 8. 未使用的組件

| 組件名稱 | 路徑 | 狀態 | 建議 |
|---------|------|------|------|
| StockAdjustmentModal | `webapp/src/components/inventory/StockAdjustmentModal.tsx` | ❌ 無引用 | 刪除或整合 |
| AllocationModal | `webapp/src/components/sales/AllocationModal.tsx` | ❌ 無引用 | 刪除或使用 |
| DamageReportCard | `webapp/src/components/dashboard/DamageReportCard.tsx` | ⚠️ 僅測試頁使用 | 評估保留必要性 |

---

### 9. 測試頁面應移除

| 頁面路徑 | 說明 | 建議 |
|---------|------|------|
| `webapp/src/app/test/page.tsx` | 通用測試頁 | 生產環境應刪除 |
| `webapp/src/app/test-charts/page.tsx` | 圖表測試頁 | 移至 storybook 或刪除 |
| `webapp/src/app/design-demo/page.tsx` | 設計展示頁 | 移至文檔或刪除 |

---

### 10. 備份檔案未清理

```
webapp/src/app/api/purchases/[id]/receive/route.ts.bak (215 KB)
webapp/src/app/api/sales/convert-logic.ts.backup (180 KB)
```

**建議**: 使用 Git 版本控制，刪除 `.bak` 和 `.backup` 檔案

---

### 11. 已廢棄欄位仍在使用

**ProductVariant.stock_quantity** - 已決定使用 Inventory 表作為唯一庫存來源，但仍有查詢使用此欄位：

- `webapp/src/app/api/products/low-stock/route.ts:35` - 低庫存警報
- `webapp/src/components/products/ProductCard.tsx:80` - 產品卡片顯示
- `webapp/src/app/api/reports/inventory-summary/route.ts:120` - 庫存報表

**Sale.converted_at / converted_by** - 新增欄位但部分轉換邏輯未填寫：
- `webapp/src/app/api/sales/[id]/convert-to-confirmed/route.ts:156` - ✅ 已填寫
- `webapp/src/lib/preorder-auto-convert.ts:155` - ✅ 已填寫
- `webapp/src/app/api/sales/manual-confirm/route.ts:90` - ❌ 缺少

---

## 🔍 Schema 一致性問題

### 12. TypeScript 型別定義缺失

**缺少的 Enum 定義**:
```typescript
// Schema 有定義但 TypeScript 未匯出
enum BackorderStatus {
  PENDING
  RESOLVED
  CANCELLED
}

enum AllocationStrategy {
  PROPORTIONAL
  PRIORITY
  FCFS
}
```

**建議**: 在 `webapp/src/types/inventory.ts` 中補充這些型別定義

---

### 13. 外鍵級聯刪除策略不一致

| 關係 | 當前策略 | 風險 |
|-----|---------|------|
| Sale → Customer | Cascade | ✅ 合理 |
| SaleItem → Sale | Cascade | ✅ 合理 |
| Inventory → Variant | **Restrict** | ⚠️ 刪除變體會失敗 |
| PurchaseItem → Purchase | Cascade | ✅ 合理 |
| Backorder → Variant | **SetNull** | ⚠️ 資料完整性問題 |

**建議**: 統一級聯策略，Inventory → Variant 應改為 Cascade，Backorder → Variant 應改為 Restrict

---

## 📊 統計摘要

- **關鍵問題**: 4 個 → **已修復 2 個** ✅
- **中等問題**: 3 個 → **已修復 2 個** ✅
- **程式碼清理**: 4 項（技術債）
- **Schema 問題**: 2 個（型別安全）

**總計**: 13 個問題 → **已修復 5 個（38%）**

---

## 🎯 修復優先級建議

### P0 - 立即處理（本週內） - 3/3 已完成 ✅
1. ✅ **已修復** - 修正 `customer_level` → `tier` 欄位錯誤（#2）
2. ✅ **已修復** - Admin cancel 釋放 Inventory.reserved（#3）
3. ✅ **已驗證** - 確認 BACKORDER 邏輯正確性（#4）

### P1 - 高優先級（建議：先執行方案C 1週，再執行方案A 1-1.5週）
4. 🔄 **進行中** - 雙重庫存統一（#1）- 詳見下方計劃
5. 補充缺失的 TypeScript 型別定義（#12）

### P2 - 中優先級（一個月內）
7. 統一外鍵級聯策略（#13）
8. 清理測試頁面和備份檔案（#9, #10）

### P3 - 低優先級（技術債）
9. 清理未使用組件（#8 - 已排除 AllocationModal）
10. 遷移所有 stock_quantity 引用至 Inventory 表（#11）

---

## 📅 問題 #1 詳細修復計劃

### 🎯 核心目標
將系統的庫存數據源從「雙軌制」（ProductVariant + Inventory）統一為「單軌制」（僅 Inventory）

---

### 方案比較

| 方案 | 工作天數 | 實際日曆 | 說明 | 建議 |
|------|---------|---------|------|------|
| **C（務實）** | **4-5 天** | **1 週** | 僅修核心 API + 基本測試 | ⭐ **第一階段執行** |
| **A（完整）** | **8-10 天** | **2 週** | 完整重構 + 充分測試 + 保留舊欄位 | ⭐ **第二階段執行** |
| **B（激進）** | **10-13 天** | **2.5-3 週** | 完整重構 + 移除舊欄位 + 資料遷移 | 不建議（風險高） |

**推薦策略**: **先 C 後 A** 🎯

**理由**:
1. ✅ 快速看到改善效果（1週內核心問題解決）
2. ✅ 降低一次性大改的風險
3. ✅ 中間可以發現更多問題
4. ✅ 不會阻塞其他功能開發
5. ✅ 目前是假資料環境，可以放心實驗

---

### 方案 C（務實，1週）- 第一階段

#### 目標
修復核心庫存操作，確保關鍵流程使用 Inventory 表

#### 工作清單

**Day 1（0.5天）- 準備階段**
- [ ] 建立 `getVariantInventorySummary(variantId)` helper 函數
- [ ] 建立 `getProductInventorySummary(productId)` helper 函數
- [ ] 設計測試案例清單

**Day 2-3（2天）- 核心 API 重構**
1. [ ] **產品查詢 APIs**（0.5天）
   - `products/route.ts` - 產品列表
   - `products/search/route.ts` - 產品搜尋
   - 改用 Inventory 匯總數據

2. [ ] **庫存調整 API**（0.5天）
   - `inventory/adjustments/route.ts`
   - 確保只操作 Inventory 表

3. [ ] **Dashboard API**（0.5天）
   - `dashboard/route.ts`
   - 統計改用 Inventory 數據

4. [ ] **其他關鍵查詢**（0.5天）
   - 低庫存警報
   - 庫存報表

**Day 4（1天）- 前端組件更新**
1. [ ] **產品搜尋組件**（0.3天）
   - `ProductSearchSelect.tsx`
   - 顯示 Inventory 匯總庫存

2. [ ] **產品列表頁**（0.3天）
   - `products/page.tsx`
   - 顯示正確庫存數據

3. [ ] **變體列表組件**（0.4天）
   - `VariantListView.tsx`
   - 改用 Inventory 庫存

**Day 5（0.5天）- 測試**
- [ ] 手動測試關鍵流程
- [ ] 驗證數據一致性
- [ ] 修復發現的問題

**輸出**:
- ✅ 核心查詢使用 Inventory 表
- ✅ ProductVariant 欄位保留（向後兼容）
- ✅ 系統可正常運行

---

### 方案 A（完整，2週）- 第二階段

#### 目標
徹底統一庫存系統，處理所有邊緣案例

#### 工作清單（在方案 C 基礎上繼續）

**Week 2 - Day 1-2（2天）- 邊緣 API 重構**
1. [ ] **調撥 API**（0.5天）
   - `stock-transfers/route.ts`

2. [ ] **變體管理 APIs**（0.5天）
   - `products/[id]/variants/route.ts`
   - `products/[id]/variants/[variantId]/route.ts`

3. [ ] **複製/快速新增**（0.5天）
   - `products/[id]/duplicate/route.ts`
   - `products/quick-add/route.ts`

4. [ ] **撤銷收貨**（0.5天）
   - `purchases/[id]/undo-receive/route.ts`

**Week 2 - Day 3（1天）- 前端組件完善**
1. [ ] **庫存管理組件**
   - `InventoryAdjustmentModal.tsx`
   - `StockTransferModal.tsx`
   - `inventory/page.tsx`

2. [ ] **銷售/進貨組件**
   - `SaleOrderModal.tsx`
   - `PurchaseOrderModal.tsx`

**Week 2 - Day 4（1天）- 型別與清理**
- [ ] 更新 TypeScript 型別定義
- [ ] 在 Schema 中標記欄位為 `@deprecated`
- [ ] 更新測試檔案
- [ ] 添加 JSDoc 註解說明

**Week 2 - Day 5-6（2天）- 完整測試**
- [ ] 單元測試（每個修改的 API）
- [ ] 整合測試（端到端業務流程）
  - 進貨 → 收貨 → 庫存顯示
  - 銷售 → 確認 → 出貨 → 庫存扣減
  - 預購 → 轉換 → 出貨
  - 盒損轉換 → 庫存調整
- [ ] 回歸測試（確保沒破壞功能）
- [ ] 數據一致性驗證腳本

**輸出**:
- ✅ 所有 API 使用 Inventory 表
- ✅ ProductVariant 欄位標記為 deprecated
- ✅ 完整測試覆蓋
- ✅ 文檔更新

---

### 可選：方案 B 補充（資料庫遷移）

**僅在方案 A 完成且運行穩定後考慮**

**額外時間**: +0.5-1天

**工作內容**:
1. [ ] 寫 Prisma migration 移除欄位
   ```prisma
   model ProductVariant {
     // 移除以下欄位：
     // stock_quantity
     // reserved_stock
     // available_stock
   }
   ```
2. [ ] 完整備份數據
3. [ ] 在測試環境執行遷移
4. [ ] 驗證所有功能
5. [ ] 生產環境遷移

**風險**: 不可逆，建議至少穩定運行 1 個月後再考慮

---

## 📈 執行建議時程

```
Week 1: 方案 C（核心修復）
├─ Day 1: 準備 + Helper 函數
├─ Day 2-3: API 重構
├─ Day 4: 前端更新
└─ Day 5: 測試

中場休息（1-2週）: 開發其他功能，觀察運行狀況

Week 2-3: 方案 A（完整優化）
├─ Day 1-2: 邊緣 API
├─ Day 3: 前端完善
├─ Day 4: 型別清理
└─ Day 5-6: 完整測試

未來（穩定後）: 方案 B（資料庫遷移）- 可選
```

---

## 🔧 技術實施細節

### Helper 函數設計

```typescript
// webapp/src/lib/inventory-helpers.ts

/**
 * 匯總變體在所有倉庫的庫存
 */
export async function getVariantInventorySummary(
  tx: PrismaTransaction,
  variantId: string
) {
  const inventories = await tx.inventory.findMany({
    where: { variant_id: variantId }
  })

  return {
    total_quantity: inventories.reduce((sum, inv) => sum + inv.quantity, 0),
    available: inventories.reduce((sum, inv) => sum + inv.available, 0),
    reserved: inventories.reduce((sum, inv) => sum + inv.reserved, 0),
    by_warehouse: {
      COMPANY: inventories
        .filter(inv => inv.warehouse === 'COMPANY')
        .reduce((sum, inv) => sum + inv.quantity, 0),
      PRIVATE: inventories
        .filter(inv => inv.warehouse === 'PRIVATE')
        .reduce((sum, inv) => sum + inv.quantity, 0)
    }
  }
}

/**
 * 匯總產品（所有變體）的庫存
 */
export async function getProductInventorySummary(
  tx: PrismaTransaction,
  productId: string
) {
  const variants = await tx.productVariant.findMany({
    where: { product_id: productId },
    include: { inventory: true }
  })

  const allInventories = variants.flatMap(v => v.inventory)

  return {
    total_quantity: allInventories.reduce((sum, inv) => sum + inv.quantity, 0),
    available: allInventories.reduce((sum, inv) => sum + inv.available, 0),
    reserved: allInventories.reduce((sum, inv) => sum + inv.reserved, 0),
    variant_count: variants.length
  }
}
```

---

## 📝 備註

- 本報告基於靜態代碼分析和業務邏輯審查
- 未包含性能測試、安全掃描、單元測試覆蓋率
- 建議在修復前建立完整的測試案例
- 所有修改應在開發環境充分測試後再部署
- **目前系統使用假資料，可以放心進行架構級重構**

---

## 📅 更新記錄

- **2025-10-04**: 初始報告生成，發現 13 個問題
- **2025-10-04**: 修復問題 #2（欄位錯誤）、#3（庫存釋放）、驗證 #4（BACKORDER 邏輯）
- **2025-10-04**: 新增問題 #1 詳細修復計劃（方案 C + A）
- **2025-10-04**: 修復問題 #5（AllocationModal 整合）、#6（item_damages 處理）

**報告完成時間**: 2025-10-04
**修復進度**: 6/13 (46%)
**下次檢查建議**: 方案 C 執行後
