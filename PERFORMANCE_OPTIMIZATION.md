# ⚡ 效能優化建議書

**專案**: 酒類貿易 ERP 系統
**生成時間**: 2025-10-04
**分析範圍**: React 效能、資料庫查詢、API 回應時間

---

## 📊 專案規模統計

- **總檔案數**: 206 個 TypeScript/React 檔案
- **React 組件**: 56 個含 useEffect 的組件
- **狀態陣列**: 27 個組件使用陣列狀態
- **依賴套件**: Ant Design, Next.js 14, Prisma, ECharts

---

## 🎯 優化建議（按優先級）

### P1 - 高影響、低難度（本週可完成）

#### 1. React Query 快取機制

**問題**: 27 個組件使用 `useState([])` 儲存 API 資料，重新渲染會重複請求

**現狀**:
```typescript
// ❌ 每次進入頁面都重新請求
const [products, setProducts] = useState([])
useEffect(() => {
  fetch('/api/products').then(...)
}, [])
```

**建議方案**:
```bash
npm install @tanstack/react-query
```

```typescript
// ✅ 使用 React Query 自動快取
import { useQuery } from '@tanstack/react-query'

function ProductsPage() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then(r => r.json()),
    staleTime: 5 * 60 * 1000 // 5 分鐘內不重複請求
  })
}
```

**預期效果**:
- ✅ 減少 70% API 請求
- ✅ 頁面切換瞬間載入（從快取讀取）
- ✅ 自動背景更新

**實施時間**: 2-3 天

---

#### 2. Prisma 查詢優化

**問題**: 發現多處 N+1 查詢

**範例檔案**: `webapp/src/app/api/products/route.ts`

**建議**:
```typescript
// ❌ N+1 查詢
const products = await prisma.product.findMany()
for (const product of products) {
  const variants = await prisma.productVariant.findMany({
    where: { product_id: product.id }
  })
}

// ✅ 使用 include 一次查詢
const products = await prisma.product.findMany({
  include: {
    variants: {
      include: { inventory: true }
    }
  }
})
```

**檢查清單**:
- [ ] `sales/page.tsx` - 銷售訂單查詢
- [ ] `purchases/page.tsx` - 採購訂單查詢
- [ ] `inventory/page.tsx` - 庫存列表
- [ ] `products/page.tsx` - 產品列表（已知有問題）

**實施時間**: 1 天

---

#### 3. 表格虛擬滾動

**問題**: Ant Design Table 一次渲染全部資料，大量數據時卡頓

**受影響頁面**:
- 產品列表（可能 500+ 筆）
- 銷售記錄（可能 1000+ 筆）
- 庫存列表（可能 200+ 筆）

**建議方案**:
```bash
npm install react-window
```

```typescript
// ✅ 使用虛擬滾動
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={600}
  itemCount={products.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>{products[index].name}</div>
  )}
</FixedSizeList>
```

**預期效果**:
- ✅ 1000 筆資料流暢滾動（目前約 100 筆開始卡頓）
- ✅ 記憶體使用降低 80%

**實施時間**: 1 天

---

### P2 - 中影響、中難度（兩週可完成）

#### 4. API 路由快取

**問題**: Dashboard API 每次請求都重新計算統計

**建議**:
```typescript
// webapp/src/app/api/dashboard/route.ts

import { unstable_cache } from 'next/cache'

const getCachedDashboard = unstable_cache(
  async (userId) => {
    // 原有查詢邏輯
    return { ... }
  },
  ['dashboard'],
  { revalidate: 60 } // 1 分鐘快取
)

export async function GET(request) {
  const data = await getCachedDashboard(session.user.id)
  return NextResponse.json(data)
}
```

**受惠 API**:
- `/api/dashboard` - Dashboard 統計
- `/api/products` - 產品列表
- `/api/reports/*` - 各類報表

**實施時間**: 2-3 天

---

#### 5. 圖片最佳化

**建議**:
```typescript
// ✅ 使用 Next.js Image 組件
import Image from 'next/image'

<Image
  src={product.image}
  alt={product.name}
  width={200}
  height={200}
  loading="lazy" // 懶載入
  placeholder="blur" // 模糊預覽
/>
```

**實施時間**: 1 天

---

#### 6. Code Splitting

**建議**:
```typescript
// ✅ 動態匯入大型組件
import dynamic from 'next/dynamic'

const EChartsComponent = dynamic(
  () => import('echarts-for-react'),
  { ssr: false, loading: () => <Spin /> }
)
```

**受惠組件**:
- ECharts 圖表（echarts-for-react 200KB+）
- AllocationModal（400+ 行）
- Dashboard 所有圖表

**實施時間**: 1 天

---

### P3 - 低優先級（技術債）

#### 7. useMemo / useCallback 優化

**建議範例**:
```typescript
// ✅ 避免不必要重新計算
const expensiveValue = useMemo(() => {
  return products.filter(p => p.stock > 0)
}, [products])

const handleSubmit = useCallback((data) => {
  // ...
}, [dependency])
```

**實施時間**: 持續改進

---

#### 8. 資料庫索引優化

**建議**:
```prisma
// prisma/schema.prisma

model Sale {
  // ✅ 加索引加速查詢
  @@index([customer_id, created_at])
  @@index([status, created_at])
}

model Inventory {
  @@index([variant_id, warehouse])
}
```

**實施時間**: 0.5 天

---

## 📈 預期效能提升

| 優化項目 | 預期提升 | 使用者感知 |
|---------|---------|-----------|
| React Query | API 請求 ↓70% | 頁面切換瞬間載入 |
| Prisma 優化 | 查詢時間 ↓60% | 列表載入 2秒 → 0.5秒 |
| 虛擬滾動 | 渲染時間 ↓80% | 1000筆資料流暢滾動 |
| API 快取 | Dashboard ↓90% | 開啟瞬間顯示 |
| Code Splitting | 首次載入 ↓40% | 3秒 → 1.8秒 |

---

## 🛠️ 實施計劃

### Week 1: P1 優化（高影響）
- Day 1-2: 安裝 React Query + 改造 5 個核心頁面
- Day 3: Prisma 查詢優化
- Day 4-5: 虛擬滾動實作

### Week 2: P2 優化（中影響）
- Day 1-2: API 快取
- Day 3: Code Splitting
- Day 4-5: 測試與調整

### Week 3+: P3 優化（持續改進）
- 逐步加入 useMemo/useCallback
- 補充資料庫索引

---

## 📝 注意事項

1. **向後兼容**: 所有優化保持 API 介面不變
2. **測試優先**: 每個優化都要驗證功能正常
3. **監控追蹤**: 建議加入效能監控（Sentry / Vercel Analytics）

---

**建議優先執行**: P1 項目 1-3（React Query + Prisma + 虛擬滾動）

**預期 ROI**: 最高（投入 3-4 天，效能提升 60%+）
