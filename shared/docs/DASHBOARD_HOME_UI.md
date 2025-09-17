# 🏠 首頁Dashboard UI設計

## 🎯 設計目標

為老闆設計一個功能完整的首頁Dashboard，提供當日營運概況、客戶關懷提醒、待處理事項等關鍵資訊，特別整合LINE BOT功能產生的銷貨單追蹤。

---

## 📊 **首頁整體布局**

### **響應式網格設計**
```tsx
<div className="dashboard-home">
  {/* 頂部KPI概覽 */}
  <div className="dashboard-kpi-section">
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={6}>
        <KPICard type="sales" />
      </Col>
      <Col xs={24} sm={12} md={6}>
        <KPICard type="customers" />
      </Col>
      <Col xs={24} sm={12} md={6}>
        <KPICard type="pending" />
      </Col>
      <Col xs={24} sm={12} md={6}>
        <KPICard type="profit" />
      </Col>
    </Row>
  </div>

  {/* 主要內容區 */}
  <div className="dashboard-main-content">
    <Row gutter={[24, 24]}>
      {/* 左側區塊 */}
      <Col xs={24} lg={16}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <CustomerCareSection />
          <PendingShipmentsSection />
          <MonthlyTop10CustomersSection />
        </Space>
      </Col>

      {/* 右側區塊 */}
      <Col xs={24} lg={8}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <QuickActionsPanel />
          <TodayScheduleSection />
          <SystemAlertsSection />
        </Space>
      </Col>
    </Row>
  </div>
</div>
```

---

## 📈 **KPI概覽卡片**

### **關鍵指標卡片設計**
```tsx
function KPICard({ type }: { type: 'sales' | 'customers' | 'pending' | 'profit' }) {
  const kpiData = useKPIData(type);

  const configs = {
    sales: {
      title: '當月銷售額',
      icon: '💰',
      value: kpiData.monthlySales,
      format: 'currency',
      trend: kpiData.salesTrend,
      color: '#52c41a'
    },
    customers: {
      title: '活躍客戶',
      icon: '👥',
      value: kpiData.activeCustomers,
      format: 'number',
      trend: kpiData.customerTrend,
      color: '#1890ff'
    },
    pending: {
      title: '待處理事項',
      icon: '⏰',
      value: kpiData.pendingItems,
      format: 'number',
      trend: null,
      color: '#fa8c16',
      clickable: true,
      onClick: () => scrollToPendingSection()
    },
    profit: {
      title: '當月毛利',
      icon: '📊',
      value: kpiData.monthlyProfit,
      format: 'currency',
      trend: kpiData.profitTrend,
      color: '#722ed1'
    }
  };

  const config = configs[type];

  return (
    <Card
      className={`kpi-card ${config.clickable ? 'clickable' : ''}`}
      onClick={config.onClick}
      hoverable={config.clickable}
    >
      <Statistic
        title={
          <div className="kpi-title">
            <span className="kpi-icon">{config.icon}</span>
            <span>{config.title}</span>
          </div>
        }
        value={config.value}
        precision={config.format === 'currency' ? 0 : undefined}
        prefix={config.format === 'currency' ? '$' : undefined}
        valueStyle={{ color: config.color, fontSize: '24px' }}
      />

      {config.trend && (
        <div className="kpi-trend">
          <Trend
            flag={config.trend > 0 ? 'up' : 'down'}
            style={{
              color: config.trend > 0 ? '#52c41a' : '#ff4d4f'
            }}
          >
            {Math.abs(config.trend)}%
          </Trend>
          <span className="trend-label">vs 上月</span>
        </div>
      )}
    </Card>
  );
}
```

---

## 🔔 **客戶追蹤關懷區塊**

