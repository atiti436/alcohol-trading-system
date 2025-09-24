'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  DatePicker,
  Space,
  Button,
  Table,
  Typography,
  Spin,
  message,
  Tabs,
  Progress
} from 'antd'
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  TrophyOutlined,
  DollarOutlined,
  ShoppingOutlined,
  UserOutlined,
  CalendarOutlined,
  DownloadOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import dayjs, { Dayjs } from 'dayjs'
import { HideFromInvestor, SuperAdminOnly } from '@/components/auth/RoleGuard'
import { SecurePriceDisplay } from '@/components/common/SecurePriceDisplay'

const { Option } = Select
const { RangePicker } = DatePicker
const { Title, Text } = Typography
const { TabPane } = Tabs

interface OverviewData {
  overview: {
    totalSales: number
    totalCustomers: number
    totalProducts: number
    totalRevenue: number
    totalActualRevenue?: number
    totalCommission?: number
  }
  dailyTrend: Array<{
    date: string
    sales: number
    revenue: number
    actualRevenue?: number
  }>
  topProducts: Array<{
    name: string
    product_code: string
    category: string
    totalQuantity: number
    totalRevenue: number
  }>
}

interface TrendData {
  period: string
  trend: Array<{
    period: string
    sales: number
    revenue: number
    actualRevenue?: number
    commission?: number
  }>
}

interface ProductAnalysisData {
  products: Array<{
    name: string
    product_code: string
    category: string
    salesCount: number
    totalQuantity: number
    revenue: number
    actualRevenue?: number
    profit?: number
  }>
  categories: Array<{
    category: string
    salesCount: number
    totalQuantity: number
    revenue: number
    actualRevenue: number
  }>
}

interface CustomerAnalysisData {
  customers: Array<{
    name: string
    customer_code: string
    company?: string
    tier: string
    salesCount: number
    revenue: number
    actualRevenue?: number
    averageOrderValue: number
  }>
}

/**
 * 📊 Room-5: 報表圖表頁面
 * 核心功能：銷售統計圖表 + 數據分析 + 投資方數據隔離
 */
