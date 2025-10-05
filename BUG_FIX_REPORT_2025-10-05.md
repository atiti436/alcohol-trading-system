# Bug 修復報告 - 2025-10-05

**報告時間**: 2025-10-05 22:00 (最終更新)
**修復範圍**: Dashboard NaN 錯誤 + CORS 403 錯誤 + Inventory 超時 + Google OAuth
**當前狀態**: 🔴 **卡在 Google OAuth redirect_uri_mismatch**

---

## 📋 問題清單

### 🔴 P0 - 嚴重問題

#### 1. Dashboard API 500 錯誤
- **症狀**: `/api/dashboard` 返回 500 Internal Server Error
- **錯誤訊息**: `relation "inventory" does not exist`
- **根本原因**: Production 資料庫未同步 Inventory 表（Issue #1 遺留）
- **修復方案**: 暫時改回 ProductVariant.stock_quantity 查詢
- **修復狀態**: ✅ 已完成 (commit `3af1916`)
- **影響檔案**: `webapp/src/app/api/dashboard/route.ts`

#### 2. SUPER_ADMIN 403 權限錯誤
- **症狀**: 所有 POST/PUT/DELETE 請求被 403 Forbidden 阻擋
- **錯誤訊息**: `Cross-origin request blocked`
- **根本原因**: CORS 邏輯錯誤
  - **第一版錯誤**: 同時檢查 `origin` header + `reqOrigin` (URL origin)
  - **第二版錯誤**: 空 origin header (`''`) 被誤判為跨域請求
- **修復方案**:
  - v1: 移除 `reqOrigin` 檢查 (commit `36a7456`)
  - v2: 分離 `!origin` 和 `!allowedOrigin` 檢查 (commit `47db0d0`)
- **修復狀態**: ❌ 未成功（線上環境仍顯示 403）
- **影響檔案**: `webapp/src/middleware.ts`

---

### 🟡 P1 - 高優先級問題

#### 3. Dashboard 圖表 NaN 錯誤
- **症狀**:
  ```
  Error: <circle> attribute cx: Expected length, "NaN"
  Error: <path> attribute d: Expected number, "M NaN NaN L NaN 21…"
  Error: <text> attribute x: Expected length, "NaN"
  ```
- **根本原因**: 空資料庫計算產生 NaN
  - **後端**: 空陣列計算 `revenue / cost` = NaN
  - **前端**: `range = 0` 導致除以 0，`total = 0` 導致圓餅圖 NaN
- **修復方案**:
  - **後端**: 加入 `Number.isFinite()` 檢查 (commit `9894fa5`)
  - **前端**: 防除以 0 + 空狀態處理 (commit `3b262f6`)
- **修復狀態**: ❌ 未成功（線上環境仍顯示 NaN）
- **影響檔案**:
  - `webapp/src/app/api/dashboard/route.ts`
  - `webapp/src/components/charts/SimpleLineChart.tsx`
  - `webapp/src/components/charts/SimplePieChart.tsx`

#### 4. 用戶資料消失
- **症狀**: 先前建立的測試用戶不見了
- **根本原因**: 存在兩個 .env 檔案
  - `.env.local`: 假的本地資料庫
  - `.env`: 真實 Zeabur 生產資料庫
- **修復方案**: 刪除 `.env.local`
- **修復狀態**: ✅ 已完成
- **影響檔案**: `webapp/.env.local` (已刪除)

---

## 🔧 技術修復細節

### 修復 1: Dashboard ProductVariant 暫時方案

**修改位置**: `webapp/src/app/api/dashboard/route.ts`

```typescript
// ❌ 原本（失敗）
const stockValueResult = await prisma.$queryRaw`
  SELECT SUM(i.quantity * COALESCE(i.cost_price, pv.cost_price)) as stock_value
  FROM inventory i
  INNER JOIN product_variants pv ON i.variant_id = pv.id
  ...
`

// ✅ 修復（暫時）
const stockValueResult = await prisma.$queryRaw`
  SELECT SUM(pv.stock_quantity * pv.cost_price) as stock_value
  FROM product_variants pv
  INNER JOIN products p ON pv.product_id = p.id
  WHERE p.is_active = true
`
```

**影響範圍**: 4 處 SQL 查詢
- Line 93-103: 庫存價值計算
- Line 117-135: 低庫存商品
- Line 194-204: 投資方庫存
- Line 256-274: 員工庫存警報

---

### 修復 2: CORS 邏輯修正（兩次迭代）

**修改位置**: `webapp/src/middleware.ts`

#### 第一次修復 (commit `36a7456`)
```typescript
// ❌ 原本
function checkCORS(request: NextRequest, reqOrigin: string): NextResponse | null {
  const origin = request.headers.get('origin') || ''

  if (origin !== allowedOrigin || reqOrigin !== allowedOrigin) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 })
  }
}

// ✅ 第一版修復
function checkCORS(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin') || ''

  if (origin !== allowedOrigin) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 })
  }
}
```

