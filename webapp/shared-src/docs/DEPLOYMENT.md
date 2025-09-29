# 環境管理與部署策略

本文件定義開發、預覽、與正式環境的規則，所有 AI 開發與部署時必須遵守。

## 🏗️ 環境架構原則

### **1. `main` 分支 (正式環境)**
- `main` 分支是神聖的，它代表了穩定、可運營的「正式環境 (Production)」。
- 任何程式碼都不能直接提交到 `main` 分支。

### **2. `feature/...` 分支 (開發環境)**
- 所有新功能的開發，都必須從 `main` 分支建立一個新的 `feature/...` 分支 (例如: `feature/R1-auth-system`)。
- 所有在 `feature/...` 分支的提交，都會被自動部署到一個獨立的「預覽/開發環境 (Preview/Development)」，專門用來測試。

### **3. 合併與發佈流程**
- 一項新功能，只有在「預覽環境」中由老闆親自測試通過後，該 `feature/...` 分支才能被允許透過 Pull Request (PR) 合併回 `main` 分支。
- 合併回 `main` 分支的動作，即代表一次正式的發佈。

---

## 🚀 部署目標
將酒類進口貿易管理系統從開發環境安全地部署到生產環境，確保**商業機密數據隔離**和系統穩定性。

---

## 📋 部署前檢查清單

### **🔒 安全檢查 (最高優先級)**
- [ ] **投資方數據隔離測試100%通過**
- [ ] **所有API端點權限驗證完成**
- [ ] **敏感資料加密儲存**
- [ ] **錯誤訊息不洩漏系統資訊**
- [ ] **API金鑰安全儲存**
- [ ] **HTTPS強制啟用**
- [ ] **CSRF防護啟用**
- [ ] **SQL注入防護測試**

### **🧪 功能檢查**
- [ ] **所有11個模組功能測試通過**
- [ ] **6個房間整合測試通過**
- [ ] **雙重價格機制正確運作**
- [ ] **稅金計算準確性驗證**
- [ ] **LINE BOT功能正常**
- [ ] **AI報單辨識準確度 > 80%**
- [ ] **多角色登入測試通過**

### **⚡ 性能檢查**
- [ ] **首頁載入時間 < 2秒**
- [ ] **API回應時間 < 500ms**
- [ ] **大量數據處理穩定**
- [ ] **資料庫查詢最佳化**
- [ ] **圖片和資源壓縮**

---

## 🌐 部署架構選擇

### **🏆 推薦架構 (Vercel + Firebase)**
```
老闆電腦/手機
      ↓
   Cloudflare CDN
      ↓
   Vercel (前端 + API)
      ↓
   Firebase (資料庫)
      ↓
外部服務 (Gemini API, LINE API)
```

### **💰 成本效益分析**
| 服務 | 免費額度 | 付費後 | 適用場景 |
|------|----------|--------|----------|
| Vercel | 無限制 | $20/月 | 完美適合 |
| Firebase | 豐富 | $25/月 | 老師推薦 |
| Zeabur | $5/月 | $20/月 | 新選擇 |

### **🔧 替代架構 (Zeabur + PostgreSQL)**
```
老闆電腦/手機
      ↓
   Zeabur (全端 + 資料庫)
      ↓
外部服務 (Gemini API, LINE API)
```

---

## 📦 Vercel 部署步驟

### **Step 1: 準備代碼庫**
```bash
# 確認所有代碼已提交
git add .
git commit -m "Production ready: All features completed

🎯 Features:
- ✅ 11 modules implemented
- ✅ Role-based data isolation
- ✅ Dual pricing system
- ✅ Tax calculation engine
- ✅ LINE BOT integration
- ✅ AI declaration recognition

🔒 Security:
- ✅ Investor data filtering
- ✅ API permission checks
- ✅ Secure error handling
- ✅ HTTPS enforcement

🚀 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main
```

### **Step 2: Vercel專案設定**
```bash
# 安裝Vercel CLI
npm install -g vercel

# 登入Vercel
vercel login

# 初始化專案
vercel

# 選擇設定
? Set up and deploy "~/alcohol-trading-system"? [Y/n] y
? Which scope? Your Account
? Link to existing project? [y/N] n
? What's your project's name? alcohol-trading-system
? In which directory is your code located? ./
? Want to override the settings? [y/N] n
```

### **Step 3: 環境變數設定**
在Vercel Dashboard設定以下環境變數：

