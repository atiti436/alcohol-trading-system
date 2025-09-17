# 數據報表規格 (Reports Specification)

## 🎯 目標
為老闆提供全面的業務分析報表，包含銷售、採購、庫存、財務等各面向的數據洞察。

---

## 📊 報表清單與規格

### **1. 銷售業績報表**

#### **📈 月度銷售統計**
**篩選條件:**
- 時間範圍: 月份選擇器 (預設當月)
- 客戶: 下拉選單 (可多選，預設全部)
- 產品分類: 清酒/威士忌/其他 (可多選)
- 投資方: 下拉選單 (INVESTOR角色只能看自己的)

**顯示欄位:**
| 欄位名稱 | 計算公式 | 格式 | 說明 |
|----------|----------|------|------|
| 銷售數量 | SUM(quantity) | 1,234 瓶 | 總銷售瓶數 |
| 銷售金額 | SUM(line_total) | $1,234,567 | 含稅銷售總額 |
| 毛利金額 | SUM(unit_price - unit_cost) × quantity | $234,567 | 銷售毛利 |
| 毛利率 | 毛利金額 ÷ 銷售金額 × 100% | 23.45% | 獲利率 |
| 平均客單價 | 銷售金額 ÷ 客戶數 | $12,345 | 每客戶平均消費 |
| 熱銷產品TOP5 | 按銷售數量排序 | 表格 | 最受歡迎商品 |

**預期樣式:**
```
📊 2024年9月銷售統計

總覽
┌─────────────┬────────────┬────────────┐
│ 銷售數量    │ 1,234 瓶   │ ↑15.2%     │
│ 銷售金額    │ $2,345,678 │ ↑8.7%      │
│ 毛利金額    │ $567,890   │ ↑12.3%     │
│ 毛利率      │ 24.2%      │ ↑1.8%      │
└─────────────┴────────────┴────────────┘

熱銷產品TOP5
1. 山崎18年威士忌 - 89瓶 ($1,890,000)
2. 白鶴特級清酒 - 156瓶 ($234,000)
...
```

#### **📋 客戶銷售明細**
**篩選條件:**
- 時間範圍: 起迄日期選擇器
- 客戶: 下拉選單 (必選)
- 訂單狀態: 全部/已確認/已交貨/已取消

**顯示欄位:**
- 銷售單號、銷售日期、商品名稱、數量、單價、金額、狀態
- 小計: 該客戶總銷售金額、總數量、平均單價

---

### **2. 採購成本報表**

#### **💰 月度採購分析**
**篩選條件:**
- 時間範圍: 月份選擇器
- 供應商: 下拉選單 (可多選)
- 貨幣: JPY/USD/TWD

**顯示欄位:**
| 欄位名稱 | 計算公式 | 格式 | 說明 |
|----------|----------|------|------|
| 採購數量 | SUM(quantity) | 1,234 瓶 | 總採購瓶數 |
| 採購金額(原幣) | SUM(unit_cost × quantity) | ¥1,234,567 | 外幣金額 |
| 採購金額(台幣) | 原幣金額 × 匯率 | $234,567 | 台幣成本 |
| 平均採購單價 | 採購金額 ÷ 採購數量 | $189/瓶 | 每瓶平均成本 |
| 匯差影響 | (期末匯率-期初匯率) × 外幣庫存 | $12,345 | 匯率波動損益 |

#### **📦 供應商採購統計**
**篩選條件:**
- 時間範圍: 季度或年度選擇
- 供應商評估維度: 金額/數量/交期/品質

**顯示欄位:**
- 供應商排名、採購金額占比、準時交貨率、退貨率、付款條件

---

### **3. 庫存管理報表**

#### **📋 庫存現況總覽**
**篩選條件:**
- 倉庫: 下拉選單 (可多選)
- 庫存警戒: 正常/低庫存/缺貨
- 產品分類: 下拉選單

**顯示欄位:**
| 欄位名稱 | 計算公式 | 格式 | 說明 |
|----------|----------|------|------|
| 現有庫存 | quantity_on_hand | 1,234 瓶 | 實際庫存數 |
| 保留庫存 | reserved_quantity | 123 瓶 | 已預留數量 |
| 可用庫存 | 現有庫存 - 保留庫存 | 1,111 瓶 | 可銷售數量 |
| 庫存價值 | 庫存數量 × 平均成本 | $1,234,567 | 庫存總價值 |
| 週轉率 | 年銷售數量 ÷ 平均庫存 | 4.2 次/年 | 庫存週轉速度 |
| 庫存天數 | 365 ÷ 週轉率 | 87 天 | 平均存貨天數 |

