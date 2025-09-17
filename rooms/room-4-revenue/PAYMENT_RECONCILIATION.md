# 收款與沖帳管理 (Payment Reconciliation)

## 🎯 目標
建立完整的收款記錄與沖帳核銷功能，確保客戶付款與銷售單之間的對應關係清楚明確。

---

## 💰 收款沖帳流程

### **Step 1: 客戶付款記錄**
```
客戶轉帳/現金付款 → 銀行入帳通知 → 系統建立收款記錄 → 等待沖帳
```

### **Step 2: 沖帳核銷**
```
選擇收款記錄 → 選擇要沖銷的銷售單 → 確認金額 → 完成沖帳 → 更新帳款狀態
```

### **Step 3: 餘額處理**
```
沖帳金額 > 應收金額 → 產生預收款
沖帳金額 < 應收金額 → 部分收款，剩餘應收
沖帳金額 = 應收金額 → 完全收款
```

---

## 📋 資料模型設計

### **收款記錄表 (payments)**
```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  payment_code VARCHAR(20) UNIQUE NOT NULL,     -- 收款編號 PAY-YYYYMMDD-001
  customer_code VARCHAR(10) NOT NULL,           -- 客戶代碼
  payment_date DATE NOT NULL,                   -- 收款日期
  payment_method ENUM('BANK_TRANSFER', 'CASH', 'CHECK', 'CREDIT_CARD') NOT NULL,
  bank_account VARCHAR(50),                     -- 入帳銀行帳號
  reference_number VARCHAR(50),                 -- 銀行交易序號/支票號碼
  total_amount DECIMAL(15,2) NOT NULL,         -- 收款總額
  allocated_amount DECIMAL(15,2) DEFAULT 0,     -- 已沖帳金額
  unallocated_amount DECIMAL(15,2) NOT NULL,    -- 未沖帳金額
  status ENUM('PENDING', 'PARTIAL', 'FULLY_ALLOCATED', 'CANCELLED') DEFAULT 'PENDING',
  notes TEXT,                                   -- 備註
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (customer_code) REFERENCES customers(customer_code),
  INDEX idx_payment_customer (customer_code),
  INDEX idx_payment_date (payment_date),
  INDEX idx_payment_status (status)
);
```

### **沖帳明細表 (payment_allocations)**
```sql
CREATE TABLE payment_allocations (
  id SERIAL PRIMARY KEY,
  payment_id INT NOT NULL,                      -- 收款記錄ID
  sale_order_code VARCHAR(20) NOT NULL,         -- 銷售單號
  allocated_amount DECIMAL(15,2) NOT NULL,      -- 沖帳金額
  allocation_date DATE NOT NULL,                -- 沖帳日期
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_order_code) REFERENCES sales(sale_order_code),
  INDEX idx_allocation_payment (payment_id),
  INDEX idx_allocation_sale (sale_order_code)
);
```

### **帳齡分析視圖 (accounts_receivable_aging)**
```sql
CREATE VIEW accounts_receivable_aging AS
SELECT
  s.customer_code,
  c.name as customer_name,
  s.sale_order_code,
  s.sale_date,
  s.total_amount,
  COALESCE(SUM(pa.allocated_amount), 0) as paid_amount,
  (s.total_amount - COALESCE(SUM(pa.allocated_amount), 0)) as outstanding_amount,
  DATEDIFF(CURDATE(), s.sale_date) as days_outstanding,
  CASE
    WHEN DATEDIFF(CURDATE(), s.sale_date) <= 30 THEN '0-30天'
    WHEN DATEDIFF(CURDATE(), s.sale_date) <= 60 THEN '31-60天'
    WHEN DATEDIFF(CURDATE(), s.sale_date) <= 90 THEN '61-90天'
    ELSE '90天以上'
  END as aging_period
FROM sales s
LEFT JOIN customers c ON s.customer_code = c.customer_code
LEFT JOIN payment_allocations pa ON s.sale_order_code = pa.sale_order_code
WHERE s.status = 'CONFIRMED'
  AND (s.total_amount - COALESCE(SUM(pa.allocated_amount), 0)) > 0
GROUP BY s.sale_order_code;
```

---

## 🔧 API端點設計

