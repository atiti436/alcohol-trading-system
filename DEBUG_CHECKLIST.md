# 登入問題診斷清單

## 當前狀態
- ✅ NEXTAUTH_URL 已改為 https://
- ❌ 登入仍然轉圈無反應

---

## 🔍 立即檢查清單

### 1. 確認 Zeabur 已重新部署

**檢查項目**:
- Zeabur Dashboard → Deployments
- 確認最新部署時間是「剛才」（修改環境變數後）
- 確認 Status = Running（綠色）

**如果沒有重新部署**:
- 手動觸發重新部署
- 或等待自動部署完成（約 2-3 分鐘）

---

### 2. 檢查瀏覽器 Network 面板

**步驟**:
1. F12 開啟開發者工具
2. 切換到 **Network** 分頁
3. 勾選 **Preserve log**
4. 清除現有記錄
5. 再次嘗試登入
6. 查看失敗的請求

**關鍵請求**:
- `POST /api/auth/callback/credentials`
- `POST /api/auth/signin/credentials`
- `GET /api/auth/session`

**檢查項目**:
- Status Code（200? 403? 500? Pending?）
- Response（有錯誤訊息嗎？）
- Timing（Stalled? 超時?）

---

### 3. 檢查 Console 錯誤

**查看**:
- Console 分頁
- 是否有紅色錯誤訊息？
- 是否還有 `CORS blocked`？

---

### 4. 檢查 Zeabur Runtime Logs

**步驟**:
1. Zeabur Dashboard → webapp 服務
2. 點擊 **Logs** 或 **Runtime Logs**
3. 嘗試登入
4. 即時查看 logs

**搜尋關鍵字**:
- `CORS blocked`
- `Error`
- `Failed`
- `401`
- `403`
- `500`

---

## 🚨 可能的問題

### 問題 A: 部署未完成
**症狀**: 環境變數改了但沒生效
**解決**: 等待部署完成或手動觸發

### 問題 B: 資料庫連線失敗
**症狀**: 登入請求超時
**解決**: 檢查 DATABASE_URL 環境變數

### 問題 C: NextAuth 配置錯誤
**症狀**: 登入請求返回 500
**解決**: 檢查 NEXTAUTH_SECRET 是否存在

### 問題 D: Credentials Provider 錯誤
**症狀**: 帳號密碼驗證失敗
**解決**: 檢查資料庫中是否有該用戶

### 問題 E: Session 配置問題
**症狀**: 登入成功但沒有跳轉
**解決**: 檢查 NEXTAUTH_URL 是否正確

---

## 📋 回報格式

請提供以下資訊：

### Network 面板
```
請求: POST /api/auth/callback/credentials
Status: ???
Response: ???
Time: ???
```

### Console 錯誤
```
貼上完整錯誤訊息
```

### Zeabur Logs
```
貼上相關的 log 片段
```

---

## 🔧 緊急暫時方案

如果以上都無法解決，可以暫時修改 middleware 完全跳過 CORS 檢查：

```typescript
// webapp/src/middleware.ts
export function middleware(request: NextRequest) {
  // 暫時註解所有 CORS 檢查
  // const originHeader = request.headers.get('origin')
  // const allowedOrigins = resolveAllowedOrigins(request)

  // if (method === 'OPTIONS') {
  //   return handlePreflight(request, allowedOrigins)
  // }

  // 直接放行
  const response = NextResponse.next()
  addSecurityHeaders(response)
  return response
}
```

**⚠️ 警告**: 這會暫時關閉 CORS 保護，僅用於診斷！
