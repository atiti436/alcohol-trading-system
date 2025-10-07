'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Form, Select, InputNumber, Input, message, Space, Alert, Divider } from 'antd'
import { SwapOutlined } from '@ant-design/icons'

const { Option } = Select
const { TextArea } = Input

interface StockTransferModalProps {
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
      available_stock: number
      inventory?: Array<{
        warehouse: 'COMPANY' | 'PRIVATE'
        available: number
      }>
    }>
  }>
}

/**
 * 品號調撥 Modal
 * 用於將商品從一個變體轉移到另一個變體（如損傷商品）
 */
export default function StockTransferModal({
  visible,
  onCancel,
  onSuccess,
  products
}: StockTransferModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [selectedSourceProduct, setSelectedSourceProduct] = useState<string | null>(null)
  const [selectedTargetProduct, setSelectedTargetProduct] = useState<string | null>(null)
  const [selectedSourceVariant, setSelectedSourceVariant] = useState<any>(null)
  const [selectedTargetVariant, setSelectedTargetVariant] = useState<any>(null)
  const [sourceWarehouse, setSourceWarehouse] = useState<'COMPANY' | 'PRIVATE'>('COMPANY')  // 🔒 新增
  const [targetWarehouse, setTargetWarehouse] = useState<'COMPANY' | 'PRIVATE'>('COMPANY')  // 🔒 新增

  // 重置表單
  const resetForm = () => {
    form.resetFields()
    setSelectedSourceProduct(null)
    setSelectedTargetProduct(null)
    setSelectedSourceVariant(null)
    setSelectedTargetVariant(null)
    setSourceWarehouse('COMPANY')  // 🔒 重置倉庫選擇
    setTargetWarehouse('COMPANY')
  }

  // 處理來源產品變化
  const handleSourceProductChange = (productId: string) => {
    setSelectedSourceProduct(productId)
    form.setFieldsValue({ source_variant_id: undefined })
    setSelectedSourceVariant(null)
  }

  // 處理目標產品變化
  const handleTargetProductChange = (productId: string) => {
    setSelectedTargetProduct(productId)
    form.setFieldsValue({ target_variant_id: undefined })
    setSelectedTargetVariant(null)
  }

  // 處理來源變體變化
  const handleSourceVariantChange = (variantId: string) => {
    const product = products.find(p => p.id === selectedSourceProduct)
    const variant = product?.variants.find(v => v.id === variantId)
    setSelectedSourceVariant(variant)
  }

  // 處理目標變體變化
  const handleTargetVariantChange = (variantId: string) => {
    const product = products.find(p => p.id === selectedTargetProduct)
    const variant = product?.variants.find(v => v.id === variantId)
    setSelectedTargetVariant(variant)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const response = await fetch('/api/stock-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_variant_id: values.source_variant_id,
          target_variant_id: values.target_variant_id,
          source_warehouse: sourceWarehouse,  // 🔒 新增
          target_warehouse: targetWarehouse,  // 🔒 新增
          quantity: values.quantity,
          reason: values.reason,
          notes: values.notes
        })
      })

      const result = await response.json()

      if (result.success) {
        message.success(result.message || '品號調撥成功')
        resetForm()
        onSuccess()
      } else {
        message.error(result.error || '調撥失敗')
      }
    } catch (error) {
      console.error('品號調撥失敗:', error)
      message.error('調撥失敗，請稍後重試')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    resetForm()
    onCancel()
  }

  return (
    <Modal
      title={
        <Space>
          <SwapOutlined />
          <span>品號調撥</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={700}
    >
      <Alert
        message="品號調撥說明"
        description="將商品從一個變體轉移到另一個變體。例如：收貨時發現盒損，可將正常品調撥為盒損品。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
      >
        {/* 來源商品和變體 */}
        <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>來源（扣庫存）</div>

          <Form.Item
            name="source_product_id"
            label="選擇商品"
            rules={[{ required: true, message: '請選擇來源商品' }]}
          >
            <Select
              placeholder="請選擇商品"
              onChange={handleSourceProductChange}
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
            name="source_variant_id"
            label="選擇變體"
            rules={[{ required: true, message: '請選擇來源變體' }]}
          >
            <Select
              placeholder="請選擇變體"
              onChange={handleSourceVariantChange}
              disabled={!selectedSourceProduct}
            >
              {products
                .find(p => p.id === selectedSourceProduct)
                ?.variants.map(variant => (
                  <Option key={variant.id} value={variant.id}>
                    {variant.variant_code} - {variant.variant_type} (庫存: {variant.available_stock})
                  </Option>
                ))}
            </Select>
          </Form.Item>

          {/* 🔒 新增：來源倉庫選擇 */}
          <Form.Item label="來源倉庫">
            <Select
              value={sourceWarehouse}
              onChange={(value) => setSourceWarehouse(value)}
              style={{ width: '100%' }}
            >
              <Option value="COMPANY">公司倉</Option>
              <Option value="PRIVATE">個人倉</Option>
            </Select>
          </Form.Item>

          {selectedSourceVariant && (
            <Alert
              message={`當前可售庫存: ${selectedSourceVariant.available_stock} （${sourceWarehouse === 'COMPANY' ? '公司倉' : '個人倉'}）`}
              type="success"
              showIcon
            />
          )}
        </div>

        <Divider>
          <SwapOutlined style={{ fontSize: 20 }} />
        </Divider>

        {/* 目標商品和變體 */}
        <div style={{ background: '#e6f7ff', padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>目標（加庫存）</div>

          <Form.Item
            name="target_product_id"
            label="選擇商品"
            rules={[{ required: true, message: '請選擇目標商品' }]}
          >
            <Select
              placeholder="請選擇商品"
              onChange={handleTargetProductChange}
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
            name="target_variant_id"
            label="選擇變體"
            rules={[{ required: true, message: '請選擇目標變體' }]}
          >
            <Select
              placeholder="請選擇變體"
              onChange={handleTargetVariantChange}
              disabled={!selectedTargetProduct}
            >
              {products
                .find(p => p.id === selectedTargetProduct)
                ?.variants.map(variant => (
                  <Option key={variant.id} value={variant.id}>
                    {variant.variant_code} - {variant.variant_type} (庫存: {variant.available_stock})
                  </Option>
                ))}
            </Select>
          </Form.Item>

          {/* 🔒 新增：目標倉庫選擇 */}
          <Form.Item label="目標倉庫">
            <Select
              value={targetWarehouse}
              onChange={(value) => setTargetWarehouse(value)}
              style={{ width: '100%' }}
            >
              <Option value="COMPANY">公司倉</Option>
              <Option value="PRIVATE">個人倉</Option>
            </Select>
          </Form.Item>

          {selectedTargetVariant && (
            <Alert
              message={`當前可售庫存: ${selectedTargetVariant.available_stock} （${targetWarehouse === 'COMPANY' ? '公司倉' : '個人倉'}）`}
              type="info"
              showIcon
            />
          )}
        </div>

        <Form.Item
          name="quantity"
          label="調撥數量"
          rules={[
            { required: true, message: '請輸入調撥數量' },
            { type: 'number', min: 1, message: '數量必須大於0' },
            {
              validator: (_, value) => {
                if (selectedSourceVariant && value > selectedSourceVariant.available_stock) {
                  return Promise.reject(new Error(`數量不能超過可售庫存 (${selectedSourceVariant.available_stock})`))
                }
                return Promise.resolve()
              }
            }
          ]}
        >
          <InputNumber
            min={1}
            style={{ width: '100%' }}
            placeholder="請輸入調撥數量"
          />
        </Form.Item>

        <Form.Item
          name="reason"
          label="調撥原因"
          rules={[{ required: true, message: '請選擇或輸入調撥原因' }]}
        >
          <Select placeholder="請選擇原因">
            <Option value="收貨發現盒損">收貨發現盒損</Option>
            <Option value="收貨發現瓶損">收貨發現瓶損</Option>
            <Option value="儲存過程損傷">儲存過程損傷</Option>
            <Option value="品質問題降級">品質問題降級</Option>
            <Option value="商品規格調整">商品規格調整</Option>
            <Option value="其他">其他</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="notes"
          label="備註說明"
        >
          <TextArea
            rows={3}
            placeholder="選填，詳細說明調撥情況..."
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