**問題**: 仍然失敗，因為 `origin || ''` 會讓空 header 變成空字串

#### 第二次修復 (commit `47db0d0`)
```typescript
// ✅ 第二版修復（最終）
function checkCORS(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin')  // null or string，不預設為 ''
  const allowedOrigin = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '')

  // 🔒 如果沒有 Origin header，表示是同源請求 -> 允許通過
  if (!origin) return null

  // 🔒 如果未設定環境變數，開發環境下允許通過
  if (!allowedOrigin) return null

  // 🔒 檢查 Origin header 是否匹配
  if (origin !== allowedOrigin) {
    console.warn(`🚨 CORS blocked: ${origin} (expected: ${allowedOrigin})`)
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 })
  }

  return null
}
```

**關鍵改動**:
1. 移除 `|| ''` 預設值
2. 分離 `!origin` 和 `!allowedOrigin` 檢查
3. 加入詳細註解說明瀏覽器行為

---

### 修復 3: 後端 NaN 保護

**修改位置**: `webapp/src/app/api/dashboard/route.ts`

```typescript
// calculateCategoryDistribution (Line 357-384)
const result = Object.entries(categoryData)
  .map(([name, value], index) => ({
    name,
    value: Number.isFinite(value) ? value : 0,  // 🔒 NaN 保護
    color: colors[index % colors.length]
  }))
  .sort((a, b) => b.value - a.value)
  .slice(0, 6)

// 如果沒有資料，返回預設值
if (result.length === 0) {
  return [{ name: '暫無數據', value: 1, color: '#d9d9d9' }]
}

// calculateMonthlySalesTrend (Line 319-330)
const result = Object.entries(monthlyData)
  .map(([month, data]) => ({
    month,
    revenue: Number.isFinite(data.revenue) ? data.revenue : 0,  // 🔒 NaN 保護
    profit: Number.isFinite(data.profit) ? data.profit : 0,
    orders: data.count
  }))

return result.length > 0 ? result : []
```

---

### 修復 4: 前端圖表 NaN 保護

#### SimpleLineChart.tsx

```typescript
// ❌ 原本 (Line 31-40)
const range = maxValue - minValue
const points = data.map((item, index) => {
  const x = (index / (data.length - 1)) * (width - 40) + 20
  const y = chartHeight - ((item.value - minValue) / range) * (chartHeight - 20) + 10
  return { x, y, value: item.value, month: item.month }
})

// ✅ 修復
const range = maxValue - minValue || 1  // 🔒 防止除以0產生NaN

const points = data.map((item, index) => {
  const x = (index / (data.length - 1)) * (width - 40) + 20
  // 🔒 當所有值都是0時，顯示在中間位置
  const normalizedValue = range > 0 ? ((item.value - minValue) / range) : 0.5
  const y = chartHeight - normalizedValue * (chartHeight - 20) + 10
  return { x, y, value: item.value, month: item.month }
})
```

#### SimplePieChart.tsx

```typescript
// ✅ 新增 total = 0 檢查 (Line 27-38)
const total = data.reduce((sum, item) => sum + item.value, 0)

if (total === 0 || !Number.isFinite(total)) {
  return (
    <Card title={title} style={{ height: height + 120 }}>
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
        暫無數據
      </div>
    </Card>
  )
}

// ✅ 防止 undefined 值 (Line 47)
const percentage = (item.value || 0) / total  // 🔒 防止 undefined / total
```

---

## 📊 Commit 歷史

| Commit | 時間 | 說明 | 狀態 |
|--------|------|------|------|
| `36a7456` | 第一次 | 修復 CORS - 移除 reqOrigin | ❌ 失敗 |
| `3af1916` | 第二次 | Dashboard 改回 ProductVariant | ✅ 成功 |
| `9894fa5` | 第三次 | Dashboard 後端 NaN 保護 | ⚠️ 部分 |
| `cc026b6` | 第四次 | 空 commit 觸發重新部署 | - |
| `3b262f6` | 第五次 | 前端圖表 NaN 保護 | ❌ 失敗 |
| `47db0d0` | 第六次 | CORS 邏輯修正（最終版） | ❌ 失敗 |

---

## 🔍 失敗原因分析

### 為什麼修復沒有生效？

#### 可能原因 1: Zeabur 部署快取問題
- Zeabur 可能沒有正確讀取最新 commit
- 建議檢查 Zeabur 部署日誌，確認部署的 commit SHA

#### 可能原因 2: 瀏覽器快取
- 前端 JS bundle 被瀏覽器快取 (`fd9d1056-0c85016c168cf46e.js`)
- 建議強制重新整理 (Ctrl + Shift + R)

#### 可能原因 3: CORS 修復方向錯誤
- 可能根本不是 CORS 問題
- 可能是 NextAuth session 驗證問題
- 建議檢查伺服器端 logs

#### 可能原因 4: NaN 來源誤判
- 可能還有其他組件也在產生 NaN
- 需要全域搜尋所有 Chart 組件

