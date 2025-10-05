# 診斷計劃 - 403 錯誤持續發生

**時間**: 2025-10-05 20:30
**問題**: DELETE/POST 請求持續 403，即使 CORS 已修復

---

## 🔍 可能原因分析

### 1. 部署未完成 (最可能)
- **證據**: 前端 bundle `fd9d1056` 沒變
- **檢查**: 等待 Zeabur 部署完成（約 2-3 分鐘）
- **驗證**: 強制重新整理 (Ctrl + Shift + R)

### 2. Session 遺失 (可能)
- **原因**: CORS 修復前，可能導致 session cookie 被清除
- **檢查**:
  1. 開發者工具 → Application → Cookies
  2. 查看 `next-auth.session-token` 是否存在
- **解決**: 重新登入

### 3. User Role 不正確 (可能)
- **原因**: 資料庫中 user.role != 'SUPER_ADMIN'
- **檢查**:
  ```sql
  SELECT id, email, name, role FROM users WHERE email = '你的email';
  ```
- **解決**:
  ```sql
  UPDATE users SET role = 'SUPER_ADMIN' WHERE email = '你的email';
  ```

### 4. Middleware 仍在阻擋 (較不可能)
- **原因**: 新版 middleware 未部署
- **檢查**: Zeabur Runtime Logs 搜尋 `CORS blocked`
- **解決**: 確認部署 commit SHA = `032d51d`

---

## 📋 診斷步驟（依序執行）

### Step 1: 確認部署狀態 ⏳

**操作**:
1. 到 Zeabur Dashboard
2. 檢查 Latest Deployment
3. 確認 Commit SHA = `032d51d`
4. 等待 Status = Running

**預期結果**: 部署完成，前端 bundle 檔名改變

---

### Step 2: 強制重新整理 🔄

**操作**:
1. 開啟線上環境 `https://alcohol-trading-system.zeabur.app`
2. 按 `Ctrl + Shift + R` (Windows) 或 `Cmd + Shift + R` (Mac)
3. 重新嘗試刪除/取消操作

**預期結果**: 403 錯誤消失

**如果仍有 403**: 繼續 Step 3

---

### Step 3: 檢查 Session Cookie 🍪

**操作**:
1. 開發者工具 (F12)
2. Application → Cookies → `https://alcohol-trading-system.zeabur.app`
3. 查看 `next-auth.session-token` 或 `__Secure-next-auth.session-token`

**情境 A: Cookie 存在**
- 繼續 Step 4

**情境 B: Cookie 不存在**
- 原因: Session 已失效
- **解決**:
  1. 登出 (右上角)
  2. 重新登入
  3. 重試刪除操作

---

### Step 4: 檢查 User Role 🔐

**操作**:
1. 連線到 Zeabur PostgreSQL
2. 執行查詢:
   ```sql
   SELECT id, email, name, role, is_active
   FROM users
   WHERE email = '你的登入email';
   ```

**預期結果**:
```
role = 'SUPER_ADMIN'
is_active = true
```

**如果 role != 'SUPER_ADMIN'**:
```sql
UPDATE users
SET role = 'SUPER_ADMIN'
WHERE email = '你的email';
```

**重要**: 更新後需要**重新登入**

---

### Step 5: 檢查 Runtime Logs 📜

**操作**:
1. Zeabur → Runtime Logs
2. 搜尋關鍵字: `CORS blocked` 或 `403`
3. 查看最近 10 分鐘的 logs

**情境 A: 看到 "CORS blocked: ..."**
- 原因: Middleware 仍在阻擋
- **解決**:
  1. 確認環境變數 `NEXTAUTH_URL` 或 `NEXT_PUBLIC_APP_ORIGIN`
  2. 確認值是否正確 (應該是 `https://alcohol-trading-system.zeabur.app`)

**情境 B: 看到 "權限不足，只有超級管理員..."**
- 原因: User role 不正確
- **解決**: 回到 Step 4

**情境 C: 沒有任何 CORS 或 403 logs**
- 原因: 請求根本沒到達 API (前端問題)
- **解決**: 檢查前端是否正確發送請求

---

## 🚨 緊急暫時方案

如果以上都無效，可以暫時**移除角色檢查**進行測試：

```typescript
// webapp/src/app/api/sales/[id]/route.ts Line 265-267
// 暫時註解掉
// if (session.user.role !== 'SUPER_ADMIN') {
//   return NextResponse.json({ error: '權限不足' }, { status: 403 })
// }
```

**⚠️ 警告**: 這會讓所有登入用戶都能刪除訂單，僅用於診斷！

---

## 📊 建議執行順序

1. ✅ **先等 5 分鐘** - 讓 Zeabur 部署完成
2. ✅ **強制重新整理** - 清除瀏覽器快取
3. ⚠️ **檢查 Session** - 確認 cookie 存在
4. ⚠️ **檢查 Role** - 確認資料庫角色正確
5. 🔍 **看 Logs** - 找出真正的錯誤訊息

---

**下一步**: 請先執行 Step 1 和 Step 2，然後回報結果
