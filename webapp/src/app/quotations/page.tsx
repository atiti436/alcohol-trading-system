'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, Table, Button, Input, Select, Space, Tag, Typography, Statistic, Row, Col, Modal, Form, message, DatePicker, Dropdown, MenuProps, Popconfirm } from 'antd'
import {
  FileTextOutlined,
  SearchOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  MoreOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import dayjs from 'dayjs'
import { DocumentHeader } from '@/components/common/DocumentHeader'
import { DOCUMENT_TYPES } from '@/config/company'
import ProductSearchSelect from '@/components/common/ProductSearchSelect'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

interface Customer {
  id: string
  name: string
  customer_code: string
  tier: string
}

interface Product {
  id: string
  name: string
  product_code: string
  category: string
  current_price: number
}

interface Quotation {
  id: string
  quote_number: string
  customer: Customer
  product?: Product
  product_name: string
  quantity: number
  unit_price: number
  total_amount: number
  special_notes?: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  valid_until?: string
  source: 'WEB' | 'LINE_BOT'
  line_user_id?: string
  created_at: string
  quoter: {
    name: string
    email: string
  }
}

export default function QuotationsPage() {
  const { data: session } = useSession()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    source: '',
    customer_id: ''
  })
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null)
  const [form] = Form.useForm()
  const [deleteLoading, setDeleteLoading] = useState<{ [key: string]: boolean }>({})
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0
  })

  // 載入報價列表
  const loadQuotations = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      })

      const response = await fetch(`/api/quotations?${params}`)
      const data = await response.json()

      if (response.ok) {
        setQuotations(data.quotations)
        setPagination(prev => ({ ...prev, ...data.pagination }))
      } else {
        message.error(data.error || '載入報價列表失敗')
      }
    } catch (error) {
      message.error('載入報價列表失敗')
    } finally {
      setLoading(false)
    }
  }, [pagination.limit, filters])

  // 載入客戶列表
  const loadCustomers = useCallback(async () => {
    try {
      const response = await fetch('/api/customers')
      const data = await response.json()
      if (response.ok) {
        setCustomers(data.data?.customers || [])
      }
    } catch (error) {
      console.error('載入客戶列表失敗:', error)
    }
  }, [])

  // 載入商品列表
  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      if (response.ok) {
        setProducts(data.data?.products || [])
      }
    } catch (error) {
      console.error('載入商品列表失敗:', error)
    }
  }, [])

  // 載入統計資料
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch('/api/quotations/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('載入統計資料失敗:', error)
    }
  }, [])

  useEffect(() => {
    loadQuotations()
    loadCustomers()
    loadProducts()
    loadStats()
  }, [loadQuotations, loadCustomers, loadProducts, loadStats])

  useEffect(() => {
    loadQuotations(1)
  }, [filters, loadQuotations])

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }))
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // 處理查看詳情
  const handleViewQuotation = (quotation: Quotation) => {
    setViewingQuotation(quotation)
    setViewModalVisible(true)
  }

  // 處理編輯報價
  const handleEditQuotation = (quotation: Quotation) => {
    setEditingQuotation(quotation)
    form.setFieldsValue({
      customer_id: quotation.customer.id,
      product_id: quotation.product?.id,
      product_name: quotation.product_name,
      quantity: quotation.quantity,
      unit_price: quotation.unit_price,
      special_notes: quotation.special_notes,
      valid_until: quotation.valid_until ? dayjs(quotation.valid_until) : null,
      status: quotation.status
    })
    setIsModalVisible(true)
  }

  // 處理狀態更新
  const handleStatusUpdate = async (quotationId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/quotations/${quotationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      const data = await response.json()

      if (response.ok) {
        message.success('狀態更新成功')
        loadQuotations()
        loadStats()
      } else {
        message.error(data.error || '狀態更新失敗')
      }
    } catch (error) {
      message.error('狀態更新失敗')
    }
  }

  // 處理刪除報價
  const handleDeleteQuotation = async (quotationId: string) => {
    setDeleteLoading(prev => ({ ...prev, [quotationId]: true }))
    try {
      const response = await fetch(`/api/quotations/${quotationId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        message.success('報價已刪除')
        loadQuotations()
        loadStats()
      } else {
        message.error(data.error || '刪除報價失敗')
      }
    } catch (error) {
      message.error('刪除報價失敗')
    } finally {
      setDeleteLoading(prev => ({ ...prev, [quotationId]: false }))
    }
  }

  const handleCreateQuotation = async (values: any) => {
    try {
      const payload = {
        ...values,
        unit_price: parseFloat(values.unit_price),
        quantity: parseInt(values.quantity),
        valid_until: values.valid_until ? values.valid_until.toISOString() : undefined
      }

      const url = editingQuotation ? `/api/quotations/${editingQuotation.id}` : '/api/quotations'
      const method = editingQuotation ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        message.success(editingQuotation ? '報價更新成功' : '報價建立成功')
        setIsModalVisible(false)
        setEditingQuotation(null)
        form.resetFields()
        loadQuotations()
        loadStats()
      } else {
        message.error(data.error || (editingQuotation ? '更新報價失敗' : '建立報價失敗'))
      }
    } catch (error) {
      message.error(editingQuotation ? '更新報價失敗' : '建立報價失敗')
    }
  }

  const getStatusTag = (status: string) => {
    const statusConfig = {
      PENDING: { color: 'orange', icon: <ClockCircleOutlined />, text: '待回覆' },
      ACCEPTED: { color: 'green', icon: <CheckCircleOutlined />, text: '已接受' },
      REJECTED: { color: 'red', icon: <CloseCircleOutlined />, text: '已拒絕' },
      EXPIRED: { color: 'default', icon: <ExclamationCircleOutlined />, text: '已過期' }
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    )
  }

  const getSourceTag = (source: string) => {
    return source === 'LINE_BOT' ? (
      <Tag color="green">LINE BOT</Tag>
    ) : (
      <Tag color="blue">WEB</Tag>
    )
  }

  const columns = [
    {
      title: '報價單號',
      dataIndex: 'quote_number',
      key: 'quote_number',
      width: 120,
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: '客戶',
      dataIndex: 'customer',
      key: 'customer',
      width: 150,
      render: (customer: Customer) => (
        <div>
          <Text strong>{customer.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {customer.customer_code}
          </Text>
        </div>
      )
    },
    {
      title: '商品',
      dataIndex: 'product_name',
      key: 'product_name',
      width: 200,
      render: (text: string, record: Quotation) => (
        <div>
          <Text>{text}</Text>
          {record.special_notes && (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.special_notes}
              </Text>
            </>
          )}
        </div>
      )
    },
    {
      title: '數量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'right' as const,
      render: (value: number) => value.toLocaleString()
    },
    {
      title: '單價',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 100,
      align: 'right' as const,
      render: (value: number) => `$${value.toLocaleString()}`
    },
    {
      title: '總金額',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      align: 'right' as const,
      render: (value: number) => (
        <Text strong style={{ color: '#1890ff' }}>
          ${value.toLocaleString()}
        </Text>
      )
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '來源',
      dataIndex: 'source',
      key: 'source',
      width: 80,
      render: (source: string) => getSourceTag(source)
    },
    {
      title: '報價日期',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY/MM/DD')
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: Quotation) => {
        const statusMenuItems: MenuProps['items'] = [
          {
            key: 'ACCEPTED',
            label: '標記為已接受',
            icon: <CheckCircleOutlined />,
            disabled: record.status === 'ACCEPTED'
          },
          {
            key: 'REJECTED',
            label: '標記為已拒絕',
            icon: <CloseCircleOutlined />,
            disabled: record.status === 'REJECTED'
          },
          {
            key: 'EXPIRED',
            label: '標記為已過期',
            icon: <ExclamationCircleOutlined />,
            disabled: record.status === 'EXPIRED'
          }
        ]

        return (
          <Space size="small">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewQuotation(record)}
              title="查看詳情"
            />
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEditQuotation(record)}
              title="編輯報價"
            />
            <Dropdown
              menu={{
                items: statusMenuItems,
                onClick: ({ key }) => handleStatusUpdate(record.id, key)
              }}
              trigger={['click']}
            >
              <Button
                type="text"
                icon={<MoreOutlined />}
                size="small"
                title="更多操作"
              />
            </Dropdown>
            <Popconfirm
              title="確定要刪除此報價嗎？"
              description="刪除後將無法復原"
              onConfirm={() => handleDeleteQuotation(record.id)}
              okText="確定"
              cancelText="取消"
              okButtonProps={{
                loading: deleteLoading[record.id]
              }}
            >
              <Button
                type="text"
                icon={<DeleteOutlined />}
                size="small"
                danger
                loading={deleteLoading[record.id]}
                title="刪除報價"
              />
            </Popconfirm>
          </Space>
        )
      }
    }
  ]

  return (
    <div style={{ padding: 0 }}>
      <Title level={2} style={{ marginBottom: 24 }}>
        <FileTextOutlined style={{ marginRight: 8 }} />
        報價管理
      </Title>

      {/* 統計卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="總報價數" value={stats.total} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="待回覆" value={stats.pending} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="已接受" value={stats.accepted} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="已拒絕" value={stats.rejected} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
      </Row>

      {/* 搜尋和篩選 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={6}>
            <Input.Search
              placeholder="搜尋客戶、商品或備註"
              allowClear
              onSearch={handleSearch}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="狀態"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('status', value || '')}
            >
              <Option value="PENDING">待回覆</Option>
              <Option value="ACCEPTED">已接受</Option>
              <Option value="REJECTED">已拒絕</Option>
              <Option value="EXPIRED">已過期</Option>
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="來源"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('source', value || '')}
            >
              <Option value="WEB">WEB</Option>
              <Option value="LINE_BOT">LINE BOT</Option>
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="客戶"
              allowClear
              showSearch
              style={{ width: '100%' }}
              optionFilterProp="children"
              onChange={(value) => handleFilterChange('customer_id', value || '')}
            >
              {customers.map(customer => (
                <Option key={customer.id} value={customer.id}>
                  {customer.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={3}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsModalVisible(true)}
              style={{ width: '100%' }}
            >
              新增報價
            </Button>
          </Col>
          <Col xs={24} sm={3}>
            <Button
              icon={<SearchOutlined />}
              onClick={() => {
                loadCustomers()
                loadProducts()
                message.success('已刷新客戶和商品列表')
              }}
              style={{ width: '100%' }}
              title="重新載入客戶和商品列表"
            >
              刷新資料
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 報價列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={quotations}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 筆，共 ${total} 筆`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, limit: pageSize }))
              loadQuotations(page)
            }
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 新增/編輯報價 Modal */}
      <Modal
        title={editingQuotation ? '編輯報價' : '新增報價'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false)
          setEditingQuotation(null)
          form.resetFields()
        }}
        afterOpenChange={(open) => {
          if (open) {
            // Modal 開啟時重新載入客戶列表，確保資料同步
            loadCustomers()
            loadProducts()
          }
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateQuotation}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="customer_id"
                label="客戶"
                rules={[{ required: true, message: '請選擇客戶' }]}
              >
                <Select
                  placeholder="選擇客戶"
                  showSearch
                  optionFilterProp="children"
                >
                  {customers.map(customer => (
                    <Option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.customer_code})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="product_search"
                label="商品選擇（智慧搜尋+快速新增）"
                extra="輸入商品名稱進行搜尋，如「山崎」、「響」等，找不到商品時可快速新增"
              >
                <ProductSearchSelect
                  placeholder="搜尋商品... 如：山崎12年、響21年、NIKKA"
                  allowQuickAdd={true}
                  onChange={(value) => {
                    if (value) {
                      form.setFieldsValue({
                        product_id: value.productId,
                        product_name: value.productName,
                        unit_price: value.price
                      })
                    }
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="product_name"
            label="商品名稱"
            rules={[{ required: true, message: '請輸入商品名稱' }]}
          >
            <Input placeholder="從上方搜尋選擇後自動填入，或直接輸入客製化商品名稱" />
          </Form.Item>

          {/* 隱藏欄位保存產品ID */}
          <Form.Item name="product_id" style={{ display: 'none' }}>
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="quantity"
                label="數量"
                rules={[{ required: true, message: '請輸入數量' }]}
              >
                <Input type="number" placeholder="12" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="unit_price"
                label="單價"
                rules={[{ required: true, message: '請輸入單價' }]}
              >
                <Input type="number" placeholder="20000" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="valid_until"
                label="有效期限"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="special_notes"
            label="特殊備註"
          >
            <TextArea rows={3} placeholder="一次12支價格" />
          </Form.Item>

          {editingQuotation && (
            <Form.Item
              name="status"
              label="狀態"
            >
              <Select placeholder="選擇狀態">
                <Option value="PENDING">待回覆</Option>
                <Option value="ACCEPTED">已接受</Option>
                <Option value="REJECTED">已拒絕</Option>
                <Option value="EXPIRED">已過期</Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setIsModalVisible(false)
                setEditingQuotation(null)
                form.resetFields()
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingQuotation ? '更新報價' : '建立報價'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 查看詳情 Modal */}
      <Modal
        title="報價詳情"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false)
          setViewingQuotation(null)
        }}
        footer={null}
        width="80%"
        style={{ maxWidth: '700px' }}
      >
        {viewingQuotation && (
          <div id="quotation-print">
            <DocumentHeader
              documentType={DOCUMENT_TYPES.QUOTATION}
              documentNumber={viewingQuotation.quote_number}
              date={dayjs().format('YYYY/MM/DD')}
              additionalInfo={
                <div>
                  客戶：{viewingQuotation.customer.name}（{viewingQuotation.customer.customer_code}）
                </div>
              }
            />
            <div className="no-print" style={{ textAlign: 'right', marginBottom: 12 }}>
              <Button onClick={() => window.print()} icon={<FileTextOutlined />}>列印/匯出PDF</Button>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <h3>基本資訊</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div><strong>報價單號：</strong>{viewingQuotation.quote_number}</div>
                <div><strong>狀態：</strong>{getStatusTag(viewingQuotation.status)}</div>
                <div><strong>客戶：</strong>{viewingQuotation.customer.name} ({viewingQuotation.customer.customer_code})</div>
                <div><strong>客戶等級：</strong>
                  <Tag color={viewingQuotation.customer.tier === 'VIP' ? 'gold' : 'blue'}>
                    {viewingQuotation.customer.tier}
                  </Tag>
                </div>
                <div><strong>來源：</strong>{getSourceTag(viewingQuotation.source)}</div>
                <div><strong>報價人：</strong>{viewingQuotation.quoter.name}</div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3>商品資訊</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div><strong>商品名稱：</strong>{viewingQuotation.product_name}</div>
                <div><strong>商品代碼：</strong>{viewingQuotation.product?.product_code || '自訂商品'}</div>
                <div><strong>數量：</strong>{viewingQuotation.quantity.toLocaleString()} 支</div>
                <div><strong>單價：</strong>${viewingQuotation.unit_price.toLocaleString()}</div>
                <div><strong>總金額：</strong>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                    ${viewingQuotation.total_amount.toLocaleString()}
                  </span>
                </div>
                <div><strong>有效期限：</strong>
                  {viewingQuotation.valid_until
                    ? dayjs(viewingQuotation.valid_until).format('YYYY年MM月DD日')
                    : '無期限'
                  }
                </div>
              </div>
            </div>

            {viewingQuotation.special_notes && (
              <div style={{ marginBottom: '24px' }}>
                <h3>特殊備註</h3>
                <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                  {viewingQuotation.special_notes}
                </div>
              </div>
            )}

            {viewingQuotation.line_user_id && (
              <div style={{ marginBottom: '24px' }}>
                <h3>LINE Bot 資訊</h3>
                <div style={{ padding: '12px', backgroundColor: '#e6f7ff', borderRadius: '6px' }}>
                  <div><strong>LINE User ID：</strong>{viewingQuotation.line_user_id}</div>
                </div>
              </div>
            )}

            <div>
              <h3>時間記錄</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div><strong>建立時間：</strong>{dayjs(viewingQuotation.created_at).format('YYYY年MM月DD日 HH:mm:ss')}</div>
                <div><strong>報價人員：</strong>{viewingQuotation.quoter.email}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
