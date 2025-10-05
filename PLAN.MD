# 酒類交易 ERP 系統 - 主計劃文檔

**最後更新**: 2025-10-05 (Issue #1 完全收尾)
**專案狀態**: 核心功能完成 ✅，進入優化階段

---

## 📋 專案概覽

這是一個專為酒類貿易設計的 ERP 系統，支援預購訂單、多倉庫庫存管理、客戶分級、以及完整的進銷存流程。

### 核心功能模組

- **🛒 預購系統**: 未到貨商品預訂、智能分配、缺貨追蹤
- **📦 庫存管理**: 多倉庫支援（公司倉/個人倉）、毀損處理、FIFO 庫存策略
- **👥 客戶管理**: 三級分層（VIP/一般/新客戶）、客戶統計分析
- **💰 銷售管理**: 一般銷售、預購訂單、部分滿足、缺貨補單
- **📈 採購管理**: 供應商管理、進貨收貨、毀損調撥、自動補貨

### 技術架構

- **Frontend**: Next.js 14 (App Router) + React + TypeScript + Ant Design
- **Backend**: Next.js API Routes + Prisma ORM
- **Database**: PostgreSQL (Vercel Postgres)
- **Deployment**: Zeabur (自動部署)
- **CI/CD**: GitHub Actions

---

## 📊 當前狀態

### 最近完成項目 (2025-10-04)

✅ **Issue #1: 雙庫存系統統一** (100%)
- 統一使用 Inventory 表管理庫存，停止維護 ProductVariant.stock_quantity
- 修復 4 個核心 API (Dashboard, Products, Inventory)
- 新增 inventory-helpers.ts 工具函數
- 保留舊欄位以維持向後兼容

✅ **預購系統完整實施** (85% 後端核心完成)
- Phase 1-5: 基礎預購、統計彙總、批次轉換、毀損處理、缺貨追蹤 (100%)
- Phase 7: 自動化和優化 (100%)
- Phase 6: 通知系統 (待開發)
- Phase 8: 測試文檔 (已完成)

### 系統健康度

| 檢查項目 | 狀態 | 修復進度 |
|---------|------|----------|
| UI-API連接 | ✅ 良好 | 3/3 |
| ERP業務邏輯 | 🟢 改善中 | 2/4 |
| 多餘程式碼 | ✅ 良好 | 3/3 |
| Schema一致性 | ✅ 完美 | 2/2 |

**總體進度**: 12/13 問題已修復 (92%)

---

## 🎯 近期任務規劃

### 優先級 P0 (核心功能)

- [x] **Issue #1 遺留**: 邊緣 API 修復 ✅ (2025-10-05 完成)
  - ✅ `webapp/src/app/api/sales/[id]/ship/route.ts` (已修復)
  - ❌ `deliver/delivery-schedule` API 不存在（原 PLAN 誤記）

- [x] **預購系統 UI 整合** ✅ (Phase 4-5 的前端部分)
  - ✅ AllocationModal 整合到收貨流程 (已完成)
  - ✅ 缺貨管理頁面 (`/sales/backorders`) (已完成)

### 優先級 P1 (重要功能)

- [ ] **通知系統** (Phase 6)
  - LINE Notify / Email 到貨通知
  - 部分滿足通知 (含缺貨說明)
  - 補貨完成通知

- [ ] **安全加固** (SECURITY_CHECKLIST.md)
  - 實施 CSRF 保護
  - API Rate Limiting
  - 敏感資料加密

### 優先級 P2 (優化項目)

- [ ] **效能優化** (PERFORMANCE_OPTIMIZATION.md)
  - Dashboard 查詢優化 (Raw SQL)
  - 產品列表分頁優化
  - Redis 快取層

---

## 📂 文檔索引

本專案採用**主計劃+附錄文檔**結構，詳細資訊請參考以下文檔：

### 核心文檔

1. **[HEALTH_CHECK_REPORT.md](./HEALTH_CHECK_REPORT.md)**
   - 系統健康檢查報告
   - 已知問題清單與修復記錄
   - 資料庫 Schema 一致性檢查

2. **[SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)**
   - 安全漏洞檢查清單
   - 修復建議與優先級
   - CSRF、XSS、注入攻擊防護

3. **[PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md)**
   - 效能瓶頸分析
   - 優化建議（查詢、快取、分頁）
   - 實施計劃與預期收益

4. **[COMPLETION_REPORT.md](./COMPLETION_REPORT.md)**
   - Issue #1 完成報告
   - 修復內容與影響分析
   - 後續建議與維護指南

### 歷史備份文檔

- **PLAN.MD.backup-20251003**: 預購系統詳細設計文檔（原 v2.0）
  - 完整的 Phase 1-8 實施計劃
  - 業務流程設計（毀損處理、智能分配）
  - API 設計、數據庫 Schema、UI 設計
  - 測試計劃、部署清單、使用手冊

---

## 🔧 關鍵技術決策

### 1. 雙庫存系統統一 (Issue #1)

**問題**: ProductVariant 和 Inventory 表同時管理庫存，數據不一致

**解決方案**:
- ✅ **Phase 1 (已完成)**: 停止寫入 ProductVariant.stock_quantity
- ✅ **Phase 2 (已完成)**: 所有讀取改為從 Inventory 表計算
- 🔄 **Phase 3 (未來)**: 考慮移除 ProductVariant 庫存欄位

**影響範圍**: 4 個核心 API + 1 個前端組件

### 2. 多倉庫架構

**設計**:
- **COMPANY 倉**: 投資方商品（預購、一般銷售）
- **PRIVATE 倉**: 個人調貨（調撥、私人庫存）

**實現**:
```typescript
// 投資者只能看 COMPANY 倉
const warehouseFilter = userRole === 'INVESTOR'
  ? { warehouse: 'COMPANY' }
  : undefined
```

### 3. FIFO 庫存策略

**實施位置**:
- 銷售確認: 按 `created_at ASC` 預留庫存
- 取消訂單: 按 `created_at DESC` 回滾預留
- 進貨收貨: 優先補足最早的缺貨記錄

---

## 🚀 快速開始

### 開發環境設定

```bash
# 1. 安裝依賴
cd webapp
npm install

# 2. 設定環境變數 (.env)
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# 3. 同步資料庫
npx prisma db push

# 4. 啟動開發伺服器
npm run dev
```

### 常用指令

```bash
# 資料庫管理
npx prisma studio          # 開啟資料庫 GUI
npx prisma migrate dev     # 建立 migration
npx prisma db push         # 快速同步 schema

# 程式碼品質
npm run lint               # ESLint 檢查
npm run type-check         # TypeScript 檢查
npm run build              # 生產環境建置
```

---

## 📞 支援與貢獻

### 團隊協作

- **開發模式**: Pair Programming with AI (Claude Code)
- **版本控制**: Git + GitHub
- **部署平台**: Zeabur (自動部署)
- **CI/CD**: GitHub Actions

### 問題回報

遇到問題請參考：
1. [HEALTH_CHECK_REPORT.md](./HEALTH_CHECK_REPORT.md) - 已知問題清單
2. GitHub Issues - 提交新問題
3. 聯繫專案維護者

---

## 📝 版本歷史

| 版本 | 日期 | 重要更新 |
|------|------|----------|
| v3.0 | 2025-10-05 | 文檔整合，採用主計劃+附錄結構 |
| v2.0 | 2025-10-03 | 預購系統完整實施計劃 |
| v1.0 | 2025-09-01 | 初版 ERP 系統 (基礎進銷存) |

---

**文檔版本**: v3.0 (主計劃文檔)
**備份位置**: PLAN.MD.backup-20251003 (v2.0 預購系統詳細設計)
