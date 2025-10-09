'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Card, Row, Col, Statistic, Typography, Space, Button, List, Tag, Progress, Spin, message } from 'antd'
import {
  DollarOutlined,
  ShoppingOutlined,
  UserOutlined,
  AppstoreOutlined,
  LineChartOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  RiseOutlined,
  PieChartOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Role } from '@/types/auth'
import SimpleLineChart from '@/components/charts/SimpleLineChart'
import SimplePieChart from '@/components/charts/SimplePieChart'
import PendingApprovalDashboard from '@/components/dashboard/PendingApprovalDashboard'
import PreorderWidget from '@/components/dashboard/PreorderWidget'
import dayjs from 'dayjs'

const { Title, Text } = Typography

export default function Dashboard() {
  const { data: session } = useSession()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // 載入Dashboard數據
  const loadDashboardData = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      const response = await fetch('/api/dashboard')

      if (!response.ok) {
        throw new Error('載入Dashboard資料失敗')
      }

      const result = await response.json()

      if (result.success) {
        setDashboardData(result.data)
      } else {
        message.error(result.error?.message || '載入Dashboard資料失敗')
      }
    } catch (error) {
      console.error('Dashboard載入錯誤:', error)
      message.error('載入Dashboard資料失敗')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // 根據角色顯示不同的Dashboard內容
  const renderDashboardByRole = () => {
    if (!session?.user?.role) {
      return <div>載入中...</div>
    }

    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>正在載入Dashboard資料...</div>
        </div>
      )
    }

    if (!dashboardData) {
      return <div>無法載入Dashboard資料</div>
    }

    switch (session.user.role) {
      case Role.SUPER_ADMIN:
        return <SuperAdminDashboard data={dashboardData} />
      case Role.INVESTOR:
        return <InvestorDashboard data={dashboardData} />
      case Role.EMPLOYEE:
        return <EmployeeDashboard data={dashboardData} />
      case Role.PENDING:
        return <PendingApprovalDashboard />
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
function SuperAdminDashboard({ data }: { data: any }) {
  const router = useRouter()

  // 處理圖表數據格式
  const revenueChart = data.salesTrend?.map((trend: any) => ({
    month: trend.month,
    value: trend.revenue || 0
  })) || [
    // 如果沒有數據，顯示最近6個月的0值數據
    { month: dayjs().subtract(5, 'month').format('YYYY-MM'), value: 0 },
    { month: dayjs().subtract(4, 'month').format('YYYY-MM'), value: 0 },
    { month: dayjs().subtract(3, 'month').format('YYYY-MM'), value: 0 },
    { month: dayjs().subtract(2, 'month').format('YYYY-MM'), value: 0 },
    { month: dayjs().subtract(1, 'month').format('YYYY-MM'), value: 0 },
    { month: dayjs().format('YYYY-MM'), value: 0 }
  ]

  // 商品類別分布 - 使用真實數據或顯示空狀態
  const categoryChart = data.categoryDistribution?.length > 0 ? data.categoryDistribution : [
    { name: '暫無數據', value: 1, color: '#d9d9d9' }
  ]

  // 客戶分布 - 使用真實數據或顯示空狀態
  const customerChart = data.customerDistribution?.length > 0 ? data.customerDistribution : [
    { name: '暫無數據', value: 1, color: '#d9d9d9' }
  ]

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* KPI 總覽 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="總營收"
              value={data.totalRevenue || 0}
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
              value={data.personalRevenue || 0}
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
              value={data.stockValue || 0}
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
              value={data.pendingReceivables || 0}
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
            data={revenueChart}
            prefix="NT$ "
            height={250}
          />
        </Col>

        {/* 商品類別銷售分布 */}
        <Col xs={24} lg={12}>
          <SimplePieChart
            title="商品類別銷售分布"
            data={categoryChart}
            height={250}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 客戶分布圖 */}
        <Col xs={24} lg={8}>
          <SimplePieChart
            title="客戶分布"
            data={customerChart}
            height={200}
          />
        </Col>

        {/* 預購提醒 */}
        <Col xs={24} lg={8}>
          <PreorderWidget />
        </Col>

        {/* 快速操作 */}
        <Col xs={24} lg={8}>
          <Card title="快速操作" extra={<Button type="link">更多</Button>}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                block
                onClick={() => router.push('/purchases')}
              >
                新增採購單
              </Button>
              <Button
                icon={<ShoppingOutlined />}
                block
                onClick={() => alert('AI 報單辨識功能開發中...')}
              >
                AI 報單辨識
              </Button>
              <Button
                icon={<UserOutlined />}
                block
                onClick={() => router.push('/customers')}
              >
                新增客戶
              </Button>
              <Button
                icon={<AppstoreOutlined />}
                block
                onClick={() => router.push('/inventory')}
              >
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
                <WarningOutlined className="text-orange-400" />
                <span>低庫存警報</span>
              </Space>
            }
            extra={<Button type="link">查看全部</Button>}
          >
            <List
              size="small"
              dataSource={data.lowStockItems || []}
              renderItem={(item: any) => (
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
function InvestorDashboard({ data }: { data: any }) {
  // 處理投資獲利趨勢圖表數據
  const investmentChart = data.monthlyTrend?.map((trend: any) => ({
    month: trend.month,
    value: trend.profit
  })) || []

  // 商品分布數據 - 使用真實數據或顯示空狀態
  const productChart = data.categoryDistribution?.length > 0 ? data.categoryDistribution : [
    { name: '暫無數據', value: 1, color: '#d9d9d9' }
  ]

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* 投資方 KPI */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="投資項目營收"
              value={data.investmentRevenue || 0}
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
              value={data.investmentProfit || 0}
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
              value={data.investmentStock || 0}
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
            data={investmentChart}
            prefix="NT$ "
            height={250}
          />
        </Col>

        {/* 投資商品分布 */}
        <Col xs={24} lg={8}>
          <SimplePieChart
            title="投資商品分布"
            data={productChart}
            height={250}
          />
        </Col>
      </Row>

      {/* 投資趨勢列表 */}
      <Card title="投資表現趨勢">
        <List
          dataSource={data.monthlyTrend || []}
          renderItem={(item: any) => (
            <List.Item>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Text strong>{item.month}</Text>
                <Space>
                  <Text>營收: ${item.revenue?.toLocaleString() || 0}</Text>
                  <Text type="success">獲利: ${item.profit?.toLocaleString() || 0}</Text>
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
function EmployeeDashboard({ data }: { data: any }) {

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        {/* 今日待辦 */}
        <Col xs={24} lg={12}>
          <Card title="今日待辦事項" extra={<Button type="link">新增</Button>}>
            <List
              size="small"
              dataSource={data.todayTasks || []}
              renderItem={(item: any) => (
                <List.Item>
                  <Space>
                    {item.status === 'completed' ? (
                      <CheckCircleOutlined className="text-green-500" />
                    ) : (
                      <WarningOutlined className="text-orange-400" />
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
              dataSource={data.recentOrders || []}
              renderItem={(item: any) => (
                <List.Item>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <div>
                      <Text strong>{item.id}</Text>
                      <br />
                      <Text type="secondary">{item.customer}</Text>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Text>${item.amount?.toLocaleString() || 0}</Text>
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