### **收款記錄管理**
```typescript
// GET /api/payments
// 查詢收款記錄
interface PaymentListResponse {
  success: boolean;
  data: {
    payments: Array<{
      id: number;
      payment_code: string;
      customer_code: string;
      customer_name: string;
      payment_date: string;
      payment_method: string;
      total_amount: number;
      allocated_amount: number;
      unallocated_amount: number;
      status: string;
    }>;
    pagination: {
      current: number;
      pageSize: number;
      total: number;
    };
  };
}

// POST /api/payments
// 建立收款記錄
interface CreatePaymentRequest {
  customer_code: string;
  payment_date: string;
  payment_method: 'BANK_TRANSFER' | 'CASH' | 'CHECK' | 'CREDIT_CARD';
  bank_account?: string;
  reference_number?: string;
  total_amount: number;
  notes?: string;
}

// PUT /api/payments/:id/allocate
// 執行沖帳
interface AllocatePaymentRequest {
  allocations: Array<{
    sale_order_code: string;
    allocated_amount: number;
  }>;
}
```

### **帳款查詢**
```typescript
// GET /api/receivables/aging
// 帳齡分析
interface AgingAnalysisResponse {
  success: boolean;
  data: {
    summary: {
      total_outstanding: number;
      aging_0_30: number;
      aging_31_60: number;
      aging_61_90: number;
      aging_over_90: number;
    };
    details: Array<{
      customer_code: string;
      customer_name: string;
      sale_order_code: string;
      sale_date: string;
      total_amount: number;
      paid_amount: number;
      outstanding_amount: number;
      days_outstanding: number;
      aging_period: string;
    }>;
  };
}

// GET /api/receivables/customer/:customer_code
// 客戶帳款明細
interface CustomerReceivableResponse {
  success: boolean;
  data: {
    customer_info: {
      customer_code: string;
      name: string;
      credit_limit: number;
      current_balance: number;
    };
    outstanding_orders: Array<{
      sale_order_code: string;
      sale_date: string;
      total_amount: number;
      paid_amount: number;
      outstanding_amount: number;
      days_outstanding: number;
    }>;
    payment_history: Array<{
      payment_code: string;
      payment_date: string;
      payment_method: string;
      total_amount: number;
      allocated_amount: number;
    }>;
  };
}
```

---

## 🖥️ 前端介面設計

