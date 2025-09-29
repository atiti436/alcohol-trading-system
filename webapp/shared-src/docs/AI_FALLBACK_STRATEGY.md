# 🤖 AI功能降級策略 (AI Fallback Strategy)

## 🎯 目標
確保即使AI功能不穩定，核心業務仍能正常運作，避免系統依賴單點故障。

---

## 📊 AI功能風險評估

### **高風險AI功能**
1. **PDF報單辨識** - 準確率要求85%以上
2. **LINE Bot智慧回應** - 自然語言理解複雜
3. **商品名稱智慧對應** - 需要大量訓練資料

### **中風險AI功能**
1. **成本計算檢核** - 有明確計算公式可備援
2. **客戶搜尋建議** - 可降級為模糊搜尋

---

## 🔄 分階段實作策略

### **Phase 1: 核心功能優先 (無AI依賴)**
```
手動操作版本 → 確保業務可運行
├── 手動輸入報單資料
├── 人工計算成本
├── 傳統搜尋功能
└── 基本LINE Bot回應
```

### **Phase 2: AI輔助功能 (半自動)**
```
AI + 人工校驗 → 提升效率但保持準確性
├── AI辨識 + 人工確認
├── AI建議 + 人工選擇
├── 智慧搜尋 + 傳統搜尋備援
└── 簡單指令型LINE Bot
```

### **Phase 3: 全自動AI (目標版本)**
```
AI主導 + 異常偵測 → 最佳使用體驗
├── 自動辨識 + 例外處理
├── 智慧對話 + 語意理解
├── 預測建議 + 學習優化
└── 自然語言LINE Bot
```

---

## 🛡️ 具體降級方案

### **1. PDF報單辨識降級**

#### **方案A: AI辨識失敗時**
```typescript
async function processPDFDeclaration(file: File): Promise<DeclarationData> {
  try {
    // 嘗試AI辨識
    const aiResult = await geminiOCR(file);

    if (aiResult.confidence > 0.85) {
      return {
        ...aiResult.data,
        source: 'AI_AUTO',
        needsReview: false
      };
    } else {
      // 信心度不足，降級為人工輸入
      return {
        source: 'MANUAL_REQUIRED',
        needsReview: true,
        aiSuggestions: aiResult.data // AI建議供參考
      };
    }
  } catch (error) {
    // AI完全失敗，提供手動輸入介面
    return {
      source: 'MANUAL_FALLBACK',
      needsReview: true,
      error: 'AI服務暫時不可用，請手動輸入'
    };
  }
}
```

#### **手動輸入介面**
```typescript
// components/ManualDeclarationForm.tsx
const ManualDeclarationForm = ({ aiSuggestions }: Props) => {
  return (
    <Card title="報單資料輸入" extra={
      <Alert
        message="AI辨識失敗，請手動輸入"
        type="warning"
        showIcon
      />
    }>
      {aiSuggestions && (
        <Alert
          message="AI建議參考"
          description={<pre>{JSON.stringify(aiSuggestions, null, 2)}</pre>}
          type="info"
          closable
        />
      )}

      <Form>
        <Form.Item name="productName" label="商品名稱">
          <Input placeholder="請輸入商品名稱" />
        </Form.Item>
        <Form.Item name="quantity" label="數量">
          <InputNumber placeholder="請輸入數量" />
        </Form.Item>
        {/* 完整的26個欄位 */}
      </Form>
    </Card>
  );
};
```

### **2. LINE Bot降級策略**

#### **智慧對話降級為指令式**
```typescript
// services/lineBotFallback.ts
class LineBotFallbackHandler {
  async handleMessage(text: string): Promise<string> {
    try {
      // 嘗試AI理解
      const aiResponse = await geminiNaturalLanguage(text);
      return aiResponse;
    } catch (error) {
      // 降級為關鍵字匹配
      return this.keywordBasedResponse(text);
    }
  }

  private keywordBasedResponse(text: string): string {
    const keywords = [
      { words: ['成本', '計算', '價格'], response: '請使用格式：商品名稱 容量ml 酒精度度 日幣價格 匯率' },
      { words: ['訂單', '查詢'], response: '請使用：查詢訂單 [客戶名稱]' },
      { words: ['庫存'], response: '請使用：查詢庫存 [商品名稱]' },
      { words: ['幫助', 'help'], response: this.getHelpMessage() }
    ];

    for (const keyword of keywords) {
      if (keyword.words.some(word => text.includes(word))) {
        return keyword.response;
      }
    }

    return '抱歉，無法理解您的指令。請輸入「幫助」查看可用指令。';
  }

  private getHelpMessage(): string {
    return `