```bash
# 認證相關
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-super-secret-key-32-characters-long

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# 資料庫
DATABASE_URL=your-database-connection-string

# AI服務
GEMINI_API_KEY=your-gemini-api-key

# LINE BOT
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
LINE_CHANNEL_SECRET=your-line-channel-secret

# 系統加密
ENCRYPTION_SECRET=your-encryption-secret-key
```

### **Step 4: 自動部署設定**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:security

      - name: Build project
        run: npm run build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## 🔥 Firebase 設定

### **Step 1: Firebase專案建立**
```bash
# 安裝Firebase CLI
npm install -g firebase-tools

# 登入Firebase
firebase login

# 初始化專案
firebase init firestore
```

### **Step 2: Firestore安全規則**
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 使用者資料 - 只能存取自己的
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // 銷售資料 - 按角色過濾
    match /sales/{saleId} {
      allow read: if request.auth != null &&
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'SUPER_ADMIN' ||
         (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'INVESTOR' &&
          resource.data.investorId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.investorId));

      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['SUPER_ADMIN', 'EMPLOYEE'];
    }

    // 商品資料 - 所有已認證用戶可讀
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['SUPER_ADMIN', 'EMPLOYEE'];
    }

    // 系統設定 - 僅超級管理員
    match /settings/{settingId} {
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'SUPER_ADMIN';
    }
  }
}
```

### **Step 3: Firebase配置**
```typescript
// lib/firebase.ts
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
```

---

## 🔧 API金鑰管理設定

### **系統設定頁面**
```typescript
// pages/api/system/settings.ts
export default withAuth(['SUPER_ADMIN'])(async (req, res) => {
  if (req.method === 'GET') {
    // 返回API金鑰狀態 (不返回實際金鑰)
    const settings = await getSystemSettings()

    res.json({
      success: true,
      data: {
        geminiApi: {
          configured: !!settings.geminiApiKey,
          lastTested: settings.geminiLastTested,
          status: settings.geminiStatus
        },
        lineBot: {
          configured: !!settings.lineAccessToken,
          lastTested: settings.lineLastTested,
          status: settings.lineStatus
        },
        googleOAuth: {
          configured: !!settings.googleClientId,
          lastTested: settings.googleLastTested,
          status: settings.googleStatus
        }
      }
    })
  }

  if (req.method === 'POST') {
    const { service, apiKey, testConnection } = req.body

    // 加密儲存API金鑰
    const encryptedKey = encrypt(apiKey, process.env.ENCRYPTION_SECRET)

    await updateSystemSetting(service, encryptedKey)

    if (testConnection) {
      const testResult = await testServiceConnection(service, apiKey)
      await updateSystemSetting(`${service}Status`, testResult.success ? 'active' : 'error')
      await updateSystemSetting(`${service}LastTested`, new Date().toISOString())
    }

    res.json({ success: true })
  }
})
```

### **API金鑰加密解密**
```typescript
// lib/encryption.ts
import crypto from 'crypto'

const algorithm = 'aes-256-gcm'

export function encrypt(text: string, secretKey: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher(algorithm, secretKey)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  return iv.toString('hex') + ':' + encrypted
}

export function decrypt(encryptedText: string, secretKey: string): string {
  const parts = encryptedText.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts[1]

  const decipher = crypto.createDecipher(algorithm, secretKey)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
```

---

## 📊 監控與日誌設定

### **Vercel Analytics**
```typescript
// pages/_app.tsx
import { Analytics } from '@vercel/analytics/react'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}
```

### **錯誤監控**
```typescript
// lib/monitoring.ts
export function setupErrorMonitoring() {
  // 捕獲未處理的錯誤
  window.addEventListener('error', (event) => {
    console.error('[Global Error]:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: new Date().toISOString()
    })
  })

  // 捕獲Promise rejection
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Promise Rejection]:', {
      reason: event.reason,
      timestamp: new Date().toISOString()
    })
  })
}
```

### **性能監控**
```typescript
// lib/performance.ts
export function trackPerformance() {
  // 頁面載入時間
  window.addEventListener('load', () => {
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart

    if (loadTime > 2000) {
      console.warn('[Performance] Slow page load:', loadTime + 'ms')
    }
  })

  // API回應時間監控
  const originalFetch = window.fetch
  window.fetch = async (...args) => {
    const startTime = Date.now()
    const response = await originalFetch(...args)
    const duration = Date.now() - startTime

    if (duration > 1000) {
      console.warn('[Performance] Slow API response:', {
        url: args[0],
        duration: duration + 'ms'
      })
    }

    return response
  }
}
```

---

## 🔒 生產環境安全設定

### **安全標頭設定**
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
]

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}
```

