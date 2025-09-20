'use client'

import React from 'react'
import { Card, Row, Col, Statistic, Typography, Space, Button, List, Tag, Progress } from 'antd'
import {
  DollarOutlined,
  ShoppingOutlined,
  UserOutlined,
  AppstoreOutlined,
  LineChartOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  TrendingUpOutlined,
  PieChartOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import { Role } from '@/types/auth'
import SimpleLineChart from '@/components/charts/SimpleLineChart'
import SimplePieChart from '@/components/charts/SimplePieChart'

const { Title, Text } = Typography

export default function Dashboard() {
  const { data: session } = useSession()

  // 根據角色顯示不同的Dashboard內容
  const renderDashboardByRole = () => {
    if (!session?.user?.role) {
      return <div>載入中...</div>
    }

    switch (session.user.role) {
      case Role.SUPER_ADMIN:
        return <SuperAdminDashboard />
      case Role.INVESTOR:
        return <InvestorDashboard />
      case Role.EMPLOYEE:
        return <EmployeeDashboard />
      default:
        return <div>角色未識別</div>
    }
  }

  return (
    <div style={{ padding: 0 }}>
      <Title level={2} style={{ marginBottom: 24 }}>
        歡迎回來，{session?.user?.name}
      </Title>
      {renderDashboardByRole()}
    </div>
  )
}

// 超級管理員Dashboard
function SuperAdminDashboard() {
  const mockData = {
    totalRevenue: 2450000,
    personalRevenue: 680000,
    investmentRevenue: 1770000,
    commission: 245000,
    stockValue: 8900000,
    stockCount: 1250,
    pendingReceivables: 420000,
    lowStockItems: [
      { name: '山崎18年威士忌', stock: 3, minStock: 10 },
      { name: '響21年威士忌', stock: 1, minStock: 5 },
      { name: '白州12年威士忌', stock: 2, minStock: 8 }
    ],
    // 新增圖表數據
    revenueChart: [
      { month: '1月', value: 1850000 },
      { month: '2月', value: 2100000 },
      { month: '3月', value: 2450000 },
      { month: '4月', value: 2200000 },
      { month: '5月', value: 2680000 },
      { month: '6月', value: 2950000 }
    ],
    categoryChart: [
      { name: '威士忌', value: 1200000, color: '#1890ff' },
      { name: '清酒', value: 680000, color: '#52c41a' },
      { name: '葡萄酒', value: 420000, color: '#faad14' },
      { name: '香檳', value: 150000, color: '#722ed1' }
    ],
    customerChart: [
      { name: 'VIP客戶', value: 45, color: '#f5222d' },
      { name: '優質客戶', value: 128, color: '#fa541c' },
      { name: '一般客戶', value: 256, color: '#1890ff' },
      { name: '新客戶', value: 89, color: '#52c41a' }
    ]
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* KPI 總覽 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="總營收"
              value={mockData.totalRevenue}
              precision={0}
              prefix={<DollarOutlined />}
              suffix="元"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="個人調貨營收"
              value={mockData.personalRevenue}
              precision={0}
              prefix={<LineChartOutlined />}
              suffix="元"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="庫存價值"
              value={mockData.stockValue}
              precision={0}
              prefix={<AppstoreOutlined />}
              suffix="元"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待收款項"
              value={mockData.pendingReceivables}
              precision={0}
              prefix={<DollarOutlined />}
              suffix="元"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 圖表區域 */}
      <Row gutter={[16, 16]}>
        {/* 營收趨勢圖 */}
        <Col xs={24} lg={12}>
          <SimpleLineChart
            title="營收趨勢分析"
            data={mockData.revenueChart}
            prefix="NT$ "
            height={250}
          />
        </Col>

        {/* 商品類別銷售分布 */}
        <Col xs={24} lg={12}>
          <SimplePieChart
            title="商品類別銷售分布"
            data={mockData.categoryChart}
            height={250}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 客戶分布圖 */}
        <Col xs={24} lg={8}>
          <SimplePieChart
            title="客戶分布"
            data={mockData.customerChart}
            height={200}
          />
        </Col>

        {/* 快速操作 */}
        <Col xs={24} lg={8}>
          <Card title="快速操作" extra={<Button type="link">更多</Button>}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button type="primary" icon={<PlusOutlined />} block>
                新增採購單
              </Button>
              <Button icon={<ShoppingOutlined />} block>
                AI 報單辨識
              </Button>
              <Button icon={<UserOutlined />} block>
                新增客戶
              </Button>
              <Button icon={<AppstoreOutlined />} block>
                庫存調撥
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 低庫存警報 */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <WarningOutlined style={{ color: '#faad14' }} />
                <span>低庫存警報</span>
              </Space>
            }
            extra={<Button type="link">查看全部</Button>}
          >
            <List
              size="small"
              dataSource={mockData.lowStockItems}
              renderItem={(item) => (
                <List.Item>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text strong>{item.name}</Text>
                      <Tag color="orange">剩餘 {item.stock}</Tag>
                    </div>
                    <Progress
                      percent={(item.stock / item.minStock) * 100}
                      size="small"
                      status={item.stock < item.minStock ? 'exception' : 'normal'}
                    />
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  )
}

