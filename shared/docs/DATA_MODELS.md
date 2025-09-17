# 核心數據模型 (Data Models)

本文件定義系統中核心物件的標準屬性，所有AI開發時必須以此為唯一的欄位命名和格式依據。

## 1. 客戶 (Customer)

| 欄位名稱 (Field Name) | 中文名稱 | 數據類型 | 必填 | 說明 | 範例 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `id` | 系統ID | String | ✅ | UUID，系統內部使用 | `cuid_abc123` |
| `customer_code` | 客戶代碼 | String | ✅ | 唯一識別碼，規則見 ID_DEFINITIONS.md | `C00001` |
| `name` | 客戶名稱 | String | ✅ | 公司或個人名稱 | `滿帆洋行` |
| `contact_person` | 主要聯絡人 | String | | 聯絡窗口姓名 | `王大明` |
| `phone` | 聯絡電話 | String | | 電話號碼 | `0912-345-678` |
| `email` | 電子郵件 | String | | 郵件地址 | `david@example.com` |
| `company` | 公司名稱 | String | | 公司統一編號對應名稱 | `滿帆貿易有限公司` |
| `tax_id` | 統一編號 | String | | 8位數統編 | `12345678` |
| `address` | 地址 | String | | 聯絡地址 | `台北市...` |
| `shipping_address` | 送貨地址 | String | | 收貨地址，可與聯絡地址不同 | `新北市...` |
| `tier` | 客戶分級 | Enum | ✅ | VIP\|REGULAR\|PREMIUM\|NEW | `VIP` |
| `payment_terms` | 付款條件 | Enum | ✅ | CASH\|WEEKLY\|MONTHLY\|SIXTY_DAYS | `MONTHLY` |
| `requires_invoice` | 需要發票 | Boolean | ✅ | 是否需要開立發票 | `true` |
| `credit_limit` | 信用額度 | Number | | 授信額度（台幣） | `100000` |
| `notes` | 備註 | String | | 客戶相關備註 | `VIP客戶，特別關照` |
| `is_active` | 是否啟用 | Boolean | ✅ | 是否在系統中可見可用 | `true` |
| `created_at` | 建立時間 | DateTime | ✅ | 系統自動產生 | `2025-09-16T10:30:00Z` |
| `updated_at` | 更新時間 | DateTime | ✅ | 系統自動更新 | `2025-09-16T10:30:00Z` |

### 1.1 客戶分級說明 (Customer Tier)

| 分級代碼 | 中文名稱 | 折扣策略 | 說明 |
| :--- | :--- | :--- | :--- |
| `VIP` | VIP客戶 | -5% | 最優惠價格，長期合作夥伴 |
| `REGULAR` | 一般客戶 | 標準價 | 標準公版價格 |
| `PREMIUM` | 高價客戶 | +10% | 較高價格，特殊需求客戶 |
| `NEW` | 新客戶 | 公版價 | 新開發客戶，觀察期 |

## 2. 產品 (Product)

