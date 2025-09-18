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
  Transfer
} from 'antd'
import {
  TruckOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  CalendarOutlined
} from '@ant-design/icons'
import { InboxOutlined } from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import dayjs from 'dayjs'
import { HideFromInvestor, SuperAdminOnly } from '@/components/auth/RoleGuard'
import { SecurePriceDisplay } from '@/components/common/SecurePriceDisplay'

const { Option } = Select
const { TextArea } = Input
const { Title, Text } = Typography

interface Sale {
  id: string
  saleNumber: string
  customer: {
    id: string
    name: string
    company?: string
    shipping_address?: string
  }
  totalAmount: number
  actualAmount?: number
  createdAt: string
  items: SaleItem[]
}

interface SaleItem {
  id: string
  productId: string
  variantId?: string
  quantity: number
  unitPrice: number
  actualUnitPrice?: number
  product: {
    id: string
    product_code: string
    name: string
    weight: number
  }
  variant?: {
    id: string
    variant_code: string
    description: string
    weight_kg: number
  }
}

interface TransferItem {
  key: string
  title: string
  description: string
  disabled?: boolean
  quantity: number
  weight: number
  saleId: string
  itemId: string
}

interface ShippingOrderModalProps {
  visible: boolean
  onCancel: () => void
  onSubmit: (data: any) => void
  loading?: boolean
}

