# 🏥 系統健康檢查報告

**生成時間**: 2025-10-04
**檢查範圍**: UI-API連接、ERP業務邏輯、多餘程式碼、資料庫Schema一致性

---

## 📋 執行摘要

| 檢查項目 | 狀態 | 關鍵問題數 |
|---------|------|-----------|
| UI-API連接 | ⚠️ 警告 | 2個中等問題 |
| ERP業務邏輯 | 🔴 嚴重 | 9個關鍵問題 |
| 多餘程式碼 | ⚠️ 警告 | 多個待清理項目 |
| Schema一致性 | 🔴 嚴重 | 3個致命錯誤 |

---

## 🔴 關鍵問題 (Critical)

### 1. 雙重庫存追蹤導致數據不一致
**位置**: 多處 API 和業務邏輯
**問題**: 同時維護 `ProductVariant.stock_quantity` 和 `Inventory` 表，但更新邏輯不一致

**影響範圍**:
- `webapp/src/app/api/purchases/[id]/receive/route.ts:150-170` - 收貨時同時更新兩處
- `webapp/src/app/api/sales/[id]/ship/route.ts:120-140` - 出貨時同時扣減兩處
- `webapp/src/app/api/inventory/adjust/route.ts:80-95` - 調整時可能遺漏其中一處

**後果**:
- ProductVariant 顯示庫存與 Inventory 實際庫存不同步
- 報表和查詢可能使用不同數據源導致結果矛盾
- 庫存調撥、盒損轉換可能基於錯誤數據

**建議**: 選擇單一數據源作為真實來源（建議使用 Inventory 表），將 ProductVariant.stock_quantity 設為計算字段或完全棄用

---

### 2. 資料庫欄位不存在錯誤
**位置**: `webapp/src/app/api/customers/route.ts:45`
**問題**: API 嘗試讀取 `customer_level` 欄位，但 Schema 中該欄位名稱為 `tier`

```typescript
// 錯誤代碼
const customers = await prisma.customer.findMany({
  select: {
    customer_level: true  // ❌ 欄位不存在
  }
})

// Schema 定義
model Customer {
  tier String?  // ✅ 正確欄位名稱
}
```

**後果**: API 運行時會拋出 Prisma 錯誤，客戶查詢功能完全失效

**建議**: 將所有 `customer_level` 引用改為 `tier`

---

### 3. Admin 取消訂單未釋放 Inventory.reserved
**位置**: `webapp/src/app/api/sales/[id]/admin-cancel/route.ts:80-110`
**問題**: 管理員強制取消訂單時，只更新 Sale.status，未釋放 Inventory 表的 reserved 庫存

```typescript
// 現有代碼只更新 Sale
await tx.sale.update({
  where: { id },
  data: {
    status: 'CANCELLED',
    cancelled_reason: reason
  }
})
// ❌ 缺少 Inventory.reserved 釋放邏輯
```

**後果**:
- 已取消訂單的庫存永久鎖定在 `reserved` 狀態
- 實際可用庫存（available）低於真實情況
- 影響後續訂單分配和庫存決策

**建議**: 參考 customer-cancel 的邏輯，添加 Inventory 表的 reserved → available 回滾

---

### 4. BACKORDER 補貨可能導致重複預留
**位置**: `webapp/src/app/api/backorders/[id]/resolve/route.ts:95-125`
**問題**: 解決缺貨單時直接扣減 available 並增加 reserved，但未檢查原訂單是否已部分預留

**情境**:
1. 訂單 A 需要 100 件，只預留了 60 件（40 件進入 BACKORDER）
2. 新進貨 50 件後解決 BACKORDER，扣減 40 件 available，增加 40 件 reserved
3. 結果：訂單 A 總共預留了 60 + 40 = 100 件 ✅
4. **但如果訂單 A 已完全預留 100 件，再解決 BACKORDER 會變成 140 件預留** ❌

**建議**: 解決 BACKORDER 前檢查關聯 Sale 的當前預留數量

---

## ⚠️ 中等問題 (Medium)

### 5. AllocationModal 組件創建但完全未使用
**位置**: `webapp/src/components/sales/AllocationModal.tsx` (400+ 行)
**問題**: 完整實現的智能分配對話框，但沒有任何頁面引用或使用

**檢查結果**:
```bash
# 搜尋所有 tsx/ts 文件中的 AllocationModal 引用
grep -r "AllocationModal" webapp/src/app --include="*.tsx" --include="*.ts"
# 結果：0 個引用（除了組件自身）
```

**建議**:
- 選項 1: 在庫存管理頁面集成此組件
- 選項 2: 如果功能已由其他方式實現，刪除此組件避免混淆

---

### 6. ReceiveGoodsModal 發送的 item_damages 未被處理
**位置**:
- 前端: `webapp/src/components/purchases/ReceiveGoodsModal.tsx:280-290`
- 後端: `webapp/src/app/api/purchases/[id]/receive/route.ts`

**問題**: 前端精心設計逐項損毀數量輸入，但後端 API 完全忽略 `item_damages` 參數

```typescript
// 前端發送
const submitData = {
  actual_quantity,
  item_damages: [
    { productId: 'xxx', damagedQuantity: 5 },
    { productId: 'yyy', damagedQuantity: 3 }
  ]
}

// 後端 API
const { actual_quantity, loss_quantity } = await request.json()
// ❌ item_damages 未被讀取或使用
```

**後果**: 用戶填寫的詳細損毀明細被丟棄，只使用總損毀數量

**建議**:
- 選項 1: 實現後端逐項損毀處理邏輯
- 選項 2: 移除前端的逐項輸入功能，簡化為總數輸入

---

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

- **關鍵問題**: 4 個（需立即處理）
- **中等問題**: 3 個（影響用戶體驗）
- **程式碼清理**: 4 項（技術債）
- **Schema 問題**: 2 個（型別安全）

**總計**: 13 個問題

---

## 🎯 優先級建議

### P0 - 立即處理（本週內）
1. ✅ 修正 `customer_level` → `tier` 欄位錯誤（#2）
2. ✅ Admin cancel 釋放 Inventory.reserved（#3）
3. ✅ 決定庫存數據單一來源策略（#1）

### P1 - 高優先級（兩週內）
4. 檢查 BACKORDER 重複預留問題（#4）
5. 實現 item_damages 後端處理或移除前端功能（#6）
6. 補充缺失的 TypeScript 型別定義（#12）

### P2 - 中優先級（一個月內）
7. 決定 AllocationModal 去留（#5）
8. 統一外鍵級聯策略（#13）
9. 清理測試頁面和備份檔案（#9, #10）

### P3 - 低優先級（技術債）
10. 清理未使用組件（#8）
11. 遷移所有 stock_quantity 引用至 Inventory 表（#11）

---

## 📝 備註

- 本報告基於靜態代碼分析和業務邏輯審查
- 未包含性能測試、安全掃描、單元測試覆蓋率
- 建議在修復前建立完整的測試案例
- 所有修改應在開發環境充分測試後再部署

**報告完成時間**: 2025-10-04
**下次檢查建議**: 修復 P0/P1 問題後一週內
