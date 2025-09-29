# 🎨 UI組件庫標準規範

## 🎯 目標
建立統一的UI組件庫，確保所有螞蟻使用相同的組件標準，提升開發效率和介面一致性。

## 📚 核心原則

### **統一性原則**
- 所有螞蟻必須使用相同的組件
- 禁止自行創建重複功能的組件
- 統一的設計風格和互動邏輯

### **可重用性原則**
- 組件設計要考慮多場景使用
- 提供靈活的props配置
- 保持組件的獨立性

### **維護性原則**
- 組件有清楚的文檔說明
- 統一的命名規範
- 版本管理和更新機制

## 🎨 設計系統

### **色彩規範**
```scss
// 主色調
$primary: #1890ff;           // Ant Design 主藍色
$success: #52c41a;           // 成功綠色
$warning: #faad14;           // 警告黃色
$error: #f5222d;             // 錯誤紅色

// 中性色
$text-primary: #262626;      // 主要文字
$text-secondary: #8c8c8c;    // 次要文字
$border: #d9d9d9;            // 邊框色
$background: #fafafa;        // 背景色

// 商業色彩
$investor-color: #13c2c2;    // 投資方專用色(青色)
$admin-color: #722ed1;       // 管理員專用色(紫色)
$profit-color: #52c41a;      // 獲利顯示色(綠色)
$cost-color: #fa8c16;        // 成本顯示色(橙色)
```

### **字體規範**
```scss
// 字體大小
$font-size-xs: 12px;         // 極小字體
$font-size-sm: 14px;         // 小字體
$font-size-base: 16px;       // 基本字體
$font-size-lg: 18px;         // 大字體
$font-size-xl: 20px;         // 極大字體

// 字重
$font-weight-normal: 400;    // 普通
$font-weight-medium: 500;    // 中等
$font-weight-bold: 600;      // 粗體
```

## 🧩 核心組件清單

### **1. 基礎組件**

#### **1.1 按鈕組件 (BaseButton)**
```tsx
interface BaseButtonProps {
  type?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
  children: ReactNode;
}

// 使用範例
<BaseButton type="primary" size="medium" loading={isLoading}>
  新增客戶
</BaseButton>
```

#### **1.2 輸入框組件 (BaseInput)**
```tsx
interface BaseInputProps {
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  type?: 'text' | 'number' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
}

// 使用範例
<BaseInput 
  label="客戶名稱" 
  required 
  error={errors.name}
  value={customerName}
  onChange={setCustomerName}
/>
```

#### **1.3 選擇器組件 (BaseSelect)**
```tsx
interface BaseSelectProps {
  label?: string;
  options: { value: string; label: string }[];
  value?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}
```

### **2. 業務組件**

#### **2.1 安全價格顯示 (SecurePriceDisplay)**
```tsx
interface SecurePriceDisplayProps {
  actualPrice: number;      // 真實價格
  displayPrice: number;     // 顯示價格  
  userRole: UserRole;      // 使用者角色
  currency?: string;       // 貨幣單位
  showProfit?: boolean;    // 是否顯示獲利
}

// 根據角色自動決定顯示內容
<SecurePriceDisplay 
  actualPrice={1200}
  displayPrice={1000}
  userRole={currentUser.role}
  showProfit={true}
/>
```

#### **2.2 角色守衛組件 (RoleGuard)**
```tsx
interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

// 保護敏感內容
<RoleGuard allowedRoles={['SUPER_ADMIN']}>
  <div>實際獲利: ${actualProfit}</div>
</RoleGuard>
```

#### **2.3 客戶分級標籤 (CustomerTierBadge)**
```tsx
interface CustomerTierBadgeProps {
  tier: 'VIP' | 'REGULAR' | 'PREMIUM' | 'NEW';
  showDiscount?: boolean;
}

<CustomerTierBadge tier="VIP" showDiscount />
// 顯示: [VIP -5%]
```

#### **2.4 庫存狀態顯示 (StockStatus)**
```tsx
interface StockStatusProps {
  totalStock: number;
  reservedStock: number;
  minStock?: number;
}

<StockStatus 
  totalStock={100}
  reservedStock={20}
  minStock={10}
/>
// 顯示: 可售80 (總100) [正常]
```

### **3. 表格組件**

#### **3.1 安全資料表格 (SecureDataTable)**
```tsx
interface SecureDataTableProps<T> {
  data: T[];
  columns: SecureColumnDef<T>[];
  userRole: UserRole;
  pagination?: boolean;
  loading?: boolean;
  onRowClick?: (record: T) => void;
}

interface SecureColumnDef<T> {
  key: string;
  title: string;
  dataIndex: keyof T;
  allowedRoles?: UserRole[];  // 欄位權限控制
  render?: (value: any, record: T, userRole: UserRole) => ReactNode;
}
```