### **客戶關懷提醒設計**
```tsx
function CustomerCareSection() {
  const [careData, setCareData] = useState(null);

  useEffect(() => {
    // 載入需要關懷的客戶資料
    loadCustomerCareData();
  }, []);

  return (
    <Card
      title={
        <div className="section-title">
          <HeartOutlined style={{ color: '#ff4d4f' }} />
          <span>客戶追蹤關懷</span>
          <Badge count={careData?.totalCount} style={{ marginLeft: 8 }} />
        </div>
      }
      extra={
        <Button type="link" onClick={() => navigateToCustomerCare()}>
          查看全部
        </Button>
      }
    >
      <Tabs
        type="card"
        size="small"
        items={[
          {
            key: 'overdue',
            label: (
              <span>
                🚨 超期客戶
                <Badge count={careData?.overdue?.length} size="small" />
              </span>
            ),
            children: <OverdueCustomersList data={careData?.overdue} />
          },
          {
            key: 'due-soon',
            label: (
              <span>
                ⏰ 即將到期
                <Badge count={careData?.dueSoon?.length} size="small" />
              </span>
            ),
            children: <DueSoonCustomersList data={careData?.dueSoon} />
          },
          {
            key: 'vip',
            label: (
              <span>
                👑 VIP關懷
                <Badge count={careData?.vip?.length} size="small" />
              </span>
            ),
            children: <VIPCustomersList data={careData?.vip} />
          }
        ]}
      />
    </Card>
  );
}

// 超期客戶列表
function OverdueCustomersList({ data }) {
  return (
    <List
      size="small"
      dataSource={data}
      renderItem={customer => (
        <List.Item
          actions={[
            <Button
              type="link"
              size="small"
              onClick={() => callCustomer(customer.phone)}
            >
              📞 致電
            </Button>,
            <Button
              type="link"
              size="small"
              onClick={() => logContact(customer.id)}
            >
              ✅ 已聯絡
            </Button>
          ]}
        >
          <List.Item.Meta
            avatar={
              <Badge
                dot
                status="error"
                offset={[-2, 2]}
              >
                <Avatar
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${customer.id}`}
                  size="small"
                />
              </Badge>
            }
            title={
              <div className="customer-care-title">
                <span className="customer-name">{customer.name}</span>
                <Tag color="red" size="small">
                  超期 {customer.overdaysDays} 天
                </Tag>
              </div>
            }
            description={
              <div className="customer-care-desc">
                <div>上次聯絡: {customer.lastContact}</div>
                <div>最後訂單: ${customer.lastOrderAmount?.toLocaleString()}</div>
              </div>
            }
          />
        </List.Item>
      )}
    />
  );
}
```

---

## 📦 **待出貨清單區塊**

### **BOT銷貨單追蹤設計**
```tsx
function PendingShipmentsSection() {
  const [pendingData, setPendingData] = useState(null);

  return (
    <Card
      title={
        <div className="section-title">
          <TruckOutlined style={{ color: '#fa8c16' }} />
          <span>待出貨清單</span>
          <Badge count={pendingData?.totalCount} style={{ marginLeft: 8 }} />
        </div>
      }
      extra={
        <Space>
          <Button
            type="primary"
            size="small"
            onClick={() => generateDailyReport()}
          >
            📋 生成日報
          </Button>
          <Button type="link" onClick={() => navigateToShipping()}>
            查看全部
          </Button>
        </Space>
      }
    >
      <Alert
        type="info"
        message="BOT功能提醒"
        description="以下列表包含通過LINE BOT建立但尚未生成出貨單的銷貨紀錄"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Table
        size="small"
        pagination={false}
        dataSource={pendingData?.items}
        scroll={{ y: 300 }}
        columns={[
          {
            title: '建立方式',
            dataIndex: 'source',
            width: 80,
            render: (source) => (
              <Tag color={source === 'bot' ? 'blue' : 'green'}>
                {source === 'bot' ? '🤖 BOT' : '💻 系統'}
              </Tag>
            )
          },
          {
            title: '客戶',
            dataIndex: 'customerName',
            width: 120,
            render: (name, record) => (
              <div>
                <div className="customer-name">{name}</div>
                <div className="customer-code">{record.customerCode}</div>
              </div>
            )
          },
          {
            title: '訂單內容',
            dataIndex: 'orderSummary',
            render: (summary, record) => (
              <div>
                <div className="order-summary">{summary}</div>
                <div className="order-details">
                  {record.itemCount}項商品 | ${record.totalAmount?.toLocaleString()}
                </div>
              </div>
            )
          },
          {
            title: '建立時間',
            dataIndex: 'createdAt',
            width: 100,
            render: (date) => (
              <div>
                <div>{formatDate(date)}</div>
                <div className="time-detail">{formatTime(date)}</div>
              </div>
            )
          },
          {
            title: '狀態',
            dataIndex: 'status',
            width: 80,
            render: (status) => {
              const statusConfig = {
                'pending': { color: 'orange', text: '待處理' },
                'preparing': { color: 'blue', text: '準備中' },
                'urgent': { color: 'red', text: '急件' }
              };
              const config = statusConfig[status];
              return <Tag color={config.color}>{config.text}</Tag>;
            }
          },
          {
            title: '操作',
            width: 100,
            render: (_, record) => (
              <Space size="small">
                <Button
                  type="link"
                  size="small"
                  onClick={() => createShippingOrder(record.id)}
                >
                  📦 出貨
                </Button>
                <Button
                  type="link"
                  size="small"
                  onClick={() => viewOrderDetail(record.id)}
                >
                  👁️ 詳情
                </Button>
              </Space>
            )
          }
        ]}
      />
    </Card>
  );
}
```

---

## 🏆 **當月10大客戶表單**

### **頂級客戶展示**
```tsx
function MonthlyTop10CustomersSection() {
  const [top10Data, setTop10Data] = useState([]);

  return (
    <Card
      title={
        <div className="section-title">
          <TrophyOutlined style={{ color: '#faad14' }} />
          <span>當月TOP 10客戶</span>
        </div>
      }
      extra={
        <Space>
          <Select
            size="small"
            defaultValue="amount"
            style={{ width: 120 }}
            onChange={setRankingType}
          >
            <Option value="amount">按金額</Option>
            <Option value="quantity">按數量</Option>
            <Option value="frequency">按頻次</Option>
          </Select>
          <Button type="link" onClick={() => exportTop10Report()}>
            📊 匯出
          </Button>
        </Space>
      }
    >
      <div className="top10-container">
        {/* 前三名特殊顯示 */}
        <div className="podium-section">
          <Row gutter={8}>
            {top10Data.slice(0, 3).map((customer, index) => (
              <Col span={8} key={customer.id}>
                <div className={`podium-card rank-${index + 1}`}>
                  <div className="rank-badge">
                    {['🥇', '🥈', '🥉'][index]}
                  </div>
                  <Avatar
                    size={48}
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${customer.id}`}
                  />
                  <div className="customer-info">
                    <div className="customer-name">{customer.name}</div>
                    <div className="customer-amount">
                      ${customer.monthlyAmount?.toLocaleString()}
                    </div>
                  </div>
                  {customer.isVIP && <Tag color="gold">VIP</Tag>}
                </div>
              </Col>
            ))}
          </Row>
        </div>

        {/* 4-10名列表顯示 */}
        <div className="ranking-list">
          <Table
            size="small"
            pagination={false}
            showHeader={false}
            dataSource={top10Data.slice(3)}
            columns={[
              {
                title: '排名',
                width: 50,
                render: (_, record, index) => (
                  <div className="rank-number">#{index + 4}</div>
                )
              },
              {
                title: '客戶',
                render: (_, record) => (
                  <div className="customer-row">
                    <Avatar
                      size="small"
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${record.id}`}
                    />
                    <div className="customer-details">
                      <div className="name">{record.name}</div>
                      <div className="code">{record.code}</div>
                    </div>
                  </div>
                )
              },
              {
                title: '金額',
                width: 100,
                render: (_, record) => (
                  <div className="amount-column">
                    <div className="amount">${record.monthlyAmount?.toLocaleString()}</div>
                    <div className="growth">
                      {record.growth > 0 ? '📈' : '📉'} {Math.abs(record.growth)}%
                    </div>
                  </div>
                )
              },
              {
                title: '操作',
                width: 80,
                render: (_, record) => (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => viewCustomerDetail(record.id)}
                  >
                    查看
                  </Button>
                )
              }
            ]}
          />
        </div>
      </div>
    </Card>
  );
}
```

---

## ⚡ **快速操作面板**

### **常用功能快捷入口**
```tsx
function QuickActionsPanel() {
  return (
    <Card title="⚡ 快速操作" size="small">
      <div className="quick-actions-grid">
        <Row gutter={[8, 8]}>
          <Col span={12}>
            <Button
              block
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigateToNewSale()}
            >
              新增銷貨
            </Button>
          </Col>
          <Col span={12}>
            <Button
              block
              icon={<ScanOutlined />}
              onClick={() => openBarcodeScanner()}
            >
              掃碼出貨
            </Button>
          </Col>
          <Col span={12}>
            <Button
              block
              icon={<PhoneOutlined />}
              onClick={() => openLineBot()}
            >
              LINE BOT
            </Button>
          </Col>
          <Col span={12}>
            <Button
              block
              icon={<CalculatorOutlined />}
              onClick={() => openCostCalculator()}
            >
              成本計算
            </Button>
          </Col>
          <Col span={12}>
            <Button
              block
              icon={<FileTextOutlined />}
              onClick={() => generateQuote()}
            >
              快速報價
            </Button>
          </Col>
          <Col span={12}>
            <Button
              block
              icon={<BarChartOutlined />}
              onClick={() => viewReports()}
            >
              查看報表
            </Button>
          </Col>
        </Row>
      </div>

      {/* 最近使用功能 */}
      <Divider plain>最近使用</Divider>
      <List
        size="small"
        dataSource={recentActions}
        renderItem={action => (
          <List.Item>
            <Button
              type="link"
              size="small"
              icon={action.icon}
              onClick={() => repeatAction(action)}
            >
              {action.name}
            </Button>
            <span className="recent-time">{action.time}</span>
          </List.Item>
        )}
      />
    </Card>
  );
}
```

---

## 📅 **今日行程與系統提醒**

### **待辦事項和提醒**
```tsx
function TodayScheduleSection() {
  const [schedule, setSchedule] = useState([]);

  return (
    <Card title="📅 今日行程" size="small">
      <Timeline
        size="small"
        items={schedule.map(item => ({
          color: getTimelineColor(item.type),
          children: (
            <div className="schedule-item">
              <div className="schedule-title">{item.title}</div>
              <div className="schedule-time">{item.time}</div>
              {item.action && (
                <Button
                  type="link"
                  size="small"
                  onClick={() => executeAction(item.action)}
                >
                  {item.actionText}
                </Button>
              )}
            </div>
          )
        }))}
      />
    </Card>
  );
}

