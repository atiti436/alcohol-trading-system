# 🔒 安全性檢查清單

**專案**: 酒類貿易 ERP 系統
**生成時間**: 2025-10-04
**檢查範圍**: 認證授權、資料保護、API 安全、敏感資訊

---

## ✅ 已實作的安全措施

### 1. 認證機制
- ✅ NextAuth.js 認證
- ✅ JWT Session 管理
- ✅ bcrypt 密碼雜湊
- ✅ 角色權限控制（SUPER_ADMIN, EMPLOYEE, INVESTOR）

### 2. 資料保護
- ✅ Prisma ORM（防 SQL Injection）
- ✅ 加密 KEY (`ENCRYPTION_KEY` 環境變數）
- ✅ 投資方數據隔離（隱藏 actual_amount, commission）

### 3. API 權限檢查
- ✅ getServerSession() 驗證登入狀態
- ✅ 角色權限檢查（部分 API）

---

## ⚠️ 安全建議（按優先級）

### P0 - 嚴重風險（立即處理）

#### 1. 環境變數洩漏風險 ⚠️

**發現**:
- 10 個檔案使用 `process.env.`
- 15 個檔案包含 password/secret/key 關鍵字

**檢查清單**:
- [ ] 確認 `.env` 已加入 `.gitignore`
- [ ] 移除程式碼中的硬編碼 API KEY
- [ ] 檢查前端程式碼是否暴露後端 SECRET

**修復範例**:
```typescript
// ❌ 危險：前端可見
const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY

// ✅ 安全：僅後端使用
// app/api/gemini/route.ts
const apiKey = process.env.GEMINI_API_KEY
```

**實施時間**: 2 小時

---

#### 2. SQL Injection 防護檢查 ⚠️

**建議**: 確認所有資料庫查詢使用參數化

```typescript
// ✅ 安全：Prisma 自動參數化
await prisma.product.findMany({
  where: { name: { contains: searchTerm } }
})

// ❌ 危險（如果有的話）
await prisma.$queryRaw(`SELECT * FROM products WHERE name = '${searchTerm}'`)
```

**檢查清單**:
- [ ] 搜尋所有 `$queryRaw` 使用處
- [ ] 確認都使用 `$queryRaw` 的參數化語法

**實施時間**: 1 小時

---

### P1 - 高風險（本週處理）

#### 3. CORS 設定檢查

**建議**: 明確設定允許的來源

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://yourdomain.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
        ],
      },
    ]
  },
}
```

**實施時間**: 0.5 小時

---

#### 4. Rate Limiting（防 DDoS）

**建議**: 加入 API 請求限制

```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 秒內最多 10 次
})

export async function middleware(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return new Response('Too Many Requests', { status: 429 })
  }
}
```

**實施時間**: 2 小時

---

#### 5. 敏感資料日誌過濾

**建議**: 確認 console.log 不洩漏敏感資訊

```typescript
// ❌ 危險
console.log('User data:', user) // 可能包含密碼雜湊

// ✅ 安全
console.log('User logged in:', user.email)

// ✅ 使用自訂 logger
const safeLog = (msg, data) => {
  const { password, secret, ...safe } = data
  console.log(msg, safe)
}
```

**檢查清單**:
- [ ] 搜尋所有 `console.log`
- [ ] 確認無密碼、token、API key 輸出
- [ ] 生產環境禁用 console（Next.js 自動處理）

**實施時間**: 1 小時

---

### P2 - 中風險（兩週處理）

#### 6. HTTPS 強制跳轉

**建議**: 生產環境強制使用 HTTPS

```typescript
// middleware.ts
export function middleware(request: Request) {
  if (process.env.NODE_ENV === 'production' &&
      request.headers.get('x-forwarded-proto') !== 'https') {
    return Response.redirect(`https://${request.headers.get('host')}${request.url}`)
  }
}
```

**實施時間**: 0.5 小時

---

#### 7. CSRF 防護

**建議**: NextAuth 已內建 CSRF token，確認啟用

```typescript
// modules/auth/providers/nextauth.ts
export const authOptions: AuthOptions = {
  // ✅ 確認有這行
  csrf: true,
  // ...
}
```

**實施時間**: 0.2 小時（檢查即可）

---

#### 8. XSS 防護

**建議**: 避免 dangerouslySetInnerHTML

```typescript
// ❌ 危險
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ 安全：React 自動轉義
<div>{userInput}</div>

