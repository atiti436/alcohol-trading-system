# 資料驗證規則 (Data Validation Rules)

本文件定義系統的資料驗證規則，防止錯誤資料進入系統。所有螞蟻開發時必須實作這些驗證。

## 🛡️ 驗證原則

1. **防呆優先**: 系統要比使用者聰明，自動防止常見錯誤
2. **友善提示**: 錯誤訊息要清楚告訴使用者怎麼改正
3. **即時驗證**: 輸入時就檢查，不要等到提交才報錯
4. **伺服器端必檢**: 前端驗證可以繞過，後端API必須再檢查一次

---

## 📋 客戶資料驗證規則

| 欄位 | 驗證規則 | 錯誤訊息 | 範例 |
|------|----------|----------|------|
| `customer_code` | 必填；格式`C00001`；不可重複 | "客戶代碼格式錯誤，請使用C00001格式" | ✅ `C00001` ❌ `CUS001` |
| `name` | 必填；1-100字；不可空白 | "客戶名稱必填，請輸入1-100字" | ✅ `滿帆洋行` ❌ `   ` |
| `email` | 選填；Email格式 | "請輸入正確的Email格式" | ✅ `test@example.com` ❌ `abc123` |
| `phone` | 選填；台灣手機格式 | "請輸入正確的手機號碼" | ✅ `0912-345-678` ❌ `abc123` |
| `tax_id` | 選填；8位數字 | "統一編號必須是8位數字" | ✅ `12345678` ❌ `123456789` |
| `credit_limit` | 選填；≥0的數字 | "信用額度不能是負數" | ✅ `100000` ❌ `-1000` |

---

## 🍶 產品資料驗證規則

| 欄位 | 驗證規則 | 錯誤訊息 | 範例 |
|------|----------|----------|------|
| `product_code` | 必填；格式`P00001`；不可重複 | "產品編號格式錯誤，請使用P00001格式" | ✅ `P00001` ❌ `PROD001` |
| `name_zh` | 必填；1-200字 | "中文品名必填，請輸入1-200字" | ✅ `山崎18年威士忌` ❌ `   ` |
| `volume_ml` | 必填；1-10000的數字 | "容量必須在1-10000毫升之間" | ✅ `700` ❌ `0` ❌ `999999` |
| `alc_percentage` | 必填；0-100的數字 | "酒精度必須在0-100%之間" | ✅ `43` ❌ `150` ❌ `-5` |
| `weight_kg` | 必填；0.1-50的數字 | "商品重量必須在0.1-50公斤之間" | ✅ `1.2` ❌ `0` ❌ `100` |
| `standard_price` | 必填；≥1的數字 | "標準售價必須大於0元" | ✅ `21000` ❌ `0` ❌ `-1000` |
| `current_price` | 必填；≥1的數字 | "目前售價必須大於0元" | ✅ `20000` ❌ `0` |
| `min_price` | 必填；≥1且≤current_price | "最低限價不能高於目前售價" | ✅ `18000` ❌ `25000` |

### 🔍 產品變體驗證規則

| 欄位 | 驗證規則 | 錯誤訊息 | 範例 |
|------|----------|----------|------|
| `variant_code` | 必填；格式`P00001-A`；不可重複 | "變體編號格式錯誤，請使用P00001-A格式" | ✅ `P00001-A` ❌ `P00001_A` |
| `variant_type` | 必填；只能是A,B,C,D,X | "變體類型只能是A/B/C/D/X" | ✅ `A` ❌ `Z` |
| `stock_quantity` | 必填；≥0的整數 | "庫存數量不能是負數" | ✅ `50` ❌ `-10` ❌ `10.5` |
| `discount_rate` | 選填；0-1的數字 | "折扣率必須在0-100%之間" | ✅ `0.8` ❌ `1.5` ❌ `-0.2` |

---

## 💰 銷售資料驗證規則

| 欄位 | 驗證規則 | 錯誤訊息 | 範例 |
|------|----------|----------|------|
| `sales_order_number` | 必填；格式`SO-YYYYMMDD-001` | "銷售單號格式錯誤" | ✅ `SO-20250916-001` |
| `customer_id` | 必填；必須存在於客戶資料中 | "找不到此客戶，請重新選擇" | ✅ 有效客戶ID |
| `quantity` | 必填；≥1的整數 | "數量必須大於0" | ✅ `5` ❌ `0` ❌ `-2` |
| `unit_display_price` | 必填；≥1的數字 | "顯示價格必須大於0元" | ✅ `1000` ❌ `0` |
| `unit_actual_price` | 必填；≥unit_display_price | "實際價格不能低於顯示價格" | ✅ `1200` ❌ `800` |
| `delivery_date` | 選填；≥今天的日期 | "交貨日期不能是過去時間" | ✅ 明天的日期 ❌ 昨天 |

---

## 🏪 採購資料驗證規則

| 欄位 | 驗證規則 | 錯誤訊息 | 範例 |
|------|----------|----------|------|
| `purchase_order_number` | 必填；格式`PO-YYYYMMDD-001` | "採購單號格式錯誤" | ✅ `PO-20250916-001` |
| `supplier` | 必填；1-100字 | "供應商名稱必填" | ✅ `日本酒商株式會社` |
| `currency` | 必填；3位貨幣代碼 | "貨幣代碼錯誤，請使用如JPY/USD格式" | ✅ `JPY` ❌ `日幣` |
| `exchange_rate` | 選填；>0的數字 | "匯率必須大於0" | ✅ `0.23` ❌ `0` ❌ `-0.5` |
| `unit_price_foreign` | 必填；>0的數字 | "外幣單價必須大於0" | ✅ `8000` ❌ `0` |

