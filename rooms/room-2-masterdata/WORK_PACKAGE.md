# 📦 Room-2 工作包：主檔管理

## 🎯 **新螞蟻快速入門**

歡迎來到Room-2！我是您的前任，已經為您準備好了一切。

### **30秒理解您的任務**
您負責**Customer + Product模組**，這是系統的主檔管理核心。客戶和商品是所有交易的基礎，做好這個其他房間才能順利運作。

## 📚 **立即閱讀清單 (按順序)**

1. **必讀文檔** (先讀這些)：
   - `../FOR_CLAUDE.md` - 整個專案交接
   - `../docs/OVERVIEW.md` - 系統總覽
   - `../docs/BUSINESS_LOGIC.md` - 商業邏輯 (重點：客戶分級)

2. **單一事實來源** (開發前必讀) ⚠️重要：
   - `../shared/docs/ID_DEFINITIONS.md` - **所有ID和編號規則**
   - `../shared/docs/DATA_MODELS.md` - **統一資料模型定義**

3. **三大防護文件** (必讀)：
   - `../shared/docs/VALIDATION_RULES.md` - 資料驗證規則 🛡️防錯
   - `../shared/docs/INVENTORY_LOGIC.md` - 庫存連動規則 📦防超賣
   - `../shared/docs/PERMISSION_CONTROL.md` - 權限控制實作 🔒保護機密

4. **開發必備** (開始編碼前)：
   - `../shared/docs/API_SPEC.md` - API規格 (Customer/Product部分)
   - `../shared/docs/UI_DESIGN_SPEC.md` - UI設計規範
   - `./README.md` - 本房間詳細任務

5. **體驗優化文檔** (品質提升) ⭐新增：
   - `../shared/docs/UI_COMPONENT_LIBRARY.md` - **UI組件庫標準** 🎨統一設計
   - `../shared/docs/RESPONSIVE_DESIGN_SPEC.md` - **響應式設計規範** 📱手機友善
   - `../shared/docs/PERFORMANCE_OPTIMIZATION.md` - **效能優化指南** ⚡提升速度
   - `../shared/docs/CODE_QUALITY_STANDARDS.md` - **程式碼品質管控** 🔧維護性

## 🚀 **開發路線圖**

### **Week 1: Customer模組 (4-5天)**
```
Day 1-2: Customer CRUD基礎
├── 客戶資料模型 (Prisma Schema)
├── 基本API (GET/POST/PUT/DELETE)
└── 簡單列表頁面

Day 3-4: 客戶分級系統
├── VIP/REGULAR/PREMIUM/NEW 分級邏輯
├── 分級對應的權益設定
└── 分級顯示和管理介面

Day 5: 客戶搜尋
├── 模糊搜尋功能 (姓名/電話/公司)
├── 分級篩選
└── 搜尋結果排序
```

### **Week 2: Product模組 (5-6天)**
```
Day 1-2: Product基礎功能
├── 商品資料模型
├── 分類管理
└── 基本CRUD

Day 3-4: 商品變體系統 ⭐核心功能
├── 同一款酒不同規格 (容量/度數/包裝)
├── 變體價格管理
└── 變體庫存追蹤

Day 5-6: 商品進階功能
├── 商品圖片上傳
├── 智慧搜尋 (品名/品號/分類)
├── 品號自動生成規則
└── 商品批量操作
```

### **整合測試 (1-2天)**
```
├── API整合測試
├── 前後端聯調
├── 與Room-1權限系統整合
└── 為Room-3/Room-4準備資料介面
```

## 🔧 **技術規格速查**

### **關鍵API端點**
```typescript
// Customer API
GET    /api/customers              // 客戶列表 (支援搜尋篩選)
POST   /api/customers              // 新增客戶
GET    /api/customers/:id          // 客戶詳情
PUT    /api/customers/:id          // 更新客戶
DELETE /api/customers/:id          // 刪除客戶
PUT    /api/customers/:id/tier     // 更新客戶分級

// Product API
GET    /api/products               // 商品列表 (支援搜尋篩選)
POST   /api/products               // 新增商品
GET    /api/products/:id           // 商品詳情
PUT    /api/products/:id           // 更新商品
DELETE /api/products/:id           // 刪除商品
GET    /api/products/:id/variants  // 商品變體
POST   /api/products/:id/variants  // 新增變體
```