export default function ReportsPage() {
  const { data: session } = useSession()

  // 狀態管理
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>()
  const [period, setPeriod] = useState('month')

  // 數據狀態
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null)
  const [trendData, setTrendData] = useState<TrendData | null>(null)
  const [productData, setProductData] = useState<ProductAnalysisData | null>(null)
  const [customerData, setCustomerData] = useState<CustomerAnalysisData | null>(null)

  useEffect(() => {
    // 預設為最近3個月
    const now = dayjs()
    const threeMonthsAgo = now.subtract(3, 'month')
    setDateRange([threeMonthsAgo, now])
  }, [])

  useEffect(() => {
    if (dateRange) {
      loadReportData()
    }
  }, [activeTab, dateRange, period, loadReportData])

  // 載入報表數據
  const loadReportData = useCallback(async () => {
    if (!dateRange) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        type: activeTab,
        dateFrom: dateRange[0].toISOString(),
        dateTo: dateRange[1].toISOString(),
        period: period
      })

      const response = await fetch(`/api/reports?${params}`)
      const result = await response.json()

      if (result.success) {
        switch (activeTab) {
          case 'overview':
            setOverviewData(result.data)
            break
          case 'sales-trend':
            setTrendData(result.data)
            break
          case 'product-analysis':
            setProductData(result.data)
            break
          case 'customer-analysis':
            setCustomerData(result.data)
            break
        }
      } else {
        message.error(result.error || '載入報表數據失敗')
      }
    } catch (error) {
      console.error('載入報表數據失敗:', error)
      message.error('載入報表數據失敗')
    } finally {
      setLoading(false)
    }
  }, [activeTab, dateRange, period, loadReportData])

  // 導出報表
  const exportReport = () => {
    message.info('報表導出功能開發中...')
  }

  // 總覽報表組件
  const OverviewReport = () => (
    <Spin spinning={loading}>
      {overviewData && (
        <div>
          {/* 關鍵指標 */}
          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="總銷售筆數"
                  value={overviewData.overview.totalSales}
                  prefix={<ShoppingOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="活躍客戶數"
                  value={overviewData.overview.totalCustomers}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="銷售總額"
                  value={overviewData.overview.totalRevenue}
                  prefix={<DollarOutlined />}
                  formatter={(value) => `NT$ ${(value as number).toLocaleString()}`}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <SuperAdminOnly>
                <Card>
                  <Statistic
                    title="實收總額"
                    value={overviewData.overview.totalActualRevenue || overviewData.overview.totalRevenue}
                    prefix={<DollarOutlined />}
                    formatter={(value) => `NT$ ${(value as number).toLocaleString()}`}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Card>
              </SuperAdminOnly>
              <HideFromInvestor>
                <Card>
                  <Statistic
                    title="總佣金"
                    value={overviewData.overview.totalCommission || 0}
                    prefix={<DollarOutlined />}
                    formatter={(value) => `NT$ ${(value as number).toLocaleString()}`}
                    valueStyle={{ color: '#f5222d' }}
                  />
                </Card>
              </HideFromInvestor>
            </Col>
          </Row>

          {/* 最近7天趨勢 */}
          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col span={16}>
              <Card title="最近7天銷售趨勢" extra={<LineChartOutlined />}>
                <div style={{ height: '300px', display: 'flex', alignItems: 'end', justifyContent: 'space-between' }}>
                  {overviewData.dailyTrend.map((day, index) => (
                    <div key={day.date} style={{ textAlign: 'center', flex: 1 }}>
                      <div
                        style={{
                          height: `${Math.max(20, (day.revenue / Math.max(...overviewData.dailyTrend.map(d => d.revenue))) * 200)}px`,
                          backgroundColor: '#1890ff',
                          margin: '0 2px',
                          borderRadius: '2px 2px 0 0'
                        }}
                      />
                      <div style={{ fontSize: '12px', marginTop: '5px' }}>
                        {dayjs(day.date).format('MM/DD')}
                      </div>
                      <div style={{ fontSize: '10px', color: '#666' }}>
                        {day.sales}筆
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
            <Col span={8}>
              <Card title="熱銷商品 TOP 5" extra={<TrophyOutlined />}>
                <div style={{ height: '300px', overflow: 'auto' }}>
                  {overviewData.topProducts.map((product, index) => (
                    <div key={product.product_code} style={{ marginBottom: '16px', padding: '8px', border: '1px solid #f0f0f0', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                            #{index + 1} {product.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {product.product_code} | {product.category}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 'bold', color: '#1890ff' }}>
                            {product.totalQuantity}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            <SecurePriceDisplay amount={product.totalRevenue} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      )}
    </Spin>
  )

  // 銷售趨勢報表組件
  const SalesTrendReport = () => (
    <Spin spinning={loading}>
      {trendData && (
        <Card title="銷售趨勢分析" extra={
          <Space>
            <Select value={period} onChange={setPeriod}>
              <Option value="day">日</Option>
              <Option value="week">週</Option>
              <Option value="month">月</Option>
              <Option value="quarter">季</Option>
              <Option value="year">年</Option>
            </Select>
          </Space>
        }>
          <Table
            dataSource={trendData.trend}
            rowKey="period"
            pagination={false}
            scroll={{ x: 800 }}
            columns={[
              {
                title: '期間',
                dataIndex: 'period',
                key: 'period'
              },
              {
                title: '銷售筆數',
                dataIndex: 'sales',
                key: 'sales',
                align: 'center'
              },
              {
                title: '銷售金額',
                dataIndex: 'revenue',
                key: 'revenue',
                align: 'right',
                render: (value) => <SecurePriceDisplay amount={value} />
              },
              {
                title: '實收金額',
                dataIndex: 'actualRevenue',
                key: 'actualRevenue',
                align: 'right',
                render: (value) => value !== undefined ? (
                  <SuperAdminOnly>
                    <SecurePriceDisplay amount={value} />
                  </SuperAdminOnly>
                ) : null
              },
              {
                title: '佣金',
                dataIndex: 'commission',
                key: 'commission',
                align: 'right',
                render: (value) => value !== undefined ? (
                  <SuperAdminOnly>
                    <SecurePriceDisplay amount={value} />
                  </SuperAdminOnly>
                ) : null
              }
            ]}
          />
        </Card>
      )}
    </Spin>
  )

  // 商品分析報表組件
  const ProductAnalysisReport = () => (
    <Spin spinning={loading}>
      {productData && (
        <div>
          {/* 分類統計 */}
          <Card title="商品分類統計" style={{ marginBottom: '24px' }}>
            <Row gutter={16}>
              {productData.categories.map(category => (
                <Col key={category.category} span={6} style={{ marginBottom: '16px' }}>
                  <Card size="small">
                    <Statistic
                      title={category.category}
                      value={category.totalQuantity}
                      suffix={`/ ${category.salesCount}筆`}
                    />
                    <div style={{ marginTop: '8px' }}>
                      <SecurePriceDisplay amount={category.revenue} />
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          {/* 商品明細 */}
          <Card title="商品銷售明細">
            <Table
              dataSource={productData.products}
              rowKey="product_code"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1000 }}
              columns={[
                {
                  title: '商品',
                  key: 'product',
                  render: (_: any, record: any) => (
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{record.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {record.product_code} | {record.category}
                      </div>
                    </div>
                  )
                },
                {
                  title: '銷售次數',
                  dataIndex: 'salesCount',
                  key: 'salesCount',
                  align: 'center'
                },
                {
                  title: '總銷量',
                  dataIndex: 'totalQuantity',
                  key: 'totalQuantity',
                  align: 'center'
                },
                {
                  title: '銷售金額',
                  dataIndex: 'revenue',
                  key: 'revenue',
                  align: 'right',
                  render: (value) => <SecurePriceDisplay amount={value} />
                },
                {
                  title: '實收金額',
                  dataIndex: 'actualRevenue',
                  key: 'actualRevenue',
                  align: 'right',
                  render: (value) => value !== undefined ? (
                    <SuperAdminOnly>
                      <SecurePriceDisplay amount={value} />
                    </SuperAdminOnly>
                  ) : null
                },
                {
                  title: '利潤',
                  dataIndex: 'profit',
                  key: 'profit',
                  align: 'right',
                  render: (value) => value !== undefined ? (
                    <SuperAdminOnly>
                      <SecurePriceDisplay
                        amount={value}
                        style={{ color: value > 0 ? '#52c41a' : '#f5222d' }}
                      />
                    </SuperAdminOnly>
                  ) : null
                }
              ]}
            />
          </Card>
        </div>
      )}
    </Spin>
  )

  // 客戶分析報表組件
  const CustomerAnalysisReport = () => (
    <Spin spinning={loading}>
      {customerData && (
        <Card title="客戶銷售分析">
          <Table
            dataSource={customerData.customers}
            rowKey="customer_code"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1000 }}
            columns={[
              {
                title: '客戶',
                key: 'customer',
                render: (_: any, record: any) => (
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{record.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {record.customer_code}
                      {record.company && ` | ${record.company}`}
                    </div>
                  </div>
                )
              },
              {
                title: '客戶等級',
                dataIndex: 'tier',
                key: 'tier',
                align: 'center'
              },
              {
                title: '購買次數',
                dataIndex: 'salesCount',
                key: 'salesCount',
                align: 'center'
              },
              {
                title: '銷售金額',
                dataIndex: 'revenue',
                key: 'revenue',
                align: 'right',
                render: (value) => <SecurePriceDisplay amount={value} />
              },
              {
                title: '實收金額',
                dataIndex: 'actualRevenue',
                key: 'actualRevenue',
                align: 'right',
                render: (value) => value !== undefined ? (
                  <SuperAdminOnly>
                    <SecurePriceDisplay amount={value} />
                  </SuperAdminOnly>
                ) : null
              },
              {
                title: '平均客單價',
                dataIndex: 'averageOrderValue',
                key: 'averageOrderValue',
                align: 'right',
                render: (value) => <SecurePriceDisplay amount={value} />
              }
            ]}
          />
        </Card>
      )}
    </Spin>
  )

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <Title level={2}>
            <BarChartOutlined style={{ marginRight: '8px' }} />
            銷售報表分析
          </Title>
          <Text type="secondary">
            銷售數據統計與趨勢分析，支援多維度數據視覺化
          </Text>
        </div>

        {/* 篩選條件 */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={12}>
            <div style={{ marginBottom: '8px' }}>
              <CalendarOutlined style={{ marginRight: '4px' }} />
              選擇期間
            </div>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs])}
              format="YYYY-MM-DD"
            />
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: '8px' }}>&nbsp;</div>
            <Space>
              <Button onClick={loadReportData} loading={loading}>
                重新載入
              </Button>
              <Button icon={<DownloadOutlined />} onClick={exportReport}>
                導出報表
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 報表內容 */}
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <BarChartOutlined />
                總覽報表
              </span>
            }
            key="overview"
          >
            <OverviewReport />
          </TabPane>

          <TabPane
            tab={
              <span>
                <LineChartOutlined />
                銷售趨勢
              </span>
            }
            key="sales-trend"
          >
            <SalesTrendReport />
          </TabPane>

          <TabPane
            tab={
              <span>
                <PieChartOutlined />
                商品分析
              </span>
            }
            key="product-analysis"
          >
            <ProductAnalysisReport />
          </TabPane>

          <TabPane
            tab={
              <span>
                <UserOutlined />
                客戶分析
              </span>
            }
            key="customer-analysis"
          >
            <CustomerAnalysisReport />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}