# 📱 響應式設計規範

## 🎯 設計目標
確保老闆在任何裝置上都能順暢使用系統，特別是手機操作的便利性。

## 📐 斷點系統

### **標準斷點定義**
```scss
// 手機優先設計
$mobile: 320px;              // 最小手機 (iPhone 5)
$mobile-large: 480px;        // 大手機 (iPhone 12)
$tablet: 768px;              // 平板 (iPad)
$desktop: 1024px;            // 桌機
$desktop-large: 1440px;      // 大桌機
$desktop-xl: 1920px;         // 超大螢幕

// Tailwind CSS 對應
sm: 640px   // 小平板
md: 768px   // 平板
lg: 1024px  // 桌機
xl: 1280px  // 大桌機
2xl: 1536px // 超大桌機
```

### **設計原則**
1. **Mobile First**: 從最小螢幕開始設計
2. **Progressive Enhancement**: 逐步增強大螢幕體驗
3. **Touch Friendly**: 按鈕至少44px×44px
4. **Content Priority**: 重要內容優先顯示

## 📱 手機版設計規範

### **導航設計**
```tsx
// 手機版：底部導航
<BottomNavigation>
  <NavItem icon="home" label="首頁" />
  <NavItem icon="shopping" label="採購" />
  <NavItem icon="inventory" label="庫存" />
  <NavItem icon="customer" label="客戶" />
  <NavItem icon="profile" label="更多" />
</BottomNavigation>

// 桌機版：側邊欄導航
<SidebarNavigation collapsed={false}>
  {/* 完整側邊欄 */}
</SidebarNavigation>
```

### **表格響應式處理**
```tsx
// 手機版：卡片式顯示
interface ResponsiveTableProps {
  data: any[];
  columns: ColumnDef[];
  breakpoint?: 'mobile' | 'tablet';
}

// 使用範例
<ResponsiveTable 
  data={customers}
  columns={customerColumns}
  breakpoint="mobile"
  // 手機版自動轉換為卡片佈局
/>
```

### **表單響應式佈局**
```scss
// 表單間距調整
.form-container {
  @media (max-width: 768px) {
    .form-item {
      margin-bottom: 16px;        // 手機版較大間距
    }
    
    .form-row {
      flex-direction: column;     // 單列顯示
    }
  }
  
  @media (min-width: 769px) {
    .form-item {
      margin-bottom: 24px;        // 桌機版標準間距
    }
    
    .form-row {
      display: flex;              // 並排顯示
      gap: 16px;
    }
  }
}
```

## 🎨 響應式組件系統

### **1. 容器組件 (ResponsiveContainer)**
```tsx
interface ResponsiveContainerProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = 'lg',
  padding = 'md'
}) => {
  const containerClasses = {
    sm: 'max-w-sm',      // 384px
    md: 'max-w-md',      // 448px
    lg: 'max-w-4xl',     // 896px
    xl: 'max-w-6xl',     // 1152px
    full: 'max-w-full'
  };

  const paddingClasses = {
    none: '',
    sm: 'px-4 py-2',
    md: 'px-6 py-4',
    lg: 'px-8 py-6'
  };

  return (
    <div className={`
      mx-auto 
      ${containerClasses[maxWidth]} 
      ${paddingClasses[padding]}
    `}>
      {children}
    </div>
  );
};
```

### **2. 響應式網格 (ResponsiveGrid)**
```tsx
interface ResponsiveGridProps {
  children: ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
}

// 使用範例
<ResponsiveGrid 
  cols={{ mobile: 1, tablet: 2, desktop: 3 }}
  gap="md"
>
  <ProductCard />
  <ProductCard />
  <ProductCard />
</ResponsiveGrid>
```

### **3. 響應式表格 (ResponsiveTable)**
```tsx
interface ResponsiveTableProps<T> {
  data: T[];
  columns: ResponsiveColumnDef<T>[];
  mobileCardRender?: (item: T) => ReactNode;
}

interface ResponsiveColumnDef<T> {
  key: string;
  title: string;
  dataIndex: keyof T;
  hideOnMobile?: boolean;       // 手機版隱藏
  mobileLabel?: string;         // 手機版標籤
}

// 手機版自動轉換為卡片
const CustomerTable = () => (
  <ResponsiveTable 
    data={customers}
    columns={[
      { key: 'name', title: '客戶名稱', dataIndex: 'name' },
      { key: 'phone', title: '電話', dataIndex: 'phone', hideOnMobile: true },
      { key: 'tier', title: '等級', dataIndex: 'tier', mobileLabel: '等級' }
    ]}
    mobileCardRender={(customer) => (
      <CustomerMobileCard customer={customer} />
    )}
  />
);
```

## 📐 螢幕尺寸適配

### **內容優先級**
```typescript
// 內容重要性分級
enum ContentPriority {
  CRITICAL = 1,    // 任何裝置都要顯示
  IMPORTANT = 2,   // 平板以上顯示
  OPTIONAL = 3,    // 桌機才顯示
  EXTRA = 4        // 大桌機才顯示
}

// 使用範例
<ResponsiveContent priority={ContentPriority.IMPORTANT}>
  <DetailedChart />
</ResponsiveContent>
```

