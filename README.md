# 🍶 酒類進口貿易管理系統

## 📋 專案概述
現代化酒類進口貿易管理系統，支援雙重價格機制、AI報單辨識、LINE BOT整合。

## 🏗️ 系統架構
- **前端**: Next.js 14 + React + TypeScript + Ant Design
- **後端**: Next.js API Routes + Prisma ORM
- **資料庫**: PostgreSQL
- **認證**: NextAuth.js (Google登入)
- **AI整合**: Google Gemini API
- **BOT整合**: LINE Messaging API

## 👥 團隊協作模式
採用**多房間Claude協作**開發模式：
- 每個模組由獨立Claude開發
- 驗收Claude負責整合與品質控制
- 標準化介面確保模組間無縫整合

## 📁 專案結構
```
alcohol-trading-system/
├── 📋 docs/                    # 專案文件
├── 🏠 rooms/                   # Claude房間工作區
├── 🧪 acceptance/              # 驗收測試區
├── 📦 shared/                  # 共用資源
└── 🚀 src/                     # 原始碼
```

## 🚀 快速開始
1. 閱讀 `docs/OVERVIEW.md` 了解系統需求
2. 根據角色選擇對應房間：
   - 開發Claude → 選擇 `rooms/` 中的房間
   - 驗收Claude → 前往 `acceptance/`
3. 按照房間內的 `README.md` 開始工作

## ⚠️ 重要提醒
- **數據隔離**: 投資方永遠看不到真實銷售價格和個人調貨資料
- **模組化**: 每個模組必須獨立運作，依賴關係明確
- **文件先行**: 所有功能必須有對應的工作包和驗收標準

## 📞 聯絡資訊
- 產品負責人: 小白慣老闆 (酒類進口專家)
- 技術架構: Claude Code Team
- 專案類型: 企業級進銷存管理系統