-- =========================================
-- Phase 1: 系統架構重構 - 資料庫 Schema 設計
-- 日期: 2025-10-01
-- 目的: 實作三層價格架構、雙倉庫系統、品號調撥、進貨結算機制
-- =========================================

-- ========== 1. 新增 Warehouse Enum ==========
CREATE TYPE "Warehouse" AS ENUM ('COMPANY', 'PRIVATE');

-- ========== 2. 修改 ProductVariant 表 ==========

-- 2.1 移除舊的 unique constraint (允許多個相同 variant_type)
ALTER TABLE "product_variants" DROP CONSTRAINT IF EXISTS "product_variants_product_id_variant_type_key";

-- 2.2 新增三層價格架構欄位
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "investor_price" DOUBLE PRECISION;
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "actual_price" DOUBLE PRECISION;

-- 2.3 新增倉庫標記
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "warehouse" "Warehouse" NOT NULL DEFAULT 'COMPANY';

-- 2.4 新增停用機制
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

-- 2.5 更新現有資料的價格架構（資料遷移）
UPDATE "product_variants" SET
  "investor_price" = "current_price",  -- 投資方價格預設為當前價格
  "actual_price" = "current_price"     -- 實際價格預設為當前價格
WHERE "investor_price" IS NULL;

-- 2.6 設定 NOT NULL constraint（資料遷移後）
ALTER TABLE "product_variants" ALTER COLUMN "investor_price" SET NOT NULL;
ALTER TABLE "product_variants" ALTER COLUMN "actual_price" SET NOT NULL;

-- 2.7 移除舊的 base_price 欄位（保留 current_price 作為顯示用）
-- 注意：先確認沒有其他程式碼依賴 base_price
-- ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "base_price";

-- ========== 3. 修改 Product 表 ==========

-- 3.1 新增三層價格架構
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "investor_price" DOUBLE PRECISION;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "actual_price" DOUBLE PRECISION;

-- 3.2 更新現有資料
UPDATE "products" SET
  "investor_price" = "current_price",
  "actual_price" = "current_price"
WHERE "investor_price" IS NULL;

-- 3.3 設定 NOT NULL
ALTER TABLE "products" ALTER COLUMN "investor_price" SET NOT NULL;
ALTER TABLE "products" ALTER COLUMN "actual_price" SET NOT NULL;

-- ========== 4. 新增 StockTransfer 表 (品號調撥) ==========
CREATE TABLE IF NOT EXISTS "stock_transfers" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "transfer_number" TEXT NOT NULL UNIQUE,

  -- 來源變體
  "source_variant_id" TEXT NOT NULL,
  "source_variant_code" TEXT NOT NULL,

  -- 目標變體
  "target_variant_id" TEXT NOT NULL,
  "target_variant_code" TEXT NOT NULL,

  -- 調撥數量
  "quantity" INTEGER NOT NULL,

  -- 成本繼承
  "unit_cost" DOUBLE PRECISION NOT NULL,
  "total_cost" DOUBLE PRECISION NOT NULL,

  -- 調撥原因
  "reason" TEXT NOT NULL, -- 'DAMAGED', 'REPACKAGE', 'OTHER'
  "notes" TEXT,

  -- 審計欄位
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  -- 外鍵
  CONSTRAINT "fk_stock_transfer_source" FOREIGN KEY ("source_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_stock_transfer_target" FOREIGN KEY ("target_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_stock_transfer_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id")
);

-- 索引優化
CREATE INDEX "idx_stock_transfers_source" ON "stock_transfers"("source_variant_id");
CREATE INDEX "idx_stock_transfers_target" ON "stock_transfers"("target_variant_id");
CREATE INDEX "idx_stock_transfers_created_at" ON "stock_transfers"("created_at");