### **字體大小調整**
```scss
// 響應式字體
.responsive-text {
  // 手機版
  font-size: 14px;
  line-height: 1.4;
  
  @media (min-width: 768px) {
    // 平板版
    font-size: 16px;
    line-height: 1.5;
  }
  
  @media (min-width: 1024px) {
    // 桌機版
    font-size: 18px;
    line-height: 1.6;
  }
}

// 標題響應式
.responsive-heading {
  font-size: 20px;
  font-weight: 600;
  
  @media (min-width: 768px) {
    font-size: 24px;
  }
  
  @media (min-width: 1024px) {
    font-size: 28px;
  }
}
```

## 🖱️ 觸控友善設計

### **按鈕尺寸標準**
```scss
// 最小觸控目標: 44px × 44px
.touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 8px 16px;
  
  // 按鈕間距
  margin: 8px;
  
  // 觸控回饋
  &:active {
    transform: scale(0.95);
    transition: transform 0.1s;
  }
}

// 小按鈕的觸控區域擴大
.small-button {
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: -8px;
    right: -8px;
    bottom: -8px;
    left: -8px;
    // 擴大觸控區域但不影響視覺
  }
}
```

### **手勢支援**
```tsx
// 滑動手勢支援
const SwipeableCard = ({ onSwipeLeft, onSwipeRight, children }) => {
  const handleTouchStart = (e) => {
    // 記錄開始位置
  };
  
  const handleTouchEnd = (e) => {
    // 計算滑動距離和方向
    // 執行對應動作
  };

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="swipeable-card"
    >
      {children}
    </div>
  );
};
```

## 📊 業務功能響應式設計

### **1. Dashboard響應式**
```tsx
const ResponsiveDashboard = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  if (isMobile) {
    return (
      <MobileDashboard>
        <KPICards layout="vertical" />
        <QuickActions />
        <RecentOrders limit={5} />
      </MobileDashboard>
    );
  }
  
  return (
    <DesktopDashboard>
      <KPICards layout="grid" cols={4} />
      <ChartsGrid />
      <RecentActivity />
    </DesktopDashboard>
  );
};
```

### **2. 商品管理響應式**
```tsx
const ProductManagement = () => (
  <ResponsiveLayout>
    {/* 手機版：列表 + 搜尋 */}
    <MobileView>
      <SearchBar />
      <ProductList 
        renderItem={ProductMobileCard}
        showFilters={false}
      />
    </MobileView>
    
    {/* 桌機版：表格 + 側邊篩選 */}
    <DesktopView>
      <div className="flex">
        <FilterSidebar />
        <ProductTable />
      </div>
    </DesktopView>
  </ResponsiveLayout>
);
```

### **3. 報表響應式**
```tsx
const ResponsiveReport = () => {
  const screenSize = useScreenSize();
  
  return (
    <div>
      {screenSize === 'mobile' && (
        <MobileReport>
          <SummaryCards />
          <SimpleChart />
          <DataList />
        </MobileReport>
      )}
      
      {screenSize === 'desktop' && (
        <DesktopReport>
          <KPIDashboard />
          <DetailedCharts />
          <DataTable />
          <ExportTools />
        </DesktopReport>
      )}
    </div>
  );
};
```

## 🔧 響應式開發工具

### **1. Hooks工具**
```tsx
// 螢幕尺寸檢測
const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState('desktop');
  
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  return screenSize;
};

// 媒體查詢Hook
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  
  return matches;
};
```

### **2. 響應式組件包裝器**
```tsx
// 條件渲染組件
const MobileOnly = ({ children }) => {
  const isMobile = useMediaQuery('(max-width: 767px)');
  return isMobile ? children : null;
};

const DesktopOnly = ({ children }) => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  return isDesktop ? children : null;
};

const TabletUp = ({ children }) => {
  const isTabletUp = useMediaQuery('(min-width: 768px)');
  return isTabletUp ? children : null;
};
```

## 📏 測試規範

### **響應式測試清單**
- [ ] 在所有斷點下測試佈局
- [ ] 檢查觸控目標大小
- [ ] 驗證內容可讀性
- [ ] 測試橫豎屏切換
- [ ] 檢查圖片適應性
- [ ] 驗證表單可用性

### **測試工具**
```javascript
// Cypress響應式測試
describe('Responsive Layout', () => {
  const viewports = [
    { width: 375, height: 667, name: 'iPhone' },
    { width: 768, height: 1024, name: 'iPad' },
    { width: 1440, height: 900, name: 'Desktop' }
  ];
  
  viewports.forEach(viewport => {
    it(`should work on ${viewport.name}`, () => {
      cy.viewport(viewport.width, viewport.height);
      cy.visit('/dashboard');
      cy.screenshot(`dashboard-${viewport.name}`);
      
      // 檢查關鍵元素是否可見
      cy.get('[data-testid="main-nav"]').should('be.visible');
      cy.get('[data-testid="content"]').should('be.visible');
    });
  });
});
```

## ⚠️ 重要提醒

### **螞蟻開發要點**
1. **先手機後桌機**: 優先確保手機版可用
2. **內容優先級**: 重要功能在小螢幕也要能用
3. **觸控友善**: 按鈕夠大、間距適當
4. **效能考量**: 小螢幕載入速度更重要
5. **測試實機**: 模擬器不能完全替代真機

### **老闆使用場景**
- **通勤時**: 手機查看訂單狀況
- **會議中**: 平板展示報表數據  
- **辦公室**: 桌機處理複雜操作
- **出差時**: 筆電進行日常管理

### **商業考量**
- 手機版影響老闆使用頻率
- 響應式設計減少開發成本
- 良好體驗提升工作效率
- 投資方可能也會使用手機

---

**記住：老闆最常用手機，手機版體驗決定系統成敗！** 📱✨