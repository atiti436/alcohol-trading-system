# ⚡ 電子發票API預留擴建架構

## 🎯 架構目標

為系統預留電子發票API整合能力，採用模組化設計，未來可彈性接入各種電子發票服務商（如：財政部、關貿、中華電信等）。

---

## 📋 **電子發票服務架構**

### **核心介面設計**
```typescript
// 電子發票服務基礎介面
interface EInvoiceService {
  // 服務商資訊
  getProvider(): EInvoiceProvider;

  // 開立電子發票
  issueInvoice(data: InvoiceData): Promise<InvoiceResult>;

  // 查詢電子發票
  queryInvoice(invoiceNumber: string): Promise<InvoiceDetail>;

  // 作廢電子發票
  voidInvoice(invoiceNumber: string, reason: string): Promise<VoidResult>;

  // 折讓電子發票
  allowanceInvoice(data: AllowanceData): Promise<AllowanceResult>;

  // 驗證連線狀態
  validateConnection(): Promise<boolean>;
}

// 電子發票資料結構
interface InvoiceData {
  // 基本資訊
  buyerName: string;
  buyerTaxId?: string;
  buyerAddress?: string;

  // 商品明細
  items: InvoiceItem[];

  // 稅額資訊
  taxType: 'taxed' | 'zero_tax' | 'tax_free';
  totalAmount: number;
  taxAmount: number;

  // 其他資訊
  remarks?: string;
  carrierType?: CarrierType;
  carrierId?: string;
  donateCode?: string; // 捐贈碼
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}
```

---

## 🏗️ **服務提供商抽象層**

### **服務商註冊機制**
```typescript
// 服務商註冊器
class EInvoiceProviderRegistry {
  private providers: Map<string, EInvoiceService> = new Map();

  register(name: string, service: EInvoiceService): void {
    this.providers.set(name, service);
  }

  get(name: string): EInvoiceService | undefined {
    return this.providers.get(name);
  }

  getAvailable(): string[] {
    return Array.from(this.providers.keys());
  }
}

// 服務商管理器
class EInvoiceManager {
  private registry = new EInvoiceProviderRegistry();
  private activeProvider?: EInvoiceService;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // 預留常見服務商初始化
    // this.registry.register('mot', new MOTEInvoiceService());
    // this.registry.register('tradevan', new TradevanEInvoiceService());
    // this.registry.register('cht', new CHTEInvoiceService());
  }

  setActiveProvider(providerName: string): boolean {
    const provider = this.registry.get(providerName);
    if (provider) {
      this.activeProvider = provider;
      return true;
    }
    return false;
  }

  async issueInvoice(data: InvoiceData): Promise<InvoiceResult> {
    if (!this.activeProvider) {
      throw new Error('No active e-invoice provider');
    }
    return await this.activeProvider.issueInvoice(data);
  }
}
```

---

## 🔧 **API預留設計**

