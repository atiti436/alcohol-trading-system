# ⚡ 系統效能優化指南

## 🎯 效能目標
確保系統在各種使用情境下都能快速回應，提供老闆流暢的使用體驗。

## 📊 效能指標

### **關鍵效能指標 (KPI)**
```typescript
// 頁面載入效能標準
interface PerformanceTargets {
  // 首次內容繪製
  FCP: 1.5;          // < 1.5秒 (手機)
  LCP: 2.5;          // < 2.5秒 (最大內容繪製)
  
  // 互動性指標
  FID: 100;          // < 100毫秒 (首次輸入延遲)
  CLS: 0.1;          // < 0.1 (累積版面偏移)
  
  // API回應時間
  apiResponse: 500;   // < 500毫秒
  searchResponse: 200; // < 200毫秒 (搜尋功能)
  
  // 資料庫查詢
  simpleQuery: 50;    // < 50毫秒
  complexQuery: 200;  // < 200毫秒
  reportQuery: 1000;  // < 1秒 (報表查詢)
}
```

### **使用者體驗標準**
- **即時回饋**: 按鈕點擊 < 100ms
- **頁面切換**: < 300ms
- **資料載入**: < 1秒
- **大量資料**: < 3秒 (含載入提示)

## 🏎️ 前端效能優化

### **1. React效能優化**

#### **1.1 組件優化**
```tsx
// 使用 React.memo 防止不必要的重渲染
const CustomerCard = React.memo(({ customer }) => {
  return (
    <div>
      <h3>{customer.name}</h3>
      <p>{customer.tier}</p>
    </div>
  );
});

// 使用 useMemo 快取計算結果
const ProductList = ({ products, filters }) => {
  const filteredProducts = useMemo(() => {
    return products.filter(product => 
      product.name.includes(filters.search) &&
      product.category === filters.category
    );
  }, [products, filters.search, filters.category]);

  return (
    <div>
      {filteredProducts.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

// 使用 useCallback 快取函數
const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  
  const handleCustomerUpdate = useCallback((customerId, updates) => {
    setCustomers(prev => 
      prev.map(c => c.id === customerId ? { ...c, ...updates } : c)
    );
  }, []);

  return (
    <CustomerList 
      customers={customers}
      onUpdate={handleCustomerUpdate}
    />
  );
};
```

#### **1.2 虛擬化長列表**
```tsx
// 使用 react-window 處理大量資料
import { FixedSizeList as List } from 'react-window';

const VirtualizedProductList = ({ products }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ProductCard product={products[index]} />
    </div>
  );

  return (
    <List
      height={600}        // 容器高度
      itemCount={products.length}
      itemSize={120}      // 每項高度
      overscanCount={5}   // 預載入項目數
    >
      {Row}
    </List>
  );
};
```

#### **1.3 程式碼分割**
```tsx
// 路由層級的程式碼分割
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProductManagement = lazy(() => import('./pages/ProductManagement'));
const CustomerManagement = lazy(() => import('./pages/CustomerManagement'));

const App = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/products" element={<ProductManagement />} />
      <Route path="/customers" element={<CustomerManagement />} />
    </Routes>
  </Suspense>
);

// 組件層級的懶載入
const HeavyChart = lazy(() => import('./components/HeavyChart'));

const ReportsPage = () => {
  const [showChart, setShowChart] = useState(false);
  
  return (
    <div>
      <button onClick={() => setShowChart(true)}>載入圖表</button>
      {showChart && (
        <Suspense fallback={<ChartSkeleton />}>
          <HeavyChart />
        </Suspense>
      )}
    </div>
  );
};
```

### **2. 快取策略**

