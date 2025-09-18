'use client'

import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Select,
  InputNumber,
  Input,
  DatePicker,
  Button,
  Space,
  Divider,
  Card,
  Table,
  message,
  Alert,
  Row,
  Col,
  Typography
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  CalendarOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import dayjs from 'dayjs'
import { HideFromInvestor, SuperAdminOnly } from '@/components/auth/RoleGuard'
import { DualPriceManager } from './DualPriceManager'
import { Sale, CreateSaleRequest, CreateSaleItemRequest } from '@/types/room-2'

const { Option } = Select
const { TextArea } = Input
const { Title, Text } = Typography

interface Customer {
  id: string
  customer_code: string
  name: string
  company?: string
  tier: string
  paymentTerms: string
}

interface Product {
  id: string
  product_code: string
  name: string
  category: string
  currentPrice: number
  standardPrice: number
  variants?: ProductVariant[]
}

interface ProductVariant {
  id: string
  variant_code: string
  variantType: string
  description: string
  currentPrice: number
}

interface SaleOrderItem {
  key: string
  productId: string
  variantId?: string
  quantity: number
  displayPrice: number
  actualPrice: number
  commission: number
  product: Product
  variant?: ProductVariant
}

interface SaleOrderModalProps {
  visible: boolean
  onCancel: () => void
  onSubmit: (data: CreateSaleRequest) => void
  editingSale?: Sale
  loading?: boolean
}

/**
 * 💰 銷售訂單創建/編輯Modal
 * 核心功能：雙重價格設定 + 商品明細管理
 */
