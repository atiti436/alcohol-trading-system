# 核心數據模型 (Data Models) - v2.1

本文件定義系統中核心物件的標準屬性，所有AI開發時必須以此為唯一的欄位命名和格式依據。

## 📋 版本更新說明
### v2.1 - 2025/09/23
- 更新為實際資料庫結構
- 移除理想化但未實作的欄位
- 確保文檔與程式碼一致
- 所有欄位名稱已與 schema.prisma 對齊

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
| `name` | 商品名稱 | String | ✅ | 商品名稱 | `山崎18年單一麥芽威士忌` |
| `category` | 產品分類 | AlcoholCategory | ✅ | 酒類分類枚舉 | `WHISKY` |
| `volume_ml` | 容量(ml) | Number | ✅ | 以毫升為單位 | `700` |
| `alc_percentage` | 酒精濃度(%) | Float | ✅ | 酒精度數，不帶百分號 | `43` |
| `weight_kg` | 商品重量(kg) | Number | ✅ | 商品本身含瓶身的重量 | `1.2` |
| `package_weight_kg` | 包裝重量(kg) | Number | | 外盒或額外包裝的重量 | `0.3` |
| `total_weight_kg` | 總重量(kg) | Number | ✅ | 自動計算：商品+包裝重量 | `1.5` |
| `has_box` | 有無外盒 | Boolean | ✅ | 是否有外包裝盒 | `true` |
| `has_accessories` | 有無附件 | Boolean | ✅ | 是否有附件（證書等） | `true` |
| `accessories` | 附件清單 | String[] | | 附件項目列表 | `["證書", "特製木盒"]` |
| `accessory_weight_kg` | 附件重量(kg) | Number | | 附件總重量 | `0.2` |
| `hs_code` | 稅則號列 | String | | 海關稅則分類代碼 | `2208.30.10.00` |
| `supplier` | 供應商 | String | | 供應商名稱 | `日本酒商株式會社` |
| `manufacturing_date` | 製造日期 | String | | 生產日期 | `2005-03` |
| `expiry_date` | 保存期限 | String | | 保存到期日 | `無期限` |
| `standard_price` | 標準售價 | Number | ✅ | 公版標準售價（台幣） | `21000` |
| `current_price` | 目前售價 | Number | ✅ | 目前售價，可調整（台幣） | `20000` |
| `min_price` | 最低限價 | Number | ✅ | 最低售價限制（台幣） | `18000` |
| `cost_price` | 平均成本價 | Number | | 加權平均成本（台幣） | `15000` |
| `is_active` | 是否啟用 | Boolean | ✅ | 是否在系統中可見可售 | `true` |
| `created_at` | 建立時間 | DateTime | ✅ | 系統自動產生 | `2025-09-16T10:30:00Z` |
| `updated_at` | 更新時間 | DateTime | ✅ | 系統自動更新 | `2025-09-16T10:30:00Z` |

### 2.1 酒精度欄位說明

⚠️ **重要統一規範**：
- **統一使用**: `alc_percentage`
- **棄用欄位**: ~~`abv`~~, ~~`alcoholPercentage`~~
- **資料格式**: 純數字，不含百分號 (如: 43 表示 43%)
- **房間適用**: 所有房間必須統一使用此命名

### 2.2 產品分類枚舉值

```typescript
enum AlcoholCategory {
  WHISKY
  WINE
  SAKE
  BEER
  SPIRITS
  LIQUEUR
  OTHER
}
```

## 3. 產品變體 (Product Variant)

| 欄位名稱 (Field Name) | 中文名稱 | 數據類型 | 必填 | 說明 | 範例 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `id` | 系統ID | String | ✅ | UUID，系統內部使用 | `cuid_var001` |
| `product_id` | 所屬產品ID | String | ✅ | 關聯的產品ID | `cuid_xyz789` |
| `variant_code` | 變體編號 | String | ✅ | 規則見 ID_DEFINITIONS.md | `P00001-A` |
| `variant_type` | 變體類型 | String | ✅ | 最多 100 字，可自由命名 | `標準款` |
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
| `serial_number` | 序號 | String | | 商品序號 | `A0001` |
| `condition` | 商品狀況 | String | ✅ | 商品狀態描述 | `全新` |
| `notes` | 備註 | String | | 變體相關備註 | `日本直送，包裝完整` |
| `is_active` | 是否啟用 | Boolean | ✅ | 是否可售 | `true` |
| `created_at` | 建立時間 | DateTime | ✅ | 系統自動產生 | `2025-09-16T10:30:00Z` |
| `updated_at` | 更新時間 | DateTime | ✅ | 系統自動更新 | `2025-09-16T10:30:00Z` |

### 3.1 變體類型說明 (Variant Type)

變體類型欄位改為自由輸入的文字欄位，建議使用簡潔明瞭的名稱描述包裝或限定資訊，例如「標準款」、「木盒版」、「感謝禮盒」。系統會保留原始輸入並據此生成唯一的變體代碼。

## 4. 採購單 (Purchase Order)

