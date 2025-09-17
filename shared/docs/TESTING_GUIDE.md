# 🧪 測試指南

## 🎯 測試目標
確保酒類進口貿易管理系統的**數據隔離**、**功能完整性**和**安全性**，特別是投資方永遠看不到真實商業數據！

---

## 🔒 數據隔離測試 (最高優先級)

### **🚨 投資方數據隔離測試**
這是整個系統最關鍵的測試，絕對不能失敗！

#### **測試場景1: 價格隔離**
```javascript
// 測試資料準備
const testSale = {
  id: 'sale_001',
  productName: '山崎18年威士忌',
  cost: 800,
  displayPrice: 1000,    // 投資方看到的
  actualPrice: 1200,     // 真實收取價格
  commission: 200,       // 老闆抽成
  investorId: 'inv_001'
}

// 測試步驟
describe('投資方價格隔離', () => {
  test('投資方API只返回displayPrice', async () => {
    const response = await fetch('/api/sales', {
      headers: { 'Authorization': 'Bearer investor_token' }
    })
    const sales = await response.json()

    // ✅ 應該通過
    expect(sales.data[0].price).toBe(1000)

    // ❌ 絕對不能存在
    expect(sales.data[0].actualPrice).toBeUndefined()
    expect(sales.data[0].commission).toBeUndefined()
  })

  test('投資方UI不顯示敏感資料', () => {
    render(<SalesList user={{ role: 'INVESTOR' }} />)

    // ✅ 應該可見
    expect(screen.getByText('$1,000')).toBeInTheDocument()

    // ❌ 絕對不能可見
    expect(screen.queryByText('$1,200')).not.toBeInTheDocument()
    expect(screen.queryByText('抽成: $200')).not.toBeInTheDocument()
  })
})
```

#### **測試場景2: 個人調貨隔離**
```javascript
describe('個人調貨隔離', () => {
  test('投資方看不到個人調貨記錄', async () => {
    const response = await fetch('/api/purchases', {
      headers: { 'Authorization': 'Bearer investor_token' }
    })
    const purchases = await response.json()

    // 確保只有投資方出資的採購
    purchases.data.forEach(purchase => {
      expect(purchase.fundingSource).toBe('COMPANY')
      expect(purchase.fundingSource).not.toBe('PERSONAL')
    })
  })
})
```

---

## 🏠 房間功能測試

### **Room-1: 基礎架構測試**
```javascript
describe('Room-1: 認證與權限', () => {
  test('Google OAuth登入流程', async () => {
    // 測試Google登入重導向
    // 測試JWT token生成
    // 測試角色分配
  })

  test('權限中間件防護', async () => {
    // 測試無權限存取API
    const response = await fetch('/api/admin/users', {
      headers: { 'Authorization': 'Bearer employee_token' }
    })
    expect(response.status).toBe(403)
  })

  test('投資方數據過濾', async () => {
    // 測試中間件正確過濾資料
  })
})
```

### **Room-2: 主檔管理測試**
```javascript
describe('Room-2: 客戶與商品', () => {
  test('客戶分級報價系統', () => {
    const vipCustomer = { id: 'c001', tier: 'VIP' }
    const price = getCustomerPrice('W001', vipCustomer)
    expect(price).toBe(20000) // VIP價格
  })

  test('商品變體管理', () => {
    // 測試W001-A, W001-B, W001-X等變體
    // 測試庫存調撥邏輯
  })
})
```

### **Room-3: 交易核心測試**
```javascript
describe('Room-3: 採購與庫存', () => {
  test('AI報單辨識', async () => {
    // 模擬PDF上傳
    // 測試Gemini API回應
    // 驗證解析結果準確性
  })

  test('成本分攤計算', () => {
    const costBreakdown = calculateCostAllocation({
      baseCost: 18000,
      additionalCosts: [
        { type: 'SHIPPING', amount: 2000 },
        { type: 'INSPECTION', amount: 800 }
      ],
      inspectionLoss: 1,
      radiationLoss: 2,
      originalQuantity: 12
    })

    expect(costBreakdown.finalUnitCost).toBe(2344) // 21100/9
  })
})
```