### **電子發票API端點**
```typescript
// 預留的API路由結構
// /api/e-invoice/config - 設定管理
// /api/e-invoice/issue - 開立發票
// /api/e-invoice/query - 查詢發票
// /api/e-invoice/void - 作廢發票
// /api/e-invoice/allowance - 折讓發票

// 設定管理API
app.post('/api/e-invoice/config', async (req, res) => {
  // 設定電子發票服務商和參數
  const { provider, config } = req.body;

  // 預留：儲存設定到資料庫
  // await saveEInvoiceConfig(provider, config);

  res.json({
    success: true,
    message: '電子發票設定已儲存（功能開發中）'
  });
});

// 開立發票API
app.post('/api/e-invoice/issue', async (req, res) => {
  try {
    // 預留：從銷售單據轉換為電子發票資料
    const invoiceData = await convertSaleToInvoiceData(req.body.saleId);

    // 預留：調用電子發票服務
    // const result = await eInvoiceManager.issueInvoice(invoiceData);

    res.json({
      success: true,
      message: '電子發票開立功能開發中',
      data: { invoiceNumber: 'PREVIEW-' + Date.now() }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

---

## 🗃️ **資料庫預留結構**

### **電子發票相關資料表**
```sql
-- 電子發票設定表
CREATE TABLE e_invoice_config (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL, -- 服務商名稱
  config_data JSONB NOT NULL,    -- 設定資料（加密）
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 電子發票記錄表
CREATE TABLE e_invoices (
  id SERIAL PRIMARY KEY,
  sale_id INT REFERENCES sales(id),           -- 關聯銷售單
  invoice_number VARCHAR(20) UNIQUE NOT NULL,  -- 發票號碼
  invoice_date DATE NOT NULL,                  -- 發票日期

  -- 買方資訊
  buyer_name VARCHAR(100) NOT NULL,
  buyer_tax_id VARCHAR(20),
  buyer_address TEXT,

  -- 金額資訊
  total_amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) NOT NULL,
  tax_type VARCHAR(20) NOT NULL,

  -- 載具資訊
  carrier_type VARCHAR(20),
  carrier_id VARCHAR(50),
  donate_code VARCHAR(10),

  -- 狀態資訊
  status VARCHAR(20) DEFAULT 'issued', -- issued, voided, allowance
  provider VARCHAR(50) NOT NULL,
  provider_invoice_id VARCHAR(100),

  -- 原始資料
  raw_request JSONB,
  raw_response JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 電子發票明細表
CREATE TABLE e_invoice_items (
  id SERIAL PRIMARY KEY,
  e_invoice_id INT REFERENCES e_invoices(id) ON DELETE CASCADE,
  sequence_number INT NOT NULL,

  product_name VARCHAR(200) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
);

-- 電子發票作廢/折讓記錄表
CREATE TABLE e_invoice_voids (
  id SERIAL PRIMARY KEY,
  e_invoice_id INT REFERENCES e_invoices(id),
  void_type VARCHAR(20) NOT NULL, -- void, allowance
  void_reason TEXT,
  void_amount DECIMAL(10,2),
  void_date DATE NOT NULL,

  provider_void_id VARCHAR(100),
  raw_request JSONB,
  raw_response JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎨 **UI預留設計**

### **電子發票設定頁面**
```tsx
<Card title="⚡ 電子發票設定">
  <Alert
    type="info"
    message="電子發票功能開發中"
    description="此功能預計在下個版本推出，目前可以進行基本設定"
    showIcon
    className="mb-4"
  />

  <Form layout="vertical">
    <Form.Item label="服務商選擇">
      <Select placeholder="選擇電子發票服務商" disabled>
        <Option value="mot">財政部電子發票</Option>
        <Option value="tradevan">關貿網路</Option>
        <Option value="cht">中華電信</Option>
      </Select>
    </Form.Item>

    <Form.Item label="商家統一編號">
      <Input placeholder="請輸入統一編號" />
    </Form.Item>

    <Form.Item label="API金鑰">
      <Input.Password placeholder="預留API金鑰設定" />
    </Form.Item>

    <Form.Item label="測試模式">
      <Switch
        checkedChildren="測試"
        unCheckedChildren="正式"
        defaultChecked={true}
      />
    </Form.Item>

    <Button type="primary" disabled>
      儲存設定（開發中）
    </Button>
  </Form>
</Card>
```

### **銷售單據電子發票按鈕**
```tsx
// 在銷售單詳細頁面增加電子發票相關按鈕
<div className="invoice-actions">
  <Space>
    <Button
      icon={<FileTextOutlined />}
      onClick={showEInvoicePreview}
      disabled={!canIssueEInvoice}
    >
      開立電子發票
    </Button>

    <Button
      icon={<SearchOutlined />}
      onClick={queryEInvoice}
      disabled={!saleData.eInvoiceNumber}
    >
      查詢電子發票
    </Button>

    <Button
      danger
      icon={<CloseOutlined />}
      onClick={voidEInvoice}
      disabled={!canVoidEInvoice}
    >
      作廢電子發票
    </Button>
  </Space>
</div>

// 電子發票狀態顯示
{saleData.eInvoiceNumber && (
  <Card title="📄 電子發票資訊" size="small">
    <Descriptions size="small" column={2}>
      <Descriptions.Item label="發票號碼">
        {saleData.eInvoiceNumber}
      </Descriptions.Item>
      <Descriptions.Item label="開立日期">
        {saleData.eInvoiceDate}
      </Descriptions.Item>
      <Descriptions.Item label="狀態">
        <Tag color={getEInvoiceStatusColor(saleData.eInvoiceStatus)}>
          {saleData.eInvoiceStatus}
        </Tag>
      </Descriptions.Item>
      <Descriptions.Item label="服務商">
        {saleData.eInvoiceProvider}
      </Descriptions.Item>
    </Descriptions>
  </Card>
)}
```

---

## 📊 **整合點設計**

### **與銷售模組整合**
```typescript
// 在銷售單建立時預留電子發票標記
interface SaleOrder {
  // ... 現有欄位

  // 電子發票相關預留欄位
  requireEInvoice?: boolean;        // 是否需要開立電子發票
  eInvoiceNumber?: string;          // 電子發票號碼
  eInvoiceDate?: Date;              // 電子發票開立日期
  eInvoiceStatus?: EInvoiceStatus;  // 電子發票狀態
  eInvoiceProvider?: string;        // 電子發票服務商

  // 買方電子發票資訊
  buyerInvoiceInfo?: {
    carrierType?: CarrierType;      // 載具類型
    carrierId?: string;             // 載具號碼
    donateCode?: string;            // 捐贈碼
  };
}

// 銷售流程中的電子發票處理
class SaleService {
  async createSale(saleData: CreateSaleRequest): Promise<Sale> {
    const sale = await this.saveSale(saleData);

    // 如果需要電子發票，加入開立隊列
    if (saleData.requireEInvoice) {
      await this.queueEInvoiceIssue(sale.id);
    }

    return sale;
  }

  private async queueEInvoiceIssue(saleId: number): Promise<void> {
    // 預留：將電子發票開立任務加入隊列
    console.log(`預留：銷售單 ${saleId} 需要開立電子發票`);
  }
}
```

### **與客戶模組整合**
```typescript
// 客戶資料預留電子發票偏好設定
interface Customer {
  // ... 現有欄位

  // 電子發票偏好設定
  invoicePreferences?: {
    defaultCarrierType?: CarrierType;
    defaultCarrierId?: string;
    alwaysRequireEInvoice?: boolean;
    defaultDonateCode?: string;
  };
}
```

---

## ⚙️ **設定檔結構**

### **環境變數預留**
```env
# 電子發票服務設定
E_INVOICE_PROVIDER=disabled
E_INVOICE_TEST_MODE=true

# 財政部電子發票設定
MOT_E_INVOICE_API_URL=
MOT_E_INVOICE_API_KEY=
MOT_E_INVOICE_COMPANY_ID=

# 關貿網路設定
TRADEVAN_API_URL=
TRADEVAN_API_KEY=
TRADEVAN_MERCHANT_ID=

# 中華電信設定
CHT_API_URL=
CHT_API_KEY=
CHT_CLIENT_ID=
```

### **設定檔範例**
```json
{
  "eInvoice": {
    "enabled": false,
    "provider": "disabled",
    "testMode": true,
    "config": {
      "companyTaxId": "",
      "companyName": "",
      "apiEndpoint": "",
      "apiKey": "",
      "timeout": 30000
    },
    "features": {
      "autoIssue": false,
      "carrierSupport": true,
      "donationSupport": true,
      "allowanceSupport": true
    }
  }
}
```

---

## 🚀 **實作優先序**

### **Phase 1: 基礎架構（即將實作）**
- ✅ 資料庫表格建立
- ✅ 基礎介面定義
- ✅ UI預留位置
- ⏳ 服務商註冊機制

### **Phase 2: 測試整合（未來版本）**
- 🔄 選定一家服務商進行POC
- 🔄 開立發票功能實作
- 🔄 查詢作廢功能實作

### **Phase 3: 生產部署（未來版本）**
- 🔄 多服務商支援
- 🔄 自動開立功能
- 🔄 報表統計功能

---

## 💡 **擴建建議**

1. **選擇服務商考量**：
   - API穩定性和文檔完整度
   - 費用結構（按張計費 vs 月費）
   - 技術支援品質
   - 功能完整度（載具、捐贈、折讓等）

2. **開發優先序**：
   - 先實作基礎開立功能
   - 再增加載具和捐贈功能
   - 最後實作折讓和批次功能

3. **測試策略**：
   - 使用測試環境進行完整測試
   - 準備多種測試情境
   - 建立自動化測試腳本

**此架構為電子發票功能預留了完整的擴展空間，確保未來可以順利整合！** ⚡