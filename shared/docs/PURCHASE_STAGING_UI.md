# 📋 進貨單草稿編輯界面設計

## 🎯 界面目標

基於DEMO.txt的26個欄位結構，設計AI辨識報單後的進貨單草稿編輯界面，讓老闆能夠：
1. 檢視AI辨識結果
2. 手動對應品號品名（英文→中文）
3. 調整辨識錯誤的數據
4. 處理抽檢損耗設定
5. 確認後生成正式進貨單

---

## 📊 **完整26欄位結構**

### **基本報單資訊（3欄位）**
```
1. 報關日期        - AI辨識 (可編輯)
2. 報單號碼        - AI辨識 (可編輯)
3. 主提單號碼      - AI辨識 (可編輯)
```

### **商品基本資訊（7欄位）**
```
4. 貨物名稱        - AI辨識英文 → 手動對應中文品名
5. 酒精度(%)       - AI辨識 (可編輯)
6. 容量(ml)        - AI辨識 (可編輯)
7. 數量            - AI辨識 (可編輯)
8. 外幣單價        - AI辨識 (可編輯)
9. 總金額(外幣)    - 自動計算
10. 稅則號列       - AI辨識 (可編輯)
```

### **匯率稅率資訊（4欄位）**
```
11. 進口稅率       - AI辨識 (可編輯)
12. 幣別           - AI辨識 (可編輯)
13. 匯率           - AI辨識 (可編輯)
14. 淨重(公斤)     - AI辨識 (可編輯)
```

### **稅金計算結果（8欄位）**
```
15. 完稅價格(TWD)  - AI辨識 (可編輯)
16. 台幣成本       - 自動計算
17. 關稅           - 自動計算
18. 煙酒稅         - 自動計算
19. 推廣費         - 自動計算
20. 營業稅         - 自動計算
21. 總稅金         - 自動計算
22. 單瓶成本       - 自動計算
```

### **成本分攤欄位（4欄位）**
```
23. 額外費用總額   - 手動輸入
24. 分攤方式       - 手動選擇
25. 已分攤費用     - 自動計算
26. 單瓶最終成本   - 自動計算
```

---

## 🎨 **界面設計規範**

### **頁面布局**
```
┌─ 進貨單草稿確認 ─────────────────────────────┐
│ 📄 報單基本資訊                                │
├─────────────────────────────────────────┤
│ 🍷 商品清單編輯 (可多筆商品)                    │
├─────────────────────────────────────────┤
│ 📊 抽檢損耗設定                                │
├─────────────────────────────────────────┤
│ 💰 額外費用分攤                                │
├─────────────────────────────────────────┤
│ [保存草稿] [確認進貨] [重新辨識]                │
└─────────────────────────────────────────┘
```

### **報單基本資訊區塊**
```tsx
<Card title="📄 報單基本資訊" className="mb-4">
  <Row gutter={16}>
    <Col span={8}>
      <Form.Item label="報關日期" name="declarationDate">
        <DatePicker
          placeholder="YYYY/MM/DD"
          style={{ width: '100%' }}
        />
      </Form.Item>
    </Col>
    <Col span={8}>
      <Form.Item label="報單號碼" name="declarationNumber">
        <Input placeholder="報單號碼" />
      </Form.Item>
    </Col>
    <Col span={8}>
      <Form.Item label="主提單號碼" name="masterBillOfLading">
        <Input placeholder="主提單號碼" />
      </Form.Item>
    </Col>
  </Row>
</Card>
```