#### **2.1 瀏覽器快取**
```typescript
// SWR 資料快取
import useSWR from 'swr';

const useCustomers = () => {
  const { data, error, mutate } = useSWR(
    '/api/customers',
    fetcher,
    {
      revalidateOnFocus: false,    // 不在 focus 時重新驗證
      revalidateOnReconnect: true, // 重新連線時驗證
      refreshInterval: 5 * 60 * 1000, // 5分鐘自動重新整理
    }
  );
  
  return { customers: data, error, mutate };
};

// React Query 快取
import { useQuery, useQueryClient } from 'react-query';

const useProducts = (filters) => {
  return useQuery(
    ['products', filters],
    () => fetchProducts(filters),
    {
      staleTime: 5 * 60 * 1000,    // 5分鐘內認為是新鮮的
      cacheTime: 10 * 60 * 1000,   // 10分鐘快取時間
      keepPreviousData: true,       // 保留舊資料避免載入閃爍
    }
  );
};
```

#### **2.2 Service Worker 快取**
```javascript
// 快取策略設定
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // API 請求：網路優先，快取備援
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const responseClone = response.clone();
          caches.open('api-cache').then(cache => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
  
  // 靜態資源：快取優先
  else {
    event.respondWith(
      caches.match(request)
        .then(response => response || fetch(request))
    );
  }
});
```

### **3. 圖片優化**

#### **3.1 現代圖片格式**
```tsx
// 響應式圖片組件
const OptimizedImage = ({ src, alt, width, height }) => {
  return (
    <picture>
      <source 
        srcSet={`${src}.webp`} 
        type="image/webp" 
      />
      <source 
        srcSet={`${src}.avif`} 
        type="image/avif" 
      />
      <img 
        src={`${src}.jpg`}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
};

// 圖片懶載入
const LazyImage = ({ src, alt, className }) => {
  const [imgRef, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <div ref={imgRef} className={className}>
      {inView ? (
        <img src={src} alt={alt} />
      ) : (
        <div className="skeleton-image" />
      )}
    </div>
  );
};
```

## 🗄️ 後端效能優化

### **1. 資料庫優化**

#### **1.1 索引策略**
```sql
-- 客戶查詢索引
CREATE INDEX idx_customers_search ON customers (name, phone, company);
CREATE INDEX idx_customers_tier ON customers (tier);

-- 商品查詢索引
CREATE INDEX idx_products_search ON products (name, code, brand);
CREATE INDEX idx_products_category ON products (category, is_active);

-- 訂單相關索引
CREATE INDEX idx_orders_customer ON orders (customer_id, created_at);
CREATE INDEX idx_orders_status ON orders (status, created_at);

-- 複合索引
CREATE INDEX idx_sales_analysis ON sales (
  created_at, 
  customer_tier, 
  product_category
) WHERE status = 'completed';
```

#### **1.2 查詢優化**
```typescript
// 分頁查詢優化
interface PaginationParams {
  page: number;
  limit: number;
  cursor?: string; // 游標分頁
}

// 使用游標分頁避免OFFSET效能問題
const getCustomersWithCursor = async (cursor?: string, limit = 20) => {
  const query = `
    SELECT * FROM customers 
    WHERE ${cursor ? 'id > ?' : '1=1'}
    ORDER BY id ASC 
    LIMIT ?
  `;
  
  const params = cursor ? [cursor, limit] : [limit];
  return await db.query(query, params);
};

// 預載入關聯資料
const getOrdersWithDetails = async () => {
  return await prisma.order.findMany({
    include: {
      customer: {
        select: { id: true, name: true, tier: true }
      },
      items: {
        include: {
          product: {
            select: { id: true, name: true, code: true }
          }
        }
      }
    }
  });
};
```

#### **1.3 資料庫連線池**
```typescript
// Prisma 連線池設定
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  
  // 連線池設定
  __internal: {
    engine: {
      queryEngineLibrary: 'query_engine',
      config: {
        connectionLimit: 10,        // 最大連線數
        poolTimeout: 5000,          // 連線超時時間
        transactionOptions: {
          maxWait: 2000,           // 交易等待時間
          timeout: 5000,           // 交易超時時間
        }
      }
    }
  }
});
```

### **2. API 效能優化**

