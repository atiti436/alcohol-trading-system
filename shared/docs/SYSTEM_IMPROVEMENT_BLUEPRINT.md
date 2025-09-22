# 🔧 酒類交易系統改善藍圖

**版本**: 1.0
**建立日期**: 2025/09/22
**目標**: 系統性解決根本問題，而非症狀治療

---

## 🎯 **改善總體策略**

### **核心理念轉變**
```
從 "頭痛醫頭，腳痛醫腳" → 系統性根本問題解決
從 "功能驅動開發" → 業務邏輯驅動開發
從 "修補式維護" → 預防性重構
```

### **三階段改善路線圖**
1. **🚨 緊急修復階段** (1-2週) - 解決影響日常運營的關鍵問題
2. **🔧 結構重整階段** (1個月) - 重建核心業務邏輯結構
3. **⚡ 優化提升階段** (持續) - 長期優化和功能擴展

---

## 🚨 **第一階段：緊急修復 (優先級 P0)**

### **1. 庫存管理系統重建**
**問題**: 假資料、計算錯誤、預留庫存不準確
**影響**: 銷售決策錯誤、超賣風險、客戶滿意度下降

**修復計劃**:
```typescript
// 1. 重新設計庫存計算邏輯
interface StockCalculation {
  total_stock: number           // 實際總庫存
  reserved_stock: number        // 預留庫存
  available_stock: number       // 可售庫存 = total - reserved
  in_transit_stock: number      // 在途庫存（已採購未收貨）

  // 安全檢查機制
  validateStock(): boolean
  calculateAvailable(): number
  reserveStock(quantity: number): boolean
  releaseReservedStock(quantity: number): boolean
}

// 2. 庫存異動記錄標準化
interface InventoryMovement {
  movement_type: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'TRANSFER'
  reference_type: 'PURCHASE' | 'SALE' | 'ADJUSTMENT'
  reference_id: string
  quantity_before: number
  quantity_change: number
  quantity_after: number
  unit_cost: number
  total_cost: number
  created_by: string
  created_at: Date
}
```

**實作步驟**:
- [ ] 清理現有假資料
- [ ] 重建庫存計算邏輯
- [ ] 建立庫存異動追蹤
- [ ] 實作庫存安全檢查
- [ ] 建立庫存同步驗證機制

### **2. 資金流追蹤系統建立**
**問題**: 公司資金與個人調貨混淆、獲利分配不明確
**影響**: 財務報表不準確、投資方權益不清楚

**修復計劃**:
```typescript
// 資金來源追蹤
interface FundingSource {
  id: string
  type: 'COMPANY' | 'PERSONAL'
  investor_id?: string
  amount: number
  currency: string
  exchange_rate: number
  twd_amount: number
  created_at: Date
}

// 獲利分配計算
interface ProfitAllocation {
  sale_id: string
  funding_source_id: string
  cost_amount: number
  display_revenue: number
  actual_revenue: number
  commission: number

  // 分配結果
  investor_return: number    // 投資方應得
  owner_profit: number      // 老闆應得
}
```

**實作步驟**:
- [ ] 建立資金來源追蹤表
- [ ] 實作獲利分配計算
- [ ] 建立資金流報表
- [ ] 實作投資方視圖權限控制

### **3. 價格邏輯統一**
**問題**: 價格來源不一致、雙重價格機制不完整
**影響**: 報價錯誤、客戶價格混亂

**修復計劃**:
```typescript
// 統一價格邏輯
class PriceCalculator {
  async calculateSalePrice(
    customerId: string,
    productId: string,
    variantId?: string
  ): Promise<PriceResult> {
    // 1. 客戶專價 (最高優先級)
    const specialPrice = await this.getCustomerSpecialPrice(customerId, productId)
    if (specialPrice?.is_active) {
      return {
        display_price: specialPrice.display_price,
        actual_price: specialPrice.actual_price,
        source: 'CUSTOMER_SPECIAL'
      }
    }

    // 2. 變體價格
    if (variantId) {
      const variant = await this.getProductVariant(variantId)
      return {
        display_price: variant.current_price,
        actual_price: variant.current_price, // 預設相同，可後續調整
        source: 'VARIANT_PRICE'
      }
    }

    // 3. 產品標準價格
    const product = await this.getProduct(productId)
    return {
      display_price: product.current_price,
      actual_price: product.current_price,
      source: 'STANDARD_PRICE'
    }
  }
}
```

---

## 🔧 **第二階段：結構重整 (優先級 P1)**

### **1. 業務流程HOOK系統重建**
**目標**: 建立完整的業務流程依賴關係管理

**重建計劃**:
```typescript
// 業務流程管理器
class BusinessProcessManager {
  // 採購流程HOOK
  async handlePurchaseStatusChange(purchaseId: string, fromStatus: string, toStatus: string) {
    switch (toStatus) {
      case 'CONFIRMED':
        await this.reserveFunding(purchaseId)
        break
      case 'RECEIVED':
        await this.updateInventory(purchaseId)
        await this.calculateWeightedAverageCost(purchaseId)
        break
      case 'CANCELLED':
        await this.releaseFunding(purchaseId)
        break
    }
  }

  // 銷售流程HOOK
  async handleSaleStatusChange(saleId: string, fromStatus: string, toStatus: string) {
    switch (toStatus) {
      case 'CONFIRMED':
        await this.reserveInventory(saleId)
        break
      case 'SHIPPED':
        await this.updateInventory(saleId)
        await this.calculateProfitAllocation(saleId)
        break
      case 'CANCELLED':
        await this.releaseReservedInventory(saleId)
        break
    }
  }
}
```

### **2. 資料模型標準化**
**目標**: 統一命名規範、消除前後端不一致