export function ShippingOrderModal({
  visible,
  onCancel,
  onSubmit,
  loading = false
}: ShippingOrderModalProps) {
  const { data: session } = useSession()
  const [form] = Form.useForm()

  // 資料狀態
  const [paidSales, setPaidSales] = useState<Sale[]>([])
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [transferData, setTransferData] = useState<TransferItem[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  // 載入狀態
  const [loadingSales, setLoadingSales] = useState(false)

  // 載入已付款銷售單
  const loadPaidSales = async () => {
    setLoadingSales(true)
    try {
      const response = await fetch('/api/sales?isPaid=true&limit=50')
      const result = await response.json()
      if (result.success) {
        setPaidSales(result.data.sales)
      }
    } catch (error) {
      console.error('載入銷售單失敗:', error)
      message.error('載入銷售單列表失敗')
    } finally {
      setLoadingSales(false)
    }
  }

  useEffect(() => {
    if (visible) {
      loadPaidSales()
      form.resetFields()
      setSelectedSale(null)
      setTransferData([])
      setSelectedItems([])
    }
  }, [visible])

  // 銷售單選擇處理
  const handleSaleChange = (saleId: string) => {
    const sale = paidSales.find(s => s.id === saleId)
    setSelectedSale(sale || null)

    if (sale) {
      // 設定預設值
      form.setFieldsValue({
        customerId: sale.customer.id,
        shippingDate: dayjs(),
        shippingAddress: sale.customer.shipping_address || ''
      })

      // 準備Transfer資料
      const items: TransferItem[] = sale.items.map(item => ({
        key: item.id,
        title: `${item.product.name}${item.variant ? ` - ${item.variant.description}` : ''}`,
        description: `數量: ${item.quantity} | 重量: ${item.variant?.weight_kg || item.product.weight}kg`,
        quantity: item.quantity,
        weight: item.variant?.weight_kg || item.product.weight,
        saleId: sale.id,
        itemId: item.id
      }))
      setTransferData(items)
      setSelectedItems([]) // 重置選中項目
    }
  }

  // Transfer變更處理
  const handleTransferChange = (targetKeys: string[]) => {
    setSelectedItems(targetKeys)
  }

  // 計算總重量
  const calculateTotalWeight = () => {
    return transferData
      .filter(item => selectedItems.includes(item.key))
      .reduce((sum, item) => sum + (item.weight * item.quantity), 0)
  }

  // 表單提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (!selectedSale) {
        message.error('請選擇銷售單')
        return
      }

      if (selectedItems.length === 0) {
        message.error('請至少選擇一個商品項目')
        return
      }

      // 準備出貨項目資料
      const shippingItems = selectedSale.items
        .filter(item => selectedItems.includes(item.id))
        .map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          notes: ''
        }))

      const submitData = {
        saleId: selectedSale.id,
        customerId: selectedSale.customer.id,
        shippingDate: values.shippingDate?.toISOString(),
        shippingAddress: values.shippingAddress,
        items: shippingItems,
        notes: values.notes,
        totalWeight: calculateTotalWeight(),
        totalItems: shippingItems.reduce((sum, item) => sum + item.quantity, 0)
      }

      onSubmit(submitData)
    } catch (error) {
      console.error('表單驗證失敗:', error)
    }
  }

  return (
    <Modal
      title={
        <Space>
          <TruckOutlined />
          創建出貨單
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      width="80%"
      style={{ maxWidth: '1000px' }}
      confirmLoading={loading}
      okText="創建出貨單"
      cancelText="取消"
      okButtonProps={{
        disabled: !selectedSale || selectedItems.length === 0
      }}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="saleId"
              label={
                <Space>
                  <ShoppingCartOutlined />
                  選擇已付款銷售單
                </Space>
              }
              rules={[{ required: true, message: '請選擇銷售單' }]}
            >
              <Select
                placeholder="選擇已付款的銷售單"
                loading={loadingSales}
                onChange={handleSaleChange}
                showSearch
                optionFilterProp="children"
              >
                {paidSales.map(sale => (
                  <Option key={sale.id} value={sale.id}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>
                        {sale.saleNumber} - {sale.customer.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {sale.customer.company && `${sale.customer.company} | `}
                        <SecurePriceDisplay price={sale.totalAmount} />
                        <SuperAdminOnly>
                          {sale.actualAmount && sale.actualAmount !== sale.totalAmount && (
                            <span style={{ color: '#52c41a' }}>
                              {' '}(實收: NT$ {sale.actualAmount.toLocaleString()})
                            </span>
                          )}
                        </SuperAdminOnly>
                        {' '}| {dayjs(sale.createdAt).format('YYYY-MM-DD')}
                      </div>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {selectedSale && (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="shippingDate"
                  label={
                    <Space>
                      <CalendarOutlined />
                      出貨日期
                    </Space>
                  }
                  rules={[{ required: true, message: '請選擇出貨日期' }]}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  label={
                    <Space>
                      <UserOutlined />
                      客戶資訊
                    </Space>
                  }
                >
                  <div style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: '6px' }}>
                    <div style={{ fontWeight: 'bold' }}>{selectedSale.customer.name}</div>
                    {selectedSale.customer.company && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {selectedSale.customer.company}
                      </div>
                    )}
                  </div>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="shippingAddress"
              label="送貨地址"
              rules={[{ required: true, message: '請輸入送貨地址' }]}
            >
              <TextArea rows={2} placeholder="請輸入詳細送貨地址" />
            </Form.Item>

            <Divider />

            {/* 商品選擇 */}
            <div style={{ marginBottom: '16px' }}>
              <Title level={5} style={{ margin: '0 0 16px 0' }}>
                <Space>
                  <InboxOutlined />
                  選擇出貨商品
                </Space>
              </Title>

              <Alert
                message="提示"
                description="請從右側選擇需要出貨的商品項目，選中的項目將移動到左側"
                type="info"
                showIcon
                style={{ marginBottom: '16px' }}
              />

              <Transfer
                dataSource={transferData}
                showSearch
                filterOption={(inputValue, option) =>
                  option.title.toLowerCase().includes(inputValue.toLowerCase()) ||
                  option.description.toLowerCase().includes(inputValue.toLowerCase())
                }
                targetKeys={selectedItems}
                onChange={handleTransferChange}
                render={item => (
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{item.title}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{item.description}</div>
                  </div>
                )}
                titles={['已選商品', '可選商品']}
                listStyle={{
                  width: '100%',
                  height: 300
                }}
              />
            </div>

            {/* 出貨摘要 */}
            {selectedItems.length > 0 && (
              <Card size="small" title="出貨摘要">
                <Row gutter={16}>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <Text type="secondary">選中項目</Text>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                        {selectedItems.length} 項
                      </div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <Text type="secondary">總數量</Text>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                        {transferData
                          .filter(item => selectedItems.includes(item.key))
                          .reduce((sum, item) => sum + item.quantity, 0)} 件
                      </div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <Text type="secondary">預估重量</Text>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fa8c16' }}>
                        {calculateTotalWeight().toFixed(2)} kg
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>
            )}

            <Form.Item name="notes" label="出貨備註">
              <TextArea rows={2} placeholder="出貨相關備註事項" />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  )
}