# 🎨 UI設計規範

## 🎯 設計原則

### **小白老闆友善 (MUJI + 蘋果風格)**
- 📱 **極簡直觀**: MUJI風格，去除多餘裝飾
- 🎨 **蘋果質感**: 圓角設計、優雅過場動畫
- ⚡ **快速響應**: 載入時間短、操作流暢
- 🔍 **重點突出**: 待辦事項、業績數據優先顯示

### **⚠️ 重要參考文檔**
老闆詳細UI需求請參考：`BOSS_UI_REQUIREMENTS.md`

---

## 🎨 **視覺設計**

### **色彩主題 (MUJI + 蘋果風格)**
```css
/* 主色調 - 極簡風格 */
--primary: #2C2C2C (深灰 - 主要文字)
--secondary: #8E8E93 (中灰 - 次要文字)
--background: #FAFAFA (淺灰 - 背景)
--card-bg: #FFFFFF (白色 - 卡片)

/* 功能色彩 - 蘋果風格 */
--success: #34C759 (蘋果綠)
--warning: #FF9500 (蘋果橘)
--error: #FF3B30 (蘋果紅)
--info: #007AFF (蘋果藍)

/* 商業色彩 */
--profit: #34C759 (獲利綠)
--revenue: #007AFF (營收藍)
--pending: #FF9500 (待辦橘)
--text-primary: #262626
--text-secondary: #8c8c8c
```

### **字體規範**
```css
/* 中文友善字體 */
font-family:
  'PingFang SC', 'Microsoft YaHei',
  'Helvetica Neue', Arial, sans-serif;

/* 字體大小 */
--font-xs: 12px    /* 輔助文字 */
--font-sm: 14px    /* 一般文字 */
--font-md: 16px    /* 按鈕文字 */
--font-lg: 18px    /* 標題文字 */
--font-xl: 24px    /* 大標題 */
```

---

## 📱 **響應式設計**

### **斷點設計**
```css
/* 手機優先設計 */
@media (min-width: 576px)  { /* 手機橫屏 */ }
@media (min-width: 768px)  { /* 平板 */ }
@media (min-width: 992px)  { /* 筆電 */ }
@media (min-width: 1200px) { /* 桌機 */ }
```

### **布局適配**
- 📱 **手機**: 單欄布局，大按鈕
- 💻 **桌機**: 多欄布局，詳細資訊
- 🖱️ **操作**: 支援觸控和滑鼠

---

## 🏠 **核心頁面設計**

### **首頁儀表板**
```
┌─ 酒類進口管理系統 ─┐
│ 👋 早安，老闆！     │
│ 今日營運摘要         │
├─────────────────┤
│ 💰 今日收入: $25K   │
│ 📦 待出貨: 8筆      │
│ ⚠️ 低庫存: 3項      │
│ 📞 待回覆: 2則      │
├─────────────────┤
│ 🚀 快速操作         │
│ [📋新增採購][💰銷貨][📊報表][🤖BOT] │
└─────────────────┘
```

### **商品管理頁面**
```
┌─ 商品管理 ─────────────────┐
│ 🔍 [搜尋商品...] [➕新增] [📊分析] │
├─────────────────────────┤
│ 🍶 山崎18年威士忌 (W001)        │
│ 💰 $21,000 | 📦 15瓶 | 🟢正常    │
│ [👁️查看] [✏️編輯] [💰定價] [📋變體] │
├─────────────────────────┤
│ 🥃 響21年威士忌 (W025)          │
│ 💰 $35,000 | 📦 3瓶 | 🟡低庫存   │
│ [👁️查看] [✏️編輯] [💰定價] [📋變體] │
└─────────────────────────┘
```

---

## 🎯 **Ant Design組件使用**

### **推薦組件**
```tsx
// 表格 - 商品列表、訂單列表
<Table
  columns={columns}
  dataSource={products}
  pagination={{ pageSize: 20 }}
  rowSelection={rowSelection}
/>

// 表單 - 新增/編輯
<Form layout="vertical">
  <Form.Item label="商品名稱" required>
    <Input placeholder="請輸入商品名稱" />
  </Form.Item>
</Form>

// 統計卡片 - 儀表板
<Statistic
  title="今日營收"
  value={25000}
  prefix="$"
  valueStyle={{ color: '#52c41a' }}
/>

// 搜尋 - 智慧搜尋
<AutoComplete
  options={searchOptions}
  onSearch={handleSearch}
  placeholder="搜尋商品、客戶..."
/>
```

### **自訂組件**
```tsx
// 商品卡片
<ProductCard>
  <ProductImage />
  <ProductInfo />
  <ProductActions />
</ProductCard>

// 價格顯示
<PriceDisplay
  standardPrice={21000}
  specialPrice={20000}
  showDiscount={true}
/>

// 庫存狀態
<StockStatus
  current={15}
  minimum={5}
  status="normal" // normal, low, out
/>
```

---

## 📊 **資料視覺化**

