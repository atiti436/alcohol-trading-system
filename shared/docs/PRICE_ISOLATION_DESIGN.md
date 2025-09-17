# 🔒 價格資料隔離設計 (Price Data Isolation Design)

## 🎯 目標
確保投資方永遠無法看到真實銷售價格，完全隔離敏感商業資料。

---

## 💰 雙重價格核心邏輯

### **真實商業流程**
```
客戶實付: $1200 (真實收入)
    ↓
系統分離處理:
├─ 投資方看到: $1000 (調整後顯示價格)
└─ 老闆實得: $200 (差額利潤)
```

### **資料層隔離設計**
```typescript
// 資料庫儲存結構
interface SalesRecord {
  // 公開資料 (投資方可見)
  display_price: number;        // 顯示價格 $1000
  cost_price: number;          // 成本價格 $800

  // 機密資料 (僅老闆可見)
  actual_price: number;        // 實際收款 $1200
  owner_profit: number;        // 老闆利潤 $200

  // 權限控制
  investor_id?: string;        // 如果有投資方參與
  is_personal_deal: boolean;   // 是否為個人交易
}
```

---

## 🔐 API層級權限控制

### **查詢API設計**
```typescript
// GET /api/sales - 根據角色返回不同資料
export default async function handler(req: Request, res: Response) {
  const user = await getUserFromToken(req);

  if (user.role === 'INVESTOR') {
    // 投資方只能看到過濾後的資料
    const sales = await getSalesForInvestor(user.investor_id);
    return res.json({
      data: sales.map(sale => ({
        id: sale.id,
        customer_name: sale.customer_name,
        product_name: sale.product_name,
        quantity: sale.quantity,
        display_price: sale.display_price,     // ✅ 顯示調整價格
        cost_price: sale.cost_price,           // ✅ 成本價格
        profit: sale.display_price - sale.cost_price, // ✅ 計算的利潤
        // actual_price: NEVER!                // ❌ 絕不提供
        // owner_profit: NEVER!                // ❌ 絕不提供
      }))
    });
  }

  if (user.role === 'SUPER_ADMIN') {
    // 老闆可以看到完整資料
    const sales = await getAllSales();
    return res.json({
      data: sales // 完整資料
    });
  }
}
```

### **前端顯示控制**
```typescript
// components/PriceDisplay.tsx
interface PriceDisplayProps {
  sale: SalesRecord;
  userRole: string;
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({ sale, userRole }) => {
  if (userRole === 'INVESTOR') {
    return (
      <div>
        <div>銷售價格: ${sale.display_price.toLocaleString()}</div>
        <div>成本價格: ${sale.cost_price.toLocaleString()}</div>
        <div>獲利: ${(sale.display_price - sale.cost_price).toLocaleString()}</div>
      </div>
    );
  }

  if (userRole === 'SUPER_ADMIN') {
    return (
      <div>
        <div>顯示價格: ${sale.display_price.toLocaleString()}</div>
        <div className="text-green-600 font-bold">
          實際收款: ${sale.actual_price.toLocaleString()}
        </div>
        <div>成本價格: ${sale.cost_price.toLocaleString()}</div>
        <div className="text-blue-600">
          老闆利潤: ${sale.owner_profit.toLocaleString()}
        </div>
      </div>
    );
  }
};
```

---

## 🧪 測試驗證方案

### **自動化測試**
```typescript
// tests/price-isolation.test.ts
describe('價格資料隔離測試', () => {
  test('投資方無法看到真實價格', async () => {
    const investorToken = generateInvestorToken();
    const response = await request(app)
      .get('/api/sales')
      .set('Authorization', `Bearer ${investorToken}`);

    expect(response.body.data).toHaveLength(5);
    response.body.data.forEach(sale => {
      expect(sale).not.toHaveProperty('actual_price');
      expect(sale).not.toHaveProperty('owner_profit');
      expect(sale).toHaveProperty('display_price');
    });
  });

  test('JSON回應不包含敏感欄位', async () => {
    const investorToken = generateInvestorToken();
    const response = await request(app)
      .get('/api/sales')
      .set('Authorization', `Bearer ${investorToken}`);

    const responseString = JSON.stringify(response.body);
    expect(responseString).not.toContain('actual_price');
    expect(responseString).not.toContain('owner_profit');
  });
});
```

### **手動檢查清單**
- [ ] 投資方登入後檢查Network面板，確認沒有敏感資料
- [ ] 直接API調用測試，確認權限控制有效
- [ ] 前端元素檢查，確認沒有隱藏的敏感資料
- [ ] 匯出功能測試，確認Excel中沒有敏感欄位

---

## ⚠️ 開發注意事項

### **絕對禁止**
1. 前端JavaScript變數包含真實價格
2. API回應包含未使用的敏感欄位
3. 資料庫查詢返回不必要欄位
4. 開發模式下的debug資訊洩漏

### **強制要求**
1. 所有價格相關API都要有角色檢查
2. 資料庫查詢要使用SELECT指定欄位
3. 前端組件要有userRole prop驗證
4. 測試覆蓋率必須100%

---

## 🔧 實作檢查清單

### **後端實作**
- [ ] 建立角色權限中間件
- [ ] 實作分角色查詢函數
- [ ] 設定資料庫視圖隔離
- [ ] 建立自動化測試

### **前端實作**
- [ ] 建立PriceDisplay組件
- [ ] 實作RoleGuard高階組件
- [ ] 設定條件式渲染
- [ ] 移除開發工具洩漏

### **安全驗證**
- [ ] 滲透測試模擬
- [ ] 權限邊界測試
- [ ] API回應檢查
- [ ] 前端檢查工具

---

**這是系統最核心的商業機密保護機制，容不得一絲疏忽！**