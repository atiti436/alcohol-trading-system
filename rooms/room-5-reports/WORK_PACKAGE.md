# 📦 Room-5 工作包 - 報表列印房間

## 🎯 **工作包概述**

Room-5負責系統的所有報表功能，包括數據分析報表、出貨單、對帳單列印，以及電子發票API預留架構。

## 📚 **必讀單一事實來源 (開發前必讀)** ⚠️重要
- `../shared/docs/ID_DEFINITIONS.md` - **所有ID和編號規則**
- `../shared/docs/DATA_MODELS.md` - **統一資料模型定義**
- `../shared/docs/API_SPEC.md` - API規格標準

## 🎨 **體驗優化文檔** (品質提升) ⭐新增
- `../shared/docs/UI_COMPONENT_LIBRARY.md` - **UI組件庫標準** 🎨統一設計
- `../shared/docs/RESPONSIVE_DESIGN_SPEC.md` - **響應式設計規範** 📱手機友善
- `../shared/docs/PERFORMANCE_OPTIMIZATION.md` - **效能優化指南** ⚡提升速度
- `../shared/docs/CODE_QUALITY_STANDARDS.md` - **程式碼品質管控** 🔧維護性

---

## 📋 **任務清單**

### **💎 階段一：報表核心系統 (Week 1-2)**

#### **任務1.1：報表引擎基礎架構**
**預估時間**: 4-5天 | **複雜度**: 🔴 高 | **Token預算**: 50-60k

**功能需求**:
- 報表數據查詢引擎：支援複雜條件篩選
- 報表模板系統：可配置的報表格式
- 數據權限過濾：投資方vs管理員不同數據範圍
- 報表快取機制：提升大數據量報表性能

**技術規格**:
```typescript
interface ReportEngine {
  generateReport(template: ReportTemplate, filters: ReportFilters): Promise<ReportData>;
  exportReport(data: ReportData, format: ExportFormat): Promise<Buffer>;
  cacheReport(reportId: string, data: ReportData): void;
}

interface ReportTemplate {
  id: string;
  name: string;
  type: 'sales' | 'inventory' | 'financial' | 'customer';
  columns: ReportColumn[];
  filters: FilterDefinition[];
  permissions: RolePermission[];
}
```

**交付標準**:
- [ ] 報表引擎核心完成
- [ ] 模板系統可配置
- [ ] 數據權限正確實作
- [ ] 快取機制運作正常

#### **任務1.2：圖表視覺化系統**
**預估時間**: 3-4天 | **複雜度**: 🟡 中等 | **Token預算**: 40-50k

**功能需求**:
- Apache ECharts整合：中文友善的圖表庫
- 多種圖表類型：折線圖、柱狀圖、餅圖、散點圖
- 動態圖表：支援即時數據更新
- 圖表匯出：PNG、SVG、PDF格式

**技術規格**:
```typescript
interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'scatter';
  data: ChartDataPoint[];
  options: EChartsOption;
  responsive: boolean;
}
```

**交付標準**:
- [ ] ECharts整合完成
- [ ] 多種圖表類型支援
- [ ] 響應式設計適配
- [ ] 匯出功能正常

### **📋 階段二：出貨單和對帳單系統 (Week 2-3)**

#### **任務2.1：出貨單列印系統**
**預估時間**: 4-5天 | **複雜度**: 🔴 高 | **Token預算**: 55-65k

**功能需求**:
- 出貨單生成界面：客戶選擇、商品選擇、數量設定
- PDF模板設計：專業的出貨單格式
- 數據隔離處理：投資方vs管理員看到不同價格
- 批量列印功能：一次處理多張出貨單

**技術規格**:
```typescript
interface ShippingDocument {
  id: string;
  customerId: string;
  customerInfo: CustomerInfo;
  items: ShippingItem[];
  totalAmount: number;
  displayAmount: number; // 投資方看到的金額
  shippingDate: Date;
  status: 'draft' | 'confirmed' | 'shipped';
}

interface ShippingItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  displayPrice: number; // 投資方看到的價格
  amount: number;
}
```

**交付標準**:
- [ ] 出貨單生成界面完成
- [ ] PDF模板設計專業
- [ ] 數據隔離正確實作
- [ ] 批量列印功能正常