function SystemAlertsSection() {
  const [alerts, setAlerts] = useState([]);

  return (
    <Card title="🔔 系統提醒" size="small">
      <List
        size="small"
        dataSource={alerts}
        renderItem={alert => (
          <List.Item
            actions={[
              <Button
                type="link"
                size="small"
                onClick={() => dismissAlert(alert.id)}
              >
                關閉
              </Button>
            ]}
          >
            <Alert
              type={alert.type}
              message={alert.message}
              showIcon
              banner
              style={{ width: '100%' }}
            />
          </List.Item>
        )}
      />
    </Card>
  );
}
```

---

## 🔄 **自動更新機制**

### **即時資料同步**
```typescript
// Dashboard資料自動更新
function useDashboardData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初始載入
    loadDashboardData();

    // 設定定時更新（每5分鐘）
    const interval = setInterval(() => {
      refreshDashboardData();
    }, 5 * 60 * 1000);

    // 設定WebSocket連接（即時更新）
    const ws = new WebSocket('/api/dashboard/realtime');
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      updateDashboardData(update);
    };

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, []);

  return { data, loading, refresh: refreshDashboardData };
}

// 10點報告自動生成
function useDaily10AMReport() {
  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      if (now.getHours() === 10 && now.getMinutes() === 0) {
        generateDaily10AMReport();
      }
    };

    // 每分鐘檢查一次
    const interval = setInterval(checkTime, 60 * 1000);
    return () => clearInterval(interval);
  }, []);
}