### **商品清單編輯區塊（核心功能）**
```tsx
<Card title="🍷 商品清單編輯" className="mb-4">
  <Table
    dataSource={recognizedItems}
    pagination={false}
    scroll={{ x: 1500 }}
    columns={[
      {
        title: '品名對應',
        key: 'nameMapping',
        width: 300,
        render: (_, record, index) => (
          <div>
            <div className="ai-recognized">
              <Tag color="blue">AI辨識</Tag>
              <Text type="secondary">{record.originalName}</Text>
            </div>
            <div className="manual-mapping mt-2">
              <AutoComplete
                placeholder="輸入或選擇中文品名"
                value={record.mappedName}
                onChange={(value) => handleNameMapping(index, value)}
                options={productSuggestions}
                filterOption={(inputValue, option) =>
                  option.value.includes(inputValue)
                }
              />
              <Button
                type="link"
                size="small"
                onClick={() => showCreateProductModal(index)}
              >
                建立新品
              </Button>
            </div>
          </div>
        )
      },
      {
        title: '品號',
        key: 'productCode',
        width: 100,
        render: (_, record, index) => (
          <Input
            value={record.productCode}
            placeholder="W001"
            onChange={(e) => updateField(index, 'productCode', e.target.value)}
          />
        )
      },
      {
        title: '酒精度(%)',
        dataIndex: 'alcoholPercentage',
        width: 100,
        render: (value, record, index) => (
          <InputNumber
            value={value}
            min={0}
            max={100}
            onChange={(val) => updateField(index, 'alcoholPercentage', val)}
          />
        )
      },
      {
        title: '容量(ml)',
        dataIndex: 'volumeML',
        width: 100,
        render: (value, record, index) => (
          <InputNumber
            value={value}
            min={0}
            onChange={(val) => updateField(index, 'volumeML', val)}
          />
        )
      },
      {
        title: '數量',
        dataIndex: 'quantity',
        width: 80,
        render: (value, record, index) => (
          <InputNumber
            value={value}
            min={0}
            onChange={(val) => updateField(index, 'quantity', val)}
          />
        )
      },
      {
        title: '外幣單價',
        dataIndex: 'foreignCurrencyUnitPrice',
        width: 120,
        render: (value, record, index) => (
          <InputNumber
            value={value}
            min={0}
            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            onChange={(val) => updateField(index, 'foreignCurrencyUnitPrice', val)}
          />
        )
      },
      {
        title: '總金額(外幣)',
        dataIndex: 'totalAmount',
        width: 120,
        render: (_, record) => (
          <Text strong>
            {((record.quantity || 0) * (record.foreignCurrencyUnitPrice || 0)).toLocaleString()}
          </Text>
        )
      },
      {
        title: '稅則號列',
        dataIndex: 'tariffCode',
        width: 120,
        render: (value, record, index) => (
          <Input
            value={value}
            placeholder="e.g. 22083000"
            onChange={(e) => updateField(index, 'tariffCode', e.target.value)}
          />
        )
      },
      {
        title: '進口稅率(%)',
        dataIndex: 'importDutyRate',
        width: 100,
        render: (value, record, index) => (
          <InputNumber
            value={value}
            min={0}
            max={100}
            formatter={value => `${value}%`}
            parser={value => value.replace('%', '')}
            onChange={(val) => updateField(index, 'importDutyRate', val)}
          />
        )
      },
      {
        title: '幣別',
        dataIndex: 'currency',
        width: 80,
        render: (value, record, index) => (
          <Select
            value={value}
            style={{ width: '100%' }}
            onChange={(val) => updateField(index, 'currency', val)}
          >
            <Option value="JPY">JPY</Option>
            <Option value="USD">USD</Option>
            <Option value="EUR">EUR</Option>
            <Option value="GBP">GBP</Option>
          </Select>
        )
      },
      {
        title: '匯率',
        dataIndex: 'exchangeRate',
        width: 100,
        render: (value, record, index) => (
          <InputNumber
            value={value}
            min={0}
            step={0.001}
            precision={4}
            onChange={(val) => updateField(index, 'exchangeRate', val)}
          />
        )
      },
      {
        title: '淨重(公斤)',
        dataIndex: 'weightKG',
        width: 100,
        render: (value, record, index) => (
          <InputNumber
            value={value}
            min={0}
            step={0.1}
            precision={2}
            addonAfter="kg"
            onChange={(val) => updateField(index, 'weightKG', val)}
          />
        )
      },
      {
        title: '完稅價格(TWD)',
        dataIndex: 'dutiableValueTWD',
        width: 120,
        render: (value, record, index) => (
          <InputNumber
            value={value}
            min={0}
            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            onChange={(val) => updateField(index, 'dutiableValueTWD', val)}
          />
        )
      },
      {
        title: '稅金計算',
        key: 'taxCalculation',
        width: 200,
        render: (_, record) => (
          <div className="tax-breakdown">
            <div>關稅: ${record.tariff?.toLocaleString()}</div>
            <div>菸酒稅: ${record.alcoholTax?.toLocaleString()}</div>
            <div>推廣費: ${record.tradeFee?.toLocaleString()}</div>
            <div>營業稅: ${record.vat?.toLocaleString()}</div>
            <Divider style={{ margin: '4px 0' }} />
            <Text strong>單瓶成本: ${record.costPerBottle?.toLocaleString()}</Text>
          </div>
        )
      }
    ]}
  />
</Card>
```