**標準化計劃**:
```typescript
// 建立統一的資料模型轉換層
class ModelAdapter {
  // 前端到後端轉換
  toDatabase(frontendModel: any): any {
    return this.convertCamelToSnake(frontendModel)
  }

  // 後端到前端轉換
  toFrontend(databaseModel: any): any {
    return this.convertSnakeToCamel(databaseModel)
  }

  private convertCamelToSnake(obj: any): any {
    // 實作 camelCase -> snake_case 轉換
  }

  private convertSnakeToCamel(obj: any): any {
    // 實作 snake_case -> camelCase 轉換
  }
}
```

### **3. 權限控制系統完善**
**目標**: 建立細粒度的權限控制和資料隔離

**權限系統設計**:
```typescript
// 權限管理器
class PermissionManager {
  // 資料過濾器 - 依據用戶角色過濾敏感資料
  filterDataByRole(data: any, userRole: string): any {
    switch (userRole) {
      case 'INVESTOR':
        return this.filterInvestorView(data)
      case 'EMPLOYEE':
        return this.filterEmployeeView(data)
      case 'SUPER_ADMIN':
        return data // 完整資料
    }
  }

  private filterInvestorView(data: any): any {
    // 隱藏 actual_price, commission, personal_funding 等欄位
    return omit(data, ['actual_price', 'commission', 'personal_funding'])
  }
}
```

---

## ⚡ **第三階段：優化提升 (優先級 P2)**

### **1. 自動化會計分錄**
**目標**: 自動產生會計分錄，簡化財務作業

### **2. 進階報表系統**
**目標**: 提供多維度的營運分析報表

### **3. 批量操作功能**
**目標**: 提升大量資料處理效率

### **4. 庫存盤點系統**
**目標**: 定期庫存盤點和差異調整

---

## 📋 **技術債務處理策略**

### **程式碼品質改善**
```typescript
// 1. 建立 TypeScript 嚴格模式
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}

// 2. 建立統一的錯誤處理機制
class ErrorHandler {
  static async handleApiError(error: unknown): Promise<ApiResponse> {
    if (error instanceof BusinessLogicError) {
      return { success: false, error: error.message, code: error.code }
    }

    if (error instanceof ValidationError) {
      return { success: false, error: '資料驗證失敗', details: error.details }
    }

    // 記錄未預期錯誤
    console.error('Unexpected error:', error)
    return { success: false, error: '系統錯誤，請重試' }
  }
}

// 3. 建立統一的資料驗證機制
class DataValidator {
  static validatePurchaseData(data: PurchaseCreateData): ValidationResult {
    const errors: string[] = []

    if (!data.supplier_id) errors.push('供應商必填')
    if (!data.items || data.items.length === 0) errors.push('採購項目必填')
    if (data.total_amount <= 0) errors.push('總金額必須大於0')

    return { isValid: errors.length === 0, errors }
  }
}
```

### **效能優化策略**
```typescript
// 1. 資料庫查詢優化
class OptimizedQueries {
  // 使用 include 代替多次查詢
  async getPurchaseWithDetails(id: string) {
    return await prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
            variant: true
          }
        },
        funding_source: true
      }
    })
  }

  // 使用 select 減少不必要的資料傳輸
  async getPurchaseList() {
    return await prisma.purchase.findMany({
      select: {
        id: true,
        purchase_number: true,
        status: true,
        total_amount: true,
        supplier: {
          select: { name: true }
        }
      }
    })
  }
}

// 2. 前端狀態管理優化
// 使用 React Query 進行資料快取和同步
const usePurchases = () => {
  return useQuery({
    queryKey: ['purchases'],
    queryFn: fetchPurchases,
    staleTime: 5 * 60 * 1000, // 5分鐘快取
    refetchOnWindowFocus: false
  })
}
```

---

## 🚀 **實施時程規劃**

### **第一週 - 緊急修復啟動**
- [x] 完成系統問題診斷
- [x] 建立業務邏輯文檔
- [ ] 開始庫存系統重建
- [ ] 實作資金流追蹤基礎

### **第二週 - 緊急修復完成**
- [ ] 完成庫存系統重建
- [ ] 完成價格邏輯統一
- [ ] 部署並測試修復結果

### **第三-四週 - 結構重整**
- [ ] 重建業務流程HOOK系統
- [ ] 資料模型標準化
- [ ] 權限控制系統完善

### **持續優化階段**
- [ ] 自動化會計分錄
- [ ] 進階報表系統
- [ ] 效能優化實施

---

## 🎯 **成功指標 (KPI)**

### **系統穩定性指標**
- 庫存計算準確率: 目標 99.9%
- 價格顯示一致性: 目標 100%
- 業務流程錯誤率: 目標 < 0.1%

### **開發效率指標**
- 新功能開發時間: 減少 50%
- Bug 修復時間: 減少 60%
- 程式碼重複率: 減少 40%

### **使用者體驗指標**
- 操作錯誤率: 減少 70%
- 資料載入速度: 提升 50%
- 功能覆蓋率: 提升到 95%

---

## 📚 **持續改善機制**

### **定期檢查點**
- **週檢查**: 修復進度、問題追蹤
- **月檢查**: 系統穩定性、效能指標
- **季檢查**: 業務需求變化、技術更新

### **知識管理**
- 維護 BUSINESS_LOGIC_BIBLE.md
- 建立開發者交接文檔
- 記錄重要決策和架構變更

### **風險管控**
- 建立回滾機制
- 定期資料備份
- 建立災難恢復計劃

---

**💡 此藍圖將作為系統改善的指導原則，確保我們從根本解決問題，而非治標不治本**