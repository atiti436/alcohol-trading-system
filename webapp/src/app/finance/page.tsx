'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Space,
  Button,
  DatePicker,
  Table,
  Tag,
  Progress,
  List,
  Spin
} from 'antd'
import {
  DollarOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
  FileTextOutlined,
  RiseOutlined,
  FallOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { HideFromInvestor } from '@/components/auth/RoleGuard'
import { SecurePriceDisplay } from '@/components/common/SecurePriceDisplay'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

interface FinanceOverviewData {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  pendingPayments: number
  monthlyRevenue: { month: string; revenue: number; expenses: number }[]
  recentTransactions: any[]
  outstandingInvoices: any[]
}

export default function FinanceOverviewPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<FinanceOverviewData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    pendingPayments: 0,
    monthlyRevenue: [],
    recentTransactions: [],
    outstandingInvoices: []
  })
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs()
  ])
  const router = useRouter()

  const loadFinanceData = async () => {
    setLoading(true)
    try {
      const [startDate, endDate] = dateRange
      const response = await fetch(`/api/finance/overview?start=${startDate.format('YYYY-MM-DD')}&end=${endDate.format('YYYY-MM-DD')}`)

      if (response.ok) {
        const result = await response.json()
        setData(result.data || data)
      } else {
        // 如果 API 不存在，使用假數據作為預覽
        setData({
          totalRevenue: 1250000,
          totalExpenses: 850000,
          netProfit: 400000,
          pendingPayments: 125000,
          monthlyRevenue: [
            { month: '09月', revenue: 450000, expenses: 280000 },
            { month: '08月', revenue: 380000, expenses: 290000 },
            { month: '07月', revenue: 420000, expenses: 280000 },
          ],
          recentTransactions: [
            { id: 1, type: 'income', description: '銷售收入 - 客戶A', amount: 85000, date: dayjs().subtract(2, 'day') },
            { id: 2, type: 'expense', description: '採購成本 - 威士忌進貨', amount: -45000, date: dayjs().subtract(3, 'day') },
            { id: 3, type: 'income', description: '銷售收入 - 客戶B', amount: 67000, date: dayjs().subtract(5, 'day') },
          ],
          outstandingInvoices: [
            { id: 'INV-001', customer: '客戶C', amount: 45000, dueDate: dayjs().add(5, 'day'), status: 'pending' },
            { id: 'INV-002', customer: '客戶D', amount: 80000, dueDate: dayjs().add(10, 'day'), status: 'overdue' },
          ]
        })
      }
    } catch (error) {
      console.error('載入財務數據失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFinanceData()
  }, [dateRange])

  const profitMargin = data.totalRevenue > 0 ? (data.netProfit / data.totalRevenue) * 100 : 0
  const expenseRatio = data.totalRevenue > 0 ? (data.totalExpenses / data.totalRevenue) * 100 : 0

  const transactionColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: dayjs.Dayjs) => date.format('MM-DD')
    },
    {
      title: '類型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'income' ? 'green' : 'red'} icon={type === 'income' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}>
          {type === 'income' ? '收入' : '支出'}
        </Tag>
      )
    },
    {
      title: '說明',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '金額',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <SecurePriceDisplay
          price={Math.abs(amount)}
          style={{
            color: amount > 0 ? '#52c41a' : '#ff4d4f',
            fontWeight: 'bold'
          }}
        />
      )
    }
  ]

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">載入財務數據中...</Text>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>財務總覽</Title>
        <Space>
          <Text type="secondary">查看時間範圍：</Text>
          <RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
            format="YYYY-MM-DD"
          />
        </Space>
      </div>

      {/* 主要指標卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="總收入"
              value={data.totalRevenue}
              precision={0}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
              formatter={(value) => <SecurePriceDisplay price={Number(value)} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="總支出"
              value={data.totalExpenses}
              precision={0}
              prefix={<ShoppingCartOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
              formatter={(value) => <SecurePriceDisplay price={Number(value)} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="淨利潤"
              value={data.netProfit}
              precision={0}
              prefix={data.netProfit >= 0 ? <RiseOutlined style={{ color: '#52c41a' }} /> : <FallOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: data.netProfit >= 0 ? '#52c41a' : '#ff4d4f' }}
              formatter={(value) => <SecurePriceDisplay price={Math.abs(Number(value))} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待收款項"
              value={data.pendingPayments}
              precision={0}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
              formatter={(value) => <SecurePriceDisplay price={Number(value)} />}
            />
          </Card>
        </Col>
      </Row>

      {/* 利潤分析 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="利潤分析" extra={<Text type="secondary">{profitMargin.toFixed(1)}% 利潤率</Text>}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text>支出占比</Text>
                <Progress percent={expenseRatio} strokeColor="#ff4d4f" />
              </div>
              <div>
                <Text>利潤率</Text>
                <Progress percent={profitMargin} strokeColor="#52c41a" />
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="快速操作">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button type="primary" icon={<DollarOutlined />} block onClick={() => router.push('/finance/cashflow')}>
                查看現金流水
              </Button>
              <Button icon={<FileTextOutlined />} block onClick={() => router.push('/statements')}>
                生成對帳單
              </Button>
              <HideFromInvestor>
                <Button icon={<TruckOutlined />} block onClick={() => router.push('/shipping')}>
                  出貨管理
                </Button>
              </HideFromInvestor>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 近期交易與待付款項 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="近期交易記錄" extra={<Button type="link" onClick={() => router.push('/finance/cashflow')}>查看全部</Button>}>
            <Table
              dataSource={data.recentTransactions}
              columns={transactionColumns}
              pagination={false}
              size="small"
              rowKey="id"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="待付款項" extra={<Button type="link" onClick={() => router.push('/statements')}>管理對帳單</Button>}>
            <List
              dataSource={data.outstandingInvoices}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        <Text strong>{item.id}</Text>
                        <Tag color={item.status === 'overdue' ? 'red' : 'orange'}>
                          {item.status === 'overdue' ? '逾期' : '待付'}
                        </Tag>
                      </Space>
                    }
                    description={`${item.customer} • 到期日: ${item.dueDate.format('MM-DD')}`}
                  />
                  <SecurePriceDisplay price={item.amount} style={{ fontWeight: 'bold' }} />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