**預期樣式:**
```
📦 庫存現況總覽 (2024/09/17)

庫存警報
🔴 缺貨商品: 5 項
🟡 低庫存商品: 12 項
🟢 正常庫存: 248 項

庫存價值分析
┌─────────────┬────────────┬────────────┐
│ 總庫存價值  │ $12,345,678│ 💰         │
│ 高價值商品  │ $8,901,234 │ 72%        │
│ 滯銷商品    │ $567,890   │ 5%         │
│ 庫存週轉率  │ 4.2 次/年  │ ↑0.3       │
└─────────────┴────────────┴────────────┘
```

#### **⚠️ 庫存異常報表**
**篩選條件:**
- 異常類型: 低庫存/過量庫存/滯銷商品/呆料
- 時間範圍: 查詢期間

**顯示欄位:**
- 商品代碼、商品名稱、現有庫存、安全庫存、異常原因、建議行動

---

### **4. 財務分析報表**

#### **💳 應收帳款分析**
**篩選條件:**
- 客戶: 下拉選單 (可多選)
- 帳齡區間: 0-30天/31-60天/61-90天/90天以上
- 金額範圍: 最小值-最大值

**顯示欄位:**
| 帳齡區間 | 金額 | 占比 | 客戶數 | 平均天數 |
|----------|------|------|--------|----------|
| 0-30天 | $1,234,567 | 65% | 45 | 15天 |
| 31-60天 | $567,890 | 30% | 23 | 45天 |
| 61-90天 | $89,012 | 4% | 8 | 75天 |
| 90天以上 | $23,456 | 1% | 3 | 120天 |

#### **📈 現金流量報表**
**篩選條件:**
- 時間範圍: 月份/季度選擇器
- 現金流類型: 營業/投資/融資活動

**顯示欄位:**
```
💰 現金流量表 (2024年Q3)

營業活動現金流
├─ 銷售收款: $2,345,678
├─ 採購付款: ($1,234,567)
├─ 營運費用: ($234,567)
└─ 營業淨流入: $876,544

投資活動現金流
├─ 設備購置: ($45,678)
└─ 投資淨流出: ($45,678)

期末現金餘額: $2,345,678
```

---

### **5. 投資方專用報表**

#### **🔒 投資方業績報表**
**篩選條件:**
- 僅顯示該投資方的資料
- 時間範圍: 月份/季度/年度

**顯示欄位 (隱藏敏感資訊):**
| 欄位名稱 | 顯示內容 | 隱藏內容 |
|----------|----------|----------|
| 銷售數量 | ✅ 顯示 | - |
| 銷售金額 | ✅ 顯示價格 | ❌ 實際價格 |
| 商品名稱 | ✅ 顯示 | - |
| 客戶資訊 | ✅ 顯示 | ❌ 客戶真實姓名 |
| 毛利資訊 | ❌ 隱藏 | ❌ 成本價格 |
| 個人採購 | ❌ 隱藏 | ❌ 完全隱藏 |

---

### **6. AI數據分析報表**

#### **🤖 AI辨識統計**
**篩選條件:**
- 時間範圍: 月份選擇器
- 辨識類型: 報單/發票/憑證
- 準確度範圍: 0-100%

**顯示欄位:**
- 總辨識次數、成功率、平均準確度、錯誤類型分析、改善建議

#### **📱 LINE Bot使用統計**
**篩選條件:**
- 時間範圍: 週/月/季度
- 功能類型: 成本計算/訂單查詢/庫存查詢

**顯示欄位:**
- 活躍用戶數、訊息總數、功能使用率、回應時間分析

---

## 🖥️ 報表介面設計

