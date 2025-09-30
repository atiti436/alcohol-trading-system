# 系統問題分析與重構方案

**日期**: 2025-09-30
**分析者**: Claude

---

## 📋 問題總覽

根據用戶反饋，商品管理系統存在兩個需要重構的結構性問題：

1. **變體系統結構矛盾** - 強制預設變體，無法靈活命名
2. **重量欄位定義混亂** - Label、計算、顯示三者不一致

---

## 🔍 問題 1：變體系統結構矛盾

### 用戶需求
- **原始目的**：支援同一商品的不同版本（如山崎18木盒版、機場版、舊版禮盒等）
- **實際需求**：
  - ✅ 有時不需要變體（不確定未來是否會有）
  - ✅ 有時需要多個變體（木盒版/機場版/機場舊版/舊版禮盒/舊版霧面/舊版金花等）
  - ✅ 自由命名變體標籤
  - ❌ **不想強制創建預設變體**

### 當前問題

#### 1. 強制預設變體
**位置**: `webapp/src/app/api/products/route.ts:214-232`

```typescript
// 自動創建預設變體（一般版）
let defaultVariant = null
if (create_default_variant) {  // 參數控制，但實務上可能被強制要求
  const defaultVariantType = DEFAULT_VARIANT_TYPE  // '標準款'
  const variant_code = await generateVariantCode(prisma, product.id, product_code, defaultVariantType)
  const sku = `SKU-${variant_code}`

  defaultVariant = await prisma.productVariant.create({
    data: {
      product_id: product.id,
      variant_code,
      sku,
      variant_type: defaultVariantType,  // 固定為 '標準款'
      description: defaultVariantType,
      base_price: standard_price,
      current_price
    }
  })
}
```

**問題**：
- 雖然有 `create_default_variant` 參數控制，但在快速新增等流程中可能被預設為 true
- 預設變體類型固定為 `DEFAULT_VARIANT_TYPE_LABEL = '標準款'`
- 用戶無法選擇不創建變體

#### 2. 預設值強制注入
**位置**: `webapp/src/components/common/ProductSearchSelect.tsx:384`

```typescript
<Form.Item
  name="variant_type"
  label="預設變體名稱"
  initialValue={DEFAULT_VARIANT_TYPE_LABEL}  // 強制預設 '標準款'
  rules={[{ max: 100, message: '最多 100 字' }]}
>
  <Input placeholder="例如：木盒版、標準款" />
</Form.Item>
```

#### 3. Fallback 到預設值
**位置**: `webapp/src/app/api/products/quick-add/route.ts:35-38`

```typescript
let variantType = DEFAULT_VARIANT_TYPE  // 若未提供，回落到 '標準款'
if (typeof body.variant_type === 'string') {
  try {
    const normalized = normalizeVariantType(body.variant_type)
    // ...
  }
}
```

### 根本原因
- 系統設計時假設「每個商品至少有一個變體」
- 但實際業務場景中，有些商品無需變體（或暫時不需要）
- 預設值（'標準款'）對用戶來說不具意義且造成混淆

---

## 🔍 問題 2：重量欄位定義混亂

### 用戶原始需求
- **目的**：記錄政府要求的「空瓶服務費」申報資料（每 2 個月申報一次）
- **組成項目**：
  - 空瓶重量（不含酒液）
  - 外盒重量
  - 附件重量（證書、說明書等）

### 當前問題：三處定義不一致

#### 定義 1：表單 Label 說「空瓶重量」
**位置**: `webapp/src/app/products/page.tsx:754-766`

```typescript
<Form.Item
  name="weight_kg"
  label="空瓶重量 (kg)"
  tooltip="酒瓶本身重量，不含包裝和附件"
  style={{ marginBottom: '16px' }}
>
  <InputNumber
    placeholder="0.8"
    step={0.1}
    min={0}
    precision={2}
    style={{ width: '200px' }}
  />
</Form.Item>
```

**說明**：Label 明確寫「空瓶重量」，Tooltip 說「酒瓶本身重量，不含包裝和附件」

---

#### 定義 2：計算公式當作「酒液重量」
**位置**: `webapp/src/app/products/page.tsx:831`

```typescript
const totalWeight = alcoholWeight * 2 + packageWeight + accessoryWeight
// 酒液*2當作酒液+空瓶
```

**說明**：
- 計算時把 `weight_kg` 當作「酒液重量」
- `* 2` 的邏輯是：酒液重量 + 空瓶重量 ≈ 酒液重量 × 2
- 這是 Codex 加的「便利功能」：當無法直接秤空瓶時，用滿瓶重量反推

---

#### 定義 3：顯示文字說「酒液」
**位置**: `webapp/src/app/products/page.tsx:184`

```typescript
<div style={{ fontSize: '12px', color: '#666' }}>
  {record.volume_ml}ml • {record.alc_percentage}% • 酒液: {record.weight_kg}kg
</div>
```

**說明**：顯示時直接標示為「酒液」

---

### 矛盾總結

| 位置 | 定義 | 用途 |
|------|------|------|
| 表單輸入 | 空瓶重量（不含酒液） | 直接量測空瓶 |
| 計算公式 | 酒液重量 × 2 = 酒液 + 空瓶 | 反推空瓶重量 |
| 列表顯示 | 酒液重量 | 資訊展示 |

**問題**：
- 同一個欄位 `weight_kg` 在不同地方有不同意義
- 用戶無法確定應該輸入什麼值
- 計算邏輯 `* 2` 假設酒液重量 ≈ 空瓶重量，但這在實務上並不成立（例如：750ml 威士忌酒液約 750g，空瓶約 500-800g）

---

## 💡 重構方案

### 方案 A：變體系統重構（推薦）

