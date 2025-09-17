'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Select,
  Space,
  DatePicker,
  message,
  Modal,
  Typography,
  Row,
  Col,
  Statistic,
  Tag,
  Divider
} from 'antd'
import {
  FileTextOutlined,
  SearchOutlined,
  PrinterOutlined,
  CalendarOutlined,
  UserOutlined,
  DollarOutlined,
  BarChartOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import dayjs, { Dayjs } from 'dayjs'
import { HideFromInvestor, SuperAdminOnly } from '@/components/auth/RoleGuard'
import { SecurePriceDisplay } from '@/components/common/SecurePriceDisplay'
import './statements-print.css'

const { Option } = Select
const { RangePicker } = DatePicker
const { Title, Text } = Typography

interface Customer {
  id: string
  customer_code: string
  name: string
  company?: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  paymentTerms: string
}

interface StatementData {
  customer: Customer
  periodInfo: {
    dateFrom: string
    dateTo: string
    type: string
  }
  sales: any[]
  receivables: any[]
  summary: {
    totalSales: number
    totalSalesAmount: number
    totalActualAmount?: number
    totalCommission?: number
    totalReceivableAmount: number
    totalPaidAmount: number
    totalOutstandingAmount: number
  }
}

/**
 * 📋 Room-5: 對帳單管理頁面
 * 核心功能：對帳單生成、預覽、列印 + 投資方數據隔離
 */
export default function StatementsPage() {
  const { data: session } = useSession()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>()
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>()
  const [statementData, setStatementData] = useState<StatementData | null>(null)
  const [loading, setLoading] = useState(false)
  const [previewVisible, setPreviewVisible] = useState(false)

  // 載入客戶列表
  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/customers?limit=100')
      const result = await response.json()
      if (result.success) {
        setCustomers(result.data.customers)
      }
    } catch (error) {
      console.error('載入客戶失敗:', error)
      message.error('載入客戶列表失敗')
    }
  }

  useEffect(() => {
    loadCustomers()
    // 預設為當月
    const now = dayjs()
    const startOfMonth = now.startOf('month')
    const endOfMonth = now.endOf('month')
    setDateRange([startOfMonth, endOfMonth])
  }, [])

  // 生成對帳單
  const generateStatement = async () => {
    if (!selectedCustomerId) {
      message.error('請選擇客戶')
      return
    }

    if (!dateRange) {
      message.error('請選擇日期範圍')
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        customerId: selectedCustomerId,
        dateFrom: dateRange[0].toISOString(),
        dateTo: dateRange[1].toISOString(),
        type: 'custom'
      })

      const response = await fetch(`/api/statements?${params}`)
      const result = await response.json()

      if (result.success) {
        setStatementData(result.data)
        setPreviewVisible(true)
      } else {
        message.error(result.error || '生成對帳單失敗')
      }
    } catch (error) {
      console.error('生成對帳單失敗:', error)
      message.error('生成對帳單失敗')
    } finally {
      setLoading(false)
    }
  }

  // 列印對帳單
  const handlePrint = () => {
    window.print()
  }

  // 導出PDF
  const exportToPDF = () => {
    if (statementData) {
      const printContent = document.getElementById('statement-content')
      if (printContent) {
        const originalContents = document.body.innerHTML
        const printableContents = printContent.innerHTML

        document.body.innerHTML = `
          <html>
            <head>
              <title>對帳單 - ${statementData.customer.name}</title>
              <style>
                @media print {
                  @page { margin: 2cm; size: A4; }
                  body { font-family: "Microsoft JhengHei", sans-serif; font-size: 12px; }
                  table { width: 100%; border-collapse: collapse; }
                  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                  th { background-color: #f5f5f5; font-weight: bold; }
                  .statement-header { margin-bottom: 20px; }
                  .summary-section { margin: 20px 0; }
                }
              </style>
            </head>
            <body>
              ${printableContents}
            </body>
          </html>
        `

        window.print()
        document.body.innerHTML = originalContents
        window.location.reload()
      }
    }
  }

  // 銷售記錄表格欄位
  const salesColumns = [
    {
      title: '銷售單號',
      dataIndex: 'saleNumber',
      key: 'saleNumber',
      width: 150
    },
    {
      title: '銷售日期',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '商品明細',
      key: 'items',
      render: (_: any, record: any) => (
        <div>
          {record.items.map((item: any, index: number) => (
            <div key={index} style={{ marginBottom: '4px' }}>
              <Text strong>{item.product.name}</Text>
              {item.variant && <Text type="secondary"> - {item.variant.description}</Text>}
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                數量: {item.quantity} | 單價: <SecurePriceDisplay amount={item.unitPrice} />
              </Text>
            </div>
          ))}
        </div>
      )
    },
    {
      title: '金額',
      key: 'amount',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: any) => (
        <div>
          <div>
            <SecurePriceDisplay
              amount={record.totalAmount}
              currency="NT$"
              allowedRoles={['SUPER_ADMIN', 'EMPLOYEE', 'INVESTOR']}
            />
          </div>
          <SuperAdminOnly>
            {record.actualAmount && record.actualAmount !== record.totalAmount && (
              <div style={{ fontSize: '12px', color: '#52c41a' }}>
                實收: <SecurePriceDisplay amount={record.actualAmount} />
              </div>
            )}
          </SuperAdminOnly>
        </div>
      )
    },
    {
      title: '狀態',
      dataIndex: 'isPaid',
      key: 'isPaid',
      width: 80,
      render: (isPaid: boolean) => (
        <Tag color={isPaid ? 'green' : 'orange'}>
          {isPaid ? '已付款' : '未付款'}
        </Tag>
      )
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <Title level={2}>
            <FileTextOutlined style={{ marginRight: '8px' }} />
            對帳單管理
          </Title>
          <Text type="secondary">
            生成客戶對帳單，查看銷售記錄與應收帳款狀況
          </Text>
        </div>

        {/* 篩選條件 */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={8}>
            <div style={{ marginBottom: '8px' }}>
              <UserOutlined style={{ marginRight: '4px' }} />
              選擇客戶
            </div>
            <Select
              style={{ width: '100%' }}
              placeholder="請選擇客戶"
              value={selectedCustomerId}
              onChange={setSelectedCustomerId}
              showSearch
              optionFilterProp="children"
            >
              {customers.map(customer => (
                <Option key={customer.id} value={customer.id}>
                  {customer.name} ({customer.customer_code})
                  {customer.company && ` - ${customer.company}`}
                </Option>
              ))}
            </Select>
          </Col>

          <Col span={8}>
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

          <Col span={8}>
            <div style={{ marginBottom: '8px' }}>&nbsp;</div>
            <Space>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={generateStatement}
                loading={loading}
                disabled={!selectedCustomerId || !dateRange}
              >
                生成對帳單
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 對帳單摘要 */}
        {statementData && (
          <Card size="small" style={{ marginBottom: '24px' }}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="銷售筆數"
                  value={statementData.summary.totalSales}
                  prefix={<BarChartOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="銷售總額"
                  value={statementData.summary.totalSalesAmount}
                  prefix={<DollarOutlined />}
                  formatter={(value) => `NT$ ${(value as number).toLocaleString()}`}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="已收款"
                  value={statementData.summary.totalPaidAmount}
                  prefix={<DollarOutlined />}
                  formatter={(value) => `NT$ ${(value as number).toLocaleString()}`}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="未收款"
                  value={statementData.summary.totalOutstandingAmount}
                  prefix={<DollarOutlined />}
                  formatter={(value) => `NT$ ${(value as number).toLocaleString()}`}
                  valueStyle={{ color: statementData.summary.totalOutstandingAmount > 0 ? '#fa8c16' : '#52c41a' }}
                />
              </Col>
            </Row>
          </Card>
        )}

        {/* 銷售記錄表格 */}
        {statementData && (
          <Table
            dataSource={statementData.sales}
            columns={salesColumns}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `第 ${range[0]}-${range[1]} 項，共 ${total} 項`
            }}
            scroll={{ x: 1000 }}
          />
        )}
      </Card>

      {/* 對帳單預覽Modal */}
      <Modal
        title="📋 對帳單預覽"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={1200}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            關閉
          </Button>,
          <Button key="pdf" onClick={exportToPDF}>
            匯出PDF
          </Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
            列印
          </Button>
        ]}
      >
        {statementData && (
          <div className="statement-document" id="statement-content">
            {/* 對帳單標題 */}
            <div className="statement-header">
              <Row justify="space-between" align="top">
                <Col>
                  <Title level={3}>客戶對帳單 CUSTOMER STATEMENT</Title>
                  <div style={{ marginTop: '8px' }}>
                    <div><strong>小白貿易有限公司</strong></div>
                    <div>台北市信義區信義路五段7號</div>
                    <div>統編: 12345678</div>
                  </div>
                </Col>
                <Col>
                  <div style={{ textAlign: 'right' }}>
                    <div><strong>對帳期間:</strong></div>
                    <div>
                      {dayjs(statementData.periodInfo.dateFrom).format('YYYY/MM/DD')} -
                      {dayjs(statementData.periodInfo.dateTo).format('YYYY/MM/DD')}
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <strong>生成日期:</strong> {dayjs().format('YYYY/MM/DD')}
                    </div>
                  </div>
                </Col>
              </Row>
            </div>

            <Divider />

            {/* 客戶資訊 */}
            <div className="customer-section">
              <Title level={4}>客戶資訊</Title>
              <Row gutter={24}>
                <Col span={12}>
                  <div><strong>客戶名稱:</strong> {statementData.customer.name}</div>
                  <div><strong>客戶代碼:</strong> {statementData.customer.customer_code}</div>
                  {statementData.customer.company && (
                    <div><strong>公司名稱:</strong> {statementData.customer.company}</div>
                  )}
                  <div><strong>付款條件:</strong> {statementData.customer.paymentTerms}</div>
                </Col>
                <Col span={12}>
                  <div><strong>聯絡人:</strong> {statementData.customer.contact_person || '未提供'}</div>
                  <div><strong>電話:</strong> {statementData.customer.phone || '未提供'}</div>
                  <div><strong>Email:</strong> {statementData.customer.email || '未提供'}</div>
                  <div><strong>地址:</strong> {statementData.customer.address || '未提供'}</div>
                </Col>
              </Row>
            </div>

            <Divider />

            {/* 對帳摘要 */}
            <div className="summary-section">
              <Title level={4}>對帳摘要</Title>
              <Row gutter={16}>
                <Col span={6}>
                  <div style={{ textAlign: 'center', padding: '16px', background: '#f0f2f5' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                      {statementData.summary.totalSales}
                    </div>
                    <div>銷售筆數</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center', padding: '16px', background: '#f0f2f5' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#722ed1' }}>
                      NT$ {statementData.summary.totalSalesAmount.toLocaleString()}
                    </div>
                    <div>銷售總額</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center', padding: '16px', background: '#f0f2f5' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                      NT$ {statementData.summary.totalPaidAmount.toLocaleString()}
                    </div>
                    <div>已收金額</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center', padding: '16px', background: '#f0f2f5' }}>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color: statementData.summary.totalOutstandingAmount > 0 ? '#fa8c16' : '#52c41a'
                    }}>
                      NT$ {statementData.summary.totalOutstandingAmount.toLocaleString()}
                    </div>
                    <div>未收金額</div>
                  </div>
                </Col>
              </Row>
            </div>

            <Divider />

            {/* 銷售明細表格 */}
            <Table
              dataSource={statementData.sales}
              columns={salesColumns}
              pagination={false}
              size="small"
              scroll={{ x: 800 }}
            />

            {/* 頁尾 */}
            <div style={{ marginTop: '40px', textAlign: 'center', borderTop: '1px solid #d9d9d9', paddingTop: '20px' }}>
              <Text type="secondary">
                此對帳單由系統自動生成，如有疑問請聯繫業務人員
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}