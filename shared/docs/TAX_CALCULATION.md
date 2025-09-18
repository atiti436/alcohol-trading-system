# 🧮 酒類進口稅金計算邏輯

## 🎯 重要！這是從DEMO.txt提取的精確計算邏輯

**開發Claude必讀**：這是老闆現有GAS系統的稅金計算邏輯，必須100%複製到新系統中。

---

## 📊 **稅金計算核心函數**

### **calculateAllCosts 函數**
```typescript
// 從DEMO.txt移植過來的精確計算邏輯
function calculateAllCosts(item: ImportItem, exchangeRate: number) {
  const dutiableValueTWD = parseFloat(item.dutiableValueTWD) || 0;

  if (dutiableValueTWD === 0) {
    return {
      purchaseCostTWD: 0,
      tariff: 0,
      alcoholTax: 0,
      tradeFee: 0,
      vat: 0,
      totalTax: 0,
      costPerBottle: 0
    };
  }

  // 1. 關稅 (Import Duty)
  const importDutyRate = parseFloat(item.importDutyRate) || 0;
  const tariff = dutiableValueTWD * (importDutyRate / 100);

  // 2. 菸酒稅 (Alcohol Tax) - 核心邏輯
  const alcoholTax = calculateAlcoholTax(item);

  // 3. 推廣費 (Trade Promotion Fee) - 未滿100元免收
  const tradeFeeCalculated = dutiableValueTWD * 0.0004; // 0.04%
  const tradeFee = tradeFeeCalculated >= 100 ? tradeFeeCalculated : 0;

  // 4. 營業稅 (VAT) - 重要：稅基不含推廣費
  const vatBase = dutiableValueTWD + tariff + alcoholTax;
  const vat = vatBase * 0.05; // 5%

  // 5. 總計
  const totalTax = tariff + alcoholTax + tradeFee + vat;
  const totalCost = dutiableValueTWD + totalTax;
  const costPerBottle = item.quantity > 0 ? totalCost / item.quantity : 0;

  return {
    purchaseCostTWD: Math.round((item.foreignCurrencyUnitPrice || 0) * item.quantity * exchangeRate),
    tariff: Math.round(tariff),
    alcoholTax: Math.round(alcoholTax),
    tradeFee: Math.round(tradeFee),
    vat: Math.round(vat),
    totalTax: Math.round(totalTax),
    costPerBottle: Math.round(costPerBottle)
  };
}
```

---

## 🍷 **菸酒稅計算邏輯**

### **核心分類邏輯**（從DEMO.txt複製）
```typescript
function calculateAlcoholTax(item: ImportItem): number {
  const alcPercentage = parseFloat(item.alc_percentage) || 0;
  const volumeMl = parseFloat(item.volume_ml) || 0;
  const quantity = parseFloat(item.quantity) || 0;
  const volumeInLiters = volumeMl / 1000;
  const itemName = (item.name || '').toUpperCase();

  let alcoholTaxPerLiter = 0;

  // 🍺 啤酒類：每公升 26 元
  if (itemName.includes('BEER') ||
      itemName.includes('啤酒') ||
      itemName.includes('MALTS')) {
    alcoholTaxPerLiter = 26;
  }

  // 🥃 蒸餾酒類：每公升按酒精成分每度 2.5 元
  else if (itemName.includes('WHISKY') ||
           itemName.includes('WHISKEY') ||
           itemName.includes('VODKA') ||
           itemName.includes('RUM') ||
           itemName.includes('GIN') ||
           itemName.includes('BRANDY')) {
    alcoholTaxPerLiter = 2.5 * alcPercentage;
  }

  // 🍶 釀造酒類：每公升按酒精成分每度 7 元
  else if (itemName.includes('WINE') ||
           itemName.includes('葡萄酒') ||
           itemName.includes('SAKE') ||
           itemName.includes('清酒')) {
    alcoholTaxPerLiter = 7 * alcPercentage;
  }

  // 🍯 再製酒類（利口酒）：根據酒精濃度判斷
  else if (itemName.includes('LIQUEUR') ||
           itemName.includes('利口酒')) {
    if (alcPercentage > 20) {
      alcoholTaxPerLiter = 185; // 超過20%：每公升 185 元
    } else {
      alcoholTaxPerLiter = 7 * alcPercentage; // 20%以下：每公升按度數 7 元
    }
  }

  // 🔄 其他酒類：預設為釀造酒
  else {
    alcoholTaxPerLiter = 7 * alcPercentage;
  }

  return alcoholTaxPerLiter * volumeInLiters * quantity;
}
```

---

## 💰 **成本分攤邏輯**

