'use client'

import React from 'react'
import { Card, Row, Col, Statistic, Typography, Space, Button, List, Tag, Progress } from 'antd'
import {
  DollarOutlined,
  ShoppingOutlined,
  UserOutlined,
  InventoryOutlined,
  TrendingUpOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  PlusOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import { Role } from '@/types/auth'

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
              prefix={<TrendingUpOutlined />}
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
              prefix={<InventoryOutlined />}
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

      <Row gutter={[16, 16]}>
        {/* 快速操作 */}
        <Col xs={24} lg={12}>
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
              <Button icon={<InventoryOutlined />} block>
                庫存調撥
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 低庫存警報 */}
        <Col xs={24} lg={12}>
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
              prefix={<TrendingUpOutlined />}
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
              prefix={<InventoryOutlined />}
              suffix="瓶"
            />
          </Card>
        </Col>
      </Row>

      {/* 投資趨勢 */}
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