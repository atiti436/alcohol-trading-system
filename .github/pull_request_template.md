## 🎯 問題解決

- 解決老闆反應的變體選擇困擾
- 從「P00001-A」不知道是什麼 → 清楚顯示「普通版 | 庫存: 10瓶 | NT$ 21,000」

## 📝 主要變更

- 銷售/採購/庫存三處變體選擇 UX 大幅改善（清楚顯示版本名稱、編號、庫存、狀況、價格）
- 新增測試端點與示例資料 `/api/test/create-variants`（已限制僅開發環境可用）
- 型別補齊：`ProductVariant` 增加 `available_stock`、`reserved_stock`
- 文檔同步（如適用）

## 🧪 測試步驟

1) 啟動本機：`cd webapp && npm run dev`
2) 建立測試變體：`curl -X POST http://localhost:3000/api/test/create-variants`
3) 銷售頁新增訂單（SaleOrderModal）：選商品 → 必選變體，下拉顯示「版本名稱 | 版本編號 | 庫存 | 狀況 | 價格」
4) 採購與庫存頁面變體下拉顯示一致
5) 可對照 `G:\CLAUDE專案\variant-demo.html` 效果

## ✅ Reviewer Checklist

- [ ] 三頁面（銷售/採購/庫存）變體下拉顯示一致，資訊完整
- [ ] 顯示包含：版本名稱、版本編號、庫存、狀況、價格
- [ ] 無殘留 `importTax`，稅務鍵名一致（使用 `importDuty`）
- [ ] DB 欄位 `snake_case`，程式變數 `camelCase` 一致性
- [ ] 僅在開發環境才能呼叫 `/api/test/create-variants`
- [ ] `next build`/`tsc` 通過（CI 綠燈）

## 🏷️ 建議標籤

- enhancement
- ui/ux
- ready-for-review

## 🚀 合併後行動

- 移除或保護測試端點（已預設僅 dev 可用；如進一步需要，轉為 seed 腳本）
- 確認生產環境變體顯示正常
- 建立實際商品變體進行驗收