-- ========== 5. 新增 Import 表 (重新設計進貨單) ==========
CREATE TABLE IF NOT EXISTS "imports" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "import_number" TEXT NOT NULL UNIQUE,

  -- 關聯採購單
  "purchase_id" TEXT,
  "purchase_number" TEXT,

  -- 進貨類型
  "import_type" TEXT NOT NULL DEFAULT 'COMPANY', -- 'COMPANY', 'PRIVATE'
  "warehouse" "Warehouse" NOT NULL DEFAULT 'COMPANY',

  -- 供應商資訊
  "supplier" TEXT NOT NULL,

  -- 幣別與匯率
  "currency" TEXT NOT NULL DEFAULT 'JPY',
  "exchange_rate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

  -- 報關資訊
  "declaration_number" TEXT,
  "declaration_date" TIMESTAMP(3),
  "customs_date" TIMESTAMP(3),

  -- 海關抽驗
  "customs_seized" BOOLEAN NOT NULL DEFAULT false,
  "seized_quantity" INTEGER DEFAULT 0,

  -- 商品總價（未稅）
  "goods_total" DOUBLE PRECISION NOT NULL,

  -- 關稅（個別計算）
  "tariff_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,

  -- 費用總額（待後續加入）
  "additional_costs_total" DOUBLE PRECISION NOT NULL DEFAULT 0,

  -- 最終總成本
  "final_total_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,

  -- 結算狀態
  "is_finalized" BOOLEAN NOT NULL DEFAULT false,
  "finalized_at" TIMESTAMP(3),
  "finalized_by" TEXT,

  -- 進貨狀態
  "status" TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'IN_TRANSIT', 'CUSTOMS', 'RECEIVED', 'FINALIZED'

  -- 備註
  "notes" TEXT,

  -- 審計欄位
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  -- 外鍵
  CONSTRAINT "fk_import_purchase" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_import_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id"),
  CONSTRAINT "fk_import_finalizer" FOREIGN KEY ("finalized_by") REFERENCES "users"("id")
);

CREATE INDEX "idx_imports_purchase" ON "imports"("purchase_id");
CREATE INDEX "idx_imports_warehouse" ON "imports"("warehouse");
CREATE INDEX "idx_imports_status" ON "imports"("status");
CREATE INDEX "idx_imports_created_at" ON "imports"("created_at");

-- ========== 6. 新增 ImportItem 表 (進貨明細) ==========
CREATE TABLE IF NOT EXISTS "import_items" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "import_id" TEXT NOT NULL,

  -- 商品資訊
  "variant_id" TEXT NOT NULL,
  "variant_code" TEXT NOT NULL,
  "product_name" TEXT NOT NULL,

  -- 數量
  "ordered_quantity" INTEGER NOT NULL,
  "received_quantity" INTEGER NOT NULL,
  "damaged_quantity" INTEGER NOT NULL DEFAULT 0,

  -- 單價與小計
  "unit_price" DOUBLE PRECISION NOT NULL,
  "subtotal" DOUBLE PRECISION NOT NULL,

  -- 關稅（個別商品）
  "tariff_rate" DOUBLE PRECISION,
  "tariff_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,

  -- 分攤後費用
  "allocated_costs" DOUBLE PRECISION NOT NULL DEFAULT 0,

  -- 最終單位成本
  "final_unit_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,

  -- 審計欄位
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  -- 外鍵
  CONSTRAINT "fk_import_item_import" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_import_item_variant" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT
);

CREATE INDEX "idx_import_items_import" ON "import_items"("import_id");
CREATE INDEX "idx_import_items_variant" ON "import_items"("variant_id");

-- ========== 7. 新增 ImportCost 表 (進貨費用池) ==========
CREATE TABLE IF NOT EXISTS "import_costs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "import_id" TEXT NOT NULL,

  -- 費用類型
  "cost_type" TEXT NOT NULL, -- 'INSPECTION', 'CUSTOMS_FEE', 'SHIPPING', 'STORAGE', 'OTHER'
  "cost_name" TEXT NOT NULL,

  -- 金額
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TWD',

  -- 分攤方式
  "allocation_method" TEXT NOT NULL DEFAULT 'BY_AMOUNT', -- 'BY_AMOUNT', 'BY_QUANTITY', 'INDIVIDUAL'

  -- 發票/單據資訊
  "invoice_number" TEXT,
  "invoice_date" TIMESTAMP(3),

  -- 付款狀態
  "is_paid" BOOLEAN NOT NULL DEFAULT false,
  "paid_at" TIMESTAMP(3),

  -- 備註
  "notes" TEXT,

  -- 審計欄位
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  -- 外鍵
  CONSTRAINT "fk_import_cost_import" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_import_cost_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id")
);