### **圖表庫選擇**
```tsx
// 推薦: Apache ECharts (中文友善)
import { LineChart, BarChart, PieChart } from 'echarts-for-react';

// 營收趨勢圖
<LineChart
  option={{
    title: { text: '月度營收趨勢' },
    xAxis: { data: months },
    yAxis: { type: 'value' },
    series: [{ data: revenue, type: 'line' }]
  }}
/>

// 商品銷售排行
<BarChart option={topProductsOption} />

// 客戶分佈
<PieChart option={customerTierOption} />
```

### **儀表板設計**
```
┌─ 營運儀表板 ─────────────┐
│ 📊 本月營收: $450K (+15%) │
│ ████████████▓▓▓ 75%      │
├─────────────────────┤
│ 📈 銷售趨勢圖           │
│    ╭─╮                │
│   ╱   ╲     ╭╮        │
│  ╱     ╲   ╱  ╲       │
│ ╱       ╲ ╱    ╲      │
├─────────────────────┤
│ 🏆 TOP 5 熱銷商品      │
│ 1. 山崎18年 (25瓶)     │
│ 2. 響21年 (18瓶)       │
│ 3. 白州12年 (32瓶)     │
└─────────────────────┘
```

---

## 📱 **行動端設計**

### **手機版布局**
```
┌─ ☰ 酒類管理 🔔 ─┐
│                │
│ 👋 早安老闆！    │
│                │
│ 💰 今日: $25K   │
│ 📦 待處理: 8筆  │
│                │
│ ┌─快速操作──┐  │
│ │[📋][💰]   │  │
│ │[📊][🤖]   │  │
│ └──────────┘  │
│                │
│ 📈 營收趨勢     │
│ [圖表區域]      │
└────────────────┘
```

### **觸控友善設計**
- **按鈕**: 最小44px，間距充足
- **表格**: 支援左右滑動
- **表單**: 大輸入框，清楚標籤
- **導航**: 底部導航列

---

## 🔍 **搜尋體驗設計**

### **智慧搜尋框**
```tsx
<Search
  placeholder="搜尋商品、客戶、訂單..."
  onSearch={handleSearch}
  size="large"
  style={{ marginBottom: 16 }}
  suffix={
    <Tooltip title="支援模糊搜尋">
      <InfoCircleOutlined />
    </Tooltip>
  }
/>

// 搜尋建議
<AutoComplete
  options={[
    { value: '山崎18年', label: '🍶 山崎18年威士忌' },
    { value: 'A客戶', label: '👤 A客戶 (VIP)' },
    { value: 'PO001', label: '📋 採購單 PO001' }
  ]}
/>
```

### **搜尋結果展示**
```
🔍 搜尋結果: "山崎" (找到 3 項)

🍶 商品 (2項)
├─ 山崎18年威士忌 (W001) 庫存:15瓶
└─ 山崎12年威士忌 (W025) 庫存:28瓶

👤 客戶 (1項)
└─ 山崎商店 (C025) VIP客戶
```

---

## ⚡ **性能優化**

### **載入優化**
```tsx
// 懶加載組件
const ProductList = lazy(() => import('./ProductList'));
const ReportDashboard = lazy(() => import('./ReportDashboard'));

// 骨架屏
<Skeleton active loading={loading}>
  <ProductCard />
</Skeleton>

// 虛擬滾動 (大量數據)
<VirtualList
  data={products}
  height={400}
  itemHeight={60}
  renderItem={ProductItem}
/>
```

### **快取策略**
```tsx
// React Query 資料快取
const { data: products } = useQuery('products', fetchProducts, {
  staleTime: 5 * 60 * 1000, // 5分鐘
  cacheTime: 10 * 60 * 1000 // 10分鐘
});

// 圖片懶加載
<Image
  src={productImage}
  placeholder={<Skeleton.Image />}
  lazy
/>
```

---

## 🎨 **設計系統建議**

### **組件命名規範**
```
// 業務組件
ProductCard, CustomerForm, OrderTable
InvoiceGenerator, StockAlert, PriceManager

// 通用組件
SearchBox, DataTable, StatusBadge
LoadingSpinner, ErrorBoundary, PageHeader
```

### **樣式架構**
```scss
// styles/
├── globals.css         // 全域樣式
├── variables.css       // CSS變數
├── components/         // 組件樣式
│   ├── ProductCard.module.css
│   └── CustomerForm.module.css
└── pages/             // 頁面樣式
    ├── dashboard.module.css
    └── products.module.css
```

---

## 📋 **開發檢查清單**

### **UI開發要點**
- [ ] Ant Design組件庫整合
- [ ] 響應式設計實現
- [ ] 深色模式支援 (可選)
- [ ] 國際化準備 (中文為主)
- [ ] 無障礙功能支援

### **用戶體驗**
- [ ] 載入狀態顯示
- [ ] 錯誤處理友善
- [ ] 操作反饋及時
- [ ] 導航邏輯清晰
- [ ] 搜尋體驗流暢

### **性能標準**
- [ ] 首頁載入 < 2秒
- [ ] 頁面切換 < 500ms
- [ ] 搜尋響應 < 300ms
- [ ] 圖表渲染 < 1秒

**UI以實用為主，專業美觀即可！** 🎨✨