#### **任務2.2：對帳單生成系統**
**預估時間**: 4-5天 | **複雜度**: 🔴 高 | **Token預算**: 55-65k

**功能需求**:
- 對帳單生成邏輯：期間統計、餘額計算
- 帳務明細整理：出貨記錄、收款記錄、調整項目
- Excel和PDF匯出：支援不同格式需求
- 自動對帳提醒：系統主動提醒客戶對帳

**技術規格**:
```typescript
interface AccountStatement {
  customerId: string;
  periodStart: Date;
  periodEnd: Date;
  transactions: AccountTransaction[];
  summary: {
    totalDebit: number;
    totalCredit: number;
    balance: number;
    displayBalance: number; // 投資方看到的餘額
  };
}

interface AccountTransaction {
  date: Date;
  documentNumber: string;
  description: string;
  debitAmount?: number;
  creditAmount?: number;
  balance: number;
}
```

**交付標準**:
- [ ] 對帳單生成邏輯正確
- [ ] 帳務明細完整
- [ ] 多格式匯出功能
- [ ] 自動提醒機制

### **⚡ 階段三：電子發票預留和報表優化 (Week 3-3.5)**

#### **任務3.1：電子發票API預留架構**
**預估時間**: 2-3天 | **複雜度**: 🟡 中等 | **Token預算**: 30-40k

**功能需求**:
- 電子發票抽象層：支援多家服務商
- API端點預留：開立、查詢、作廢、折讓
- 資料表結構：發票記錄、明細、狀態
- UI預留位置：設定頁面、操作按鈕

**技術規格**:
```typescript
interface EInvoiceService {
  issueInvoice(data: InvoiceData): Promise<InvoiceResult>;
  queryInvoice(invoiceNumber: string): Promise<InvoiceDetail>;
  voidInvoice(invoiceNumber: string, reason: string): Promise<VoidResult>;
}

// 資料庫預留結構
interface EInvoiceRecord {
  id: string;
  saleId: string;
  invoiceNumber: string;
  status: 'issued' | 'voided' | 'allowance';
  provider: string;
  rawData: any;
}
```

**交付標準**:
- [ ] 抽象層介面設計完成
- [ ] API端點預留就位
- [ ] 資料表結構建立
- [ ] UI預留位置標記

#### **任務3.2：報表系統優化**
**預估時間**: 2-3天 | **複雜度**: 🟡 中等 | **Token預算**: 35-45k

**功能需求**:
- 報表性能優化：大數據量處理、分頁載入
- 報表排程功能：定時生成、自動發送
- 報表權限精細化：欄位級別權限控制
- 報表範本管理：使用者自定義報表格式

**技術規格**:
```typescript
interface ReportSchedule {
  id: string;
  name: string;
  templateId: string;
  schedule: CronExpression;
  recipients: string[];
  enabled: boolean;
}
```

**交付標準**:
- [ ] 性能優化達標
- [ ] 排程功能正常
- [ ] 權限控制精確
- [ ] 範本管理完整

---

## 🔒 **數據隔離重點實作**

### **報表數據過濾**
⚠️ **核心安全要求**：所有報表都必須正確實作數據隔離！

```typescript
// 投資方報表數據過濾範例
function filterReportDataByRole(data: ReportData, userRole: UserRole): ReportData {
  if (userRole === 'INVESTOR') {
    return {
      ...data,
      rows: data.rows.map(row => ({
        ...row,
        // 隱藏真實價格，只顯示協議價格
        actualPrice: undefined,
        displayPrice: row.investorPrice,
        // 隱藏老闆傭金
        commission: undefined,
        // 隱藏個人調貨資料
        personalPurchases: undefined
      }))
    };
  }
  return data; // 管理員看到完整數據
}
```

### **出貨單價格隔離**
```typescript
// 出貨單數據隔離
function createShippingDocument(saleData: SaleData, userRole: UserRole): ShippingDocument {
  return {
    ...saleData,
    items: saleData.items.map(item => ({
      ...item,
      unitPrice: userRole === 'INVESTOR' ? item.investorPrice : item.actualPrice,
      displayPrice: item.investorPrice, // 投資方永遠看到協議價
      amount: userRole === 'INVESTOR'
        ? item.quantity * item.investorPrice
        : item.quantity * item.actualPrice
    }))
  };
}
```