#### 目標
1. ✅ 變體完全可選（商品可以不創建任何變體）
2. ✅ 移除強制預設變體
3. ✅ 支援靈活命名（木盒版、機場版等自由輸入）
4. ✅ 保留自動生成 variant_code 的功能（如 P0001-木盒版）

#### 修改項目

**1. 修改 POST /api/products**
- 移除或改為預設 false：`create_default_variant` 參數
- 或改為前端明確勾選：「是否建立預設變體」選項

**2. 修改 ProductSearchSelect 快速新增**
- 移除 `initialValue={DEFAULT_VARIANT_TYPE_LABEL}`
- 改為 placeholder：「選填，例如：木盒版、標準款」

**3. 修改 quick-add API**
- 移除 fallback 到 `DEFAULT_VARIANT_TYPE`
- 若未提供 `variant_type`，則不創建變體

**4. 新增 UI：商品變體管理**
- 在商品詳情頁新增「變體管理」區塊
- 提供「新增變體」按鈕，自由輸入變體名稱
- 顯示現有變體列表，支援編輯/刪除

#### 優點
- ✅ 完全符合用戶需求
- ✅ 保持現有 API 結構
- ✅ 向後相容（已有 '標準款' 變體的商品不受影響）

#### 風險
- ⚠️ 需檢查所有依賴「至少有一個變體」的邏輯
- ⚠️ 銷售單/採購單/庫存調整等功能需支援「無變體商品」

---

### 方案 B：重量欄位重構（推薦）

#### 目標
1. ✅ 統一欄位定義，消除歧義
2. ✅ 符合原始需求：記錄空瓶服務費申報資料
3. ✅ 保留便利功能：支援從滿瓶重量計算空瓶

#### 修改項目

**1. 資料庫/類型定義不變**
```typescript
weight_kg: number         // 保留原欄位
liquid_weight_kg?: number // 新增：酒液重量（選填）
```

**2. 修改表單 Label 與邏輯**

```typescript
// 選項 1：從空瓶直接量測
<Form.Item
  name="weight_kg"
  label="空瓶重量 (kg)"
  tooltip="空酒瓶本身重量（不含酒液、包裝、附件）"
>
  <InputNumber placeholder="0.5" />
</Form.Item>

// 選項 2：從酒液重量反推（便利功能）
<Form.Item
  name="liquid_weight_kg"
  label="酒液重量 (kg) - 選填"
  tooltip="若無空瓶可秤，填入酒液重量（體積 × 密度），系統自動估算空瓶重量"
>
  <InputNumber placeholder="0.75" />
</Form.Item>

{/* 說明文字 */}
<Alert
  message="說明：若有空瓶可直接量測，請填寫「空瓶重量」；若只能秤滿瓶，請填寫「酒液重量」，系統將自動估算。"
  type="info"
  showIcon
/>
```

**3. 修改計算邏輯**

```typescript
// 優先使用直接量測的空瓶重量
let emptyBottleWeight = getFieldValue('weight_kg') || 0

// 若未提供，嘗試從酒液重量反推
if (!emptyBottleWeight && getFieldValue('liquid_weight_kg')) {
  const liquidWeight = getFieldValue('liquid_weight_kg')
  // 根據經驗值估算：空瓶約為酒液重量的 60-80%
  emptyBottleWeight = liquidWeight * 0.7  // 可調整係數
}

// 總重量 = 空瓶 + 外盒 + 附件
const totalWeight = emptyBottleWeight + packageWeight + accessoryWeight
```

**4. 修改顯示文字**

```typescript
<div style={{ fontSize: '12px', color: '#666' }}>
  {record.volume_ml}ml • {record.alc_percentage}% • 空瓶: {record.weight_kg.toFixed(3)}kg
</div>
```

#### 優點
- ✅ 定義清晰，無歧義
- ✅ 保留便利功能（從酒液反推）
- ✅ 符合政府申報需求
- ✅ 向後相容（已有資料的 `weight_kg` 視為空瓶重量）

#### 缺點
- ⚠️ 估算係數（0.7）需根據實際業務調整
- ⚠️ 若歷史資料中 `weight_kg` 實為酒液重量，需手動修正

---

## 🚀 實施優先級

### 高優先級（建議立即處理）
1. ✅ **重量欄位重構**（方案 B）
   - 影響政府申報正確性
   - 修改範圍較小
   - 預計 2-3 小時

### 中優先級（建議本週處理）
2. ⏳ **變體系統重構**（方案 A）
   - 影響用戶體驗
   - 需檢查多處業務邏輯
   - 預計 4-6 小時

---

## 📝 待確認事項

### 變體系統
- [ ] 確認銷售單/採購單是否允許選擇「無變體商品」
- [ ] 確認庫存系統是否依賴 variant_id（或可用 product_id）
- [ ] 確認報價單是否需要變體資訊

### 重量欄位
- [ ] 確認 `weight_kg` 歷史資料的實際意義（空瓶 or 酒液）
- [ ] 確認估算係數（空瓶 ≈ 酒液 × 0.7）是否合理
- [ ] 確認是否需要同時記錄「滿瓶重量」（用於核對）

---

## 📌 相關檔案

### 變體系統
- `webapp/src/app/api/products/route.ts` - 商品建立 API
- `webapp/src/app/api/products/[id]/variants/route.ts` - 變體管理 API
- `webapp/src/components/common/ProductSearchSelect.tsx` - 快速新增元件
- `webapp/src/lib/variant-utils.ts` - 變體工具函數
- `shared/utils/constants.ts` - 常數定義

### 重量欄位
- `webapp/src/app/products/page.tsx` - 商品管理主頁
- `webapp/src/app/api/products/route.ts` - 商品 API
- `prisma/schema.prisma` - 資料庫 Schema（可能需要新增欄位）

---

**分析完成，等待決策與實施。**