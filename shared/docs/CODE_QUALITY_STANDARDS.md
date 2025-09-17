# 🔧 程式碼品質管控規範

## 🎯 品質目標
建立統一的程式碼標準，確保所有螞蟻寫出高品質、可維護、安全的程式碼。

## 📏 程式碼標準

### **命名規範**
```typescript
// ✅ 正確命名
// 變數和函數：camelCase
const customerList = [];
const calculateTotalPrice = () => {};

// 常數：UPPER_SNAKE_CASE  
const API_BASE_URL = 'https://api.example.com';
const TAX_RATE = 0.05;

// 類別和組件：PascalCase
class CustomerService {}
const ProductCard = () => {};

// 類型和介面：PascalCase + 明確意義
interface CustomerFormData {
  name: string;
  email: string;
  tier: CustomerTier;
}

type ApiResponse<T> = {
  data: T;
  success: boolean;
  message?: string;
};

// 檔案命名：kebab-case
// customer-management.tsx
// tax-calculation.service.ts
// validation-rules.types.ts
```

### **函數設計原則**
```typescript
// ✅ 單一職責原則
const calculateCustomerDiscount = (tier: CustomerTier): number => {
  const discountMap = {
    VIP: 0.05,        // 5% 折扣
    REGULAR: 0,       // 無折扣
    PREMIUM: -0.1,    // 加價 10%
    NEW: 0            // 新客戶無折扣
  };
  
  return discountMap[tier] || 0;
};

// ✅ 純函數：無副作用
const formatPrice = (price: number, currency = 'TWD'): string => {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: currency
  }).format(price);
};

// ✅ 錯誤處理
const fetchCustomerById = async (id: string): Promise<Customer> => {
  try {
    const response = await api.get(`/customers/${id}`);
    
    if (!response.data) {
      throw new Error(`Customer not found: ${id}`);
    }
    
    return response.data;
  } catch (error) {
    logger.error(`Failed to fetch customer ${id}:`, error);
    throw new APIError('CUSTOMER_FETCH_FAILED', error.message);
  }
};

// ❌ 避免：函數過大、職責不清
const processCustomerOrder = (orderData) => {
  // 100+ 行程式碼處理多個職責
  // 應該拆分成多個小函數
};
```

### **TypeScript 類型安全**
```typescript
// ✅ 嚴格類型定義
interface CreateCustomerRequest {
  name: string;
  email?: string;        // 可選屬性明確標示
  phone?: string;
  company?: string;
  tier: CustomerTier;
}

// ✅ 聯合類型
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
type UserRole = 'SUPER_ADMIN' | 'INVESTOR' | 'EMPLOYEE';

// ✅ 泛型使用
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: Date;
}

const fetchData = async <T>(endpoint: string): Promise<ApiResponse<T>> => {
  // 類型安全的API呼叫
};

// ✅ 類型守衛
const isValidCustomerTier = (tier: string): tier is CustomerTier => {
  return ['VIP', 'REGULAR', 'PREMIUM', 'NEW'].includes(tier);
};

// ❌ 避免：any 類型
const badFunction = (data: any): any => {
  return data.someProperty; // 無類型檢查
};

// ✅ 正確：具體類型
const goodFunction = (customer: Customer): string => {
  return customer.name;
};
```

## 🛡️ 安全編程規範

### **1. 資料驗證**
```typescript
// ✅ 輸入驗證
import { z } from 'zod';

const CustomerSchema = z.object({
  name: z.string()
    .min(1, '客戶名稱不可為空')
    .max(100, '客戶名稱過長'),
  email: z.string()
    .email('無效的 Email 格式')
    .optional(),
  phone: z.string()
    .regex(/^09\d{8}$/, '無效的手機號碼格式')
    .optional(),
  tier: z.enum(['VIP', 'REGULAR', 'PREMIUM', 'NEW'])
});

const validateCustomerData = (data: unknown): CustomerFormData => {
  try {
    return CustomerSchema.parse(data);
  } catch (error) {
    throw new ValidationError('Invalid customer data', error.errors);
  }
};
```