| 欄位名稱 (Field Name) | 中文名稱 | 數據類型 | 必填 | 說明 | 範例 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `id` | 系統ID | String | ✅ | UUID，系統內部使用 | `cuid_xyz789` |
| `product_code` | 產品編號 | String | ✅ | 唯一識別碼，規則見 ID_DEFINITIONS.md | `P00001` |
| `name_zh` | 中文品名 | String | ✅ | 繁體中文名稱 | `山崎18年單一麥芽威士忌` |
| `name_en` | 英文品名 | String | | 英文名稱 | `Yamazaki 18 Year Old` |
| `category` | 產品分類 | String | ✅ | 酒類分類 | `威士忌` |
| `brand` | 品牌 | String | | 品牌名稱 | `山崎` |
| `origin` | 產地 | String | | 生產國家/地區 | `日本` |
| `volume_ml` | 容量(ml) | Number | ✅ | 以毫升為單位 | `700` |
| `alc_percentage` | 酒精濃度(%) | Number | ✅ | 酒精度數，不帶百分號 | `43` |
| `weight_kg` | 商品重量(kg) | Number | ✅ | 商品本身含瓶身的重量 | `1.2` |
| `package_weight_kg` | 包裝重量(kg) | Number | | 外盒或額外包裝的重量 | `0.3` |
| `total_weight_kg` | 總重量(kg) | Number | ✅ | 自動計算：商品+包裝重量 | `1.5` |
| `has_box` | 有無外盒 | Boolean | ✅ | 是否有外包裝盒 | `true` |
| `has_accessories` | 有無附件 | Boolean | ✅ | 是否有附件（證書等） | `true` |
| `accessories` | 附件清單 | Array<String> | | 附件項目列表 | `["證書", "特製木盒"]` |
| `accessory_weight_kg` | 附件重量(kg) | Number | | 附件總重量 | `0.2` |
| `hs_code` | 稅則號列 | String | | 海關稅則分類代碼 | `2208.30.10.00` |
| `supplier` | 供應商 | String | | 供應商名稱 | `日本酒商株式會社` |
| `manufacturing_date` | 製造日期 | String | | 生產日期 | `2005-03` |
| `expiry_date` | 保存期限 | String | | 保存到期日 | `無期限` |
| `standard_price` | 標準售價 | Number | ✅ | 公版標準售價（台幣） | `21000` |
| `current_price` | 目前售價 | Number | ✅ | 目前售價，可調整（台幣） | `20000` |
| `min_price` | 最低限價 | Number | ✅ | 最低售價限制（台幣） | `18000` |
| `cost_price` | 平均成本價 | Number | | 加權平均成本（台幣） | `15000` |
| `keywords` | 關鍵字/別名 | Array<String> | | 用於模糊搜尋的各種稱呼 | `["山崎18", "Yamazaki 18", "山崎"]` |
| `description` | 商品描述 | String | | 詳細說明 | `限量版威士忌，口感醇厚...` |
| `image_url` | 商品圖片 | String | | 商品照片URL | `https://...` |
| `is_active` | 是否啟用 | Boolean | ✅ | 是否在系統中可見可售 | `true` |
| `created_at` | 建立時間 | DateTime | ✅ | 系統自動產生 | `2025-09-16T10:30:00Z` |
| `updated_at` | 更新時間 | DateTime | ✅ | 系統自動更新 | `2025-09-16T10:30:00Z` |

### 2.1 酒精度欄位說明

⚠️ **重要統一規範**：
- **統一使用**: `alc_percentage` 
- **棄用欄位**: ~~`abv`~~, ~~`alcoholPercentage`~~
- **資料格式**: 純數字，不含百分號 (如: 43 表示 43%)
- **房間適用**: 所有房間必須統一使用此命名

## 3. 產品變體 (Product Variant)

| 欄位名稱 (Field Name) | 中文名稱 | 數據類型 | 必填 | 說明 | 範例 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `id` | 系統ID | String | ✅ | UUID，系統內部使用 | `cuid_var001` |
| `product_id` | 所屬產品ID | String | ✅ | 關聯的產品ID | `cuid_xyz789` |
| `variant_code` | 變體編號 | String | ✅ | 規則見 ID_DEFINITIONS.md | `P00001-A` |
| `variant_type` | 變體類型 | Enum | ✅ | A\|B\|C\|D\|X | `A` |
| `description` | 變體描述 | String | ✅ | 變體說明 | `一般版` |
| `sku` | SKU編號 | String | ✅ | 庫存單位編號 | `P00001-700-43` |
| `base_price` | 基礎售價 | Number | ✅ | 變體基礎價格 | `21000` |
| `current_price` | 目前售價 | Number | ✅ | 目前售價 | `20000` |
| `discount_rate` | 折扣率 | Number | | 折扣百分比（損傷品用） | `0.8` |
| `cost_price` | 實際成本 | Number | | 此變體的實際成本 | `15000` |
| `stock_quantity` | 庫存數量 | Number | ✅ | 目前庫存量 | `50` |
| `reserved_stock` | 預留庫存 | Number | ✅ | 已預留但未出貨的數量 | `5` |
| `available_stock` | 可售庫存 | Number | ✅ | 自動計算：庫存-預留 | `45` |
| `limited_edition` | 是否限定版 | Boolean | ✅ | 是否為限量版 | `false` |
| `production_year` | 生產年份 | Number | | 生產年份 | `2005` |
| `serial_number_range` | 序號範圍 | String | | 序號範圍說明 | `A0001-A1000` |
| `condition` | 商品狀況 | String | ✅ | 商品狀態描述 | `全新` |
| `notes` | 備註 | String | | 變體相關備註 | `日本直送，包裝完整` |
| `is_active` | 是否啟用 | Boolean | ✅ | 是否可售 | `true` |
| `created_at` | 建立時間 | DateTime | ✅ | 系統自動產生 | `2025-09-16T10:30:00Z` |
| `updated_at` | 更新時間 | DateTime | ✅ | 系統自動更新 | `2025-09-16T10:30:00Z` |

