# 🔒 角色UI差異設計規範

## ⚠️ 超級重要的安全要求
這份文檔定義了不同使用者角色在UI上的顯示差異，確保**投資方永遠看不到真實的商業機密**！

---

## 👥 使用者角色定義

### 🦸‍♂️ SUPER_ADMIN (老闆)
- **權限等級**: 最高
- **資料存取**: 完整真實數據
- **UI特色**: 完整功能、真實數字、商業分析

### 💼 INVESTOR (投資方)
- **權限等級**: 受限
- **資料存取**: 過濾後的調整數據
- **UI特色**: 簡化介面、調整價格、有限報表

### 👷‍♀️ EMPLOYEE (員工)
- **權限等級**: 基本
- **資料存取**: 操作相關數據
- **UI特色**: 操作導向、無財務敏感資訊

---

## 💰 價格顯示差異 (最關鍵)

### **銷售價格顯示**
```tsx
// 超級管理員看到
<PriceDisplay role="SUPER_ADMIN">
  <div className="price-breakdown">
    <div>顯示價格: $1,000</div>
    <div className="actual-price">實際收取: $1,200</div>
    <div className="commission">老闆抽成: $200</div>
  </div>
</PriceDisplay>

// 投資方看到
<PriceDisplay role="INVESTOR">
  <div className="price-simple">
    <div>銷售價格: $1,000</div>
    <!-- 完全看不到1200和200 -->
  </div>
</PriceDisplay>

// 員工看到
<PriceDisplay role="EMPLOYEE">
  <div className="price-basic">
    <div>參考價格: $1,000</div>
  </div>
</PriceDisplay>
```

### **商品管理頁面差異**
```tsx
// 根據角色條件渲染
{user.role === 'SUPER_ADMIN' && (
  <Column title="實際售價" dataIndex="actualPrice" />
)}

{user.role === 'SUPER_ADMIN' && (
  <Column title="傭金" dataIndex="commission" />
)}

{user.role === 'INVESTOR' && (
  <Column title="銷售價格" dataIndex="displayPrice" />
)}
```

---

## 📊 儀表板差異設計

### **🦸‍♂️ 超級管理員儀表板**
```
┌─ 酒類進口管理系統 (老闆版) ──────┐
│ 👋 早安，老闆！                  │
├─ 💰 真實營運數據 ─────────────┤
│ 今日實收: $45,600 (顯示$38,000) │
│ 個人調貨獲利: $12,000            │
│ 投資方分潤: $26,000              │
│ 老闆總抽成: $7,600               │
├─ 🔍 完整分析 ──────────────────┤
│ [真實vs顯示價格分析]             │
│ [個人vs投資項目獲利]             │
│ [客戶分級效果分析]               │
└─────────────────────────────┘
```

### **💼 投資方儀表板**
```
┌─ 酒類進口管理系統 (投資方版) ───┐
│ 👋 您好！                       │
├─ 📊 投資項目數據 ──────────────┤
│ 今日營收: $38,000               │
│ 本月獲利: $85,000               │
│ 投資報酬率: 15.2%                │
├─ 📈 項目分析 ──────────────────┤
│ [投資項目銷售趨勢]               │
│ [商品表現排行]                   │
│ [市場分析報告]                   │
└─────────────────────────────┘
```

### **👷‍♀️ 員工儀表板**
```
┌─ 酒類進口管理系統 (員工版) ────┐
│ 👋 工作愉快！                   │
├─ 📋 今日工作 ──────────────────┤
│ 待處理訂單: 8筆                 │
│ 待出貨: 12筆                    │
│ 庫存提醒: 3項                   │
├─ ⚡ 快速操作 ──────────────────┤
│ [新增客戶] [錄入訂單]           │
│ [庫存管理] [出貨處理]           │
└─────────────────────────────┘
```

---

## 📋 報表功能差異

### **銷售報表差異**

#### **超級管理員版本**
```tsx
<SalesReport role="SUPER_ADMIN">
  <ReportSection title="真實營收分析">
    <MetricCard label="實際總收入" value="$156,800" />
    <MetricCard label="顯示給投資方" value="$130,000" />
    <MetricCard label="老闆總抽成" value="$26,800" />
  </ReportSection>

  <ReportSection title="項目分類">
    <Chart data={fullRevenueData} />
    <Table dataSource={fullSalesData} />
  </ReportSection>
</SalesReport>
```

#### **投資方版本**
```tsx
<SalesReport role="INVESTOR">
  <ReportSection title="投資項目表現">
    <MetricCard label="總營收" value="$130,000" />
    <MetricCard label="總成本" value="$95,000" />
    <MetricCard label="總獲利" value="$35,000" />
  </ReportSection>

  <ReportSection title="趨勢分析">
    <Chart data={filteredRevenueData} />
    <Table dataSource={investorSalesData} />
  </ReportSection>
</SalesReport>
```