### **2. 敏感資料保護**
```typescript
// ✅ 權限檢查
const getCustomerData = async (
  customerId: string, 
  userRole: UserRole
): Promise<CustomerData> => {
  const customer = await customerService.findById(customerId);
  
  // 根據角色過濾敏感資料
  if (userRole === 'INVESTOR') {
    return {
      id: customer.id,
      name: customer.name,
      tier: customer.tier,
      // 隱藏敏感資訊
    };
  }
  
  return customer; // 完整資料
};

// ✅ 價格顯示安全
const getDisplayPrice = (
  actualPrice: number,
  displayPrice: number,
  userRole: UserRole
): number => {
  return userRole === 'SUPER_ADMIN' ? actualPrice : displayPrice;
};

// ❌ 避免：直接暴露敏感資料
const badGetPrice = (order) => {
  return {
    actualPrice: order.actualPrice, // 可能洩漏給投資方
    displayPrice: order.displayPrice
  };
};
```

### **3. SQL注入防護**
```typescript
// ✅ 使用參數化查詢
const searchCustomers = async (searchTerm: string) => {
  return await prisma.customer.findMany({
    where: {
      OR: [
        { name: { contains: searchTerm } },
        { phone: { contains: searchTerm } },
        { company: { contains: searchTerm } }
      ]
    }
  });
};

// ❌ 避免：字串拼接
const badSearchCustomers = async (searchTerm: string) => {
  const query = `SELECT * FROM customers WHERE name LIKE '%${searchTerm}%'`;
  return await db.raw(query); // SQL注入風險
};
```

## 🧪 測試規範

### **1. 單元測試**
```typescript
// ✅ 完整的測試覆蓋
describe('calculateCustomerDiscount', () => {
  it('should return 5% discount for VIP customers', () => {
    const discount = calculateCustomerDiscount('VIP');
    expect(discount).toBe(0.05);
  });

  it('should return no discount for REGULAR customers', () => {
    const discount = calculateCustomerDiscount('REGULAR');
    expect(discount).toBe(0);
  });

  it('should return 0 for invalid tier', () => {
    const discount = calculateCustomerDiscount('INVALID' as CustomerTier);
    expect(discount).toBe(0);
  });
});

// ✅ React 組件測試
describe('CustomerCard', () => {
  const mockCustomer = {
    id: 'C00001',
    name: '測試客戶',
    tier: 'VIP' as CustomerTier
  };

  it('should render customer name', () => {
    render(<CustomerCard customer={mockCustomer} />);
    expect(screen.getByText('測試客戶')).toBeInTheDocument();
  });

  it('should show VIP badge for VIP customers', () => {
    render(<CustomerCard customer={mockCustomer} />);
    expect(screen.getByText('VIP')).toBeInTheDocument();
  });
});
```

### **2. 整合測試**
```typescript
// ✅ API 整合測試
describe('Customer API', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('should create customer successfully', async () => {
    const customerData = {
      name: '新客戶',
      email: 'test@example.com',
      tier: 'NEW'
    };

    const response = await request(app)
      .post('/api/customers')
      .send(customerData)
      .expect(201);

    expect(response.body.data.name).toBe('新客戶');
  });

  it('should not allow investor to see sensitive data', async () => {
    const investorToken = await getInvestorToken();
    
    const response = await request(app)
      .get('/api/customers/C00001')
      .set('Authorization', `Bearer ${investorToken}`)
      .expect(200);

    expect(response.body.data).not.toHaveProperty('actualRevenue');
  });
});
```

## 📝 文檔規範

### **1. 程式碼註解**
```typescript
/**
 * 計算客戶專屬價格
 * @param basePrice - 基礎價格
 * @param customerTier - 客戶等級
 * @param productId - 商品ID (用於特殊價格查詢)
 * @returns 客戶專屬價格
 * @throws {ValidationError} 當價格參數無效時
 * 
 * @example
 * ```typescript
 * const price = calculateCustomerPrice(1000, 'VIP', 'P00001');
 * console.log(price); // 950 (VIP 享 5% 折扣)
 * ```
 */
const calculateCustomerPrice = async (
  basePrice: number,
  customerTier: CustomerTier,
  productId: string
): Promise<number> => {
  // 驗證輸入參數
  if (basePrice <= 0) {
    throw new ValidationError('Base price must be positive');
  }

  // 查詢客戶專用價格
  const specialPrice = await getSpecialPrice(customerTier, productId);
  if (specialPrice) {
    return specialPrice;
  }

  // 套用客戶等級折扣
  const discount = getCustomerDiscount(customerTier);
  return basePrice * (1 + discount);
};
```

### **2. README 文檔**
```markdown
# Customer Management Module

## 功能概述
客戶管理模組負責客戶資料的增刪改查，包含客戶分級和權限控制。

## 主要功能
- ✅ 客戶CRUD操作
- ✅ 客戶分級管理 (VIP/REGULAR/PREMIUM/NEW)
- ✅ 權限控制 (投資方資料隔離)
- ✅ 客戶搜尋和篩選

## 快速開始
```bash
# 安裝依賴
npm install