---

## 🚨 當前問題狀態

### ❌ 仍然存在的錯誤

```
Error: <path> attribute d: Expected number, "M NaN 220 L NaN 21…"
Error: <circle> attribute cx: Expected length, "NaN"
Error: <text> attribute x: Expected length, "NaN"

POST /api/sales/.../admin-cancel 403 (Forbidden)
DELETE /api/sales/... 403 (Forbidden)
```

### 🔍 需要進一步調查

1. **確認 Zeabur 部署狀態**
   - 檢查部署日誌中的 commit SHA
   - 確認是否真的部署了 `47db0d0`

2. **檢查伺服器端 logs**
   - 403 錯誤的真正原因
   - 是否有 `🚨 CORS blocked` 日誌？

3. **全域搜尋 NaN 來源**
   - 可能還有其他圖表組件
   - 可能是 Ant Design Charts 內建組件

4. **測試本地環境**
   - 本地 `localhost:3004` 是否正常？
   - 如果本地正常，問題在部署；如果本地也有問題，修復不完整

---

## 📝 建議的下一步行動

### 優先級 P0

1. **檢查 Zeabur 部署日誌**
   ```bash
   # 到 Zeabur Console 檢查
   # 確認 Latest Deployment Commit = 47db0d0
   ```

2. **本地環境測試**
   - 開啟 `http://localhost:3004`
   - 檢查是否還有 NaN 和 403 錯誤

3. **檢查伺服器端 Console Logs**
   - Zeabur → Runtime Logs
   - 搜尋 `CORS blocked` 或 `403` 關鍵字

### 優先級 P1

4. **如果問題持續，考慮回退 CORS 檢查**
   ```typescript
   // 最激進的方案：暫時關閉 CORS 檢查
   function checkCORS(request: NextRequest): NextResponse | null {
     return null  // 完全跳過檢查
   }
   ```

5. **搜尋其他可能的 Chart 組件**
   ```bash
   grep -r "SimpleLineChart\|SimplePieChart\|Chart" webapp/src/
   ```

6. **檢查是否有其他 Middleware 干擾**
   - NextAuth middleware
   - 其他第三方 middleware

---

## 🔴 當前卡點 - Google OAuth 問題 (2025-10-05 22:00)

### 錯誤訊息
```
已封鎖存取權：「報價單」的要求無效
發生錯誤 400: redirect_uri_mismatch
```

### 已執行的修復步驟

1. ✅ **修改 NEXTAUTH_URL 環境變數**
   - Zeabur → Variables
   - 從 `http://...` 改為 `https://alcohol-trading-system.zeabur.app`
   - 已儲存並重新部署

2. ✅ **修改 Google Cloud Console**
   - 前往 https://console.cloud.google.com
   - API 和服務 → 憑證
   - 已授權的重新導向 URI
   - 改為 `https://alcohol-trading-system.zeabur.app/api/auth/callback/google`
   - 已儲存

3. ✅ **清除快取並測試**
   - 使用無痕模式
   - 清除瀏覽器快取
   - 等待 5+ 分鐘讓 Google 同步

### 仍然失敗

**症狀**: 點擊登入按鈕，直接跳轉到 Google 錯誤頁面，沒有帳號選擇

**懷疑**:
1. Google OAuth Console 可能有其他設定錯誤
2. NextAuth 配置可能有問題
3. 可能需要檢查完整的 OAuth 流程

### 需要 Codex 診斷

請 Codex 檢查：
1. `webapp/src/modules/auth/providers/nextauth.ts` - NextAuth 配置
2. Google OAuth Console 的完整設定清單
3. 是否有其他遺漏的配置項目
4. 是否需要使用 Credentials Provider 而非 Google OAuth

---

## 📌 技術債務

### 未來需要處理

1. **Production 資料庫同步 Inventory 表**
   - 執行 `npx prisma db push` 在 Production
   - Revert Dashboard queries 回 Inventory 表

2. **CORS 策略重新設計**
   - 考慮使用 Next.js 內建 CORS 配置
   - 或移除自定義 CORS 檢查，依賴 NextAuth

3. **完整的前端錯誤處理**
   - 所有數值計算加入 NaN 檢查
   - 加入全域 Error Boundary

4. **單元測試**
   - 加入 Chart 組件的邊界條件測試
   - 加入 Dashboard API 的空資料測試

---

## 🎯 結論

**修復狀態**: ❌ 失敗（6 次 commit，問題仍存在）

**可能原因**:
- 部署未生效（快取問題）
- 修復方向錯誤（可能不是 CORS/NaN 問題）
- 還有其他未發現的錯誤來源

**建議行動**:
1. 檢查 Zeabur 部署狀態
2. 測試本地環境
3. 檢查伺服器端 logs
4. 如果仍失敗，考慮更激進的修復方案（暫時關閉 CORS）

---

**報告撰寫者**: Claude Code
**最後更新**: 2025-10-05 20:00
