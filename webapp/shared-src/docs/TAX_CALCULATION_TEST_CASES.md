# 🧮 稅金計算測試案例 (Tax Calculation Test Cases)

## 🎯 目標
提供完整的稅金計算測試案例，確保計算邏輯100%準確。

---

## 📋 標準計算案例

### **案例1：基本日本清酒進口**
```
商品：白鶴特級清酒
容量：720ml
酒精度：15%
日幣單價：¥800
匯率：0.21
數量：100瓶

計算步驟：
1. 台幣成本 = ¥800 × 0.21 = $168/瓶
2. 關稅 = $168 × 20% = $33.6/瓶
3. 菸酒稅 = $168 × 18.5% = $31.08/瓶
4. 推廣費 = $168 × 5% = $8.4/瓶
5. 營業稅 = ($168 + $33.6 + $31.08 + $8.4) × 5% = $12.05/瓶

總成本 = $168 + $33.6 + $31.08 + $8.4 + $12.05 = $253.13/瓶

批次成本 = $253.13 × 100 = $25,313
```

### **案例2：高度威士忌進口**
```
商品：山崎18年威士忌
容量：700ml
酒精度：43%
日幣單價：¥28,000
匯率：0.21
數量：24瓶

計算步驟：
1. 台幣成本 = ¥28,000 × 0.21 = $5,880/瓶
2. 關稅 = $5,880 × 20% = $1,176/瓶
3. 菸酒稅 = $5,880 × 18.5% = $1,087.8/瓶
4. 推廣費 = $5,880 × 5% = $294/瓶
5. 營業稅 = ($5,880 + $1,176 + $1,087.8 + $294) × 5% = $421.89/瓶

總成本 = $5,880 + $1,176 + $1,087.8 + $294 + $421.89 = $8,859.69/瓶

批次成本 = $8,859.69 × 24 = $212,632.56
```

### **案例3：抽檢損耗分攤**
```
商品：獺祭純米大吟釀
總進口：120瓶
抽檢消滅：3瓶
實際入庫：117瓶
單瓶成本：$350

計算邏輯：
總成本 = $350 × 120 = $42,000
實際成本 = $42,000 ÷ 117 = $359.0/瓶

每瓶分攤抽檢損失 = $9.0/瓶
```

---

## 🧪 自動化測試代碼

### **基礎稅金計算測試**
```typescript
// tests/tax-calculation.test.ts
import { calculateImportCost } from '../lib/tax-calculator';

describe('稅金計算測試', () => {
  test('白鶴清酒基本計算', () => {
    const input = {
      jpyPrice: 800,
      exchangeRate: 0.21,
      volume: 720,
      alc_percentage: 15,
      quantity: 100
    };

    const result = calculateImportCost(input);

    expect(result.unitCostTWD).toBe(168);
    expect(result.importDuty).toBe(33.6);
    expect(result.tobaccoTax).toBe(31.08);
    expect(result.promotionFee).toBe(8.4);
    expect(result.vat).toBe(12.05);
    expect(result.totalUnitCost).toBe(253.13);
    expect(result.batchTotalCost).toBe(25313);
  });

  test('山崎威士忌高價計算', () => {
    const input = {
      jpyPrice: 28000,
      exchangeRate: 0.21,
      volume: 700,
      alc_percentage: 43,
      quantity: 24
    };

    const result = calculateImportCost(input);

    expect(result.unitCostTWD).toBe(5880);
    expect(result.totalUnitCost).toBe(8859.69);
    expect(result.batchTotalCost).toBe(212632.56);
  });

  test('抽檢損耗分攤計算', () => {
    const input = {
      totalQuantity: 120,
      destroyedQuantity: 3,
      actualQuantity: 117,
      originalUnitCost: 350
    };

    const result = calculateInspectionLoss(input);

    expect(result.adjustedUnitCost).toBe(359.0);
    expect(result.lossPerUnit).toBe(9.0);
  });
});
```

### **邊界測試案例**
```typescript
describe('邊界值測試', () => {
  test('零酒精度商品', () => {
    const input = {
      jpyPrice: 500,
      exchangeRate: 0.21,
      alc_percentage: 0, // 無酒精
      quantity: 100
    };

    const result = calculateImportCost(input);
    expect(result.tobaccoTax).toBe(0); // 無酒精不課菸酒稅
  });

  test('100%酒精度商品', () => {
    const input = {
      jpyPrice: 2000,
      exchangeRate: 0.21,
      alc_percentage: 100, // 純酒精
      quantity: 50
    };

    const result = calculateImportCost(input);
    expect(result.tobaccoTax).toBeGreaterThan(0);
  });

  test('匯率極值測試', () => {
    const input1 = {
      jpyPrice: 1000,
      exchangeRate: 0.001, // 極低匯率
      quantity: 100
    };

    const input2 = {
      jpyPrice: 1000,
      exchangeRate: 1.0, // 極高匯率
      quantity: 100
    };

    expect(() => calculateImportCost(input1)).not.toThrow();
    expect(() => calculateImportCost(input2)).not.toThrow();
  });
});
```

---

## 💰 實際案例驗證

### **驗證方式**
1. **歷史單據對照**：用過去的實際進口單據驗證計算結果
2. **關務署資料**：對照官方稅率表確認計算正確
3. **會計師確認**：請會計師驗證計算邏輯
4. **多重驗算**：Excel、計算機、系統三重驗算

### **容錯率要求**
- 稅金計算誤差：≤ $0.01/瓶
- 批次總額誤差：≤ $1.00/批次
- 分攤計算誤差：≤ $0.01/瓶

---

## 🔧 實作檢查清單

### **開發階段**
- [ ] 實作基礎稅金計算函數
- [ ] 實作抽檢損耗分攤邏輯
- [ ] 建立完整測試套件
- [ ] 驗證邊界值處理

### **測試階段**
- [ ] 執行所有自動化測試
- [ ] 人工驗證標準案例
- [ ] 對照歷史資料驗證
- [ ] 會計師簽核確認

### **部署前**
- [ ] 生產環境計算測試
- [ ] 效能壓力測試
- [ ] 錯誤處理測試
- [ ] 備援計算方案

---

**計算準確性是系統的生命線，絕不容許錯誤！**