# 執行測試
npm test

# 啟動開發伺服器
npm run dev
```

## API 文檔
詳見 [API 規格文檔](../shared/docs/API_SPEC.md#customer-api)

## 安全注意事項
- 投資方無法查看敏感客戶資料
- 所有 API 都有權限檢查
- 使用參數化查詢防止 SQL 注入
```

## 🔍 程式碼審查清單

### **審查前檢查**
- [ ] **命名規範**：變數、函數、檔案命名是否符合規範？
- [ ] **類型安全**：是否避免使用 `any`，類型定義是否完整？
- [ ] **函數設計**：單一職責、純函數、錯誤處理？
- [ ] **安全性**：敏感資料保護、輸入驗證、權限檢查？
- [ ] **測試覆蓋**：關鍵邏輯是否有測試？
- [ ] **效能考量**：是否有明顯的效能問題？
- [ ] **文檔完整**：複雜邏輯是否有註解說明？

### **安全審查重點**
```typescript
// ✅ 檢查清單
const securityChecklist = {
  // 資料隔離
  dataIsolation: [
    '投資方看不到 actualPrice',
    '個人調貨資料完全隔離',
    'API 回應按角色過濾'
  ],
  
  // 輸入驗證
  inputValidation: [
    '所有用戶輸入都經過驗證',
    '使用 Zod 或類似工具',
    '防止 SQL 注入攻擊'
  ],
  
  // 權限控制
  accessControl: [
    'API 端點有權限檢查',
    '前端組件使用 RoleGuard',
    '敏感功能需要特定角色'
  ]
};
```

## 🛠️ 開發工具設定

### **1. ESLint 設定**
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    '@typescript-eslint/recommended',
    'plugin:security/recommended'
  ],
  plugins: ['@typescript-eslint', 'security'],
  rules: {
    // 禁用 any
    '@typescript-eslint/no-explicit-any': 'error',
    
    // 強制使用 const
    'prefer-const': 'error',
    
    // 禁用 console.log (允許 console.error)
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    
    // 安全規則
    'security/detect-object-injection': 'error',
    'security/detect-sql-injection': 'error',
    
    // 命名規範
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'variableLike',
        format: ['camelCase', 'PascalCase', 'UPPER_CASE']
      },
      {
        selector: 'typeLike',
        format: ['PascalCase']
      }
    ]
  }
};
```

### **2. Prettier 設定**
```javascript
// .prettierrc.js
module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false
};
```

### **3. Git Hooks 設定**
```javascript
// .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 執行 lint 檢查
npx lint-staged

# 執行測試
npm test

# 檢查 TypeScript
npx tsc --noEmit
```

## 📊 品質指標

### **程式碼品質目標**
- **測試覆蓋率**: > 80%
- **複雜度**: 循環複雜度 < 10
- **重複程式碼**: < 3%
- **技術債務**: < 5%
- **安全漏洞**: 0 個

### **監控工具**
```typescript
// SonarQube 品質門檻
const qualityGate = {
  coverage: 80,           // 測試覆蓋率 > 80%
  duplicatedLines: 3,     // 重複代碼 < 3%
  maintainabilityRating: 'A', // 可維護性評級
  reliabilityRating: 'A', // 可靠性評級
  securityRating: 'A',    // 安全性評級
  vulnerabilities: 0      // 安全漏洞 = 0
};
```

## ⚠️ 常見錯誤避免

### **React 常見問題**
```typescript
// ❌ 避免：直接修改 state
const [items, setItems] = useState([]);
items.push(newItem); // 錯誤！

// ✅ 正確：使用不可變更新
setItems(prev => [...prev, newItem]);

// ❌ 避免：在渲染中執行副作用
const Component = () => {
  fetchData(); // 每次渲染都會執行
  return <div>Content</div>;
};

// ✅ 正確：使用 useEffect
const Component = () => {
  useEffect(() => {
    fetchData();
  }, []);
  return <div>Content</div>;
};
```

### **TypeScript 常見問題**
```typescript
// ❌ 避免：類型斷言濫用
const data = response as Customer; // 不安全

// ✅ 正確：類型守衛
const isCustomer = (data: unknown): data is Customer => {
  return typeof data === 'object' && 
         data !== null && 
         'name' in data && 
         'tier' in data;
};

if (isCustomer(response)) {
  // 安全使用 response
}
```

---

**記住：高品質的程式碼是系統穩定運行的基礎！** 🔧✨