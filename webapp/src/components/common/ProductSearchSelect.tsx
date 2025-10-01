'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Select,
  Input,
  Button,
  Modal,
  Form,
  InputNumber,
  Tag,
  Space,
  Divider,
  Typography,
  Alert,
  Spin,
  AutoComplete
} from 'antd'
import {
  SearchOutlined,
  PlusOutlined,
  FireOutlined,
  StarOutlined,
  ShoppingOutlined
} from '@ant-design/icons'

import { DEFAULT_VARIANT_TYPE_LABEL } from '@shared/utils/constants'

const { Text } = Typography
const { Option } = Select

interface ProductSearchSelectProps {
  value?: any
  onChange?: (value: any) => void
  placeholder?: string
  allowQuickAdd?: boolean
  showStock?: boolean // 是否顯示庫存資訊（報價單不需要）
  style?: React.CSSProperties
}

interface SearchResult {
  id: string
  name: string
  product_code: string
  category: string
  supplier?: string
  standard_price: number
  variants: Array<{
    id: string
    variant_code: string
    variant_type: string
    description: string
    current_price: number
    stock_quantity: number
    available_stock: number
  }>
  has_stock: boolean
  match_info: {
    score: number
    matched_terms: string[]
  }
}

export default function ProductSearchSelect({
  value,
  onChange,
  placeholder = "搜尋商品... (如: 山崎, NIKKA, 響)",
  allowQuickAdd = true,
  showStock = false, // 預設不顯示庫存（報價單場景）
  style
}: ProductSearchSelectProps) {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [quickAddVisible, setQuickAddVisible] = useState(false)
  const [quickAddForm] = Form.useForm()
  const [quickAddLoading, setQuickAddLoading] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // 🔍 執行搜尋
  const performSearch = async (query: string) => {
    setSearchLoading(true)
    try {
      // 支援空搜尋，顯示所有商品（用於下拉選單功能）
      const searchQuery = query.trim() || '*' // 空搜尋用 * 代表全部
      const response = await fetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}&limit=20`)
      const data = await response.json()

      if (data.success) {
        setSearchResults(data.data)
      } else {
        console.error('搜尋失敗:', data.error)
        setSearchResults([])
      }
    } catch (error) {
      console.error('搜尋請求失敗:', error)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  // 🕰️ 防抖搜尋
  const handleSearch = (query: string) => {
    setSearchValue(query)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query)
    }, 300)
  }

  // ✨ 快速新增商品
  const handleQuickAdd = async (values: any) => {
    setQuickAddLoading(true)
    try {
      const response = await fetch('/api/products/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          variant_type: values.variant_type?.trim() || null,
          category: values.category || 'WHISKY',
          volume_ml: values.volume_ml || 750,
          alc_percentage: values.alc_percentage || 40,
          supplier: values.supplier,
          estimated_price: values.estimated_price,
          notes: values.notes
        })
      })

      const result = await response.json()

      if (result.success) {
        // 關閉對話框
        setQuickAddVisible(false)
        quickAddForm.resetFields()

        // 自動選擇新建的商品
        if (onChange) {
          onChange({
            productId: result.data.product.id,
            variantId: result.data.variant.id,
            productName: result.data.product.name,
            productCode: result.data.product.product_code,
            variantCode: result.data.variant.variant_code,
            price: result.data.product.standard_price,
            isNewProduct: true
          })
        }

        // 重新搜尋以顯示新商品
        if (searchValue) {
          performSearch(searchValue)
        }
      } else {
        console.error('快速新增失敗:', result.error)
      }
    } catch (error) {
      console.error('快速新增請求失敗:', error)
    } finally {
      setQuickAddLoading(false)
    }
  }

  // 📋 處理商品選擇
  const handleProductSelect = (productId: string, variantId: string) => {
    const product = searchResults.find(p => p.id === productId)
    const variant = product?.variants.find(v => v.id === variantId)

    if (product && variant && onChange) {
      onChange({
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        productCode: product.product_code,
        variantCode: variant.variant_code,
        variantType: variant.variant_type,
        description: variant.description,
        price: variant.current_price,
        stock: variant.available_stock,
        supplier: product.supplier
      })
    }
  }

  // 🎨 渲染搜尋結果選項
  const renderSearchOptions = () => {
    return searchResults.map(product => (
      <div key={product.id}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                <Text>{product.name}</Text>
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  {product.product_code}
                </Tag>
                {product.match_info.score > 8 && (
                  <Tag color="gold" icon={<StarOutlined />}>
                    精確匹配
                  </Tag>
                )}
              </div>

              <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                <Space size={8}>
                  <span>🏷️ {product.category}</span>
                  {product.supplier && <span>📦 {product.supplier}</span>}
                  <span>💰 NT$ {product.standard_price?.toLocaleString()}</span>
                </Space>
              </div>

              {/* 變體選擇 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {product.variants.map(variant => {
                  const hasStock = variant.available_stock > 0

                  return (
                    <Button
                      key={variant.id}
                      size="small"
                      type="primary"
                      ghost
                      onClick={() => handleProductSelect(product.id, variant.id)}
                      style={{ fontSize: 11 }}
                    >
                      {variant.variant_code}
                      {variant.variant_type && ` - ${variant.variant_type}`}
                      {/* 只在啟用庫存顯示時才顯示庫存資訊 */}
                      {showStock && (
                        hasStock ? (
                          <span style={{ marginLeft: 4, color: '#52c41a' }}>
                            (庫存: {variant.available_stock})
                          </span>
                        ) : (
                          <span style={{ marginLeft: 4, color: '#ff4d4f' }}>
                            (無庫存)
                          </span>
                        )
                      )}
                    </Button>
                  )
                })}
              </div>

              {product.variants.length === 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ⚠️ 此商品尚未建立變體
                </Text>
              )}
            </div>
          </div>
        </div>
      </div>
    ))
  }

  return (
    <div style={style}>
      {/* 🔽 搜尋框 + 下拉功能 */}
      <Input.Search
        placeholder={placeholder}
        value={searchValue}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => {
          // 點擊時自動顯示所有商品
          if (!searchValue && searchResults.length === 0) {
            performSearch('*')
          }
        }}
        loading={searchLoading}
        enterButton={<SearchOutlined />}
        size="large"
        allowClear
        onClear={() => {
          setSearchValue('')
          setSearchResults([])
        }}
        style={{ marginBottom: 8 }}
      />

      {/* 搜尋結果區域 - 顯示條件：正在搜尋、有結果、或有輸入值 */}
      {(searchLoading || searchResults.length > 0 || searchValue) && (
        <div
          style={{
            maxHeight: '400px',
            overflowY: 'auto',
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            backgroundColor: '#fff'
          }}
        >
          {searchLoading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <Spin />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">搜尋中...</Text>
              </div>
            </div>
          ) : searchResults.length > 0 ? (
            <div>
              <div style={{ padding: '8px 12px', backgroundColor: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <FireOutlined style={{ marginRight: 4 }} />
                  找到 {searchResults.length} 個商品，點擊變體選擇
                </Text>
              </div>
              {renderSearchOptions()}
            </div>
          ) : searchValue ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <Text type="secondary">
                📭 未找到符合 &quot;{searchValue}&quot; 的商品
              </Text>
              {allowQuickAdd && (
                <div style={{ marginTop: 12 }}>
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      quickAddForm.setFieldsValue({ name: searchValue, variant_type: '' })
                      setQuickAddVisible(true)
                    }}
                  >
                    快速新增 &quot;{searchValue}&quot;
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* 快速新增商品對話框 */}
      <Modal
        title={
          <Space>
            <ShoppingOutlined />
            快速新增商品
          </Space>
        }
        open={quickAddVisible}
        onCancel={() => setQuickAddVisible(false)}
        onOk={() => quickAddForm.submit()}
        confirmLoading={quickAddLoading}
        width={600}
      >
        <Alert
          message="智能提醒"
          description="系統會根據商品名稱自動推測分類、容量、品牌等資訊，你可以在提交前檢查並調整。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form
          form={quickAddForm}
          onFinish={handleQuickAdd}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="商品名稱"
            rules={[{ required: true, message: '請輸入商品名稱' }]}
          >
            <Input placeholder="例: 山崎18年威士忌" />
          </Form.Item>

          <Form.Item
            name="category"
            label="商品分類"
            initialValue="WHISKY"
          >
            <Select>
              <Option value="WHISKY">威士忌</Option>
              <Option value="SAKE">清酒</Option>
              <Option value="WINE">葡萄酒</Option>
              <Option value="SPIRITS">烈酒</Option>
              <Option value="BEER">啤酒</Option>
              <Option value="LIQUEUR">利口酒</Option>
              <Option value="OTHER">其他</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="variant_type"
            label="變體名稱（選填）"
            tooltip="可留空，未來需要時再建立變體。若有多個版本（如木盒版、機場版），請在此填寫第一個版本名稱。"
            rules={[{ max: 100, message: '最多 100 字' }]}
          >
            <Input placeholder="例如：木盒版、標準款（可留空）" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="volume_ml"
              label="容量 (ml)"
              style={{ flex: 1 }}
              initialValue={750}
            >
              <InputNumber min={50} max={5000} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="alc_percentage"
              label="酒精濃度 (%)"
              style={{ flex: 1 }}
              initialValue={40}
            >
              <InputNumber min={0} max={70} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item
            name="supplier"
            label="供應商"
          >
            <Input placeholder="例: 日本進口商" />
          </Form.Item>

          <Form.Item
            name="estimated_price"
            label="預估售價 (NT$)"
          >
            <InputNumber<number>
              min={0}
              style={{ width: '100%' }}
              formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => {
                const cleaned = (value || '').replace(/\$\s?|,/g, '')
                const num = parseFloat(cleaned)
                return isNaN(num) ? 0 : num
              }}
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="備註"
          >
            <Input.TextArea rows={2} placeholder="選填，其他需要記錄的資訊" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
