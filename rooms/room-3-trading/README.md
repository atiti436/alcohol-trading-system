# 🏠 Room-3: 交易核心開發室

## 👋 歡迎來到Room-3！

您負責開發**Purchase + Inventory模組**，這是系統的交易核心功能。

## 🎯 **您的任務範圍**

### **Purchase模組**
- 📋 採購單管理
- 🤖 AI報單辨識 (Google Gemini API)
- 🧮 進口成本計算 (稅金+檢驗耗損)
- 💰 成本分攤邏輯
- 📊 採購分析報表

### **Inventory模組**
- 📦 庫存管理
- 📈 庫存變動追蹤
- ⚠️ 低庫存警示
- 🔄 庫存盤點功能
- 📊 庫存分析報表

## 📚 **必讀文檔**
1. `../../shared/docs/TAX_CALCULATION.md` - **超重要！稅金計算邏輯**
2. `../../shared/docs/API_SPEC.md` - API規格
3. `../../DEMO.txt` - 原始計算邏輯參考

## ⚠️ **超級重要**
- 🧮 **稅金計算必須100%按照TAX_CALCULATION.md實作**
- 🤖 **AI辨識要用Google Gemini 2.5 Pro API**
- 📊 **成本計算影響後續獲利分析**
- 🔒 **採購資料要有權限控制**

## 🚀 **開發順序建議**
1. Purchase CRUD (不含AI)
2. 稅金計算引擎 (核心功能)
3. Inventory基本管理
4. AI報單辨識整合
5. 成本分攤邏輯
6. 報表功能

**這個房間的計算邏輯是整個系統的基石！** 🔥