### 3.1 變體類型說明 (Variant Type)

| 類型代碼 | 中文名稱 | 用途說明 |
| :--- | :--- | :--- |
| `A` | 一般版 | 標準商品，正常銷售 |
| `B` | 年度限定版 | 特定年份限定商品 |
| `C` | 紀念版 | 紀念特殊事件的版本 |
| `D` | 特殊限定版 | 特別限量或客製化商品 |
| `X` | 損傷品 | 包裝破損但商品無損，折價銷售 |

## 4. 採購單 (Purchase Order)

| 欄位名稱 (Field Name) | 中文名稱 | 數據類型 | 必填 | 說明 | 範例 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `id` | 系統ID | String | ✅ | UUID | `cuid_po001` |
| `purchase_order_number` | 採購單號 | String | ✅ | 規則見 ID_DEFINITIONS.md | `PO-20250916-001` |
| `supplier` | 供應商 | String | ✅ | 供應商名稱 | `日本酒商株式會社` |
| `currency` | 幣別 | String | ✅ | ISO 4217代碼 | `JPY` |
| `exchange_rate` | 匯率 | Number | | 採購時匯率（可為空） | `0.23` |
| `funding_source` | 資金來源 | Enum | ✅ | COMPANY\|PERSONAL | `COMPANY` |
| `investor_id` | 投資方ID | String | | 投資方識別（資金來源為COMPANY時） | `investor_abc` |
| `total_amount_foreign` | 外幣總額 | Number | ✅ | 原幣別總金額 | `800000` |
| `total_amount_twd` | 台幣總額 | Number | | 台幣預估總額 | `184000` |
| `status` | 單據狀態 | Enum | ✅ | DRAFT\|CONFIRMED\|RECEIVING\|COMPLETED\|CANCELLED | `CONFIRMED` |
| `order_date` | 訂購日期 | Date | ✅ | 下單日期 | `2025-09-16` |
| `expected_arrival` | 預計到貨日 | Date | | 預計到港日期 | `2025-10-15` |
| `notes` | 備註 | String | | 採購相關備註 | `急件，請優先處理` |
| `created_by` | 建立者 | String | ✅ | 建立使用者ID | `user_boss` |
| `created_at` | 建立時間 | DateTime | ✅ | 系統自動產生 | `2025-09-16T10:30:00Z` |
| `updated_at` | 更新時間 | DateTime | ✅ | 系統自動更新 | `2025-09-16T10:30:00Z` |

## 5. 採購明細 (Purchase Item)

