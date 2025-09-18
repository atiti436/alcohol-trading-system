# 🚀 資料庫遷移指南

## 🎯 概述
此次修復涉及大量欄位命名統一化，需要執行資料庫遷移以確保系統正常運作。

## ⚠️ 重要：執行前備份
在執行遷移前，請務必備份現有資料庫！

## 📋 修復的欄位變更清單

### Product模型
```sql
-- 重量相關欄位統一化
ALTER TABLE products RENAME COLUMN weight TO weight_kg;
ALTER TABLE products RENAME COLUMN "packageWeight" TO package_weight_kg;
ALTER TABLE products RENAME COLUMN "totalWeight" TO total_weight_kg;
ALTER TABLE products RENAME COLUMN "hasBox" TO has_box;
ALTER TABLE products RENAME COLUMN "hasAccessories" TO has_accessories;
ALTER TABLE products RENAME COLUMN "accessoryWeight" TO accessory_weight_kg;
ALTER TABLE products RENAME COLUMN "hsCode" TO hs_code;
ALTER TABLE products RENAME COLUMN "manufacturingDate" TO manufacturing_date;
ALTER TABLE products RENAME COLUMN "expiryDate" TO expiry_date;
ALTER TABLE products RENAME COLUMN "standardPrice" TO standard_price;
ALTER TABLE products RENAME COLUMN "currentPrice" TO current_price;
ALTER TABLE products RENAME COLUMN "costPrice" TO cost_price;
ALTER TABLE products RENAME COLUMN "minPrice" TO min_price;
ALTER TABLE products RENAME COLUMN "isActive" TO is_active;
ALTER TABLE products RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE products RENAME COLUMN "updatedAt" TO updated_at;

-- 移除冗餘的code欄位
ALTER TABLE products DROP COLUMN IF EXISTS code;
```

### User模型
```sql
ALTER TABLE users RENAME COLUMN "investorId" TO investor_id;
ALTER TABLE users RENAME COLUMN "isActive" TO is_active;
ALTER TABLE users RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE users RENAME COLUMN "updatedAt" TO updated_at;
```

### Customer模型
```sql
ALTER TABLE customers RENAME COLUMN "paymentTerms" TO payment_terms;
ALTER TABLE customers RENAME COLUMN "requiresInvoice" TO requires_invoice;
ALTER TABLE customers RENAME COLUMN "isActive" TO is_active;
ALTER TABLE customers RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE customers RENAME COLUMN "updatedAt" TO updated_at;
```

## 🛠️ 推薦執行方式

### 方式1: 使用Prisma遷移（推薦）
```bash
cd webapp
npm install
npx prisma migrate dev --name "fix-field-naming-consistency"
npx prisma generate
```

### 方式2: 手動SQL執行
如果Prisma遷移失敗，可以手動執行上述SQL語句。

## 🔍 驗證步驟

### 1. 檢查遷移是否成功
```bash
npx prisma db pull
# 檢查schema.prisma是否與修復後的版本一致
```

### 2. 測試API功能
- 測試產品查詢API: `/api/products`
- 測試庫存API: `/api/inventory`
- 測試銷售API: `/api/sales`
- 測試變體API: `/api/products/[id]/variants`

### 3. 檢查前端功能
- Dashboard頁面是否正常載入
- 產品管理頁面是否正常
- 庫存管理功能是否正常

## 🚨 可能的問題與解決方案

### 問題1: 欄位不存在錯誤
如果出現欄位不存在的錯誤，可能是資料庫中欄位名稱與期望不同。
解決方案：先檢查現有資料庫結構，再調整遷移腳本。

### 問題2: 外鍵約束錯誤
如果有外鍵約束問題，需要先停用約束，修改欄位，再重新啟用。

### 問題3: TypeScript編譯錯誤
遷移完成後需要重新生成Prisma客戶端：
```bash
npx prisma generate
```

## ✅ 完成檢查清單
- [ ] 資料庫已備份
- [ ] 依賴已安裝 (`npm install`)
- [ ] 遷移已執行
- [ ] Prisma客戶端已重新生成
- [ ] API測試通過
- [ ] 前端功能測試通過
- [ ] 錯誤日誌已檢查

## 📞 需要協助
如果遇到問題，請查看錯誤日誌並聯繫螞蟻A進行協助。

---
**建立日期**: 2025-09-19
**建立者**: 螞蟻B
**修復範圍**: 緊急修復 + 高優先級 + 品質提升