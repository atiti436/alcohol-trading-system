'use client'

import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Card,
  Tag,
  Modal,
  Form,
  message,
  DatePicker,
  Transfer,
  InputNumber,
  Typography,
  Row,
  Col,
  Statistic,
  Divider
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  PrinterOutlined,
  FilePdfOutlined,
  TruckOutlined,
  InboxOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import dayjs from 'dayjs'
import { HideFromInvestor, SuperAdminOnly } from '@/components/auth/RoleGuard'
import { SecurePriceDisplay } from '@/components/common/SecurePriceDisplay'
import { ShippingOrderModal } from '@/components/shipping/ShippingOrderModal'
import './shipping-print.css'

const { Search } = Input
const { Option } = Select
const { TextArea } = Input
const { Text, Title } = Typography

interface ShippingOrder {
  id: string
  shippingNumber: string
  saleNumber: string
  customer_id: string
  customer: {
    id: string
    customer_code: string
    name: string
    company?: string
    contact_person?: string
    phone?: string
    address?: string
    shipping_address?: string
  }
  shippingDate: string
  status: string
  total_amount: number
  actual_amount?: number
  commission?: number
  notes?: string
  creator?: {
    id: string
    name: string
    email: string
  }
  items: ShippingItem[]
}

interface ShippingItem {
  id: string
  product_id: string
  variantId?: string
  quantity: number
  unit_price: number
  actual_unit_price?: number
  total_price: number
  actual_total_price?: number
  product: {
    id: string
    product_code: string
    name: string
    category: string
    volume_ml: number
    weight: number
  }
  variant?: {
    id: string
    variant_code: string
    description: string
    weight_kg: number
  }
}

interface Customer {
  id: string
  customer_code: string
  name: string
  company?: string
  contact_person?: string
  phone?: string
  address?: string
  shipping_address?: string
}

/**
 * 📦 Room-5: 出貨單管理頁面
 * 核心功能：出貨單生成、預覽、列印 + 投資方數據隔離
 */