| 欄位名稱 (Field Name) | 中文名稱 | 數據類型 | 必填 | 說明 | 範例 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `id` | 系統ID | String | ✅ | UUID | `cuid_pi001` |
| `purchase_order_id` | 採購單ID | String | ✅ | 所屬採購單 | `cuid_po001` |
| `product_id` | 產品ID | String | | 關聯產品（如有） | `cuid_xyz789` |
| `product_name` | 商品名稱 | String | ✅ | 商品名稱 | `山崎18年威士忌` |
| `quantity` | 數量 | Number | ✅ | 採購數量 | `12` |
| `unit_price_foreign` | 外幣單價 | Number | ✅ | 原幣別單價 | `8000` |
| `unit_price_twd` | 台幣單價 | Number | | 台幣預估單價 | `1840` |
| `total_amount_foreign` | 外幣小計 | Number | ✅ | 原幣別小計 | `96000` |
| `total_amount_twd` | 台幣小計 | Number | | 台幣預估小計 | `22080` |
| `alc_percentage` | 酒精濃度 | Number | | 酒精度數 | `43` |
| `volume_ml` | 容量 | Number | | 容量（毫升） | `700` |
| `weight_kg` | 重量 | Number | | 單品重量（公斤） | `1.2` |
| `hs_code` | 稅則號列 | String | | 海關稅則代碼 | `2208.30.10.00` |
| `notes` | 備註 | String | | 品項備註 | `日本限定版` |

## 6. 銷售單 (Sales Order)

| 欄位名稱 (Field Name) | 中文名稱 | 數據類型 | 必填 | 說明 | 範例 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `id` | 系統ID | String | ✅ | UUID | `cuid_so001` |
| `sales_order_number` | 銷售單號 | String | ✅ | 規則見 ID_DEFINITIONS.md | `SO-20250916-001` |
| `customer_id` | 客戶ID | String | ✅ | 關聯客戶 | `cuid_abc123` |
| `customer_code` | 客戶代碼 | String | ✅ | 客戶代碼 | `C00001` |
| `funding_source` | 資金來源 | Enum | ✅ | COMPANY\|PERSONAL | `COMPANY` |
| `investor_id` | 投資方ID | String | | 投資方識別（資金來源為COMPANY時） | `investor_abc` |
| `total_display_amount` | 顯示總額 | Number | ✅ | 投資方看到的金額 | `1000` |
| `total_actual_amount` | 實際總額 | Number | ✅ | 實際收取金額 | `1200` |
| `total_commission` | 總抽成 | Number | ✅ | 老闆抽成金額 | `200` |
| `total_cost` | 總成本 | Number | ✅ | 商品總成本 | `800` |
| `payment_terms` | 付款條件 | Enum | ✅ | CASH\|WEEKLY\|MONTHLY\|SIXTY_DAYS | `MONTHLY` |
| `status` | 單據狀態 | Enum | ✅ | DRAFT\|CONFIRMED\|PARTIAL_SHIPPED\|SHIPPED\|COMPLETED\|CANCELLED | `CONFIRMED` |
| `order_date` | 訂單日期 | Date | ✅ | 下單日期 | `2025-09-16` |
| `delivery_date` | 交貨日期 | Date | | 預計交貨日期 | `2025-09-18` |
| `notes` | 備註 | String | | 訂單相關備註 | `客戶要求急件` |
| `created_by` | 建立者 | String | ✅ | 建立使用者ID | `user_boss` |
| `created_at` | 建立時間 | DateTime | ✅ | 系統自動產生 | `2025-09-16T10:30:00Z` |
| `updated_at` | 更新時間 | DateTime | ✅ | 系統自動更新 | `2025-09-16T10:30:00Z` |

## 7. 銷售明細 (Sales Item)