### **抽檢損耗設定區塊**
```tsx
<Card title="📊 抽檢損耗設定" className="mb-4">
  <Row gutter={16}>
    <Col span={8}>
      <Form.Item label="損耗類型" name="lossType">
        <Select defaultValue="NONE" onChange={handleLossTypeChange}>
          <Option value="NONE">無損耗</Option>
          <Option value="INSPECTION">一般抽檢 (消滅1瓶)</Option>
          <Option value="RADIATION">輻射抽檢 (消滅2瓶)</Option>
          <Option value="DAMAGE">破損 (自定義數量)</Option>
        </Select>
      </Form.Item>
    </Col>

    {lossType === 'DAMAGE' && (
      <Col span={8}>
        <Form.Item label="破損數量" name="lossQuantity">
          <InputNumber
            min={0}
            placeholder="輸入破損瓶數"
            addonAfter="瓶"
          />
        </Form.Item>
      </Col>
    )}

    {lossType === 'INSPECTION' && (
      <Col span={8}>
        <Form.Item label="抽驗費" name="inspectionFee">
          <InputNumber
            min={0}
            placeholder="抽驗費用"
            addonBefore="$"
          />
        </Form.Item>
      </Col>
    )}

    <Col span={8}>
      <div className="loss-summary">
        <Text type="secondary">損耗影響：</Text><br/>
        <Text>原數量: {originalQuantity}瓶</Text><br/>
        <Text>消滅: {calculateLoss()}瓶</Text><br/>
        <Text strong color="red">實際可售: {originalQuantity - calculateLoss()}瓶</Text>
      </div>
    </Col>
  </Row>
</Card>
```

### **額外費用分攤區塊**
```tsx
<Card title="💰 額外費用分攤" className="mb-4">
  <Row gutter={16}>
    <Col span={12}>
      <Form.Item label="額外費用總額" name="extraCost">
        <InputNumber
          min={0}
          style={{ width: '100%' }}
          placeholder="輸入運費、報驗費等"
          addonBefore="$"
          formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
        />
      </Form.Item>
    </Col>
    <Col span={12}>
      <Form.Item label="分攤方式" name="allocationMethod">
        <Select placeholder="選擇分攤方式">
          <Option value="VALUE">按金額比例</Option>
          <Option value="QUANTITY">按數量平均</Option>
          <Option value="WEIGHT">按重量分配</Option>
        </Select>
      </Form.Item>
    </Col>
  </Row>

  {extraCost > 0 && allocationMethod && (
    <div className="allocation-preview">
      <Divider>分攤預覽</Divider>
      <Table
        size="small"
        pagination={false}
        dataSource={recognizedItems}
        columns={[
          { title: '商品', dataIndex: 'mappedName' },
          { title: '分攤基準', render: (_, record) => getBaseName(record) },
          { title: '分攤金額', render: (_, record) => `$${calculateAllocation(record)}` },
          { title: '最終單瓶成本', render: (_, record) => `$${calculateFinalCost(record)}` }
        ]}
      />
    </div>
  )}
</Card>
```

### **操作按鈕區塊**
```tsx
<div className="action-buttons" style={{ textAlign: 'center', marginTop: 24 }}>
  <Space size="large">
    <Button
      size="large"
      onClick={saveDraft}
    >
      💾 保存草稿
    </Button>

    <Button
      type="primary"
      size="large"
      onClick={confirmPurchase}
      loading={confirmLoading}
    >
      ✅ 確認進貨
    </Button>

    <Button
      danger
      size="large"
      onClick={reRecognize}
    >
      🔄 重新辨識
    </Button>
  </Space>
</div>
```

---

## 🔄 **操作流程**

### **1. AI辨識完成後**
- 顯示辨識置信度
- 標示可能有問題的欄位（紅色邊框）
- 自動計算稅金

### **2. 品名對應流程**
```
AI辨識: "YAMAZAKI 18YR WHISKY 700ML"
↓
自動搜尋建議:
- 山崎18年威士忌(700ml) ✓
- 山崎18年威士忌(1000ml)
- 山崎12年威士忌
↓
選擇或手動輸入: "山崎18年威士忌(700ml)"
↓
自動帶入品號: W001-A
```

### **3. 數據驗證**
- 即時稅金計算
- 匯率合理性檢查
- 數量邏輯檢查
- 完稅價格vs台幣成本差異提醒

### **4. 確認進貨**
- 生成正式進貨單
- 更新庫存
- 記錄成本
- 產生會計分錄

---

## 🚨 **錯誤處理**

### **常見問題提示**
```tsx
// 匯率異常提醒
{exchangeRate > 0.5 && (
  <Alert
    type="warning"
    message="匯率異常"
    description="當前匯率偏高，請確認是否正確"
    showIcon
  />
)}

// 完稅價格差異提醒
{priceDifference > 0.1 && (
  <Alert
    type="info"
    message="價格差異"
    description={`完稅價格與計算值差異${(priceDifference*100).toFixed(1)}%`}
    showIcon
  />
)}

// 品名未對應提醒
{!mappedName && (
  <Alert
    type="error"
    message="請對應品名"
    description="AI辨識的英文品名需要對應到中文品名"
    showIcon
  />
)}
```

**這個設計基於DEMO.txt的完整邏輯，解決了您提到的英文→中文品名對應問題，並且考慮了抽檢損耗的實際情況！** 🎯