export function SaleOrderModal({
  visible,
  onCancel,
  onSubmit,
  editingSale,
  loading = false
}: SaleOrderModalProps) {
  const { data: session } = useSession()
  const [form] = Form.useForm()

  // 資料狀態
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orderItems, setOrderItems] = useState<SaleOrderItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // 載入狀態
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)

  // 載入客戶列表
  const loadCustomers = async () => {
    setLoadingCustomers(true)
    try {
      const response = await fetch('/api/customers?limit=100')
      const result = await response.json()
      if (result.success) {
        setCustomers(result.data.customers)
      }
    } catch (error) {
      console.error('載入客戶失敗:', error)
      message.error('載入客戶列表失敗')
    } finally {
      setLoadingCustomers(false)
    }
  }

  // 載入商品列表
  const loadProducts = async () => {
    setLoadingProducts(true)
    try {
      const response = await fetch('/api/products?limit=100&includeVariants=true')
      const result = await response.json()
      if (result.success) {
        setProducts(result.data.products)
      }
    } catch (error) {
      console.error('載入商品失敗:', error)
      message.error('載入商品列表失敗')
    } finally {
      setLoadingProducts(false)
    }
  }

  useEffect(() => {
    if (visible) {
      loadCustomers()
      loadProducts()
    }
  }, [visible])

  // 編輯模式初始化
  useEffect(() => {
    if (editingSale && visible) {
      form.setFieldsValue({
        customerId: editingSale.customerId,
        fundingSource: editingSale.fundingSource,
        paymentTerms: editingSale.paymentTerms,
        dueDate: editingSale.dueDate ? dayjs(editingSale.dueDate) : null,
        notes: editingSale.notes
      })

      // 設定已選客戶
      const customer = customers.find(c => c.id === editingSale.customerId)
      setSelectedCustomer(customer || null)

      // 載入已有的訂單明細
      if (editingSale.items) {
        const items = editingSale.items.map((item, index: number) => ({
          key: `item-${index}`,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          displayPrice: item.unitPrice,
          actualPrice: item.actualUnitPrice || item.unitPrice,
          commission: (item.actualUnitPrice || item.unitPrice) - item.unitPrice,
          product: item.product,
          variant: item.variant
        }))
        setOrderItems(items)
      }
    } else {
      // 新增模式重置
      form.resetFields()
      setOrderItems([])
      setSelectedCustomer(null)
    }
  }, [editingSale, visible, customers])

  // 客戶選擇處理
  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId)
    setSelectedCustomer(customer || null)

    if (customer) {
      // 自動設定付款條件
      form.setFieldValue('paymentTerms', customer.paymentTerms)

      // 根據付款條件設定到期日
      if (customer.paymentTerms === 'WEEKLY') {
        form.setFieldValue('dueDate', dayjs().add(7, 'days'))
      } else if (customer.paymentTerms === 'MONTHLY') {
        form.setFieldValue('dueDate', dayjs().add(30, 'days'))
      } else if (customer.paymentTerms === 'SIXTY_DAYS') {
        form.setFieldValue('dueDate', dayjs().add(60, 'days'))
      }
    }
  }

  // 新增商品
  const addProduct = () => {
    const newItem: SaleOrderItem = {
      key: `item-${Date.now()}`,
      productId: '',
      quantity: 1,
      displayPrice: 0,
      actualPrice: 0,
      commission: 0,
      product: {} as Product
    }
    setOrderItems([...orderItems, newItem])
  }

  // 刪除商品
  const removeProduct = (key: string) => {
    setOrderItems(orderItems.filter(item => item.key !== key))
  }

  // 商品選擇處理
  const handleProductChange = (key: string, productId: string, variantId?: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    const variant = variantId ? product.variants?.find(v => v.id === variantId) : undefined
    const basePrice = variant ? variant.currentPrice : product.currentPrice

    setOrderItems(orderItems.map(item =>
      item.key === key ? {
        ...item,
        productId,
        variantId,
        product,
        variant,
        displayPrice: basePrice,
        actualPrice: basePrice,
        commission: 0
      } : item
    ))
  }

  // 價格變更處理
  const handlePriceChange = (key: string, prices: {
    displayPrice: number
    actualPrice: number
    commission: number
  }) => {
    setOrderItems(orderItems.map(item =>
      item.key === key ? {
        ...item,
        ...prices
      } : item
    ))
  }

  // 數量變更處理
  const handleQuantityChange = (key: string, quantity: number) => {
    setOrderItems(orderItems.map(item =>
      item.key === key ? {
        ...item,
        quantity
      } : item
    ))
  }

  // 計算總金額
  const calculateTotals = () => {
    const totalDisplayAmount = orderItems.reduce((sum, item) =>
      sum + (item.displayPrice * item.quantity), 0)
    const totalActualAmount = orderItems.reduce((sum, item) =>
      sum + (item.actualPrice * item.quantity), 0)
    const totalCommission = totalActualAmount - totalDisplayAmount

    return { totalDisplayAmount, totalActualAmount, totalCommission }
  }

  // 表單提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (orderItems.length === 0) {
        message.error('請至少添加一個商品')
        return
      }

      const { totalDisplayAmount, totalActualAmount } = calculateTotals()

      const submitData = {
        ...values,
        dueDate: values.dueDate?.toISOString(),
        items: orderItems.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.displayPrice,
          actualUnitPrice: item.actualPrice,
          totalPrice: item.displayPrice * item.quantity,
          actualTotalPrice: item.actualPrice * item.quantity
        })),
        totalAmount: totalDisplayAmount,
        actualAmount: totalActualAmount
      }

      onSubmit(submitData)
    } catch (error) {
      console.error('表單驗證失敗:', error)
    }
  }

  // 商品明細表格欄位
  const itemColumns = [
    {
      title: '商品',
      key: 'product',
      width: 200,
      render: (_, record: SaleOrderItem) => (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Select
            style={{ width: '100%' }}
            placeholder="選擇商品"
            value={record.productId || undefined}
            onChange={(value) => handleProductChange(record.key, value)}
            loading={loadingProducts}
            showSearch
            optionFilterProp="children"
          >
            {products.map(product => (
              <Option key={product.id} value={product.id}>
                {product.name} ({product.product_code})
              </Option>
            ))}
          </Select>

          {record.product.variants && record.product.variants.length > 0 && (
            <Select
              style={{ width: '100%' }}
              placeholder="選擇變體"
              value={record.variantId || undefined}
              onChange={(value) => handleProductChange(record.key, record.productId, value)}
              allowClear
            >
              {record.product.variants.map(variant => (
                <Option key={variant.id} value={variant.id}>
                  {variant.description} ({variant.variant_code})
                </Option>
              ))}
            </Select>
          )}
        </Space>
      )
    },
    {
      title: '數量',
      key: 'quantity',
      width: 100,
      render: (_, record: SaleOrderItem) => (
        <InputNumber
          min={1}
          value={record.quantity}
          onChange={(value) => handleQuantityChange(record.key, value || 1)}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: '價格設定',
      key: 'price',
      width: 300,
      render: (_, record: SaleOrderItem) => (
        record.productId ? (
          <DualPriceManager
            productId={record.productId}
            variantId={record.variantId}
            quantity={record.quantity}
            basePrice={record.variant?.currentPrice || record.product.currentPrice || 0}
            onPriceChange={(prices) => handlePriceChange(record.key, prices)}
          />
        ) : null
      )
    },
    {
      title: '小計',
      key: 'subtotal',
      width: 120,
      render: (_, record: SaleOrderItem) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>
            NT$ {(record.displayPrice * record.quantity).toLocaleString()}
          </div>
          <SuperAdminOnly>
            {record.actualPrice !== record.displayPrice && (
              <div style={{ fontSize: '12px', color: '#52c41a' }}>
                實收: NT$ {(record.actualPrice * record.quantity).toLocaleString()}
              </div>
            )}
          </SuperAdminOnly>
        </div>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (_, record: SaleOrderItem) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeProduct(record.key)}
        />
      )
    }
  ]

  const { totalDisplayAmount, totalActualAmount, totalCommission } = calculateTotals()

  return (
    <Modal
      title={
        <Space>
          <ShoppingCartOutlined />
          {editingSale ? '編輯銷售訂單' : '新增銷售訂單'}
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      width="90%"
      style={{ maxWidth: '1200px' }}
      confirmLoading={loading}
      okText={editingSale ? '更新' : '創建'}
      cancelText="取消"
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="customerId"
              label={
                <Space>
                  <UserOutlined />
                  客戶
                </Space>
              }
              rules={[{ required: true, message: '請選擇客戶' }]}
            >
              <Select
                placeholder="選擇客戶"
                loading={loadingCustomers}
                onChange={handleCustomerChange}
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
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="fundingSource"
              label="資金來源"
              rules={[{ required: true, message: '請選擇資金來源' }]}
            >
              <Select placeholder="選擇資金來源">
                <Option value="COMPANY">公司資金</Option>
                <HideFromInvestor>
                  <Option value="PERSONAL">個人調貨</Option>
                </HideFromInvestor>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="paymentTerms"
              label="付款條件"
              rules={[{ required: true, message: '請選擇付款條件' }]}
            >
              <Select placeholder="選擇付款條件">
                <Option value="CASH">現金</Option>
                <Option value="WEEKLY">週結</Option>
                <Option value="MONTHLY">月結</Option>
                <Option value="SIXTY_DAYS">60天</Option>
              </Select>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="dueDate"
              label={
                <Space>
                  <CalendarOutlined />
                  到期日
                </Space>
              }
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="notes" label="備註">
          <TextArea rows={2} placeholder="訂單備註" />
        </Form.Item>
      </Form>

      <Divider />

      {/* 商品明細 */}
      <div style={{ marginBottom: '16px' }}>
        <Space style={{ marginBottom: '16px' }}>
          <Title level={5} style={{ margin: 0 }}>商品明細</Title>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addProduct}
          >
            添加商品
          </Button>
        </Space>

        <Table
          columns={itemColumns}
          dataSource={orderItems}
          pagination={false}
          size="small"
          locale={{
            emptyText: '請點擊「添加商品」開始創建訂單'
          }}
        />
      </div>

      {/* 總計 */}
      {orderItems.length > 0 && (
        <Card size="small">
          <Row gutter={16}>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary">顯示總額</Text>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                  NT$ {totalDisplayAmount.toLocaleString()}
                </div>
              </div>
            </Col>

            <SuperAdminOnly>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary">實收總額</Text>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                    NT$ {totalActualAmount.toLocaleString()}
                  </div>
                </div>
              </Col>

              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary">傭金</Text>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: totalCommission > 0 ? '#fa8c16' : '#666'
                  }}>
                    NT$ {totalCommission.toLocaleString()}
                  </div>
                </div>
              </Col>
            </SuperAdminOnly>
          </Row>
        </Card>
      )}
    </Modal>
  )
}