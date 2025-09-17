# 庫存連動規則 (Inventory Logic)

本文件定義庫存管理的核心邏輯，確保庫存數據準確，防止超賣問題。

## 🎯 核心原則

1. **庫存即時更新**: 任何影響庫存的動作都要立即反映在系統中
2. **防止超賣**: 系統不能讓客戶購買超過實際庫存的商品
3. **可追蹤**: 所有庫存變動都要有明確記錄
4. **狀態清楚**: 區分「總庫存」「可售庫存」「預留庫存」

---

## 📊 庫存狀態定義

### 庫存數量類型
```
總庫存 (total_stock) = 實際倉庫內的商品總數
預留庫存 (reserved_stock) = 已下單但未出貨的數量  
可售庫存 (available_stock) = 總庫存 - 預留庫存
```

### 庫存狀態範例
```
山崎18年威士忌 P00001-A:
- 總庫存: 50瓶
- 預留庫存: 8瓶 (客戶已下單但還沒出貨)
- 可售庫存: 42瓶 (還可以賣的數量)
```

---

## 🔄 庫存連動規則

### 1. 客戶下單 → 預留庫存
**觸發時機**: 銷售訂單狀態變為 `CONFIRMED`
**動作**: 
```
預留庫存 += 訂單數量
可售庫存 -= 訂單數量
```
**檢查**: 確認可售庫存足夠，否則拒絕訂單

### 2. 商品出貨 → 扣減總庫存
**觸發時機**: 出貨單狀態變為 `SHIPPED` 
**動作**:
```
總庫存 -= 出貨數量
預留庫存 -= 出貨數量
```
**結果**: 可售庫存自動重新計算

### 3. 訂單取消 → 釋放預留庫存
**觸發時機**: 銷售訂單狀態變為 `CANCELLED`
**動作**:
```
預留庫存 -= 取消數量
可售庫存 += 取消數量
```

### 4. 商品進貨 → 增加總庫存
**觸發時機**: 進貨單狀態變為 `RECEIVED`
**動作**:
```
總庫存 += 進貨數量
可售庫存 += 進貨數量
```

---

## 📋 具體業務場景

### 場景1: 正常銷售流程
```
初始狀態: 山崎18年 總庫存50瓶，預留0瓶，可售50瓶

1. 客戶下單3瓶 (訂單確認)
   → 總庫存50瓶，預留3瓶，可售47瓶

2. 出貨3瓶 (出貨確認)  
   → 總庫存47瓶，預留0瓶，可售47瓶

結果: 庫存正確扣減
```

### 場景2: 部分出貨
```
初始狀態: 山崎18年 總庫存50瓶，預留0瓶，可售50瓶

1. 客戶下單10瓶 (訂單確認)
   → 總庫存50瓶，預留10瓶，可售40瓶

2. 先出貨6瓶 (部分出貨)
   → 總庫存44瓶，預留4瓶，可售40瓶

3. 後出貨4瓶 (完成出貨)
   → 總庫存40瓶，預留0瓶，可售40瓶

結果: 支援分批出貨
```

### 場景3: 超賣防護
```
初始狀態: 山崎18年 總庫存5瓶，預留2瓶，可售3瓶

客戶想下單5瓶:
系統檢查: 5瓶 > 可售庫存3瓶 
→ 拒絕訂單，顯示「庫存不足，目前可售3瓶」

結果: 成功防止超賣
```

### 場景4: 庫存調撥 (損傷品)
```
初始狀態: 
- P00001-A (正常品) 總庫存50瓶，可售50瓶
- P00001-X (損傷品) 總庫存0瓶，可售0瓶

發現2瓶包裝破損，需要調撥:

1. 從 P00001-A 調出2瓶
   → P00001-A: 總庫存48瓶，可售48瓶

2. 調入 P00001-X 2瓶
   → P00001-X: 總庫存2瓶，可售2瓶

結果: 正常品和損傷品分別管理
```

---

## 🔧 技術實作規範

