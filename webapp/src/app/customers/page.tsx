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
  Popconfirm,
  Tooltip
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import type {
  Customer,
  CustomerWithStats,
  CustomerTier,
  PaymentTerms,
  CustomerFormData,
  CustomerFilters
} from '@/types/room-2'

const { Search } = Input
const { Option } = Select

/**
 * 🏠 Room-2: 客戶管理頁面
 * 提供客戶列表、新增、編輯、刪除功能
 */
export default function CustomersPage() {
  const { data: session } = useSession()
  const [customers, setCustomers] = useState<CustomerWithStats[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<CustomerFilters>({
    page: 1,
    limit: 20,
    search: '',
    orderBy: 'createdAt',
    order: 'desc'
  })

  // Modal狀態
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [form] = Form.useForm()

  // 載入客戶列表
  const loadCustomers = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value))
        }
      })

      const response = await fetch(`/api/customers?${queryParams}`)
      const result = await response.json()

      if (result.success) {
        setCustomers(result.data.customers)
        setTotal(result.data.total)
      } else {
        message.error(result.error || '載入失敗')
      }
    } catch (error) {
      message.error('載入客戶列表失敗')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [filters])

  // 客戶分級標籤顏色
  const getTierColor = (tier: CustomerTier) => {
    switch (tier) {
      case 'VIP': return 'gold'
      case 'PREMIUM': return 'purple'
      case 'REGULAR': return 'blue'
      case 'NEW': return 'green'
      default: return 'default'
    }
  }

  // 客戶分級中文名稱
  const getTierName = (tier: CustomerTier) => {
    switch (tier) {
      case 'VIP': return 'VIP客戶'
      case 'PREMIUM': return '高價客戶'
      case 'REGULAR': return '一般客戶'
      case 'NEW': return '新客戶'
      default: return tier
    }
  }

  // 表格欄位定義
  const columns = [
    {
      title: '客戶代碼',
      dataIndex: 'customer_code',
      key: 'customer_code',
      width: 120,
      render: (code: string) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
          {code}
        </span>
      )
    },
    {
      title: '客戶資訊',
      key: 'info',
      render: (record: CustomerWithStats) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.name}</div>
          {record.contact_person && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              <UserOutlined /> {record.contact_person}
            </div>
          )}
          {record.phone && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              <PhoneOutlined /> {record.phone}
            </div>
          )}
          {record.email && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              <MailOutlined /> {record.email}
            </div>
          )}
        </div>
      )
    },
    {
      title: '分級',
      dataIndex: 'tier',
      key: 'tier',
      width: 100,
      render: (tier: CustomerTier) => (
        <Tag color={getTierColor(tier)}>
          {getTierName(tier)}
        </Tag>
      ),
      filters: [
        { text: 'VIP客戶', value: 'VIP' },
        { text: '高價客戶', value: 'PREMIUM' },
        { text: '一般客戶', value: 'REGULAR' },
        { text: '新客戶', value: 'NEW' }
      ]
    },
    {
      title: '付款條件',
      dataIndex: 'paymentTerms',
      key: 'paymentTerms',
      width: 100,
      render: (terms: PaymentTerms) => {
        const termNames = {
          CASH: '現金',
          WEEKLY: '週結',
          MONTHLY: '月結',
          SIXTY_DAYS: '60天'
        }
        return termNames[terms] || terms
      }
    },
    {
      title: '訂單統計',
      key: 'stats',
      width: 120,
      render: (record: CustomerWithStats) => (
        <div style={{ textAlign: 'center' }}>
          <div>{record._count.sales} 筆</div>
          {record.totalAmount && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              ${record.totalAmount.toLocaleString()}
            </div>
          )}
        </div>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (record: Customer) => (
        <Space>
          <Tooltip title="編輯">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          {session?.user?.role === 'SUPER_ADMIN' && (
            <Popconfirm
              title="確定要刪除此客戶嗎？"
              onConfirm={() => handleDelete(record.id)}
              okText="確定"
              cancelText="取消"
            >
              <Tooltip title="刪除">
                <Button
                  icon={<DeleteOutlined />}
                  size="small"
                  danger
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]

  // 處理新增/編輯
  const handleEdit = (customer?: Customer) => {
    setEditingCustomer(customer || null)
    if (customer) {
      form.setFieldsValue(customer)
    } else {
      form.resetFields()
    }
    setModalVisible(true)
  }

  // 處理刪除
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE'
      })
      const result = await response.json()

      if (result.success) {
        message.success(result.message)
        loadCustomers()
      } else {
        message.error(result.error)
      }
    } catch (error) {
      message.error('刪除失敗')
      console.error(error)
    }
  }

  // 處理表單提交
  const handleSubmit = async (values: CustomerFormData) => {
    try {
      const url = editingCustomer
        ? `/api/customers/${editingCustomer.id}`
        : '/api/customers'

      const response = await fetch(url, {
        method: editingCustomer ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      })

      const result = await response.json()

      if (result.success) {
        message.success(result.message)
        setModalVisible(false)
        loadCustomers()
      } else {
        message.error(result.error)
      }
    } catch (error) {
      message.error('操作失敗')
      console.error(error)
    }
  }

  // 檢查權限
  if (session?.user?.role === 'INVESTOR') {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>投資方無法查看客戶管理功能</p>
        </div>
      </Card>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Search
              placeholder="搜尋客戶名稱、電話、公司..."
              allowClear
              style={{ width: 300 }}
              onSearch={(value) => setFilters(prev => ({ ...prev, search: value, page: 1 }))}
            />
            <Select
              placeholder="選擇分級"
              allowClear
              style={{ width: 120 }}
              onChange={(tier) => setFilters(prev => ({ ...prev, tier, page: 1 }))}
            >
              <Option value="VIP">VIP客戶</Option>
              <Option value="PREMIUM">高價客戶</Option>
              <Option value="REGULAR">一般客戶</Option>
              <Option value="NEW">新客戶</Option>
            </Select>
          </Space>

          {session?.user?.role !== 'INVESTOR' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleEdit()}
            >
              新增客戶
            </Button>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={customers}
          rowKey="id"
          loading={loading}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 項，共 ${total} 項`,
            onChange: (page, pageSize) => setFilters(prev => ({ ...prev, page, limit: pageSize }))
          }}
        />
      </Card>

      {/* 新增/編輯Modal */}
      <Modal
        title={editingCustomer ? '編輯客戶' : '新增客戶'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="客戶名稱"
            rules={[{ required: true, message: '請輸入客戶名稱' }]}
          >
            <Input placeholder="請輸入客戶名稱" />
          </Form.Item>

          <Form.Item name="contact_person" label="聯絡人">
            <Input placeholder="請輸入主要聯絡人" />
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item name="phone" label="聯絡電話" style={{ flex: 1 }}>
              <Input placeholder="請輸入聯絡電話" />
            </Form.Item>
            <Form.Item name="email" label="電子郵件" style={{ flex: 1 }}>
              <Input placeholder="請輸入電子郵件" />
            </Form.Item>
          </div>

          <Form.Item name="company" label="公司名稱">
            <Input placeholder="請輸入公司名稱" />
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item name="tier" label="客戶分級" style={{ flex: 1 }}>
              <Select placeholder="選擇客戶分級">
                <Option value="VIP">VIP客戶</Option>
                <Option value="PREMIUM">高價客戶</Option>
                <Option value="REGULAR">一般客戶</Option>
                <Option value="NEW">新客戶</Option>
              </Select>
            </Form.Item>
            <Form.Item name="paymentTerms" label="付款條件" style={{ flex: 1 }}>
              <Select placeholder="選擇付款條件">
                <Option value="CASH">現金</Option>
                <Option value="WEEKLY">週結</Option>
                <Option value="MONTHLY">月結</Option>
                <Option value="SIXTY_DAYS">60天</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="notes" label="備註">
            <Input.TextArea rows={3} placeholder="請輸入備註" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingCustomer ? '更新' : '新增'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}