### **報表首頁 Dashboard**
```typescript
// pages/reports/dashboard.tsx
const ReportsDashboard = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">數據報表中心</h1>

      {/* 快速數據卡片 */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="本月銷售額"
              value={2345678}
              formatter={(value) => `$${value.toLocaleString()}`}
              valueStyle={{ color: '#3f8600' }}
              prefix={<TrendingUpOutlined />}
              suffix={<span className="text-xs text-green-600">↑15.2%</span>}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月毛利率"
              value={24.2}
              formatter={(value) => `${value}%`}
              valueStyle={{ color: '#cf1322' }}
              prefix={<PercentageOutlined />}
              suffix={<span className="text-xs text-red-600">↓2.1%</span>}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="庫存週轉率"
              value={4.2}
              formatter={(value) => `${value} 次/年`}
              prefix={<SyncOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="應收帳款"
              value={1234567}
              formatter={(value) => `$${value.toLocaleString()}`}
              valueStyle={{ color: '#722ed1' }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 報表分類 */}
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="📊 銷售報表" hoverable>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button type="link" href="/reports/sales/monthly">月度銷售統計</Button>
              <Button type="link" href="/reports/sales/customer">客戶銷售明細</Button>
              <Button type="link" href="/reports/sales/product">產品銷售分析</Button>
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="💰 財務報表" hoverable>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button type="link" href="/reports/finance/receivables">應收帳款分析</Button>
              <Button type="link" href="/reports/finance/cashflow">現金流量表</Button>
              <Button type="link" href="/reports/finance/profit">損益分析</Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
```

### **通用報表元件**
```typescript
// components/ReportTemplate.tsx
interface ReportTemplateProps {
  title: string;
  filters: React.ReactNode;
  data: any[];
  columns: any[];
  charts?: React.ReactNode;
  exportable?: boolean;
}

const ReportTemplate: React.FC<ReportTemplateProps> = ({
  title,
  filters,
  data,
  columns,
  charts,
  exportable = true
}) => {
  const handleExport = () => {
    // 匯出Excel功能
    exportToExcel(data, `${title}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        {exportable && (
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            匯出Excel
          </Button>
        )}
      </div>

      {/* 篩選條件 */}
      <Card className="mb-6">
        {filters}
      </Card>

      {/* 圖表區域 */}
      {charts && (
        <Card className="mb-6">
          {charts}
        </Card>
      )}

      {/* 資料表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 筆`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};
```

---

## 📋 技術實作要求

### **後端API設計**
```typescript
// 統一報表API格式
interface ReportResponse<T> {
  success: boolean;
  data: {
    summary: Record<string, any>;  // 摘要數據
    details: T[];                  // 明細數據
    charts: ChartData[];          // 圖表數據
    filters: FilterOptions;       // 可用篩選條件
  };
  meta: {
    generated_at: string;
    query_time: number;
    total_records: number;
  };
}

// GET /api/reports/sales/monthly
// GET /api/reports/finance/receivables
// GET /api/reports/inventory/summary
```

### **效能優化**
- 大數據量報表使用分頁載入
- 複雜查詢使用快取機制 (Redis)
- 耗時報表改為背景產生 + 通知
- 資料庫查詢優化 (索引、視圖)

### **安全控制**
- 投資方資料隔離嚴格執行
- 敏感欄位依角色動態過濾
- 所有報表查詢記錄操作日誌
- 匯出功能需要額外權限驗證

---

## 📊 圖表視覺化

### **Chart.js 圖表類型**
```typescript
// 銷售趨勢線圖
const SalesTrendChart = ({ data }) => (
  <Line
    data={{
      labels: data.map(d => d.month),
      datasets: [{
        label: '銷售金額',
        data: data.map(d => d.amount),
        borderColor: '#1890ff',
        backgroundColor: 'rgba(24, 144, 255, 0.1)',
      }]
    }}
    options={{
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => `$${value.toLocaleString()}`
          }
        }
      }
    }}
  />
);

// 產品分析圓餅圖
const ProductPieChart = ({ data }) => (
  <Pie
    data={{
      labels: data.map(d => d.product_name),
      datasets: [{
        data: data.map(d => d.percentage),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
        ]
      }]
    }}
  />
);
```

---

## 📋 開發檢查清單

### **後端開發**
- [ ] 設計報表資料模型和視圖
- [ ] 實作報表查詢API
- [ ] 建立資料權限過濾機制
- [ ] 實作Excel匯出功能
- [ ] 設定報表快取策略

### **前端開發**
- [ ] 建立報表Dashboard頁面
- [ ] 實作各類型報表頁面
- [ ] 整合圖表視覺化元件
- [ ] 實作篩選條件和分頁
- [ ] 建立報表匯出功能

### **測試驗證**
- [ ] 數據準確性驗證
- [ ] 權限隔離測試
- [ ] 大數據量效能測試
- [ ] 匯出功能測試
- [ ] 圖表顯示測試

---

**重要**: 報表數據攸關商業決策，必須確保計算邏輯正確、資料及時更新、權限控制嚴密。