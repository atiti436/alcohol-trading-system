# 📦 Room-7 工作包 - UI/UX專門房間

## 🎯 **工作包概述**

本工作包定義Room-7螞蟻的具體開發任務，包含詳細的功能需求、技術規格和交付標準。

## 📚 **必讀單一事實來源 (開發前必讀)** ⚠️重要
- `../shared/docs/ID_DEFINITIONS.md` - **所有ID和編號規則**
- `../shared/docs/DATA_MODELS.md` - **統一資料模型定義**
- `../shared/docs/UI_DESIGN_SPEC.md` - UI設計規範標準

## 🎨 **體驗優化文檔** (品質提升) ⭐新增
- `../shared/docs/UI_COMPONENT_LIBRARY.md` - **UI組件庫標準** 🎨統一設計
- `../shared/docs/RESPONSIVE_DESIGN_SPEC.md` - **響應式設計規範** 📱手機友善
- `../shared/docs/PERFORMANCE_OPTIMIZATION.md` - **效能優化指南** ⚡提升速度
- `../shared/docs/CODE_QUALITY_STANDARDS.md` - **程式碼品質管控** 🔧維護性

---

## 📋 **任務清單**

### **💎 階段一：Dashboard核心UI (Week 1-2)**

#### **任務1.1：KPI概覽卡片系統**
**預估時間**: 3-4天 | **複雜度**: 🟡 中等 | **Token預算**: 40-50k

**功能需求**:
- 4個主要KPI卡片：當月銷售額、活躍客戶、待處理事項、當月毛利
- 趨勢顯示：vs上月比較，上升/下降指示
- 響應式設計：桌面4個一行，平板2個一行，手機1個一行
- 數據隔離：投資方看到的數據要經過過濾

**技術規格**:
```tsx
interface KPICardProps {
  type: 'sales' | 'customers' | 'pending' | 'profit';
  value: number;
  trend?: number;
  loading?: boolean;
  userRole: UserRole;
}
```

**交付標準**:
- [ ] KPI卡片組件完成
- [ ] 趣勢計算邏輯正確
- [ ] 響應式設計測試通過
- [ ] 投資方數據隔離驗證

#### **任務1.2：客戶追蹤關懷系統**
**預估時間**: 4-5天 | **複雜度**: 🔴 高 | **Token預算**: 50-60k

**功能需求**:
- 三個分類Tab：超期客戶、即將到期、VIP關懷
- 客戶列表：頭像、姓名、上次聯絡、狀態標籤
- 快速操作：致電、標記已聯絡、查看詳情
- 智慧提醒：根據客戶價值和時間計算緊急度

**技術規格**:
```tsx
interface CustomerCareItem {
  id: string;
  name: string;
  lastContact: Date;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  isVIP: boolean;
  avatar: string;
}
```

**交付標準**:
- [ ] 三個Tab界面完成
- [ ] 客戶緊急度算法實作
- [ ] 快速操作功能正常
- [ ] VIP客戶特殊顯示

#### **任務1.3：BOT訂單追蹤界面**
**預估時間**: 3-4天 | **複雜度**: 🟡 中等 | **Token預算**: 35-45k

**功能需求**:
- BOT訂單列表：建立方式、客戶、內容、時間、狀態
- 狀態篩選：待處理、準備中、急件
- 批量操作：選擇多個訂單，批量建立出貨單
- 每日10點報告：自動統計功能

**技術規格**:
```tsx
interface BOTOrder {
  id: string;
  source: 'bot' | 'system';
  customerName: string;
  orderSummary: string;
  totalAmount: number;
  status: 'pending' | 'preparing' | 'urgent';
  createdAt: Date;
}
```

**交付標準**:
- [ ] BOT訂單表格完成
- [ ] 狀態篩選功能
- [ ] 批量操作UI
- [ ] 自動報告機制整合

### **🎮 階段二：像素風格CRM (Week 3-4)**

#### **任務2.1：像素風格設計系統**
**預估時間**: 2-3天 | **複雜度**: 🟡 中等 | **Token預算**: 30-40k

**功能需求**:
- CSS變數系統：像素色彩、字體、陰影、邊框
- 基礎組件：像素按鈕、卡片、輸入框、標籤
- 動畫效果：按下效果、脈衝、升級動畫
- 音效整合：點擊、升級、完成音效（可選）

**技術規格**:
```css
:root {
  --pixel-font: 'VT323', monospace;
  --pixel-shadow: 8px 8px 0px black;
  --pixel-border: 4px solid black;
  /* 更多像素變數... */
}
```

**交付標準**:
- [ ] 像素設計系統完成
- [ ] 基礎組件庫建立
- [ ] 動畫效果流暢
- [ ] 跨瀏覽器兼容

#### **任務2.2：客戶角色卡片系統**
**預估時間**: 4-5天 | **複雜度**: 🔴 高 | **Token預算**: 55-65k

**功能需求**:
- 角色卡片：像素頭像、等級、職業、友好度條
- 狀態效果：VIP徽章、緊急提醒、特殊標記
- 互動功能：TALK按鈕、QUEST按鈕、詳細資訊
- 等級計算：基於購買金額、頻次、推薦數

**技術規格**:
```tsx
interface CustomerCharacter {
  id: string;
  name: string;
  level: number;
  characterClass: string;
  friendship: number;
  achievements: Achievement[];
  pixelAvatar: string;
}
```

**交付標準**:
- [ ] 角色卡片組件完成
- [ ] 等級系統正確計算
- [ ] 友好度視覺化
- [ ] 互動功能正常

