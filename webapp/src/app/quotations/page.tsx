'use client'

import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Input, Select, Space, Tag, Typography, Statistic, Row, Col, Modal, Form, message, DatePicker } from 'antd'
import {
  FileTextOutlined,
  SearchOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import dayjs from 'dayjs'

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
  const [form] = Form.useForm()
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0
  })

  // 載入報價列表
  const loadQuotations = async (page = 1) => {
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
  }

  // 載入客戶列表
  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      const data = await response.json()
      if (response.ok) {
        setCustomers(data.data?.customers || [])
      }
    } catch (error) {
      console.error('載入客戶列表失敗:', error)
    }
  }

  // 載入商品列表
  const loadProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      if (response.ok) {
        setProducts(data.data?.products || [])
      }
    } catch (error) {
      console.error('載入商品列表失敗:', error)
    }
  }

  // 載入統計資料
  const loadStats = async () => {
    try {
      const response = await fetch('/api/quotations/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('載入統計資料失敗:', error)
    }
  }

  useEffect(() => {
    loadQuotations()
    loadCustomers()
    loadProducts()
    loadStats()
  }, [])

  useEffect(() => {
    loadQuotations(1)
  }, [filters])

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }))
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleCreateQuotation = async (values: any) => {
    try {
      const payload = {
        ...values,
        unit_price: parseFloat(values.unit_price),
        quantity: parseInt(values.quantity),
        valid_until: values.valid_until ? values.valid_until.toISOString() : undefined
      }

      const response = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        message.success('報價建立成功')
        setIsModalVisible(false)
        form.resetFields()
        loadQuotations()
        loadStats()
      } else {
        message.error(data.error || '建立報價失敗')
      }
    } catch (error) {
      message.error('建立報價失敗')
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
      width: 120,
      render: (_: any, record: Quotation) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => {/* 查看詳情 */}}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => {/* 編輯 */}}
          />
        </Space>
      )
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

      {/* 新增報價 Modal */}
      <Modal
        title="新增報價"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false)
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
            <Col span={12}>
              <Form.Item
                name="product_id"
                label="商品（可選）"
              >
                <Select
                  placeholder="選擇商品"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  onChange={(value, option: any) => {
                    if (option) {
                      form.setFieldsValue({ product_name: option.children.split(' (')[0] })
                    }
                  }}
                >
                  {products.map(product => (
                    <Option key={product.id} value={product.id}>
                      {product.name} ({product.product_code})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="product_id"
            label="商品選擇"
          >
            <Select
              placeholder="選擇現有商品（可選）"
              allowClear
              showSearch
              optionFilterProp="children"
              onChange={(value) => {
                if (value) {
                  const selectedProduct = products.find(p => p.id === value)
                  if (selectedProduct) {
                    form.setFieldsValue({
                      product_name: selectedProduct.name,
                      unit_price: selectedProduct.current_price
                    })
                  }
                }
              }}
            >
              {products.map(product => (
                <Option key={product.id} value={product.id}>
                  {product.name} ({product.product_code}) - NT${product.current_price}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="product_name"
            label="商品名稱"
            rules={[{ required: true, message: '請輸入商品名稱' }]}
          >
            <Input placeholder="選擇上方商品自動填入，或手動輸入客製化商品名稱" />
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

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setIsModalVisible(false)
                form.resetFields()
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                建立報價
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}