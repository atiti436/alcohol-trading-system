# 🚀 CLAUDE2 快速啟動指南

## ⚡ 30秒快速啟動

```bash
cd D:\claude-project\alcohol-trading-system\webapp

# 1. 清理快取
rmdir /s /q .next

# 2. 重啟開發伺服器
npm run dev

# 3. 測試搜尋功能（瀏覽器 http://localhost:3000）
```

---

## 🎯 當前狀況（一句話）

**源碼已修正但 `.next` 編譯快取未更新，需要重新編譯**

---

## 📁 關鍵檔案

1. **已修正檔案：** `src/app/api/products/search/route.ts`
   - Line 32: `let searchTerms: string[] = []`
   - Line 36: `searchTerms = query.trim()...` (無 const)

2. **問題檔案（舊快取）：** `.next/server/app/api/products/search/route.js`
   - 編譯檔案仍是舊版本
   - 刪除 `.next` 後會重新生成

---

## ✅ 測試標準

進入報價單頁面，測試商品搜尋：
1. 點擊搜尋框 → 顯示所有商品
2. 輸入 "山" → 找到 "山崎18年"
3. 輸入 "P0001" → 找到對應商品
4. F12 Console 無 500 錯誤

---

## 📖 完整資訊

詳見：`HANDOVER_PLAN.md`

---

**Last Commit:** 037944a (已推送)
**開始時間：** 立即執行
