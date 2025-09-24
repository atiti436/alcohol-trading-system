# 系統健康檢查清單

## 🏥 系統健康檢查概覽

本文件提供完整的系統健康檢查流程，用於確保酒類進口貿易管理系統的正常運作。

---

## ⚡ 快速健康檢查 (5分鐘)

### 1. 基本服務檢查
```bash
# 檢查系統啟動狀態
npm run dev  # 開發環境
# 或
npm run build && npm start  # 生產模式

# 確認服務在 http://localhost:3000 正常回應
```

### 2. 資料庫連接檢查
```bash
# 檢查 Prisma 連線
npx prisma db pull
npx prisma generate
```

### 3. 認證系統檢查
- [ ] Google OAuth 登入正常
- [ ] Session 持久性正常
- [ ] 登出功能正常

---

## 🔍 完整健康檢查 (30分鐘)

### A. 前端檢查

#### 1. 頁面載入檢查
- [ ] **Dashboard** (/) - 首頁總覽正常載入
- [ ] **Settings** (/settings) - 系統設定頁面正常
- [ ] **Profile** (/profile) - 個人設定頁面正常
- [ ] **Users** (/users) - 用戶管理頁面 (僅管理員)

#### 2. UI 組件檢查
```javascript
// 在瀏覽器 Console 執行
// 檢查通知鈴鐺是否正確禁用
const notifyBtn = document.querySelector('[data-testid="notification-bell"]')
console.log('通知鈴鐺狀態:', notifyBtn?.disabled ? '✅ 正確禁用' : '❌ 未禁用')

// 檢查設定頁面開發中標籤
const devTags = document.querySelectorAll('.ant-tag-orange')
console.log('開發中標籤數量:', devTags.length, devTags.length > 0 ? '✅ 正常' : '❌ 缺失')
```

#### 3. 響應式設計檢查
- [ ] **桌面** (1920x1080) - 布局正常
- [ ] **平板** (768x1024) - 側邊欄摺疊正常
- [ ] **手機** (375x667) - 響應式布局正常

### B. 後端 API 檢查

#### 1. 認證 API
```bash
# 檢查 session API
curl -X GET http://localhost:3000/api/auth/session \
  -H "Cookie: your-session-cookie"

# 預期回應: { "user": { "id", "name", "email", "role" } }
```

#### 2. 用戶管理 API
```bash
# 檢查用戶列表 (需要管理員權限)
curl -X GET http://localhost:3000/api/users \
  -H "Cookie: admin-session-cookie"

# 檢查角色升級 API
curl -X POST http://localhost:3000/api/admin/upgrade-role \
  -H "Cookie: admin-session-cookie" \
  -H "Content-Type: application/json"
```

#### 3. 權限檢查
- [ ] **SUPER_ADMIN** - 可存取所有 API
- [ ] **INVESTOR** - 僅能存取銷售資料 (已過濾)
- [ ] **EMPLOYEE** - 可存取業務相關 API
- [ ] **PENDING** - 被正確阻擋存取

### C. 資料隔離檢查

#### 1. 投資方資料隔離測試
```javascript
// 使用投資方身份測試
fetch('/api/sales', {
  method: 'GET',
  credentials: 'include'  // 包含 session cookie
})
.then(res => res.json())
.then(data => {
  // 檢查敏感欄位是否被過濾
  const sensitiveFields = ['actualPrice', 'commission', 'personalPurchases']
  const hasSensitiveData = data.some(sale =>
    sensitiveFields.some(field => sale[field] !== undefined)
  )

  console.log('資料隔離狀態:', hasSensitiveData ? '❌ 失敗' : '✅ 正常')
})
```

#### 2. 角色權限邊界測試
```bash
# 員工嘗試存取管理員 API (應返回 403)
curl -X GET http://localhost:3000/api/admin/users \
  -H "Cookie: employee-session-cookie"

# 預期回應: { "error": "權限不足", "status": 403 }
```

---

## 🛠️ 代碼品質檢查

### 1. 自動化檢查
```bash
# 執行完整 CI 檢查
npm run ci

# 分別執行各項檢查
npm run lint              # ESLint 檢查
npm run check:fields      # 欄位命名檢查
npm run check:permissions # 權限檢查
npm run test:security     # 安全測試
npm run build            # 建置檢查
```

### 2. 代碼規範檢查
- [ ] **TypeScript** - 無類型錯誤
- [ ] **ESLint** - 無 linting 錯誤
- [ ] **Prettier** - 代碼格式一致
- [ ] **Imports** - 無未使用的導入

### 3. Git 掛勾檢查
```bash
# 測試 pre-commit 掛勾
git add .
git commit -m "Test commit"

# 應該自動執行 npm run check:all
```

---

## 📊 性能健康檢查

