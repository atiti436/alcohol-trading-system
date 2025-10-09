'use client'

import React, { useState, useEffect, useCallback } from 'react'
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

  const loadFinanceData = useCallback(async () => {
    setLoading(true)
    try {
      const [startDate, endDate] = dateRange
      const response = await fetch(`/api/finance/overview?start=${startDate.format('YYYY-MM-DD')}&end=${endDate.format('YYYY-MM-DD')}`)

      const result = await response.json()

      if (response.ok && result.success) {
        // 🔗 使用真實數據，不再有假數據
        setData({
          totalRevenue: result.data.totalRevenue || 0,
          totalExpenses: result.data.totalExpenses || 0,
          netProfit: result.data.netProfit || 0,
          pendingPayments: result.data.pendingPayments || 0,
          monthlyRevenue: result.data.monthlyRevenue || [],
          recentTransactions: (result.data.recentTransactions || []).map((tx: any) => ({
            ...tx,
            date: dayjs(tx.date)
          })),
          outstandingInvoices: (result.data.outstandingInvoices || []).map((invoice: any) => ({
            ...invoice,
            dueDate: dayjs(invoice.dueDate)
          }))
        })
      } else {
        console.error('財務數據載入失敗:', result.error)
        // 顯示空數據而非假數據
        setData({
          totalRevenue: 0,
          totalExpenses: 0,
          netProfit: 0,
          pendingPayments: 0,
          monthlyRevenue: [],
          recentTransactions: [],
          outstandingInvoices: []
        })
      }
    } catch (error) {
      console.error('載入財務數據失敗:', error)
      // 網路錯誤時也顯示空數據
      setData({
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        pendingPayments: 0,
        monthlyRevenue: [],
        recentTransactions: [],
        outstandingInvoices: []
      })
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    loadFinanceData()
  }, [loadFinanceData])

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
          amount={Math.abs(amount)}
          className={amount > 0 ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}
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
              prefix={<DollarOutlined className="text-green-500" />}
              valueStyle={{ color: '#52c41a' }}
              formatter={(value) => <SecurePriceDisplay amount={Number(value)} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="總支出"
              value={data.totalExpenses}
              precision={0}
              prefix={<ShoppingCartOutlined className="text-red-500" />}
              valueStyle={{ color: '#ff4d4f' }}
              formatter={(value) => <SecurePriceDisplay amount={Number(value)} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="淨利潤"
              value={data.netProfit}
              precision={0}
              prefix={data.netProfit >= 0 ? <RiseOutlined className="text-green-500" /> : <FallOutlined className="text-red-500" />}
              className={data.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}
              formatter={(value) => <SecurePriceDisplay amount={Math.abs(Number(value))} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待收款項"
              value={data.pendingPayments}
              precision={0}
              prefix={<ClockCircleOutlined className="text-orange-400" />}
              valueStyle={{ color: '#faad14' }}
              formatter={(value) => <SecurePriceDisplay amount={Number(value)} />}
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
                  <SecurePriceDisplay amount={item.amount} style={{ fontWeight: 'bold' }} />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

