# 🚨 給 Zeabur AI 的緊急故障排除指引

## 📊 當前狀況摘要

### ✅ 已確認正確的部分
1. **GitHub Repository**: 最新 commit `7d27684`
2. **Dockerfile 內容**: 已驗證正確（commit 3bd27bb 及之後）
3. **建置階段**: Builder stage 100% 成功
   - npm install ✅
   - Prisma generate ✅
   - 73 個頁面建置成功 ✅
   - postinstall 成功複製 shared ✅

### ❌ 問題症狀
**Runner stage 路徑錯誤 - Dockerfile 版本不匹配**

建置日誌顯示 Zeabur 使用了**舊版本的 Dockerfile**：
```dockerfile
# ❌ 日誌顯示（錯誤 - 舊版本）:
#7 [builder 3/7] COPY . .
#12 [runner 3/9] COPY --from=builder /app/webapp/node_modules ./webapp/node_modules
```

正確版本應該是：
```dockerfile
# ✅ 應該顯示（正確 - 最新版本）:
#7 [builder 3/7] COPY webapp .
#12 [runner 3/9] COPY --from=builder /app/webapp/node_modules ./node_modules
```

---

## 🔧 請 Zeabur AI 執行以下步驟

### 步驟 1: 清除建置快取 🧹
**原因**: Docker layer cache 導致使用舊版本 Dockerfile

**操作**:
1. 進入專案控制台
2. 找到 "Build Settings" 或 "Advanced Settings"
3. 點擊 "Clear Build Cache" 或類似選項
4. 確認清除成功

---

### 步驟 2: 驗證 Git 同步狀態 🔄
**原因**: 確保 Zeabur 拉取到最新的 commit

**操作**:
1. 檢查當前部署的 commit hash
2. 應該顯示: `7d27684` 或更新
3. 如果不是，點擊 "Redeploy" 或 "Sync with GitHub"
4. 確認 Dockerfile 內容：
   ```dockerfile
   # 第 6 行應該是：
   COPY webapp .
   
   # 第 23 行應該是：
   COPY --from=builder /app/webapp/node_modules ./node_modules
   ```

---

### 步驟 3: 檢查 Build Context 設定 📁
**原因**: Build context 可能設定錯誤

**操作**:
1. 進入 "Build Settings"
2. 檢查以下設定：
   - **Build Context Path**: 應該是 `.` 或留空（根目錄）
   - **Dockerfile Path**: 應該是 `./Dockerfile`
   - ❌ 如果設定成 `./webapp/Dockerfile` 就錯了
3. 如果設定錯誤，修改為正確值並重新部署

---

### 步驟 4: 手動觸發完全重建 🔨
**原因**: 強制從頭開始建置，忽略所有 cache

**操作**:
1. 停止當前部署（如果正在運行）
2. 刪除舊的 image（如果有選項）
3. 點擊 "Rebuild from Scratch" 或 "Clean Deploy"
4. 觀察建置日誌，確認：
   ```
   #7 [builder 3/7] COPY webapp .     ← 應該看到這個
   #12 [runner 3/9] COPY ... ./node_modules  ← 不應該有 ./webapp/
   ```

---

### 步驟 5: 檢查環境變數 🔐
**可選但建議**

確認以下環境變數已設定：
```bash
DATABASE_URL=postgresql://...
NODE_ENV=production
```

---

## 🎯 成功指標

建置成功後，日誌應該顯示：

```
✓ Generating static pages (73/73)
✓ Finalizing page optimization
✓ Build complete
✓ Starting server...
✓ Ready on port 3000
```

部署成功後可以訪問：
- 登入頁面: `/auth/signin`
- 儀表板: `/dashboard`

---

## 📝 正確的 Dockerfile 版本參考

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-slim AS builder
WORKDIR /app/webapp

# Copy webapp directory (which includes shared-src)
COPY webapp .

# Install dependencies - postinstall will copy shared-src to shared
RUN npm install

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build the application
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app/webapp
ENV NODE_ENV=production

# Copy all necessary files from builder stage (no subdirectory needed)
COPY --from=builder /app/webapp/node_modules ./node_modules
COPY --from=builder /app/webapp/.next ./.next
COPY --from=builder /app/webapp/public ./public
COPY --from=builder /app/webapp/prisma ./prisma
COPY --from=builder /app/webapp/shared ./shared
COPY --from=builder /app/webapp/package.json ./package.json
COPY --from=builder /app/webapp/package-lock.json ./package-lock.json

EXPOSE 3000
CMD ["npm", "run", "start"]
```

---

## 🆘 如果還是失敗

請提供以下資訊：
1. 完整建置日誌（特別是 #7 和 #12 步驟）
2. Build Settings 截圖
3. 當前使用的 commit hash
4. Build Context 設定值

---

**最後更新**: 2025-09-30 04:30 (commit: 7d27684)
**問題根源**: Docker build cache 使用舊版 Dockerfile
**解決方案**: 清除 cache + 驗證 Git 同步 + 檢查 build context

🤖 Generated with [Claude Code](https://claude.com/claude-code)