### **資料庫Schema重點**
```prisma
// 客戶表
model Customer {
  id          String      @id @default(cuid())
  name        String
  email       String?
  phone       String?
  company     String?
  tier        CustomerTier @default(REGULAR)
  address     String?
  notes       String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  // 關聯
  orders      Order[]
  specialPrices CustomerSpecialPrice[]
}

enum CustomerTier {
  VIP      // 優惠客戶 -5%
  REGULAR  // 一般客戶 標準價
  PREMIUM  // 高價客戶 +10%
  NEW      // 新客戶 公版價
}

// 商品表
model Product {
  id          String      @id @default(cuid())
  name        String
  code        String      @unique  // 品號 如W001
  category    String
  origin      String?     // 產地
  brand       String?     // 品牌
  description String?
  imageUrl    String?
  isActive    Boolean     @default(true)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  // 關聯
  variants    ProductVariant[]
  purchases   PurchaseItem[]
}

// 商品變體表 (同款酒不同規格)
model ProductVariant {
  id          String   @id @default(cuid())
  productId   String
  sku         String   @unique    // SKU如W001-700-43
  volume_ml   Float    // 容量 700ml
  alc_percentage Float?   // 酒精度 43%
  packaging   String?  // 包裝 禮盒/普通
  standardPrice Decimal // 標準售價
  currentPrice  Decimal // 目前售價(可調整)
  minPrice     Decimal  // 最低限價

  // 關聯
  product     Product  @relation(fields: [productId], references: [id])
}
```

## ⚠️ **重要注意事項**

### **商業邏輯要點**
- **客戶分級影響報價**：不同tier的客戶看到不同價格 (但價格邏輯在Room-4)
- **商品變體很重要**：同一款山崎18年可能有700ml/1L，43度/48度等變體
- **品號生成規則**：W(威士忌)+編號，如W001, W002...
- **搜尋要智慧**：支援模糊搜尋，「山崎」要能找到「山崎18年威士忌」

### **與其他房間的接口**
- **Room-1依賴**：需要Room-1的權限系統完成才能開始
- **Room-3需要**：Purchase模組會用到Product資料
- **Room-4需要**：Sales模組會用到Customer和Product資料
- **資料權限**：投資方看不到個人調貨的客戶資料

### **UI設計重點**
- **客戶列表**：要有分級標籤，VIP客戶要突出顯示
- **商品管理**：變體要清楚展示，庫存狀態要明顯
- **搜尋功能**：要快速、準確，支援多條件篩選
- **手機友好**：老闆常用手機操作

## 📋 **交接檢查清單**

完成後請確保：
- [ ] Customer CRUD全功能正常
- [ ] 客戶分級系統運作正確
- [ ] Product CRUD全功能正常
- [ ] 商品變體系統完整
- [ ] 搜尋功能快速準確
- [ ] 與Room-1權限整合無誤
- [ ] API文檔更新完整
- [ ] 單元測試覆蓋率>70%
- [ ] 代碼註解清楚
- [ ] 部署說明完整

## 🆘 **遇到問題怎麼辦**

1. **商業邏輯不清楚** → 查看 `BUSINESS_LOGIC.md`
2. **API規格不確定** → 查看 `API_SPEC.md`
3. **UI設計疑問** → 查看 `UI_DESIGN_SPEC.md`
4. **權限整合問題** → 找Room-1螞蟻討論
5. **資料庫設計** → 查看 `shared/docs/DATABASE_SCHEMA.md`

## 💪 **成功標準**

您的模組完成後，其他房間的螞蟻應該能夠：
- 輕鬆獲取客戶和商品資料
- 使用您的API進行交易操作
- 看到清楚的客戶分級資訊
- 管理複雜的商品變體

**您是系統的基石之一，加油！** 🚀

**有任何問題隨時透過老闆聯絡其他房間！**