### **環境變數驗證**
```typescript
// lib/env-validation.ts
const requiredEnvVars = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'DATABASE_URL',
  'ENCRYPTION_SECRET'
]

export function validateEnvironment() {
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  // 檢查金鑰長度
  if (process.env.NEXTAUTH_SECRET.length < 32) {
    throw new Error('NEXTAUTH_SECRET must be at least 32 characters long')
  }

  if (process.env.ENCRYPTION_SECRET.length < 32) {
    throw new Error('ENCRYPTION_SECRET must be at least 32 characters long')
  }
}
```

---

## 🚨 部署後驗證

### **功能驗證清單**
```bash
# 1. 基本功能測試
curl https://your-domain.vercel.app/api/health

# 2. 認證測試
curl https://your-domain.vercel.app/api/auth/session

# 3. 權限測試 (應該返回403)
curl -H "Authorization: Bearer invalid_token" \
     https://your-domain.vercel.app/api/admin/users
```

### **安全測試**
```javascript
// 在瀏覽器Console執行
// 1. 測試投資方數據隔離
fetch('/api/sales', {
  headers: { 'Authorization': 'Bearer investor_token' }
})
.then(res => res.json())
.then(data => {
  // 檢查是否包含敏感欄位
  const hasSensitiveData = data.data.some(sale =>
    sale.actualPrice || sale.commission || sale.personalPurchases
  )

  if (hasSensitiveData) {
    console.error('🚨 SECURITY ALERT: Investor can see sensitive data!')
  } else {
    console.log('✅ Data isolation working correctly')
  }
})

// 2. 測試錯誤訊息是否洩漏資訊
fetch('/api/nonexistent-endpoint')
.then(res => res.json())
.then(data => {
  if (data.error.message.includes('database') || data.error.message.includes('SQL')) {
    console.error('🚨 SECURITY ALERT: Error message leaks system info!')
  } else {
    console.log('✅ Error handling is secure')
  }
})
```

### **性能測試**
```javascript
// 測試頁面載入時間
const startTime = performance.now()
window.addEventListener('load', () => {
  const loadTime = performance.now() - startTime
  console.log(`頁面載入時間: ${loadTime.toFixed(2)}ms`)

  if (loadTime > 2000) {
    console.warn('⚠️ 頁面載入時間超過目標 (2秒)')
  } else {
    console.log('✅ 頁面載入速度達標')
  }
})
```

---

## 📱 LINE BOT Webhook設定

### **設定Webhook URL**
```
LINE Developers Console:
Webhook URL: https://your-domain.vercel.app/api/linebot/webhook
```

### **測試LINE BOT**
```
發送訊息到LINE BOT:
"白鶴清酒 720ml 15度 日幣800 匯率0.21"

預期回應:
"成本計算結果：
💰 台幣成本: $168
🏛️ 關稅: $34
🍶 菸酒稅: $76
📊 推廣費: $0
💸 營業稅: $14
━━━━━━━━━━
總成本: $292/瓶"
```

---

## 🎉 部署完成檢查

### **最終驗證清單**
- [ ] **網站可正常存取**
- [ ] **所有角色登入正常**
- [ ] **投資方數據隔離正確**
- [ ] **API回應時間正常**
- [ ] **錯誤處理安全**
- [ ] **LINE BOT功能正常**
- [ ] **AI辨識功能正常**
- [ ] **SSL憑證有效**
- [ ] **監控系統運作**

### **給老闆的使用指南**
```
🎉 系統部署完成！

🌐 網站網址: https://your-domain.vercel.app
👤 管理員帳號: 使用您的Google帳號登入

📱 LINE BOT: 已設定完成，可直接使用
🤖 AI功能: 需要您在系統設定頁面輸入API金鑰

🔧 下一步:
1. 登入系統
2. 前往「系統設定」頁面
3. 輸入準備好的API金鑰
4. 測試各項功能
5. 開始使用！

如有問題，請保存錯誤代碼並聯絡技術支援。
```

**部署成功！系統已準備好保護您的商業機密！** 🚀🔒