📱 可用指令：

💰 成本計算：
格式：商品名稱 容量ml 酒精度度 日幣價格 匯率
例如：白鶴清酒 720ml 15度 日幣800 匯率0.21

📋 訂單查詢：
格式：查詢訂單 客戶名稱

📦 庫存查詢：
格式：查詢庫存 商品名稱

❓ 其他指令：
- 幫助：顯示此說明
    `;
  }
}
```

### **3. 搜尋功能降級**

#### **智慧搜尋→模糊搜尋→精確搜尋**
```typescript
async function searchProducts(query: string): Promise<Product[]> {
  try {
    // Level 1: AI語意搜尋
    const aiResults = await aiSemanticSearch(query);
    if (aiResults.length > 0) {
      return aiResults;
    }
  } catch (error) {
    console.warn('AI搜尋失敗，降級為模糊搜尋');
  }

  try {
    // Level 2: 模糊搜尋
    const fuzzyResults = await fuzzySearch(query);
    if (fuzzyResults.length > 0) {
      return fuzzyResults;
    }
  } catch (error) {
    console.warn('模糊搜尋失敗，降級為精確搜尋');
  }

  // Level 3: 精確搜尋
  return await exactSearch(query);
}
```

---

## 🚨 監控與預警

### **AI服務健康監控**
```typescript
// lib/aiHealthMonitor.ts
class AIHealthMonitor {
  private healthChecks = {
    gemini: false,
    lineBot: false,
    ocrService: false
  };

  async checkAIServices(): Promise<AIHealthStatus> {
    const results = await Promise.allSettled([
      this.checkGeminiAPI(),
      this.checkLineBotAPI(),
      this.checkOCRService()
    ]);

    this.healthChecks.gemini = results[0].status === 'fulfilled';
    this.healthChecks.lineBot = results[1].status === 'fulfilled';
    this.healthChecks.ocrService = results[2].status === 'fulfilled';

    return {
      overall: Object.values(this.healthChecks).every(Boolean),
      services: this.healthChecks,
      failedServices: this.getFailedServices()
    };
  }

  getRecommendedFallback(): string {
    const failed = this.getFailedServices();

    if (failed.includes('gemini')) {
      return '建議暫時使用手動輸入模式，AI服務恢復後將自動切換';
    }

    return '部分AI功能異常，系統已自動切換為備用模式';
  }
}
```

---

## 🎯 使用者體驗優化

### **漸進式降級提示**
```typescript
// components/AIFallbackNotice.tsx
const AIFallbackNotice = ({ fallbackType }: Props) => {
  const messages = {
    'pdf-ocr': {
      icon: '📄',
      title: 'PDF辨識使用手動模式',
      description: '為確保資料準確性，請手動輸入報單資料',
      action: '開始手動輸入'
    },
    'line-bot': {
      icon: '🤖',
      title: 'LINE Bot使用基本模式',
      description: '請使用標準指令格式與Bot互動',
      action: '查看指令說明'
    }
  };

  const config = messages[fallbackType];

  return (
    <Alert
      message={`${config.icon} ${config.title}`}
      description={config.description}
      type="info"
      showIcon
      action={
        <Button size="small" type="primary">
          {config.action}
        </Button>
      }
    />
  );
};
```

---

## 📋 實作優先順序

### **MVP版本 (Phase 1)**
- [ ] 完整的手動操作介面
- [ ] 基本的成本計算功能
- [ ] 簡單的搜尋功能
- [ ] 指令式LINE Bot

### **增強版本 (Phase 2)**
- [ ] AI輔助+人工確認
- [ ] 智慧搜尋+傳統備援
- [ ] 半自動化報單處理
- [ ] 關鍵字LINE Bot

### **完整版本 (Phase 3)**
- [ ] 全自動AI功能
- [ ] 自然語言處理
- [ ] 智慧預測建議
- [ ] 機器學習優化

---

**確保每個階段都是完整可用的系統，而不是半成品！**