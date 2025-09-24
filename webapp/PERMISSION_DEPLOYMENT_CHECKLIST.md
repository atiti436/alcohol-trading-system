# 🔐 權限系統部署檢查清單

**執行時機**: 每次修改權限相關功能後
**負責人**: PM/開發者
**執行順序**: 按照此清單逐項檢查

---

## 📋 **執行前準備**

### ✅ 環境檢查
- [ ] 確認在正確的專案目錄：`G:\CLAUDE專案\alcohol-trading-system\webapp`
- [ ] 確認已安裝所有依賴：`npm ci`
- [ ] 確認資料庫連線正常

---

## 🔧 **CODEX建議的自動化檢查**

### 1️⃣ **Prisma Schema 一致性**
```bash
# 執行順序很重要！
npx prisma generate
npx prisma db push
```
**檢查項目**:
- [ ] Schema 生成無錯誤
- [ ] 資料庫同步成功
- [ ] PENDING 角色已加入 enum

### 2️⃣ **TypeScript 編譯檢查**
```bash
npx tsc --noEmit
```
**檢查項目**:
- [ ] 無 TypeScript 編譯錯誤
- [ ] Role.PENDING 類型正確識別
- [ ] 所有權限相關類型一致

### 3️⃣ **專案建置檢查**
```bash
npm run build
```
**檢查項目**:
- [ ] 建置成功無錯誤
- [ ] 無 Warning 關於權限相關代碼
- [ ] 權限中間件正確載入

---

## 🛡️ **權限系統完整性檢查**

### 🔐 **核心權限機制**
- [ ] **管理員MAIL設定**: `manpan.whisky@gmail.com` 自動獲得 SUPER_ADMIN
- [ ] **新用戶預設**: 其他用戶自動設為 PENDING 狀態
- [ ] **權限升級API**: 只有 SUPER_ADMIN 可以升級其他用戶
- [ ] **自我保護**: 管理員不能降低自己的權限

### 🚫 **PENDING用戶阻擋機制**
- [ ] **Dashboard**: PENDING 用戶看到待審核畫面
- [ ] **導航選單**: PENDING 用戶只能存取 Dashboard
- [ ] **Products API**: 阻擋 PENDING 用戶存取商品資料
- [ ] **Reports API**: 阻擋 PENDING 用戶存取報表資料
- [ ] **Accounting API**: 阻擋 PENDING 用戶存取會計資料
- [ ] **Sales API**: 使用 `withAppActiveUser` 中間件阻擋 PENDING 用戶

### 🔒 **投資方資料隔離**
- [ ] **雙重價格機制**: 投資方看不到 `actual_amount` 和 `commission`
- [ ] **資金來源過濾**: 投資方只能看到 `COMPANY` 資金的資料
- [ ] **敏感欄位隱藏**: `data-filter.ts` 正確過濾敏感資料

---

## 🧪 **功能測試檢查**

### 👤 **用戶角色測試**
- [ ] **管理員測試**: 登入 `manpan.whisky@gmail.com` 確認為 SUPER_ADMIN
- [ ] **新用戶測試**: 用其他Gmail登入確認為 PENDING
- [ ] **權限升級測試**: 管理員可以在 `/users` 頁面升級其他用戶
- [ ] **待審核畫面**: PENDING 用戶看到正確的等待畫面

### 🔒 **API權限測試**
- [ ] **PENDING用戶API測試**:
  - 存取 `/api/products` 應該回傳 403
  - 存取 `/api/reports` 應該回傳 403
  - 存取 `/api/accounting/entries` 應該回傳 403
- [ ] **投資方API測試**:
  - 存取 `/api/sales` 看不到 `actual_amount`
  - 只能看到 `COMPANY` 資金的銷售資料

### 🖥️ **前端權限測試**
- [ ] **選單隱藏**: 不同角色看到對應的選單項目
- [ ] **頁面存取**: PENDING 用戶無法直接訪問受保護頁面
- [ ] **用戶管理頁面**: 只有管理員能看到 `/users` 頁面

---

## 📊 **部署後驗證**

### 🔍 **安全檢查**
- [ ] **SQL注入測試**: 所有API輸入都有適當驗證
- [ ] **權限繞過測試**: 無法通過直接API調用繞過權限
- [ ] **敏感資料洩漏**: 投資方完全看不到真實價格

### 📈 **效能檢查**
- [ ] **權限檢查效能**: 中間件不影響API響應速度
- [ ] **資料庫查詢**: 權限過濾不造成N+1查詢問題
- [ ] **前端載入**: 權限相關組件載入正常

---

## 🚀 **部署流程**

### 📝 **Git提交檢查清單**
```bash
# 1. 檢查異動檔案
git status

# 2. 確認修改內容
git diff

# 3. 執行自動化檢查
node scripts/check-permissions.js

# 4. 提交變更
git add .
git commit -m "🔐 完善權限管理系統 - 新增待審核機制

- 新增 PENDING 角色支持待審核機制
- 設定 manpan.whisky@gmail.com 為預設管理員
- 強化API權限檢查，阻擋待審核用戶
- 完善用戶管理界面和權限升級功能
- 確保投資方資料隔離機制完整

🤖 Generated with Claude Code"

# 5. 推送到遠端
git push
```

### 🎯 **部署後立即檢查**
1. **登入測試**:
   - 用管理員帳號登入確認功能正常
   - 用測試帳號登入確認PENDING狀態
2. **功能測試**:
   - 檢查用戶管理頁面
   - 測試權限升級功能
   - 驗證API權限保護
3. **資料檢查**:
   - 確認現有用戶資料正常
   - 檢查資料庫schema更新成功

---

## 🆘 **緊急回滾計劃**

如果部署後發現問題：

1. **立即回滾**:
   ```bash
   git revert HEAD
   git push
   ```

2. **緊急修復**:
   - 暫時在 `nextauth.ts` 中將預設角色改回 `SUPER_ADMIN`
   - 重新部署讓所有用戶都能正常使用

3. **問題診斷**:
   - 檢查伺服器日誌
   - 確認資料庫schema狀態
   - 驗證權限中間件運作

---

## ✅ **完成確認**

部署成功後，最終確認：

- [ ] 所有自動化檢查通過
- [ ] 權限系統運作正常
- [ ] 用戶可以正常登入使用
- [ ] 投資方資料隔離有效
- [ ] PENDING用戶被適當限制
- [ ] 管理員可以管理用戶權限

**簽核**: PM/開發者 ___________
**日期**: ___________
**備註**: ___________