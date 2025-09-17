# 🚨 待開發的UI組件設計

## 📋 **UI開發狀況總覽**

### ✅ **已設計完成**
- ✅ 進貨單草稿編輯主界面 (26個完整欄位)
- ✅ 商品清單表格 (包含ALC、ML、重量等)
- ✅ 抽檢損耗設定區塊
- ✅ 額外費用分攤區塊
- ✅ 基本操作按鈕
- ✅ **首頁Dashboard界面** → 完整設計在 `BOSS_UI_REQUIREMENTS.md` 和 `DASHBOARD_HOME_UI.md`
- ✅ **角色UI差異設計** → 完整設計在 `ROLE_UI_SPEC.md`
- ✅ **基本商品管理界面** → 完整設計在 `UI_DESIGN_SPEC.md`

---

## ❌ **仍需開發的重要UI組件**

### **1. 📤 PDF報單上傳界面**
```tsx
// 需要開發：PDF報單上傳和預覽組件
<Card title="📤 上傳PDF報單">
  <Upload.Dragger
    name="reportFile"
    accept=".pdf"
    beforeUpload={validatePDFFile}
    customRequest={uploadToStorage}
  >
    <p className="ant-upload-drag-icon">
      <InboxOutlined />
    </p>
    <p className="ant-upload-text">點擊或拖拽PDF報單到此處</p>
    <p className="ant-upload-hint">支援單個PDF文件，最大10MB</p>
  </Upload.Dragger>

  {/* PDF預覽窗口 */}
  <div className="pdf-preview">
    <iframe src={pdfUrl} width="100%" height="600px" />
  </div>
</Card>
```

### **2. ⏳ AI辨識進度界面**
```tsx
// 缺少：辨識進度和狀態顯示
<Modal title="🤖 AI辨識中" open={recognizing}>
  <div className="recognition-progress">
    <Steps current={currentStep}>
      <Step title="檔案上傳" description="上傳PDF到雲端" />
      <Step title="AI分析" description="Gemini 2.5 Pro辨識中" />
      <Step title="資料擷取" description="解析商品資訊" />
      <Step title="稅金計算" description="自動計算稅金" />
    </Steps>

    <div className="progress-details">
      <Progress percent={progressPercent} />
      <p>{currentMessage}</p>
    </div>

    <Alert
      type="info"
      message="辨識中"
      description="AI正在分析PDF內容，請耐心等待..."
      showIcon
    />
  </div>
</Modal>
```

### **3. 🆕 新商品建立Modal**
```tsx
// 需要開發：建立新商品的詳細表單 (基礎設計已在UI_DESIGN_SPEC.md中)
<Modal title="🍷 建立新商品" open={showCreateProduct} width={800}>
  <Form layout="vertical">
    {/* 基本商品資訊表單 */}
    {/* 詳細設計參考 UI_DESIGN_SPEC.md */}
  </Form>
</Modal>
```

### **4. ✅ 最終確認對話框**
```tsx
// 缺少：進貨確認前的最終檢查
<Modal
  title="🔍 進貨確認"
  open={showConfirm}
  width={1000}
>
  <div className="confirm-summary">
    <Alert
      type="warning"
      message="請仔細核對以下資訊"
      description="確認無誤後將正式建立進貨單，無法復原"
    />

    <Descriptions title="報單資訊" bordered>
      <Descriptions.Item label="報單號碼">{data.declarationNumber}</Descriptions.Item>
      <Descriptions.Item label="報關日期">{data.declarationDate}</Descriptions.Item>
      <Descriptions.Item label="商品總數">{data.items.length}項</Descriptions.Item>
    </Descriptions>

    <Table
      title={() => '商品明細確認'}
      dataSource={data.items}
      size="small"
      pagination={false}
      columns={[
        { title: '品名', dataIndex: 'mappedName' },
        { title: '數量', dataIndex: 'quantity' },
        { title: '單價', dataIndex: 'unitPrice' },
        { title: '損耗', dataIndex: 'lossInfo' },
        { title: '最終成本', dataIndex: 'finalCost' }
      ]}
    />
  </div>
</Modal>
```

### **5. 📚 草稿管理界面**
```tsx
// 缺少：管理已保存的草稿列表
<Card title="📚 草稿管理">
  <List
    dataSource={drafts}
    renderItem={draft => (
      <List.Item
        actions={[
          <Button onClick={() => editDraft(draft.id)}>編輯</Button>,
          <Button danger onClick={() => deleteDraft(draft.id)}>刪除</Button>
        ]}
      >
        <List.Item.Meta
          title={`${draft.declarationNumber} - ${draft.itemCount}項商品`}
          description={`保存時間: ${draft.savedAt} | 辨識置信度: ${draft.confidence}%`}
        />
        <Tag color={draft.status === 'validated' ? 'green' : 'orange'}>
          {draft.status === 'validated' ? '已驗證' : '待確認'}
        </Tag>
      </List.Item>
    )}
  />
</Card>
```

