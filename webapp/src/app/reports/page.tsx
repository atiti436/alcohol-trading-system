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
  Progress,
  theme
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
import { exportToExcel, getStatusText, getFundingSourceText } from '@/utils/export'

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
  const { token } = theme.useToken()

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

  // 載入報表數據（放在依賴此函式的 useEffect 之前）
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
  }, [activeTab, dateRange, period])

  useEffect(() => {
    if (dateRange) {
      loadReportData()
    }
  }, [activeTab, dateRange, period, loadReportData])

  // 自動刷新：每 30 秒重新載入數據
  useEffect(() => {
    if (!dateRange) return

    const interval = setInterval(() => {
      loadReportData()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [dateRange, loadReportData])

  // 導出報表
  const exportReport = () => {
    try {
      const isInvestor = session?.user?.role === 'INVESTOR'
      const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'

      // 根據不同 tab 匯出不同資料
      switch (activeTab) {
        case 'overview':
          if (!overviewData) {
            message.warning('無資料可匯出')
            return
          }
          exportOverviewData(overviewData, isInvestor, isSuperAdmin)
          break

        case 'trend':
          if (!trendData) {
            message.warning('無資料可匯出')
            return
          }
          exportTrendData(trendData, isInvestor, isSuperAdmin)
          break

        case 'product':
          if (!productData) {
            message.warning('無資料可匯出')
            return
          }
          exportProductData(productData, isInvestor, isSuperAdmin)
          break

        case 'customer':
          if (!customerData) {
            message.warning('無資料可匯出')
            return
          }
          exportCustomerData(customerData, isInvestor, isSuperAdmin)
          break

        default:
          message.warning('未知的報表類型')
      }
    } catch (error) {
      console.error('匯出失敗:', error)
      message.error('匯出失敗：' + (error instanceof Error ? error.message : '未知錯誤'))
    }
  }

  // 匯出總覽報表
  const exportOverviewData = (data: OverviewData, isInvestor: boolean, isSuperAdmin: boolean) => {
    const exportData: any[] = []

    // 1. 關鍵指標
    const overview = {
      '報表類型': '總覽報表',
      '總銷售筆數': data.overview.totalSales,
      '總客戶數': data.overview.totalCustomers,
      '總商品數': data.overview.totalProducts,
      '總營業額': data.overview.totalRevenue
    }

    // 只有超級管理員能看到實收金額和傭金
    if (isSuperAdmin) {
      Object.assign(overview, {
        '總實收金額': data.overview.totalActualRevenue || 0,
        '總傭金': data.overview.totalCommission || 0
      })
    }

    exportData.push(overview)
    exportData.push({}) // 空行

    // 2. 每日趨勢
    const dailyTrend = data.dailyTrend.map(item => {
      const row: any = {
        '日期': item.date,
        '銷售筆數': item.sales,
        '營業額': item.revenue
      }

      if (isSuperAdmin && item.actualRevenue) {
        row['實收金額'] = item.actualRevenue
      }

      return row
    })

    // 3. 熱銷商品
    const topProducts = data.topProducts.map((item, index) => ({
      '排名': index + 1,
      '商品名稱': item.name,
      '商品編號': item.product_code,
      '類別': item.category,
      '銷售數量': item.totalQuantity,
      '營業額': item.totalRevenue
    }))

    const success = exportToExcel(
      [...exportData, ...dailyTrend, {}, ...topProducts],
      '總覽報表',
      '總覽'
    )

    if (success) {
      message.success('報表匯出成功')
    } else {
      message.error('報表匯出失敗')
    }
  }

  // 匯出趨勢報表
  const exportTrendData = (data: TrendData, isInvestor: boolean, isSuperAdmin: boolean) => {
    const exportData = data.trend.map(item => {
      const row: any = {
        '期間': item.period,
        '銷售筆數': item.sales,
        '營業額': item.revenue
      }

      if (isSuperAdmin) {
        row['實收金額'] = item.actualRevenue || 0
        row['傭金'] = item.commission || 0
      }

      return row
    })

    const success = exportToExcel(exportData, `${data.period}趨勢報表`, '趨勢分析')

    if (success) {
      message.success('趨勢報表匯出成功')
    } else {
      message.error('趨勢報表匯出失敗')
    }
  }

  // 匯出商品分析
  const exportProductData = (data: ProductAnalysisData, isInvestor: boolean, isSuperAdmin: boolean) => {
    // 商品明細
    const products = data.products.map((item, index) => {
      const row: any = {
        '排名': index + 1,
        '商品名稱': item.name,
        '商品編號': item.product_code,
        '類別': item.category,
        '銷售筆數': item.salesCount,
        '銷售數量': item.totalQuantity,
        '營業額': item.revenue
      }

      if (isSuperAdmin) {
        row['實收金額'] = item.actualRevenue || 0
        row['毛利'] = item.profit || 0
      }

      return row
    })

    // 類別統計
    const categories = data.categories.map((item, index) => {
      const row: any = {
        '排名': index + 1,
        '類別': item.category,
        '銷售筆數': item.salesCount,
        '銷售數量': item.totalQuantity,
        '營業額': item.revenue
      }

      if (isSuperAdmin) {
        row['實收金額'] = item.actualRevenue || 0
      }

      return row
    })

    const success = exportToExcel(
      [...products, {}, ...categories],
      '商品分析報表',
      '商品分析'
    )

    if (success) {
      message.success('商品分析報表匯出成功')
    } else {
      message.error('商品分析報表匯出失敗')
    }
  }

  // 匯出客戶分析
  const exportCustomerData = (data: CustomerAnalysisData, isInvestor: boolean, isSuperAdmin: boolean) => {
    const exportData = data.customers.map((item, index) => {
      const row: any = {
        '排名': index + 1,
        '客戶名稱': item.name,
        '客戶編號': item.customer_code,
        '公司': item.company || '-',
        '客戶等級': item.tier,
        '購買次數': item.salesCount,
        '總營業額': item.revenue,
        '平均訂單金額': item.averageOrderValue
      }

      if (isSuperAdmin && item.actualRevenue) {
        row['實收金額'] = item.actualRevenue
      }

      return row
    })

    const success = exportToExcel(exportData, '客戶分析報表', '客戶分析')

    if (success) {
      message.success('客戶分析報表匯出成功')
    } else {
      message.error('客戶分析報表匯出失敗')
    }
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
                  valueStyle={{ color: token.colorPrimary }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="活躍客戶數"
                  value={overviewData.overview.totalCustomers}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: token.colorSuccess }}
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
                  valueStyle={{ color: token.colorPrimary }}
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
                    valueStyle={{ color: token.colorWarning }}
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
                    valueStyle={{ color: token.colorError }}
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
                          backgroundColor: token.colorPrimary,
                          margin: '0 2px',
                          borderRadius: '2px 2px 0 0'
                        }}
                      />
                      <div style={{ fontSize: '12px', marginTop: '5px' }}>
                        {dayjs(day.date).format('MM/DD')}
                      </div>
                      <div style={{ fontSize: '10px', color: token.colorTextSecondary }}>
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
                    <div key={product.product_code} style={{ marginBottom: '16px', padding: '8px', border: `1px solid ${token.colorBorder}`, borderRadius: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                            #{index + 1} {product.name}
                          </div>
                          <div style={{ fontSize: '12px', color: token.colorTextSecondary }}>
                            {product.product_code} | {product.category}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 'bold', color: token.colorPrimary }}>
                            {product.totalQuantity}
                          </div>
                          <div style={{ fontSize: '12px', color: token.colorTextSecondary }}>
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
                        style={{ color: value > 0 ? token.colorSuccess : token.colorError }}
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