async function generateDaily10AMReport() {
  const reportData = {
    pendingShipments: await getPendingShipments(),
    customerCareList: await getCustomerCareList(),
    unpaidInvoices: await getUnpaidInvoices(),
    lowStockItems: await getLowStockItems()
  };

  // 發送LINE通知給老闆
  await sendLineBotNotification({
    type: 'daily_report',
    data: reportData,
    timestamp: new Date()
  });
}
```

---

## 💡 **Dashboard特色功能**

### **智慧提醒算法**
```typescript
// 客戶關懷智慧提醒
function calculateCustomerCareUrgency(customer: Customer): CareUrgency {
  const factors = {
    daysSinceLastContact: getDaysSince(customer.lastContact),
    customerValue: customer.lifetimeValue,
    lastOrderDate: getDaysSince(customer.lastOrder),
    isVIP: customer.isVIP,
    seasonalFactor: getSeasonalFactor(customer.category)
  };

  let urgencyScore = 0;

  // 基於最後聯絡時間
  if (factors.daysSinceLastContact > 90) urgencyScore += 30;
  else if (factors.daysSinceLastContact > 60) urgencyScore += 20;
  else if (factors.daysSinceLastContact > 30) urgencyScore += 10;

  // VIP客戶加權
  if (factors.isVIP) urgencyScore *= 1.5;

  // 高價值客戶加權
  if (factors.customerValue > 500000) urgencyScore *= 1.3;

  // 季節性因素
  urgencyScore *= factors.seasonalFactor;

  if (urgencyScore >= 50) return 'critical';
  if (urgencyScore >= 30) return 'high';
  if (urgencyScore >= 15) return 'medium';
  return 'low';
}
```

這個Dashboard設計涵蓋了您提到的所有需求，並且特別考慮了LINE BOT整合和每日10點報告功能！接下來我會更新MISSING_UI_COMPONENTS.md文檔。