# 系統設定管理 (System Settings)

## 🎯 目標
建立靈活的系統設定模組，讓管理員可以在後台介面修改關鍵參數，而非寫死在程式碼中。

---

## ⚙️ 可設定參數類別

### **🏢 公司基本資料**
| 設定項目 | 鍵值 | 資料類型 | 預設值 | 說明 |
|----------|------|----------|--------|------|
| 公司名稱 | `company_name` | string | "滿帆洋行有限公司" | 顯示在發票、報表上 |
| 統一編號 | `company_tax_id` | string | "12345678" | 發票開立用 |
| 公司地址 | `company_address` | string | "" | 發票地址 |
| 負責人 | `company_owner` | string | "" | 法定負責人 |
| 聯絡電話 | `company_phone` | string | "" | 客服電話 |
| 客服信箱 | `company_email` | string | "" | 客戶聯絡信箱 |

### **💰 稅率設定**
| 設定項目 | 鍵值 | 資料類型 | 預設值 | 說明 |
|----------|------|----------|--------|------|
| 營業稅率 | `vat_rate` | number | 0.05 | 台灣營業稅 5% |
| 關稅稅率 | `import_duty_rate` | number | 0.20 | 酒類進口關稅 |
| 菸酒稅率 | `tobacco_tax_rate` | number | 0.185 | 酒精飲料菸酒稅 |
| 推廣費率 | `promotion_fee_rate` | number | 0.05 | 菸酒推廣費 |

### **🔄 匯率設定**
| 設定項目 | 鍵值 | 資料類型 | 預設值 | 說明 |
|----------|------|----------|--------|------|
| 預設貨幣 | `default_currency` | string | "JPY" | 主要進口貨幣 |
| JPY兌TWD | `jpy_to_twd_rate` | number | 0.21 | 日幣匯率 |
| USD兌TWD | `usd_to_twd_rate` | number | 31.5 | 美元匯率 |
| 匯率更新頻率 | `exchange_rate_update_frequency` | string | "daily" | daily/weekly/manual |

### **📋 業務規則設定**
| 設定項目 | 鍵值 | 資料類型 | 預設值 | 說明 |
|----------|------|----------|--------|------|
| 預設信用額度 | `default_credit_limit` | number | 100000 | 新客戶預設額度 |
| 庫存警戒水位 | `low_stock_threshold` | number | 10 | 低於此數量發出警告 |
| 訂單保留天數 | `order_reservation_days` | number | 3 | 未確認訂單自動取消天數 |
| 發票開立期限 | `invoice_deadline_days` | number | 7 | 銷售後多久內必須開發票 |

### **🤖 AI與外部服務**
| 設定項目 | 鍵值 | 資料類型 | 預設值 | 說明 |
|----------|------|----------|--------|------|
| Gemini API金鑰 | `gemini_api_key` | encrypted | "" | AI文件辨識服務 |
| LINE Channel Token | `line_channel_token` | encrypted | "" | LINE Bot存取權杖 |
| LINE Channel Secret | `line_channel_secret` | encrypted | "" | LINE Bot密鑰 |
| Google OAuth ID | `google_client_id` | string | "" | Google登入用 |
| Google OAuth Secret | `google_client_secret` | encrypted | "" | Google登入密鑰 |

### **📱 系統行為設定**
| 設定項目 | 鍵值 | 資料類型 | 預設值 | 說明 |
|----------|------|----------|--------|------|
| 啟用雙重價格 | `enable_dual_pricing` | boolean | true | 顯示價格 vs 實際價格 |
| 啟用庫存管理 | `enable_inventory_tracking` | boolean | true | 是否追蹤庫存 |
| 啟用LINE Bot | `enable_line_bot` | boolean | false | LINE Bot功能開關 |
| 啟用AI辨識 | `enable_ai_recognition` | boolean | false | 報單AI辨識開關 |
| 投資方資料隔離 | `enable_investor_isolation` | boolean | true | 必須保持開啟 |

---

## 🔧 技術實作規格

### **資料庫Schema**
```sql
CREATE TABLE system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  data_type ENUM('string', 'number', 'boolean', 'encrypted') NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(50)
);

-- 索引
CREATE INDEX idx_settings_category ON system_settings(category);
CREATE INDEX idx_settings_key ON system_settings(setting_key);
```

