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
  Typography,
  Switch
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
import { Sale, CreateSaleRequest, CreateSaleItemRequest, ProductWithVariants, ProductVariant } from '@/types/room-2'
import ProductSearchSelect from '@/components/common/ProductSearchSelect'

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

interface SaleOrderItem {
  key: string
  product_id: string
  variantId?: string
  quantity: number
  displayPrice: number
  actualPrice: number
  commission: number
  product: ProductWithVariants
  variant?: ProductVariant
}

interface SaleOrderModalProps {
  visible: boolean
  onCancel: () => void
  onSubmit: (data: CreateSaleRequest) => void
  editingSale?: Sale
  loading?: boolean
  isPreorder?: boolean  // 是否為預購模式
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
  loading = false,
  isPreorder = false
}: SaleOrderModalProps) {
  const { data: session } = useSession()
  const [form] = Form.useForm()

  // 資料狀態
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<ProductWithVariants[]>([])
  const [orderItems, setOrderItems] = useState<SaleOrderItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isPreorderMode, setIsPreorderMode] = useState(isPreorder)

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
        customer_id: editingSale.customer_id,
        fundingSource: editingSale.funding_source,
        paymentTerms: editingSale.payment_terms,
        dueDate: editingSale.due_date ? dayjs(editingSale.due_date) : null,
        notes: editingSale.notes,
        is_preorder: editingSale.is_preorder || false,
        expected_arrival_date: editingSale.expected_arrival_date ? dayjs(editingSale.expected_arrival_date) : null
      })

      setIsPreorderMode(editingSale.is_preorder || false)

      // 設定已選客戶
      const customer = customers.find(c => c.id === editingSale.customer_id)
      setSelectedCustomer(customer || null)

      // 載入已有的訂單明細
      if (editingSale.items) {
        const items = editingSale.items.map((item, index: number) => ({
          key: `item-${index}`,
          product_id: item.product_id,
          variantId: item.variant_id,
          quantity: item.quantity,
          displayPrice: item.unit_price,
          actualPrice: item.actual_unit_price || item.unit_price,
          commission: (item.actual_unit_price || item.unit_price) - item.unit_price,
          product: (item.product || {} as ProductWithVariants) as ProductWithVariants,
          variant: item.variant
        }))
        setOrderItems(items)
      }
    } else {
      // 新增模式重置
      form.resetFields()
      setOrderItems([])
      setSelectedCustomer(null)
      setIsPreorderMode(isPreorder)
    }
  }, [editingSale, visible, customers, form, isPreorder])

  // 客戶選擇處理
  const handleCustomerChange = (customer_id: string) => {
    const customer = customers.find(c => c.id === customer_id)
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
      product_id: '',
      quantity: 1,
      displayPrice: 0,
      actualPrice: 0,
      commission: 0,
      product: null as any // 避免空對象造成錯誤
    }
    setOrderItems(prev => [...prev, newItem])
  }

  // 刪除商品
  const removeProduct = (key: string) => {
    setOrderItems(prev => prev.filter(item => item.key !== key))
  }

  // 商品選擇處理
  const handleProductChange = (key: string, product_id: string, variantId?: string) => {
    const product = products.find(p => p.id === product_id)
    if (!product) return

    const variant = variantId ? product.variants?.find(v => v.id === variantId) : undefined
    const basePrice = variant?.current_price ?? product.current_price ?? 0

    // 價格可能尚未設定，提醒但仍允許選擇（讓使用者可手動輸入價格）
    if (basePrice <= 0) {
      message.warning(`商品「${product.name}」目前未設定價格，請於價格區塊手動輸入`)
    }

    setOrderItems(prev => prev.map(item =>
      item.key === key ? {
        ...item,
        product_id,
        variantId: variantId || undefined,
        product: {
          ...product,
          current_price: product.current_price ?? 0,
          variants: product.variants || []
        },
        variant: variant ? {
          ...variant,
          current_price: variant.current_price ?? 0
        } : undefined,
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
    setOrderItems(prev => prev.map(item => {
      if (item.key !== key) return item
      // 避免相同數值反覆 setState 造成重渲染循環
      if (
        item.displayPrice === prices.displayPrice &&
        item.actualPrice === prices.actualPrice &&
        item.commission === prices.commission
      ) {
        return item
      }
      return { ...item, ...prices }
    }))
  }

  // 🔒 優化：使用 onBlur 而非 onChange，避免輸入時頻繁觸發
  const handleDisplayPriceBlur = (key: string, value: number | null) => {
    const finalValue = value || 0
    const item = orderItems.find(i => i.key === key)
    if (item && item.displayPrice !== finalValue) {
      handlePriceChange(key, {
        displayPrice: finalValue,
        actualPrice: item.actualPrice,
        commission: (item.actualPrice - finalValue)
      })
    }
  }

  const handleActualPriceBlur = (key: string, value: number | null) => {
    const finalValue = value || 0
    const item = orderItems.find(i => i.key === key)
    if (item && item.actualPrice !== finalValue) {
      handlePriceChange(key, {
        displayPrice: item.displayPrice,
        actualPrice: finalValue,
        commission: (finalValue - item.displayPrice)
      })
    }
  }

  // 數量變更處理
  const handleQuantityChange = (key: string, quantity: number) => {
    setOrderItems(prev => prev.map(item =>
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

      // 後端 API 期望 snake_case 欄位，且需要 prices 陣列
      const displayPrices = orderItems.map(item => item.displayPrice)
      const actualPrices = orderItems.map(item => item.actualPrice)

      const submitData = {
        customer_id: values.customer_id,
        funding_source: values.fundingSource,
        payment_terms: values.paymentTerms,
        due_date: values.dueDate?.toISOString(),
        notes: values.notes,
        is_preorder: isPreorderMode,
        expected_arrival_date: isPreorderMode && values.expected_arrival_date ? values.expected_arrival_date.toISOString() : undefined,
        items: orderItems.map(item => ({
          product_id: item.product_id,
          variant_id: item.variantId,
          quantity: item.quantity,
          unit_price: item.displayPrice,
          actual_unit_price: item.actualPrice,
          total_price: item.displayPrice * item.quantity,
          actual_total_price: item.actualPrice * item.quantity
        })),
        total_amount: totalDisplayAmount,
        actual_amount: totalActualAmount,
        displayPrices,
        actualPrices
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
      render: (_: any, record: SaleOrderItem) => (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <ProductSearchSelect
            placeholder="搜尋商品... 如：山崎、響、NIKKA"
            allowQuickAdd={true}
            value={record.product_id ? {
              productId: record.product_id,
              productName: record.product?.name,
              variantId: record.variantId
            } : undefined}
            onChange={(value) => {
              if (value) {
                handleProductChange(record.key, value.productId, value.variantId)
              }
            }}
            style={{ width: '100%' }}
          />

          {record.product?.variants && record.product.variants.length > 0 && (
            <Select
              style={{ width: '100%' }}
              placeholder="⚠️ 請選擇版本 (必選)"
              value={record.variantId || undefined}
              onChange={(value) => handleProductChange(record.key, record.product_id, value)}
              allowClear
              notFoundContent="無可用版本"
            >
              {record.product.variants.map(variant => {
                // 組合完整商品名稱
                const variantName = variant.description || variant.variant_type || '標準款'
                const fullProductName = `${record.product?.name || ''} - ${variantName}`

                // 🔒 根據資金來源顯示對應倉庫的庫存
                const fundingSource = form.getFieldValue('fundingSource')
                const targetWarehouse = fundingSource === 'PERSONAL' ? 'PRIVATE' : 'COMPANY'
                const warehouseName = targetWarehouse === 'COMPANY' ? '公司倉' : '個人倉'

                let availableStock = 0
                if (variant.inventory && Array.isArray(variant.inventory)) {
                  const warehouseInventory = variant.inventory.find((inv: any) => inv.warehouse === targetWarehouse)
                  availableStock = warehouseInventory?.available || 0
                } else {
                  // 舊資料兼容：沒有 inventory 數組時使用總庫存
                  availableStock = variant.available_stock || variant.stock_quantity || 0
                }

                return (
                  <Option key={variant.id} value={variant.id}>
                    <div style={{
                      wordWrap: 'break-word',
                      whiteSpace: 'normal',
                      overflow: 'hidden'
                    }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: 4 }}>
                        {fullProductName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#999' }}>
                        {variant.variant_code} | {warehouseName}: {availableStock}瓶 | NT$ {variant.current_price?.toLocaleString()}
                      </div>
                    </div>
                  </Option>
                )
              })}
            </Select>
          )}
        </Space>
      )
    },
    {
      title: '數量',
      key: 'quantity',
      width: 100,
      render: (_: any, record: SaleOrderItem) => (
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
      render: (_: any, record: SaleOrderItem) => (
        record.product_id ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text type="secondary" style={{ marginRight: 8 }}>顯示單價</Text>
              <InputNumber
                min={0}
                precision={0}
                defaultValue={record.displayPrice}
                onBlur={(e) => {
                  const value = parseFloat(e.target.value) || 0
                  handleDisplayPriceBlur(record.key, value)
                }}
                onPressEnter={(e) => {
                  const value = parseFloat((e.target as HTMLInputElement).value) || 0
                  handleDisplayPriceBlur(record.key, value)
                }}
                style={{ width: '100%' }}
                prefix="NT$"
              />
            </div>
            <SuperAdminOnly>
              <div>
                <Text type="secondary" style={{ marginRight: 8 }}>實收單價</Text>
                <InputNumber
                  min={0}
                  precision={0}
                  defaultValue={record.actualPrice}
                  onBlur={(e) => {
                    const value = parseFloat(e.target.value) || 0
                    handleActualPriceBlur(record.key, value)
                  }}
                  onPressEnter={(e) => {
                    const value = parseFloat((e.target as HTMLInputElement).value) || 0
                    handleActualPriceBlur(record.key, value)
                  }}
                  style={{ width: '100%' }}
                  prefix="NT$"
                />
              </div>
            </SuperAdminOnly>
          </Space>
        ) : (
          <Text type="secondary">請先選擇商品</Text>
        )
      )
    },
    {
      title: '小計',
      key: 'subtotal',
      width: 120,
      render: (_: any, record: SaleOrderItem) => (
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
      render: (_: any, record: SaleOrderItem) => (
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

  // 臨時錯誤邊界：避免少數資料異常導致整個頁面崩潰
  class SafeBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }>{
    constructor(props: any) {
      super(props)
      this.state = { hasError: false }
    }
    static getDerivedStateFromError() {
      return { hasError: true }
    }
    componentDidCatch(error: any, info: any) {
      console.error('SaleOrderModal render error:', error, info?.componentStack)
    }
    render() {
      if (this.state.hasError) {
        return <Alert type="error" message="商品區塊發生錯誤，請截圖給開發者" />
      }
      return <>{this.props.children}</>
    }
  }

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
        {/* 預購模式切換 */}
        <Alert
          message={
            <Space>
              <Text>訂單類型：</Text>
              <Switch
                checked={isPreorderMode}
                onChange={setIsPreorderMode}
                checkedChildren="預購單"
                unCheckedChildren="一般銷售"
              />
              {isPreorderMode && <Text type="warning">⚠️ 預購單不會檢查庫存</Text>}
            </Space>
          }
          type={isPreorderMode ? 'warning' : 'info'}
          style={{ marginBottom: 16 }}
        />

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="customer_id"
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
                <Option value="PERSONAL">個人調貨</Option>
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

        {/* 預購單專屬欄位：預計到貨日期 */}
        {isPreorderMode && (
          <Form.Item
            name="expected_arrival_date"
            label={
              <Space>
                <CalendarOutlined />
                預計到貨日期
              </Space>
            }
            rules={[{ required: true, message: '預購單必須填寫預計到貨日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="選擇預計到貨日期"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
        )}

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

        <SafeBoundary>
          <Table
            rowKey="key"
            columns={itemColumns}
            dataSource={orderItems}
            pagination={false}
            size="small"
            locale={{
              emptyText: '請點擊「添加商品」開始創建訂單'
            }}
          />
        </SafeBoundary>
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
