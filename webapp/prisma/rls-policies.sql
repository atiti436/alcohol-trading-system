-- 🔒 PostgreSQL Row Level Security (RLS) 政策
-- 確保投資方數據隔離的資料庫層級保護

-- =====================================================
-- Sales 表格 RLS 政策 (最重要 - 雙重價格保護)
-- =====================================================

-- 啟用 Sales 表格的 RLS
ALTER TABLE "sales" ENABLE ROW LEVEL SECURITY;

-- 投資方只能看到投資項目的調整後資料
CREATE POLICY "policy_sales_investor" ON "sales"
  FOR SELECT USING (
    -- 檢查當前使用者角色
    current_setting('app.user_role', true) = 'INVESTOR' AND
    -- 只能看到投資項目
    "funding_source" = 'COMPANY' AND
    -- 確保投資方ID匹配 (如果有設定)
    (current_setting('app.investor_id', true) IS NULL OR
     current_setting('app.investor_id', true) = '')
  );

-- 超級管理員可以看到所有資料
CREATE POLICY "policy_sales_super_admin" ON "sales"
  FOR ALL USING (
    current_setting('app.user_role', true) = 'SUPER_ADMIN'
  );

-- 員工只能看到基本銷售資料，不含財務細節
CREATE POLICY "policy_sales_employee" ON "sales"
  FOR SELECT USING (
    current_setting('app.user_role', true) = 'EMPLOYEE'
  );

-- =====================================================
-- Purchase 表格 RLS 政策
-- =====================================================

ALTER TABLE "purchases" ENABLE ROW LEVEL SECURITY;

-- 投資方只能看到投資項目的採購
CREATE POLICY "policy_purchases_investor" ON "purchases"
  FOR SELECT USING (
    current_setting('app.user_role', true) = 'INVESTOR' AND
    "funding_source" = 'COMPANY'
  );

-- 超級管理員可以看到所有採購
CREATE POLICY "policy_purchases_super_admin" ON "purchases"
  FOR ALL USING (
    current_setting('app.user_role', true) = 'SUPER_ADMIN'
  );

-- 員工可以看到所有採購進行操作
CREATE POLICY "policy_purchases_employee" ON "purchases"
  FOR ALL USING (
    current_setting('app.user_role', true) IN ('EMPLOYEE', 'SUPER_ADMIN')
  );

-- =====================================================
-- SaleItem 表格 RLS 政策 (保護實際價格)
-- =====================================================

ALTER TABLE "sale_items" ENABLE ROW LEVEL SECURITY;

-- 為投資方建立視圖級別的保護
-- 透過應用層確保 actualUnitPrice 和 actualTotalPrice 永不暴露

CREATE POLICY "policy_sale_items_investor" ON "sale_items"
  FOR SELECT USING (
    current_setting('app.user_role', true) = 'INVESTOR' AND
    EXISTS (
      SELECT 1 FROM "sales" s
      WHERE s.id = "sale_id" AND s."funding_source" = 'COMPANY'
    )
  );

CREATE POLICY "policy_sale_items_super_admin" ON "sale_items"
  FOR ALL USING (
    current_setting('app.user_role', true) = 'SUPER_ADMIN'
  );

CREATE POLICY "policy_sale_items_employee" ON "sale_items"
  FOR SELECT USING (
    current_setting('app.user_role', true) = 'EMPLOYEE'
  );

-- =====================================================
-- Users 表格 RLS 政策 (使用者管理保護)
-- =====================================================

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- 使用者只能看到自己的資料
CREATE POLICY "policy_users_self" ON "users"
  FOR SELECT USING (
    "email" = current_setting('app.user_email', true)
  );

-- 使用者只能更新自己的基本資料
CREATE POLICY "policy_users_self_update" ON "users"
  FOR UPDATE USING (
    "email" = current_setting('app.user_email', true)
  ) WITH CHECK (
    -- 不允許修改角色和敏感欄位
    "role" = OLD."role" AND
    "investor_id" = OLD."investor_id" AND
    "is_active" = OLD."is_active"
  );

-- 超級管理員可以管理所有使用者
CREATE POLICY "policy_users_super_admin" ON "users"
  FOR ALL USING (
    current_setting('app.user_role', true) = 'SUPER_ADMIN'
  );

-- =====================================================
-- 敏感欄位保護函數
-- =====================================================

-- 建立函數來設定會話變數 (由應用層呼叫)
CREATE OR REPLACE FUNCTION set_user_context(
  user_role TEXT,
  user_email TEXT,
  investor_id TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.user_role', user_role, true);
  PERFORM set_config('app.user_email', user_email, true);
  IF investor_id IS NOT NULL THEN
    PERFORM set_config('app.investor_id', investor_id, true);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 審計日誌觸發器
-- =====================================================

-- 建立審計日誌表
CREATE TABLE IF NOT EXISTS "audit_logs" (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(50) NOT NULL,
  operation VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE, SELECT
  user_email VARCHAR(255),
  user_role VARCHAR(20),
  record_id VARCHAR(255),
  sensitive_fields JSONB, -- 記錄存取的敏感欄位
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address INET
);

-- 建立審計觸發器函數
CREATE OR REPLACE FUNCTION audit_sensitive_access() RETURNS TRIGGER AS $$
BEGIN
  -- 記錄對敏感表格的操作
  IF TG_TABLE_NAME IN ('sales', 'sale_items', 'purchases') THEN
    INSERT INTO audit_logs (
      table_name,
      operation,
      user_email,
      user_role,
      record_id,
      sensitive_fields
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      current_setting('app.user_email', true),
      current_setting('app.user_role', true),
      CASE
        WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT
        ELSE NEW.id::TEXT
      END,
      CASE
        WHEN TG_TABLE_NAME = 'sales' AND current_setting('app.user_role', true) = 'INVESTOR' THEN
          jsonb_build_object('accessed_fields', 'filtered_sales_data')
        WHEN TG_TABLE_NAME = 'sale_items' AND current_setting('app.user_role', true) = 'INVESTOR' THEN
          jsonb_build_object('accessed_fields', 'filtered_sale_items_data')
        ELSE
          jsonb_build_object('accessed_fields', 'full_access')
      END
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 為敏感表格建立審計觸發器
CREATE TRIGGER trigger_audit_sales
  AFTER INSERT OR UPDATE OR DELETE ON "sales"
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_access();

CREATE TRIGGER trigger_audit_sale_items
  AFTER INSERT OR UPDATE OR DELETE ON "sale_items"
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_access();

CREATE TRIGGER trigger_audit_purchases
  AFTER INSERT OR UPDATE OR DELETE ON "purchases"
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_access();

-- =====================================================
-- 檢查和測試查詢
-- =====================================================

-- 測試 RLS 政策的查詢 (開發和測試用)
/*
-- 設定投資方上下文
SELECT set_user_context('INVESTOR', 'investor@example.com', 'inv_001');

-- 測試投資方只能看到投資項目
SELECT id, funding_source, total_amount FROM sales; -- 應該只顯示 COMPANY 項目

-- 設定超級管理員上下文
SELECT set_user_context('SUPER_ADMIN', 'admin@example.com');

-- 測試超級管理員可以看到所有資料
SELECT id, funding_source, total_amount, actual_amount, commission FROM sales;

-- 查看審計日誌
SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10;
*/