---

## 🛡️ 安全UI組件設計

### **條件顯示組件**
```tsx
// 安全的角色條件組件
interface RoleGuardProps {
  allowedRoles: Role[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
  fallback = null
}) => {
  const { user } = useAuth()

  if (!allowedRoles.includes(user.role)) {
    return fallback
  }

  return <>{children}</>
}

// 使用範例
<RoleGuard allowedRoles={['SUPER_ADMIN']}>
  <div className="sensitive-data">
    <span>實際售價: $1,200</span>
    <span>傭金: $200</span>
  </div>
</RoleGuard>
```

### **安全的價格組件**
```tsx
interface PriceDisplayProps {
  standardPrice: number
  actualPrice?: number
  commission?: number
  role: Role
}

export const SecurePriceDisplay: React.FC<PriceDisplayProps> = ({
  standardPrice,
  actualPrice,
  commission,
  role
}) => {
  return (
    <div className="price-display">
      <div className="standard-price">
        銷售價格: ${standardPrice.toLocaleString()}
      </div>

      <RoleGuard allowedRoles={['SUPER_ADMIN']}>
        {actualPrice && (
          <div className="actual-price">
            實際收取: ${actualPrice.toLocaleString()}
          </div>
        )}
        {commission && (
          <div className="commission">
            抽成: ${commission.toLocaleString()}
          </div>
        )}
      </RoleGuard>
    </div>
  )
}
```

---

## 🎨 視覺差異設計

### **色彩區分**
```css
/* 超級管理員 - 完整權限 */
.admin-mode {
  --accent-color: #8B4513; /* 威士忌棕 */
  --success-color: #52c41a;
  --warning-color: #faad14;
}

/* 投資方 - 受限檢視 */
.investor-mode {
  --accent-color: #1890ff; /* 商務藍 */
  --success-color: #52c41a;
  --info-color: #1890ff;
}

/* 員工 - 操作導向 */
.employee-mode {
  --accent-color: #2E8B57; /* 工作綠 */
  --primary-color: #2E8B57;
}
```

### **Layout差異**
```tsx
// 根據角色調整側邊欄
const getSidebarItems = (role: Role) => {
  const baseItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: '儀表板' },
    { key: 'customers', icon: <UserOutlined />, label: '客戶管理' },
    { key: 'products', icon: <ShopOutlined />, label: '商品管理' }
  ]

  if (role === 'SUPER_ADMIN') {
    return [
      ...baseItems,
      { key: 'sales', icon: <DollarOutlined />, label: '銷售管理' },
      { key: 'accounting', icon: <CalculatorOutlined />, label: '會計對帳' },
      { key: 'reports', icon: <BarChartOutlined />, label: '完整報表' },
      { key: 'linebot', icon: <RobotOutlined />, label: 'LINE BOT' },
      { key: 'settings', icon: <SettingOutlined />, label: '系統設定' }
    ]
  }

  if (role === 'INVESTOR') {
    return [
      ...baseItems,
      { key: 'investment-reports', icon: <LineChartOutlined />, label: '投資報表' }
    ]
  }

  // EMPLOYEE
  return [
    ...baseItems,
    { key: 'orders', icon: <ShoppingCartOutlined />, label: '訂單處理' }
  ]
}
```

---

## 🧪 UI測試要求

### **角色切換測試**
```tsx
// 測試用的角色切換器 (僅開發環境)
{process.env.NODE_ENV === 'development' && (
  <Select
    value={currentRole}
    onChange={setTestRole}
    options={[
      { value: 'SUPER_ADMIN', label: '超級管理員' },
      { value: 'INVESTOR', label: '投資方' },
      { value: 'EMPLOYEE', label: '員工' }
    ]}
  />
)}
```

### **UI安全檢查清單**
- [ ] 投資方無法看到actualPrice
- [ ] 投資方無法看到commission計算
- [ ] 投資方無法看到個人調貨數據
- [ ] 不同角色有對應的側邊欄選項
- [ ] 報表數據按角色正確過濾
- [ ] 錯誤訊息不洩漏敏感資訊
- [ ] URL直接存取會被權限攔截

---

## 🚨 開發重要提醒

### **絕對禁止**
- ❌ 在投資方介面顯示actualPrice
- ❌ 在投資方介面顯示commission
- ❌ 在前端暴露完整商業邏輯
- ❌ 使用client-side的權限檢查作為唯一防護

### **必須遵守**
- ✅ 每個敏感UI組件都要有RoleGuard
- ✅ 所有價格顯示都要用SecurePriceDisplay
- ✅ API數據要在後端過濾，前端只是最後防線
- ✅ 測試時要用不同角色帳號驗證

**UI差異是保護商業機密的最後一道防線！** 🛡️