CREATE INDEX "idx_import_costs_import" ON "import_costs"("import_id");
CREATE INDEX "idx_import_costs_type" ON "import_costs"("cost_type");
CREATE INDEX "idx_import_costs_paid" ON "import_costs"("is_paid");

-- ========== 8. 修改 SaleItem 表 (新增成本與利潤欄位) ==========
ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "cost_price" DOUBLE PRECISION;
ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "profit" DOUBLE PRECISION;
ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "import_id" TEXT;

-- 外鍵關聯
ALTER TABLE "sale_items" ADD CONSTRAINT "fk_sale_item_import"
  FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE SET NULL;

CREATE INDEX "idx_sale_items_import" ON "sale_items"("import_id");

-- ========== 9. 新增 CostAdjustmentLog 表 (成本調整歷史) ==========
CREATE TABLE IF NOT EXISTS "cost_adjustment_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "import_id" TEXT NOT NULL,

  -- 調整資訊
  "adjustment_type" TEXT NOT NULL, -- 'FINALIZE', 'MANUAL'
  "old_cost" DOUBLE PRECISION NOT NULL,
  "new_cost" DOUBLE PRECISION NOT NULL,
  "cost_diff" DOUBLE PRECISION NOT NULL,

  -- 影響範圍
  "affected_sales_count" INTEGER NOT NULL DEFAULT 0,
  "total_adjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,

  -- 說明
  "reason" TEXT,

  -- 審計欄位
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 外鍵
  CONSTRAINT "fk_cost_adjustment_import" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_cost_adjustment_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id")
);

CREATE INDEX "idx_cost_adjustment_logs_import" ON "cost_adjustment_logs"("import_id");
CREATE INDEX "idx_cost_adjustment_logs_created_at" ON "cost_adjustment_logs"("created_at");

-- ========== 10. 新增 Notification 表 (通知系統) ==========
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT NOT NULL PRIMARY KEY,

  -- 通知類型
  "type" TEXT NOT NULL, -- 'IMPORT_FINALIZED', 'STOCK_LOW', 'PAYMENT_DUE', 'SHIPMENT_REMINDER', 'PRICE_ALERT'

  -- 通知內容
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "link" TEXT,

  -- 接收者
  "recipient_id" TEXT NOT NULL,
  "recipient_role" "Role",

  -- 優先級
  "priority" TEXT NOT NULL DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'URGENT'

  -- 閱讀狀態
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "read_at" TIMESTAMP(3),

  -- 相關資源
  "resource_type" TEXT,
  "resource_id" TEXT,

  -- 審計欄位
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3),

  -- 外鍵
  CONSTRAINT "fk_notification_recipient" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_notifications_recipient" ON "notifications"("recipient_id");
CREATE INDEX "idx_notifications_is_read" ON "notifications"("is_read");
CREATE INDEX "idx_notifications_created_at" ON "notifications"("created_at");
CREATE INDEX "idx_notifications_type" ON "notifications"("type");

-- ========== 11. 新增 InventoryMovement 的倉庫欄位 ==========
ALTER TABLE "inventory_movements" ADD COLUMN IF NOT EXISTS "warehouse" "Warehouse" NOT NULL DEFAULT 'COMPANY';
CREATE INDEX "idx_inventory_movements_warehouse" ON "inventory_movements"("warehouse");

-- ========== 完成 ==========
-- Migration 完成！下一步：更新 Prisma Schema 檔案
