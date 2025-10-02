'use client'

import React, { useState } from 'react'
import { Modal, Form, Select, InputNumber, Input, message, Space, Alert, Divider } from 'antd'
import { InboxOutlined, HomeOutlined } from '@ant-design/icons'

const { Option } = Select
const { TextArea } = Input

interface QuickReceiveModalProps {
  visible: boolean
  onCancel: () => void
  onSuccess: () => void
  products: Array<{
    id: string
    product_code: string
    name: string
    variants: Array<{
      id: string
      variant_code: string
      variant_type: string
      description: string
      cost_price: number
    }>
  }>
}

/**
 * 個人快速進貨 Modal
 * 用於個人資金調貨，直接進個人倉
 */
export default function QuickReceiveModal({
  visible,
  onCancel,
  onSuccess,
  products
}: QuickReceiveModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)

  // 處理產品變化
  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId)
    form.setFieldsValue({ variant_id: undefined })
    setSelectedVariant(null)
  }

  // 處理變體變化
  const handleVariantChange = (variantId: string) => {
    const product = products.find(p => p.id === selectedProduct)
    const variant = product?.variants.find(v => v.id === variantId)
    setSelectedVariant(variant)

    // 自動填入成本價
    if (variant?.cost_price) {
      form.setFieldsValue({ unit_cost: variant.cost_price })
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const response = await fetch('/api/inventory/quick-receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant_id: values.variant_id,
          quantity: values.quantity,
          unit_cost: values.unit_cost,
          supplier: values.supplier,
          notes: values.notes
        })
      })

      const result = await response.json()

      if (result.success) {
        message.success('個人進貨成功，已入個人倉')
        form.resetFields()
        setSelectedProduct(null)
        setSelectedVariant(null)
        onSuccess()
      } else {
        message.error(result.error || '進貨失敗')
      }
    } catch (error) {
      console.error('個人進貨失敗:', error)
      message.error('進貨失敗，請稍後重試')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setSelectedProduct(null)
    setSelectedVariant(null)
    onCancel()
  }

  return (
    <Modal
      title={
        <Space>
          <InboxOutlined />
          <span>個人快速進貨</span>
          <HomeOutlined style={{ color: '#fa8c16' }} />
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      okText="確認進貨"
    >
      <Alert
        message="個人進貨說明"
        description="此功能用於個人資金調貨，商品將直接進入「個人倉」，投資方看不到此記錄。"
        type="info"
        showIcon
        icon={<HomeOutlined />}
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
      >
        <Form.Item
          name="product_id"
          label="選擇商品"
          rules={[{ required: true, message: '請選擇商品' }]}
        >
          <Select
            placeholder="請選擇商品"
            onChange={handleProductChange}
            showSearch
            filterOption={(input, option) =>
              (option?.children as string).toLowerCase().includes(input.toLowerCase())
            }
          >
            {products.map(product => (
              <Option key={product.id} value={product.id}>
                {product.product_code} - {product.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="variant_id"
          label="選擇變體"
          rules={[{ required: true, message: '請選擇變體' }]}
        >
          <Select
            placeholder="請選擇變體"
            onChange={handleVariantChange}
            disabled={!selectedProduct}
          >
            {products
              .find(p => p.id === selectedProduct)
              ?.variants.map(variant => (
                <Option key={variant.id} value={variant.id}>
                  {variant.variant_code} - {variant.variant_type}
                  {variant.cost_price > 0 && ` (成本: NT$ ${variant.cost_price})`}
                </Option>
              ))}
          </Select>
        </Form.Item>

        {selectedVariant && (
          <Alert
            message={`變體：${selectedVariant.variant_type}`}
            description={selectedVariant.description}
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Divider />

        <Form.Item
          name="quantity"
          label="進貨數量"
          rules={[
            { required: true, message: '請輸入進貨數量' },
            { type: 'number', min: 1, message: '數量必須大於0' }
          ]}
        >
          <InputNumber
            min={1}
            style={{ width: '100%' }}
            placeholder="請輸入數量"
          />
        </Form.Item>

        <Form.Item
          name="unit_cost"
          label="單位成本（NT$）"
          rules={[
            { required: true, message: '請輸入單位成本' },
            { type: 'number', min: 0, message: '成本不能為負數' }
          ]}
        >
          <InputNumber
            min={0}
            precision={2}
            style={{ width: '100%' }}
            placeholder="請輸入單位成本"
            formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => {
              const cleaned = (value || '').replace(/\$\s?|,/g, '')
              const num = parseFloat(cleaned)
              return isNaN(num) ? 0 : num
            }}
          />
        </Form.Item>

        <Form.Item
          name="supplier"
          label="供應商（選填）"
        >
          <Input placeholder="例如：個人調貨、朋友代購" />
        </Form.Item>

        <Form.Item
          name="notes"
          label="備註"
        >
          <TextArea
            rows={3}
            placeholder="選填，記錄進貨來源或其他資訊..."
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
