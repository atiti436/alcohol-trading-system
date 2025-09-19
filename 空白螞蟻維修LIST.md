# 🐜 空白螞蟻維修LIST - 緊急上下文救援指南

## 📋 **當前狀況 (2025-09-20)**

### **🚨 核心問題：ZEABUR部署失敗 - 混合命名標準導致TypeScript編譯錯誤**

**問題性質：** 架構設計缺陷，非平台問題
- **新標準模型** (Customer, Product) → snake_case
- **舊標準模型** (Sale, SaleItem, AccountingEntry, AccountsReceivable) → camelCase
- **混合使用** 導致開發者混淆，API檔案命名錯誤頻發

### **🔄 修復歷程 (已修復10+次)**

| 修復次數 | 錯誤類型 | 檔案 | 狀態 |
|---------|---------|------|------|
| 1-5 | Ant Design Icons | 各組件檔案 | ✅ 已修復 |
| 6-7 | SaleItem欄位 | test-data.ts | ✅ 已修復 |
| 8 | Sale模型欄位 | test-data.ts, API | ✅ 已修復 |
| 9 | AccountingEntry | accounting/entries/route.ts | ✅ 已修復 |
| 10 | AccountsReceivable | accounts-receivable/[id]/payments/route.ts | ✅ 已修復 |
| ? | **下一個錯誤？** | **未知檔案** | ⏳ 等待ZEABUR回報 |

### **📊 當前Git狀態**
- **最新提交**: `f7f8be1` - AccountsReceivable修復
- **分支**: main
- **工作區**: 乾淨
- **檢查工具狀態**: ✅ 通過 (但可能有漏洞)

---

## 🎯 **空白螞蟻接手指南**

### **⚡ 緊急情況：如果ZEABUR又報錯**

1. **立即讀取這些檔案**:
   ```bash
   - 20250920_反省.md (錯誤教訓)
   - 防止螞蟻出錯指南.md (預防機制)
   - DATA_MODELS.md (命名規範)
   - 這個檔案 (空白螞蟻維修LIST.md)
   ```

2. **錯誤分析模式**:
   ```bash
   # 如果錯誤是: "...does not exist in type...Did you mean 'camelCase'?"
   # 確認模型類型:
   grep -A 20 "model 模型名稱" prisma/schema.prisma

   # 舊標準模型: 使用 camelCase
   # 新標準模型: 使用 snake_case
   ```

3. **修復前必做**:
   ```bash
   # 不要相信檢查工具！直接修復TypeScript錯誤
   # 修復後執行: npm run check:fields
   # 必須顯示: ✅ 所有欄位命名都符合規範
   ```

### **🧠 核心原則 (血淚教訓)**

| ❌ **絕對禁止** | ✅ **正確做法** |
|----------------|----------------|
| 說"應該沒問題了" | 說"已修復TypeScript錯誤" |
| 相信檢查工具100% | 優先修復編譯錯誤 |
| 只修復單一檔案 | 考慮相關檔案一起修復 |
| 忽略ZEABUR錯誤詳情 | 仔細讀錯誤訊息找準確位置 |

### **🔍 高風險檔案清單 (可能還有錯誤)**

基於模式分析，這些檔案可能還有命名錯誤：

**API檔案 (使用舊標準模型的)**:
```bash
src/app/api/sales/ 系列檔案 (Sale, SaleItem)
src/app/api/purchases/ 系列檔案 (可能有PurchaseItem)
src/app/api/accounts-receivable/ 其他檔案 (AccountsReceivable)
src/app/api/accounting/ 其他檔案 (AccountingEntry, JournalEntry)
```

**Seeds檔案**:
```bash
prisma/seeds/ 中可能還有其他seed檔案
```

**Types檔案**:
```bash
src/types/ 系列檔案中的介面定義
```

---

## 🔧 **檢查工具狀態**

### **當前工具版本**: webapp/scripts/check-field-naming.js
**支援的舊標準模型**:
- Sale, SaleItem, AccountsReceivable, AccountingEntry, JournalEntry, AuditLog, PurchaseItem

**已知問題**:
- 可能遺漏某些邊界情況
- TypeScript編譯器比工具更準確
- **不要100%依賴工具結果**

### **工具使用**:
```bash
cd webapp
npm run check:fields  # 檢查命名一致性
```

---

## 💡 **最佳策略：主動掃描一次性修復**

### **立即行動方案** (推薦):
1. **主動掃描所有API檔案** - 找出可能的命名錯誤
2. **批量修復** - 一次提交解決多個問題
3. **減少部署次數** - 省TOKEN，提高成功率

**具體執行**:
```bash
# 掃描所有高風險檔案
find src/app/api -name "*.ts" -exec grep -l "snake_case_in_camelCase_context" {} \;

# 批量修復所有發現的問題
# 一次commit，一次部署
```

### **中期策略：改進房間策略**

**Option A: 超級螞蟻模式**
- 一個Claude負責**多個相關房間**
- 例如：Room2+Room3+Room4 (都是sales相關)
- 保持context完整性

**Option B: 知識傳承模式**
- 每次handover包含**完整的錯誤教訓**
- 不只是代碼，還有"這個螞蟻做錯了什麼"
- 新螞蟻必須先讀前螞蟻的失敗報告

### **長期策略：技術債務清理**

當TOKEN充足時：
- 統一命名標準重構
- 建立真正可靠的檢查機制

### **TOKEN節省策略**

**如果TOKEN不足**:
1. **優先修復當前錯誤** - 不要主動掃描
2. **批量提交** - 一次修復多個相關問題
3. **簡化commit訊息** - 節省token
4. **專注核心** - 只修復必要的編譯錯誤

---

## 📝 **下個螞蟻的TODO**

### **立即任務**:
- [ ] 檢查ZEABUR最新錯誤訊息
- [ ] 根據錯誤訊息找到問題檔案和行號
- [ ] 確認模型類型 (新標準 vs 舊標準)
- [ ] 修復命名錯誤
- [ ] 提交並等待結果
- [ ] **更新這個檔案記錄修復狀況**

### **長期任務** (如果TOKEN充足):
- [ ] 主動掃描所有API檔案
- [ ] 統一命名標準重構規劃
- [ ] 改進檢查工具
- [ ] 建立pre-commit hooks

---

## 🆘 **緊急聯絡資訊**

**如果卡住了**:
1. 讀 `20250920_反省.md` - 詳細錯誤分析
2. 檢查 `防止螞蟻出錯指南.md` - 預防措施
3. 參考 `DATA_MODELS.md` - 官方命名規範

**記住**: 用戶買的是PRO ($20)，TOKEN有限，請高效使用！

---

**最後更新**: 2025-09-20 17:45 by Claude (AccountsReceivable修復後)
**下次更新**: 請下個螞蟻更新修復狀況