### **Room-4: 銷售財務測試**
```javascript
describe('Room-4: 雙重價格系統', () => {
  test('傭金計算', () => {
    const commission = calculateCommission({
      displayPrice: 1000,
      actualPrice: 1200,
      isPersonalPurchase: false
    })

    expect(commission).toBe(200)
  })

  test('對帳管理', () => {
    // 測試應收帳款計算
    // 測試逾期提醒
  })
})
```

### **Room-5: 報表分析測試**
```javascript
describe('Room-5: 報表系統', () => {
  test('投資方報表過濾', () => {
    const report = generateInvestorReport('inv_001', '2025-01')

    // ✅ 包含的資料
    expect(report.totalRevenue).toBeDefined()
    expect(report.totalCost).toBeDefined()

    // ❌ 不包含的資料
    expect(report.actualRevenue).toBeUndefined()
    expect(report.ownerCommission).toBeUndefined()
  })
})
```

### **Room-6: LINE BOT測試**
```javascript
describe('Room-6: LINE BOT', () => {
  test('成本計算功能', async () => {
    const result = await calculateCostViaBOT(
      '白鶴清酒 720ml 15度 日幣800 匯率0.21'
    )

    expect(result.totalCost).toBe(292)
    expect(result.breakdown.baseCost).toBe(168)
    expect(result.breakdown.alcoholTax).toBe(76)
  })
})
```

---

## 🔐 安全性測試

### **API安全測試**
```javascript
describe('API安全性', () => {
  test('SQL Injection防護', async () => {
    const maliciousInput = "'; DROP TABLE users; --"
    const response = await fetch(`/api/products?search=${maliciousInput}`)

    // 應該安全處理，不應該影響資料庫
    expect(response.status).not.toBe(500)
  })

  test('XSS防護', () => {
    const maliciousScript = '<script>alert("xss")</script>'
    render(<ProductName name={maliciousScript} />)

    // 應該被轉義顯示
    expect(screen.queryByRole('script')).not.toBeInTheDocument()
  })

  test('CSRF防護', async () => {
    // 測試無CSRF token的請求被拒絕
    const response = await fetch('/api/sales', {
      method: 'POST',
      body: JSON.stringify({ productId: 'W001' })
    })
    expect(response.status).toBe(403)
  })
})
```

### **權限繞過測試**
```javascript
describe('權限繞過防護', () => {
  test('直接API存取防護', async () => {
    // 測試投資方嘗試存取超級管理員API
    const response = await fetch('/api/admin/settings', {
      headers: { 'Authorization': 'Bearer investor_token' }
    })
    expect(response.status).toBe(403)
  })

  test('URL參數竄改防護', async () => {
    // 測試修改investorId參數
    const response = await fetch('/api/sales?investorId=other_investor', {
      headers: { 'Authorization': 'Bearer investor_token' }
    })

    // 應該只返回該投資方的資料
    const data = await response.json()
    data.data.forEach(sale => {
      expect(sale.investorId).toBe('current_investor_id')
    })
  })
})
```

---

## 🎭 角色測試

### **測試帳號準備**
```javascript
const testAccounts = {
  superAdmin: {
    email: 'admin@test.com',
    role: 'SUPER_ADMIN',
    permissions: ['*']
  },
  investor1: {
    email: 'investor1@test.com',
    role: 'INVESTOR',
    investorId: 'inv_001'
  },
  investor2: {
    email: 'investor2@test.com',
    role: 'INVESTOR',
    investorId: 'inv_002'
  },
  employee: {
    email: 'employee@test.com',
    role: 'EMPLOYEE'
  }
}
```

### **角色切換測試**
```javascript
describe('角色功能測試', () => {
  test('超級管理員看到完整數據', async () => {
    const { user } = await loginAs('superAdmin')
    const sales = await getSales(user.token)

    expect(sales[0].actualPrice).toBeDefined()
    expect(sales[0].commission).toBeDefined()
  })

  test('投資方1只看到自己的項目', async () => {
    const { user } = await loginAs('investor1')
    const sales = await getSales(user.token)

    sales.forEach(sale => {
      expect(sale.investorId).toBe('inv_001')
      expect(sale.actualPrice).toBeUndefined()
    })
  })

  test('投資方2無法看到投資方1的數據', async () => {
    const { user } = await loginAs('investor2')
    const sales = await getSales(user.token)

    sales.forEach(sale => {
      expect(sale.investorId).not.toBe('inv_001')
    })
  })
})
```

