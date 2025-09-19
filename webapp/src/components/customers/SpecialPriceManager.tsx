import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  Button,
  Select,
  DatePicker,
  InputNumber,
  Space,
  message,
  Table,
  Popconfirm,
  Tooltip,
  Tag
} from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { CustomerTier, Product } from '@/types/room-2'
import { useSession } from 'next-auth/react'
import moment from 'moment'

const { Option } = Select

interface SpecialPrice {
  id?: string
  customer_id: string
  product_id: string
  standard_price: number
  special_price: number
  discount_amount: number
  discount_rate: number
  reason: string
  effective_date: string
  expiry_date?: string
  is_active: boolean
  notes?: string
  created_by?: string
  created_at?: string
  updated_at?: string
  product?: Product // 關聯的產品資訊
}

interface SpecialPriceManagerProps {
  customer_id: string
  customer_name: string
  customer_tier: CustomerTier
  isVisible: boolean
  onClose: () => void
}

const SpecialPriceManager: React.FC<SpecialPriceManagerProps> = ({
  customer_id,
  customer_name,
  customer_tier,
  isVisible,
  onClose
}) => {
  const { data: session } = useSession()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [specialPrices, setSpecialPrices] = useState<SpecialPrice[]>([])
  const [editingPrice, setEditingPrice] = useState<SpecialPrice | null>(null)

  useEffect(() => {
    if (isVisible) {
      loadProducts()
      loadSpecialPrices()
    }
  }, [isVisible, customer_id])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/products?limit=999') // 載入所有產品
      const result = await response.json()
      if (result.success) {
        setProducts(result.data.products)
      } else {
        message.error(result.error || '載入產品失敗')
      }
    } catch (error) {
      message.error('載入產品列表失敗')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadSpecialPrices = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/customers/${customer_id}/special-prices`)
      const result = await response.json()
      if (result.success) {
        setSpecialPrices(result.data.specialPrices)
      } else {
        message.error(result.error || '載入專屬價格失敗')
      }
    } catch (error) {
      message.error('載入專屬價格列表失敗')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddEdit = (price?: SpecialPrice) => {
    setEditingPrice(price || null)
    if (price) {
      form.setFieldsValue({
        ...price,
        effective_date: price.effective_date ? moment(price.effective_date) : null,
        expiry_date: price.expiry_date ? moment(price.expiry_date) : null,
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ customer_id, is_active: true, discount_amount: 0, discount_rate: 0 })
    }
  }

  const handleSubmit = async (values: SpecialPrice) => {
    setLoading(true)
    try {
      const payload = {
        ...values,
        customer_id,
        effective_date: values.effective_date ? moment(values.effective_date).toISOString() : null,
        expiry_date: values.expiry_date ? moment(values.expiry_date).toISOString() : null,
        // 確保價格計算正確
        standard_price: parseFloat(values.standard_price.toString()),
        special_price: parseFloat(values.special_price.toString()),
        discount_amount: parseFloat(values.discount_amount.toString()),
        discount_rate: parseFloat(values.discount_rate.toString()),
        created_by: session?.user?.id // 記錄創建者
      }

      const url = editingPrice
        ? `/api/customers/${customer_id}/special-prices/${editingPrice.id}`
        : `/api/customers/${customer_id}/special-prices`

      const method = editingPrice ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (result.success) {
        message.success(result.message)
        form.resetFields()
        setEditingPrice(null)
        loadSpecialPrices()
      } else {
        message.error(result.error || '操作失敗')
      }
    } catch (error) {
      message.error('操作失敗')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/customers/${customer_id}/special-prices/${id}`, {
        method: 'DELETE'
      })
      const result = await response.json()
      if (result.success) {
        message.success(result.message)
        loadSpecialPrices()
      } else {
        message.error(result.error || '刪除失敗')
      }
    } catch (error) {
      message.error('刪除失敗')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: '產品名稱',
      dataIndex: ['product', 'name'],
      key: 'product_name',
      render: (text: string, record: SpecialPrice) => (
        <Tooltip title={`產品代碼: ${record.product?.product_code}`}>
          {text}
        </Tooltip>
      )
    },
    {
      title: '標準售價',
      dataIndex: 'standard_price',
      key: 'standard_price',
      render: (price: number) => `$${price.toLocaleString()}`
    },
    {
      title: '專屬價格',
      dataIndex: 'special_price',
      key: 'special_price',
      render: (price: number) => `$${price.toLocaleString()}`
    },
    {
      title: '折扣金額',
      dataIndex: 'discount_amount',
      key: 'discount_amount',
      render: (amount: number) => `$${amount.toLocaleString()}`
    },
    {
      title: '折扣率',
      dataIndex: 'discount_rate',
      key: 'discount_rate',
      render: (rate: number) => `${(rate * 100).toFixed(2)}%`
    },
    {
      title: '生效日期',
      dataIndex: 'effective_date',
      key: 'effective_date',
      render: (date: string) => moment(date).format('YYYY-MM-DD')
    },
    {
      title: '到期日期',
      dataIndex: 'expiry_date',
      key: 'expiry_date',
      render: (date: string) => date ? moment(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? '啟用' : '停用'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'actions',
      render: (text: any, record: SpecialPrice) => (
        <Space size="small">
          <Button icon={<EditOutlined />} size="small" onClick={() => handleAddEdit(record)} />
          <Popconfirm
            title="確定要刪除此專屬價格嗎？"
            onConfirm={() => handleDelete(record.id!)}
            okText="確定"
            cancelText="取消"
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <Modal
      title={`管理 ${customer_name} (${customer_tier}) 的專屬價格`}
      open={isVisible}
      onCancel={onClose}
      footer={null}
      width={1000}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ is_active: true }}
      >
        <Form.Item
          name="product_id"
          label="產品"
          rules={[{ required: true, message: '請選擇產品' }]}
        >
          <Select
            showSearch
            placeholder="選擇產品"
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
            }
            loading={loading}
            disabled={!!editingPrice} // 編輯時不能改產品
          >
            {products.map(product => (
              <Option key={product.id} value={product.id}>
                {product.name} ({product.product_code})
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="reason"
          label="調價原因"
          rules={[{ required: true, message: '請輸入調價原因' }]}
        >
          <Input.TextArea rows={2} placeholder="例如：VIP客戶長期合作" />
        </Form.Item>

        <Space>
          <Form.Item
            name="standard_price"
            label="標準售價"
            rules={[{ required: true, message: '請輸入標準售價' }]}
          >
            <InputNumber min={0} precision={2} formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value!.replace(/\$\s?|(,*)/g, '')} />
          </Form.Item>
          <Form.Item
            name="special_price"
            label="專屬價格"
            rules={[{ required: true, message: '請輸入專屬價格' }]}
          >
            <InputNumber min={0} precision={2} formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value!.replace(/\$\s?|(,*)/g, '')} />
          </Form.Item>
          <Form.Item
            name="discount_amount"
            label="折扣金額"
            rules={[{ required: true, message: '請輸入折扣金額' }]}
          >
            <InputNumber min={0} precision={2} formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value!.replace(/\$\s?|(,*)/g, '')} />
          </Form.Item>
          <Form.Item
            name="discount_rate"
            label="折扣率"
            rules={[{ required: true, message: '請輸入折扣率' }]}
          >
            <InputNumber min={0} max={1} step={0.01} precision={2} formatter={value => `${value}%`} parser={value => value!.replace(/%/g, '')} />
          </Form.Item>
        </Space>

        <Space>
          <Form.Item
            name="effective_date"
            label="生效日期"
            rules={[{ required: true, message: '請選擇生效日期' }]}
          >
            <DatePicker format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="expiry_date" label="到期日期">
            <DatePicker format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="is_active" label="是否啟用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Space>

        <Form.Item name="notes" label="備註">
          <Input.TextArea rows={2} placeholder="輸入備註" />
        </Form.Item>

        <Form.Item style={{ textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {editingPrice ? '更新專屬價格' : '新增專屬價格'}
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <Table
        columns={columns}
        dataSource={specialPrices}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="small"
        style={{ marginTop: '20px' }}
      />
    </Modal>
  )
}

export default SpecialPriceManager