### **收款記錄頁面**
```typescript
// pages/finance/payments.tsx
import { Table, Button, Modal, Form, Select, DatePicker, InputNumber } from 'antd';

const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);

  const columns = [
    {
      title: '收款編號',
      dataIndex: 'payment_code',
      key: 'payment_code',
    },
    {
      title: '客戶',
      dataIndex: 'customer_name',
      key: 'customer_name',
    },
    {
      title: '收款日期',
      dataIndex: 'payment_date',
      key: 'payment_date',
    },
    {
      title: '付款方式',
      dataIndex: 'payment_method',
      key: 'payment_method',
      render: (method) => paymentMethodMap[method],
    },
    {
      title: '收款金額',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => `$${amount.toLocaleString()}`,
    },
    {
      title: '未沖帳金額',
      dataIndex: 'unallocated_amount',
      key: 'unallocated_amount',
      render: (amount) => (
        <span className={amount > 0 ? 'text-orange-600' : 'text-green-600'}>
          ${amount.toLocaleString()}
        </span>
      ),
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Badge status={statusMap[status].color} text={statusMap[status].text} />,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.unallocated_amount > 0 && (
            <Button size="small" onClick={() => handleAllocate(record)}>
              沖帳
            </Button>
          )}
          <Button size="small" onClick={() => handleViewDetails(record)}>
            詳情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">收款管理</h1>
        <Button type="primary" onClick={() => setShowCreateModal(true)}>
          新增收款記錄
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={payments}
        rowKey="id"
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 筆`,
        }}
      />

      {/* 新增收款Modal */}
      <CreatePaymentModal
        visible={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* 沖帳Modal */}
      <AllocatePaymentModal
        visible={showAllocateModal}
        payment={selectedPayment}
        onCancel={() => setShowAllocateModal(false)}
        onSuccess={handleAllocateSuccess}
      />
    </div>
  );
};
```

### **沖帳介面**
```typescript
// components/AllocatePaymentModal.tsx
const AllocatePaymentModal = ({ visible, payment, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [outstandingOrders, setOutstandingOrders] = useState([]);
  const [selectedAllocations, setSelectedAllocations] = useState([]);

  const handleAllocate = (order) => {
    const maxAmount = Math.min(
      payment.unallocated_amount,
      order.outstanding_amount
    );

    Modal.confirm({
      title: '確認沖帳',
      content: (
        <div>
          <p>銷售單號: {order.sale_order_code}</p>
          <p>應收金額: ${order.outstanding_amount.toLocaleString()}</p>
          <p>可沖帳金額: ${maxAmount.toLocaleString()}</p>
          <InputNumber
            defaultValue={maxAmount}
            max={maxAmount}
            min={0.01}
            step={0.01}
            formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            onChange={(value) => setAllocateAmount(value)}
          />
        </div>
      ),
      onOk: () => handleConfirmAllocate(order),
    });
  };

  return (
    <Modal
      title={`沖帳作業 - ${payment?.payment_code}`}
      visible={visible}
      onCancel={onCancel}
      width={800}
      footer={null}
    >
      <div className="mb-4">
        <p><strong>客戶:</strong> {payment?.customer_name}</p>
        <p><strong>收款金額:</strong> ${payment?.total_amount.toLocaleString()}</p>
        <p><strong>可沖帳金額:</strong> ${payment?.unallocated_amount.toLocaleString()}</p>
      </div>

      <Divider>待收帳款</Divider>

      <Table
        columns={[
          { title: '銷售單號', dataIndex: 'sale_order_code' },
          { title: '銷售日期', dataIndex: 'sale_date' },
          { title: '應收金額', dataIndex: 'outstanding_amount', render: (amount) => `$${amount.toLocaleString()}` },
          { title: '帳齡', dataIndex: 'days_outstanding', render: (days) => `${days}天` },
          {
            title: '操作',
            render: (_, record) => (
              <Button size="small" onClick={() => handleAllocate(record)}>
                沖帳
              </Button>
            ),
          },
        ]}
        dataSource={outstandingOrders}
        pagination={false}
        size="small"
      />
    </Modal>
  );
};
```

---

## 📊 報表功能

### **帳齡分析報表**
- 按客戶分組的帳齡分析
- 0-30天、31-60天、61-90天、90天以上分類
- 可匯出Excel格式

### **收款統計報表**
- 月度/季度收款統計
- 按付款方式分類統計
- 收款效率分析

### **客戶信用狀況**
- 客戶信用額度使用率
- 超額客戶清單
- 長期拖欠客戶預警

---

## ⚠️ 重要業務規則

### **沖帳規則**
1. 收款金額不能超過客戶應收總額
2. 單筆沖帳金額不能超過該銷售單的未收金額
3. 已沖帳的記錄不可修改（需要反沖帳功能）
4. 預收款項需要特別標示和管理

### **權限控制**
- SUPER_ADMIN: 所有收款和沖帳功能
- EMPLOYEE: 可建立收款記錄，不可沖帳
- INVESTOR: 只能查看自己投資方的帳款資料

### **資料稽核**
- 所有沖帳操作記錄操作人和時間
- 金額異動需要留存完整軌跡
- 定期檢查帳款平衡（收款總額 = 沖帳總額 + 未沖帳金額）

---

## 📋 開發檢查清單

### **後端開發**
- [ ] 建立收款和沖帳相關資料表
- [ ] 實作收款CRUD API
- [ ] 實作沖帳功能API
- [ ] 建立帳齡分析查詢
- [ ] 實作資料驗證和業務規則

### **前端開發**
- [ ] 收款記錄管理頁面
- [ ] 沖帳作業介面
- [ ] 帳齡分析報表
- [ ] 客戶帳款查詢頁面
- [ ] Excel匯出功能

### **測試項目**
- [ ] 沖帳金額計算正確性
- [ ] 帳款狀態更新測試
- [ ] 權限控制測試
- [ ] 帳款平衡驗證
- [ ] 報表資料準確性

---

**注意**: 收款沖帳是財務核心功能，任何變更都必須經過充分測試，確保資料準確性和一致性。