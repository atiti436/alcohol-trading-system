# 快速修復 - 強制重新登入

## 問題
登出後自動被重新登入 → Session 可能損壞

---

## 🔧 解決方案（依序嘗試）

### 方案 1: 完全清除 Cookies + 重新登入 ✅

**步驟**:
1. 開啟開發者工具 (F12)
2. Application → Cookies → `https://alcohol-trading-system.zeabur.app`
3. **手動刪除所有 cookies**:
   - `next-auth.session-token`
   - `__Secure-next-auth.session-token`
   - `next-auth.csrf-token`
   - `__Secure-next-auth.csrf-token`
   - `next-auth.callback-url`
4. 關閉所有分頁
5. 重新開啟 `https://alcohol-trading-system.zeabur.app`
6. 重新登入
7. 測試刪除功能

---

### 方案 2: 無痕模式測試 🕵️

**步驟**:
1. 開啟無痕視窗 (Ctrl + Shift + N)
2. 前往 `https://alcohol-trading-system.zeabur.app`
3. 登入
4. 測試刪除功能

**目的**: 排除瀏覽器快取干擾

---

### 方案 3: 檢查資料庫 User Role 🔍

**可能原因**: 你的帳號 role 不是 SUPER_ADMIN

**檢查 SQL**:
```sql
SELECT id, email, name, role, is_active
FROM users
WHERE email = '你的email';
```

**如果 role != 'SUPER_ADMIN'，執行**:
```sql
UPDATE users
SET role = 'SUPER_ADMIN'
WHERE email = '你的email';
```

**重要**: 更新後必須**清除 cookies 並重新登入**（方案 1）

---

### 方案 4: 暫時移除角色檢查（僅診斷用）⚠️

**修改檔案**: `webapp/src/app/api/sales/[id]/route.ts`

**Line 265-267**:
```typescript
// 暫時註解掉進行測試
// if (session.user.role !== 'SUPER_ADMIN') {
//   return NextResponse.json({ error: '權限不足' }, { status: 403 })
// }

// 加入 debug log
console.log('🔍 DEBUG - User role:', session.user.role, 'Email:', session.user.email)
```

**同樣修改**: `webapp/src/app/api/sales/[id]/admin-cancel/route.ts`

**執行**:
```bash
git add -A
git commit -m "debug: 暫時移除角色檢查 + 加入 debug log"
git push
```

**部署後檢查 Zeabur Runtime Logs**，搜尋 `🔍 DEBUG`

---

## 🎯 我的建議順序

1. **先試方案 1**（清除 cookies）- 最快
2. **再試方案 2**（無痕模式）- 確認是否快取問題
3. **如果仍失敗** → 方案 3（檢查資料庫）
4. **最後手段** → 方案 4（debug logs）

---

## 📝 預期結果

### 如果方案 1/2 成功
→ 問題是 **Session 損壞**，重新登入即可

### 如果方案 3 成功
→ 問題是 **User role 設定錯誤**

### 如果全部失敗
→ 需要看 debug logs 找出真正原因

---

**現在就試試方案 1 吧！** 🚀
