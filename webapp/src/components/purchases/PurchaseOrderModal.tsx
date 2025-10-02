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
import { HideFromInvestor } from '@/components/auth/RoleGuard'
import { CreatePurchaseRequest, ProductWithVariants, ProductVariant, AlcoholCategory } from '@/types/room-2'
import ProductSearchSelect from '@/components/common/ProductSearchSelect'
import { DEFAULT_VARIANT_TYPE_LABEL } from '@shared/utils/constants'

const { Option } = Select
const { TextArea } = Input
const { Title, Text } = Typography

interface PurchaseOrderItem {
  key: string
  product_id: string
  variant_id?: string
  quantity: number
  unit_price: number
  total_price: number
  product: ProductWithVariants
  variant?: ProductVariant
}

interface PurchaseOrderModalProps {
  visible: boolean
  onCancel: () => void
  onSubmit: (data: CreatePurchaseRequest) => void
  editingPurchase?: any
  loading?: boolean
}

/**
 * 📦 採購訂單創建/編輯Modal
 * 核心功能：商品選擇 + 採購明細管理
 */
export function PurchaseOrderModal({
  visible,
  onCancel,
  onSubmit,
  editingPurchase,
  loading = false
}: PurchaseOrderModalProps) {
  const { data: session } = useSession()
  const [form] = Form.useForm()

  // 資料狀態
  const [products, setProducts] = useState<ProductWithVariants[]>([])
  const [orderItems, setOrderItems] = useState<PurchaseOrderItem[]>([])

  // 載入狀態
  const [loadingProducts, setLoadingProducts] = useState(false)

  // 建立預設 ProductWithVariants 物件的輔助函數
  const createDefaultProduct = (): ProductWithVariants => ({
    id: '',
    name: '',
    product_code: '',
    supplier: '',
    category: AlcoholCategory.OTHER,
    volume_ml: 0,
    alc_percentage: 0,
    weight_kg: 0,
    package_weight_kg: 0,
    total_weight_kg: 0,
    has_box: false,
    has_accessories: false,
    accessory_weight_kg: 0,
    accessories: [],
    hs_code: '',
    manufacturing_date: '',
    expiry_date: '',
    standard_price: 0,
    current_price: 0,
    cost_price: 0,
    min_price: 0,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    variants: [],
    _count: {
      variants: 0,
      sale_items: 0
    }
  })

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
      loadProducts()
    }
  }, [visible])

  // 編輯模式初始化
  useEffect(() => {
    if (editingPurchase && visible) {
      form.setFieldsValue({
        supplier: editingPurchase.supplier,
        currency: editingPurchase.currency,
        fundingSource: editingPurchase.fundingSource,
        notes: editingPurchase.notes
      })

      // 載入已有的採購明細
      if (editingPurchase.items) {
        const items = editingPurchase.items.map((item: any, index: number) => ({
          key: `item-${index}`,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          product: item.product || createDefaultProduct(),
          variant: item.variant
        }))
        setOrderItems(items)
      }
    } else {
      // 新增模式重置
      form.resetFields()
      setOrderItems([])
      form.setFieldsValue({
        currency: 'JPY',
        fundingSource: 'COMPANY'
      })
    }
  }, [editingPurchase, visible, form])

  // 新增商品
  const addProduct = () => {
    const newItem: PurchaseOrderItem = {
      key: `item-${Date.now()}`,
      product_id: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      product: createDefaultProduct()
    }
    setOrderItems([...orderItems, newItem])
  }

  // 刪除商品
  const removeProduct = (key: string) => {
    setOrderItems(orderItems.filter(item => item.key !== key))
  }

  // 商品選擇處理
  const handleProductChange = (key: string, product_id: string) => {
    const product = products.find(p => p.id === product_id)
    if (!product) return

    setOrderItems(prev => prev.map(item => {
      if (item.key === key) {
        return {
          ...item,
          product_id: product_id,
          product,
          variant_id: undefined,
          variant: undefined,
          unit_price: 0, // 重置價格，讓用戶手動輸入
          total_price: 0
        }
      }
      return item
    }))
  }

  // 變體選擇處理
  const handleVariantChange = (key: string, variant_id: string) => {
    setOrderItems(prev => prev.map(item => {
      if (item.key === key) {
        const variant = item.product.variants?.find(v => v.id === variant_id)
        return {
          ...item,
          variant_id,
          variant,
          unit_price: variant?.cost_price || 0,
          total_price: (variant?.cost_price || 0) * item.quantity
        }
      }
      return item
    }))
  }

  // 數量變更處理
  const handleQuantityChange = (key: string, quantity: number) => {
    setOrderItems(prev => prev.map(item => {
      if (item.key === key) {
        const total_price = item.unit_price * quantity
        return {
          ...item,
          quantity,
          total_price
        }
      }
      return item
    }))
  }

  // 單價變更處理
  const handlePriceChange = (key: string, unit_price: number) => {
    setOrderItems(prev => prev.map(item => {
      if (item.key === key) {
        const total_price = unit_price * item.quantity
        return {
          ...item,
          unit_price,
          total_price
        }
      }
      return item
    }))
  }

  // 🔥 新的進階產品選擇處理 (支援搜尋和快速新增)
  const handleAdvancedProductChange = (key: string, selection: any) => {
    setOrderItems(prev => prev.map(item => {
      if (item.key === key) {
        // 建構產品物件
        const product: ProductWithVariants = {
          id: selection.productId,
          name: selection.productName,
          product_code: selection.productCode,
          supplier: selection.supplier || '',
          category: AlcoholCategory.WHISKY, // 預設值
          volume_ml: selection.volume_ml || 750,
          alc_percentage: selection.alc_percentage || 40,
          weight_kg: 1.5,
          package_weight_kg: 0.3, // 外盒重量預設值
          total_weight_kg: 1.8, // 總重量預設值
          has_box: true, // 預設有外盒
          has_accessories: false, // 預設無附件
          accessory_weight_kg: 0, // 附件重量
          accessories: [], // 附件清單
          hs_code: '', // 稅則號列
          manufacturing_date: '', // 生產日期
          expiry_date: '', // 到期日期
          standard_price: selection.price || 0,
          current_price: selection.price || 0,
          cost_price: 0,
          min_price: 0,
          is_active: true,
          created_at: new Date(), // 建立時間
          updated_at: new Date(), // 更新時間
          variants: [],
          _count: {
            variants: 0, // 變體數量
            sale_items: 0 // 銷售項目數量
          }
        }

        // 建構變體物件
        const variant: ProductVariant = {
          id: selection.variantId,
          product_id: selection.productId, // 補齊缺少的 product_id
          variant_code: selection.variantCode,
          variant_type: selection.variantType || DEFAULT_VARIANT_TYPE_LABEL,
          description: selection.description || '原裝完整',
          base_price: selection.price || 0,
          current_price: selection.price || 0,
          cost_price: selection.price || 0,
          stock_quantity: selection.stock || 0,
          available_stock: selection.stock || 0,
          reserved_stock: 0,
          condition: 'Normal',
          limited_edition: false, // 補齊缺少的 limited_edition
          created_at: new Date(), // 補齊缺少的 created_at
          updated_at: new Date()  // 補齊缺少的 updated_at
        }

        return {
          ...item,
          product_id: selection.productId,
          variant_id: selection.variantId,
          product,
          variant,
          unit_price: selection.price || 0,
          total_price: (selection.price || 0) * item.quantity
        }
      }
      return item
    }))
  }

  // 計算總金額
  const total_amount = orderItems.reduce((sum, item) => sum + item.total_price, 0)

  // 取得表單幣別
  const selectedCurrency = form.getFieldValue('currency') || 'TWD'

  // 表格欄位定義
  const columns = [
    {
      title: '商品搜尋',
      key: 'product',
      width: 250,
      render: (_: any, record: PurchaseOrderItem) => (
        <ProductSearchSelect
          placeholder="搜尋商品... (如: 山崎, 響, NIKKA)"
          allowQuickAdd={true}
          value={record.product_id ? {
            productId: record.product_id,
            variantId: record.variant_id,
            productName: record.product?.name,
            productCode: record.product?.product_code
          } : undefined}
          onChange={(selection) => {
            if (selection) {
              // 🔥 整合新的搜尋選擇邏輯
              handleAdvancedProductChange(record.key, selection)
            }
          }}
        />
      )
    },
    {
      title: '商品名稱',
      key: 'variant_info',
      width: 200,
      render: (_: any, record: PurchaseOrderItem) => {
        if (!record.variant_id || !record.variant) {
          return <Text type="secondary">請先選擇商品</Text>
        }

        // 組合完整商品名稱
        const variantName = record.variant.description || record.variant.variant_type || '標準款'
        const fullProductName = `${record.product?.name || ''} - ${variantName}`

        return (
          <div style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
            <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
              {fullProductName}
            </div>
            <div style={{ fontSize: '10px', color: '#999', marginTop: 2 }}>
              {record.variant.variant_code}
            </div>
            {(record.variant.available_stock ?? 0) > 0 && (
              <div style={{ fontSize: '10px', color: '#52c41a', marginTop: 2 }}>
                庫存: {record.variant.available_stock}
              </div>
            )}
          </div>
        )
      }
    },
    {
      title: '數量',
      key: 'quantity',
      width: 100,
      render: (_: any, record: PurchaseOrderItem) => (
        <InputNumber
          min={1}
          value={record.quantity}
          onChange={(value) => handleQuantityChange(record.key, value || 1)}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: '單價',
      key: 'unit_price',
      width: 120,
      render: (_: any, record: PurchaseOrderItem) => (
        <InputNumber
          min={0}
          step={0.01}
          value={record.unit_price}
          onChange={(value) => handlePriceChange(record.key, value || 0)}
          style={{ width: '100%' }}
          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
        />
      )
    },
    {
      title: '小計',
      key: 'total_price',
      width: 120,
      render: (_: any, record: PurchaseOrderItem) => (
        <Text strong>{record.total_price.toLocaleString()}</Text>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: PurchaseOrderItem) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeProduct(record.key)}
        />
      )
    }
  ]

  // 提交處理
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      // 驗證採購明細
      if (orderItems.length === 0) {
        message.error('請至少添加一項商品')
        return
      }

      const invalidItems = orderItems.filter(item =>
        !item.product_id || item.quantity <= 0 || item.unit_price < 0
      )

      if (invalidItems.length > 0) {
        message.error('請完善所有商品的資訊')
        return
      }

      // 組織提交資料
      const submitData: CreatePurchaseRequest = {
        // 後端採用 snake_case 欄位命名
        supplier: values.supplier,
        currency: values.currency,
        exchange_rate: 1, // 預設匯率為1，實際匯率在進貨時填寫
        funding_source: values.fundingSource,
        notes: values.notes,
        items: orderItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product?.name || '',
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          // ✅ 加入酒精度和容量資訊
          alc_percentage: item.product?.alc_percentage,
          volume_ml: item.product?.volume_ml
        }))
      }

      onSubmit(submitData)
    } catch (error) {
      console.error('表單驗證失敗:', error)
    }
  }

  // 自定義驗證規則
  const validationRules = {
    supplier: [
      { required: true, message: '請輸入供應商名稱' },
      { min: 2, message: '供應商名稱至少需要2個字符' },
      { max: 100, message: '供應商名稱不能超過100個字符' }
    ],
    currency: [
      { required: true, message: '請選擇幣別' }
    ],
    fundingSource: [
      { required: true, message: '請選擇資金來源' }
    ]
  }

  return (
    <Modal
      title={editingPurchase ? '編輯採購單' : '新增採購單'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width="90%"
      style={{ maxWidth: '1200px' }}
      okText="確定"
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        validateTrigger={['onBlur', 'onChange']}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="supplier"
              label="供應商"
              rules={validationRules.supplier}
            >
              <Input placeholder="請輸入供應商名稱" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="currency"
              label="幣別"
              rules={validationRules.currency}
            >
              <Select placeholder="請選擇幣別">
                <Option value="JPY">日圓 (JPY)</Option>
                <Option value="USD">美元 (USD)</Option>
                <Option value="EUR">歐元 (EUR)</Option>
                <Option value="GBP">英鎊 (GBP)</Option>
                <Option value="TWD">新台幣 (TWD)</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="fundingSource"
              label="資金來源"
              rules={validationRules.fundingSource}
            >
              <Select placeholder="請選擇資金來源">
                <Option value="COMPANY">公司資金</Option>
                <Option value="PERSONAL">個人調貨</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="notes" label="備註">
          <TextArea rows={2} placeholder="請輸入備註資訊" />
        </Form.Item>

        <Divider>採購明細</Divider>

        <div style={{ marginBottom: 16 }}>
          <Button
            type="dashed"
            onClick={addProduct}
            icon={<PlusOutlined />}
            style={{ width: '100%' }}
          >
            添加商品
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={orderItems}
          pagination={false}
          size="small"
          scroll={{ x: 800 }}
          locale={{ emptyText: '請點擊上方按鈕添加商品' }}
        />

        {orderItems.length > 0 && (
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Title level={4} style={{ margin: 0 }}>
              總金額：{selectedCurrency} {total_amount.toLocaleString()}
            </Title>
            {selectedCurrency !== 'TWD' && (
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 4 }}>
                ※ 實際台幣金額將在轉進貨時依照當日匯率計算
              </Text>
            )}
          </div>
        )}
      </Form>
    </Modal>
  )
}
