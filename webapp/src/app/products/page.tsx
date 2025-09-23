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
  Tooltip,
  InputNumber,
  Switch,
  Badge,
  Typography
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  AppstoreOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import type {
  Product,
  ProductWithVariants,
  AlcoholCategory,
  ProductFormData,
  ProductFilters
} from '@/types/room-2'

const { Search } = Input
const { Option } = Select
const { Text } = Typography

/**
 * 🏠 Room-2: 商品管理頁面
 * 提供商品列表、新增、編輯、刪除、變體管理功能
 */
export default function ProductsPage() {
  const { data: session } = useSession()
  const [products, setProducts] = useState<ProductWithVariants[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<ProductFilters>({
    page: 1,
    limit: 20,
    search: '',
    orderBy: 'created_at',
    order: 'desc',
    active: true
  })

  // Modal狀態
  const [modalVisible, setModalVisible] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [variantsModalVisible, setVariantsModalVisible] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithVariants | null>(null)
  const [form] = Form.useForm()

  // 載入商品列表
  const loadProducts = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value))
        }
      })

      const response = await fetch(`/api/products?${queryParams}`)
      const result = await response.json()

      if (result.success) {
        setProducts(result.data.products)
        setTotal(result.data.total)
      } else {
        message.error(result.error || '載入失敗')
      }
    } catch (error) {
      message.error('載入商品列表失敗')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [filters])

  // 酒類分類中文名稱
  const getCategoryName = (category: AlcoholCategory) => {
    const names = {
      WHISKY: '威士忌',
      WINE: '葡萄酒',
      SAKE: '清酒',
      BEER: '啤酒',
      SPIRITS: '烈酒',
      LIQUEUR: '利口酒',
      OTHER: '其他'
    }
    return names[category] || category
  }

  // 酒類分類顏色
  const getCategoryColor = (category: AlcoholCategory) => {
    const colors = {
      WHISKY: 'gold',
      WINE: 'red',
      SAKE: 'blue',
      BEER: 'orange',
      SPIRITS: 'purple',
      LIQUEUR: 'pink',
      OTHER: 'default'
    }
    return colors[category] || 'default'
  }

  // 表格欄位定義
  const columns = [
    {
      title: '商品編號',
      dataIndex: 'product_code',
      key: 'product_code',
      width: 120,
      render: (code: string) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
          {code}
        </span>
      )
    },
    {
      title: '商品資訊',
      key: 'info',
      render: (record: ProductWithVariants) => (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {record.name}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.volume_ml}ml • {record.alc_percentage}% • 酒液: {record.weight_kg}kg
          </div>
          {(record.package_weight_kg || record.accessory_weight_kg || record.total_weight_kg) && (
            <div style={{ fontSize: '11px', color: '#999' }}>
              {record.package_weight_kg && `包裝: ${record.package_weight_kg}kg `}
              {record.accessory_weight_kg && `附件: ${record.accessory_weight_kg}kg `}
              {record.total_weight_kg && `總重: ${record.total_weight_kg}kg`}
            </div>
          )}
          {record.supplier && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              供應商: {record.supplier}
            </div>
          )}
        </div>
      )
    },
    {
      title: '分類',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: AlcoholCategory) => (
        <Tag color={getCategoryColor(category)}>
          {getCategoryName(category)}
        </Tag>
      ),
      filters: [
        { text: '威士忌', value: 'WHISKY' },
        { text: '葡萄酒', value: 'WINE' },
        { text: '清酒', value: 'SAKE' },
        { text: '啤酒', value: 'BEER' },
        { text: '烈酒', value: 'SPIRITS' },
        { text: '利口酒', value: 'LIQUEUR' },
        { text: '其他', value: 'OTHER' }
      ]
    },
    {
      title: '價格資訊',
      key: 'pricing',
      width: 120,
      render: (record: Product) => (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', color: '#1890ff' }}>
            目前: ${record.current_price.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            標準: ${record.standard_price.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            底線: ${record.min_price.toLocaleString()}
          </div>
        </div>
      )
    },
    {
      title: '變體/庫存',
      key: 'variants',
      width: 120,
      render: (record: ProductWithVariants) => (
        <div style={{ textAlign: 'center' }}>
          <Badge count={record._count.variants} showZero>
            <Button
              icon={<AppstoreOutlined />}
              size="small"
              onClick={() => handleViewVariants(record)}
            >
              變體
            </Button>
          </Badge>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            庫存: {record.variants?.reduce((sum, v) => sum + (v.stock_quantity || 0), 0) || 0}
          </div>
        </div>
      )
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (is_active: boolean) => (
        <Tag color={is_active ? 'green' : 'red'}>
          {is_active ? '啟用' : '停用'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (record: ProductWithVariants) => (
        <Space>
          <Tooltip title="查看詳情">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewVariants(record)}
            />
          </Tooltip>
          <Tooltip title="編輯">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          {session?.user?.role === 'SUPER_ADMIN' && (
            <Popconfirm
              title="確定要刪除此商品嗎？"
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
  const handleEdit = (product?: Product) => {
    setEditingProduct(product || null)
    if (product) {
      form.setFieldsValue({
        ...product,
        // 轉換數組為字串
        accessories: product.accessories?.join(', ')
      })
    } else {
      form.resetFields()
    }
    setModalVisible(true)
  }

  // 處理查看變體
  const handleViewVariants = (product: ProductWithVariants) => {
    setSelectedProduct(product)
    setVariantsModalVisible(true)
  }

  // 處理刪除
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
      })
      const result = await response.json()

      if (result.success) {
        message.success(result.message)
        loadProducts()
      } else {
        message.error(result.error)
      }
    } catch (error) {
      message.error('刪除失敗')
      console.error(error)
    }
  }

  // 處理表單提交
  const handleSubmit = async (values: ProductFormData & { accessories?: string }) => {
    try {
      // 處理accessories欄位
      const formData = {
        ...values,
        accessories: values.accessories
          ? values.accessories.split(',').map(item => item.trim()).filter(Boolean)
          : []
      }

      // 調試輸出
      console.log('提交的商品資料:', formData)

      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : '/api/products'

      const response = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        message.success(result.message)
        setModalVisible(false)
        loadProducts()
      } else {
        // 更詳細的錯誤顯示
        console.error('API 錯誤回應:', result)
        message.error(`${result.error}${result.details ? ': ' + result.details : ''}`)
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
          <p>投資方無法查看商品管理功能</p>
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
              placeholder="搜尋商品名稱、編號、供應商..."
              allowClear
              style={{ width: 300 }}
              onSearch={(value) => setFilters(prev => ({ ...prev, search: value, page: 1 }))}
            />
            <Select
              placeholder="選擇分類"
              allowClear
              style={{ width: 120 }}
              onChange={(category) => setFilters(prev => ({ ...prev, category, page: 1 }))}
            >
              <Option value="WHISKY">威士忌</Option>
              <Option value="WINE">葡萄酒</Option>
              <Option value="SAKE">清酒</Option>
              <Option value="BEER">啤酒</Option>
              <Option value="SPIRITS">烈酒</Option>
              <Option value="LIQUEUR">利口酒</Option>
              <Option value="OTHER">其他</Option>
            </Select>
            <Select
              placeholder="狀態"
              allowClear
              style={{ width: 100 }}
              onChange={(active) => setFilters(prev => ({ ...prev, active, page: 1 }))}
            >
              <Option value={true}>啟用</Option>
              <Option value={false}>停用</Option>
            </Select>
          </Space>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleEdit()}
          >
            新增商品
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={products}
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
        title={editingProduct ? '編輯商品' : '新增商品'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="name"
              label="商品名稱"
              rules={[{ required: true, message: '請輸入商品名稱' }]}
              style={{ flex: 2 }}
            >
              <Input placeholder="請輸入商品名稱" />
            </Form.Item>
            <Form.Item
              name="category"
              label="分類"
              rules={[{ required: true, message: '請選擇分類' }]}
              style={{ flex: 1 }}
            >
              <Select placeholder="選擇分類">
                <Option value="WHISKY">威士忌</Option>
                <Option value="WINE">葡萄酒</Option>
                <Option value="SAKE">清酒</Option>
                <Option value="BEER">啤酒</Option>
                <Option value="SPIRITS">烈酒</Option>
                <Option value="LIQUEUR">利口酒</Option>
                <Option value="OTHER">其他</Option>
              </Select>
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="volume_ml"
              label="容量(ml)"
              rules={[{ required: true, message: '請輸入容量' }]}
              style={{ flex: 1 }}
            >
              <InputNumber placeholder="700" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="alc_percentage"
              label="酒精度(%)"
              rules={[{ required: true, message: '請輸入酒精度' }]}
              style={{ flex: 1 }}
            >
              <InputNumber placeholder="43.0" step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="weight_kg"
              label="重量(kg)"
              rules={[{ required: true, message: '請輸入重量' }]}
              style={{ flex: 1 }}
            >
              <InputNumber placeholder="1.2" step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <Text strong>價格設定</Text>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              <span style={{ color: '#666' }}>標準價格</span> (市場基準) ≥
              <span style={{ color: '#1890ff' }}> 目前價格</span> (實際售價) ≥
              <span style={{ color: '#999' }}> 最低價格</span> (保本底線)
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="standard_price"
              label="標準價格"
              rules={[{ required: true, message: '請輸入標準價格' }]}
              style={{ flex: 1 }}
              tooltip="市場基準價或官方建議售價"
            >
              <InputNumber placeholder="21000" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="current_price"
              label="目前價格"
              rules={[{ required: true, message: '請輸入目前價格' }]}
              style={{ flex: 1 }}
              tooltip="當前實際銷售價格，可因市場調整"
            >
              <InputNumber placeholder="21000" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="min_price"
              label="最低價格"
              rules={[{ required: true, message: '請輸入最低價格' }]}
              style={{ flex: 1 }}
              tooltip="最低可接受售價，確保不虧本"
            >
              <InputNumber placeholder="18000" style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item name="supplier" label="供應商" style={{ flex: 1 }}>
              <Input placeholder="請輸入供應商" />
            </Form.Item>
            <Form.Item name="brand" label="品牌" style={{ flex: 1 }}>
              <Input placeholder="請輸入品牌" />
            </Form.Item>
          </div>

          <Form.Item name="description" label="商品描述">
            <Input.TextArea placeholder="請輸入商品描述" rows={3} />
          </Form.Item>

          <Form.Item name="accessories" label="附件清單">
            <Input placeholder="請輸入附件，用逗號分隔，例如：證書, 特製木盒, 說明書" />
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item name="has_box" label="有外盒" valuePropName="checked" style={{ flex: 1 }}>
              <Switch />
            </Form.Item>
            <Form.Item name="has_accessories" label="有附件" valuePropName="checked" style={{ flex: 1 }}>
              <Switch />
            </Form.Item>
          </div>

          {/* 空瓶費申報 - 重量資訊 */}
          <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '6px', marginBottom: '16px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '12px' }}>空瓶費申報重量</div>

            {/* 空瓶重量 - 永遠顯示 */}
            <Form.Item
              name="weight_kg"
              label="空瓶重量 (kg)"
              tooltip="酒瓶本身重量，不含包裝和附件"
              style={{ marginBottom: '16px' }}
            >
              <InputNumber
                placeholder="0.8"
                step={0.1}
                min={0}
                precision={2}
                style={{ width: '200px' }}
              />
            </Form.Item>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {/* 有外盒時顯示外盒重量 */}
              <Form.Item shouldUpdate>
                {({ getFieldValue }) => {
                  const hasBox = getFieldValue('has_box')
                  return hasBox ? (
                    <Form.Item
                      name="package_weight_kg"
                      label="外盒重量 (kg)"
                      tooltip="外盒包裝重量"
                      style={{ minWidth: '180px' }}
                    >
                      <InputNumber
                        placeholder="0.5"
                        step={0.1}
                        min={0}
                        precision={2}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  ) : null
                }}
              </Form.Item>

              {/* 有附件時顯示附件重量 */}
              <Form.Item shouldUpdate>
                {({ getFieldValue }) => {
                  const hasAccessories = getFieldValue('has_accessories')
                  return hasAccessories ? (
                    <Form.Item
                      name="accessory_weight_kg"
                      label="附件重量 (kg)"
                      tooltip="證書、木盒等附件重量"
                      style={{ minWidth: '180px' }}
                    >
                      <InputNumber
                        placeholder="0.2"
                        step={0.1}
                        min={0}
                        precision={2}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  ) : null
                }}
              </Form.Item>

              {/* 總重量 - 有任何額外重量時顯示 */}
              <Form.Item shouldUpdate>
                {({ getFieldValue }) => {
                  const hasBox = getFieldValue('has_box')
                  const hasAccessories = getFieldValue('has_accessories')
                  return (hasBox || hasAccessories) ? (
                    <Form.Item
                      name="total_weight_kg"
                      label="總重量 (kg)"
                      tooltip="包含酒液、包裝、附件的總重量"
                      style={{ minWidth: '180px' }}
                    >
                      <InputNumber
                        placeholder="1.7"
                        step={0.1}
                        min={0}
                        precision={2}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  ) : null
                }}
              </Form.Item>
            </div>
          </div>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingProduct ? '更新' : '新增'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 變體查看Modal */}
      <Modal
        title={`${selectedProduct?.name} - 變體管理`}
        open={variantsModalVisible}
        onCancel={() => setVariantsModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedProduct && (
          <div>
            <p>商品編號: {selectedProduct.product_code}</p>
            <p>變體數量: {selectedProduct._count.variants} 個</p>

            {selectedProduct.variants && selectedProduct.variants.length > 0 ? (
              <Table
                dataSource={selectedProduct.variants}
                pagination={false}
                size="small"
                columns={[
                  {
                    title: '變體編號',
                    dataIndex: 'variant_code',
                    key: 'variant_code',
                    width: 120
                  },
                  {
                    title: '描述',
                    dataIndex: 'description',
                    key: 'description',
                    render: (desc: string, record: any) => (
                      <span style={{ fontWeight: 'bold' }}>
                        {desc || record.variant_type || '未設定'}
                      </span>
                    )
                  },
                  {
                    title: '價格',
                    dataIndex: 'current_price',
                    key: 'current_price',
                    width: 100,
                    render: (price: number) => `NT$ ${price?.toLocaleString() || 0}`
                  },
                  {
                    title: '庫存',
                    key: 'stock',
                    width: 80,
                    render: (record: any) => (
                      <span style={{
                        color: (record.available_stock || record.stock_quantity || 0) > 0 ? 'green' : 'red'
                      }}>
                        {record.available_stock || record.stock_quantity || 0}瓶
                      </span>
                    )
                  },
                  {
                    title: '狀況',
                    dataIndex: 'condition',
                    key: 'condition',
                    render: (condition: string) => condition || '狀況良好'
                  }
                ]}
              />
            ) : (
              <div style={{ background: '#f5f5f5', padding: '16px', marginTop: '16px' }}>
                <p style={{ margin: 0, color: '#666' }}>
                  此商品尚無變體資料
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
