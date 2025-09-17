'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Select,
  DatePicker,
  Button,
  Space,
  Spin,
  Alert,
  Statistic,
  Row,
  Col,
  Tag,
  Progress,
  Typography,
  Tooltip
} from 'antd'
import {
  FileTextOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  DownloadOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import dayjs from 'dayjs'
import { HideFromInvestor, SuperAdminOnly } from '@/components/auth/RoleGuard'
import { SecurePriceDisplay } from '@/components/common/SecurePriceDisplay'

const { Option } = Select
const { Title, Text } = Typography

interface AgeingData {
  period: string
  amount: number
  count: number
  percentage?: number
}

interface AccountsReceivableSummary {
  totalOutstanding: { amount: number; count: number }
  totalOverdue: { amount: number; count: number }
  totalPaid: { amount: number; count: number }
  ageingAnalysis: AgeingData[]
}

interface CustomerAR {
  id: string
  customer: {
    customer_code: string
    name: string
    company?: string
    tier: string
  }
  originalAmount: number
  remainingAmount: number
  daysPastDue: number
  status: string
  dueDate: string
  sale: {
    saleNumber: string
    createdAt: string
  }
}

/**
 * 📊 帳齡分析報表組件
 * 提供應收帳款的帳齡分析和催收管理
 * 🔒 投資方只能看到調整後的金額數據
 */
export default function AgeingAnalysisReport() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [summaryData, setSummaryData] = useState<AccountsReceivableSummary | null>(null)
  const [detailData, setDetailData] = useState<CustomerAR[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<string>()

  // 載入帳齡分析數據
  const loadAgeingAnalysis = async () => {
    setLoading(true)
    try {
      // 載入摘要數據
      const summaryResponse = await fetch('/api/accounts-receivable?summary=true')
      const summaryResult = await summaryResponse.json()

      if (summaryResult.success) {
        // 計算百分比
        const totalAmount = summaryResult.data.ageingAnalysis.reduce(
          (sum: number, item: AgeingData) => sum + item.amount, 0
        )

        const analysisWithPercentage = summaryResult.data.ageingAnalysis.map(
          (item: AgeingData) => ({
            ...item,
            percentage: totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0
          })
        )

        setSummaryData({
          ...summaryResult.data,
          ageingAnalysis: analysisWithPercentage
        })
      }

      // 載入詳細數據
      const params = new URLSearchParams()
      if (selectedPeriod !== 'all') {
        params.append('status', selectedPeriod === 'overdue' ? 'OVERDUE' : 'OUTSTANDING')
      }
      if (selectedCustomer) {
        params.append('customerId', selectedCustomer)
      }

      const detailResponse = await fetch(`/api/accounts-receivable?${params}`)
      const detailResult = await detailResponse.json()

      if (detailResult.success) {
        setDetailData(detailResult.data.accountsReceivable)
      }

    } catch (error) {
      console.error('載入帳齡分析失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAgeingAnalysis()
  }, [selectedPeriod, selectedCustomer])

  // 帳齡分析表格欄位
  const ageingColumns = [
    {
      title: '帳齡區間',
      dataIndex: 'period',
      key: 'period',
      render: (period: string) => (
        <Tag color={getAgeColor(period)}>{period}</Tag>
      )
    },
    {
      title: '金額',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (amount: number) => (
        <SecurePriceDisplay
          amount={amount}
          allowedRoles={['SUPER_ADMIN', 'EMPLOYEE']}
          displayMultiplier={session?.user?.role === 'INVESTOR' ? 0.8 : 1}
        />
      )
    },
    {
      title: '筆數',
      dataIndex: 'count',
      key: 'count',
      align: 'center' as const
    },
    {
      title: '佔比',
      dataIndex: 'percentage',
      key: 'percentage',
      align: 'right' as const,
      render: (percentage: number) => (
        <div>
          <Progress
            percent={percentage}
            size="small"
            showInfo={false}
            strokeColor={getAgeColor('')}
          />
          <Text style={{ fontSize: '12px' }}>
            {percentage.toFixed(1)}%
          </Text>
        </div>
      )
    }
  ]

  // 應收帳款明細表格
  const detailColumns = [
    {
      title: '客戶',
      key: 'customer',
      render: (record: CustomerAR) => (
        <div>
          <Text strong>{record.customer.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.customer.customer_code}
          </Text>
          <Tag color={getTierColor(record.customer.tier)} size="small">
            {record.customer.tier}
          </Tag>
        </div>
      )
    },
    {
      title: '銷售單號',
      dataIndex: ['sale', 'saleNumber'],
      key: 'saleNumber'
    },
    {
      title: '原始金額',
      dataIndex: 'originalAmount',
      key: 'originalAmount',
      align: 'right' as const,
      render: (amount: number) => (
        <SecurePriceDisplay
          amount={amount}
          allowedRoles={['SUPER_ADMIN', 'EMPLOYEE']}
          displayMultiplier={session?.user?.role === 'INVESTOR' ? 0.8 : 1}
        />
      )
    },
    {
      title: '剩餘金額',
      dataIndex: 'remainingAmount',
      key: 'remainingAmount',
      align: 'right' as const,
      render: (amount: number) => (
        <SecurePriceDisplay
          amount={amount}
          allowedRoles={['SUPER_ADMIN', 'EMPLOYEE']}
          displayMultiplier={session?.user?.role === 'INVESTOR' ? 0.8 : 1}
        />
      )
    },
    {
      title: '逾期天數',
      dataIndex: 'daysPastDue',
      key: 'daysPastDue',
      align: 'center' as const,
      render: (days: number) => (
        <Tag color={days > 30 ? 'red' : days > 0 ? 'orange' : 'green'}>
          {days > 0 ? `${days}天` : '未到期'}
        </Tag>
      )
    },
    {
      title: '到期日',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string) => dayjs(date).format('YYYY/MM/DD')
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusName(status)}
        </Tag>
      )
    }
  ]

  // 顏色輔助函數
  const getAgeColor = (period: string) => {
    if (period.includes('未到期')) return 'green'
    if (period.includes('1-30')) return 'blue'
    if (period.includes('31-60')) return 'orange'
    if (period.includes('61-90')) return 'red'
    if (period.includes('90天以上')) return 'purple'
    return 'default'
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'VIP': return 'gold'
      case 'PREMIUM': return 'purple'
      case 'REGULAR': return 'blue'
      case 'NEW': return 'green'
      default: return 'default'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OUTSTANDING': return 'blue'
      case 'OVERDUE': return 'red'
      case 'PARTIAL': return 'orange'
      case 'PAID': return 'green'
      default: return 'default'
    }
  }

  const getStatusName = (status: string) => {
    const names: { [key: string]: string } = {
      'OUTSTANDING': '未收',
      'OVERDUE': '逾期',
      'PARTIAL': '部分收款',
      'PAID': '已收'
    }
    return names[status] || status
  }

  if (!summaryData) {
    return <Spin size="large" />
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 摘要卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="未收帳款"
              value={summaryData.totalOutstanding.amount}
              prefix={<DollarOutlined style={{ color: '#1890ff' }} />}
              formatter={(value) => (
                <SecurePriceDisplay
                  amount={Number(value)}
                  allowedRoles={['SUPER_ADMIN', 'EMPLOYEE']}
                  displayMultiplier={session?.user?.role === 'INVESTOR' ? 0.8 : 1}
                />
              )}
            />
            <Text type="secondary">
              {summaryData.totalOutstanding.count} 筆
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="逾期帳款"
              value={summaryData.totalOverdue.amount}
              prefix={<ExclamationCircleOutlined style={{ color: '#f5222d' }} />}
              formatter={(value) => (
                <SecurePriceDisplay
                  amount={Number(value)}
                  allowedRoles={['SUPER_ADMIN', 'EMPLOYEE']}
                  displayMultiplier={session?.user?.role === 'INVESTOR' ? 0.8 : 1}
                />
              )}
            />
            <Text type="secondary">
              {summaryData.totalOverdue.count} 筆
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="已收帳款"
              value={summaryData.totalPaid.amount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              formatter={(value) => (
                <SecurePriceDisplay
                  amount={Number(value)}
                  allowedRoles={['SUPER_ADMIN', 'EMPLOYEE']}
                  displayMultiplier={session?.user?.role === 'INVESTOR' ? 0.8 : 1}
                />
              )}
            />
            <Text type="secondary">
              {summaryData.totalPaid.count} 筆
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="收款率"
              value={
                summaryData.totalPaid.amount /
                (summaryData.totalPaid.amount + summaryData.totalOutstanding.amount) * 100
              }
              precision={1}
              suffix="%"
              prefix={<ClockCircleOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* 帳齡分析表 */}
      <Card
        title={
          <div>
            <FileTextOutlined /> 帳齡分析
          </div>
        }
        extra={
          <Space>
            <Select
              value={selectedPeriod}
              style={{ width: 120 }}
              onChange={setSelectedPeriod}
            >
              <Option value="all">全部</Option>
              <Option value="outstanding">未收</Option>
              <Option value="overdue">逾期</Option>
            </Select>
            <HideFromInvestor>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => {/* 導出功能 */}}
              >
                導出報表
              </Button>
            </HideFromInvestor>
          </Space>
        }
        style={{ marginBottom: '24px' }}
      >
        <Table
          columns={ageingColumns}
          dataSource={summaryData.ageingAnalysis}
          pagination={false}
          size="small"
          rowKey="period"
        />
      </Card>

      {/* 應收帳款明細 */}
      <Card
        title="應收帳款明細"
        loading={loading}
      >
        <Table
          columns={detailColumns}
          dataSource={detailData}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 項，共 ${total} 項`,
          }}
          size="small"
        />
      </Card>
    </div>
  )
}