### **抽檢損耗分攤**
```typescript
// 損耗類型枚舉
enum LossType {
  NONE = 'NONE',                    // 無損耗
  INSPECTION = 'INSPECTION',         // 一般抽檢(1瓶)
  RADIATION = 'RADIATION',           // 輻射抽檢(2瓶)
  DAMAGE = 'DAMAGE'                  // 破損(自定義數量)
}

// 修正的成本分攤邏輯
function allocateInspectionLoss(
  originalQuantity: number,
  totalCost: number,
  lossType: LossType,
  customDamageQuantity?: number
): number {
  let totalLoss = 0;

  switch (lossType) {
    case LossType.INSPECTION:
      totalLoss = 1; // 一般抽檢固定消滅1瓶
      break;
    case LossType.RADIATION:
      totalLoss = 2; // 輻射抽檢固定消滅2瓶
      break;
    case LossType.DAMAGE:
      totalLoss = customDamageQuantity || 0; // 破損自定義數量
      break;
    default:
      totalLoss = 0; // 無損耗
  }

  const actualQuantity = originalQuantity - totalLoss;
  return actualQuantity > 0 ? totalCost / actualQuantity : totalCost;
}

// 範例：
// 原採購 12瓶，總成本 $18,000

// 情況1：無抽檢
// 實際可售：12瓶，單瓶成本：$1,500

// 情況2：一般抽檢
// 消滅1瓶 → 實際可售11瓶，單瓶成本：$1,636

// 情況3：輻射抽檢（輻射區進口酒類）
// 消滅2瓶 → 實際可售10瓶，單瓶成本：$1,800

// 情況4：運送破損
// 自定義破損3瓶 → 實際可售9瓶，單瓶成本：$2,000
```

### **額外費用分攤方式**
```typescript
// 三種分攤方式（從DEMO.txt複製）
enum AllocationMethod {
  VALUE = 'VALUE',      // 按金額比例
  QUANTITY = 'QUANTITY', // 按數量平均
  WEIGHT = 'WEIGHT'     // 按重量分配
}

function allocateExtraCosts(
  items: ImportItem[],
  extraCost: number,
  method: AllocationMethod
): number[] {
  let totalBase = 0;

  // 計算分攤基礎
  items.forEach(item => {
    switch (method) {
      case 'VALUE':
        totalBase += item.dutiableValueTWD;
        break;
      case 'QUANTITY':
        totalBase += item.quantity;
        break;
      case 'WEIGHT':
        totalBase += item.weightKG;
        break;
    }
  });

  // 分攤計算
  return items.map(item => {
    let currentBase = 0;
    switch (method) {
      case 'VALUE': currentBase = item.dutiableValueTWD; break;
      case 'QUANTITY': currentBase = item.quantity; break;
      case 'WEIGHT': currentBase = item.weightKG; break;
    }

    return (currentBase / totalBase) * extraCost;
  });
}
```

---

## 🧪 **計算範例**

### **白鶴清酒範例**（與DEMO.txt一致）
```typescript
const testItem = {
  name: '白鶴清酒',
  alc_percentage: 15,
  volume_ml: 720,
  quantity: 1,
  foreignCurrencyUnitPrice: 800, // JPY
  dutiableValueTWD: 168, // 800 * 0.21
  importDutyRate: 20
};

const result = calculateAllCosts(testItem, 0.21);

/* 預期結果：
{
  purchaseCostTWD: 168,     // ¥800 × 0.21
  tariff: 34,               // $168 × 20%
  alcoholTax: 76,           // 0.72L × 15度 × 7元
  tradeFee: 0,              // $168 × 0.04% = $0.067 < 100免收
  vat: 14,                  // ($168+$34+$76) × 5%
  totalTax: 124,
  costPerBottle: 292        // $168 + $124
}
*/
```

---

## ⚠️ **重要注意事項**

### **必須遵循的計算規則**
1. **推廣費免收規則**：未滿100元不徵收
2. **營業稅稅基**：完稅價格 + 關稅 + 菸酒稅（不含推廣費）
3. **四捨五入**：所有金額都要四捨五入到整數
4. **商品名稱判斷**：必須支援中英文商品名稱

### **菸酒稅分類關鍵字**
```typescript
const ALCOHOL_KEYWORDS = {
  BEER: ['BEER', '啤酒', 'MALTS'],
  WHISKY: ['WHISKY', 'WHISKEY'],
  SPIRITS: ['VODKA', 'RUM', 'GIN', 'BRANDY'],
  WINE: ['WINE', '葡萄酒'],
  SAKE: ['SAKE', '清酒'],
  LIQUEUR: ['LIQUEUR', '利口酒']
};
```

### **系統常數**
```typescript
const TAX_CONSTANTS = {
  TRADE_FEE_RATE: 0.0004,        // 推廣費率 0.04%
  TRADE_FEE_MINIMUM: 100,        // 推廣費最低門檻
  VAT_RATE: 0.05,                // 營業稅率 5%

  // 菸酒稅率
  BEER_TAX: 26,                  // 啤酒每公升26元
  SPIRITS_TAX_RATE: 2.5,         // 蒸餾酒每度2.5元
  WINE_TAX_RATE: 7,              // 釀造酒每度7元
  LIQUEUR_HIGH_TAX: 185,         // 再製酒(>20%)每公升185元
  LIQUEUR_LOW_TAX_RATE: 7        // 再製酒(≤20%)每度7元
};
```

---

## 🔧 **實作檢查清單**

### **開發Claude必須確認**
- [ ] calculateAllCosts函數完全按照DEMO.txt實作
- [ ] 菸酒稅分類邏輯與DEMO.txt一致
- [ ] 推廣費免收規則正確實作
- [ ] 營業稅稅基計算正確（不含推廣費）
- [ ] 所有金額都有四捨五入
- [ ] 支援中英文商品名稱判斷
- [ ] 成本分攤邏輯與DEMO.txt相同
- [ ] 測試用例結果與DEMO.txt一致

**這是系統的核心計算邏輯，必須100%準確！** ⚖️