| 欄位名稱 (Field Name) | 中文名稱 | 數據類型 | 必填 | 說明 | 範例 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `id` | 系統ID | String | ✅ | UUID | `cuid_po001` |
| `purchase_number` | 採購單號 | String | ✅ | 規則見 ID_DEFINITIONS.md | `PO-20250916-001` |
| `supplier` | 供應商 | String | ✅ | 供應商名稱 | `日本酒商株式會社` |
| `currency` | 幣別 | String | ✅ | ISO 4217代碼 | `JPY` |
| `exchange_rate` | 匯率 | Number | | 採購時匯率（可為空） | `0.23` |
| `funding_source` | 資金來源 | Enum | ✅ | COMPANY\|PERSONAL | `COMPANY` |
| `total_amount` | 總金額 | Float | ✅ | 採購總金額 | `184000` |
| `status` | 單據狀態 | String | ✅ | PENDING\|CONFIRMED\|RECEIVED | `CONFIRMED` |
| `declaration_number` | 報單號碼 | String | | 海關報單號碼 | `AA1234567890` |
| `declaration_date` | 報關日期 | DateTime | | 報關日期 | `2025-09-16T10:30:00Z` |
| `received_date` | 收貨日期 | DateTime | | 實際收貨日期 | `2025-09-18T14:00:00Z` |
| `notes` | 備註 | String | | 採購相關備註 | `急件，請優先處理` |
| `created_by` | 建立者 | String | ✅ | 建立使用者ID | `user_boss` |
| `created_at` | 建立時間 | DateTime | ✅ | 系統自動產生 | `2025-09-16T10:30:00Z` |
| `updated_at` | 更新時間 | DateTime | ✅ | 系統自動更新 | `2025-09-16T10:30:00Z` |

## 5. 採購明細 (Purchase Item)

| 欄位名稱 (Field Name) | 中文名稱 | 數據類型 | 必填 | 說明 | 範例 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `id` | 系統ID | String | ✅ | UUID | `cuid_pi001` |
| `purchase_id` | 採購單ID | String | ✅ | 所屬採購單 | `cuid_po001` |
| `product_id` | 產品ID | String | | 關聯產品（如有） | `cuid_xyz789` |
| `product_name` | 商品名稱 | String | ✅ | 商品名稱 | `山崎18年威士忌` |
| `quantity` | 數量 | Number | ✅ | 採購數量 | `12` |
| `unit_price` | 單價 | Float | ✅ | 商品單價 | `1840` |
| `total_price` | 小計 | Float | ✅ | 商品小計 | `22080` |
| `dutiable_value` | 完稅價格 | Float | | 海關完稅價格 | `1600` |
| `tariff_code` | 稅則號列 | String | | 海關稅則代碼 | `2208.30.10.00` |
| `import_duty_rate` | 進口稅率 | Float | | 進口稅率 | `0.1` |
| `alc_percentage` | 酒精濃度 | Float | | 酒精度數 | `43` |
| `volume_ml` | 容量 | Int | | 容量（毫升） | `700` |
| `weight_kg` | 重量 | Float | | 單品重量（公斤） | `1.2` |
| `notes` | 備註 | String | | 品項備註 | `日本限定版` |

## 6. 銷售單 (Sales Order)

| 欄位名稱 (Field Name) | 中文名稱 | 數據類型 | 必填 | 說明 | 範例 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `id` | 系統ID | String | ✅ | UUID | `cuid_so001` |
| `sale_number` | 銷售單號 | String | ✅ | 規則見 ID_DEFINITIONS.md | `SO-20250916-001` |
| `customer_id` | 客戶ID | String | ✅ | 關聯客戶 | `cuid_abc123` |
| `total_amount` | 總金額 | Float | ✅ | 銷售總金額 | `1200` |
| `actual_amount` | 實際金額 | Float | | 實際收取金額 | `1200` |
| `commission` | 抽成 | Float | | 老闆抽成金額 | `200` |
| `funding_source` | 資金來源 | String | ✅ | COMPANY\|PERSONAL | `COMPANY` |
| `payment_terms` | 付款條件 | Enum | ✅ | CASH\|WEEKLY\|MONTHLY\|SIXTY_DAYS | `MONTHLY` |
| `status` | 單據狀態 | SaleStatus | ✅ | DRAFT\|CONFIRMED\|SHIPPED\|DELIVERED\|CANCELLED | `CONFIRMED` |
| `is_paid` | 是否已付款 | Boolean | ✅ | 付款狀態 | `false` |
| `paid_at` | 付款時間 | DateTime | | 付款時間 | `2025-09-16T15:30:00Z` |
| `due_date` | 到期日 | DateTime | | 付款到期日 | `2025-10-16T00:00:00Z` |
| `confirmed_at` | 確認時間 | DateTime | | 訂單確認時間 | `2025-09-16T10:30:00Z` |
| `confirmed_by` | 確認人 | String | | 確認人員ID | `user_manager` |
| `notes` | 備註 | String | | 訂單相關備註 | `客戶要求急件` |
| `created_by` | 建立者 | String | ✅ | 建立使用者ID | `user_boss` |
| `created_at` | 建立時間 | DateTime | ✅ | 系統自動產生 | `2025-09-16T10:30:00Z` |
| `updated_at` | 更新時間 | DateTime | ✅ | 系統自動更新 | `2025-09-16T10:30:00Z` |