### **4. 表單組件**

#### **4.1 統一表單包裝 (BaseForm)**
```tsx
interface BaseFormProps {
  title?: string;
  loading?: boolean;
  onSubmit: (values: any) => void;
  onCancel?: () => void;
  children: ReactNode;
}
```

#### **4.2 酒類商品表單 (ProductForm)**
```tsx
interface ProductFormProps {
  initialValues?: ProductFormData;
  onSubmit: (values: ProductFormData) => void;
  mode: 'create' | 'edit';
}
```

## 📱 響應式設計

### **斷點定義**
```scss
$breakpoint-xs: 480px;       // 小手機
$breakpoint-sm: 768px;       // 大手機/小平板
$breakpoint-md: 1024px;      // 平板
$breakpoint-lg: 1280px;      // 桌機
$breakpoint-xl: 1600px;      // 大桌機
```

### **響應式組件 (ResponsiveContainer)**
```tsx
interface ResponsiveContainerProps {
  children: ReactNode;
  mobileLayout?: ReactNode;    // 手機版佈局
  tabletLayout?: ReactNode;    // 平板版佈局
}
```

## 🎯 使用指南

### **螞蟻開發規則**
1. **禁止重複造輪子**: 優先使用現有組件
2. **統一引入方式**: 從 `@/components` 統一引入
3. **遵循命名規範**: 組件名使用PascalCase
4. **Props型別檢查**: 必須定義完整的TypeScript介面
5. **文檔更新**: 新增組件必須更新此文檔

### **組件開發流程**
```
1. 檢查現有組件庫
2. 確認需求無法用現有組件滿足
3. 設計通用性方案
4. 實作組件並測試
5. 更新組件庫文檔
6. 通知其他螞蟻新組件可用
```

## 📁 檔案結構

```
src/
├── components/
│   ├── base/              # 基礎組件
│   │   ├── BaseButton/
│   │   ├── BaseInput/
│   │   └── BaseSelect/
│   ├── business/          # 業務組件
│   │   ├── SecurePriceDisplay/
│   │   ├── RoleGuard/
│   │   └── CustomerTierBadge/
│   ├── layout/            # 佈局組件
│   │   ├── ResponsiveContainer/
│   │   └── PageHeader/
│   └── index.ts           # 統一導出
```

## 🧪 測試規範

### **組件測試要求**
- 每個組件必須有單元測試
- 測試不同props的渲染結果
- 測試用戶交互行為
- 測試權限控制邏輯

### **測試範例**
```typescript
describe('SecurePriceDisplay', () => {
  it('should show actual price for SUPER_ADMIN', () => {
    render(
      <SecurePriceDisplay 
        actualPrice={1200}
        displayPrice={1000}
        userRole="SUPER_ADMIN"
      />
    );
    expect(screen.getByText('$1,200')).toBeInTheDocument();
  });

  it('should show display price for INVESTOR', () => {
    render(
      <SecurePriceDisplay 
        actualPrice={1200}
        displayPrice={1000}
        userRole="INVESTOR"
      />
    );
    expect(screen.getByText('$1,000')).toBeInTheDocument();
    expect(screen.queryByText('$1,200')).not.toBeInTheDocument();
  });
});
```

## 🔄 版本管理

### **組件版本控制**
- 使用語義化版本號 (semantic versioning)
- 重大變更前通知所有螞蟻
- 提供向後相容的遷移指南

### **更新通知機制**
```markdown
## 組件更新通知 v1.2.0
### 新增
- CustomerTierBadge 組件
- SecureDataTable 組件

### 修改
- BaseButton 新增 loading 狀態
- RoleGuard 支援 fallback UI

### 棄用
- OldPriceDisplay (請使用 SecurePriceDisplay)

### 破壞性變更
- 無
```

## ⚠️ 安全注意事項

### **敏感資料保護**
- 所有價格相關組件都要權限檢查
- 使用 RoleGuard 包裝敏感內容
- 永遠不要在前端暴露真實價格給投資方

### **組件安全檢查清單**
- [ ] 是否有適當的權限控制？
- [ ] 敏感資料是否被保護？
- [ ] 錯誤狀態是否安全處理？
- [ ] Props 驗證是否完整？

## 📞 支援聯絡

### **組件庫維護**
- **負責房間**: Room-7 (UI/UX專門)
- **備援房間**: Room-1 (基礎架構)
- **問題回報**: 透過老闆協調

### **常見問題**
1. **找不到適合的組件？** → 檢查組件庫文檔，或聯絡Room-7
2. **組件有Bug？** → 立即回報，使用備案方案
3. **需要新功能？** → 先討論通用性，再決定是否加入組件庫

---

**記住：統一的UI組件庫是提升螞蟻效率的關鍵！** 🎨✨