#### **2.1 回應快取**
```typescript
// Redis 快取中間件
const cacheMiddleware = (ttl: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `cache:${req.method}:${req.originalUrl}`;
    
    // 檢查快取
    const cached = await redis.get(key);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    // 快取回應
    const originalSend = res.send;
    res.send = function(body) {
      redis.setex(key, ttl, body);
      originalSend.call(this, body);
    };
    
    next();
  };
};

// API路由使用快取
app.get('/api/customers', 
  cacheMiddleware(60), // 1分鐘快取
  getCustomers
);
```

#### **2.2 資料壓縮**
```typescript
// gzip 壓縮
import compression from 'compression';

app.use(compression({
  level: 6,           // 壓縮等級
  threshold: 1024,    // 超過1KB才壓縮
  filter: (req, res) => {
    // 不壓縮二進位檔案
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// API回應壓縮
const compressResponse = (data: any) => {
  if (Array.isArray(data) && data.length > 100) {
    // 大量資料時壓縮
    return {
      data: data,
      meta: {
        total: data.length,
        compressed: true
      }
    };
  }
  return data;
};
```

## 📊 監控與分析

### **1. 效能監控**
```typescript
// 效能監控工具
class PerformanceMonitor {
  static startTimer(label: string) {
    console.time(label);
    return () => console.timeEnd(label);
  }
  
  static async measureAsync<T>(
    label: string, 
    fn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      console.log(`${label}: ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.log(`${label} (error): ${duration}ms`);
      throw error;
    }
  }
}

// 使用範例
const getCustomers = async () => {
  return await PerformanceMonitor.measureAsync(
    'getCustomers',
    () => db.customer.findMany()
  );
};
```

### **2. 效能分析工具**
```typescript
// Web Vitals 追蹤
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

const sendToAnalytics = (metric) => {
  // 送到分析服務
  analytics.track('Web Vital', {
    name: metric.name,
    value: metric.value,
    page: window.location.pathname
  });
};

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

## 🧪 效能測試

### **1. 載入測試**
```javascript
// K6 載入測試腳本
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 10 },   // 5分鐘內增加到10用戶
    { duration: '10m', target: 10 },  // 維持10用戶10分鐘
    { duration: '5m', target: 0 },    // 5分鐘內降到0
  ],
};

export default function() {
  const response = http.get('http://localhost:3000/api/customers');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

### **2. 前端效能測試**
```javascript
// Lighthouse CI 設定
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/dashboard',
        'http://localhost:3000/customers',
        'http://localhost:3000/products'
      ],
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['error', {minScore: 0.8}],
        'categories:accessibility': ['error', {minScore: 0.9}],
        'categories:best-practices': ['error', {minScore: 0.8}],
        'categories:seo': ['error', {minScore: 0.8}]
      }
    }
  }
};
```

## ⚠️ 螞蟻開發注意事項

### **效能開發清單**
- [ ] 使用 React.memo 包裝純組件
- [ ] 大列表使用虛擬化
- [ ] 圖片使用懶載入
- [ ] API使用適當快取策略
- [ ] 資料庫查詢有索引支援
- [ ] 避免不必要的重渲染
- [ ] 程式碼分割減少初始載入
- [ ] 壓縮靜態資源

### **效能陷阱避免**
```typescript
// ❌ 避免：在渲染中創建新物件
const Component = ({ items }) => {
  return (
    <List 
      items={items}
      config={{ sortBy: 'name', order: 'asc' }} // 每次都是新物件
    />
  );
};

// ✅ 正確：使用 useMemo 或提取到外部
const defaultConfig = { sortBy: 'name', order: 'asc' };

const Component = ({ items }) => {
  const config = useMemo(() => ({ 
    sortBy: 'name', 
    order: 'asc' 
  }), []);
  
  return <List items={items} config={config} />;
};
```

### **監控要點**
1. **關鍵頁面載入時間**
2. **API回應時間**
3. **資料庫查詢效能**
4. **記憶體使用情況**
5. **用戶互動回應時間**

---

**記住：效能優化是持續的過程，要定期監控和改善！** ⚡🚀