---

## 📱 前端UI測試

### **響應式測試**
```javascript
describe('響應式設計', () => {
  test('手機版布局', () => {
    // 設定手機視窗大小
    global.innerWidth = 375
    global.innerHeight = 667

    render(<Dashboard />)

    // 檢查手機版特有元素
    expect(screen.getByRole('button', { name: '☰' })).toBeInTheDocument()
  })

  test('桌面版布局', () => {
    global.innerWidth = 1920
    global.innerHeight = 1080

    render(<Dashboard />)

    // 檢查側邊欄顯示
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })
})
```

### **無障礙測試**
```javascript
describe('無障礙功能', () => {
  test('鍵盤導航', () => {
    render(<ProductForm />)

    // 測試Tab鍵導航
    const firstInput = screen.getByLabelText('商品名稱')
    firstInput.focus()
    fireEvent.keyDown(firstInput, { key: 'Tab' })

    expect(screen.getByLabelText('商品價格')).toHaveFocus()
  })

  test('螢幕閱讀器支援', () => {
    render(<PriceDisplay price={1000} />)

    expect(screen.getByRole('text')).toHaveAttribute('aria-label', '價格 1000 元')
  })
})
```

---

## 🚀 性能測試

### **載入時間測試**
```javascript
describe('性能標準', () => {
  test('首頁載入時間', async () => {
    const startTime = Date.now()
    await render(<Dashboard />)
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(2000) // 2秒內
  })

  test('大量數據渲染', () => {
    const manyProducts = Array.from({ length: 1000 }, (_, i) => ({
      id: `p${i}`,
      name: `商品${i}`
    }))

    const startTime = Date.now()
    render(<ProductList products={manyProducts} />)
    const renderTime = Date.now() - startTime

    expect(renderTime).toBeLessThan(1000) // 1秒內
  })
})
```

---

## 🤖 AI功能測試

### **Gemini API測試**
```javascript
describe('AI功能', () => {
  test('PDF報單辨識', async () => {
    const mockPdfData = 'base64_encoded_pdf'
    const result = await recognizeDeclaration(mockPdfData)

    expect(result.confidence).toBeGreaterThan(0.8)
    expect(result.items).toHaveLength(5)
    expect(result.items[0].name).toContain('威士忌')
  })

  test('圖片OCR', async () => {
    const mockImageData = 'base64_encoded_image'
    const result = await ocrImage(mockImageData)

    expect(result.text).toBeDefined()
    expect(result.confidence).toBeGreaterThan(0.7)
  })
})
```

---

## 📊 測試覆蓋率要求

### **覆蓋率目標**
- **數據隔離相關**: 100% 覆蓋率 🚨
- **權限控制**: 95% 覆蓋率
- **商業邏輯**: 90% 覆蓋率
- **UI組件**: 85% 覆蓋率
- **一般功能**: 80% 覆蓋率

### **測試報告**
```bash
# 執行所有測試
npm run test:all

# 產生覆蓋率報告
npm run test:coverage

# 執行安全測試
npm run test:security

# 執行性能測試
npm run test:performance
```

---

## 🔍 測試檢查清單

### **開發階段檢查**
- [ ] 每個API都有權限測試
- [ ] 每個UI組件都有角色測試
- [ ] 數據隔離邏輯100%覆蓋
- [ ] 錯誤處理情境完整

### **部署前檢查**
- [ ] 所有角色功能測試通過
- [ ] 安全性測試無漏洞
- [ ] 性能測試達標
- [ ] 無障礙測試通過
- [ ] 跨瀏覽器相容性測試

### **上線後檢查**
- [ ] 監控數據隔離是否正常
- [ ] API回應時間監控
- [ ] 錯誤率監控
- [ ] 使用者體驗監控

**測試是保護商業機密的最後防線！** 🛡️