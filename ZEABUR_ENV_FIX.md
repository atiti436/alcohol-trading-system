# 🚨 緊急修復 - Zeabur 環境變數錯誤

## 問題根因

CORS 白名單配置錯誤，導致所有請求被阻擋：

```
🚨 CORS blocked: https://alcohol-trading-system.zeabur.app
   allowed: http://alcohol-trading-system.zeabur.app  ❌ 錯誤！
```

**原因**: `NEXTAUTH_URL` 環境變數設定為 `http://` 而非 `https://`

---

## 🔧 立即修復步驟

### Step 1: 前往 Zeabur 設定環境變數

1. 登入 Zeabur Dashboard
2. 選擇專案 `alcohol-trading-system`
3. 選擇服務 `webapp`
4. 點擊 **Variables** 分頁

---

### Step 2: 修改環境變數

找到並修改以下環境變數：

#### 修改 `NEXTAUTH_URL`

**舊值** (錯誤):
```
http://alcohol-trading-system.zeabur.app
```

**新值** (正確):
```
https://alcohol-trading-system.zeabur.app
```

#### 或新增 `NEXT_PUBLIC_APP_ORIGIN` (推薦)

**新增環境變數**:
```
NEXT_PUBLIC_APP_ORIGIN=https://alcohol-trading-system.zeabur.app
```

**說明**: 這個變數會優先於 `NEXTAUTH_URL` 被 middleware 使用

---

### Step 3: 重新部署

修改環境變數後，Zeabur 會**自動重新部署**

等待 2-3 分鐘讓部署完成

---

### Step 4: 驗證修復

1. 清除瀏覽器快取 (Ctrl + Shift + R)
2. 嘗試登入
3. 檢查 Console 是否還有 `CORS blocked` 錯誤

---

## 📊 預期結果

### 修復前
```
allowed: http://alcohol-trading-system.zeabur.app, https://localhost:8080
```

### 修復後
```
allowed: https://alcohol-trading-system.zeabur.app, https://localhost:8080
```

---

## 🔍 為什麼會這樣？

### 我們的 middleware 邏輯

```typescript
function resolveAllowedOrigins(request: NextRequest): Set<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_ORIGIN || process.env.NEXTAUTH_URL

  if (appUrl) {
    origins.add(new URL(appUrl).origin)  // 解析 origin
  }

  // 同源請求
  origins.add(request.nextUrl.origin)
}
```

### 當 NEXTAUTH_URL = "http://..."

```javascript
new URL("http://alcohol-trading-system.zeabur.app").origin
// → "http://alcohol-trading-system.zeabur.app"

request.headers.get('origin')
// → "https://alcohol-trading-system.zeabur.app"

// 不匹配！→ 403 CORS blocked
```

---

## 💡 其他可能的解決方案

### 方案 A: 修改環境變數 (推薦)
✅ 最簡單，直接改 Zeabur 設定

### 方案 B: 修改 middleware 自動處理
❌ 不推薦，會讓 http/https 混用造成安全問題

### 方案 C: 暫時關閉 CORS 檢查
❌ 不推薦，會有安全風險

---

## ✅ 立即行動

**現在就去 Zeabur 修改環境變數！**

1. 把 `NEXTAUTH_URL` 改成 `https://...`
2. 或新增 `NEXT_PUBLIC_APP_ORIGIN=https://...`
3. 等待自動重新部署
4. 測試登入

---

**修改後應該立刻就能正常登入了！** 🎉
