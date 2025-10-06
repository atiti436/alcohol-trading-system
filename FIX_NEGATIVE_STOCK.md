# 修復負數庫存問題

## 問題：
刪除採購單後，ProductVariant 出現負數庫存（-10），但 Inventory 是正確的（0）

## 原因：
舊版刪除邏輯錯誤地 decrement 了 ProductVariant.stock_quantity

## 修復方法：

### 方法 1：資料庫直接修正（最快）✅

```sql
-- 1. 找出負數庫存的 variant
SELECT id, variant_code, stock_quantity
FROM product_variants
WHERE stock_quantity < 0;

-- 2. 將負數庫存重設為 0
UPDATE product_variants
SET stock_quantity = 0,
    available_stock = 0
WHERE stock_quantity < 0;
```

### 方法 2：使用 Prisma Studio（GUI 操作）

```bash
cd webapp
npx prisma studio
```

1. 打開 `ProductVariant` 表
2. 找到 `stock_quantity < 0` 的記錄
3. 手動改成 `0`

### 方法 3：寫一個 API 自動修復

建立一個管理員專用 API：`/api/admin/fix-negative-stock`

```typescript
// 找出所有負數庫存並重設為 0
const negativeVariants = await prisma.productVariant.findMany({
  where: { stock_quantity: { lt: 0 } }
})

for (const variant of negativeVariants) {
  await prisma.productVariant.update({
    where: { id: variant.id },
    data: {
      stock_quantity: 0,
      available_stock: 0
    }
  })
}
```

## 驗證：

修復後，訪問 `/admin/db-health` 應該顯示：
- ✅ 沒有負數庫存警告
- ✅ Inventory 總量 = ProductVariant 總量
- ✅ 整體健康狀態：HEALTHY

## 預防：

已修正採購刪除邏輯，未來不會再發生此問題。
