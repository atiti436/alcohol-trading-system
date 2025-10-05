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

#### 1. 環境變數洩漏風險 ✅ 已通過 (2025-10-05)

**檢查結果**:
- ✅ `.env*` 已加入 `.gitignore`
- ✅ 無硬編碼 password/secret/API key
- ✅ 僅 1 個 `NEXT_PUBLIC_` 變數（功能開關，非敏感）
- ✅ 所有敏感環境變數僅用於後端

**統計**:
- 認證相關: 5 個（後端）
- API Keys: 3 個（後端）
- 功能開關: 1 個（前端，非敏感）
- 環境判斷: 4 個（後端）

**安全等級**: 🟢 優秀

**檢查時間**: 2025-10-05
**檢查人員**: Claude Code

---

#### 2. SQL Injection 防護檢查 ✅ 已通過 (2025-10-05)

**檢查結果**:
- ✅ 僅 3 處使用 `$queryRaw`（Dashboard 統計查詢）
- ✅ 全部使用 tagged template 語法（反引號）
- ✅ 無外部參數注入（純靜態查詢）
- ✅ 其餘查詢全部使用 Prisma ORM（自動參數化）

**原生 SQL 位置**:
1. `dashboard/route.ts:93` - 庫存價值查詢 ✅
2. `dashboard/route.ts:118` - 低庫存商品查詢 ✅
3. `dashboard/route.ts:261` - 庫存警報查詢 ✅

**安全等級**: 🟢 完美

**檢查時間**: 2025-10-05
**檢查人員**: Claude Code

---

### P1 - 高風險（本週處理）

#### 3. CORS 設定檢查 ✅ 已完成 (2025-10-05)

**實施方式**: Next.js Middleware 全域保護

**保護範圍**:
- ✅ 所有 POST/PUT/DELETE/PATCH 請求
- ✅ 檢查 Origin 標頭與 NEXTAUTH_URL 匹配
- ✅ 100% API 覆蓋率

**測試結果**:
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Origin: http://evil.com"
# → 403 Cross-origin request blocked ✅
```

**實施位置**: `webapp/src/middleware.ts`

**安全等級**: 🟢 完美

**完成時間**: 2025-10-05
**檢查人員**: Claude Code

---

#### 4. Rate Limiting（防 DDoS）✅ 已完成 (2025-10-05)

**實施方式**: Next.js Middleware 全域保護（分級策略）

**保護策略**:
- 🔴 **認證 API** (`/api/auth/*`): 10 次/分鐘（最嚴格）
- 🟠 **寫入操作** (POST/PUT/DELETE): 20 次/分鐘（嚴格）
- 🟢 **查詢操作** (GET): 60 次/分鐘（寬鬆）

**保護範圍**:
- ✅ 100% API 覆蓋率
- ✅ 基於 IP 的頻率限制
- ✅ 記憶體快取（全域單例）
- ✅ 自動重置時間窗口

**測試結果**:
- ✅ CORS 阻擋正常（惡意來源 → 403）
- ✅ Rate Limiting 正常（超過限制 → 429 Too Many Requests）

**回應格式**:
```json
{
  "error": "Too many requests",
  "message": "請求過於頻繁，請稍後再試（45秒後重試）"
}
```

**實施位置**: `webapp/src/middleware.ts`

**安全等級**: 🟢 優秀

**完成時間**: 2025-10-05
**檢查人員**: Claude Code

---

#### 5. 安全標頭設定 ✅ 已完成 (2025-10-05)

**實施方式**: Next.js Middleware 自動加入

**已實施標頭**:
- ✅ `X-Frame-Options: DENY` - 防止點擊劫持
- ✅ `X-Content-Type-Options: nosniff` - 防止 MIME 嗅探
- ✅ `X-XSS-Protection: 1; mode=block` - XSS 保護（舊版瀏覽器）
- ✅ `Referrer-Policy: strict-origin-when-cross-origin` - 隱私保護
- ✅ `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()` - 限制瀏覽器功能

**測試結果**:
```bash
curl -I http://localhost:3000
# ✅ 所有安全標頭已加入
```

**實施位置**: `webapp/src/middleware.ts:addSecurityHeaders()`

**安全等級**: 🟢 優秀

**完成時間**: 2025-10-05
**檢查人員**: Claude Code

---

#### 6. 敏感資料日誌過濾

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

#### 6. HTTPS 強制跳轉 ✅ 已完成 (2025-10-05)

**實施方式**: Middleware 生產環境自動跳轉

**實施位置**: `webapp/src/middleware.ts:22-28`

```typescript
if (process.env.NODE_ENV === 'production') {
  const proto = request.headers.get('x-forwarded-proto')
  if (proto && proto !== 'https') {
    return NextResponse.redirect(httpsUrl, 301)
  }
}
```

**完成時間**: 2025-10-05

---

#### 7. CSRF 防護 ✅ 已確認 (2025-10-05)

**檢查結果**: NextAuth 已啟用 CSRF 保護

**實施方式**: Cookie SameSite 屬性

**位置**: `webapp/src/modules/auth/providers/nextauth.ts:25`

```typescript
cookies: {
  sessionToken: {
    sameSite: 'lax', // 🔒 CSRF 防護
  }
}
```

**完成時間**: 2025-10-05

---

#### 8. XSS 防護 ✅ 已確認 (2025-10-05)

**檢查結果**: 無使用 dangerouslySetInnerHTML

**React 自動轉義**: 所有用戶輸入自動安全處理

**完成時間**: 2025-10-05

---

#### 9. Session 逾時設定 ✅ 已完成 (2025-10-05)

**修改內容**: 30天 → 8小時

**位置**: `webapp/src/modules/auth/providers/nextauth.ts:15`

```typescript
session: {
  strategy: 'jwt',
  maxAge: 8 * 60 * 60, // 🔒 8 小時自動登出
}
```

**完成時間**: 2025-10-05

---

#### 10. 依賴套件漏洞 ✅ 已修復 (2025-10-05)

**發現問題**: xlsx 0.18.5 有高危漏洞

**修復內容**:
- Prototype Pollution (GHSA-4r6h-8v6p-xvw6)
- ReDoS (GHSA-5pgg-2g8v-p4x9)

**修復方式**: 升級至 xlsx 0.20.3

**位置**: `webapp/package.json:45`

**完成時間**: 2025-10-05

---

#### 11. 敏感資料日誌 ✅ 已確認 (2025-10-05)

**檢查結果**: 無 console.log 洩漏密碼、token、secret

**完成時間**: 2025-10-05

---

#### 12. 檔案上傳安全 ✅ 已確認 (2025-10-05)

**檢查結果**: 系統無檔案上傳功能

**完成時間**: 2025-10-05

---

### P3 - 低風險（技術債）

#### 13. XSS 防護（舊建議）

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