---

## 🔒 權限相關驗證

### 角色驗證
```typescript
// 角色必須是以下之一
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  INVESTOR = 'INVESTOR', 
  EMPLOYEE = 'EMPLOYEE'
}

// 驗證規則
const validateUserRole = (role: string): boolean => {
  return Object.values(UserRole).includes(role as UserRole);
}
```

### 投資方隔離驗證
```typescript
// 投資方只能存取自己的資料
const validateInvestorAccess = (userRole: string, investorId: string, dataInvestorId: string): boolean => {
  if (userRole === 'SUPER_ADMIN') return true;
  if (userRole === 'INVESTOR') return investorId === dataInvestorId;
  return false;
}
```

---

## 💻 技術實作範例

### 前端驗證範例 (React + Ant Design)
```typescript
import { Form, Input, InputNumber, message } from 'antd';

const ProductForm = () => {
  const [form] = Form.useForm();

  return (
    <Form form={form} onFinish={handleSubmit}>
      <Form.Item
        name="product_code"
        label="產品編號"
        rules={[
          { required: true, message: '產品編號必填' },
          { pattern: /^P\d{5}$/, message: '產品編號格式錯誤，請使用P00001格式' }
        ]}
      >
        <Input placeholder="P00001" />
      </Form.Item>
      
      <Form.Item
        name="alc_percentage"
        label="酒精濃度(%)"
        rules={[
          { required: true, message: '酒精濃度必填' },
          { type: 'number', min: 0, max: 100, message: '酒精度必須在0-100%之間' }
        ]}
      >
        <InputNumber min={0} max={100} />
      </Form.Item>
      
      <Form.Item
        name="standard_price"
        label="標準售價"
        rules={[
          { required: true, message: '標準售價必填' },
          { type: 'number', min: 1, message: '標準售價必須大於0元' }
        ]}
      >
        <InputNumber min={1} formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
      </Form.Item>
    </Form>
  );
};
```

### 後端API驗證範例 (Node.js + Express)
```typescript
import { body, validationResult } from 'express-validator';

// 產品資料驗證中間件
export const validateProduct = [
  body('product_code')
    .matches(/^P\d{5}$/)
    .withMessage('產品編號格式錯誤，請使用P00001格式'),
  body('name_zh')
    .isLength({ min: 1, max: 200 })
    .withMessage('中文品名必填，請輸入1-200字'),
  body('volume_ml')
    .isInt({ min: 1, max: 10000 })
    .withMessage('容量必須在1-10000毫升之間'),
  body('alc_percentage')
    .isFloat({ min: 0, max: 100 })
    .withMessage('酒精度必須在0-100%之間'),
  body('standard_price')
    .isFloat({ min: 1 })
    .withMessage('標準售價必須大於0元'),
];

// API端點
app.post('/api/products', validateProduct, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '資料驗證失敗',
        details: errors.array()
      }
    });
  }
  
  // 處理正確的資料...
});
```

---

## 📱 特殊驗證規則

### LINE Bot輸入驗證
```typescript
// LINE Bot 成本計算輸入解析
const parseLineMessage = (text: string) => {
  // 範例輸入: "白鶴清酒 720ml 15度 日幣800 匯率0.21"
  const regex = /(.+?)\s+(\d+)ml\s+(\d+(?:\.\d+)?)度\s+日幣(\d+(?:\.\d+)?)\s+匯率(\d+(?:\.\d+)?)/;
  const match = text.match(regex);
  
  if (!match) {
    throw new Error('格式錯誤，請使用：商品名稱 容量ml 酒精度度 日幣價格 匯率數字');
  }
  
  const [, name, volume, alc, jpyPrice, exchangeRate] = match;
  
  // 驗證數值範圍
  if (Number(volume) < 1 || Number(volume) > 10000) {
    throw new Error('容量必須在1-10000毫升之間');
  }
  if (Number(alc) < 0 || Number(alc) > 100) {
    throw new Error('酒精度必須在0-100%之間');
  }
  if (Number(jpyPrice) <= 0) {
    throw new Error('日幣價格必須大於0');
  }
  if (Number(exchangeRate) <= 0) {
    throw new Error('匯率必須大於0');
  }
  
  return {
    name,
    volume_ml: Number(volume),
    alc_percentage: Number(alc),
    jpy_price: Number(jpyPrice),
    exchange_rate: Number(exchangeRate)
  };
};
```

---

## ⚠️ 重要提醒

### 給螞蟻A (監督) 的檢查清單：
- [ ] 所有API都有輸入驗證嗎？
- [ ] 錯誤訊息是否友善易懂？
- [ ] 前端和後端都有驗證嗎？
- [ ] 投資方權限隔離是否正確？

### 給螞蟻B (實作) 的實作要點：
- [ ] 使用驗證套件(如express-validator, Joi等)
- [ ] 實作統一的錯誤處理格式
- [ ] 前端即時驗證提升使用者體驗
- [ ] 記錄驗證失敗的嘗試(防攻擊)

### 給老闆的操作建議：
- 🔴 如果看到錯誤訊息，按照提示修正即可
- 🔴 系統不讓您輸入錯誤資料是為了保護您的資料品質
- 🔴 如果覺得驗證規則太嚴格，可以請螞蟻調整

---

**最後更新**: 2025/9/16  
**維護責任**: 所有房間都必須實作相對應的驗證規則  
**緊急聯絡**: 如果驗證規則阻礙正常操作，請立即回報修正