// 投資方Dashboard
function InvestorDashboard() {
  const mockData = {
    investmentRevenue: 1770000, // 只顯示投資項目的調整後營收
    investmentProfit: 354000,   // 基於顯示價格計算的獲利
    investmentStock: 890,
    monthlyTrend: [
      { month: '1月', revenue: 1200000, profit: 240000 },
      { month: '2月', revenue: 1500000, profit: 300000 },
      { month: '3月', revenue: 1770000, profit: 354000 }
    ],
    // 新增圖表數據 (投資方專用，隱藏真實數據)
    investmentChart: [
      { month: '1月', value: 240000 },
      { month: '2月', value: 300000 },
      { month: '3月', value: 354000 },
      { month: '4月', value: 390000 },
      { month: '5月', value: 420000 },
      { month: '6月', value: 450000 }
    ],
    productChart: [
      { name: '威士忌', value: 180000, color: '#1890ff' },
      { name: '清酒', value: 120000, color: '#52c41a' },
      { name: '葡萄酒', value: 54000, color: '#faad14' }
    ]
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* 投資方 KPI */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="投資項目營收"
              value={mockData.investmentRevenue}
              precision={0}
              prefix={<DollarOutlined />}
              suffix="元"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="投資獲利"
              value={mockData.investmentProfit}
              precision={0}
              prefix={<LineChartOutlined />}
              suffix="元"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="投資商品庫存"
              value={mockData.investmentStock}
              prefix={<AppstoreOutlined />}
              suffix="瓶"
            />
          </Card>
        </Col>
      </Row>

      {/* 投資方圖表區域 */}
      <Row gutter={[16, 16]}>
        {/* 投資獲利趨勢 */}
        <Col xs={24} lg={16}>
          <SimpleLineChart
            title="投資獲利趨勢"
            data={mockData.investmentChart}
            prefix="NT$ "
            height={250}
          />
        </Col>

        {/* 投資商品分布 */}
        <Col xs={24} lg={8}>
          <SimplePieChart
            title="投資商品分布"
            data={mockData.productChart}
            height={250}
          />
        </Col>
      </Row>

      {/* 投資趨勢列表 */}
      <Card title="投資表現趨勢">
        <List
          dataSource={mockData.monthlyTrend}
          renderItem={(item) => (
            <List.Item>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Text strong>{item.month}</Text>
                <Space>
                  <Text>營收: ${item.revenue.toLocaleString()}</Text>
                  <Text type="success">獲利: ${item.profit.toLocaleString()}</Text>
                </Space>
              </Space>
            </List.Item>
          )}
        />
      </Card>
    </Space>
  )
}

// 員工Dashboard
function EmployeeDashboard() {
  const mockData = {
    todayTasks: [
      { id: 1, task: '處理客戶A的報價單', status: 'pending' },
      { id: 2, task: '更新山崎威士忌庫存', status: 'completed' },
      { id: 3, task: '確認本週到貨清單', status: 'pending' }
    ],
    recentOrders: [
      { id: 'SA001', customer: '客戶A', amount: 125000, status: 'processing' },
      { id: 'SA002', customer: '客戶B', amount: 89000, status: 'completed' }
    ]
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        {/* 今日待辦 */}
        <Col xs={24} lg={12}>
          <Card title="今日待辦事項" extra={<Button type="link">新增</Button>}>
            <List
              size="small"
              dataSource={mockData.todayTasks}
              renderItem={(item) => (
                <List.Item>
                  <Space>
                    {item.status === 'completed' ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : (
                      <WarningOutlined style={{ color: '#faad14' }} />
                    )}
                    <Text delete={item.status === 'completed'}>{item.task}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 最近訂單 */}
        <Col xs={24} lg={12}>
          <Card title="最近訂單" extra={<Button type="link">查看全部</Button>}>
            <List
              size="small"
              dataSource={mockData.recentOrders}
              renderItem={(item) => (
                <List.Item>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <div>
                      <Text strong>{item.id}</Text>
                      <br />
                      <Text type="secondary">{item.customer}</Text>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Text>${item.amount.toLocaleString()}</Text>
                      <br />
                      <Tag color={item.status === 'completed' ? 'green' : 'blue'}>
                        {item.status === 'completed' ? '已完成' : '處理中'}
                      </Tag>
                    </div>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  )
}