export default function ShippingPage() {
  const { data: session } = useSession()
  const [shippingOrders, setShippingOrders] = useState<ShippingOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)

  // Modal狀態
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [previewModalVisible, setPreviewModalVisible] = useState(false)
  const [selectedShipping, setSelectedShipping] = useState<ShippingOrder | null>(null)
  const [form] = Form.useForm()

  // 創建出貨單狀態
  const [createLoading, setCreateLoading] = useState(false)

  // 載入出貨單列表
  const loadShippingOrders = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/shipping')
      const result = await response.json()

      if (result.success) {
        setShippingOrders(result.data.shippingOrders)
        setTotal(result.data.total)
      } else {
        message.error(result.error || '載入失敗')
      }
    } catch (error) {
      console.error('載入出貨單失敗:', error)
      message.error('載入出貨單列表失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadShippingOrders()
  }, [])

  // 獲取出貨狀態顏色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY': return 'blue'
      case 'SHIPPED': return 'orange'
      case 'DELIVERED': return 'green'
      case 'CANCELLED': return 'red'
      default: return 'default'
    }
  }

  // 獲取出貨狀態名稱
  const getStatusName = (status: string) => {
    const statusNames = {
      READY: '待出貨',
      SHIPPED: '已出貨',
      DELIVERED: '已送達',
      CANCELLED: '已取消'
    }
    return statusNames[status as keyof typeof statusNames] || status
  }


  // 創建出貨單
  const handleCreateShipping = async (data: any) => {
    setCreateLoading(true)
    try {
      const response = await fetch('/api/shipping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        message.success('出貨單創建成功')
        setCreateModalVisible(false)
        loadShippingOrders()
      } else {
        message.error(result.error || '創建失敗')
      }
    } catch (error) {
      console.error('創建出貨單失敗:', error)
      message.error('創建失敗')
    } finally {
      setCreateLoading(false)
    }
  }

  // 預覽出貨單
  const handlePreview = (shipping: ShippingOrder) => {
    setSelectedShipping(shipping)
    setPreviewModalVisible(true)
  }

  // 列印出貨單
  const handlePrint = () => {
    const printContent = document.getElementById('printable-content')
    if (printContent) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>出貨單 - ${selectedShipping?.shippingNumber}</title>
              <style>
                @media print {
                  body { font-family: 'Microsoft JhengHei', sans-serif; font-size: 12px; line-height: 1.4; color: black; }
                  .document-header { display: flex; justify-content: space-between; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 20px; }
                  .customer-section { background-color: #f5f5f5; padding: 10px; margin-bottom: 20px; }
                  .signature-area { margin-top: 30px; display: flex; justify-content: space-between; }
                  table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
                  th, td { border: 1px solid #000; padding: 5px; text-align: left; }
                  th { background-color: #f0f0f0; }
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  // 導出PDF
  const exportToPDF = () => {
    if (selectedShipping) {
      // 使用瀏覽器列印功能導出PDF
      const printContent = document.getElementById('printable-content')
      if (printContent) {
        const originalContents = document.body.innerHTML
        const printableContents = printContent.innerHTML

        document.body.innerHTML = `
          <html>
            <head>
              <title>出貨單 - ${selectedShipping.shippingNumber}</title>
              <style>
                @media print {
                  @page {
                    margin: 2cm;
                    size: A4;
                  }
                  body {
                    font-family: "Microsoft JhengHei", sans-serif;
                    font-size: 12px;
                    line-height: 1.4;
                    color: #000;
                  }
                  .document-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #000;
                  }
                  .document-info {
                    text-align: right;
                  }
                  .customer-section {
                    margin: 20px 0;
                    padding: 10px;
                    border: 1px solid #ddd;
                  }
                  table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                  }
                  th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                  }
                  th {
                    background-color: #f5f5f5;
                    font-weight: bold;
                  }
                  .text-right {
                    text-align: right;
                  }
                }
                body {
                  font-family: "Microsoft JhengHei", sans-serif;
                  font-size: 12px;
                  line-height: 1.4;
                  color: #000;
                }
                .document-header {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 20px;
                  padding-bottom: 10px;
                  border-bottom: 2px solid #000;
                }
                .document-info {
                  text-align: right;
                }
                .customer-section {
                  margin: 20px 0;
                  padding: 10px;
                  border: 1px solid #ddd;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 20px;
                }
                th, td {
                  border: 1px solid #ddd;
                  padding: 8px;
                  text-align: left;
                }
                th {
                  background-color: #f5f5f5;
                  font-weight: bold;
                }
                .text-right {
                  text-align: right;
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
    } else {
      message.error('請先選擇要導出的出貨單')
    }
  }

  // 表格欄位定義
  const columns = [
    {
      title: '出貨單號',
      dataIndex: 'shippingNumber',
      key: 'shippingNumber',
      width: 150,
      render: (text: string, record: ShippingOrder) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            關聯: {record.saleNumber}
          </div>
        </div>
      )
    },
    {
      title: '客戶',
      key: 'customer',
      width: 180,
      render: (record: ShippingOrder) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.customer.name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.customer.customer_code}
          </div>
          {record.customer.company && (
            <div style={{ fontSize: '12px', color: '#999' }}>
              {record.customer.company}
            </div>
          )}
        </div>
      )
    },
    {
      title: '出貨日期',
      dataIndex: 'shippingDate',
      key: 'shippingDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY/MM/DD')
    },
    {
      title: '金額',
      key: 'amount',
      width: 120,
      render: (record: ShippingOrder) => (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold' }}>
            <SecurePriceDisplay
              amount={record.total_amount}
              currency="NT$"
              allowedRoles={['SUPER_ADMIN', 'EMPLOYEE', 'INVESTOR']}
              showFallbackIcon={false}
            />
          </div>
          <HideFromInvestor>
            {record.actual_amount && record.actual_amount !== record.total_amount && (
              <div style={{ fontSize: '12px', color: '#52c41a' }}>
                實收: <SecurePriceDisplay
                  amount={record.actual_amount}
                  currency="NT$"
                  allowedRoles={['SUPER_ADMIN', 'EMPLOYEE']}
                  showFallbackIcon={false}
                />
              </div>
            )}
          </HideFromInvestor>
        </div>
      )
    },
    {
      title: '商品數',
      key: 'itemCount',
      width: 80,
      render: (record: ShippingOrder) => (
        <div style={{ textAlign: 'center' }}>
          {record.items.reduce((sum, item) => sum + item.quantity, 0)} 件
        </div>
      )
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusName(status)}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (record: ShippingOrder) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handlePreview(record)}
          >
            預覽
          </Button>

          <Button
            icon={<PrinterOutlined />}
            size="small"
            type="primary"
            onClick={() => {
              setSelectedShipping(record)
              setTimeout(handlePrint, 100)
            }}
          >
            列印
          </Button>

          <Button
            icon={<FilePdfOutlined />}
            size="small"
            onClick={() => {
              setSelectedShipping(record)
              exportToPDF()
            }}
          >
            PDF
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: '24px', minHeight: '100vh' }}>
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TruckOutlined />
            <span>出貨管理</span>
          </div>
        }
        extra={
          <Space>
            <Button icon={<DownloadOutlined />} onClick={() => {
              const params = new URLSearchParams()
              window.open(`/api/shipping/export?${params.toString()}`, '_blank')
            }}>導出 CSV</Button>
            <Search
              placeholder="搜尋出貨單號、客戶..."
              allowClear
              style={{ width: 250 }}
              enterButton
            />
            <HideFromInvestor>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalVisible(true)}
              >
                新增出貨單
              </Button>
            </HideFromInvestor>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={shippingOrders}
          rowKey="id"
          loading={loading}
          pagination={{
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 項，共 ${total} 項`
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 創建出貨單Modal */}
      <ShippingOrderModal
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onSubmit={handleCreateShipping}
        loading={createLoading}
      />

      {/* 出貨單預覽Modal */}
      <Modal
        title="📋 出貨單預覽"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        width={1000}
        footer={[
          <Button key="edit" onClick={() => setPreviewModalVisible(false)}>
            關閉
          </Button>,
          <Button key="pdf" onClick={exportToPDF}>
            匯出PDF
          </Button>,
          <Button key="print" type="primary" onClick={handlePrint}>
            列印
          </Button>
        ]}
      >
        {selectedShipping && (
          <div className="shipping-document" id="printable-content">
            <div className="document-header">
              <div>
                <Title level={3}>出貨單 DELIVERY NOTE</Title>
                <div><strong>小白貿易有限公司</strong></div>
                <div>台北市信義區信義路五段7號</div>
                <div>統編: 12345678</div>
              </div>
              <div className="document-info">
                <div><strong>出貨單號:</strong> {selectedShipping.shippingNumber}</div>
                <div><strong>出貨日期:</strong> {dayjs(selectedShipping.shippingDate).format('YYYY/MM/DD')}</div>
                <div><strong>關聯銷售單:</strong> {selectedShipping.saleNumber}</div>
              </div>
            </div>

            <div className="customer-section">
              <Title level={4}>客戶資訊</Title>
              <Row gutter={16}>
                <Col span={12}>
                  <div><strong>{selectedShipping.customer.name}</strong></div>
                  <div>客戶代碼: {selectedShipping.customer.customer_code}</div>
                  {selectedShipping.customer.company && (
                    <div>公司: {selectedShipping.customer.company}</div>
                  )}
                </Col>
                <Col span={12}>
                  <div>聯絡人: {selectedShipping.customer.contact_person || '未提供'}</div>
                  <div>電話: {selectedShipping.customer.phone || '未提供'}</div>
                  <div>地址: {selectedShipping.customer.shipping_address || selectedShipping.customer.address || '未提供'}</div>
                </Col>
              </Row>
            </div>

            <Table
              dataSource={selectedShipping.items}
              pagination={false}
              size="small"
              bordered
              summary={(pageData) => {
                const total_amount = pageData.reduce(
                  (sum, record) => sum + (record.quantity * record.unit_price), 0
                )
                const totalQuantity = pageData.reduce(
                  (sum, record) => sum + record.quantity, 0
                )
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>
                      <Text strong>總計</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <Text strong>{totalQuantity}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} />
                    <Table.Summary.Cell index={3}>
                      <Text strong>NT$ {total_amount.toLocaleString()}</Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )
              }}
              columns={[
                {
                  title: '品名',
                  width: '40%',
                  render: (_: any, record: any) => (
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{record.product.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {record.product.product_code}
                        {record.variant && ` - ${record.variant.description}`}
                      </div>
                    </div>
                  )
                },
                {
                  title: '數量',
                  dataIndex: 'quantity',
                  align: 'center',
                  width: '15%'
                },
                {
                  title: '單價',
                  width: '20%',
                  align: 'right',
                  render: (_: any, record: any) => (
                    <SecurePriceDisplay
                      amount={record.unit_price}
                      currency="NT$"
                      allowedRoles={['SUPER_ADMIN', 'EMPLOYEE', 'INVESTOR']}
                      showFallbackIcon={false}
                    />
                  )
                },
                {
                  title: '小計',
                  width: '25%',
                  align: 'right',
                  render: (_: any, record: any) => (
                    <SecurePriceDisplay
                      amount={record.quantity * record.unit_price}
                      currency="NT$"
                      allowedRoles={['SUPER_ADMIN', 'EMPLOYEE', 'INVESTOR']}
                      showFallbackIcon={false}
                    />
                  )
                }
              ]}
            />

            <div className="footer-info">
              <div style={{ marginTop: '20px' }}>
                <strong>備註:</strong> {selectedShipping.notes || '無'}
              </div>
              <div className="signature-area" style={{ marginTop: '40px' }}>
                <div>出貨人: _____________</div>
                <div>收貨人: _____________</div>
                <div>日期: _____________</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
