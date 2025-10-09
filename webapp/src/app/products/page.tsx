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
  Tooltip,
  InputNumber,
  Switch,
  Badge,
  Typography,
  Alert
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  AppstoreOutlined,
  CopyOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import type {
  Product,
  ProductWithVariants,
  AlcoholCategory,
  ProductFormData,
  ProductFilters
} from '@/types/room-2'
import VariantListView from '@/components/products/VariantListView'
import VariantCreateModal from '@/components/products/VariantCreateModal'
import VariantEditModal from '@/components/products/VariantEditModal'
import InvestorPriceModal from '@/components/products/InvestorPriceModal'
import StockTransferModal from '@/components/inventory/StockTransferModal'

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
    orderBy: 'product_code',
    order: 'asc',
    active: true
  })

  // Modal狀態
  const [modalVisible, setModalVisible] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [variantsModalVisible, setVariantsModalVisible] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithVariants | null>(null)
  const [variantModalVisible, setVariantModalVisible] = useState(false)
  const [editingVariant, setEditingVariant] = useState<any>(null)
  const [form] = Form.useForm()
  const [variantForm] = Form.useForm()

  // 新組件狀態
  const [variantCreateModalVisible, setVariantCreateModalVisible] = useState(false)
  const [variantEditModalVisible, setVariantEditModalVisible] = useState(false)
  const [investorPriceModalVisible, setInvestorPriceModalVisible] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [stockTransferModalVisible, setStockTransferModalVisible] = useState(false)

  // 變體代碼/SKU 自動生成工具（簡單 slug 規則）
  const slugify = (s: string) => (s || '')
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const buildVariantCode = (productCode: string, vtype: string, label: string) => {
    const parts: string[] = []
    if (productCode) parts.push(productCode)
    if (vtype) parts.push(vtype)
    const lab = slugify(label)
    if (lab) parts.push(lab)
    return parts.join('-')
  }

  const buildSKU = (
    productCode: string,
    vtype: string,
    label: string,
    volume?: number,
    alc?: number
  ) => {
    const code = buildVariantCode(productCode, vtype, label)
    const vol = typeof volume === 'number' ? String(volume) : ''
    const alcPart = typeof alc === 'number' ? String(Math.round(alc)) : ''
    const tail = [vol, alcPart].filter(Boolean).join('-')
    return tail ? `${code}-${tail}` : code
  }

  // 載入商品列表
  const loadProducts = useCallback(async () => {
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
  }, [filters])

  useEffect(() => {
    loadProducts()
  }, [filters, loadProducts])

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
        <div style={{ fontWeight: 'bold' }}>
          {record.name}
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
      title: '變體數量',
      key: 'variants_count',
      width: 100,
      align: 'center' as const,
      render: (record: ProductWithVariants) => {
        const variantCount = record.variants?.length || 0
        return (
          <Badge
            count={variantCount}
            showZero
            style={{ backgroundColor: variantCount > 0 ? '#52c41a' : '#d9d9d9' }}
          />
        )
      }
    },
    {
      title: '庫存資訊',
      key: 'stock_info',
      width: 140,
      render: (record: ProductWithVariants) => {
        const totalStock = record.variants?.reduce((sum, v) => sum + (v.stock_quantity || 0), 0) || 0
        return (
          <div style={{ textAlign: 'center' }}>
            <Button
              icon={<AppstoreOutlined />}
              size="small"
              onClick={() => handleViewVariants(record)}
            >
              {record._count.variants} 個變體
            </Button>
            <div className="text-xs text-gray-500 mt-1">
              總庫存: <span className={totalStock > 0 ? 'font-bold text-green-500' : 'font-bold text-red-500'}>{totalStock}</span>
            </div>
          </div>
        )
      }
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
      width: 150,
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
          <Tooltip title="複製商品">
            <Button
              icon={<CopyOutlined />}
              size="small"
              onClick={() => handleDuplicate(record.id)}
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

  // 處理新增變體
  const handleAddVariant = () => {
    if (!selectedProduct) return
    setEditingVariant(null)
    variantForm.resetFields()
    variantForm.setFieldsValue({
      variant_type: 'A', // 預設值
      condition: 'Normal'
    })
    setVariantModalVisible(true)
  }

  // 處理編輯變體
  const handleEditVariant = (variant: any) => {
    setEditingVariant(variant)
    variantForm.setFieldsValue(variant)
    setVariantModalVisible(true)
  }

  // 處理變體提交
  const handleVariantSubmit = async (values: any) => {
    try {
      const variantData = {
        ...values,
        product_id: selectedProduct?.id,
        variant_code: `${selectedProduct?.product_code}-${values.variant_type}`,
        sku: `${selectedProduct?.product_code}-${values.variant_type}-${selectedProduct?.volume_ml}-${Math.round(selectedProduct?.alc_percentage || 0)}`
      }

      const url = editingVariant
        ? `/api/products/${selectedProduct?.id}/variants/${editingVariant.id}`
        : `/api/products/${selectedProduct?.id}/variants`

      const method = editingVariant ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variantData)
      })

      const result = await response.json()

      if (result.success) {
        message.success(editingVariant ? '變體更新成功' : '變體新增成功')
        setVariantModalVisible(false)
        loadProducts() // 重新載入商品列表
      } else {
        message.error(result.error || '操作失敗')
      }
    } catch (error) {
      message.error('操作失敗')
      console.error(error)
    }
  }

  // 處理刪除變體
  const handleDeleteVariant = async (variant: any) => {
    try {
      const response = await fetch(`/api/products/${selectedProduct?.id}/variants/${variant.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        message.success('變體刪除成功')
        loadProducts() // 重新載入商品列表
      } else {
        message.error(result.error || '刪除失敗')
      }
    } catch (error) {
      message.error('刪除失敗')
      console.error(error)
    }
  }

  // 處理編輯變體
  const handleEditVariantClick = (variant: any) => {
    setSelectedVariant(variant)
    setVariantEditModalVisible(true)
  }

  // 編輯變體成功後
  const handleVariantEditSuccess = () => {
    setVariantEditModalVisible(false)
    setSelectedVariant(null)
    loadProducts() // 重新載入商品列表
    message.success('變體更新成功')
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

  // 處理複製商品
  const handleDuplicate = async (id: string) => {
    try {
      setLoading(true)
      // 獲取原商品資料
      const response = await fetch(`/api/products/${id}`)
      const result = await response.json()

      if (result.success) {
        const originalProduct = result.data.product

        // 🎯 新架構：只複製 name + category
        setEditingProduct(null) // 設為 null 表示是新增模式
        form.setFieldsValue({
          name: `${originalProduct.name} (副本)`,
          category: originalProduct.category
        })
        setModalVisible(true)
        message.info('已載入原商品資料（品名 + 分類），請修改後儲存。變體需另外新增。')
      } else {
        message.error(result.error || '無法載入商品資料')
      }
    } catch (error) {
      message.error('複製失敗')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // 處理表單提交
  const handleSubmit = async (values: { name: string; category: string }) => {
    try {
      // 🎯 新架構：只提交 name + category
      const formData = {
        name: values.name.trim(),
        category: values.category
      }

      console.log('提交的商品 BASE 資料:', formData)

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
        message.success(result.message || '商品 BASE 創建成功')
        setModalVisible(false)
        loadProducts()

        // 🎯 新增成功後提示用戶新增變體
        if (!editingProduct) {
          message.info('請點擊「查看詳情」新增變體以設定完整規格', 5)
        }
      } else {
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
        title={editingProduct ? '編輯商品' : '新增商品 BASE'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {/* 🎯 只需填寫品名和分類，規格在變體層級 */}
          <div style={{ background: '#e6f7ff', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
            <div className="text-sm text-blue-500">
              💡 <strong>簡化流程：</strong>先創建商品 BASE（品名 + 分類），儲存後再新增變體以設定完整規格（容量、酒精度、重量、價格等）
            </div>
          </div>

          <Form.Item
            name="name"
            label="商品名稱（品名）"
            rules={[{ required: true, message: '請輸入商品名稱' }]}
            tooltip="例如：山崎18年、麥卡倫12年、拉菲紅酒"
          >
            <Input placeholder="請輸入商品名稱，例如：山崎18年" />
          </Form.Item>

          <Form.Item
            name="category"
            label="商品分類"
            rules={[{ required: true, message: '請選擇分類' }]}
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

          <div style={{ background: '#fffbe6', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
            <div className="text-xs text-yellow-600">
              📦 <strong>下一步：</strong>儲存後請點擊「查看詳情」或「變體管理」新增變體，每個變體可設定不同的容量（700ML/750ML）、酒精度（43%/48%）、包裝、價格等
            </div>
          </div>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingProduct ? '更新' : '創建 BASE'}
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
        footer={
          <Space>
            <Button onClick={() => setVariantsModalVisible(false)}>
              關閉
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setVariantCreateModalVisible(true)}
            >
              新增變體
            </Button>
          </Space>
        }
        width={1000}
      >
        {selectedProduct && (
          <div>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <p>商品編號: <Text code strong>{selectedProduct.product_code}</Text></p>
                <p>變體數量: <Text strong>{selectedProduct._count.variants} 個</Text></p>
              </div>

              {selectedProduct.variants && selectedProduct.variants.length > 0 ? (
                <VariantListView
                  variants={selectedProduct.variants.map((v: any) => ({
                    id: v.id,
                    variant_code: v.variant_code,
                    variant_type: v.variant_type,
                    description: v.description,
                    cost_price: Number(v.cost_price || 0),
                    investor_price: Number(v.investor_price || 0),
                    actual_price: Number(v.actual_price || 0),
                    stock_quantity: v.stock_quantity || 0,
                    is_active: true,
                    inventory: v.inventory || [], // 🏭 傳入倉庫資料
                    // 傳入完整變體資料以供編輯
                    ...v
                  }))}
                  userRole={session?.user?.role || 'EMPLOYEE'}
                  onAdjustPrice={(variant) => {
                    setSelectedVariant(variant)
                    setInvestorPriceModalVisible(true)
                  }}
                  onEdit={handleEditVariantClick}
                  onDelete={handleDeleteVariant}
                  onTransfer={(variant) => {
                    setSelectedVariant(variant)
                    setStockTransferModalVisible(true)
                  }}
                  loading={loading}
                />
              ) : (
                <div style={{ background: '#f5f5f5', padding: '16px', marginTop: '16px' }}>
                  <p className="m-0 text-gray-500">
                    此商品尚無變體資料
                  </p>
                </div>
              )}
            </Space>
          </div>
        )}
      </Modal>

      {/* 變體新增/編輯Modal */}
      <Modal
        title={editingVariant ? '編輯變體' : '新增變體'}
        open={variantModalVisible}
        onCancel={() => setVariantModalVisible(false)}
        onOk={() => variantForm.submit()}
        confirmLoading={loading}
        width={600}
        okText="確定"
        cancelText="取消"
      >
        <Form
          form={variantForm}
          layout="vertical"
          onFinish={handleVariantSubmit}
          onValuesChange={(changed) => {
            const label = (variantForm.getFieldValue('variant_label') || '') as string
            const vtype = (variantForm.getFieldValue('variant_type') || '') as string
            const p = selectedProduct
            if (!p) return
            if ('variant_label' in (changed || {})) {
              const currentDesc = variantForm.getFieldValue('description')
              if (!currentDesc && label) {
                variantForm.setFieldsValue({ description: `${p.name} ${label}` })
              }
            }
            const variant_code = buildVariantCode(p.product_code, vtype, label)
            const sku = buildSKU(p.product_code, vtype, label, p.volume_ml, p.alc_percentage)
            variantForm.setFieldsValue({ variant_code, sku })
          }}
        >
          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="variant_type"
              label="變體類型"
              rules={[{ required: true, message: '請選擇變體類型' }]}
              style={{ flex: 1 }}
            >
              <Select placeholder="選擇變體類型">
                <Option value="A">A - 一般版</Option>
                <Option value="B">B - 年度限定</Option>
                <Option value="C">C - 紀念版</Option>
                <Option value="D">D - 特殊限定</Option>
                <Option value="X">X - 損傷品</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="description"
              label="變體描述"
              rules={[{ required: true, message: '請輸入變體描述' }]}
              style={{ flex: 2 }}
            >
              <Input placeholder="例：盒損版、收藏版、限定版" />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="variant_label"
              label="變體標籤"
              tooltip="輸入簡短標籤（例如：2021、歐洲版、禮盒）"
              style={{ flex: 1 }}
            >
              <Input placeholder="例如：2021 或 歐洲版" />
            </Form.Item>
            <Form.Item name="variant_code" label="變體代碼" style={{ flex: 1 }}>
              <Input placeholder="自動生成，可修改" />
            </Form.Item>
            <Form.Item name="sku" label="SKU" style={{ flex: 1 }}>
              <Input placeholder="自動生成，可修改" />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="base_price"
              label="基礎價格"
              rules={[{ required: true, message: '請輸入基礎價格' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                placeholder="21000"
                style={{ width: '100%' }}
                min={0}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>
            <Form.Item
              name="current_price"
              label="目前價格"
              rules={[{ required: true, message: '請輸入目前價格' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                placeholder="21000"
                style={{ width: '100%' }}
                min={0}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>
            <Form.Item
              name="cost_price"
              label="成本價格"
              style={{ flex: 1 }}
            >
              <InputNumber
                placeholder="15000"
                style={{ width: '100%' }}
                min={0}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>
          </div>

          {/* 🔧 庫存欄位已移除 - 請使用庫存管理頁面進行庫存調整 */}
          <Alert
            type="info"
            message="庫存管理提示"
            description="商品庫存請前往「庫存管理」頁面進行調整，支援多倉庫管理和庫存調撥。"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="weight_kg"
              label="重量 (kg)"
              style={{ flex: 1 }}
            >
              <InputNumber
                placeholder="1.2"
                style={{ width: '100%' }}
                min={0}
                step={0.1}
                precision={2}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="condition"
            label="商品狀況"
            rules={[{ required: true, message: '請輸入商品狀況' }]}
          >
            <Input placeholder="例：原裝無盒、外盒破損酒體完好、限量收藏盒" />
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="production_year"
              label="生產年份"
              style={{ flex: 1 }}
            >
              <InputNumber
                placeholder="2023"
                style={{ width: '100%' }}
                min={1900}
                max={new Date().getFullYear()}
              />
            </Form.Item>
            <Form.Item
              name="serial_number"
              label="序號"
              style={{ flex: 1 }}
            >
              <Input placeholder="選填，如有特殊序號" />
            </Form.Item>
          </div>

          <Form.Item name="discount_rate" label="折扣率 (%)">
            <InputNumber
              placeholder="0"
              style={{ width: '200px' }}
              min={0}
              max={100}
              step={0.1}
              precision={1}
            />
          </Form.Item>

          <Form.Item name="limited_edition" label="限量版" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 新組件：變體新增Modal */}
      <VariantCreateModal
        visible={variantCreateModalVisible}
        product={selectedProduct ? {
          id: selectedProduct.id,
          product_code: selectedProduct.product_code,
          name: selectedProduct.name
        } : null}
        nextVariantNumber={selectedProduct?.variants ?
          String((selectedProduct.variants.length + 1)).padStart(3, '0') : '001'}
        onCancel={() => setVariantCreateModalVisible(false)}
        onSuccess={() => {
          setVariantCreateModalVisible(false)
          loadProducts()
        }}
      />

      {/* 新組件：變體編輯Modal */}
      <VariantEditModal
        visible={variantEditModalVisible}
        variant={selectedVariant}
        productId={selectedProduct?.id || ''}
        onCancel={() => {
          setVariantEditModalVisible(false)
          setSelectedVariant(null)
        }}
        onSuccess={handleVariantEditSuccess}
      />

      {/* 新組件：投資方調價Modal */}
      <InvestorPriceModal
        visible={investorPriceModalVisible}
        variant={selectedVariant}
        productId={selectedProduct?.id || ''}
        onCancel={() => setInvestorPriceModalVisible(false)}
        onSuccess={() => {
          setInvestorPriceModalVisible(false)
          loadProducts()
        }}
      />

      {/* 品號調撥Modal */}
      <StockTransferModal
        visible={stockTransferModalVisible}
        onCancel={() => setStockTransferModalVisible(false)}
        onSuccess={() => {
          setStockTransferModalVisible(false)
          loadProducts()
        }}
        products={products}
      />
    </div>
  )
}