#### **任務2.3：成就和任務系統**
**預估時間**: 3-4天 | **複雜度**: 🟡 中等 | **Token預算**: 40-50k

**功能需求**:
- 成就系統：里程碑、經驗值、解鎖條件
- 任務系統：追蹤任務、Quest Log、完成狀態
- 經驗值動畫：獲得經驗、升級特效
- 任務建立：針對客戶的追蹤任務

**技術規格**:
```tsx
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (customer: Customer) => boolean;
  points: number;
  unlocked: boolean;
}
```

**交付標準**:
- [ ] 成就系統完成
- [ ] 任務追蹤功能
- [ ] 經驗值動畫效果
- [ ] Quest Log界面

### **🧩 階段三：UI組件補完 (Week 5-6)**

#### **任務3.1：高優先級組件開發**
**預估時間**: 5-6天 | **複雜度**: 🔴 高 | **Token預算**: 60-70k

**功能需求**:
- PDF上傳界面：拖拽上傳、預覽、進度顯示
- AI辨識進度：4步驟進度條、即時狀態更新
- 新商品Modal：完整表單、驗證、自動完成
- 確認對話框：最終檢查、風險提醒

**技術規格**:
```tsx
interface PDFUploadProps {
  onUpload: (file: File) => Promise<void>;
  maxSize: number;
  accept: string[];
  showPreview: boolean;
}
```

**交付標準**:
- [ ] PDF上傳組件完成
- [ ] AI進度界面正常
- [ ] 商品Modal功能完整
- [ ] 確認對話框邏輯正確

#### **任務3.2：中優先級組件整合**
**預估時間**: 3-4天 | **複雜度**: 🟡 中等 | **Token預算**: 40-50k

**功能需求**:
- 智慧搜尋：自動完成、模糊匹配、歷史記錄
- 錯誤處理：即時驗證、友善提示、錯誤收集
- 草稿管理：保存、載入、刪除、版本控制

**技術規格**:
```tsx
interface SmartSearchProps {
  onSearch: (query: string) => Promise<SearchResult[]>;
  placeholder: string;
  showHistory: boolean;
}
```

**交付標準**:
- [ ] 智慧搜尋功能完整
- [ ] 錯誤處理機制健全
- [ ] 草稿管理正常運作

---

## 🔒 **安全性檢查清單**

### **數據隔離驗證**
- [ ] **KPI數據**：投資方看不到真實營收
- [ ] **客戶資料**：敏感客戶資訊有權限控制
- [ ] **訂單詳情**：投資方看不到實際價格
- [ ] **成就系統**：不洩漏商業機密數據

### **UI組件安全**
- [ ] **角色守衛**：所有敏感UI都有RoleGuard包裹
- [ ] **API權限**：前端組件正確檢查用戶權限
- [ ] **錯誤訊息**：不洩漏後端敏感資訊
- [ ] **輸入驗證**：防止XSS和注入攻擊

---

## 📊 **性能要求**

### **載入性能**
- **首頁初載** < 2秒
- **Dashboard切換** < 500ms
- **像素CRM載入** < 1.5秒
- **組件渲染** < 300ms

### **動畫性能**
- **幀率** > 50fps
- **記憶體增長** < 10MB/小時
- **CPU使用率** < 30%

---

## 🧪 **測試要求**

### **跨瀏覽器測試**
- [ ] Chrome (最新版)
- [ ] Firefox (最新版)
- [ ] Safari (Mac)
- [ ] Edge (Windows)

### **裝置測試**
- [ ] 桌面 (1920×1080)
- [ ] 平板 (768×1024)
- [ ] 手機 (375×667)

### **功能測試**
- [ ] 用戶角色切換測試
- [ ] 數據隔離驗證
- [ ] 響應式設計檢查
- [ ] 性能基準測試

---

## 📋 **交付檢查清單**

### **代碼品質**
- [ ] TypeScript類型定義完整
- [ ] 組件有適當的props驗證
- [ ] 代碼註解清楚易懂
- [ ] 遵循項目代碼風格

### **文檔完整性**
- [ ] 組件使用說明
- [ ] API接口文檔
- [ ] 設計規範更新
- [ ] 故障排除指南

### **部署準備**
- [ ] 生產環境構建成功
- [ ] 靜態資源最佳化
- [ ] CDN整合測試
- [ ] 缓存策略設定

---

## 🔄 **階段門檢查**

每個階段完成後，需要通過以下檢查：

### **階段一門檢**
- [ ] Dashboard基礎功能完整
- [ ] 數據隔離機制正確
- [ ] 響應式設計達標
- [ ] 螞蟻A安全性審查通過

### **階段二門檢**
- [ ] 像素風格一致性
- [ ] CRM功能邏輯正確
- [ ] 遊戲化元素不影響實用性
- [ ] 性能指標達標

### **階段三門檢**
- [ ] 所有UI組件正常運作
- [ ] 跨房間整合無問題
- [ ] 完整測試覆蓋
- [ ] 部署準備完成

---

## 💡 **開發建議**

### **Token使用策略**
1. **階段性開發**：每個任務分2-3次對話完成
2. **重用組件**：建立組件庫減少重複開發
3. **模板使用**：使用交接模板節省說明時間

### **技術建議**
1. **設計優先**：先確定視覺風格再開始編程
2. **組件思維**：所有UI都要考慮重用性
3. **性能監控**：開發過程中持續監控性能指標

**祝開發順利！打造出令人驚艷的用戶界面！** 🎨✨