### 資料庫結構
```sql
-- 庫存主表
CREATE TABLE inventory_stock (
  id UUID PRIMARY KEY,
  variant_id UUID NOT NULL,
  total_stock INTEGER NOT NULL DEFAULT 0,
  reserved_stock INTEGER NOT NULL DEFAULT 0,
  available_stock INTEGER NOT NULL GENERATED ALWAYS AS (total_stock - reserved_stock) STORED,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 庫存異動記錄
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY,
  variant_id UUID NOT NULL,
  transaction_type VARCHAR(50) NOT NULL, -- PURCHASE, SALE, TRANSFER, ADJUSTMENT
  reference_id UUID, -- 關聯的訂單/進貨單ID
  quantity INTEGER NOT NULL, -- 正數為增加，負數為減少
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL
);
```

### API實作範例
```typescript
// 庫存檢查函數
export async function checkStockAvailability(variantId: string, quantity: number): Promise<boolean> {
  const stock = await db.inventory_stock.findUnique({
    where: { variant_id: variantId }
  });
  
  if (!stock) {
    throw new Error('商品不存在');
  }
  
  return stock.available_stock >= quantity;
}

// 預留庫存函數
export async function reserveStock(variantId: string, quantity: number, orderId: string): Promise<void> {
  // 檢查可售庫存
  const hasStock = await checkStockAvailability(variantId, quantity);
  if (!hasStock) {
    throw new Error('庫存不足，無法預留');
  }
  
  // 使用交易確保原子性
  await db.$transaction(async (tx) => {
    // 更新預留庫存
    await tx.inventory_stock.update({
      where: { variant_id: variantId },
      data: { reserved_stock: { increment: quantity } }
    });
    
    // 記錄異動
    await tx.inventory_transactions.create({
      data: {
        variant_id: variantId,
        transaction_type: 'RESERVE',
        reference_id: orderId,
        quantity: quantity,
        reason: `預留庫存 - 訂單 ${orderId}`,
        created_by: getCurrentUserId()
      }
    });
  });
}

// 出貨扣庫存函數
export async function shipStock(variantId: string, quantity: number, shipmentId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    // 同時扣減總庫存和預留庫存
    await tx.inventory_stock.update({
      where: { variant_id: variantId },
      data: { 
        total_stock: { decrement: quantity },
        reserved_stock: { decrement: quantity }
      }
    });
    
    // 記錄異動
    await tx.inventory_transactions.create({
      data: {
        variant_id: variantId,
        transaction_type: 'SHIPMENT',
        reference_id: shipmentId,
        quantity: -quantity,
        reason: `商品出貨 - 出貨單 ${shipmentId}`,
        created_by: getCurrentUserId()
      }
    });
  });
}
```

---

## ⚠️ 重要業務規則

### 投資方vs個人調貨隔離
```typescript
// 庫存查詢要區分資金來源
export async function getAvailableStock(variantId: string, userRole: string, investorId?: string): Promise<number> {
  const stock = await getStock(variantId);
  
  if (userRole === 'SUPER_ADMIN') {
    // 老闆看到全部可售庫存
    return stock.available_stock;
  } else if (userRole === 'INVESTOR') {
    // 投資方只能看到投資項目的庫存
    // 個人調貨的庫存對投資方不可見
    return getInvestorAvailableStock(variantId, investorId);
  }
  
  return 0;
}
```

### 變體間調撥規則
```typescript
// 庫存調撥 (如正常品調為損傷品)
export async function transferStock(
  fromVariantId: string, 
  toVariantId: string, 
  quantity: number, 
  reason: string
): Promise<void> {
  await db.$transaction(async (tx) => {
    // 從來源變體扣除
    await tx.inventory_stock.update({
      where: { variant_id: fromVariantId },
      data: { total_stock: { decrement: quantity } }
    });
    
    // 增加到目標變體
    await tx.inventory_stock.upsert({
      where: { variant_id: toVariantId },
      update: { total_stock: { increment: quantity } },
      create: {
        variant_id: toVariantId,
        total_stock: quantity,
        reserved_stock: 0
      }
    });
    
    // 記錄調撥異動
    await createTransferTransactions(fromVariantId, toVariantId, quantity, reason);
  });
}
```

---

## 📱 使用者介面提示