### **API端點設計**
```typescript
// GET /api/system/settings
// 取得所有設定（敏感資料遮罩）
{
  "success": true,
  "data": {
    "company": {
      "company_name": "滿帆洋行有限公司",
      "company_tax_id": "12345678"
    },
    "taxation": {
      "vat_rate": 0.05,
      "import_duty_rate": 0.20
    },
    "services": {
      "gemini_api_key": "********ed" // 只顯示末兩碼
    }
  }
}

// PUT /api/system/settings
// 更新設定
{
  "setting_key": "vat_rate",
  "setting_value": "0.05"
}

// POST /api/system/settings/test-connection
// 測試外部服務連線
{
  "service": "gemini_api",
  "api_key": "actual_key_for_testing"
}
```

### **前端介面設計**
```typescript
// pages/admin/system-settings.tsx
import { Form, InputNumber, Switch, Input, Button, Card, Divider } from 'antd';

const SystemSettingsPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">系統設定</h1>

      <Form form={form} layout="vertical" onFinish={handleSave}>
        {/* 公司基本資料 */}
        <Card title="🏢 公司基本資料" className="mb-4">
          <Form.Item name="company_name" label="公司名稱" rules={[{ required: true }]}>
            <Input placeholder="滿帆洋行有限公司" />
          </Form.Item>

          <Form.Item name="company_tax_id" label="統一編號" rules={[{ pattern: /^\d{8}$/ }]}>
            <Input placeholder="12345678" maxLength={8} />
          </Form.Item>
        </Card>

        {/* 稅率設定 */}
        <Card title="💰 稅率設定" className="mb-4">
          <Form.Item name="vat_rate" label="營業稅率 (%)" rules={[{ required: true }]}>
            <InputNumber min={0} max={1} step={0.01} formatter={value => `${(value * 100).toFixed(1)}%`} />
          </Form.Item>

          <Form.Item name="import_duty_rate" label="關稅稅率 (%)" rules={[{ required: true }]}>
            <InputNumber min={0} max={1} step={0.01} formatter={value => `${(value * 100).toFixed(1)}%`} />
          </Form.Item>
        </Card>

        {/* API金鑰設定 */}
        <Card title="🤖 AI與外部服務" className="mb-4">
          <Form.Item name="gemini_api_key" label="Gemini API金鑰">
            <Input.Password
              placeholder="請輸入Gemini API金鑰"
              addonAfter={
                <Button size="small" onClick={() => testConnection('gemini')}>
                  測試連線
                </Button>
              }
            />
          </Form.Item>

          <Form.Item name="line_channel_token" label="LINE Channel Token">
            <Input.Password placeholder="LINE Bot存取權杖" />
          </Form.Item>
        </Card>

        {/* 系統開關 */}
        <Card title="📱 功能開關" className="mb-4">
          <Form.Item name="enable_dual_pricing" label="啟用雙重價格機制" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="enable_line_bot" label="啟用LINE Bot" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="enable_ai_recognition" label="啟用AI報單辨識" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Card>

        <Button type="primary" htmlType="submit" loading={loading} size="large">
          儲存設定
        </Button>
      </Form>
    </div>
  );
};
```

---

## 🔒 安全考量

### **敏感資料保護**
- API金鑰類資料必須加密儲存
- 前端顯示時遮罩處理
- 只有SUPER_ADMIN角色可以修改
- 所有變更記錄操作日誌

### **資料驗證**
- 稅率範圍: 0-1 之間的小數
- 統一編號: 必須8位數字
- API金鑰: 測試連線後才允許儲存
- 必要設定: 不允許刪除或留空

### **權限控制**
```typescript
// 權限檢查中間件
export const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      error: '僅超級管理員可以修改系統設定'
    });
  }
  next();
};
```

---

## 📋 實作檢查清單

### **後端開發**
- [ ] 建立 system_settings 資料表
- [ ] 實作設定的CRUD API
- [ ] 加密/解密機制
- [ ] 外部服務連線測試功能
- [ ] 操作日誌記錄

### **前端開發**
- [ ] 系統設定頁面UI
- [ ] 分類顯示不同設定
- [ ] 敏感資料遮罩顯示
- [ ] 即時驗證輸入格式
- [ ] 測試連線功能

### **安全測試**
- [ ] 權限控制測試
- [ ] 敏感資料加密驗證
- [ ] API金鑰不洩漏測試
- [ ] 操作日誌完整性

---

**重要**: 這個模組是系統的神經中樞，任何變更都要謹慎測試，確保不會影響現有功能運作。