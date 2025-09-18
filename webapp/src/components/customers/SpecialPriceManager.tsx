'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Switch,
  message,
  Space,
  Popconfirm,
  Tag,
  Typography,
  Select,
  Divider
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input
const { Option } = Select

interface Product {
  id: string
  product_code: string
  name_zh: string
  name_en?: string
  standard_price: number
  current_price: number
}

interface SpecialPrice {
  id: string
  customer_id: string
  product_id: string
  product: Product
  standard_price: number
  special_price: number
  discount_amount: number
  discount_rate: number
  reason: string
  effective_date: string
  expiry_date?: string
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
}

interface SpecialPriceManagerProps {
  customerId: string
  customerName: string
  customerTier: string
  isVisible: boolean
  onClose: () => void
}

export default function SpecialPriceManager({
  customerId,
  customerName,
  customerTier,
  isVisible,
  onClose
}: SpecialPriceManagerProps) {
  const [specialPrices, setSpecialPrices] = useState<SpecialPrice[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingPrice, setEditingPrice] = useState<SpecialPrice | null>(null)
  const [form] = Form.useForm()

  // 載入客戶專價清單
  const loadSpecialPrices = async () => {
    if (!customerId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/special-prices`)
      const result = await response.json()

      if (result.success) {
        setSpecialPrices(result.data.specialPrices)
      } else {
        message.error('載入專價清單失敗')
      }
    } catch (error) {
      console.error('載入專價清單失敗:', error)
      message.error('載入專價清單失敗')
    } finally {
      setLoading(false)
    }
  }

  // 載入產品列表（用於新增專價時選擇）
  const loadProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const result = await response.json()

      if (result.success) {
        setProducts(result.data.products)
      }
    } catch (error) {
      console.error('載入產品列表失敗:', error)
    }
  }

  useEffect(() => {
    if (isVisible && customerId) {
      loadSpecialPrices()
      loadProducts()
    }
  }, [isVisible, customerId])

  // 開啟新增/編輯專價Modal
  const openModal = (price?: SpecialPrice) => {
    setEditingPrice(price || null)
    setModalVisible(true)

    if (price) {
      // 編輯模式，預填表單
      form.setFieldsValue({
        product_id: price.product_id,
        special_price: price.special_price,
        reason: price.reason,
        effective_date: dayjs(price.effective_date),
        expiry_date: price.expiry_date ? dayjs(price.expiry_date) : null,
        notes: price.notes,
        is_active: price.is_active
      })
    } else {
      // 新增模式，重設表單
      form.resetFields()
      form.setFieldsValue({
        is_active: true,
        effective_date: dayjs()
      })
    }
  }

  // 關閉Modal
  const closeModal = () => {
    setModalVisible(false)
    setEditingPrice(null)
    form.resetFields()
  }

  // 儲存專價
  const saveSpecialPrice = async (values: any) => {
    try {
      const url = editingPrice
        ? `/api/customers/${customerId}/special-prices/${editingPrice.id}`
        : `/api/customers/${customerId}/special-prices`

      const method = editingPrice ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...values,
          effective_date: values.effective_date?.toISOString(),
          expiry_date: values.expiry_date?.toISOString()
        })
      })

      const result = await response.json()

      if (result.success) {
        message.success(editingPrice ? '專價更新成功' : '專價設定成功')
        closeModal()
        loadSpecialPrices() // 重新載入清單
      } else {
        message.error(result.error || '操作失敗')
      }
    } catch (error) {
      console.error('儲存專價失敗:', error)
      message.error('操作失敗')
    }
  }

  // 刪除/停用專價
  const deleteSpecialPrice = async (priceId: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/special-prices/${priceId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        message.success('專價已停用')
        loadSpecialPrices()
      } else {
        message.error(result.error || '操作失敗')
      }
    } catch (error) {
      console.error('刪除專價失敗:', error)
      message.error('操作失敗')
    }
  }

  // 計算折扣百分比顯示
  const getDiscountDisplay = (discountRate: number) => {
    const percentage = Math.round(discountRate * 100)
    return percentage > 0 ? `-${percentage}%` : '無折扣'
  }

  // 表格欄位定義
  const columns = [
    {
      title: '產品',
      key: 'product',
      render: (record: SpecialPrice) => (
        <div>
          <Text strong>{record.product.name_zh}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.product.product_code}
          </Text>
        </div>
      )
    },
    {
      title: '標準價格',
      dataIndex: 'standard_price',
      key: 'standard_price',
      render: (price: number) => <Text>NT$ {price.toLocaleString()}</Text>
    },
    {
      title: '專屬價格',
      dataIndex: 'special_price',
      key: 'special_price',
      render: (price: number) => (
        <Text strong style={{ color: '#52c41a' }}>
          NT$ {price.toLocaleString()}
        </Text>
      )
    },
    {
      title: '折扣',
      key: 'discount',
      render: (record: SpecialPrice) => (
        <div>
          <Tag color="green">{getDiscountDisplay(record.discount_rate)}</Tag>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            省 NT$ {record.discount_amount.toLocaleString()}
          </Text>
        </div>
      )
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true
    },
    {
      title: '生效期間',
      key: 'period',
      render: (record: SpecialPrice) => (
        <div>
          <Text style={{ fontSize: '12px' }}>
            {dayjs(record.effective_date).format('YYYY/MM/DD')}
          </Text>
          {record.expiry_date && (
            <>
              <br />
              <Text style={{ fontSize: '12px' }}>
                至 {dayjs(record.expiry_date).format('YYYY/MM/DD')}
              </Text>
            </>
          )}
        </div>
      )
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean, record: SpecialPrice) => {
        const isExpired = record.expiry_date && dayjs().isAfter(dayjs(record.expiry_date))
        if (isExpired) {
          return <Tag color="default">已過期</Tag>
        }
        return <Tag color={isActive ? 'green' : 'red'}>{isActive ? '生效中' : '已停用'}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (record: SpecialPrice) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
            size="small"
          >
            編輯
          </Button>
          <Popconfirm
            title="確定要停用此專價嗎？"
            onConfirm={() => deleteSpecialPrice(record.id)}
            okText="確定"
            cancelText="取消"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              停用
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <Modal
      title={
        <div>
          <DollarOutlined style={{ marginRight: 8 }} />
          客戶專價管理 - {customerName}
          <Tag color="blue" style={{ marginLeft: 8 }}>{customerTier}</Tag>
        </div>
      }
      open={isVisible}
      onCancel={onClose}
      footer={null}
      width="90%"
      style={{
        maxWidth: '1200px',
        width: '90vw'
      }}
      destroyOnClose
    >
      <Card
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openModal()}
          >
            新增專價
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={specialPrices}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showQuickJumper: true
          }}
        />
      </Card>

      {/* 新增/編輯專價Modal */}
      <Modal
        title={editingPrice ? '編輯客戶專價' : '新增客戶專價'}
        open={modalVisible}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={saveSpecialPrice}
        >
          <Form.Item
            name="product_id"
            label="選擇產品"
            rules={[{ required: true, message: '請選擇產品' }]}
          >
            <Select
              placeholder="請選擇產品"
              showSearch
              filterOption={(input, option) =>
                option?.children?.toString().toLowerCase().includes(input.toLowerCase())
              }
              disabled={!!editingPrice} // 編輯時不允許更改產品
            >
              {products.map(product => (
                <Option key={product.id} value={product.id}>
                  {product.name_zh} ({product.product_code}) - NT$ {product.standard_price.toLocaleString()}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="special_price"
            label="專屬價格"
            rules={[
              { required: true, message: '請輸入專屬價格' },
              { type: 'number', min: 0, message: '價格不能為負數' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="請輸入專屬價格"
              formatter={value => `NT$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value!.replace(/NT\$\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="調價原因"
            rules={[{ required: true, message: '請輸入調價原因' }]}
          >
            <Input placeholder="例如：VIP客戶長期合作" />
          </Form.Item>

          <Form.Item
            name="effective_date"
            label="生效日期"
            rules={[{ required: true, message: '請選擇生效日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="expiry_date"
            label="到期日期"
          >
            <DatePicker style={{ width: '100%' }} placeholder="不設定則永久有效" />
          </Form.Item>

          <Form.Item
            name="notes"
            label="備註"
          >
            <TextArea rows={3} placeholder="額外說明..." />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="是否啟用"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  )
}