### **6. 🔍 智慧搜尋建議組件**
```tsx
// 缺少：品名對應時的智慧搜尋
<AutoComplete
  value={mappedName}
  options={productSuggestions}
  onSearch={handleProductSearch}
  placeholder="輸入中文品名或品號"
>
  <Input.Search
    enterButton="搜尋"
    onSearch={searchProducts}
  />
</AutoComplete>

// 搜尋建議顯示
<div className="search-suggestions">
  {suggestions.map(item => (
    <div key={item.id} className="suggestion-item">
      <div className="product-info">
        <strong>{item.name}</strong>
        <span className="product-code">{item.code}</span>
      </div>
      <div className="product-specs">
        {item.alcoholPercentage}% | {item.volume}ml
      </div>
      <Button size="small" onClick={() => selectProduct(item)}>
        選擇
      </Button>
    </div>
  ))}
</div>
```

### **7. ⚠️ 錯誤處理和驗證界面**
```tsx
// 缺少：詳細的錯誤提示和處理
<div className="validation-errors">
  {errors.map(error => (
    <Alert
      key={error.field}
      type="error"
      message={`欄位錯誤: ${error.fieldName}`}
      description={error.message}
      action={
        <Button size="small" onClick={() => focusField(error.field)}>
          修正
        </Button>
      }
      closable
    />
  ))}
</div>

// 欄位級別的即時驗證
<Form.Item
  validateStatus={errors.exchangeRate ? 'error' : ''}
  help={errors.exchangeRate}
>
  <InputNumber
    value={exchangeRate}
    onChange={validateExchangeRate}
  />
</Form.Item>
```

### **8. 📊 批量處理界面**
```tsx
// 缺少：處理多個報單的批量界面
<Card title="📊 批量處理">
  <Transfer
    dataSource={allPDFs}
    targetKeys={selectedPDFs}
    onChange={handleTransferChange}
    render={item => `${item.fileName} (${item.size})`}
    titles={['待處理報單', '已選擇報單']}
  />

  <div className="batch-actions">
    <Button
      type="primary"
      size="large"
      onClick={processBatch}
      disabled={selectedPDFs.length === 0}
    >
      批量辨識 ({selectedPDFs.length}個檔案)
    </Button>
  </div>
</Card>
```

### **9. 📱 行動裝置適配界面**
```tsx
// 缺少：手機版的響應式設計
<div className="mobile-optimized">
  {isMobile ? (
    <Tabs type="card">
      <TabPane tab="基本資訊" key="basic">
        {/* 報單基本資訊 */}
      </TabPane>
      <TabPane tab="商品清單" key="products">
        {/* 商品表格，縮減欄位 */}
      </TabPane>
      <TabPane tab="損耗設定" key="loss">
        {/* 抽檢損耗設定 */}
      </TabPane>
      <TabPane tab="費用分攤" key="cost">
        {/* 額外費用分攤 */}
      </TabPane>
    </Tabs>
  ) : (
    <div>{/* 桌面版完整界面 */}</div>
  )}
</div>
```

### **10. 📈 即時統計面板**
```tsx
// 缺少：即時顯示統計資訊
<Card title="📈 本次進貨統計">
  <Row gutter={16}>
    <Col span={6}>
      <Statistic title="商品總數" value={totalItems} />
    </Col>
    <Col span={6}>
      <Statistic
        title="總成本"
        value={totalCost}
        prefix="$"
        precision={0}
      />
    </Col>
    <Col span={6}>
      <Statistic
        title="平均單價"
        value={averagePrice}
        prefix="$"
      />
    </Col>
    <Col span={6}>
      <Statistic
        title="損耗率"
        value={lossRate}
        suffix="%"
        precision={1}
      />
    </Col>
  </Row>
</Card>
```

---

## 🎯 **優先級建議**

### **🔥 高優先級（必須有）**
1. 首頁Dashboard界面（包含客戶追蹤、BOT訂單追蹤、TOP10客戶等）
2. PDF上傳界面
3. AI辨識進度界面
4. 新商品建立Modal
5. 最終確認對話框

### **🟡 中優先級（重要）**
6. 錯誤處理和驗證界面
7. 智慧搜尋建議組件
8. 草稿管理界面

### **🟢 低優先級（可選）**
9. 批量處理界面
10. 行動裝置適配
11. 即時統計面板

---

## 💡 **補充建議**

### **用戶體驗優化**
- 鍵盤快捷鍵支援（Tab鍵切換、Enter確認）
- 自動儲存功能（避免資料丟失）
- 離線模式支援（網路斷線時的處理）
- 多語言支援（中英文切換）

### **性能優化**
- 虛擬滾動（處理大量商品時）
- 懶加載（按需載入商品建議）
- 快取機制（常用商品快速選擇）
- 防抖處理（避免頻繁API請求）

**這些UI組件對於完整的進貨管理系統都很重要！** 🎯