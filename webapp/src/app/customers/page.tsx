'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
  MailOutlined,
  DollarOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import { Role } from '@/types/auth'
import type {
  Customer,
  CustomerWithStats,
  CustomerTier,
  PaymentTerms,
  CustomerFormData,
  CustomerFilters
} from '@/types/room-2'
import SpecialPriceManager from '@/components/customers/SpecialPriceManager'

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
    orderBy: 'created_at',
    order: 'desc'
  })

  // Modal狀態
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [form] = Form.useForm()

  // 專價管理狀態
  const [specialPriceVisible, setSpecialPriceVisible] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // 載入客戶列表
  const loadCustomers = useCallback(async () => {
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
  }, [filters])

  useEffect(() => {
    loadCustomers()
  }, [filters, loadCustomers])

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
        <span style={{ fontWeight: 'bold' }}>
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
            <div className="text-xs text-gray-500">
              <UserOutlined /> {record.contact_person}
            </div>
          )}
          {record.phone && (
            <div className="text-xs text-gray-500">
              <PhoneOutlined /> {record.phone}
            </div>
          )}
          {record.email && (
            <div className="text-xs text-gray-500">
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
      dataIndex: 'payment_terms',
      key: 'payment_terms',
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
          {record.total_amount && (
            <div className="text-xs text-gray-500">
              ${record.total_amount.toLocaleString()}
            </div>
          )}
        </div>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (record: Customer) => (
        <Space>
          <Tooltip title="編輯">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          {/* 專價管理按鈕 */}
          <Tooltip title="專價管理">
            <Button
              icon={<DollarOutlined />}
              size="small"
              type="primary"
              ghost
              onClick={() => handleSpecialPrice(record)}
            />
          </Tooltip>
          {session?.user?.role === Role.SUPER_ADMIN && (
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

  // 處理專價管理
  const handleSpecialPrice = (customer: Customer) => {
    setSelectedCustomer(customer)
    setSpecialPriceVisible(true)
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
  if (session?.user?.role === Role.INVESTOR) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>投資方無法查看客戶管理功能</p>
        </div>
      </Card>
    )
  }

  return (
    <div style={{
      padding: '24px',
      minHeight: '100vh'
    }}>
      <Card
        title={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <UserOutlined />
            <span style={{ fontSize: 'clamp(16px, 4vw, 20px)' }}>客戶管理</span>
          </div>
        }
        extra={
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Search
                placeholder="搜尋客戶名稱、電話、公司..."
                allowClear
                style={{
                  flex: '1 1 auto',
                  minWidth: '200px',
                  maxWidth: '300px'
                }}
                loading={loading}
                onSearch={(value) => setFilters(prev => ({ ...prev, search: value, page: 1 }))}
                enterButton
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
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleEdit()}
              style={{ flexShrink: 0 }}
            >
              新增客戶
            </Button>
          </div>
        }
      >

        <Table
          columns={columns}
          dataSource={customers}
          rowKey="id"
          loading={loading}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            responsive: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 項，共 ${total} 項`,
            onChange: (page, pageSize) => setFilters(prev => ({ ...prev, page, limit: pageSize })),
            disabled: loading
          }}
          scroll={{
            x: 'max-content'
          }}
          size="small"
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
            <Form.Item name="payment_terms" label="付款條件" style={{ flex: 1 }}>
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

      {/* 客戶專價管理Modal */}
      {selectedCustomer && (
        <SpecialPriceManager
          customer_id={selectedCustomer.id}
          customer_name={selectedCustomer.name}
          customer_tier={selectedCustomer.tier}
          isVisible={specialPriceVisible}
          onClose={() => {
            setSpecialPriceVisible(false)
            setSelectedCustomer(null)
          }}
        />
      )}
    </div>
  )
}
