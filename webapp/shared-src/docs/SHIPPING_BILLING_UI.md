# 📋 出貨單和對帳單列印功能UI設計

## 🎯 功能概述

設計出貨單和對帳單的生成、預覽、列印功能，支援多種格式輸出，並考慮投資方數據隔離需求。

---

## 📊 **出貨單UI設計**

### **出貨單生成界面**
```tsx
<Card title="📦 出貨單生成">
  <Form layout="vertical">
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="客戶選擇" required>
          <Select
            showSearch
            placeholder="選擇客戶"
            optionFilterProp="children"
          >
            {customers.map(customer => (
              <Option key={customer.id} value={customer.id}>
                {customer.name} ({customer.code})
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="出貨日期" required>
          <DatePicker
            style={{ width: '100%' }}
            defaultValue={moment()}
          />
        </Form.Item>
      </Col>
    </Row>

    <Form.Item label="商品選擇">
      <Transfer
        dataSource={availableProducts}
        targetKeys={selectedProducts}
        onChange={handleProductSelection}
        render={item => (
          <div>
            <strong>{item.name}</strong>
            <div>庫存: {item.stock}瓶 | 成本: ${item.cost}</div>
          </div>
        )}
        titles={['可出貨商品', '已選商品']}
        showSearch
      />
    </Form.Item>

    <Card title="商品明細" className="selected-products">
      <Table
        dataSource={selectedProductDetails}
        pagination={false}
        columns={[
          { title: '品名', dataIndex: 'name' },
          {
            title: '出貨數量',
            render: (_, record, index) => (
              <InputNumber
                min={1}
                max={record.stock}
                value={record.quantity}
                onChange={(val) => updateQuantity(index, val)}
              />
            )
          },
          {
            title: '單價',
            render: (_, record, index) => (
              <InputNumber
                min={0}
                value={record.price}
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                onChange={(val) => updatePrice(index, val)}
              />
            )
          },
          {
            title: '小計',
            render: (_, record) => (
              <Text strong>
                ${(record.quantity * record.price).toLocaleString()}
              </Text>
            )
          }
        ]}
      />
    </Card>
  </Form>
</Card>
```

### **出貨單預覽界面**
```tsx
<Modal
  title="📋 出貨單預覽"
  open={showPreview}
  width={1000}
  footer={[
    <Button key="edit" onClick={() => setShowPreview(false)}>
      修改
    </Button>,
    <Button key="pdf" onClick={exportToPDF}>
      匯出PDF
    </Button>,
    <Button key="print" type="primary" onClick={handlePrint}>
      列印
    </Button>
  ]}
>
  <div className="shipping-document" id="printable-content">
    <div className="document-header">
      <h2>出貨單 DELIVERY NOTE</h2>
      <div className="company-info">
        <strong>{companyName}</strong>
        <div>{companyAddress}</div>
        <div>統編: {taxId}</div>
      </div>
      <div className="document-info">
        <div>出貨單號: {shippingNumber}</div>
        <div>出貨日期: {shippingDate}</div>
      </div>
    </div>

    <div className="customer-section">
      <h3>客戶資訊</h3>
      <div><strong>{customer.name}</strong></div>
      <div>統編: {customer.taxId}</div>
      <div>地址: {customer.address}</div>
      <div>聯絡人: {customer.contact}</div>
    </div>

    <Table
      dataSource={shippingItems}
      pagination={false}
      size="small"
      bordered
      summary={(pageData) => {
        const totalAmount = pageData.reduce(
          (sum, record) => sum + (record.quantity * record.price), 0
        );
        return (
          <Table.Summary.Row>
            <Table.Summary.Cell colSpan={3}>
              <Text strong>總計</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell>
              <Text strong>${totalAmount.toLocaleString()}</Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        );
      }}
      columns={[
        { title: '品名', dataIndex: 'name', width: '40%' },
        { title: '數量', dataIndex: 'quantity', align: 'center' },
        { title: '單價', dataIndex: 'price', align: 'right', render: val => `$${val.toLocaleString()}` },
        {
          title: '小計',
          align: 'right',
          render: (_, record) => `$${(record.quantity * record.price).toLocaleString()}`
        }
      ]}
    />

    <div className="footer-info">
      <div>備註: {notes}</div>
      <div className="signature-area">
        <div>出貨人: _____________</div>
        <div>收貨人: _____________</div>
        <div>日期: _____________</div>
      </div>
    </div>
  </div>
</Modal>
```