### 1. 頁面性能
```javascript
// 測量頁面載入時間
const startTime = performance.now()
window.addEventListener('load', () => {
  const loadTime = performance.now() - startTime
  console.log(`頁面載入時間: ${loadTime.toFixed(2)}ms`)
  console.log('性能狀態:', loadTime < 2000 ? '✅ 良好' : '⚠️ 需優化')
})
```

### 2. API 回應時間
```javascript
// 測量 API 回應時間
async function testApiPerformance() {
  const apis = ['/api/auth/session', '/api/users', '/api/settings']

  for (const api of apis) {
    const start = Date.now()
    try {
      await fetch(api)
      const duration = Date.now() - start
      console.log(`${api}: ${duration}ms`, duration < 500 ? '✅' : '⚠️')
    } catch (error) {
      console.error(`${api}: ❌ 錯誤`, error.message)
    }
  }
}

testApiPerformance()
```

### 3. 記憶體使用檢查
```javascript
// 檢查記憶體使用情況
if (performance.memory) {
  const memory = performance.memory
  console.log('記憶體使用狀況:')
  console.log(`- 已使用: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`)
  console.log(`- 總分配: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`)
  console.log(`- 限制: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`)
}
```

---

## 🔒 安全健康檢查

### 1. 認證安全檢查
- [ ] **Session 過期** - 30分鐘自動登出
- [ ] **CSRF 保護** - POST 請求需要 CSRF token
- [ ] **XSS 防護** - 用戶輸入正確轉義
- [ ] **SQL 注入防護** - Prisma ORM 保護

### 2. 資料加密檢查
```bash
# 檢查環境變數設定
echo "NEXTAUTH_SECRET 長度:" ${#NEXTAUTH_SECRET}  # 應該 >= 32
echo "ENCRYPTION_SECRET 長度:" ${#ENCRYPTION_SECRET}  # 應該 >= 32
```

### 3. 錯誤處理檢查
```javascript
// 測試錯誤處理是否洩漏敏感資訊
fetch('/api/nonexistent-endpoint')
.then(res => res.json())
.then(data => {
  const sensitiveKeywords = ['database', 'SQL', 'prisma', 'password']
  const hasSensitiveInfo = sensitiveKeywords.some(keyword =>
    JSON.stringify(data).toLowerCase().includes(keyword)
  )

  console.log('錯誤處理安全:', hasSensitiveInfo ? '❌ 洩漏資訊' : '✅ 安全')
})
```

---

## 📱 外部服務檢查

### 1. LINE BOT 健康檢查
```bash
# 檢查 LINE BOT Webhook
curl -X POST http://localhost:3000/api/linebot/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[{"type":"message","message":{"type":"text","text":"測試"}}]}'
```

### 2. AI 服務檢查
- [ ] **Gemini API** - API 金鑰有效
- [ ] **文檔辨識** - OCR 功能正常
- [ ] **成本計算** - 計算邏輯正確

---

## 🚨 故障排除指南

### 常見問題檢查

#### 1. 登入問題
```bash
# 檢查 Google OAuth 設定
echo "GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:0:10}..."
echo "GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:0:10}..."
echo "NEXTAUTH_URL: $NEXTAUTH_URL"
```

#### 2. 資料庫問題
```bash
# 重置資料庫連接
npx prisma db push
npx prisma generate
```

#### 3. 權限問題
```bash
# 檢查用戶角色
npx prisma studio
# 手動檢查 User 表的 role 欄位
```

#### 4. 建置問題
```bash
# 清理並重新建置
rm -rf .next
rm -rf node_modules
npm ci
npm run build
```

---

## ✅ 健康檢查報告模板

```
🏥 系統健康檢查報告
檢查日期: YYYY-MM-DD
檢查人員: [姓名]

📊 檢查結果:
- 基本服務: ✅/❌
- 前端頁面: ✅/❌
- 後端 API: ✅/❌
- 資料隔離: ✅/❌
- 代碼品質: ✅/❌
- 性能表現: ✅/❌
- 安全檢查: ✅/❌
- 外部服務: ✅/❌

🚨 發現問題:
1. [問題描述]
   - 影響級別: 高/中/低
   - 建議修復時間: [時間]

📋 後續行動:
- [ ] [行動項目1]
- [ ] [行動項目2]

整體健康狀態: 🟢 良好 / 🟡 注意 / 🔴 需修復
```

---

**檢查週期建議**:
- 🚀 **部署前**: 完整檢查 (30分鐘)
- 📅 **每日**: 快速檢查 (5分鐘)
- 📊 **每週**: 性能檢查 (15分鐘)
- 🔒 **每月**: 安全檢查 (1小時)

💡 **提醒**: 定期執行健康檢查可以預防潛在問題，確保系統穩定運行！