## 7. 銷售明細 (Sales Item)

| 欄位名稱 (Field Name) | 中文名稱 | 數據類型 | 必填 | 說明 | 範例 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `id` | 系統ID | String | ✅ | UUID | `cuid_si001` |
| `sale_id` | 銷售單ID | String | ✅ | 所屬銷售單 | `cuid_so001` |
| `variant_id` | 變體ID | String | ✅ | 商品變體 | `cuid_var001` |
| `product_id` | 產品ID | String | ✅ | 產品ID | `cuid_xyz789` |
| `variant_id` | 變體ID | String | | 變體ID | `cuid_var001` |
| `quantity` | 數量 | Int | ✅ | 銷售數量 | `1` |
| `unit_price` | 單價 | Float | ✅ | 商品單價 | `1200` |
| `actual_unit_price` | 實際單價 | Float | | 實際收取單價 | `1200` |
| `total_price` | 小計 | Float | ✅ | 商品小計 | `1200` |
| `actual_total_price` | 實際小計 | Float | | 實際收取小計 | `1200` |
| `is_personal_purchase` | 個人調貨 | Boolean | ✅ | 是否為個人調貨 | `false` |

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

## 9. 進貨記錄 (Import Record)

| 欄位名稱 (Field Name) | 中文名稱 | 數據類型 | 必填 | 說明 | 範例 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `id` | 系統ID | String | ✅ | UUID | `cuid_ir001` |
| `import_number` | 進貨單號 | String | ✅ | 進貨單號 | `IM-20250916-001` |
| `purchase_id` | 採購單ID | String | ✅ | 關聯採購單 | `cuid_po001` |
| `purchase_number` | 採購單號 | String | ✅ | 採購單號 | `PO-20250916-001` |
| `supplier` | 供應商 | String | ✅ | 供應商名稱 | `日本酒商株式會社` |
| `declaration_number` | 報單號碼 | String | | 海關報單號碼 | `AA1234567890` |
| `declaration_date` | 報關日期 | DateTime | | 報關日期 | `2025-09-16T10:30:00Z` |
| `total_value` | 貨物總值 | Float | ✅ | 貨物總價值 | `184000` |
| `currency` | 幣別 | String | ✅ | 貨幣代碼 | `TWD` |
| `exchange_rate` | 匯率 | Float | ✅ | 匯率 | `1.0` |
| `status` | 狀態 | String | ✅ | PENDING\|PROCESSING\|CUSTOMS_CLEARED\|RECEIVED\|COMPLETED | `PROCESSING` |
| `alcohol_tax` | 酒稅 | Float | ✅ | 酒稅金額 | `15000` |
| `business_tax` | 營業稅 | Float | ✅ | 營業稅金額 | `9200` |
| `trade_promotion_fee` | 推廣費 | Float | ✅ | 貿易推廣費 | `460` |
| `total_taxes` | 稅費合計 | Float | ✅ | 所有稅費總額 | `24660` |
| `extracted_data` | 解析資料 | String | | OCR解析的原始資料 | `{...}` |
| `notes` | 備註 | String | | 進貨備註 | `急件處理` |
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
- `actual_amount` (實際收取金額)
- `actual_unit_price` (實際單價)
- `actual_total_price` (實際小計)
- `commission` (總抽成)
- `funding_source = 'PERSONAL'` 的所有記錄
- `is_personal_purchase = true` 的所有記錄

### 投資方限制存取欄位
以下欄位對 INVESTOR 角色僅能看到過濾後的資料：
- 客戶專價資訊完全不可見
- 個人調貨相關資料完全不可見
- 只能看到公司資金來源的交易

---

## ⚠️ 重要提醒

- **所有房間必須嚴格按此資料模型實作**
- **欄位新增或修改需更新此文件**  
- **權限控制必須在 API 層和資料庫層都實作**
- **資料遷移時請參考此統一格式**

---

**最後更新**: 2025/9/23
**維護責任**: 所有房間共同遵守
**變更審核**: 需老闆確認後才可修改

---

## 🔄 更新歷程

### v2.1 - 2025/09/23
- ✅ 更新採購單欄位名稱：`purchase_order_number` → `purchase_number`
- ✅ 更新銷售單欄位名稱：`sales_order_number` → `sale_number`
- ✅ 簡化產品模型：移除 `name_zh`、`name_en`、`brand`、`origin` 等未實作欄位
- ✅ 更新產品分類為枚舉類型：`AlcoholCategory`
- ✅ 新增進貨記錄 (Import Record) 完整模型
- ✅ 更新所有資料型別與實際 schema.prisma 對齊
- ✅ 修正權限控制欄位說明