// ✅ 如需 HTML，使用 DOMPurify
import DOMPurify from 'dompurify'
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

**檢查清單**:
- [ ] 搜尋 `dangerouslySetInnerHTML`
- [ ] 確認都有消毒處理

**實施時間**: 1 小時

---

#### 9. 檔案上傳安全

**建議**: 限制檔案類型和大小

```typescript
// app/api/upload/route.ts
export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File

  // ✅ 檢查檔案類型
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    return new Response('Invalid file type', { status: 400 })
  }

  // ✅ 檢查檔案大小（5MB）
  if (file.size > 5 * 1024 * 1024) {
    return new Response('File too large', { status: 400 })
  }

  // ✅ 重新命名檔案（避免路徑穿越）
  const safeFilename = crypto.randomUUID() + path.extname(file.name)
}
```

**實施時間**: 1 小時

---

#### 10. Session 逾時設定

**建議**: 設定合理的 session 有效期

```typescript
// modules/auth/providers/nextauth.ts
export const authOptions: AuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // ✅ 8 小時自動登出
  },
  // ✅ 加入 refresh token 機制
  callbacks: {
    async jwt({ token, user, account }) {
      if (account) {
        token.accessTokenExpires = Date.now() + 8 * 60 * 60 * 1000
      }
      return token
    }
  }
}
```

**實施時間**: 1 小時

---

### P3 - 低風險（技術債）

#### 11. 依賴套件漏洞掃描

**建議**:
```bash
# 定期執行
npm audit
npm audit fix

# 或使用 Snyk
npx snyk test
```

**實施時間**: 持續執行（每週）

---

#### 12. 安全標頭設定

**建議**: 加入安全相關 HTTP 標頭

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval';"
          },
        ],
      },
    ]
  },
}
```

**實施時間**: 1 小時

---

## 📋 快速檢查指令

```bash
# 1. 檢查敏感資訊
grep -r "password.*=" webapp/src --exclude-dir=node_modules

# 2. 檢查環境變數使用
grep -r "process.env" webapp/src --exclude-dir=node_modules

# 3. 檢查 SQL Injection 風險
grep -r "\$queryRaw" webapp/src --exclude-dir=node_modules

# 4. 檢查 XSS 風險
grep -r "dangerouslySetInnerHTML" webapp/src --exclude-dir=node_modules

# 5. 依賴套件掃描
npm audit
```

---

## 🎯 實施計劃

### Week 1: P0 緊急修復
- Day 1: 環境變數檢查 + SQL Injection 檢查
- Day 2: 完成修復

### Week 2: P1 高風險防護
- Day 1-2: CORS + Rate Limiting
- Day 3: 日誌過濾

### Week 3+: P2-P3 持續改善
- HTTPS / CSRF / XSS
- 定期安全掃描

---

## 📊 安全等級評估

**目前狀態**: 🟡 中等安全（有基礎防護，需補強）

**改善後**: 🟢 高安全（符合業界標準）

---

## 📝 注意事項

1. **生產環境前必做**: P0 + P1 項目
2. **定期檢查**: 每月執行快速檢查指令
3. **監控告警**: 建議加入 Sentry / Datadog 監控異常請求

---

**建議優先執行**: P0 項目 1-2（環境變數 + SQL Injection 檢查）

**預期 ROI**: 極高（避免資料洩漏、服務中斷風險）