---

## 💰 **對帳單UI設計**

### **對帳單生成界面**
```tsx
<Card title="💰 對帳單生成">
  <Form layout="vertical">
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="客戶選擇" required>
          <Select
            showSearch
            placeholder="選擇客戶"
            value={selectedCustomer}
            onChange={handleCustomerChange}
          >
            {customers.map(customer => (
              <Option key={customer.id} value={customer.id}>
                {customer.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="對帳期間起" required>
          <DatePicker
            value={startDate}
            onChange={setStartDate}
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="對帳期間迄" required>
          <DatePicker
            value={endDate}
            onChange={setEndDate}
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Col>
    </Row>

    <Button
      type="primary"
      onClick={generateStatement}
      loading={generating}
    >
      產生對帳單
    </Button>
  </Form>

  {statementData && (
    <Card title="📊 對帳單摘要" className="statement-summary">
      <Row gutter={16}>
        <Col span={6}>
          <Statistic title="出貨次數" value={statementData.deliveryCount} />
        </Col>
        <Col span={6}>
          <Statistic
            title="總出貨金額"
            value={statementData.totalAmount}
            prefix="$"
            precision={0}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="已收款"
            value={statementData.paidAmount}
            prefix="$"
            precision={0}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="應收帳款"
            value={statementData.outstandingAmount}
            prefix="$"
            precision={0}
          />
        </Col>
      </Row>
    </Card>
  )}
</Card>
```

### **對帳單詳細界面**
```tsx
<Modal
  title="📑 對帳單詳細"
  open={showStatementDetail}
  width={1200}
  footer={[
    <Button key="excel" onClick={exportToExcel}>
      匯出Excel
    </Button>,
    <Button key="pdf" onClick={exportStatementToPDF}>
      匯出PDF
    </Button>,
    <Button key="print" type="primary" onClick={printStatement}>
      列印
    </Button>
  ]}
>
  <div className="statement-document" id="statement-printable">
    <div className="statement-header">
      <h2>對帳單 STATEMENT</h2>
      <div className="period-info">
        對帳期間: {startDate} ~ {endDate}
      </div>
      <div className="customer-info">
        <strong>{customer.name}</strong>
        <div>客戶代碼: {customer.code}</div>
      </div>
    </div>

    <Table
      dataSource={statementItems}
      pagination={false}
      size="small"
      bordered
      columns={[
        { title: '日期', dataIndex: 'date', width: '15%' },
        { title: '單據號', dataIndex: 'documentNumber', width: '15%' },
        { title: '摘要', dataIndex: 'description', width: '30%' },
        {
          title: '借方(出貨)',
          dataIndex: 'debitAmount',
          width: '20%',
          align: 'right',
          render: val => val ? `$${val.toLocaleString()}` : '-'
        },
        {
          title: '貸方(收款)',
          dataIndex: 'creditAmount',
          width: '20%',
          align: 'right',
          render: val => val ? `$${val.toLocaleString()}` : '-'
        }
      ]}
      summary={(pageData) => {
        const totalDebit = pageData.reduce((sum, record) => sum + (record.debitAmount || 0), 0);
        const totalCredit = pageData.reduce((sum, record) => sum + (record.creditAmount || 0), 0);
        const balance = totalDebit - totalCredit;

        return (
          <>
            <Table.Summary.Row>
              <Table.Summary.Cell colSpan={3}>
                <Text strong>合計</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell>
                <Text strong>${totalDebit.toLocaleString()}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell>
                <Text strong>${totalCredit.toLocaleString()}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
            <Table.Summary.Row>
              <Table.Summary.Cell colSpan={4}>
                <Text strong>餘額</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell>
                <Text strong style={{ color: balance > 0 ? 'red' : 'green' }}>
                  ${balance.toLocaleString()}
                </Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </>
        );
      }}
    />
  </div>
</Modal>
```

---

## 🔒 **投資方數據隔離處理**

