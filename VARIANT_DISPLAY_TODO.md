# 變體顯示修復 TODO

## ✅ 已完成

### 1. 後端修復
- [x] PurchaseItem schema 加入 variant_id
- [x] Import v2 系統完整實作
- [x] Inventory API 啟用
- [x] Purchase API 返回 variant 資訊

### 2. 前端修復
- [x] 採購管理：採購明細顯示變體代碼（P0001-001）

---

## ⏳ 待修復

### 3. 進貨管理頁面
**檔案**: `webapp/src/app/imports/page.tsx`

**問題**: 進貨明細沒有顯示變體代碼

**修復方案**:
```typescript
// 修改進貨明細表格欄位
{
  title: '商品名稱',
  render: (record) => (
    <div>
      <div>{record.product_name}</div>
      {record.variant_code && (
        <div style={{ color: '#1890ff', fontSize: '12px' }}>
          變體：{record.variant_code}
        </div>
      )}
    </div>
  )
}
```

**後端 API**: 確認 `/api/imports` 和 `/api/imports-v2` 返回 variant_code

---

### 4. 庫存管理頁面
**檔案**: `webapp/src/app/inventory/page.tsx`

**問題**: 只顯示商品總庫存，沒有顯示各變體的庫存明細

**修復方案**:
```typescript
// 方案 A: 在表格中加入展開功能，顯示變體列表
expandable={{
  expandedRowRender: (product) => (
    <Table
      dataSource={product.variants}
      columns={[
        { title: '變體代碼', dataIndex: 'variant_code' },
        { title: '規格', dataIndex: 'description' },
        { title: '公司倉庫存', render: (v) => getInventory(v, 'COMPANY') },
        { title: '個人倉庫存', render: (v) => getInventory(v, 'PRIVATE') }
      ]}
    />
  )
}}

// 方案 B: 改成變體維度的庫存表（推薦）
// 每一行顯示一個變體，合併同商品的變體
```

---

### 5. 銷售管理頁面
**檔案**: `webapp/src/app/sales/page.tsx`

**問題 1**: 版面跑版
**問題 2**: 庫存檢查失敗

**修復方案**:

#### 5.1 修復庫存檢查邏輯
**檔案**: `webapp/src/app/api/sales/route.ts`

```typescript
// 目前可能檢查的是 ProductVariant.stock_quantity (deprecated)
// 應該改成查詢 Inventory 表

for (const item of items) {
  const inventory = await prisma.inventory.findFirst({
    where: {
      variant_id: item.variant_id,
      warehouse: sale.warehouse // COMPANY 或 PRIVATE
    }
  })

  if (!inventory || inventory.available < item.quantity) {
    throw new Error(`${item.product_name} 庫存不足`)
  }
}
```

#### 5.2 修復版面問題
- 檢查表格欄位寬度
- 確認沒有過長的文字溢出
- 調整 Modal 寬度

---

## 測試清單

### 完整流程測試

1. **創建採購單**
   - [ ] 選擇商品和變體（P0001-001）
   - [ ] 採購明細顯示變體代碼
   - [ ] 儲存成功

2. **創建進貨單**
   - [ ] 從採購單創建進貨單
   - [ ] 進貨明細顯示變體代碼
   - [ ] 使用 imports-v2 API

3. **執行收貨**
   - [ ] 進貨管理點選收貨
   - [ ] 庫存更新成功
   - [ ] InventoryMovement 記錄正確

4. **檢查庫存**
   - [ ] 庫存管理顯示庫存數量
   - [ ] 可以看到各變體的庫存明細
   - [ ] 公司倉/個人倉分開顯示

5. **創建銷售單**
   - [ ] 選擇變體
   - [ ] 庫存檢查通過
   - [ ] 扣減庫存成功
   - [ ] 版面正常顯示

---

## 額外優化建議

### 1. 前端 UI 改善
- 變體選擇器：下拉選單顯示庫存數量
- 庫存預警：低於安全庫存時紅色顯示
- 快速篩選：按變體代碼搜尋

### 2. 後端優化
- 庫存快取：減少資料庫查詢
- 庫存鎖定：防止超賣
- 批次操作：支援批次入庫/出庫

### 3. 報表功能
- 變體銷售排行
- 變體庫存週轉率
- 變體利潤分析

---

**最後更新**: 2025-10-06
**負責人**: Claude Code