### 前端顯示建議
```typescript
// 庫存狀態顯示組件
const StockStatus = ({ variant }) => {
  const getStockColor = (available: number) => {
    if (available === 0) return 'red';
    if (available < 10) return 'orange'; 
    return 'green';
  };
  
  const getStockText = (available: number) => {
    if (available === 0) return '無庫存';
    if (available < 10) return `庫存偏低 (${available}瓶)`;
    return `庫存充足 (${available}瓶)`;
  };
  
  return (
    <Tag color={getStockColor(variant.available_stock)}>
      {getStockText(variant.available_stock)}
    </Tag>
  );
};
```

### 訂單頁面庫存檢查
```typescript
// 下單時即時檢查庫存
const OrderForm = () => {
  const checkStock = async (variantId: string, quantity: number) => {
    const response = await fetch(`/api/inventory/${variantId}/check?quantity=${quantity}`);
    const { available } = await response.json();
    
    if (available < quantity) {
      message.error(`庫存不足！目前可售${available}瓶`);
      return false;
    }
    return true;
  };
  
  const handleQuantityChange = async (variantId: string, quantity: number) => {
    if (quantity > 0) {
      await checkStock(variantId, quantity);
    }
  };
};
```

---

## 🚨 異常處理

### 庫存異常偵測
```sql
-- 檢查庫存異常的SQL查詢
SELECT 
  v.variant_code,
  i.total_stock,
  i.reserved_stock,
  i.available_stock,
  CASE 
    WHEN i.total_stock < 0 THEN '總庫存為負數'
    WHEN i.reserved_stock < 0 THEN '預留庫存為負數'  
    WHEN i.reserved_stock > i.total_stock THEN '預留庫存大於總庫存'
    WHEN i.available_stock != (i.total_stock - i.reserved_stock) THEN '可售庫存計算錯誤'
  END as error_type
FROM inventory_stock i
JOIN product_variants v ON i.variant_id = v.id
WHERE i.total_stock < 0 
   OR i.reserved_stock < 0
   OR i.reserved_stock > i.total_stock
   OR i.available_stock != (i.total_stock - i.reserved_stock);
```

### 自動修復機制
```typescript
// 庫存數據修復函數
export async function fixInventoryInconsistency() {
  const inconsistentStocks = await findInconsistentStocks();
  
  for (const stock of inconsistentStocks) {
    await db.$transaction(async (tx) => {
      // 重新計算預留庫存 (基於未完成訂單)
      const actualReserved = await calculateActualReservedStock(stock.variant_id);
      
      // 更新庫存記錄
      await tx.inventory_stock.update({
        where: { variant_id: stock.variant_id },
        data: { reserved_stock: actualReserved }
      });
      
      // 記錄修復動作
      await tx.inventory_transactions.create({
        data: {
          variant_id: stock.variant_id,
          transaction_type: 'ADJUSTMENT',
          quantity: 0,
          reason: '系統自動修復庫存不一致',
          created_by: 'SYSTEM'
        }
      });
    });
  }
}
```

---

## ✅ 給螞蟻的檢查清單

### 螞蟻A (監督) 檢查項目:
- [ ] 所有庫存異動都有對應的交易記錄？
- [ ] 超賣防護機制是否有效？
- [ ] 投資方看不到個人調貨庫存？
- [ ] 異常處理邏輯是否完整？

### 螞蟻B (實作) 開發要點:
- [ ] 使用資料庫交易確保庫存操作原子性
- [ ] 實作庫存檢查的API端點
- [ ] 前端即時顯示庫存狀態
- [ ] 建立庫存異常監控和修復機制

### 給老闆的操作建議:
- 🔴 **看到「庫存不足」提示時**: 表示系統正在保護您，避免超賣
- 🔴 **手動調整庫存時**: 一定要填寫調整原因，方便日後追蹤
- 🔴 **發現庫存數字不對時**: 立即通知螞蟻檢查和修復

---

**最後更新**: 2025/9/16  
**適用房間**: Room-2 (商品管理), Room-3 (交易核心), Room-4 (銷售管理)  
**緊急情況**: 如發現超賣情況，立即暫停相關商品銷售並檢查庫存數據