| 欄位名稱 (Field Name) | 中文名稱 | 數據類型 | 必填 | 說明 | 範例 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `id` | 系統ID | String | ✅ | UUID | `cuid_si001` |
| `sales_order_id` | 銷售單ID | String | ✅ | 所屬銷售單 | `cuid_so001` |
| `variant_id` | 變體ID | String | ✅ | 商品變體 | `cuid_var001` |
| `product_code` | 產品編號 | String | ✅ | 產品代碼 | `P00001` |
| `variant_code` | 變體編號 | String | ✅ | 變體代碼 | `P00001-A` |
| `quantity` | 數量 | Number | ✅ | 銷售數量 | `1` |
| `unit_display_price` | 顯示單價 | Number | ✅ | 投資方看到的單價 | `1000` |
| `unit_actual_price` | 實際單價 | Number | ✅ | 實際收取單價 | `1200` |
| `unit_cost_price` | 成本單價 | Number | ✅ | 成本價 | `800` |
| `unit_commission` | 單位抽成 | Number | ✅ | 老闆單位抽成 | `200` |
| `display_amount` | 顯示金額 | Number | ✅ | 投資方看到的小計 | `1000` |
| `actual_amount` | 實際金額 | Number | ✅ | 實際收取小計 | `1200` |
| `cost_amount` | 成本金額 | Number | ✅ | 成本小計 | `800` |
| `commission_amount` | 抽成金額 | Number | ✅ | 抽成小計 | `200` |
| `price_snapshot` | 價格快照 | JSON | ✅ | 定價來源記錄 | `{"source": "special", "reason": "VIP客戶"}` |

## 8. 客戶專價 (Customer Special Price)

| 欄位名稱 (Field Name) | 中文名稱 | 數據類型 | 必填 | 說明 | 範例 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `id` | 系統ID | String | ✅ | UUID | `cuid_csp001` |
| `customer_id` | 客戶ID | String | ✅ | 關聯客戶 | `cuid_abc123` |
| `product_id` | 產品ID | String | ✅ | 關聯產品 | `cuid_xyz789` |
| `standard_price` | 標準價格 | Number | ✅ | 公版價格 | `21000` |
| `special_price` | 專屬價格 | Number | ✅ | 客製價格 | `20000` |
| `discount_amount` | 折扣金額 | Number | ✅ | 折扣金額 | `1000` |
| `discount_rate` | 折扣率 | Number | ✅ | 折扣百分比 | `0.05` |
| `reason` | 調價原因 | String | ✅ | 專價設定原因 | `VIP客戶長期合作` |
| `effective_date` | 生效日期 | Date | ✅ | 專價生效日 | `2025-09-16` |
| `expiry_date` | 到期日期 | Date | | 專價到期日 | `2025-12-31` |
| `is_active` | 是否啟用 | Boolean | ✅ | 是否生效中 | `true` |
| `notes` | 備註 | String | | 相關備註 | `年度合約價格` |
| `created_by` | 建立者 | String | ✅ | 建立使用者ID | `user_boss` |
| `created_at` | 建立時間 | DateTime | ✅ | 系統自動產生 | `2025-09-16T10:30:00Z` |
| `updated_at` | 更新時間 | DateTime | ✅ | 系統自動更新 | `2025-09-16T10:30:00Z` |

---

## 💡 資料模型設計原則

1. **統一命名**: 所有欄位名稱採用 snake_case 格式
2. **中文友善**: 提供完整中文欄位名稱說明
3. **型別一致**: 相同概念的欄位使用相同資料型別
4. **關聯清楚**: 明確標示各資料表之間的關聯關係
5. **權限考慮**: 標示哪些欄位對投資方不可見
6. **擴展性**: 預留未來需求的擴展空間

---

## 🔒 權限控制欄位

### 投資方不可見欄位
以下欄位對 INVESTOR 角色完全隱藏：
- `total_actual_amount` (實際收取金額)
- `unit_actual_price` (實際單價)
- `total_commission` (總抽成)
- `unit_commission` (單位抽成)
- `commission_amount` (抽成金額)
- `funding_source = 'PERSONAL'` 的所有記錄

### 投資方限制存取欄位
以下欄位對 INVESTOR 角色僅能看到過濾後的資料：
- 所有金額類欄位僅顯示 display 版本
- 客戶專價資訊完全不可見
- 個人調貨相關資料完全不可見

---

## ⚠️ 重要提醒

- **所有房間必須嚴格按此資料模型實作**
- **欄位新增或修改需更新此文件**  
- **權限控制必須在 API 層和資料庫層都實作**
- **資料遷移時請參考此統一格式**

---

**最後更新**: 2025/9/16  
**維護責任**: 所有房間共同遵守  
**變更審核**: 需老闆確認後才可修改