### **角色差異顯示**
```tsx
// 根據使用者角色顯示不同的價格資訊
const renderPriceColumn = (userRole) => {
  if (userRole === 'INVESTOR') {
    // 投資方只看到協議價格，不看到實際售價
    return {
      title: '協議價格',
      render: (_, record) => `$${record.investorPrice.toLocaleString()}`
    };
  } else if (userRole === 'SUPER_ADMIN') {
    // 老闆可以看到完整的雙重價格
    return {
      title: '價格資訊',
      render: (_, record) => (
        <div>
          <div>協議價: ${record.investorPrice.toLocaleString()}</div>
          <div style={{ color: 'green' }}>
            實際價: ${record.actualPrice.toLocaleString()}
          </div>
          <div style={{ color: 'blue' }}>
            差額: ${(record.actualPrice - record.investorPrice).toLocaleString()}
          </div>
        </div>
      )
    };
  }

  // 一般員工只看到基本價格
  return {
    title: '售價',
    render: (_, record) => `$${record.displayPrice.toLocaleString()}`
  };
};
```

---

## 📄 **列印樣式設定**

### **CSS列印樣式**
```css
@media print {
  /* 隱藏不需要的元素 */
  .no-print {
    display: none !important;
  }

  /* 出貨單樣式 */
  .shipping-document {
    font-family: 'Microsoft JhengHei', sans-serif;
    font-size: 12px;
    line-height: 1.4;
    color: black;
  }

  .document-header {
    display: flex;
    justify-content: space-between;
    border-bottom: 2px solid black;
    padding-bottom: 10px;
    margin-bottom: 20px;
  }

  .customer-section {
    background-color: #f5f5f5;
    padding: 10px;
    margin-bottom: 20px;
  }

  .signature-area {
    margin-top: 30px;
    display: flex;
    justify-content: space-between;
  }

  /* 對帳單樣式 */
  .statement-document table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 20px;
  }

  .statement-document th,
  .statement-document td {
    border: 1px solid #000;
    padding: 5px;
    text-align: left;
  }

  .statement-document th {
    background-color: #f0f0f0;
  }
}
```

---

## ⚙️ **API整合規格**

### **出貨單API**
```typescript
// 建立出貨單
POST /api/shipping/create
{
  customerId: string;
  shippingDate: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
  }[];
  notes?: string;
}

// 取得出貨單
GET /api/shipping/:id
Response: ShippingDocument

// 更新出貨單狀態
PUT /api/shipping/:id/status
{
  status: 'draft' | 'confirmed' | 'shipped' | 'delivered';
}
```

### **對帳單API**
```typescript
// 產生對帳單
POST /api/statement/generate
{
  customerId: string;
  startDate: string;
  endDate: string;
  includePayments: boolean;
}

// 取得對帳單資料
GET /api/statement/:customerId
Query: startDate, endDate
Response: StatementData[]
```

---

## 🎨 **UI元件規範**

### **列印按鈕群組**
```tsx
<Space.Compact block>
  <Button
    icon={<EyeOutlined />}
    onClick={showPreview}
  >
    預覽
  </Button>
  <Button
    icon={<FilePdfOutlined />}
    onClick={exportToPDF}
  >
    PDF
  </Button>
  <Button
    icon={<FileExcelOutlined />}
    onClick={exportToExcel}
  >
    Excel
  </Button>
  <Button
    type="primary"
    icon={<PrinterOutlined />}
    onClick={handlePrint}
  >
    列印
  </Button>
</Space.Compact>
```

### **格式設定面板**
```tsx
<Collapse>
  <Panel header="🎨 列印格式設定" key="format">
    <Form layout="vertical">
      <Form.Item label="紙張大小">
        <Select defaultValue="A4">
          <Option value="A4">A4</Option>
          <Option value="A5">A5</Option>
          <Option value="Letter">Letter</Option>
        </Select>
      </Form.Item>

      <Form.Item label="頁邊距">
        <Slider
          min={10}
          max={30}
          defaultValue={15}
          marks={{ 10: '小', 20: '中', 30: '大' }}
        />
      </Form.Item>

      <Form.Item>
        <Checkbox checked={includeBackground}>
          包含背景顏色
        </Checkbox>
      </Form.Item>
    </Form>
  </Panel>
</Collapse>
```

---

## 📊 **功能整合到現有系統**

這些功能將整合到以下現有模組：
- **Sales模組**: 出貨單生成和管理
- **Accounting模組**: 對帳單生成和應收帳款管理
- **Customer模組**: 客戶資訊和價格設定
- **Report模組**: 列印功能和格式設定

**核心重點**: 確保投資方數據隔離在列印功能中的完整實現！ 🔒