---

## 📊 **列印格式規範**

### **出貨單格式**
```css
/* 出貨單專用列印樣式 */
@media print {
  .shipping-document {
    font-family: 'Microsoft JhengHei', sans-serif;
    font-size: 12px;
    line-height: 1.4;
  }

  .document-header {
    border-bottom: 2px solid black;
    padding-bottom: 10px;
    margin-bottom: 20px;
  }

  .customer-section {
    background-color: #f5f5f5;
    padding: 10px;
    margin-bottom: 20px;
  }

  .no-print {
    display: none !important;
  }
}
```

### **對帳單格式**
- A4紙張大小
- 標準商業格式
- 公司Logo和資訊
- 客戶資訊區塊
- 交易明細表格
- 總額和餘額摘要
- 簽名區域

---

## 🧪 **測試要求**

### **報表功能測試**
- [ ] **大數據量測試**：10萬筆記錄報表生成
- [ ] **權限隔離測試**：投資方vs管理員數據差異
- [ ] **匯出功能測試**：PDF、Excel、CSV格式
- [ ] **圖表響應測試**：不同螢幕尺寸適配

### **列印功能測試**
- [ ] **出貨單列印**：A4格式、邊距正確、內容完整
- [ ] **對帳單列印**：數據準確、格式專業
- [ ] **批量列印**：多張單據連續列印
- [ ] **跨瀏覽器列印**：Chrome、Firefox、Safari測試

### **電子發票測試**
- [ ] **API預留驗證**：介面定義正確
- [ ] **資料結構測試**：資料表建立成功
- [ ] **UI預留檢查**：按鈕位置和功能提示

---

## 📋 **交付檢查清單**

### **報表系統**
- [ ] 報表引擎核心功能完整
- [ ] 數據權限過濾正確
- [ ] 圖表視覺化美觀實用
- [ ] 匯出功能多格式支援
- [ ] 性能指標達標

### **列印系統**
- [ ] 出貨單生成和列印正常
- [ ] 對帳單邏輯計算正確
- [ ] PDF模板專業美觀
- [ ] 批量處理功能穩定

### **預留架構**
- [ ] 電子發票API介面完整
- [ ] 資料庫結構預留完成
- [ ] UI預留位置標記清楚
- [ ] 文檔說明詳細

---

## 🔄 **與其他房間協作**

### **依賴關係**
- **Room-1**: 用戶權限和角色管理
- **Room-2**: 客戶和商品基礎資料
- **Room-3**: 進貨和庫存數據
- **Room-4**: 銷售和財務數據
- **Room-7**: UI組件和設計規範

### **提供給其他房間**
- **統一匯出功能**: 其他房間可重用的匯出組件
- **報表組件**: 可嵌入其他頁面的報表元件
- **列印服務**: 統一的PDF生成服務

---

## ⚠️ **特別注意事項**

### **數據隔離檢查**
1. **每個報表都要檢查權限**
2. **價格欄位必須按角色顯示**
3. **敏感資料不能出現在投資方報表**
4. **匯出功能也要遵循權限控制**

### **列印品質要求**
1. **格式專業**：符合商業文件標準
2. **資料準確**：數字計算絕對正確
3. **版面整齊**：A4紙張完美適配
4. **中文支援**：字體和編碼正確顯示

### **性能考量**
1. **大數據處理**：分頁載入、非同步處理
2. **記憶體管理**：避免記憶體洩漏
3. **快取策略**：合理的快取機制
4. **並發控制**：多用戶同時使用

---

## 📊 **成功指標**

### **功能指標**
- [ ] 所有報表類型都能正常生成
- [ ] 列印功能在各種環境都能使用
- [ ] 電子發票預留架構完整可擴展
- [ ] 數據隔離100%正確實作

### **性能指標**
- **報表生成時間** < 5秒 (1萬筆資料)
- **PDF生成速度** < 3秒
- **大報表匯出** < 30秒 (10萬筆資料)
- **圖表渲染** < 2秒

### **品質指標**
- **數據準確率** = 100%
- **列印成功率** > 99%
- **跨瀏覽器兼容** > 95%
- **用戶滿意度** > 4.5/5

**歡迎來到數據的世界！讓我們打造最專業的報表系統！** 📊✨